'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Json, Database } from '@/types/database.types';
import { TransactionWithDetails, TransactionWithLineRelations, AccountRow } from '@/types/moneyflow.types';

type TransactionStatus = 'posted' | 'pending' | 'void' | 'waiting_refund' | 'refunded' | 'completed';
type TransactionType = 'income' | 'expense' | 'transfer' | 'debt' | 'repayment';

export type CreateTransactionInput = {
  occurred_at: string;
  note?: string | null;
  type: TransactionType;
  source_account_id: string;
  amount: number;
  tag?: string | null;
  category_id?: string | null;
  person_id?: string | null;
  target_account_id?: string | null;
  destination_account_id?: string | null;
  debt_account_id?: string | null;
  shop_id?: string | null;
  metadata?: Json | null;
  is_installment?: boolean;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
};

type FlatTransactionRow = {
  id: string;
  occurred_at: string;
  note: string | null;
  status: TransactionStatus;
  tag: string | null;
  created_at: string;
  created_by: string | null;
  amount: number;
  type: TransactionType;
  account_id: string;
  target_account_id: string | null;
  category_id: string | null;
  person_id: string | null;
  metadata: Json | null;
  shop_id: string | null;
  persisted_cycle_tag?: string | null;
  is_installment?: boolean | null;
  installment_plan_id?: string | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  cashback_share_amount?: number | null;
  cashback_mode?: string | null;
  currency?: string | null;

  final_price?: number | null;
  transaction_history?: { count: number }[];
};

type NormalizedTransaction = Omit<FlatTransactionRow, 'id' | 'created_at'>;

type LookupMaps = {
  accounts: Map<string, { id: string; name: string; logo_url: string | null; type: string | null }>;
  categories: Map<string, { id: string; name: string; type: 'income' | 'expense'; logo_url?: string | null; icon?: string | null }>;
  people: Map<string, { id: string; name: string; avatar_url: string | null }>;
  shops: Map<string, { id: string; name: string; logo_url: string | null }>;
};

function resolveBaseType(type: TransactionType): 'income' | 'expense' | 'transfer' {
  if (type === 'repayment') return 'income';
  if (type === 'debt') return 'expense';
  if (type === 'transfer') return 'transfer';
  return type;
}

export async function normalizeAmountForType(type: TransactionType, amount: number): Promise<number> {
  const baseType = resolveBaseType(type);
  const absolute = Math.abs(amount);
  if (baseType === 'income') return absolute;
  if (baseType === 'transfer') return -absolute;
  return -absolute;
}

async function normalizeInput(input: CreateTransactionInput): Promise<NormalizedTransaction> {
  const baseType = resolveBaseType(input.type);
  const targetAccountId = input.target_account_id ?? input.destination_account_id ?? input.debt_account_id ?? null;

  if (input.type === 'transfer' && !targetAccountId) {
    throw new Error('Transfer requires targetAccountId');
  }

  const normalizedAmount = await normalizeAmountForType(input.type, input.amount);

  return {
    occurred_at: input.occurred_at,
    note: input.note ?? null,
    status: 'posted',
    tag: input.tag ?? null,
    created_by: null,
    amount: normalizedAmount,
    type: input.type,
    account_id: input.source_account_id,
    target_account_id: baseType === 'transfer' ? targetAccountId : null,
    category_id: input.category_id ?? null,
    person_id: input.person_id ?? null,
    metadata: input.metadata ?? null,
    shop_id: input.shop_id ?? null,
    persisted_cycle_tag: null,
    is_installment: Boolean(input.is_installment),
    installment_plan_id: null,
    cashback_share_percent: input.cashback_share_percent ?? null,
    cashback_share_fixed: input.cashback_share_fixed ?? null,
    cashback_mode: null,
    currency: null,
  };
}



async function logHistory(
  transactionId: string,
  changeType: 'edit' | 'void',
  snapshot: any
) {
  const supabase = createClient();
  const { error } = await supabase.from('transaction_history' as any).insert({
    transaction_id: transactionId,
    change_type: changeType,
    snapshot_before: snapshot,
    // created_at is default now()
  } as any);

  if (error) {
    console.error('Failed to log transaction history:', error);
  }
}

export async function calculateAccountImpacts(txn: {
  account_id: string;
  target_account_id?: string | null;
  type: TransactionType;
  amount: number;
  status?: TransactionStatus | null;
}): Promise<Record<string, number>> {
  if (txn.status === 'void') return {};

  const baseType = resolveBaseType(txn.type);
  const impacts: Record<string, number> = {};
  impacts[txn.account_id] = (impacts[txn.account_id] ?? 0) + txn.amount;

  if (baseType === 'transfer' && txn.target_account_id) {
    impacts[txn.target_account_id] = (impacts[txn.target_account_id] ?? 0) + Math.abs(txn.amount);
  }

  return impacts;
}

async function recalcForAccounts(accountIds: Set<string>) {
  if (accountIds.size === 0) return;
  const { recalculateBalance } = await import('./account.service');
  await Promise.all(Array.from(accountIds).map(id => recalculateBalance(id)));
}

async function fetchLookups(rows: FlatTransactionRow[]): Promise<LookupMaps> {
  const supabase = createClient();
  const accountIds = new Set<string>();
  const categoryIds = new Set<string>();
  const personIds = new Set<string>();
  const shopIds = new Set<string>();

  rows.forEach(row => {
    accountIds.add(row.account_id);
    if (row.target_account_id) accountIds.add(row.target_account_id);
    if (row.category_id) categoryIds.add(row.category_id);
    if (row.person_id) personIds.add(row.person_id);
    if (row.shop_id) shopIds.add(row.shop_id);
  });

  const [accountsRes, categoriesRes, peopleRes, shopsRes] = await Promise.all([
    accountIds.size
      ? supabase.from('accounts').select('id, name, logo_url, type').in('id', Array.from(accountIds))
      : Promise.resolve({ data: [] as any[], error: null }),
    categoryIds.size
      ? supabase.from('categories').select('id, name, type, logo_url, icon').in('id', Array.from(categoryIds))
      : Promise.resolve({ data: [] as any[], error: null }),
    personIds.size
      ? supabase.from('profiles').select('id, name, avatar_url').in('id', Array.from(personIds))
      : Promise.resolve({ data: [] as any[], error: null }),
    shopIds.size
      ? supabase.from('shops').select('id, name, logo_url').in('id', Array.from(shopIds))
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  const accounts = new Map<string, { id: string; name: string; logo_url: string | null; type: string | null }>();
  const categories = new Map<string, { id: string; name: string; type: 'income' | 'expense'; logo_url?: string | null; icon?: string | null }>();
  const people = new Map<string, { id: string; name: string; avatar_url: string | null }>();
  const shops = new Map<string, { id: string; name: string; logo_url: string | null }>();

  (accountsRes.data ?? []).forEach((row: any) => {
    if (!row?.id) return;
    accounts.set(row.id, {
      id: row.id,
      name: row.name,
      logo_url: row.logo_url ?? null,
      type: row.type ?? null,
    });
  });

  (categoriesRes.data ?? []).forEach((row: any) => {
    if (!row?.id) return;
    categories.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.type,
      logo_url: row.logo_url ?? null,
      icon: row.icon ?? null,
    });
  });

  (peopleRes.data ?? []).forEach((row: any) => {
    if (!row?.id) return;
    people.set(row.id, {
      id: row.id,
      name: row.name,
      avatar_url: row.avatar_url ?? null,
    });
  });

  (shopsRes.data ?? []).forEach((row: any) => {
    if (!row?.id) return;
    shops.set(row.id, {
      id: row.id,
      name: row.name,
      logo_url: row.logo_url ?? null,
    });
  });

  return { accounts, categories, people, shops };
}

function buildSyntheticLines(
  row: FlatTransactionRow,
  baseType: 'income' | 'expense' | 'transfer',
  lookups: LookupMaps
): TransactionWithLineRelations[] {
  const lines: TransactionWithLineRelations[] = [];
  const amountAbs = Math.abs(row.amount);
  const sourceAccount = lookups.accounts.get(row.account_id) ?? null;
  const targetAccount = row.target_account_id ? lookups.accounts.get(row.target_account_id) ?? null : null;
  const category = row.category_id ? lookups.categories.get(row.category_id) ?? null : null;
  const person = row.person_id ? lookups.people.get(row.person_id) ?? null : null;

  lines.push({
    id: `${row.id}:source`,
    transaction_id: row.id,
    account_id: row.account_id,
    amount: row.amount,
    type: row.amount >= 0 ? 'debit' : 'credit',
    person_id: row.person_id,
    metadata: row.metadata,
    original_amount: amountAbs,
    accounts: sourceAccount
      ? { name: sourceAccount.name, logo_url: sourceAccount.logo_url, type: sourceAccount.type as AccountRow['type'] }
      : null,
    categories: null,
    profiles: person ? { name: person.name, avatar_url: person.avatar_url } : null,
  });

  if (baseType === 'transfer' && row.target_account_id) {
    lines.push({
      id: `${row.id}:target`,
      transaction_id: row.id,
      account_id: row.target_account_id,
      amount: amountAbs,
      type: 'debit',
      person_id: row.person_id,
      accounts: targetAccount
        ? { name: targetAccount.name, logo_url: targetAccount.logo_url, type: targetAccount.type as AccountRow['type'] }
        : null,
      categories: null,
      profiles: person ? { name: person.name, avatar_url: person.avatar_url } : null,
    });
  }

  if (row.category_id) {
    lines.push({
      id: `${row.id}:category`,
      transaction_id: row.id,
      category_id: row.category_id,
      amount: baseType === 'income' ? -amountAbs : amountAbs,
      type: baseType === 'income' ? 'credit' : 'debit',
      person_id: row.person_id,
      metadata: row.metadata,
      accounts: null,
      categories: category
        ? { name: category.name, type: category.type, logo_url: category.logo_url ?? null, icon: category.icon ?? null }
        : null,
      profiles: person ? { name: person.name, avatar_url: person.avatar_url } : null,
    });
  }

  return lines;
}

function mapTransactionRow(
  row: FlatTransactionRow,
  options: { lookups: LookupMaps; contextAccountId?: string; contextMode?: 'person' | 'account' | 'general' }
): TransactionWithDetails {
  const { lookups, contextAccountId } = options;
  const baseType = resolveBaseType(row.type);
  const account = lookups.accounts.get(row.account_id) ?? null;
  const target = row.target_account_id ? lookups.accounts.get(row.target_account_id) ?? null : null;
  const category = row.category_id ? lookups.categories.get(row.category_id) ?? null : null;
  const person = row.person_id ? lookups.people.get(row.person_id) ?? null : null;
  const shop = row.shop_id ? lookups.shops.get(row.shop_id) ?? null : null;

  // Fix Unknown: If transfer-like but NO destination (no target account AND no person),
  // force it to act like a simple income/expense so we don't show "Account -> Unknown"
  let effectiveBaseType = baseType;
  if (baseType === 'transfer' && !row.target_account_id && !row.person_id) {
    effectiveBaseType = row.amount >= 0 ? 'income' : 'expense';
  }

  let displayAmount = row.amount;
  if (
    contextAccountId &&
    effectiveBaseType === 'transfer' &&
    row.target_account_id === contextAccountId &&
    row.account_id !== contextAccountId
  ) {
    displayAmount = Math.abs(row.amount);
  }

  const displayType: TransactionWithDetails['displayType'] =
    effectiveBaseType === 'transfer'
      ? row.target_account_id && contextAccountId === row.target_account_id
        ? 'income'
        : 'expense'
      : effectiveBaseType === 'income'
        ? 'income'
        : 'expense';

  const lines = buildSyntheticLines(row, effectiveBaseType, lookups);

  return {
    ...row,
    amount: displayAmount,
    original_amount: Math.abs(row.amount),
    displayType,
    display_type: displayType === 'income' ? 'IN' : displayType === 'expense' ? 'OUT' : 'TRANSFER',
    category_name: category?.name,
    category_icon: category?.icon ?? null,
    category_logo_url: category?.logo_url ?? null,
    account_name: account?.name,
    source_name: account?.name ?? null,
    destination_name: target?.name ?? (person ? person.name : null),
    source_logo: account?.logo_url ?? null,
    destination_logo: target?.logo_url ?? null,
    person_name: person?.name ?? null,
    person_avatar_url: person?.avatar_url ?? null,
    shop_name: shop?.name ?? null,
    shop_logo_url: shop?.logo_url ?? null,
    transaction_lines: lines,
    persisted_cycle_tag: row.persisted_cycle_tag ?? null,
    installment_plan_id: row.installment_plan_id ?? null,
    is_installment: row.is_installment ?? null,
    created_by: row.created_by ?? null,
    cashback_share_percent: row.cashback_share_percent ?? null,
    cashback_share_fixed: row.cashback_share_fixed ?? null,
    cashback_share_amount: row.cashback_share_amount ?? null,
    cashback_mode: row.cashback_mode ?? null,
    currency: row.currency ?? null,

    final_price: row.final_price ?? null,
    history_count: row.transaction_history?.[0]?.count ?? 0,
  };
}

export async function loadTransactions(options: {
  accountId?: string;
  personId?: string;
  shopId?: string;
  limit?: number;
  context?: 'person' | 'account' | 'general';
  includeVoided?: boolean;
}): Promise<TransactionWithDetails[]> {
  const supabase = createClient();
  let query = supabase
    .from('transactions')
    .select(
      'id, occurred_at, note, status, tag, created_at, created_by, amount, type, account_id, target_account_id, category_id, person_id, metadata, shop_id, persisted_cycle_tag, is_installment, installment_plan_id, cashback_share_percent, cashback_share_fixed, final_price, transaction_history(count)'
    )
    .order('occurred_at', { ascending: false });

  if (!options.includeVoided) {
    query = query.neq('status', 'void');
  }

  if (options.personId) {
    query = query.eq('person_id', options.personId);
  } else if (options.accountId) {
    query = query.or(`account_id.eq.${options.accountId},target_account_id.eq.${options.accountId}`);
  }

  if (options.shopId) {
    query = query.eq('shop_id', options.shopId);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  const rows = data as FlatTransactionRow[];
  const lookups = await fetchLookups(rows);
  return rows.map(row => mapTransactionRow(row, { lookups, contextAccountId: options.accountId, contextMode: options.context ?? 'general' }));
}

export async function createTransaction(input: CreateTransactionInput): Promise<string | null> {
  try {
    const normalized = await normalizeInput(input);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('transactions')
      .insert(normalized as any)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating transaction:', error);
      return null;
    }

    const transactionId = (data as { id?: string }).id ?? null;

    const affectedAccounts = new Set<string>();
    affectedAccounts.add(normalized.account_id);
    if (normalized.target_account_id) affectedAccounts.add(normalized.target_account_id);
    await recalcForAccounts(affectedAccounts);

    // SHEET SYNC: Auto-sync to Google Sheets when person_id exists
    if (transactionId && input.person_id) {
      try {
        const { syncTransactionToSheet } = await import('./sheet.service');

        // Fetch shop name for payload
        let shopName: string | null = null;
        if (input.shop_id) {
          const { data: shop } = await supabase.from('shops').select('name').eq('id', input.shop_id).single();
          shopName = (shop as any)?.name ?? null;
        }

        // Calculate final amount (for debt: amount - cashback)
        const originalAmount = Math.abs(input.amount);
        const percentRate = Math.min(100, Math.max(0, Number(input.cashback_share_percent ?? 0))) / 100;
        const fixedAmount = Math.max(0, Number(input.cashback_share_fixed ?? 0));
        const cashback = (originalAmount * percentRate) + fixedAmount;
        const finalAmount = input.type === 'debt' ? (originalAmount - cashback) : originalAmount;

        const syncPayload = {
          id: transactionId,
          occurred_at: input.occurred_at,
          note: input.note,
          tag: input.tag,
          shop_name: shopName,
          amount: finalAmount,
          original_amount: originalAmount,
          cashback_share_percent: percentRate,
          cashback_share_fixed: fixedAmount,
          type: input.type === 'repayment' ? 'In' : 'Debt',
        };
        void syncTransactionToSheet(input.person_id, syncPayload as any, 'create').catch(err => {
          console.error('[Sheet Sync] Create entry failed:', err);
        });
      } catch (syncError) {
        console.error('[Sheet Sync] Import or sync failed:', syncError);
      }
    }

    revalidatePath('/transactions');
    revalidatePath('/accounts');
    revalidatePath('/people');
    if (input.person_id) {
      revalidatePath(`/people/${input.person_id}`);
    }

    return transactionId;
  } catch (error) {
    console.error('Unhandled error in createTransaction:', error);
    return null;
  }
}

export async function updateTransaction(id: string, input: CreateTransactionInput): Promise<boolean> {
  const supabase = createClient();

  // Fetch existing transaction INCLUDING person_id for sheet sync
  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select('id, occurred_at, note, tag, account_id, target_account_id, person_id, amount, type, shop_id, cashback_share_percent, cashback_share_fixed')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error('Failed to load transaction before update:', fetchError);
    return false;
  }

  let normalized: NormalizedTransaction | null;
  try {
    normalized = await normalizeInput(input);
  } catch (err) {
    console.error('Invalid transaction input:', err);
    return false;
  }

  if (!normalized) {
    console.error('Invalid input for transaction update');
    return false;
  }

  // LOG HISTORY BEFORE UPDATE
  await logHistory(id, 'edit', existing);

  const { error } = await (supabase
    .from('transactions')
    .update as any)(normalized)
    .eq('id', id);

  if (error) {
    console.error('Failed to update transaction:', error);
    return false;
  }

  const affectedAccounts = new Set<string>();
  if ((existing as any).account_id) affectedAccounts.add((existing as any).account_id);
  if ((existing as any).target_account_id) affectedAccounts.add((existing as any).target_account_id);
  affectedAccounts.add(normalized.account_id);
  if (normalized.target_account_id) affectedAccounts.add(normalized.target_account_id);
  await recalcForAccounts(affectedAccounts);

  const oldPersonId = (existing as any).person_id;
  const newPersonId = input.person_id;

  // SHEET SYNC: Auto-sync to Google Sheets when person_id exists
  try {
    const { syncTransactionToSheet } = await import('./sheet.service');

    console.log('[Sheet Sync] updateTransaction sync triggered', {
      id,
      oldPersonId,
      newPersonId,
      samePerson: oldPersonId === newPersonId
    });

    // OPTIMIZATION: If person is the same, use 'update' action (mapped to 'edit')
    if (oldPersonId && newPersonId && oldPersonId === newPersonId) {
      console.log('[Sheet Sync] Updating existing entry for person:', newPersonId);

      // Fetch shop name for payload
      let shopName: string | null = null;
      if (input.shop_id) {
        const { data: shop } = await supabase.from('shops').select('name').eq('id', input.shop_id).single();
        shopName = (shop as any)?.name ?? null;
      }

      // Calculate final amount
      const originalAmount = Math.abs(input.amount);
      const percentRate = Math.min(100, Math.max(0, Number(input.cashback_share_percent ?? 0))) / 100;
      const fixedAmount = Math.max(0, Number(input.cashback_share_fixed ?? 0));
      const cashback = (originalAmount * percentRate) + fixedAmount;
      const finalAmount = input.type === 'debt' ? (originalAmount - cashback) : originalAmount;

      const updatePayload = {
        id,
        occurred_at: input.occurred_at,
        note: input.note,
        tag: input.tag,
        shop_name: shopName,
        amount: finalAmount,
        original_amount: originalAmount,
        cashback_share_percent: percentRate,
        cashback_share_fixed: fixedAmount,
        type: input.type === 'repayment' ? 'In' : 'Debt',
      };

      try {
        await syncTransactionToSheet(newPersonId, updatePayload as any, 'update');
        console.log('[Sheet Sync] Update completed');
      } catch (err) {
        console.error('[Sheet Sync] Update entry failed:', err);
      }

    } else {
      // Logic for DIFFERENT person (or one added/removed): Delete Old -> Create New

      // 1. Delete old entry if existed
      if (oldPersonId) {
        console.log('[Sheet Sync] Deleting old entry for person:', oldPersonId);
        const deletePayload = {
          id: (existing as any).id,
          occurred_at: (existing as any).occurred_at,
          note: (existing as any).note,
          tag: (existing as any).tag,
          amount: (existing as any).amount ?? 0,
        };
        try {
          await syncTransactionToSheet(oldPersonId, deletePayload as any, 'delete');
          console.log('[Sheet Sync] Delete completed');
        } catch (err) {
          console.error('[Sheet Sync] Delete old entry failed:', err);
        }
      }

      // 2. Create new entry if exists (AFTER delete)
      if (newPersonId) {
        console.log('[Sheet Sync] Creating new entry for person:', newPersonId);

        let shopName: string | null = null;
        if (input.shop_id) {
          const { data: shop } = await supabase.from('shops').select('name').eq('id', input.shop_id).single();
          shopName = (shop as any)?.name ?? null;
        }

        const originalAmount = Math.abs(input.amount);
        const percentRate = Math.min(100, Math.max(0, Number(input.cashback_share_percent ?? 0))) / 100;
        const fixedAmount = Math.max(0, Number(input.cashback_share_fixed ?? 0));
        const cashback = (originalAmount * percentRate) + fixedAmount;
        const finalAmount = input.type === 'debt' ? (originalAmount - cashback) : originalAmount;

        const createPayload = {
          id,
          occurred_at: input.occurred_at,
          note: input.note,
          tag: input.tag,
          shop_name: shopName,
          amount: finalAmount,
          original_amount: originalAmount,
          cashback_share_percent: percentRate,
          cashback_share_fixed: fixedAmount,
          type: input.type === 'repayment' ? 'In' : 'Debt',
        };

        try {
          await syncTransactionToSheet(newPersonId, createPayload as any, 'create');
          console.log('[Sheet Sync] Create completed');
        } catch (err) {
          console.error('[Sheet Sync] Create new entry failed:', err);
        }
      }
    }
  } catch (syncError) {
    console.error('[Sheet Sync] Import or sync failed:', syncError);
    // Don't fail the update if sheet sync fails
  }

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/people');
  if (oldPersonId) revalidatePath(`/people/${oldPersonId}`);
  if (newPersonId && newPersonId !== oldPersonId) revalidatePath(`/people/${newPersonId}`);
  return true;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('transactions')
    .select('account_id, target_account_id, person_id')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) {
    console.error('Error deleting transaction:', error);
    return false;
  }

  const affected = new Set<string>();
  if ((existing as any)?.account_id) affected.add((existing as any).account_id);
  if ((existing as any)?.target_account_id) affected.add((existing as any).target_account_id);
  await recalcForAccounts(affected);

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/people');
  if ((existing as any)?.person_id) {
    revalidatePath(`/people/${(existing as any).person_id}`);
  }
  return true;
}

export async function voidTransaction(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('transactions')
    .select('account_id, target_account_id, metadata, status, person_id')
    .eq('id', id)
    .maybeSingle();

  // 1. Guard: Check for children (linked transactions) - STRICT CHECK
  // We must prevent voiding if this transaction is a parent of another active transaction.
  // This includes:
  // - linked_transaction_id column pointing to this ID (used by some refund flows)
  // - Being 'original_transaction_id' of a Refund Request (GD2) in metadata
  // - Being 'pending_refund_id' of a Refund Confirmation (GD3) in metadata

  // First check linked_transaction_id column directly
  const { data: linkedChildren } = await supabase
    .from('transactions')
    .select('id, status')
    .neq('status', 'void')
    .eq('linked_transaction_id', id)
    .limit(1);

  if (linkedChildren && linkedChildren.length > 0) {
    throw new Error("Không thể hủy giao dịch này vì đã có giao dịch liên quan (VD: Đã xác nhận tiền về). Vui lòng hủy giao dịch nối tiếp trước.");
  }

  // Also check metadata fields using contains filter (for JSONB)
  const { data: metaChildren } = await supabase
    .from('transactions')
    .select('id, status, metadata')
    .neq('status', 'void')
    .or(`metadata.cs.{"original_transaction_id":"${id}"},metadata.cs.{"pending_refund_id":"${id}"}`)
    .limit(1);

  if (metaChildren && metaChildren.length > 0) {
    throw new Error("Không thể hủy giao dịch này vì đã có giao dịch liên quan (VD: Đã xác nhận tiền về). Vui lòng hủy giao dịch nối tiếp trước.");
  }

  // 2. Log History
  await logHistory(id, 'void', existing);

  // 3. Rollback Logic (Refund Chain)
  const meta = ((existing as any)?.metadata || {}) as any;

  // Case A: Voiding Confirmation (GD3) -> Revert Pending Refund (GD2) to 'pending'
  if (meta.is_refund_confirmation && meta.pending_refund_id) {
    await (supabase.from('transactions').update as any)({ status: 'pending' }).eq('id', meta.pending_refund_id);
  }

  // Case B: Voiding Refund Request (GD2) -> Revert Original (GD1) to 'posted' & Clear Metadata
  // Only if NOT a confirmation (which also has original_id)
  if (meta.original_transaction_id && !meta.is_refund_confirmation) {
    const { data: gd1 } = await supabase.from('transactions').select('metadata').eq('id', meta.original_transaction_id).single();
    if (gd1) {
      const newMeta = { ...((gd1 as any).metadata || {}) };
      delete newMeta.refund_status;
      delete newMeta.refunded_amount;
      delete newMeta.has_refund_request;
      delete newMeta.refund_request_id;

      await (supabase.from('transactions').update as any)({
        status: 'posted',
        metadata: newMeta
      }).eq('id', meta.original_transaction_id);
    }
  }

  // Simplified Void: Just update status. No need to join lines which might be complex or deleted.
  const { error } = await (supabase
    .from('transactions')
    .update as any)({ status: 'void' })
    .eq('id', id);

  if (error) {
    console.error('Failed to void transaction:', error);
    return false;
  }

  const affected = new Set<string>();
  if ((existing as any)?.account_id) affected.add((existing as any).account_id);
  if ((existing as any)?.target_account_id) affected.add((existing as any).target_account_id);
  // Also try to trigger sync delete to sheet if possible, but service method might not have full context.
  // The ACTION layer handles sheet sync better. Service is low-level.

  await recalcForAccounts(affected);

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/people');
  if ((existing as any)?.person_id) {
    revalidatePath(`/people/${(existing as any).person_id}`);
  }
  return true;
}

export async function restoreTransaction(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('transactions')
    .select('account_id, target_account_id, person_id')
    .eq('id', id)
    .maybeSingle();

  const { error } = await (supabase
    .from('transactions')
    .update as any)({ status: 'posted' })
    .eq('id', id);

  if (error) {
    console.error('Failed to restore transaction:', error);
    return false;
  }

  const affected = new Set<string>();
  if ((existing as any)?.account_id) affected.add((existing as any).account_id);
  if ((existing as any)?.target_account_id) affected.add((existing as any).target_account_id);
  await recalcForAccounts(affected);

  revalidatePath('/transactions');
  revalidatePath('/accounts');
  revalidatePath('/people');
  if ((existing as any)?.person_id) {
    revalidatePath(`/people/${(existing as any).person_id}`);
  }
  return true;
}

export async function getRecentTransactions(limit: number = 10): Promise<TransactionWithDetails[]> {
  return loadTransactions({ limit });
}

export async function getTransactionsByShop(shopId: string, limit: number = 50): Promise<TransactionWithDetails[]> {
  return loadTransactions({ shopId, limit });
}

type UnifiedTransactionParams = {
  accountId?: string;
  personId?: string;
  limit?: number;
  context?: 'person' | 'account';
  includeVoided?: boolean;
};

export async function getUnifiedTransactions(
  accountOrOptions?: string | UnifiedTransactionParams,
  limitArg: number = 50
): Promise<TransactionWithDetails[]> {
  const parsed =
    typeof accountOrOptions === 'object' && accountOrOptions !== null
      ? accountOrOptions
      : { accountId: accountOrOptions as string | undefined, limit: limitArg };

  return loadTransactions({
    accountId: parsed.accountId,
    personId: parsed.personId,
    limit: parsed.limit ?? limitArg,
    context: parsed.context,
    includeVoided: parsed.includeVoided
  });
}

// Refund helpers are intentionally simplified in single-table mode.
export type PendingRefundItem = {
  id: string;
  occurred_at: string;
  note: string | null;
  tag: string | null;
  amount: number;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  original_note: string | null;
  original_category: string | null;
  linked_transaction_id?: string;
};

// Simplified Refund Logic for Single Table
export async function requestRefund(
  transactionId: string,
  amount: number,
  isPartial: boolean
): Promise<{ success: boolean; refundTransactionId?: string; error?: string }> {
  const supabase = createClient();

  // 1. Fetch original transaction to get metadata
  const { data: originalTxn, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (fetchError || !originalTxn) {
    return { success: false, error: 'Original transaction not found' };
  }

  const originalRow = originalTxn as FlatTransactionRow;
  const originalMeta = (originalRow.metadata || {}) as Record<string, any>;

  // 1a. Format Note (GD2) - No prefix ID, badges show ID separately
  const shortId = originalRow.id.split('-')[0].toUpperCase();
  let formattedNote = `Refund Request: ${originalRow.note ?? ''}`;

  // If original was debt (had person_id), append Cancel Debt info
  if (originalRow.person_id) {
    // Fetch person name if possible, or just append generic. 
    // We can try to fetch, or just accept that we might not have name handy here without extra query.
    // But wait, we can do a quick lookup if we want, or just "Cancel Debt". 
    // "Cancel Debt: ${PersonName}" was requested.
    const { data: person } = await supabase.from('profiles').select('name').eq('id', originalRow.person_id).single();
    if (person) {
      formattedNote += ` - Cancel Debt: ${(person as any).name}`;
    }
  }

  // 2. Create Refund Transaction (Income)
  // Park in PENDING_REFUNDS account initially
  // GD2: Pending Refund
  const refundTransaction = {
    occurred_at: new Date().toISOString(),
    amount: Math.abs(amount), // Ensure positive for Income
    type: 'income',
    account_id: '99999999-9999-9999-9999-999999999999', // REFUND_PENDING_ACCOUNT_ID
    category_id: 'e0000000-0000-0000-0000-000000000095', // REFUND_CAT_ID (System Category)
    note: formattedNote,
    status: 'pending', // Yellow badge for pending
    metadata: {
      original_transaction_id: transactionId,
      refund_type: isPartial ? 'partial' : 'full',
      original_note: originalRow.note,
    },
    created_by: null
  };

  const { data: newRefund, error } = await supabase
    .from('transactions')
    .insert(refundTransaction as any)
    .select()
    .single();

  if (error || !newRefund) {
    console.error('Failed to create refund transaction:', error);
    return { success: false, error: error?.message };
  }

  // Update original transaction metadata to indicate refund requested
  const isFullRefund = Math.abs(amount) >= Math.abs(originalRow.amount);

  const updatePayload: any = {
    metadata: {
      ...originalMeta,
      refund_status: isFullRefund ? 'refunded' : 'requested',
      refunded_amount: originalMeta.refunded_amount ? originalMeta.refunded_amount + amount : amount,
      has_refund_request: true,
      refund_request_id: (newRefund as any).id
    }
  };

  // UNLINK PERSON IF FULL REFUND
  if (isFullRefund) {
    updatePayload.person_id = null; // Unlink person to clear debt

    // Preserve Person Name in Note if unlinking
    if (originalRow.person_id) {
      // We need to fetch the name if we want to save it, or use what we solved earlier.
      // Let's maximize usage of existing data or quick fetch.
      // We fetched `person` earlier at line 670? YES.
      // "Cancel Debt: {Name}" logic was used for GD2 note. We can reuse 'person' data.
      const { data: personP } = await supabase.from('profiles').select('name').eq('id', originalRow.person_id).single();
      const personName = (personP as any)?.name;
      if (personName) {
        const currentNote = originalRow.note || '';
        if (!currentNote.includes(`(Debtor: ${personName})`)) {
          updatePayload.note = `${currentNote} - (Debtor: ${personName})`;
        }
      }
    }
  }

  if (isFullRefund) {
    updatePayload.status = 'waiting_refund'; // Orange/Amber badge
  }

  await (supabase.from('transactions').update as any)(updatePayload).eq('id', transactionId);

  revalidatePath('/transactions');
  return { success: true, refundTransactionId: (newRefund as any).id };
}

export async function confirmRefund(
  pendingTransactionId: string,
  targetAccountId: string
): Promise<{ success: boolean; confirmTransactionId?: string; error?: string }> {
  const supabase = createClient();

  // 1. Fetch the Pending Transaction (GD2)
  const { data: pendingTxn, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', pendingTransactionId)
    .single();

  if (fetchError || !pendingTxn) {
    return { success: false, error: 'Pending refund transaction not found' };
  }

  const pendingRow = pendingTxn as FlatTransactionRow;
  const pendingMeta = (pendingRow.metadata || {}) as Record<string, any>;

  // Extract Short ID from Original Transaction ID (if available)
  const originalTxnId = pendingMeta.original_transaction_id as string | undefined;
  const shortId = originalTxnId ? originalTxnId.substring(0, 4).toUpperCase() : '????';

  // 2. Update GD2 -> Completed
  const { error: updateError } = await (supabase
    .from('transactions')
    .update as any)({
      status: 'completed', // Green/Done
    })
    .eq('id', pendingTransactionId);

  if (updateError) {
    console.error('Confirm refund failed (update pending):', updateError);
    return { success: false, error: updateError.message };
  }

  // 3. Create GD3: Real Money In Transaction
  const confirmationTransaction = {
    occurred_at: new Date().toISOString(),
    amount: Math.abs(pendingRow.amount),
    type: 'income',
    account_id: targetAccountId, // The Real Bank
    category_id: 'e0000000-0000-0000-0000-000000000095', // REFUND_CAT_ID
    note: `Refund Received`,
    status: 'posted',
    created_by: null,
    // linked_transaction_id column = GD2's ID so void guard can detect it
    linked_transaction_id: pendingTransactionId,
    metadata: {
      original_transaction_id: pendingMeta.original_transaction_id,
      pending_refund_id: pendingTransactionId,
      is_refund_confirmation: true
    }
  };

  const { error: createError } = await supabase
    .from('transactions')
    .insert(confirmationTransaction as any);

  if (createError) {
    console.error('Confirm refund failed (create confirmation):', createError);
    // Rollback GD2 update theoretically, but let's just return error for now
    return { success: false, error: createError.message };
  }

  await recalcForAccounts(new Set([targetAccountId, '99999999-9999-9999-9999-999999999999']));

  // Also finalize the original transaction if it was full refund?
  if (pendingMeta.original_transaction_id) {
    const { data: original } = await supabase.from('transactions').select('status, metadata').eq('id', pendingMeta.original_transaction_id).single();
    if (original && (original as any).status === 'waiting_refund') {
      await (supabase.from('transactions').update as any)({ status: 'refunded' }).eq('id', pendingMeta.original_transaction_id);
    }
  }

  revalidatePath('/transactions');

  return { success: true };
}

export async function getPendingRefunds(): Promise<PendingRefundItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', '99999999-9999-9999-9999-999999999999')
    .eq('status', 'pending') // Only show actual pending, not completed ones history
    .order('occurred_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    occurred_at: row.occurred_at,
    note: row.note,
    tag: row.tag,
    amount: row.amount,
    status: row.status,
    original_note: row.metadata?.original_note ?? null,
    original_category: null,
    linked_transaction_id: row.metadata?.original_transaction_id,
  }));
}
