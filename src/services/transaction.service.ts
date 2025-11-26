
'use server';

import { createClient } from '@/lib/supabase/server';
import { format, setDate, subMonths } from 'date-fns';
import { Database, Json } from '@/types/database.types';
import { TransactionWithDetails, TransactionWithLineRelations } from '@/types/moneyflow.types';
import { syncTransactionToSheet } from './sheet.service';
import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds';

type ShopRow = Database['public']['Tables']['shops']['Row'];
const REFUND_CATEGORY_ID = 'e0000000-0000-0000-0000-000000000095';

export type CreateTransactionInput = {
  occurred_at: string;
  note: string;
  type: 'expense' | 'income' | 'debt' | 'transfer' | 'repayment';
  source_account_id: string;
  person_id?: string | null;
  destination_account_id?: string | null;
  category_id?: string | null;
  debt_account_id?: string | null;
  amount: number;
  tag: string;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  discount_category_id?: string | null;
  shop_id?: string | null;
};

async function resolveSystemCategory(
  supabase: ReturnType<typeof createClient>,
  name: string,
  type: 'income' | 'expense'
): Promise<string | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('name', name)
    .eq('type', type)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching system category "${name}":`, error);
    return null;
  }

  return (data as { id: string } | null)?.id ?? null;
}

async function resolveDiscountCategoryId(
  supabase: ReturnType<typeof createClient>,
  overrideCategoryId?: string
): Promise<string | null> {
  if (overrideCategoryId) {
    return overrideCategoryId;
  }

  // Chain of fallbacks
  const namesToTry = ['Chiết khấu / Quà tặng', 'Discount Given', 'Chi phí khác'];
  for (const name of namesToTry) {
      const id = await resolveSystemCategory(supabase, name, 'expense');
      if (id) return id;
  }

  // Final fallback if no named category found
  const { data: fallback, error: fallbackError } = await supabase
    .from('categories')
    .select('id')
    .eq('type', 'expense')
    .limit(1);

  if (fallbackError) {
    console.error('Error fetching any expense category for fallback:', fallbackError);
    return null;
  }

  const fallbackRows = (fallback ?? []) as { id: string }[];
  return fallbackRows[0]?.id ?? null;
}

function parseMetadata(value: Json | null): Record<string, unknown> {
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

function mergeMetadata(value: Json | null, extra: Record<string, unknown>): Json {
  const parsed = parseMetadata(value);
  const next = {
    ...parsed,
    ...extra,
  };
  return next as Json;
}

function extractLineMetadata(
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

async function resolveCurrentUserId(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? '917455ba-16c0-42f9-9cea-264f81a3db66';
}

async function loadShopInfo(
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

async function buildTransactionLines(
  supabase: ReturnType<typeof createClient>,
  input: CreateTransactionInput
) {
  const lines: any[] = [];
  const tag = input.tag;

  if (input.type === 'expense' && input.category_id) {
    lines.push({
      account_id: input.source_account_id,
      amount: -Math.abs(input.amount),
      type: 'credit',
    });
    lines.push({
      category_id: input.category_id,
      amount: Math.abs(input.amount),
      type: 'debit',
    });
  } else if (input.type === 'income' && input.category_id) {
    lines.push({
      account_id: input.source_account_id,
      amount: Math.abs(input.amount),
      type: 'debit',
    });
    lines.push({
      category_id: input.category_id,
      amount: -Math.abs(input.amount),
      type: 'credit',
    });
  } else if (input.type === 'repayment' && input.debt_account_id) {
    const repaymentCategoryId = await resolveSystemCategory(supabase, 'Repayment', 'income');
    if (!repaymentCategoryId) {
        console.error('FATAL: "Repayment" system category not found.');
    }

    lines.push({
      account_id: input.source_account_id,
      amount: Math.abs(input.amount),
      type: 'debit',
      category_id: repaymentCategoryId,
    });
    lines.push({
      account_id: input.debt_account_id,
      amount: -Math.abs(input.amount),
      type: 'credit',
      person_id: input.person_id ?? null,
    });

  } else if ((input.type === 'debt' || input.type === 'transfer') && input.debt_account_id) {
    const originalAmount = Math.abs(input.amount);
    const sharePercentEntry = Math.max(0, Number(input.cashback_share_percent ?? 0));
    const sharePercentCapped = Math.min(100, sharePercentEntry);
    const sharePercentRate = sharePercentCapped / 100;
    const shareFixed = Math.max(0, Number(input.cashback_share_fixed ?? 0));
    const percentContribution = sharePercentRate * originalAmount;
    const rawCashback = percentContribution + shareFixed;
    const cashbackGiven = Math.min(originalAmount, Math.max(0, rawCashback));
    const debtAmount = Math.max(0, originalAmount - cashbackGiven);

    lines.push({
      account_id: input.source_account_id,
      amount: -originalAmount,
      type: 'credit',
    });
    lines.push({
      account_id: input.debt_account_id,
      amount: debtAmount,
      type: 'debit',
      original_amount: originalAmount,
      cashback_share_percent: sharePercentRate,
      cashback_share_fixed: shareFixed,
      person_id: input.person_id ?? null,
    });

    if (cashbackGiven > 0) {
      const discountCategoryId = await resolveDiscountCategoryId(
        supabase,
        input.discount_category_id || undefined
      );
      if (!discountCategoryId) {
        console.error('No fallback category found for discount line');
        return null;
      }
      lines.push({
        category_id: discountCategoryId,
        amount: cashbackGiven,
        type: 'debit',
      });
    }
  } else {
    console.error('Invalid transaction type or missing data');
    return null;
  }

  return { lines, tag };
}

async function calculatePersistedCycleTag(
  supabase: ReturnType<typeof createClient>,
  accountId: string,
  transactionDate: Date
): Promise<string | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select('type, cashback_config')
    .eq('id', accountId)
    .single();

  const account = data as { type: string; cashback_config: Json } | null;

  if (error || !account || account.type !== 'credit_card') {
    return null;
  }

  const config = account.cashback_config as { statement_day?: number } | null;
  if (!config?.statement_day) {
    return null;
  }

  const statementDay = config.statement_day;
  const transactionDay = transactionDate.getDate();

  let cycleStartDate: Date;
  if (transactionDay >= statementDay) {
    cycleStartDate = setDate(transactionDate, statementDay);
  } else {
    const previousMonth = subMonths(transactionDate, 1);
    cycleStartDate = setDate(previousMonth, statementDay);
  }

  return format(cycleStartDate, 'yyyy-MM-dd');
}

function buildSheetPayload(
  txn: { id: string; occurred_at: string; note?: string | null; tag?: string | null },
  line:
    | {
        amount: number
        original_amount?: number | null
        cashback_share_percent?: number | null
        cashback_share_fixed?: number | null
        metadata?: Json | null
      }
    | null
) {
  if (!line) return null;
  const meta = (line.metadata as Record<string, unknown> | null) ?? null;
  const cashbackAmount =
    typeof meta?.cashback_share_amount === 'number' ? meta.cashback_share_amount : undefined;

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note ?? undefined,
    tag: txn.tag ?? undefined,
    amount: line.amount,
    original_amount:
      typeof line.original_amount === 'number' ? line.original_amount : Math.abs(line.amount),
    cashback_share_percent:
      typeof line.cashback_share_percent === 'number' ? line.cashback_share_percent : undefined,
    cashback_share_fixed:
      typeof line.cashback_share_fixed === 'number' ? line.cashback_share_fixed : undefined,
    cashback_share_amount: cashbackAmount,
  };
}

async function syncRepaymentTransaction(
    supabase: ReturnType<typeof createClient>,
    transactionId: string,
    input: CreateTransactionInput,
    lines: any[],
    shopInfo: ShopRow | null
) {
    try {
        const { data: destAccountResult } = await supabase
            .from('accounts')
            .select('name')
            .eq('id', input.debt_account_id ?? '')
            .single();
        const destAccount = destAccountResult as { name: string } | null;

        for (const line of lines) {
            if (!line.person_id) continue;

            const originalAmount =
                typeof line.original_amount === 'number' ? line.original_amount : line.amount;
            const cashbackPercent =
                typeof line.cashback_share_percent === 'number' ? line.cashback_share_percent : undefined;
            const cashbackFixed =
                typeof line.cashback_share_fixed === 'number' ? line.cashback_share_fixed : undefined;

            void syncTransactionToSheet(
                line.person_id,
                {
                    id: transactionId,
                    occurred_at: input.occurred_at,
                    note: input.note,
                    tag: input.tag,
                    shop_name: shopInfo?.name ?? destAccount?.name ?? null,
                    amount: line.amount,
                    original_amount: originalAmount,
                    cashback_share_percent: cashbackPercent,
                    cashback_share_fixed: cashbackFixed,
                },
                'create'
            ).then(() => {
                console.log(`[Sheet Sync] Triggered for Repayment to Person ${line.person_id}`);
            }).catch(err => {
                console.error('Sheet Sync Error (Repayment):', err);
            });
        }
    } catch (error) {
        console.error("Failed to sync repayment transaction:", error);
    }
}

export async function createTransaction(input: CreateTransactionInput): Promise<boolean> {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || '917455ba-16c0-42f9-9cea-264f81a3db66';

        const built = await buildTransactionLines(supabase, input);
        if (!built) {
            return false;
        }
        const { lines, tag } = built;

        const persistedCycleTag = await calculatePersistedCycleTag(
            supabase,
            input.source_account_id,
            new Date(input.occurred_at)
        );

        const { data: txn, error: txnError } = await (supabase
            .from('transactions')
            .insert as any)({
            occurred_at: input.occurred_at,
            note: input.note,
            status: 'posted',
            tag: tag,
            persisted_cycle_tag: persistedCycleTag,
            shop_id: input.shop_id ?? null,
            created_by: userId,
        })
            .select()
            .single();

        if (txnError || !txn) {
            console.error('Error creating transaction header:', txnError);
            return false;
        }

        const linesWithId = lines.map(l => ({ ...l, transaction_id: txn.id }));
        const { error: linesError } = await (supabase.from('transaction_lines').insert as any)(linesWithId);

        if (linesError) {
            console.error('Error creating transaction lines:', linesError);
            return false;
        }

        const shopInfo = await loadShopInfo(supabase, input.shop_id)

        if (input.type === 'repayment') {
            await syncRepaymentTransaction(supabase, txn.id, input, linesWithId, shopInfo);
        } else {
            const syncBase = {
                id: txn.id,
                occurred_at: input.occurred_at,
                note: input.note,
                tag,
                shop_name: shopInfo?.name ?? null,
            };

            for (const line of linesWithId) {
                const personId = line.person_id;
                if (!personId) continue;

                const originalAmount =
                    typeof line.original_amount === 'number' ? line.original_amount : line.amount;
                const cashbackPercent =
                    typeof line.cashback_share_percent === 'number' ? line.cashback_share_percent : undefined;
                const cashbackFixed =
                    typeof line.cashback_share_fixed === 'number' ? line.cashback_share_fixed : undefined;

                void syncTransactionToSheet(
                    personId,
                    {
                        ...syncBase,
                        original_amount: originalAmount,
                        cashback_share_percent: cashbackPercent,
                        cashback_share_fixed: cashbackFixed,
                        amount: line.amount,
                    },
                    'create'
                )
                    .then(() => {
                        console.log(`[Sheet Sync] Triggered for Person ${personId}`);
                    })
                    .catch(err => {
                        console.error('Sheet Sync Error (Background):', err);
                    });
            }
        }

        return true;
    } catch (error) {
        console.error('Unhandled error in createTransaction:', error);
        return false;
    }
}

type TransactionRow = {
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

function mapTransactionRow(
  txn: TransactionRow,
  accountId?: string,
  context?: { mode?: 'person' }
): TransactionWithDetails {
  const lines = txn.transaction_lines ?? []
  const cashbackFromLines = extractCashbackFromLines(lines)
  const isPersonContext = context?.mode === 'person'

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

  if (categoryLine && categoryLine.categories) {
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

  if (categoryLine?.category_id === REFUND_CATEGORY_ID) {
    type = 'income'
    displayType = 'income'
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

  const display_direction = displayType
    ? displayType === 'income'
      ? 'IN'
      : displayType === 'expense'
        ? 'OUT'
        : 'TRANSFER'
    : undefined

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note || null,
    status: txn.status,
    tag: txn.tag || null,
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
  }
}

export async function getRecentTransactions(limit: number = 10): Promise<TransactionWithDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      status,
      created_at,
      shop_id,
      shops ( id, name, logo_url, default_category_id, categories ( id, name, type, image_url, icon ) ),
      transaction_lines (
        amount,
        type,
        account_id,
        metadata,
        category_id,
        person_id,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        profiles ( name, avatar_url ),
        accounts (name, type, logo_url),
        categories (name, type, image_url, icon)
      )
    `)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent transactions:', error);
    return [];
  }

  return (data as TransactionRow[]).map(txn => mapTransactionRow(txn));
}

export async function getTransactionsByShop(shopId: string, limit: number = 50): Promise<TransactionWithDetails[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      status,
      created_at,
      shop_id,
      shops ( id, name, logo_url, default_category_id, categories ( id, name, type, image_url, icon ) ),
      transaction_lines (
        amount,
        type,
        account_id,
        metadata,
        category_id,
        person_id,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        profiles ( name, avatar_url ),
        accounts (name, type, logo_url),
        categories (name, type, image_url, icon)
      )
    `)
    .eq('shop_id', shopId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching transactions for shop:', error);
    return [];
  }

  return (data as TransactionRow[]).map(txn => mapTransactionRow(txn));
}

export async function voidTransaction(id: string): Promise<boolean> {
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select(
      `
      id,
      occurred_at,
      note,
      tag,
      transaction_lines (
        amount,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        metadata,
        person_id,
        category_id
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction for void:', fetchError);
    return false;
  }

  // --- Start Refund Rollback Logic ---
  const metadata = parseMetadata(extractLineMetadata((existing as any).transaction_lines));
  const isRefund = (metadata?.linked_transaction_id && metadata?.refund_amount) ||
                   (existing as any).transaction_lines.some((l: any) => l.category_id === REFUND_CATEGORY_ID);

  if (isRefund) {
    const linkedTxnId = metadata?.linked_transaction_id as string;
    const refundAmount = metadata?.refund_amount as number;

    if (linkedTxnId && refundAmount > 0) {
      const { data: parentTxn, error: parentError } = await supabase
        .from('transactions')
        .select('refunded_amount, transaction_lines(amount, type, category_id)')
        .eq('id', linkedTxnId)
        .single();

      if (parentError || !parentTxn) {
        console.error('Parent transaction for refund rollback not found:', parentError);
      } else {
        const parentCategoryLine = (parentTxn.transaction_lines as any[]).find(l => l.category_id && l.type === 'debit');
        const parentOriginalAmount = parentCategoryLine ? Math.abs(parentCategoryLine.amount) : 0;

        const newRefundedAmount = (parentTxn.refunded_amount ?? 0) - refundAmount;
        const newStatus = newRefundedAmount <= 0 ? 'none' : 'partial';

        await supabase
          .from('transactions')
          .update({
            refunded_amount: Math.max(0, newRefundedAmount),
            refund_status: newStatus
          })
          .eq('id', linkedTxnId);
      }
    }
  }
  // --- End Refund Rollback Logic ---

  const { error: updateError } = await (supabase.from('transactions').update as any)({ status: 'void' }).eq('id', id);

  if (updateError) {
    console.error('Failed to void transaction:', updateError);
    return false;
  }

  const lines = ((existing as any).transaction_lines as any[]) ?? [];
  const personLine = lines.find((line) => line?.person_id);

  if (personLine?.person_id) {
    const payload = buildSheetPayload(existing as any, personLine);
    if (payload) {
      void syncTransactionToSheet(personLine.person_id, payload, 'delete').catch(err => {
        console.error('Sheet Sync Error (Void):', err);
      });
    }
  }

  return true;
}

export async function restoreTransaction(id: string): Promise<boolean> {
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select(
      `
      id,
      occurred_at,
      note,
      tag,
      transaction_lines (
        amount,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        metadata,
        person_id
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction for restore:', fetchError);
    return false;
  }

  const { error: updateError } = await (supabase
    .from('transactions')
    .update as any)({ status: 'posted' })
    .eq('id', id);

  if (updateError) {
    console.error('Failed to restore transaction:', updateError);
    return false;
  }

  const lines = ((existing as any).transaction_lines as any[]) ?? [];

  for (const line of lines) {
    if (!line?.person_id) continue;
    const payload = buildSheetPayload(existing as any, line);
    if (!payload) continue;
    void syncTransactionToSheet(line.person_id, payload, 'create').catch(err => {
      console.error('Sheet Sync Error (Restore):', err);
    });
  }

  return true;
}

export async function updateTransaction(id: string, input: CreateTransactionInput): Promise<boolean> {
  const supabase = createClient();

  const { data: existingData, error: existingError } = await supabase
    .from('transactions')
    .select(
      `
      id,
      occurred_at,
      note,
      tag,
      transaction_lines (
        amount,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        metadata,
        person_id
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (existingError || !existingData) {
    console.error('Failed to fetch transaction before update:', existingError);
    return false;
  }

  const built = await buildTransactionLines(supabase, input);
  if (!built) {
    return false;
  }

  const { lines, tag } = built;
  const shopInfo = await loadShopInfo(supabase, input.shop_id);

  const persistedCycleTag = await calculatePersistedCycleTag(
    supabase,
    input.source_account_id,
    new Date(input.occurred_at)
  );

  const { error: headerError } = await (supabase
    .from('transactions')
    .update as any)({
      occurred_at: input.occurred_at,
      note: input.note,
      tag: tag,
      status: 'posted',
      persisted_cycle_tag: persistedCycleTag,
      shop_id: input.shop_id ?? null,
    })
    .eq('id', id);

  if (headerError) {
    console.error('Failed to update transaction header:', headerError);
    return false;
  }

  const { error: deleteError } = await supabase.from('transaction_lines').delete().eq('transaction_id', id);
  if (deleteError) {
    console.error('Failed to clear old transaction lines:', deleteError);
    return false;
  }

  const linesWithId = lines.map(line => ({ ...line, transaction_id: id }));
  const { error: insertError } = await (supabase.from('transaction_lines').insert as any)(linesWithId);
  if (insertError) {
    console.error('Failed to insert new transaction lines:', insertError);
    return false;
  }

  const existingLines = ((existingData as any).transaction_lines as any[]) ?? [];

  for (const line of existingLines) {
    if (!line.person_id) continue;
    const payload = buildSheetPayload(existingData as any, line);
    if (!payload) continue;
    void syncTransactionToSheet(line.person_id, payload, 'delete').catch(err => {
      console.error('Sheet Sync Error (Update/Delete):', err);
    });
  }

  if (input.type === 'repayment') {
    await syncRepaymentTransaction(supabase, id, input, linesWithId, shopInfo);
  } else {
    const syncBase = {
      id,
      occurred_at: input.occurred_at,
      note: input.note,
      tag,
      shop_name: shopInfo?.name ?? null,
    };

    for (const line of linesWithId) {
      const personId = line.person_id;
      if (!personId) continue;

      const payload = buildSheetPayload(syncBase, line);
      if (!payload) continue;

      void syncTransactionToSheet(personId, payload, 'create').catch(err => {
        console.error('Sheet Sync Error (Update/Create):', err);
      });
    }
  }

  return true;
}

type RefundTransactionLine = {
  id?: string
  amount: number
  type: 'debit' | 'credit'
  account_id?: string | null
  category_id?: string | null
  metadata?: Json | null
  categories?: {
    name?: string | null
  } | null
  person_id?: string | null
}

type RefundTransactionRow = {
  id: string
  note: string | null
  tag: string | null
  occurred_at: string
  metadata?: Json | null
  transaction_lines?: RefundTransactionLine[]
}

export type PendingRefundItem = {
  id: string
  occurred_at: string
  note: string | null
  tag: string | null
  amount: number
  original_note: string | null
  original_category: string | null
  linked_transaction_id?: string
}

export async function requestRefund(
  transactionId: string,
  refundAmount: number,
  partial: boolean,
  options?: { note?: string | null; shop_id?: string | null }
): Promise<{ success: boolean; refundTransactionId?: string; error?: string }> {
  console.log('Requesting refund for:', transactionId);
  if (!transactionId) {
    return { success: false, error: 'Thiếu thông tin giao dịch cần hoàn tiền.' }
  }

  const supabase = createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select(`
      id,
      note,
      tag,
      shop_id,
      refunded_amount,
      refund_status,
      transaction_lines (
        id,
        amount,
        type,
        account_id,
        category_id,
        person_id,
        metadata,
        categories ( name )
      )
    `)
    .eq('id', transactionId)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction for refund request:', fetchError)
    return { success: false, error: 'Không tìm thấy giao dịch hoặc đã xảy ra lỗi.' }
  }

  const lines = ((existing as any).transaction_lines as RefundTransactionLine[]) ?? []
  const categoryLine = lines.find(line => line?.category_id && line.type === 'debit')
  if (!categoryLine) {
    return { success: false, error: 'Giao dịch không có danh mục phí để hoàn.' }
  }

  const originalAmount = Math.abs(categoryLine.amount ?? 0);
  const currentRefunded = existing.refunded_amount ?? 0;

  if (currentRefunded >= originalAmount) {
      return { success: false, error: 'Giao dịch đã được hoàn tiền đầy đủ.' };
  }

  const maxRefundableAmount = originalAmount - currentRefunded;
  const requestedAmount = Number.isFinite(refundAmount) ? Math.abs(refundAmount) : maxRefundableAmount;
  const safeAmount = Math.min(Math.max(requestedAmount, 0), maxRefundableAmount);

  if (safeAmount <= 0) {
    return { success: false, error: 'Số tiền hoàn không hợp lệ.' }
  }

  // Person/Debt Logic Fix
  const personLine = lines.find(line => line?.person_id);
  const debtAccountId = personLine?.account_id ?? null;
  const personId = personLine?.person_id ?? null;

  const userId = await resolveCurrentUserId(supabase)
  const requestNote = options?.note ?? `Refund Request for ${(existing as any).note ?? transactionId}`
  const lineMetadata = {
    refund_status: 'requested',
    linked_transaction_id: transactionId,
    refund_amount: safeAmount,
    partial,
    original_note: (existing as any).note ?? null,
    original_category_id: categoryLine.category_id,
    original_category_name: categoryLine.categories?.name ?? null,
  }

  const { data: requestTxn, error: createError } = await (supabase
    .from('transactions')
    .insert as any)({
    occurred_at: new Date().toISOString(),
    note: requestNote,
    status: 'posted',
    tag: (existing as any).tag,
    created_by: userId,
    shop_id: options?.shop_id ?? (existing as any).shop_id ?? null,
  })
    .select()
    .single()

  if (createError || !requestTxn) {
    console.error('Failed to insert refund request transaction:', createError)
    return { success: false, error: 'Không thể tạo giao dịch yêu cầu hoàn tiền.' }
  }

  const refundCategoryId = REFUND_CATEGORY_ID

  const linesToInsert: any[] = [
    {
      transaction_id: requestTxn.id,
      account_id: REFUND_PENDING_ACCOUNT_ID,
      amount: safeAmount,
      type: 'debit',
      metadata: lineMetadata,
    },
    {
      transaction_id: requestTxn.id,
      category_id: refundCategoryId,
      amount: -safeAmount,
      type: 'credit',
      metadata: lineMetadata,
    },
  ]

  if (personId && debtAccountId) {
    linesToInsert.push({
      transaction_id: requestTxn.id,
      account_id: debtAccountId,
      amount: -safeAmount,
      type: 'credit',
      person_id: personId,
      metadata: lineMetadata,
    })
  }

  const { error: linesError } = await (supabase.from('transaction_lines').insert as any)(linesToInsert)
  if (linesError) {
    console.error('Failed to insert refund request lines:', linesError)
    return { success: false, error: 'Không thể tạo dòng ghi sổ hoàn tiền.' }
  }

  // Update Original Transaction
  const newTotalRefunded = currentRefunded + safeAmount;
  const newStatus = newTotalRefunded >= originalAmount ? 'full' : 'partial';

  const { error: updateError } = await supabase
    .from('transactions')
    .update({
      refunded_amount: newTotalRefunded,
      refund_status: newStatus,
    })
    .eq('id', transactionId);

  if (updateError) {
    console.error('Failed to update original transaction refund status:', updateError);
    // Note: The refund was created, but the parent status update failed.
    // This is a situation that might require manual correction or a retry mechanism.
  }

  return { success: true, refundTransactionId: requestTxn.id }
}

export async function confirmRefund(
  pendingTransactionId: string,
  targetAccountId: string
): Promise<{ success: boolean; confirmTransactionId?: string; error?: string }> {
  if (!pendingTransactionId || !targetAccountId) {
    return { success: false, error: 'Thiếu thông tin xác nhận hoàn tiền.' }
  }

  const supabase = createClient()
  const { data: pending, error: pendingError } = await supabase
    .from('transactions')
    .select(`
      id,
      note,
      tag,
      transaction_lines (
        id,
        amount,
        type,
        account_id,
        metadata
      )
    `)
    .eq('id', pendingTransactionId)
    .maybeSingle();

  if (pendingError || !pending) {
    console.error('Failed to load pending refund transaction:', pendingError)
    return { success: false, error: 'Không tìm thấy giao dịch hoàn tiền hoặc đã xảy ra lỗi.' }
  }

  const pendingMetadata = extractLineMetadata((pending as any).transaction_lines as Array<{ metadata?: Json | null }>)

  const pendingLine = ((pending as any).transaction_lines as any[]).find(
    (line) => line?.account_id === REFUND_PENDING_ACCOUNT_ID && line.type === 'debit'
  )

  if (!pendingLine) {
    return { success: false, error: 'Không có dòng ghi sổ treo phù hợp để xác nhận.' }
  }

  const amountToConfirm = Math.abs(pendingLine.amount ?? 0)
  if (amountToConfirm <= 0) {
    return { success: false, error: 'Số tiền xác nhận không hợp lệ.' }
  }

  const userId = await resolveCurrentUserId(supabase)
  const confirmNote = `Confirmed refund for ${(pending as any).note ?? (pending as any).id}`
  const confirmationMetadata = {
    refund_status: 'confirmed',
    linked_transaction_id: pendingTransactionId,
  }

  const { data: confirmTxn, error: confirmError } = await (supabase
    .from('transactions')
    .insert as any)({
    occurred_at: new Date().toISOString(),
    note: confirmNote,
    status: 'posted',
    tag: (pending as any).tag,
    created_by: userId,
  })
    .select()
    .single()

  if (confirmError || !confirmTxn) {
    console.error('Failed to insert refund confirm transaction:', confirmError)
    return { success: false, error: 'Không thể tạo giao dịch xác nhận hoàn tiền.' }
  }

  const confirmLines: any[] = [
    {
      transaction_id: confirmTxn.id,
      account_id: targetAccountId,
      amount: amountToConfirm,
      type: 'debit',
      metadata: confirmationMetadata,
    },
    {
      transaction_id: confirmTxn.id,
      account_id: REFUND_PENDING_ACCOUNT_ID,
      amount: -amountToConfirm,
      type: 'credit',
      metadata: confirmationMetadata,
    },
  ]

  const { error: confirmLinesError } = await (supabase.from('transaction_lines').insert as any)(
    confirmLines
  )
  if (confirmLinesError) {
    console.error('Failed to insert refund confirmation lines:', confirmLinesError)
    return { success: false, error: 'Không thể ghi sổ dòng hoàn tiền.' }
  }

  try {
    const updatedPendingMeta = mergeMetadata(pendingMetadata, {
      refund_status: 'confirmed',
      refund_confirmed_transaction_id: confirmTxn.id,
      refunded_at: new Date().toISOString(),
    })
    const pendingLines = ((pending as any).transaction_lines as Array<{ id?: string, metadata?: Json | null }>) ?? []
    for (const line of pendingLines) {
      if (!line?.id) continue
      await (supabase.from('transaction_lines').update as any)({ metadata: updatedPendingMeta }).eq(
        'id',
        line.id
      )
    }
  } catch (err) {
    console.error('Failed to update pending refund metadata:', err)
  }

  const pendingMeta = parseMetadata(pendingMetadata)
  const originalTransactionId =
    typeof pendingMeta.linked_transaction_id === 'string' ? pendingMeta.linked_transaction_id : null

  if (originalTransactionId) {
    try {
      const { data: originalLines } = await supabase
        .from('transaction_lines')
        .select('id, metadata')
        .eq('transaction_id', originalTransactionId)

      const originalMeta = extractLineMetadata(originalLines as Array<{ metadata?: Json | null }>)
      const updatedOriginalMeta = mergeMetadata(originalMeta, {
        refund_status: 'confirmed',
        refund_confirmed_transaction_id: confirmTxn.id,
        refund_confirmed_at: new Date().toISOString(),
      })

      for (const line of (originalLines ?? []) as Array<{ id?: string }>) {
        if (!line?.id) continue
        await (supabase.from('transaction_lines').update as any)({ metadata: updatedOriginalMeta }).eq(
          'id',
          line.id
        )
      }
    } catch (err) {
      console.error('Failed to tag original transaction after refund confirmation:', err)
    }
  }

  return { success: true, confirmTransactionId: confirmTxn.id }
}

export async function getPendingRefunds(): Promise<PendingRefundItem[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      transaction_lines!inner (
        amount,
        type,
        account_id,
        category_id,
        metadata,
        categories ( name )
      )
    `)
    .filter('transaction_lines.metadata->>refund_status', 'eq', 'requested')
    .order('occurred_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch pending refunds:', error)
    return []
  }

  return (data as any[])
    .map(row => {
      const pendingLine = (row.transaction_lines ?? []).find(
        (line: any) => line?.account_id === REFUND_PENDING_ACCOUNT_ID && line.type === 'debit'
      )

      if (!pendingLine) {
        return null
      }

      const metadata = parseMetadata(extractLineMetadata(row.transaction_lines))
      const categoryLine = (row.transaction_lines ?? []).find((line: any) => line?.category_id)
      const amount = Math.abs(pendingLine.amount ?? 0)
      const originalCategory =
        (metadata.original_category_name as string) ??
        categoryLine?.categories?.name ??
        null

      return {
        id: row.id,
        occurred_at: row.occurred_at,
        note: row.note,
        tag: row.tag,
        amount,
        original_note: (metadata.original_note as string) ?? null,
        original_category: originalCategory,
        linked_transaction_id:
          typeof metadata.linked_transaction_id === 'string' ? metadata.linked_transaction_id : undefined,
      } as PendingRefundItem
    })
    .filter((item): item is PendingRefundItem => Boolean(item))
}

type UnifiedTransactionParams = {
  accountId?: string
  limit?: number
  context?: 'person'
}

export async function getUnifiedTransactions(
  accountOrOptions?: string | UnifiedTransactionParams,
  limitArg: number = 50
): Promise<TransactionWithDetails[]> {
  const supabase = createClient()
  const selection = `
      id,
      occurred_at,
      note,
      tag,
      status,
      created_at,
      shop_id,
      shops ( id, name, logo_url, default_category_id, categories ( id, name, type, image_url, icon ) ),
      transaction_lines (
        amount,
        type,
        account_id,
        metadata,
        category_id,
        person_id,
        original_amount,
        cashback_share_percent,
        cashback_share_fixed,
        profiles ( name, avatar_url ),
        accounts (name, type, logo_url),
        categories (name, type, image_url, icon)
      )
    `

  const parsed =
    typeof accountOrOptions === 'object' && accountOrOptions !== null
      ? accountOrOptions
      : { accountId: accountOrOptions as string | undefined, limit: limitArg }

  const accountId = parsed.accountId
  const limit = parsed.limit ?? limitArg
  const context = parsed.context

  if (accountId) {
    const { data: txnIds, error: idsError } = await supabase
      .from('transaction_lines')
      .select('transaction_id, transactions!inner(occurred_at)')
      .eq('account_id', accountId)
      .order('transactions(occurred_at)', { ascending: false })
      .limit(limit)

    if (idsError) {
      console.error('Error fetching transaction ids for unified view:', idsError)
      return []
    }

    const uniqueIds = Array.from(
      new Set(
        ((txnIds ?? []) as Array<{ transaction_id: string | null }>).map(row => row.transaction_id).filter(Boolean)
      )
    ) as string[]
    if (uniqueIds.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(selection)
      .in('id', uniqueIds)
      .order('occurred_at', { ascending: false })

    if (error) {
      console.error('Error fetching unified transactions:', error)
      return []
    }

    return (data as any[]).map(txn => mapTransactionRow(txn, accountId, { mode: context }))
  }

  const { data, error } = await supabase
    .from('transactions')
    .select(selection)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching unified transactions:', error)
    return []
  }

  return (data as any[]).map(txn => mapTransactionRow(txn, accountId, { mode: context }))
}
