
'use server';

import { createClient } from '@/lib/supabase/server';
import { format, setDate, subMonths } from 'date-fns';
import { Database, Json } from '@/types/database.types';
import { TransactionLine, TransactionWithDetails, TransactionWithLineRelations } from '@/types/moneyflow.types';
import { syncTransactionToSheet } from './sheet.service';
import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds';

type ShopRow = Database['public']['Tables']['shops']['Row'];

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

async function resolveDiscountCategoryId(
  supabase: ReturnType<typeof createClient>,
  overrideCategoryId?: string
): Promise<string | null> {
  if (overrideCategoryId) {
    return overrideCategoryId;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type')
    .in('name', ['Chiết khấu / Quà tặng', 'Chi phí khác', 'Discount Given'])
    .eq('type', 'expense')
    .limit(3);

  const rows = (data ?? []) as { id: string; name: string; type: 'expense' | 'income' }[];

  if (error) {
    console.error('Error fetching fallback discount categories:', error);
  }

  const preferredOrder = ['Chiết khấu / Quà tặng', 'Chi phí khác', 'Discount Given'];
  for (const name of preferredOrder) {
    const match = rows.find(row => row.name === name && row.type === 'expense');
    if (match) return match.id;
  }

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

function generateTag(date: Date): string {
  return format(date, 'MMMyy').toUpperCase();
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
    // Repayment: Money comes from Debt Account (Person pays back) -> To Bank Account
    // However, usually 'source_account_id' in form is the Bank Account selected.
    // In this model:
    // Bank Account (source_account_id) -> Debit (+) (Receiving money)
    // Debt Account (debt_account_id) -> Credit (-) (Reducing debt)

    lines.push({
      account_id: input.source_account_id, // The receiving bank
      amount: Math.abs(input.amount),
      type: 'debit',
    });
    lines.push({
      account_id: input.debt_account_id, // The person paying
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

export async function createTransaction(input: CreateTransactionInput): Promise<boolean> {
  const supabase = createClient();
  
  // Sử dụng ID người dùng mặc định nếu chưa đăng nhập
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
      created_by: userId, // Thêm created_by với ID người dùng
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

  const syncBase = {
    id: txn.id,
    occurred_at: input.occurred_at,
    note: input.note,
    tag,
    shop_name: shopInfo?.name ?? null,
  };

  for (const line of linesWithId) {
    const personId = (line as { person_id?: string | null }).person_id;
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

  return true;
}

type TransactionRow = {
  id: string
  occurred_at: string
  note: string
  tag: string | null
  cashback_share_percent?: number | null
  cashback_share_fixed?: number | null
  cashback_share_amount?: number | null
  shop_id?: string | null
  shops?: ShopRow | null
  transaction_lines?: Array<{
    amount: number
    type: 'debit' | 'credit'
    account_id?: string | null
    category_id?: string | null
    person_id?: string | null
    original_amount?: number | null
    cashback_share_percent?: number | null
    cashback_share_fixed?: number | null
    profiles?: { name?: string | null } | null
    accounts?: {
      name: string
      type: string
      logo_url?: string | null
    } | null
    categories?: {
      name: string
      image_url?: string | null
      icon?: string | null
    } | null
    metadata?: Json | null
  } | null>
}

function resolveAccountMovementInfo(
  lines: TransactionRow['transaction_lines'] | undefined,
  txn: TransactionRow,
  fallbackCategoryName?: string | null
) {
  const sanitizedLines = (lines ?? []).filter(Boolean)
  const creditLine = sanitizedLines.find(line => line?.account_id && line.type === 'credit')
  const debitLine = sanitizedLines.find(line => line?.account_id && line.type === 'debit')
  let sourceLine = creditLine ?? sanitizedLines.find(line => line?.account_id)
  let destinationLine = debitLine

  if (destinationLine && destinationLine.account_id === sourceLine?.account_id) {
    destinationLine = undefined
  }

  if (!destinationLine) {
    destinationLine = sanitizedLines.find(
      line => line?.account_id && line.account_id !== sourceLine?.account_id
    )
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

function mapTransactionRow(txn: TransactionRow, accountId?: string): TransactionWithDetails {
  const lines = txn.transaction_lines ?? []
  const cashbackFromLines = extractCashbackFromLines(lines)

  // Prioritize finding the line with debt/cashback info (original_amount is a good marker)
  let accountLine = lines.find(line => line && typeof line.original_amount === 'number');

  // If no specific debt line, fall back to the original logic
  if (!accountLine) {
      accountLine = accountId
      ? lines.find(line => line && line.account_id === accountId)
      : lines.find(line => line && line.type === 'credit') // Assume the credit line is the source account for general transactions
  }
  
  // Calculate displayAmount.
  // If accountLine is present, use its amount directly.
  // If not, use avg of absolute values (legacy fallback).
  // IMPORTANT: For Expense, we want negative if we are the payer.
  let displayAmount =
    typeof accountLine?.amount === 'number'
      ? accountLine.amount
      : lines.reduce((sum, line) => sum + (line ? Math.abs(line.amount) : 0), 0) / 2

  let type: 'income' | 'expense' | 'transfer' | 'repayment' = 'transfer'
  let categoryName: string | undefined
  let categoryIcon: string | undefined
  let categoryImageUrl: string | undefined
  let accountName: string | undefined

  const categoryLine = lines.find(line => line && Boolean(line.category_id))
  const creditAccountLine = lines.find(
    line => line && line.account_id && line.type === 'credit'
  ) as (typeof lines)[0] | undefined
  const debitAccountLine = lines.find(
    line => line && line.account_id && line.type === 'debit'
  ) as (typeof lines)[0] | undefined

  if (categoryLine) {
    categoryName = categoryLine.categories?.name
    categoryIcon = categoryLine.categories?.icon ?? undefined
    categoryImageUrl = categoryLine.categories?.image_url ?? undefined
    // Check for Repayment by category name
    if (categoryName?.toLowerCase().includes('thu nợ') || categoryName?.toLowerCase().includes('repayment')) {
        type = 'repayment'
    } else if (categoryLine.type === 'debit') {
      type = 'expense'
      accountName = creditAccountLine?.accounts?.name
    } else {
      type = 'income'
      accountName = debitAccountLine?.accounts?.name
    }
  } else {
    // Transfer logic
    categoryName = "Money Transfer"
    // We want to show the "Other side" account name
    if (accountId) {
        // We are viewing from 'accountId' perspective. Find the other account.
        const otherLine = lines.find(line => line && line.account_id && line.account_id !== accountId)
        if (otherLine && otherLine.accounts) {
             accountName = otherLine.accounts.name
        }
    } else {
        // Fallback: Show 'To' account if it's a transfer
        accountName = debitAccountLine?.accounts?.name ?? creditAccountLine?.accounts?.name
    }
  }

  // Override type based on accountLine amount if not already set by category
  if (!categoryLine && accountLine?.amount !== undefined) {
    type = accountLine.amount >= 0 ? 'income' : 'expense'
    if (type === 'income' && debitAccountLine && creditAccountLine) type = 'transfer'
    if (type === 'expense' && debitAccountLine && creditAccountLine) type = 'transfer'
  }

  // Ensure Expense is always negative for display consistency if it wasn't already
  // (Though `accountLine.amount` should be negative for credit/outflow)
  // If type is expense and amount is positive, flip it?
  // Usually `accountLine.amount` is correct (- for expense).
  // But let's check `displayAmount`

  if (type === 'expense' && displayAmount > 0) {
      displayAmount = -displayAmount
  }

  const isRepayment = type === 'repayment';
  if (isRepayment) {
      if (displayAmount < 0) {
          displayAmount = -displayAmount;
      }
  }

  // Smart Source Logic
  // If viewing from Debt Account, we want to see the Bank Name.
  // If viewing from Bank Account, we want to see Shop/Person/Debt Account.
  if (accountId) {
      const myLine = lines.find(l => l && l.account_id === accountId);
      if (myLine?.accounts?.type === 'debt') {
          // I am a debt account. The counterpart is likely the Bank.
          const bankLine = lines.find(l => l && l.account_id && l.account_id !== accountId && l.accounts?.type !== 'debt');
          if (bankLine?.accounts) {
              accountName = bankLine.accounts.name
          }
      }
  } else {
     // Not viewing from specific account context (e.g. Recent Transactions)
     // Use "Smart Source" - Prefer Bank Account as Source? Or show Counterpart?
     // Existing logic: "Source/Account" column.
     // Usually we want to see where the money came from (Bank).
     // Unless it's Income, then where it came into? Or from whom?

     // Task says: "Display txn.source_name (The Bank Name) instead of Debt Account name."
     // This implies when listing transactions involving Debt, show the Bank.

     // Let's look for the Bank Account line.
     const bankLine = lines.find(l => l && l.account_id && l.accounts?.type !== 'debt' && l.accounts?.type !== undefined);
     if (bankLine && bankLine.accounts) {
         // If there is a bank line, use it as the "Source/Account" display if we are not in Account Detail view.
         // But wait, if it's an Expense, Source is Bank.
         // If it's Income (Repayment), Source is Person (Debt Account)? No, user wants to see Bank usually in the "Account" column of the table.
         // The table column is "Source/Account".

         // Actually, let's just expose `account_name` as the "Other Side" or "Primary Bank Involved".

         // If this transaction involves a Debt Account AND a Bank Account.
         const debtLine = lines.find(l => l && l.account_id && l.accounts?.type === 'debt');
         if (debtLine && bankLine) {
             // It's a debt/repayment transaction.
             // We want to show the Bank Name.
             accountName = bankLine.accounts.name;
         }
     }
  }

  const percentRaw = txn.cashback_share_percent ?? cashbackFromLines.cashback_share_percent
  const cashbackAmount = txn.cashback_share_amount ?? cashbackFromLines.cashback_share_amount
  const personLine = lines.find(line => line && line.person_id)
  const categoryId = categoryLine?.category_id ?? null
  const source_account_name = creditAccountLine?.accounts?.name ?? null
  const destination_account_name = debitAccountLine?.accounts?.name ?? null
  const { source_name, source_logo, destination_name, destination_logo } = resolveAccountMovementInfo(
    txn.transaction_lines,
    txn,
    categoryName ?? null
  )

  return {
    id: txn.id,
    occurred_at: txn.occurred_at,
    note: txn.note || null,
    status: (txn as any).status as 'posted' | 'pending' | 'void',
    tag: txn.tag || null,
    created_at: (txn as any).created_at,
    amount: displayAmount,
    type: isRepayment ? 'transfer' : (type as 'income' | 'expense' | 'transfer'),
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
    original_amount: accountLine?.original_amount ?? null,
    person_id: personLine?.person_id ?? null,
    person_name:
      (personLine as { profiles?: { name?: string | null } | null })?.profiles?.name ??
      (personLine as any)?.people?.name ??
      null,
    person_avatar_url:
      (personLine as { profiles?: { name?: string | null; avatar_url?: string | null } | null })?.profiles?.avatar_url ??
      (personLine as any)?.people?.avatar_url ??
      null,
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
      shops ( id, name, logo_url ),
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
        categories (name, image_url, icon)
      )
    `)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent transactions:', error);
    return [];
  }

  const rows = (data ?? []) as TransactionRow[];

  return rows.map(txn => mapTransactionRow(txn));
}

export async function getTransactionsByPersonId(personId: string, limit: number = 50): Promise<TransactionWithDetails[]> {
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
      shops ( id, name, logo_url ),
      transaction_lines!inner (
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
        categories (name, image_url, icon)
      )
    `)
    .eq('transaction_lines.person_id', personId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching transactions for person:', error);
    return [];
  }

  const rows = (data ?? []) as TransactionRow[];
  return rows.map(txn => mapTransactionRow(txn));
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
      shops ( id, name, logo_url ),
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
        categories (name, image_url, icon)
      )
    `)
    .eq('shop_id', shopId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching transactions for shop:', error);
    return [];
  }

  const rows = (data ?? []) as TransactionRow[];

  return rows.map(txn => mapTransactionRow(txn));
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
        person_id
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction for void:', fetchError);
    return false;
  }

  const { error: updateError } = await supabase.from('transactions').update([{ status: 'void' }] as never).eq('id', id);

  if (updateError) {
    console.error('Failed to void transaction:', updateError);
    return false;
  }

  const lines = (existing as any).transaction_lines ?? [];
  const personLine = lines.find((line: any) => line?.person_id);

  if (personLine?.person_id) {
    const payload = buildSheetPayload(existing, personLine);
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

  const { error: updateError } = await supabase
    .from('transactions')
    .update([{ status: 'posted' }] as never)
    .eq('id', id);

  if (updateError) {
    console.error('Failed to restore transaction:', updateError);
    return false;
  }

  const lines = (existing as any).transaction_lines ?? [];

  for (const line of lines) {
    if (!line?.person_id) continue;
    const payload = buildSheetPayload(existing, line);
    if (!payload) continue;
    void syncTransactionToSheet(line.person_id, payload, 'create').catch(err => {
      console.error('Sheet Sync Error (Restore):', err);
    });
  }

  return true;
}

export async function updateTransaction(id: string, input: CreateTransactionInput): Promise<boolean> {
  const supabase = createClient();

  const [existing, built] = await Promise.all([
    supabase
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
      .maybeSingle(),
    buildTransactionLines(supabase, input),
  ]);

  const existingData = existing.data as
    | (TransactionRow & {
        transaction_lines?: Array<{
          amount: number
          original_amount?: number | null
          cashback_share_percent?: number | null
          cashback_share_fixed?: number | null
          metadata?: Json | null
          person_id?: string | null
        } | null>
      })
    | null;

  if (existing.error || !existingData) {
    console.error('Failed to fetch transaction before update:', existing.error);
    return false;
  }

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

  const { error: headerError } = await supabase
    .from('transactions')
    .update([{
      occurred_at: input.occurred_at,
      note: input.note,
      tag: tag,
      status: 'posted',
      persisted_cycle_tag: persistedCycleTag,
      shop_id: input.shop_id ?? null,
    }] as never)
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

  const existingLines = (existingData.transaction_lines ?? []).filter(Boolean) as {
    amount: number
    original_amount?: number | null
    cashback_share_percent?: number | null
    cashback_share_fixed?: number | null
    metadata?: Json | null
    person_id?: string | null
  }[];

  for (const line of existingLines) {
    if (!line.person_id) continue;
    const payload = buildSheetPayload(existingData, line);
    if (!payload) continue;
    void syncTransactionToSheet(line.person_id, payload, 'delete').catch(err => {
      console.error('Sheet Sync Error (Update/Delete):', err);
    });
  }

  const syncBase = {
    id,
    occurred_at: input.occurred_at,
    note: input.note,
    tag,
    shop_name: shopInfo?.name ?? null,
  };

  for (const line of linesWithId) {
    const personId = (line as { person_id?: string | null }).person_id;
    if (!personId) continue;

    const payload = buildSheetPayload(syncBase, line);
    if (!payload) continue;

    void syncTransactionToSheet(personId, payload, 'create').catch(err => {
      console.error('Sheet Sync Error (Update/Create):', err);
    });
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
  partial: boolean
): Promise<{ success: boolean; refundTransactionId?: string; error?: string }> {
  console.log('Requesting refund for:', transactionId);
  if (!transactionId) {
    return { success: false, error: 'Thiếu thông tin giao dịch cần hoàn tiền.' }
  }

  const supabase = createClient()

  const { data: _existing, error: fetchError } = await supabase
    .from('transactions')
    .select(`
      id,
      note,
      tag,
      shop_id,
      transaction_lines (
        id,
        amount,
        type,
        account_id,
        category_id,
        metadata,
        categories ( name )
      )
    `)
    .eq('id', transactionId)
    .maybeSingle()

  if (fetchError || !_existing) {
    console.error('Failed to load transaction for refund request:', fetchError)
    return { success: false, error: 'Không tìm thấy giao dịch hoặc đã xảy ra lỗi.' }
  }

  const existing = _existing as any;
  const existingMetadata = extractLineMetadata(existing.transaction_lines)

  const lines = (existing.transaction_lines ?? []) as RefundTransactionLine[]
  const categoryLine = lines.find(line => line?.category_id)
  if (!categoryLine) {
    return { success: false, error: 'Giao dịch không có danh mục phí để hoàn.' }
  }

  const maxAmount = Math.abs(categoryLine.amount ?? 0)
  if (maxAmount <= 0) {
    return { success: false, error: 'Không thể hoàn tiền cho giao dịch giá trị 0.' }
  }

  const requestedAmount = Number.isFinite(refundAmount) ? Math.abs(refundAmount) : maxAmount
  const safeAmount = Math.min(Math.max(requestedAmount, 0), maxAmount)
  if (safeAmount <= 0) {
    return { success: false, error: 'Số tiền hoàn không hợp lệ.' }
  }

  const userId = await resolveCurrentUserId(supabase)
  const requestNote = `Refund Request for ${existing.note ?? transactionId}`
  const lineMetadata = {
    refund_status: 'requested',
    linked_transaction_id: transactionId,
    refund_amount: safeAmount,
    partial,
    original_note: existing.note ?? null,
    original_category_id: categoryLine.category_id,
    original_category_name: categoryLine.categories?.name ?? null,
  }

  const { data: requestTxn, error: createError } = await (supabase
    .from('transactions')
    .insert as any)({
    occurred_at: new Date().toISOString(),
    note: requestNote,
    status: 'posted',
    tag: existing.tag,
    created_by: userId,
    shop_id: existing.shop_id ?? null,
  })
    .select()
    .single()

  if (createError || !requestTxn) {
    console.error('Failed to insert refund request transaction:', createError)
    return { success: false, error: 'Không thể tạo giao dịch yêu cầu hoàn tiền.' }
  }

  const linesToInsert = [
    {
      transaction_id: requestTxn.id,
      account_id: REFUND_PENDING_ACCOUNT_ID,
      amount: safeAmount,
      type: 'debit',
      metadata: lineMetadata,
    },
    {
      transaction_id: requestTxn.id,
      category_id: 'e0000000-0000-0000-0000-000000000095',
      amount: -safeAmount,
      type: 'credit',
      metadata: lineMetadata,
    },
  ]

  const { error: linesError } = await (supabase.from('transaction_lines').insert as any)(linesToInsert)
  if (linesError) {
    console.error('Failed to insert refund request lines:', linesError)
    return { success: false, error: 'Không thể tạo dòng ghi sổ hoàn tiền.' }
  }

  try {
    const originalLines = (existing.transaction_lines ?? []) as Array<{
      id?: string
      metadata?: Json | null
    }>
    const mergedOriginalMeta = mergeMetadata(existingMetadata, {
      refund_request_id: requestTxn.id,
      refund_requested_at: new Date().toISOString(),
      has_refund_request: true,
    })
    for (const line of originalLines) {
      if (!line?.id) continue
      await (supabase.from('transaction_lines').update as any)({ metadata: mergedOriginalMeta }).eq(
        'id',
        line.id
      )
    }
  } catch (err) {
    console.error('Failed to tag original transaction with refund metadata:', err)
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
  const { data: _pending, error: pendingError } = await supabase
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
    .maybeSingle()

  if (pendingError || !_pending) {
    console.error('Failed to load pending refund transaction:', pendingError)
    return { success: false, error: 'Không tìm thấy giao dịch hoàn tiền hoặc đã xảy ra lỗi.' }
  }

  const pending = _pending as any;
  const pendingMetadata = extractLineMetadata(pending.transaction_lines)

  const pendingLine = (pending.transaction_lines ?? []).find(
    (line: { account_id?: string | null; type?: string | null }) =>
      line?.account_id === REFUND_PENDING_ACCOUNT_ID && line.type === 'debit'
  )

  if (!pendingLine) {
    return { success: false, error: 'Không có dòng ghi sổ treo phù hợp để xác nhận.' }
  }

  const amountToConfirm = Math.abs(pendingLine.amount ?? 0)
  if (amountToConfirm <= 0) {
    return { success: false, error: 'Số tiền xác nhận không hợp lệ.' }
  }

  const userId = await resolveCurrentUserId(supabase)
  const confirmNote = `Confirmed refund for ${pending.note ?? pending.id}`
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
    tag: pending.tag,
    created_by: userId,
  })
    .select()
    .single()

  if (confirmError || !confirmTxn) {
    console.error('Failed to insert refund confirm transaction:', confirmError)
    return { success: false, error: 'Không thể tạo giao dịch xác nhận hoàn tiền.' }
  }

  const confirmLines = [
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
    const pendingLines = (pending.transaction_lines ?? []) as Array<{
      id?: string
      metadata?: Json | null
    }>
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

  const rows = (data ?? []) as RefundTransactionRow[]

  return rows
    .map(row => {
      const pendingLine = (row.transaction_lines ?? []).find(
        line => line?.account_id === REFUND_PENDING_ACCOUNT_ID && line.type === 'debit'
      )

      if (!pendingLine) {
        return null
      }

      const metadata = parseMetadata(extractLineMetadata(row.transaction_lines))
      const categoryLine = (row.transaction_lines ?? []).find(line => line?.category_id)
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
      }
    })
    .filter(Boolean) as PendingRefundItem[]
}

/**
 * Get unified transactions with proper source/destination mapping
 * @param accountId Optional account ID for context-specific view
 * @param limit Number of transactions to fetch
 * @returns Array of transactions with proper mapping
 */
export async function getUnifiedTransactions(accountId?: string, limit: number = 50): Promise<TransactionWithDetails[]> {
  const supabase = createClient();

  let query = supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      note,
      tag,
      status,
      created_at,
      shop_id,
      shops ( id, name, logo_url ),
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
        categories (name, image_url, icon)
      )
    `)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (accountId) {
    query = query.eq('transaction_lines.account_id', accountId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching unified transactions:', error);
    return [];
  }

  const rows = (data ?? []) as TransactionRow[];

  return rows.map(txn => mapTransactionRow(txn, accountId));
}
