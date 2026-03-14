"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { type Json } from "@/types/database.types";
import { normalizeMonthTag } from "@/lib/month-tag";
import {
  TransactionWithDetails,
  AccountRow,
  CashbackMode,
} from "@/types/moneyflow.types";
import {
  upsertPocketBaseTransactionCashback,
  removePocketBaseTransactionCashback,
} from "./pocketbase/cashback-sync.service";
import {
  pocketbaseGetById,
  pocketbaseList,
  toPocketBaseId,
  pocketbaseCreate,
  pocketbaseUpdate,
  pocketbaseDelete,
} from "./pocketbase/server";
import { 
  loadPocketBaseTransactions, 
  loadPocketBaseTransactionsForAccount 
} from './pocketbase/account-details.service'

type SheetSyncAction = "create" | "update" | "delete";

async function trySyncPeopleSheet(
  personId: string | null | undefined,
  payload: {
    id: string;
    occurred_at?: string | null;
    note?: string | null;
    tag?: string | null;
    amount?: number | null;
    original_amount?: number | null;
    cashback_share_percent?: number | null;
    cashback_share_fixed?: number | null;
    type?: string | null;
    shop_name?: string | null;
    status?: string | null;
  },
  action: SheetSyncAction,
) {
  if (!personId) return;
  try {
    const { syncTransactionToSheet } = await import("./sheet.service");
    await syncTransactionToSheet(personId, payload as any, action);
  } catch (error) {
    console.error("[Sheet Sync] transaction.service sync failed:", {
      action,
      personId,
      transactionId: payload.id,
      error,
    });
  }
}

export async function loadAccountTransactionsV2(accountId: string, limit = 2000) {
  return loadPocketBaseTransactionsForAccount(accountId, limit);
}

export async function getTransactionsByPeople(personIds: string[], limit = 2000) {
  return loadTransactions({
    personIds,
    limit
  });
}

export const getUnifiedTransactions = loadTransactions;

export async function getTransactionById(id: string, _includeRel?: boolean): Promise<TransactionWithDetails | null> {
  try {
    const pbId = toPocketBaseId(id, 'transactions');
    const record = await pocketbaseGetById<any>('transactions', pbId, 
      'category_id,account_id,target_account_id,person_id,shop_id,transaction_history,cashback_entries'
    );
    if (!record) return null;
    return record as any as TransactionWithDetails;
  } catch (error) {
    console.error(`[DB:PB] getTransactionById failed for ${id}:`, error);
    return null;
  }
}

export async function deleteTransaction(id: string): Promise<boolean> {
  return deleteTransactionCascade(id);
}

type TransactionStatus =
  | "posted"
  | "pending"
  | "void"
  | "waiting_refund"
  | "refunded"
  | "completed";
type TransactionType = "income" | "expense" | "transfer" | "debt" | "repayment" | "credit_pay" | "invest";

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
  installment_plan_id?: string | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  cashback_mode?: CashbackMode | null;
  linked_transaction_id?: string | null;
  debt_cycle_tag?: string | null;
  persisted_cycle_tag?: string | null;
  statement_cycle_tag?: string | null;
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
  cashback_mode?: CashbackMode | null;
  currency?: string | null;
  linked_transaction_id?: string | null;
  final_price?: number | null;
  // Expansions from PB
  category?: any;
  account?: any;
  target_account?: any;
  person?: any;
  shop?: any;
  transaction_history?: any[];
  cashback_entries?: any[];
};

export async function normalizeAmountForType(type: string, amount: number): Promise<number> {
  const absAmount = Math.abs(amount);
  if (type === 'expense' || type === 'debt' || type === 'transfer') {
    return -absAmount;
  }
  return absAmount;
}

type LookupMaps = {
  accounts: Map<string, any>;
  categories: Map<string, any>;
  people: Map<string, any>;
  shops: Map<string, any>;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function fetchHistoryCountMap(transactionIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (transactionIds.length === 0) return counts;

  const chunks = chunkArray(transactionIds, 60);

  for (const chunk of chunks) {
    const filter = chunk.map((id) => `transaction_id="${id}"`).join(" || ");
    let page = 1;

    while (true) {
      const response = await pocketbaseList<any>("transaction_history", {
        filter,
        page,
        perPage: 500,
        fields: "transaction_id",
      });

      for (const row of response.items ?? []) {
        const txnId = String(row.transaction_id || "");
        if (!txnId) continue;
        counts.set(txnId, (counts.get(txnId) ?? 0) + 1);
      }

      const totalPages = Number(response.totalPages ?? 1);
      if (page >= totalPages) break;
      page += 1;
    }
  }

  return counts;
}

function revalidatePersonPaths(personId: string | null | undefined) {
  if (!personId) return;
  try {
    revalidatePath(`/people/${personId}`);
    const pbId = toPocketBaseId(personId, 'people');
    if (pbId && pbId !== personId) {
      revalidatePath(`/people/${pbId}`);
    }
  } catch(e) {
     revalidatePath(`/people/${personId}`);
  }
}

function resolveBaseType(type: string | null | undefined): "income" | "expense" | "transfer" {
  if (type === "repayment") return "income";
  if (type === "debt") return "expense";
  if (type === "transfer" || type === "invest") return "transfer";
  if (type === "income") return "income";
  return "expense";
}

async function normalizeInput(input: CreateTransactionInput) {
  const accountId = toPocketBaseId(input.source_account_id, 'accounts');
  const targetId = input.target_account_id ? toPocketBaseId(input.target_account_id, 'accounts') : 
                   input.destination_account_id ? toPocketBaseId(input.destination_account_id, 'accounts') : 
                   input.debt_account_id ? toPocketBaseId(input.debt_account_id, 'accounts') : null;

  return {
    occurred_at: input.occurred_at,
    note: input.note,
    type: input.type,
    amount: input.amount,
    account_id: accountId,
    target_account_id: targetId,
    to_account_id: targetId, // Map both for compatibility
    category_id: input.category_id ? toPocketBaseId(input.category_id, 'categories') : null,
    person_id: input.person_id ? toPocketBaseId(input.person_id, 'people') : null,
    shop_id: input.shop_id ? toPocketBaseId(input.shop_id, 'shops') : null,
    tag: input.tag,
    debt_cycle_tag: input.debt_cycle_tag || null,
    persisted_cycle_tag: input.persisted_cycle_tag || null,
    statement_cycle_tag: input.statement_cycle_tag || null,
    status: "posted" as TransactionStatus,
    metadata: input.metadata || {},
    is_installment: input.is_installment || false,
    installment_plan_id: input.installment_plan_id ? toPocketBaseId(input.installment_plan_id, 'installments') : null,
    cashback_share_percent: input.cashback_share_percent,
    cashback_share_fixed: input.cashback_share_fixed,
    cashback_mode: input.cashback_mode,
    linked_transaction_id: input.linked_transaction_id ? toPocketBaseId(input.linked_transaction_id, 'transactions') : null,
  };
}

async function logHistory(
  transactionId: string,
  changeType: "edit" | "void",
  snapshot: any,
) {
  try {
    const pbTxnId = toPocketBaseId(transactionId, 'transactions');
    const compactSnapshot = {
      id: snapshot?.id ?? pbTxnId,
      occurred_at: snapshot?.occurred_at ?? snapshot?.date ?? null,
      date: snapshot?.date ?? snapshot?.occurred_at ?? null,
      note: snapshot?.note ?? snapshot?.description ?? null,
      type: snapshot?.type ?? null,
      status: snapshot?.status ?? null,
      amount: snapshot?.amount ?? null,
      original_amount: snapshot?.original_amount ?? null,
      final_price: snapshot?.final_price ?? null,
      account_id: snapshot?.account_id ?? null,
      target_account_id: snapshot?.target_account_id ?? snapshot?.to_account_id ?? null,
      person_id: snapshot?.person_id ?? null,
      category_id: snapshot?.category_id ?? null,
      shop_id: snapshot?.shop_id ?? null,
      cashback_mode: snapshot?.cashback_mode ?? null,
      cashback_share_percent: snapshot?.cashback_share_percent ?? null,
      cashback_share_fixed: snapshot?.cashback_share_fixed ?? null,
      tag: snapshot?.tag ?? null,
      debt_cycle_tag: snapshot?.debt_cycle_tag ?? null,
      persisted_cycle_tag: snapshot?.persisted_cycle_tag ?? null,
      statement_cycle_tag: snapshot?.statement_cycle_tag ?? null,
      metadata:
        snapshot?.metadata && typeof snapshot.metadata === "object"
          ? snapshot.metadata
          : null,
    };

    await pocketbaseCreate('transaction_history', {
      transaction_id: pbTxnId,
      change_type: changeType,
      snapshot_before: compactSnapshot,
      changed_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("[DB:PB] Failed to log transaction history:", err);
  }
}

async function recalcForAccounts(accountIds: Set<string>) {
  if (accountIds.size === 0) return;
  const { recalculateBalance } = await import("./account.service");
  await Promise.all(Array.from(accountIds).map((id) => recalculateBalance(id)));
}

async function fetchLookups(rows: FlatTransactionRow[]): Promise<LookupMaps> {
  const accountIds = new Set<string>();
  const categoryIds = new Set<string>();
  const personIds = new Set<string>();
  const shopIds = new Set<string>();

  rows.forEach((row) => {
    if (row.account_id) accountIds.add(row.account_id);
    if (row.target_account_id) accountIds.add(row.target_account_id);
    if (row.category_id) categoryIds.add(row.category_id);
    if (row.person_id) personIds.add(row.person_id);
    if (row.shop_id) shopIds.add(row.shop_id);
  });

  const [accountsList, categoriesList, peopleList, shopsList] = await Promise.all([
    accountIds.size
      ? pocketbaseList<any>("accounts", { filter: Array.from(accountIds).map(id => `id="${id}"`).join(' || ') })
      : Promise.resolve({ items: [] }),
    categoryIds.size
      ? pocketbaseList<any>("categories", { filter: Array.from(categoryIds).map(id => `id="${id}"`).join(' || ') })
      : Promise.resolve({ items: [] }),
    personIds.size
      ? pocketbaseList<any>("people", { filter: Array.from(personIds).map(id => `id="${id}"`).join(' || ') })
      : Promise.resolve({ items: [] }),
    shopIds.size
      ? pocketbaseList<any>("shops", { filter: Array.from(shopIds).map(id => `id="${id}"`).join(' || ') })
      : Promise.resolve({ items: [] }),
  ]);

  const accounts = new Map<string, any>();
  const categories = new Map<string, any>();
  const people = new Map<string, any>();
  const shops = new Map<string, any>();

  accountsList.items.forEach((row: any) => accounts.set(row.id, row));
  categoriesList.items.forEach((row: any) => categories.set(row.id, row));
  peopleList.items.forEach((row: any) => people.set(row.id, row));
  shopsList.items.forEach((row: any) => shops.set(row.id, row));

  return { accounts, categories, people, shops };
}

export async function mapTransactionRow(
  row: FlatTransactionRow,
  options: {
    lookups: LookupMaps;
    contextAccountId?: string;
    contextMode?: "person" | "account" | "general";
    historyCountMap?: Map<string, number>;
  },
): Promise<TransactionWithDetails> {
  const { lookups, contextAccountId, historyCountMap } = options;
  const baseType = resolveBaseType(row.type);
  const account = lookups.accounts.get(row.account_id) ?? null;
  const target = row.target_account_id ? (lookups.accounts.get(row.target_account_id) ?? null) : null;
  const category = row.category_id ? (lookups.categories.get(row.category_id) ?? null) : null;
  const person = row.person_id ? (lookups.people.get(row.person_id) ?? null) : null;
  const shop = row.shop_id ? (lookups.shops.get(row.shop_id) ?? null) : null;

  let effectiveBaseType = baseType;
  if (baseType === "transfer" && !row.target_account_id && !row.person_id) {
    effectiveBaseType = row.amount >= 0 ? "income" : "expense";
  }

  let displayAmount = row.amount;
  if (contextAccountId && effectiveBaseType === "transfer" && row.target_account_id === contextAccountId && row.account_id !== contextAccountId) {
    displayAmount = Math.abs(row.amount);
  }

  const displayType: TransactionWithDetails["displayType"] =
    effectiveBaseType === "transfer"
      ? row.target_account_id && contextAccountId === row.target_account_id
        ? "income"
        : "expense"
      : effectiveBaseType === "income"
        ? "income"
        : "expense";

  return {
    ...row,
    tag: normalizeMonthTag(row.tag) ?? row.tag ?? null,
    amount: displayAmount,
    original_amount: Math.abs(row.amount),
    displayType,
    display_type: displayType === "income" ? "IN" : displayType === "expense" ? "OUT" : "TRANSFER",
    category_name: category?.name,
    category_slug: category?.slug ?? null,
    category_icon: category?.icon ?? null,
    category_image_url: category?.image_url ?? null,
    account_name: account?.name,
    account_image_url: account?.image_url ?? null,
    source_name: account?.name ?? null,
    destination_name: target?.name ?? (person ? person.name : null),
    source_image: account?.image_url ?? null,
    destination_image: target?.image_url ?? null,
    person_name: person?.name ?? null,
    person_image_url: person?.image_url ?? null,
    person_pocketbase_id: person?.id ?? null,
    shop_name: shop?.name ?? null,
    shop_image_url: shop?.image_url ?? null,
    history_count: historyCountMap?.get(row.id) ?? 0,
    bank_back: 0,
    cashback_share_amount: (row.cashback_share_fixed ?? 0) + (Math.abs(row.amount) * (row.cashback_share_percent ?? 0)),
    profit: 0,
  } as TransactionWithDetails;
}

export async function loadTransactions(options: {
  transactionId?: string;
  accountId?: string;
  personId?: string;
  personIds?: string[];
  categoryId?: string;
  shopId?: string;
  installmentPlanId?: string;
  limit?: number;
  context?: "person" | "account" | "general";
  includeVoided?: boolean;
}): Promise<TransactionWithDetails[]> {
  try {
    const pbParams: any = {
      sort: "-date",
      perPage: options.limit || 100,
    };

    const filterParts: string[] = [];
    if (!options.includeVoided) filterParts.push('status != "void"');

    if (options.transactionId) {
      filterParts.push(`id = "${toPocketBaseId(options.transactionId, "transactions")}"`);
    } else {
      if (options.personIds && options.personIds.length > 0) {
        const pIds = options.personIds.map(id => `person_id="${toPocketBaseId(id, "people")}"`).join(" || ");
        filterParts.push(`(${pIds})`);
      } else if (options.personId) {
        filterParts.push(`person_id = "${toPocketBaseId(options.personId, "people")}"`);
      } else if (options.accountId) {
        const accId = toPocketBaseId(options.accountId, "accounts");
        filterParts.push(`(account_id = "${accId}" || to_account_id = "${accId}")`);
      }
    }

    if (options.shopId) filterParts.push(`shop_id = "${toPocketBaseId(options.shopId, "shops")}"`);
    if (options.categoryId) filterParts.push(`category_id = "${toPocketBaseId(options.categoryId, "categories")}"`);
    if (options.installmentPlanId) filterParts.push(`installment_plan_id = "${toPocketBaseId(options.installmentPlanId, "installments")}"`);

    if (filterParts.length > 0) {
      pbParams.filter = filterParts.join(" && ");
    }

    const response = await pocketbaseList<any>("transactions", pbParams);
    if (!response.items.length) return [];

    const rows = response.items as unknown as FlatTransactionRow[];
    const lookups = await fetchLookups(rows);
    const historyCountMap = await fetchHistoryCountMap(rows.map((row) => row.id));
    
    return Promise.all(
      rows.map((row) =>
        mapTransactionRow(row, {
          lookups,
          contextAccountId: options.accountId,
          contextMode: options.context ?? "general",
          historyCountMap,
        }),
      )
    );
  } catch (err) {
    console.error("[DB:PB] loadTransactions failed:", err);
    return [];
  }
}

export async function createTransaction(input: CreateTransactionInput): Promise<string | null> {
  console.log('[DB:PB] transactions.create', { type: input.type, amount: input.amount });
  try {
    const normalized = await normalizeInput(input);
    const id = toPocketBaseId(crypto.randomUUID(), 'transactions');
    
    const pbPayload = {
      ...normalized,
      id,
      date: normalized.occurred_at,
      occurred_at: normalized.occurred_at,
      description: normalized.note || '',
      note: normalized.note || '',
      final_price: normalized.amount, // Default to amount for now
    };

    await pocketbaseCreate('transactions', pbPayload);
    
    // Recalc Impacts
    const affectedAccounts = new Set<string>();
    affectedAccounts.add(normalized.account_id);
    if (normalized.target_account_id) affectedAccounts.add(normalized.target_account_id);
    await recalcForAccounts(affectedAccounts);

    // Revalidate
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/people");
    revalidatePersonPaths(input.person_id);

    // Keep People Sheet in sync for debt-person flows.
    if (normalized.person_id) {
      await trySyncPeopleSheet(
        normalized.person_id,
        {
          id,
          occurred_at: normalized.occurred_at,
          note: normalized.note ?? null,
          tag: normalized.tag ?? normalized.debt_cycle_tag ?? null,
          amount: Math.abs(normalized.amount ?? 0),
          original_amount: Math.abs(normalized.amount ?? 0),
          cashback_share_percent: normalized.cashback_share_percent ?? null,
          cashback_share_fixed: normalized.cashback_share_fixed ?? null,
          type: normalized.type,
          status: "posted",
        },
        "create",
      );
    }

    return id;
  } catch (error) {
    console.error("[DB:PB] createTransaction failed:", error);
    return null;
  }
}

export async function updateTransaction(id: string, input: CreateTransactionInput): Promise<boolean> {
  const pbId = toPocketBaseId(id, 'transactions');
  console.log('[DB:PB] transactions.update', { id: pbId });

  try {
    const existing = await pocketbaseGetById<any>('transactions', pbId);
    if (!existing) return false;

    const normalized = await normalizeInput(input);
    await logHistory(pbId, "edit", existing);
    
    await pocketbaseUpdate('transactions', pbId, {
      ...normalized,
      date: normalized.occurred_at,
      occurred_at: normalized.occurred_at,
      description: normalized.note || '',
      note: normalized.note || '',
      final_price: normalized.amount,
    });

    const affectedAccounts = new Set<string>();
    affectedAccounts.add(existing.account_id);
    if (existing.target_account_id) affectedAccounts.add(existing.target_account_id);
    affectedAccounts.add(normalized.account_id);
    if (normalized.target_account_id) affectedAccounts.add(normalized.target_account_id);
    await recalcForAccounts(affectedAccounts);

    const oldPersonId = existing.person_id as string | null;
    const newPersonId = normalized.person_id as string | null;
    const oldTag = (existing.tag || existing.debt_cycle_tag || existing.persisted_cycle_tag || null) as string | null;
    const newTag = (normalized.tag || normalized.debt_cycle_tag || normalized.persisted_cycle_tag || null) as string | null;

    // If transaction moved person or cycle, remove stale row from old sheet first.
    if (oldPersonId && (oldPersonId !== newPersonId || oldTag !== newTag)) {
      await trySyncPeopleSheet(
        oldPersonId,
        {
          id: pbId,
          occurred_at: existing.occurred_at || existing.date || null,
          tag: oldTag,
          amount: 0,
          status: "void",
        },
        "delete",
      );
    }

    if (newPersonId) {
      await trySyncPeopleSheet(
        newPersonId,
        {
          id: pbId,
          occurred_at: normalized.occurred_at,
          note: normalized.note ?? null,
          tag: newTag,
          amount: Math.abs(normalized.amount ?? 0),
          original_amount: Math.abs(normalized.amount ?? 0),
          cashback_share_percent: normalized.cashback_share_percent ?? null,
          cashback_share_fixed: normalized.cashback_share_fixed ?? null,
          type: normalized.type,
          status: "posted",
        },
        "update",
      );
    }

    revalidatePath("/transactions");
    revalidatePath(`/transactions/${pbId}`);
    return true;
  } catch (error) {
    console.error("[DB:PB] updateTransaction failed:", error);
    return false;
  }
}

export async function voidTransaction(id: string): Promise<boolean> {
  const pbId = toPocketBaseId(id, 'transactions');
  console.log('[DB:PB] transactions.void', { id: pbId });

  try {
    const existing = await pocketbaseGetById<any>('transactions', pbId);
    if (!existing) return false;

    await logHistory(pbId, "void", existing);
    await pocketbaseUpdate('transactions', pbId, { status: 'void' });

    const affectedAccounts = new Set<string>();
    affectedAccounts.add(existing.account_id);
    if (existing.target_account_id) affectedAccounts.add(existing.target_account_id);
    await recalcForAccounts(affectedAccounts);

    await trySyncPeopleSheet(
      (existing.person_id as string | null) ?? null,
      {
        id: pbId,
        occurred_at: existing.occurred_at || existing.date || null,
        tag: (existing.tag || existing.debt_cycle_tag || existing.persisted_cycle_tag || null) as string | null,
        amount: 0,
        status: "void",
      },
      "delete",
    );

    revalidatePath("/transactions");
    return true;
  } catch (error) {
    console.error("[DB:PB] voidTransaction failed:", error);
    return false;
  }
}

export async function deleteTransactionCascade(id: string): Promise<boolean> {
  const pbId = toPocketBaseId(id, 'transactions');
  console.log('[DB:PB] transactions.deleteCascade', { id: pbId });

  try {
    const existing = await pocketbaseGetById<any>('transactions', pbId);
    if (!existing) return false;

    // Delete history
    const history = await pocketbaseList<any>('transaction_history', { filter: `transaction_id="${pbId}"` });
    for (const h of history.items) {
      await pocketbaseDelete('transaction_history', h.id);
    }

    // Delete PB transaction
    await pocketbaseDelete('transactions', pbId);

    const affectedAccounts = new Set<string>();
    affectedAccounts.add(existing.account_id);
    if (existing.target_account_id) affectedAccounts.add(existing.target_account_id);
    await recalcForAccounts(affectedAccounts);

    await trySyncPeopleSheet(
      (existing.person_id as string | null) ?? null,
      {
        id: pbId,
        occurred_at: existing.occurred_at || existing.date || null,
        tag: (existing.tag || existing.debt_cycle_tag || existing.persisted_cycle_tag || null) as string | null,
        amount: 0,
        status: "void",
      },
      "delete",
    );

    revalidatePath("/transactions");
    return true;
  } catch (error) {
    console.error("[DB:PB] deleteTransactionCascade failed:", error);
    return false;
  }
}

export async function getRecentTransactions(limit: number = 20) {
  return loadTransactions({ limit });
}

export type PendingRefundItem = {
  id: string;
  occurred_at: string;
  amount: number;
  status: string;
  note: string | null;
  tag: string | null;
  original_note?: string | null;
  original_category?: string | null;
};

export async function getPendingRefunds(accountId?: string): Promise<PendingRefundItem[]> {
  const params: any = {
    filter: `status = "waiting_refund" || (metadata ~ "has_refund_request" && status != "void")`,
    sort: "-date",
    expand: "category_id"
  }
  if (accountId) {
    const pbAccId = toPocketBaseId(accountId, 'accounts');
    params.filter = `(${params.filter}) && account_id = "${pbAccId}"`;
  }

  const response = await pocketbaseList<any>("transactions", params);
  return response.items.map(t => ({
    id: t.id,
    occurred_at: t.occurred_at,
    amount: Math.abs(t.amount),
    status: t.status,
    note: t.note,
    tag: t.tag,
    original_note: t.note, // In PB we use same record, so original is current
    original_category: t.expand?.category_id?.name || null,
  }));
}

export async function confirmRefund(
  pendingTransactionId: string,
  targetAccountId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const pbTxnId = toPocketBaseId(pendingTransactionId, 'transactions');
    const pbAccId = toPocketBaseId(targetAccountId, 'accounts');
    
    const existing = await pocketbaseGetById<any>('transactions', pbTxnId);
    if (!existing) return { success: false, error: 'Transaction not found' };

    // Update the transaction status and account
    await pocketbaseUpdate('transactions', pbTxnId, {
      status: 'completed',
      account_id: pbAccId,
      metadata: {
        ...(typeof existing.metadata === 'object' ? existing.metadata : {}),
        refund_confirmed_at: new Date().toISOString()
      }
    });

    const affectedAccounts = new Set<string>();
    affectedAccounts.add(existing.account_id);
    affectedAccounts.add(pbAccId);
    await recalcForAccounts(affectedAccounts);

    revalidatePath("/transactions");
    return { success: true };
  } catch (error: any) {
    console.error("[DB:PB] confirmRefund failed:", error);
    return { success: false, error: error.message };
  }
}
