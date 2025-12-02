import { Database, Json } from '@/types/database.types';
import { TransactionWithDetails, TransactionWithLineRelations } from '@/types/moneyflow.types';
import { createClient } from '@/lib/supabase/server';
import { parseCashbackConfig, getCashbackCycleRange, calculateBankCashback } from './cashback';
import { format } from 'date-fns';

const REFUND_CATEGORY_ID = 'e0000000-0000-0000-0000-000000000095';

export type ShopRow = Database['public']['Tables']['shops']['Row'];

export type TransactionRow = {
    id: string
    occurred_at: string
    note: string | null
    status: 'posted' | 'pending' | 'void'
    tag: string | null
    created_at: string
    cashback_share_percent?: number | null
    cashback_share_fixed?: number | null
    cashback_share_amount?: number | null
    shop_id?: string | null
    shops?: ShopRow | null
    transaction_lines: Array<{
        amount: number
        type: 'debit' | 'credit'
        account_id?: string | null
        category_id?: string | null
        person_id?: string | null
        original_amount?: number | null
        cashback_share_percent?: number | null
        cashback_share_fixed?: number | null
        profiles?: { name?: string | null, avatar_url?: string | null } | null
        accounts?: {
            name: string
            type: string
            logo_url?: string | null
        } | null
        categories?: {
            name: string
            type: 'income' | 'expense'
            image_url?: string | null
            icon?: string | null
        } | null
        metadata?: Json | null
    }>
}

export function parseMetadata(value: Json | null): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

export function extractLineMetadata(
    lines?: Array<{ metadata?: Json | null } | null> | null
): Json | null {
    if (!lines) return null;
    for (const line of lines) {
        if (line?.metadata) {
            return line.metadata;
        }
    }
    return null;
}

export async function loadShopInfo(
    supabase: ReturnType<typeof createClient>,
    shopId?: string | null
): Promise<ShopRow | null> {
    if (!shopId) {
        return null;
    }

    const { data, error } = await supabase
        .from('shops')
        .select('id, name, logo_url')
        .eq('id', shopId)
        .maybeSingle();

    if (error) {
        console.error('Failed to load shop info:', error);
        return null;
    }

    return data as ShopRow | null;
}

function resolveAccountMovementInfo(
    lines: TransactionRow['transaction_lines'] | undefined,
    txn: TransactionRow,
    type: 'income' | 'expense' | 'transfer' | 'repayment',
    fallbackCategoryName?: string | null
) {
    const accountLines = (lines ?? []).filter(line => line && line.account_id);

    let sourceLine: (typeof accountLines[0]) | undefined;
    let destinationLine: (typeof accountLines[0]) | undefined;

    if (type === 'repayment') {
        // Source = Debt Account (credited), Destination = Bank Account (debited)
        sourceLine = accountLines.find(line => line.type === 'credit');
        destinationLine = accountLines.find(line => line.type === 'debit');
    } else if (type === 'transfer') {
        // Source = From Account (credited), Destination = To Account (debited)
        sourceLine = accountLines.find(line => line.type === 'credit');
        destinationLine = accountLines.find(line => line.type === 'debit');
    } else if (type === 'expense') {
        // Source = Bank/Card (credited), Destination = N/A (it's a category)
        sourceLine = accountLines.find(line => line.type === 'credit');
    } else if (type === 'income') {
        // Source = N/A (it's a category), Destination = Bank/Card (debited)
        destinationLine = accountLines.find(line => line.type === 'debit');
    } else {
        // Fallback for debt or other types, assuming standard credit/debit flow
        sourceLine = accountLines.find(line => line.type === 'credit');
        destinationLine = accountLines.find(line => line.type === 'debit');
    }


    const fallbackName = txn.shops?.name ?? fallbackCategoryName ?? null
    const fallbackLogo = txn.shops?.logo_url ?? null

    return {
        source_name: sourceLine?.accounts?.name ?? null,
        source_logo: sourceLine?.accounts?.logo_url ?? null,
        destination_name: destinationLine?.accounts?.name ?? fallbackName,
        destination_logo: destinationLine?.accounts?.logo_url ?? fallbackLogo ?? null,
    }
}

function extractCashbackFromLines(lines: TransactionRow['transaction_lines']): {
    cashback_share_percent?: number
    cashback_share_fixed?: number
    cashback_share_amount?: number
    original_amount?: number
} {
    for (const line of lines ?? []) {
        const meta = (line?.metadata as Record<string, unknown> | null) ?? null
        const readMetaNumber = (key: string) => {
            if (!meta) return undefined
            const value = meta[key]
            return typeof value === 'number' ? value : undefined
        }
        const percent =
            typeof line?.cashback_share_percent === 'number'
                ? line.cashback_share_percent
                : readMetaNumber('cashback_share_percent')
        const fixed =
            typeof line?.cashback_share_fixed === 'number'
                ? line.cashback_share_fixed
                : readMetaNumber('cashback_share_fixed')
        const amount = readMetaNumber('cashback_share_amount')
        const original_amount = typeof line?.original_amount === 'number' ? line.original_amount : undefined
        if (percent !== undefined || fixed !== undefined || amount !== undefined || original_amount !== undefined) {
            return { cashback_share_percent: percent, cashback_share_fixed: fixed, cashback_share_amount: amount, original_amount }
        }
    }
    return {}
}

export function mapTransactionRow(
    txn: TransactionRow,
    accountId?: string,
    context?: {
        mode?: 'person' | 'account';
        accountInfo?: { type: string; cashback_config: Json | null }
    }
): TransactionWithDetails {
    const lines = txn.transaction_lines ?? []
    const cashbackFromLines = extractCashbackFromLines(lines)
    const isPersonContext = context?.mode === 'person'
    const isAccountContext = context?.mode === 'account'

    let accountLine = lines.find(line => line && typeof line.original_amount === 'number')

    if (!accountLine) {
        accountLine = accountId
            ? lines.find(line => line && line.account_id === accountId)
            : lines.find(line => line && line.type === 'credit')
    }

    let displayAmount =
        typeof accountLine?.amount === 'number'
            ? accountLine.amount
            : lines.reduce((sum, line) => sum + (line ? Math.abs(line.amount) : 0), 0) / 2

    let type: 'income' | 'expense' | 'transfer' | 'repayment' = 'transfer'
    let displayType: TransactionWithDetails['displayType'] | undefined
    let categoryName: string | undefined
    let categoryIcon: string | undefined
    let categoryImageUrl: string | undefined
    let accountName: string | undefined

    const categoryLine = lines.find(line => line && Boolean(line.category_id))
    const accountLines = lines.filter(line => line && line.account_id)
    const creditAccountLine = accountLines.find(line => line && line.type === 'credit')
    const debitAccountLine = accountLines.find(line => line && line.type === 'debit')
    const nonDebtCreditLine = accountLines.find(
        line => line && line.type === 'credit' && line.accounts?.type !== 'debt'
    )
    const nonDebtDebitLine = accountLines.find(
        line => line && line.type === 'debit' && line.accounts?.type !== 'debt'
    )
    const debtCreditLine = accountLines.find(
        line => line && line.type === 'credit' && line.accounts?.type === 'debt'
    )
    const debtDebitLine = accountLines.find(
        line => line && line.type === 'debit' && line.accounts?.type === 'debt'
    )

    if (txn.note?.startsWith('Auto:')) {
      type = 'expense'
      displayType = 'expense'
    } else if (categoryLine && categoryLine.categories) {
        categoryName = categoryLine.categories.name
        categoryIcon = categoryLine.categories.icon ?? undefined
        categoryImageUrl = categoryLine.categories.image_url ?? undefined

        if (categoryLine.categories.type === 'expense') {
            type = 'expense'
        } else if (categoryLine.categories.type === 'income') {
            type = 'income'
        }

        const lowerCategoryName = categoryName?.toLowerCase() ?? ''
        if (lowerCategoryName.includes('thu nợ') || lowerCategoryName.includes('repayment')) {
            type = 'repayment'
        }
    } else if (creditAccountLine && debitAccountLine) {
        type = 'transfer'
        categoryName = 'Money Transfer'
    } else if (accountLine?.amount !== undefined) {
        type = accountLine.amount >= 0 ? 'income' : 'expense'
    }

    displayType = displayType ?? (type === 'repayment' ? 'income' : type)

    if (isPersonContext && (debtCreditLine || debtDebitLine)) {
        displayType = debtDebitLine ? 'expense' : 'income'
    }

    if (type === 'expense' && displayAmount > 0) {
        displayAmount = -Math.abs(displayAmount)
    }

    const typeForAccount = displayType ?? type

    if (typeForAccount === 'expense') {
        accountName = creditAccountLine?.accounts?.name
    } else if (typeForAccount === 'income') {
        accountName = debitAccountLine?.accounts?.name
    } else if (typeForAccount === 'transfer') {
        if (accountId) {
            const otherLine = lines.find(line => line && line.account_id && line.account_id !== accountId)
            if (otherLine?.accounts) {
                accountName = otherLine.accounts.name
            }
        } else {
            accountName = debitAccountLine?.accounts?.name ?? creditAccountLine?.accounts?.name
        }
    }

    if (accountId) {
        const myLine = lines.find(l => l && l.account_id === accountId)
        if (myLine?.accounts?.type === 'debt') {
            const bankLine = lines.find(
                l => l && l.account_id && l.account_id !== accountId && l.accounts?.type !== 'debt'
            )
            if (bankLine?.accounts) {
                accountName = bankLine.accounts.name
            }
        }
    } else {
        const bankLine = lines.find(
            l => l && l.account_id && l.accounts?.type !== 'debt' && l.accounts?.type !== undefined
        )
        if (bankLine?.accounts) {
            const debtLine = lines.find(l => l && l.account_id && l.accounts?.type === 'debt')
            if (debtLine) {
                accountName = bankLine.accounts.name
            }
        }
    }

    if (isPersonContext) {
        accountName = nonDebtCreditLine?.accounts?.name ?? nonDebtDebitLine?.accounts?.name ?? accountName
    }

    const percentRaw = txn.cashback_share_percent ?? cashbackFromLines.cashback_share_percent
    const cashbackAmount = txn.cashback_share_amount ?? cashbackFromLines.cashback_share_amount
    const personLine = lines.find(line => line && line.person_id)
    let categoryId = categoryLine?.category_id ?? null
    const source_account_name = creditAccountLine?.accounts?.name ?? null
    const destination_account_name = debitAccountLine?.accounts?.name ?? null
    const { source_name: resolvedSourceName, source_logo: resolvedSourceLogo, destination_name: resolvedDestinationName, destination_logo: resolvedDestinationLogo } =
        resolveAccountMovementInfo(txn.transaction_lines, txn, type, categoryName ?? null)

    const shopDefaultCategory = ((txn as any).shops?.categories as {
        id?: string
        name?: string | null
        image_url?: string | null
        icon?: string | null
    } | null) ?? null

    if (!categoryName && shopDefaultCategory) {
        categoryName = shopDefaultCategory.name ?? undefined
        categoryIcon = shopDefaultCategory.icon ?? undefined
        categoryImageUrl = shopDefaultCategory.image_url ?? undefined
        categoryId = shopDefaultCategory.id ?? categoryId
    }

    let source_name = resolvedSourceName
    let source_logo = resolvedSourceLogo
    let destination_name = resolvedDestinationName
    let destination_logo = resolvedDestinationLogo

    if (isPersonContext) {
        if (displayType === 'expense' && nonDebtCreditLine?.accounts) {
            source_name = nonDebtCreditLine.accounts.name ?? source_name
            source_logo = nonDebtCreditLine.accounts.logo_url ?? source_logo ?? null
        }
        if (displayType === 'income' && nonDebtDebitLine?.accounts) {
            destination_name = nonDebtDebitLine.accounts.name ?? destination_name
            destination_logo = nonDebtDebitLine.accounts.logo_url ?? destination_logo ?? null
        }
    }

    // --- Arrow Logic for Account Context ---
    // Debt is typically mapped as 'transfer' or 'repayment' in this function's local scope
    if (isAccountContext && accountId && (type === 'transfer' || type === 'repayment')) {
        const myLine = lines.find(l => l && l.account_id === accountId)
        if (myLine) {
            const otherLine = lines.find(l => l && l.account_id && l.account_id !== accountId)
            const partnerName = otherLine?.accounts?.name ?? 'Unknown'

            if (myLine.amount < 0) {
                // Money leaving -> Arrow to Partner
                source_name = `➡️ ${partnerName}`
                // Note: We don't change destination_name, or we could set it to null to simplify UI rendering
                destination_name = null
            } else {
                // Money entering <- Arrow from Partner
                source_name = `⬅️ ${partnerName}`
                destination_name = null
            }
            // Ensure logo is hidden or set to partner's?
            // The table uses source_logo. Maybe we want to show partner's logo?
            // "Display Name: ➡️ + PartnerAccountName"
            // Let's use Partner's logo as source_logo so it shows up next to arrow?
            if (otherLine?.accounts?.logo_url) {
                source_logo = otherLine.accounts.logo_url
            } else {
                source_logo = null
            }
        }
    }

    // --- Credit Cycle Logic for Account Context ---
    let tag = txn.tag || null
    if (isAccountContext && context.accountInfo?.type === 'credit_card' && context.accountInfo.cashback_config) {
        try {
            const config = parseCashbackConfig(context.accountInfo.cashback_config)
            if (config.cycleType === 'statement_cycle' && config.statementDay) {
                const range = getCashbackCycleRange(config, new Date(txn.occurred_at))
                const fmt = (d: Date) => format(d, 'dd/MM')
                tag = `${fmt(range.start)} - ${fmt(range.end)}`
            }
        } catch (e) {
            console.error('Error calculating cycle tag:', e)
        }
    }

    const display_direction = displayType
        ? displayType === 'income'
            ? 'IN'
            : displayType === 'expense'
                ? 'OUT'
                : 'TRANSFER'
        : undefined

    // --- Cashback & Profit Calculation ---
    let bankBack: number | undefined
    let bankRate: number | undefined
    let profit: number | undefined

    if (context?.accountInfo?.cashback_config) {
        try {
            const config = parseCashbackConfig(context.accountInfo.cashback_config)
            const absAmount = Math.abs(displayAmount)
            const result = calculateBankCashback(config, absAmount, categoryName)
            bankBack = result.amount
            bankRate = result.rate

            const calculatedPeopleBack = cashbackAmount ?? ((percentRaw ?? 0) * absAmount + (txn.cashback_share_fixed ?? 0))
            profit = bankBack - calculatedPeopleBack
        } catch (e) {
            console.error('Error calculating cashback/profit:', e)
        }
    }

    return {
        id: txn.id,
        occurred_at: txn.occurred_at,
        note: txn.note || null,
        status: txn.status,
        tag: tag,
        created_at: txn.created_at,
        amount: displayAmount,
        type,
        displayType: displayType ?? type,
        display_type: display_direction,
        category_name: categoryName,
        category_icon: categoryIcon ?? null,
        category_image_url: categoryImageUrl ?? null,
        account_name: accountName,
        source_account_name,
        destination_account_name,
        source_name,
        source_logo,
        destination_name,
        destination_logo,
        category_id: categoryId,
        cashback_share_percent: percentRaw ?? null,
        cashback_share_fixed: txn.cashback_share_fixed ?? cashbackFromLines.cashback_share_fixed ?? null,
        cashback_share_amount: cashbackAmount ?? null,
        original_amount:
            accountLine?.original_amount ??
            (typeof accountLine?.amount === 'number' ? Math.abs(accountLine.amount) : null),
        person_id: personLine?.person_id ?? null,
        person_name: personLine?.profiles?.name ?? null,
        person_avatar_url: personLine?.profiles?.avatar_url ?? null,
        shop_id: txn.shop_id ?? null,
        shop_name: txn.shops?.name ?? null,
        shop_logo_url: txn.shops?.logo_url ?? null,
        metadata: extractLineMetadata(txn.transaction_lines),
        transaction_lines: (txn.transaction_lines ?? []).filter(Boolean) as TransactionWithLineRelations[],
        bank_back: bankBack,
        bank_rate: bankRate,
        profit: profit,
    }
}
