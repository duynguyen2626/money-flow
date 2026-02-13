"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Json, Database } from "@/types/database.types";
import { normalizeMonthTag } from "@/lib/month-tag";
import {
  TransactionWithDetails,
  AccountRow,
  CashbackMode,
} from "@/types/moneyflow.types";
import {
  upsertTransactionCashback,
  removeTransactionCashback,
} from "./cashback.service";
import { parseMetadata } from '@/lib/transaction-mapper';
import {
  parseCashbackConfig,
  getCashbackCycleRange,
  getCashbackCycleTag,
} from "@/lib/cashback";

type TransactionStatus =
  | "posted"
  | "pending"
  | "void"
  | "waiting_refund"
  | "refunded"
  | "completed";
type TransactionType = "income" | "expense" | "transfer" | "debt" | "repayment" | "credit_pay";

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
  cashback_mode?: CashbackMode | null;
  currency?: string | null;

  final_price?: number | null;
  transaction_history?: { count: number }[];
  cashback_entries?: { amount: number; mode: string; metadata: Json | null }[];
};

type NormalizedTransaction = Omit<FlatTransactionRow, "id" | "created_at">;

type LookupMaps = {
  accounts: Map<
    string,
    { id: string; name: string; image_url: string | null; type: string | null; owner_id: string | null; cashback_config: Json | null }
  >;
  categories: Map<
    string,
    {
      id: string;
      name: string;
      type: "income" | "expense";
      image_url?: string | null;
      icon?: string | null;
    }
  >;
  people: Map<string, { id: string; name: string; image_url: string | null }>;
  shops: Map<string, { id: string; name: string; image_url: string | null }>;
};

function resolveBaseType(
  type: TransactionType,
): "income" | "expense" | "transfer" {
  if (type === "repayment") return "income";
  if (type === "debt") return "expense";
  if (type === "credit_pay") return "transfer";
  if (type === "transfer") return "transfer";
  return type;
}

export async function normalizeAmountForType(
  type: TransactionType,
  amount: number,
): Promise<number> {
  const baseType = resolveBaseType(type);
  const absolute = Math.abs(amount);
  if (baseType === "income") return absolute;
  if (baseType === "transfer") return -absolute;
  return -absolute;
}

async function normalizeInput(
  input: CreateTransactionInput,
): Promise<NormalizedTransaction> {
  const baseType = resolveBaseType(input.type);
  const targetAccountId =
    input.target_account_id ??
    input.destination_account_id ??
    input.debt_account_id ??
    null;

  if (input.type === "transfer" && !targetAccountId) {
    throw new Error("Transfer requires targetAccountId");
  }

  const normalizedAmount = await normalizeAmountForType(
    input.type,
    input.amount,
  );

  return {
    occurred_at: input.occurred_at,
    note: input.note ?? null,
    status: "posted",
    tag: input.tag ?? null,
    created_by: null,
    amount: normalizedAmount,
    type: input.type,
    account_id: input.source_account_id,
    target_account_id: baseType === "transfer" ? targetAccountId : null,
    category_id: input.category_id ?? null,
    person_id: input.person_id ?? null,
    metadata: input.metadata ?? null,
    shop_id: input.shop_id ?? null,
    persisted_cycle_tag: null,
    is_installment: Boolean(input.is_installment),
    installment_plan_id: input.installment_plan_id ?? null,
    cashback_share_percent: input.cashback_share_percent ?? null,
    cashback_share_fixed: input.cashback_share_fixed ?? null,
    cashback_mode: input.cashback_mode ?? null,
  };
}

async function logHistory(
  transactionId: string,
  changeType: "edit" | "void",
  snapshot: any,
) {
  const supabase = createClient();
  const { error } = await supabase.from("transaction_history" as any).insert({
    transaction_id: transactionId,
    change_type: changeType,
    snapshot_before: snapshot,
    // created_at is default now()
  } as any);

  if (error) {
    console.error("Failed to log transaction history:", error);
  }
}

export async function calculateAccountImpacts(txn: {
  account_id: string;
  target_account_id?: string | null;
  type: TransactionType;
  amount: number;
  status?: TransactionStatus | null;
}): Promise<Record<string, number>> {
  if (txn.status === "void") return {};

  const baseType = resolveBaseType(txn.type);
  const impacts: Record<string, number> = {};
  impacts[txn.account_id] = (impacts[txn.account_id] ?? 0) + txn.amount;

  if (baseType === "transfer" && txn.target_account_id) {
    impacts[txn.target_account_id] =
      (impacts[txn.target_account_id] ?? 0) + Math.abs(txn.amount);
  }

  return impacts;
}

async function recalcForAccounts(accountIds: Set<string>) {
  if (accountIds.size === 0) return;
  const { recalculateBalance } = await import("./account.service");
  await Promise.all(Array.from(accountIds).map((id) => recalculateBalance(id)));
}

async function fetchLookups(rows: FlatTransactionRow[]): Promise<LookupMaps> {
  const supabase = createClient();
  const accountIds = new Set<string>();
  const categoryIds = new Set<string>();
  const personIds = new Set<string>();
  const shopIds = new Set<string>();

  rows.forEach((row) => {
    accountIds.add(row.account_id);
    if (row.target_account_id) accountIds.add(row.target_account_id);
    if (row.category_id) categoryIds.add(row.category_id);
    if (row.person_id) personIds.add(row.person_id);
    if (row.shop_id) shopIds.add(row.shop_id);
  });

  const [accountsRes, categoriesRes, peopleRes, shopsRes] = await Promise.all([
    accountIds.size
      ? supabase
        .from("accounts")
        .select("id, name, image_url, type, owner_id, cashback_config")
        .in("id", Array.from(accountIds))
      : Promise.resolve({ data: [] as any[], error: null }),
    categoryIds.size
      ? supabase
        .from("categories")
        .select("id, name, type, image_url, icon")
        .in("id", Array.from(categoryIds))
      : Promise.resolve({ data: [] as any[], error: null }),
    personIds.size
      ? supabase
        .from("people")
        .select("id, name, image_url")
        .in("id", Array.from(personIds))
      : Promise.resolve({ data: [] as any[], error: null }),
    shopIds.size
      ? supabase
        .from("shops")
        .select("id, name, image_url")
        .in("id", Array.from(shopIds))
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  const accounts = new Map<
    string,
    { id: string; name: string; image_url: string | null; type: string | null; owner_id: string | null; cashback_config: Json | null }
  >();
  const categories = new Map<
    string,
    {
      id: string;
      name: string;
      type: "income" | "expense";
      image_url?: string | null;
      icon?: string | null;
    }
  >();
  const people = new Map<
    string,
    { id: string; name: string; image_url: string | null }
  >();
  const shops = new Map<
    string,
    { id: string; name: string; image_url: string | null }
  >();

  (accountsRes.data ?? []).forEach((row: any) => {
    if (!row?.id) return;
    accounts.set(row.id, {
      id: row.id,
      name: row.name,
      image_url: row.image_url ?? null,
      type: row.type ?? null,
      owner_id: row.owner_id ?? null,
      cashback_config: row.cashback_config ?? null,
    });
  });

  (categoriesRes.data ?? []).forEach((row: any) => {
    if (!row?.id) return;
    categories.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.type,
      image_url: row.image_url ?? null,
      icon: row.icon ?? null,
    });
  });

  (peopleRes.data ?? []).forEach((row: any) => {
    if (!row?.id) return;
    people.set(row.id, {
      id: row.id,
      name: row.name,
      image_url: row.image_url ?? null,
    });
  });

  (shopsRes.data ?? []).forEach((row: any) => {
    if (!row?.id) return;
    shops.set(row.id, {
      id: row.id,
      name: row.name,
      image_url: row.image_url ?? null,
    });
  });

  return { accounts, categories, people, shops };
}

// buildSyntheticLines removed as legacy line items are deprecated.

export async function mapTransactionRow(
  row: FlatTransactionRow,
  options: {
    lookups: LookupMaps;
    contextAccountId?: string;
    contextMode?: "person" | "account" | "general";
  },
): Promise<TransactionWithDetails> {
  const { lookups, contextAccountId } = options;
  const baseType = resolveBaseType(row.type);
  const account = lookups.accounts.get(row.account_id) ?? null;
  const target = row.target_account_id
    ? (lookups.accounts.get(row.target_account_id) ?? null)
    : null;
  const category = row.category_id
    ? (lookups.categories.get(row.category_id) ?? null)
    : null;
  const person = row.person_id
    ? (lookups.people.get(row.person_id) ?? null)
    : null;
  const shop = row.shop_id ? (lookups.shops.get(row.shop_id) ?? null) : null;

  // Fix Unknown: If transfer-like but NO destination (no target account AND no person),
  // force it to act like a simple income/expense so we don't show "Account -> Unknown"
  let effectiveBaseType = baseType;
  if (baseType === "transfer" && !row.target_account_id && !row.person_id) {
    effectiveBaseType = row.amount >= 0 ? "income" : "expense";
  }

  let displayAmount = row.amount;
  if (
    contextAccountId &&
    effectiveBaseType === "transfer" &&
    row.target_account_id === contextAccountId &&
    row.account_id !== contextAccountId
  ) {
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

  // Calculate Account Billing Cycle & Derived Tag
  let account_billing_cycle: string | null = null;
  let derived_cycle_tag = row.persisted_cycle_tag;

  if (account && account.cashback_config) {
    try {
      const config = parseCashbackConfig(account.cashback_config, account.id);

      // Calculate derived tag if missing
      if (!derived_cycle_tag) {
        derived_cycle_tag = getCashbackCycleTag(new Date(row.occurred_at), {
          statementDay: config.statementDay,
          cycleType: config.cycleType
        });
      }

      const range = getCashbackCycleRange(config, new Date(row.occurred_at));
      if (range) {
        const startDay = String(range.start.getDate()).padStart(2, '0');
        const startMonth = String(range.start.getMonth() + 1).padStart(2, '0');
        const endDay = String(range.end.getDate()).padStart(2, '0');
        const endMonth = String(range.end.getMonth() + 1).padStart(2, '0');
        account_billing_cycle = `${startDay}-${startMonth} to ${endDay}-${endMonth}`;
      }
    } catch (e) {
      // ignore
    }
  }

  return {
    ...row,
    tag: normalizeMonthTag(row.tag) ?? row.tag ?? null,
    amount: displayAmount,
    original_amount: Math.abs(row.amount),
    displayType,
    display_type:
      displayType === "income"
        ? "IN"
        : displayType === "expense"
          ? "OUT"
          : "TRANSFER",
    category_name: category?.name,
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
    shop_name: shop?.name ?? null,
    shop_image_url: shop?.image_url ?? null,
    persisted_cycle_tag:
      normalizeMonthTag(row.persisted_cycle_tag) ?? row.persisted_cycle_tag ?? null,
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
    account_billing_cycle,
    derived_cycle_tag,
    // Cashback Analysis Fields
    bank_back: row.cashback_entries?.reduce((sum, entry) => sum + (entry.amount || 0), 0) ?? 0,
    cashback_share_amount: (row.cashback_share_fixed ?? 0) + (Math.abs(row.amount) * (row.cashback_share_percent ?? 0)),
    profit: (row.cashback_entries?.reduce((sum, entry) => sum + (entry.amount || 0), 0) ?? 0) - ((row.cashback_share_fixed ?? 0) + (Math.abs(row.amount) * (row.cashback_share_percent ?? 0))),
  };
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
  const supabase = createClient();

  let query = supabase
    .from("transactions")
    .select(
      "id, occurred_at, note, status, tag, created_at, created_by, amount, type, account_id, target_account_id, category_id, person_id, metadata, shop_id, persisted_cycle_tag, is_installment, installment_plan_id, cashback_share_percent, cashback_share_fixed, cashback_mode, final_price, transaction_history(count), cashback_entries(amount, mode, metadata)"
    )
    .order("occurred_at", { ascending: false });

  if (!options.includeVoided) {
    query = query.neq("status", "void");
  }

  if (options.transactionId) {
    query = query.eq("id", options.transactionId);
  } else {
    if (options.personIds && options.personIds.length > 0) {
      query = query.in("person_id", options.personIds);
    } else if (options.personId) {
      query = query.eq("person_id", options.personId);
    } else if (options.accountId) {
      query = query.or(
        `account_id.eq.${options.accountId},target_account_id.eq.${options.accountId}`,
      );
    }
  }

  if (options.shopId) {
    query = query.eq("shop_id", options.shopId);
  }

  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  if (options.installmentPlanId) {
    query = query.eq("installment_plan_id", options.installmentPlanId);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("Error fetching transactions:", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      hasData: !!data,
      fullError: error
    });
    return [];
  }

  const rows = data as unknown as FlatTransactionRow[];
  const lookups = await fetchLookups(rows);
  return Promise.all(
    rows.map((row) =>
      mapTransactionRow(row, {
        lookups,
        contextAccountId: options.accountId,
        contextMode: options.context ?? "general",
      }),
    )
  );
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<string | null> {
  try {
    const normalized = await normalizeInput(input);
    const supabase = createClient();

    // Auto-calculate cycle tag
    const { data: accConfig } = await supabase
      .from('accounts')
      .select('cashback_config')
      .eq('id', normalized.account_id)
      .single();

    if (accConfig?.cashback_config) {
      const config = parseCashbackConfig(accConfig.cashback_config);
      const cycleTag = getCashbackCycleTag(new Date(normalized.occurred_at), config);
      if (cycleTag) {
        normalized.persisted_cycle_tag = cycleTag;
      }
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert(normalized as any)
      .select()
      .single();

    if (error || !data) {
      console.error("Error creating transaction:", error);
      return null;
    }

    const transactionId = (data as { id?: string }).id ?? null;

    const affectedAccounts = new Set<string>();
    affectedAccounts.add(normalized.account_id);
    if (normalized.target_account_id)
      affectedAccounts.add(normalized.target_account_id);
    await recalcForAccounts(affectedAccounts);

    // SHEET SYNC: Auto-sync to Google Sheets when person_id exists
    if (transactionId && input.person_id) {
      try {
        const { syncTransactionToSheet } = await import("./sheet.service");

        // Fetch shop name for payload
        let shopName: string | null = null;
        if (input.shop_id) {
          const { data: shop } = await supabase
            .from("shops")
            .select("name")
            .eq("id", input.shop_id)
            .single();
          shopName = (shop as any)?.name ?? null;
        }

        // Calculate final amount (for debt: amount - cashback)
        const originalAmount = Math.abs(input.amount);
        // DB stores decimal (0.05). Input to this func came from Form which ALREADY divided by 100.
        // Wait, looking at Form:
        // form.onSubmit: payload.cashback_share_percent = rawPercent / 100;
        // So 'input.cashback_share_percent' IS ALREADY DECIMAL (e.g. 0.05).

        const decimalRate = Number(input.cashback_share_percent ?? 0);

        const fixedAmount = Math.max(
          0,
          Number(input.cashback_share_fixed ?? 0),
        );
        const cashback = originalAmount * decimalRate + fixedAmount;
        const finalAmount =
          input.type === "debt" ? originalAmount - cashback : originalAmount;

        const syncPayload = {
          id: transactionId,
          occurred_at: input.occurred_at,
          note: input.note,
          tag: input.tag,
          shop_name: shopName,
          amount: finalAmount,
          original_amount: originalAmount,
          cashback_share_percent: decimalRate,
          cashback_share_fixed: fixedAmount,
          type: ['repayment', 'income'].includes(input.type) ? "In" : "Debt",
        };
        void syncTransactionToSheet(
          input.person_id,
          syncPayload as any,
          "create",
        ).catch((err) => {
          console.error("[Sheet Sync] Create entry failed:", err);
        });
      } catch (syncError) {
        console.error("[Sheet Sync] Import or sync failed:", syncError);
      }
    }

    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/people");
    if (input.person_id) {
      revalidatePath(`/people/${input.person_id}`);
      revalidatePath(`/people/${input.person_id}/details`);
    }

    // CASHBACK INTEGRATION
    if (transactionId) {
      // Re-fetch the transaction with category details for cashback logic
      // Using direct re-fetch instead of loadTransactions to avoid recursion/overhead
      try {
        const [txn] = await loadTransactions({
          transactionId: transactionId,
        });

        if (txn) {
          await upsertTransactionCashback(txn);
        }
      } catch (cbError) {
        console.error("Failed to upsert cashback entry:", cbError);
      }
    }

    // INSTALLMENT INTEGRATION: Process Monthly Payment
    const meta = normalized.metadata as any;
    if (meta && meta.installment_id) {
      try {
        const { processMonthlyPayment } =
          await import("./installment.service");
        await processMonthlyPayment(
          meta.installment_id,
          Math.abs(normalized.amount),
        );
        revalidatePath("/installments");
      } catch (instError) {
        console.error("Failed to process installment payment:", instError);
      }
    }

    // Phase 7X: Auto-Settle Installment
    if (normalized.installment_plan_id) {
      import("./installment.service").then(({ checkAndAutoSettleInstallment }) => {
        checkAndAutoSettleInstallment(normalized.installment_plan_id!);
      });
    }

    return transactionId;
  } catch (error) {
    console.error("Unhandled error in createTransaction:", error);
    return null;
  }
}

export async function updateTransaction(
  id: string,
  input: CreateTransactionInput,
): Promise<boolean> {
  const supabase = createClient();

  // Fetch existing transaction INCLUDING person_id for sheet sync
  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select(
      "id, occurred_at, note, tag, account_id, target_account_id, person_id, amount, type, shop_id, cashback_share_percent, cashback_share_fixed, metadata, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    console.error("Failed to load transaction before update:", fetchError);
    return false;
  }

  // 1. GUARD: Check for dependent transactions (Refund Chain)
  // Prevent editing if this transaction is a parent

  // Check linked_transaction_id column
  const { data: linkedChildren } = await supabase
    .from("transactions")
    .select("id")
    .neq("status", "void")
    .eq("linked_transaction_id", id)
    .limit(1);

  if (linkedChildren && linkedChildren.length > 0) {
    console.warn("Blocking update: Has linked dependent transactions.");
    return false;
  }

  // Check metadata references
  const meta = ((existing as any)?.metadata || {}) as any;
  if (meta.has_refund_request) {
    console.warn("Blocking update: Transaction has a refund request.");
    return false;
  }

  let normalized: NormalizedTransaction | null;
  try {
    normalized = await normalizeInput(input);
  } catch (err) {
    console.error("Invalid transaction input:", err);
    return false;
  }

  if (!normalized) {
    console.error("Invalid input for transaction update");
    return false;
  }

  // Auto-calculate cycle tag
  const { data: accConfig } = await supabase
    .from('accounts')
    .select('cashback_config')
    .eq('id', normalized.account_id)
    .single();

  if (accConfig?.cashback_config) {
    const config = parseCashbackConfig(accConfig.cashback_config);
    const cycleTag = getCashbackCycleTag(new Date(normalized.occurred_at), config);
    if (cycleTag) {
      normalized.persisted_cycle_tag = cycleTag;
    }
  }

  // LOG HISTORY BEFORE UPDATE
  await logHistory(id, "edit", existing);

  console.log(`[Service] Updating transaction ${id}...`);
  const { error } = await supabase.from("transactions").update(normalized).eq("id", id);

  if (error) {
    console.error(`[Service] Failed to update transaction ${id}:`, error);
    return false;
  }
  console.log(`[Service] Transaction ${id} updated successfully in DB.`);

  const affectedAccounts = new Set<string>();
  if ((existing as any).account_id)
    affectedAccounts.add((existing as any).account_id);
  if ((existing as any).target_account_id)
    affectedAccounts.add((existing as any).target_account_id);
  affectedAccounts.add(normalized.account_id);
  if (normalized.target_account_id)
    affectedAccounts.add(normalized.target_account_id);
  await recalcForAccounts(affectedAccounts);

  const oldPersonId = (existing as any).person_id;
  const newPersonId = input.person_id;

  // SHEET SYNC: Auto-sync to Google Sheets when person_id exists
  try {
    const { syncTransactionToSheet } = await import("./sheet.service");

    console.log("[Sheet Sync] updateTransaction sync triggered", {
      id,
      oldPersonId,
      newPersonId,
      samePerson: oldPersonId === newPersonId,
    });

    // SHEET SYNC: Smart cycle-aware sync
    // - If cycle changed: Full sync both old and new cycles
    // - If same cycle: Fast single-row update
    if (oldPersonId && newPersonId && oldPersonId === newPersonId) {
      console.log(
        "[Sheet Sync] Updating existing entry for person:",
        newPersonId,
      );

      // Fetch shop name for payload
      let shopName: string | null = null;
      if (input.shop_id) {
        const { data: shop } = await supabase
          .from("shops")
          .select("name")
          .eq("id", input.shop_id)
          .single();
        shopName = (shop as any)?.name ?? null;
      }

      // Calculate final amount
      const originalAmount = Math.abs(input.amount);
      const decimalRate = Number(input.cashback_share_percent ?? 0);

      const fixedAmount = Math.max(0, Number(input.cashback_share_fixed ?? 0));
      const cashback = originalAmount * decimalRate + fixedAmount;
      const finalAmount =
        input.type === "debt" ? originalAmount - cashback : originalAmount;

      // Extract cycle tags from dates
      const oldDate = new Date((existing as any).occurred_at);
      const newDate = new Date(input.occurred_at);
      const oldCycle = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}`;
      const newCycle = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;

      const cycleChanged = oldCycle !== newCycle;

      console.log("[Sheet Sync] Cycle check:", {
        oldCycle,
        newCycle,
        cycleChanged,
      });

      if (cycleChanged) {
        // CYCLE CHANGED: Full sync both cycles
        console.log("[Sheet Sync] Cycle changed - triggering full sync for both cycles");

        const { syncCycleTransactions } = await import("./sheet.service");

        // Sync old cycle (remove this transaction)
        try {
          await syncCycleTransactions(newPersonId, oldCycle);
          console.log(`[Sheet Sync] Synced old cycle: ${oldCycle}`);
        } catch (err) {
          console.error(`[Sheet Sync] Failed to sync old cycle ${oldCycle}:`, err);
        }

        // Sync new cycle (add this transaction)
        try {
          await syncCycleTransactions(newPersonId, newCycle);
          console.log(`[Sheet Sync] Synced new cycle: ${newCycle}`);
        } catch (err) {
          console.error(`[Sheet Sync] Failed to sync new cycle ${newCycle}:`, err);
        }
      } else {
        // SAME CYCLE: Fast single-row update
        console.log("[Sheet Sync] Same cycle - using fast single-row update");

        const updatePayload = {
          id,
          occurred_at: input.occurred_at,
          note: input.note,
          tag: input.tag,
          shop_name: shopName,
          amount: finalAmount,
          original_amount: originalAmount,
          cashback_share_percent: decimalRate,
          cashback_share_fixed: fixedAmount,
          type: input.type === "repayment" ? "In" : "Debt",
        };

        try {
          await syncTransactionToSheet(
            newPersonId,
            updatePayload as any,
            "update",
          );
          console.log("[Sheet Sync] Single-row update completed");
        } catch (err) {
          console.error("[Sheet Sync] Update entry failed:", err);
        }
      }
    } else {
      // Logic for DIFFERENT person (or one added/removed): Delete Old -> Create New

      // 1. Delete old entry if existed
      if (oldPersonId) {
        console.log("[Sheet Sync] Deleting old entry for person:", oldPersonId);
        const deletePayload = {
          id: (existing as any).id,
          occurred_at: (existing as any).occurred_at,
          note: (existing as any).note,
          tag: (existing as any).tag,
          amount: (existing as any).amount ?? 0,
        };
        try {
          await syncTransactionToSheet(
            oldPersonId,
            deletePayload as any,
            "delete",
          );
          console.log("[Sheet Sync] Delete completed");
        } catch (err) {
          console.error("[Sheet Sync] Delete old entry failed:", err);
        }
      }

      // 2. Create new entry if exists (AFTER delete)
      if (newPersonId) {
        console.log("[Sheet Sync] Creating new entry for person:", newPersonId);

        let shopName: string | null = null;
        if (input.shop_id) {
          const { data: shop } = await supabase
            .from("shops")
            .select("name")
            .eq("id", input.shop_id)
            .single();
          shopName = (shop as any)?.name ?? null;
        }

        const originalAmount = Math.abs(input.amount);
        const decimalRate = Number(input.cashback_share_percent ?? 0);

        const fixedAmount = Math.max(
          0,
          Number(input.cashback_share_fixed ?? 0),
        );
        const cashback = originalAmount * decimalRate + fixedAmount;
        const finalAmount =
          input.type === "debt" ? originalAmount - cashback : originalAmount;

        const createPayload = {
          id,
          occurred_at: input.occurred_at,
          note: input.note,
          tag: input.tag,
          shop_name: shopName,
          amount: finalAmount,
          original_amount: originalAmount,
          cashback_share_percent: decimalRate,
          cashback_share_fixed: fixedAmount,
          type: input.type === "repayment" ? "In" : "Debt",
        };

        try {
          await syncTransactionToSheet(
            newPersonId,
            createPayload as any,
            "create",
          );
          console.log("[Sheet Sync] Create new entry completed");
        } catch (err) {
          console.error("[Sheet Sync] Create new entry failed:", err);
        }
      }
    }
  } catch (sheetError) {
    console.error("[Sheet Sync] Overall error:", sheetError);
  }

  // CASHBACK INTEGRATION (Update)
  try {
    const supabase = createClient();
    const { data: rawTxn } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .eq("id", id)
      .single();
    if (rawTxn) {
      const txnShape: any = {
        ...(rawTxn as any),
        category_name: (rawTxn as any).categories?.name,
      };
      await upsertTransactionCashback(txnShape);
    }
  } catch (cbError) {
    console.error("Failed to update cashback entry:", cbError);
  }

  // Phase 7X: Auto-Settle Installment (Update)
  if (normalized.installment_plan_id) {
    // We should also check the OLD plan if changed? 
    // For now just check current.
    import("./installment.service").then(({ checkAndAutoSettleInstallment }) => {
      checkAndAutoSettleInstallment(normalized!.installment_plan_id!);
    });
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/people");
  if (input.person_id) {
    revalidatePath(`/people/${input.person_id}`);
    revalidatePath(`/people/${input.person_id}/details`);
  }

  return true;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const supabase = createClient();
  // Fetch existing transaction INCLUDING person_id for sheet sync and installment_plan_id for auto-settle
  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select("account_id, target_account_id, person_id, installment_plan_id, metadata, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) return false;

  // 1. GUARD: Check for dependent transactions (Refund Chain)
  // Prevent deleting if this transaction is a parent (e.g. Original of a Request, or Request of a Confirmation)

  // Check linked_transaction_id column (used by Confirmation -> Request)
  const { data: linkedChildren } = await supabase
    .from("transactions")
    .select("id")
    .neq("status", "void")
    .eq("linked_transaction_id", id)
    .limit(1);

  if (linkedChildren && linkedChildren.length > 0) {
    // If we are deleting a Request (Tx 2), and a Confirmation (Tx 3) exists (linked by ID), block it.
    console.warn("Blocking delete: Has linked dependent transactions.");
    return false;
    // Ideally we throw error, but function returns boolean. 
    // UI `handleSingleDeleteConfirm` checks return value. 
    // To show error message, we might need to change signature or handle upstream.
    // For now, returning false triggers "Failed to delete transaction" message.
  }

  // Check metadata references (Original -> Request)
  const meta = ((existing as any)?.metadata || {}) as any;
  if (meta.has_refund_request) {
    // This is Tx 1, and Tx 2 exists.
    // We should really check if Tx 2 is still valid (not void/deleted), but assuming flag is accurate:
    console.warn("Blocking delete: Transaction has a refund request.");
    return false;
  }

  // 2. ROLLBACK LOGIC (Maintain Consistency when deleting Leaf Nodes)

  // Case A: Deleting Confirmation (GD3) -> Revert Pending Refund (GD2) to 'waiting_refund' (or 'pending')
  if (meta.is_refund_confirmation && meta.pending_refund_id) {
    console.log(`[deleteTransaction] Deleting Confirmation ${id}. Reverting Pending ${meta.pending_refund_id} status.`);
    await (supabase.from("transactions").update as any)({
      status: "waiting_refund", // Revert to waiting for confirmation (Orange state)
      // We don't delete the Request, just reset its status so it can be confirmed again.
    }).eq("id", meta.pending_refund_id);

    // Also revert Original Transaction (GD1) if it was marked as 'refunded'
    if (meta.original_transaction_id) {
      await (supabase.from("transactions").update as any)({
        status: "waiting_refund"
      }).eq("id", meta.original_transaction_id).eq("status", "refunded");
    }
  }

  // Case B: Deleting Refund Request (GD2) -> Revert Original (GD1) to 'posted' & Clear Metadata
  // Only if NOT a confirmation (which also has original_id)
  if (meta.original_transaction_id && !meta.is_refund_confirmation) {
    const { data: linkedReview } = await supabase.from('transactions').select('id, status').eq('linked_transaction_id', id).maybeSingle() as { data: { id: string, status: string } | null };
    if (linkedReview && linkedReview.status !== 'void') {
      // This should be caught by GUARD above, but double check.
      return false;
    }

    console.log(`[deleteTransaction] Deleting Request ${id}. Cleaning Original ${meta.original_transaction_id}.`);
    const { data: gd1 } = await supabase
      .from("transactions")
      .select("metadata")
      .eq("id", meta.original_transaction_id)
      .single();
    if (gd1) {
      const newMeta = { ...((gd1 as any).metadata || {}) };
      delete newMeta.refund_status;
      delete newMeta.refunded_amount;
      delete newMeta.has_refund_request;
      delete newMeta.refund_request_id;

      await (supabase.from("transactions").update as any)({
        status: "posted",
        metadata: newMeta,
      }).eq("id", meta.original_transaction_id);
    }
  }

  // CASHBACK INTEGRATION: Remove BEFORE deleting transaction to avoid FK constraint violations
  // If removal fails, this will throw and prevent the transaction deletion
  try {
    await removeTransactionCashback(id);
  } catch (cbError: any) {
    console.error("Failed to remove cashback entries - blocking delete to prevent FK violation:", cbError);
    // Return false instead of throwing - UI expects boolean return
    return false;
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) {
    console.error("Error deleting transaction:", error);
    return false;
  }

  const affected = new Set<string>();
  if ((existing as any)?.account_id) affected.add((existing as any).account_id);
  if ((existing as any)?.target_account_id)
    affected.add((existing as any).target_account_id);
  await recalcForAccounts(affected);

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/people");
  if ((existing as any)?.person_id) {
    revalidatePath(`/people/${(existing as any).person_id}`);
  }

  // Phase 7X: Auto-Settle Installment (Delete)
  if ((existing as any)?.installment_plan_id) {
    import("./installment.service").then(({ checkAndAutoSettleInstallment }) => {
      checkAndAutoSettleInstallment((existing as any).installment_plan_id);
    });
  }

  return true;
}

export async function voidTransaction(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("transactions")
    .select("account_id, target_account_id, metadata, status, person_id")
    .eq("id", id)
    .maybeSingle();

  // 1. Guard: Check for children (linked transactions) - STRICT CHECK
  // We must prevent voiding if this transaction is a parent of another active transaction.
  // This includes:
  // - linked_transaction_id column pointing to this ID (used by some refund flows)
  // - Being 'original_transaction_id' of a Refund Request (GD2) in metadata
  // - Being 'pending_refund_id' of a Refund Confirmation (GD3) in metadata

  // First check linked_transaction_id column directly
  const { data: linkedChildren } = await supabase
    .from("transactions")
    .select("id, status")
    .neq("status", "void")
    .eq("linked_transaction_id", id)
    .limit(1);

  if (linkedChildren && linkedChildren.length > 0) {
    throw new Error(
      "Không thể hủy giao dịch này vì đã có giao dịch liên quan (VD: Đã xác nhận tiền về). Vui lòng hủy giao dịch nối tiếp trước.",
    );
  }

  // Also check metadata fields using contains filter (for JSONB)
  const { data: metaChildren } = await supabase
    .from("transactions")
    .select("id, status, metadata")
    .neq("status", "void")
    .or(
      `metadata.cs.{"original_transaction_id":"${id}"},metadata.cs.{"pending_refund_id":"${id}"}`,
    )
    .limit(1);

  if (metaChildren && metaChildren.length > 0) {
    throw new Error(
      "Không thể hủy giao dịch này vì đã có giao dịch liên quan (VD: Đã xác nhận tiền về). Vui lòng hủy giao dịch nối tiếp trước.",
    );
  }

  // 2. Log History
  await logHistory(id, "void", existing);

  // 3. Rollback Logic (Refund Chain)
  const meta = ((existing as any)?.metadata || {}) as any;

  // Case A: Voiding Confirmation (GD3) -> Revert Pending Refund (GD2) to 'pending'
  if (meta.is_refund_confirmation && meta.pending_refund_id) {
    await (supabase.from("transactions").update as any)({
      status: "pending",
    }).eq("id", meta.pending_refund_id);
  }

  // Case B: Voiding Refund Request (GD2) -> Revert Original (GD1) to 'posted' & Clear Metadata
  // Only if NOT a confirmation (which also has original_id)
  if (meta.original_transaction_id && !meta.is_refund_confirmation) {
    const { data: gd1 } = await supabase
      .from("transactions")
      .select("metadata")
      .eq("id", meta.original_transaction_id)
      .single();
    if (gd1) {
      const newMeta = { ...((gd1 as any).metadata || {}) };
      delete newMeta.refund_status;
      delete newMeta.refunded_amount;
      delete newMeta.has_refund_request;
      delete newMeta.refund_request_id;

      await (supabase.from("transactions").update as any)({
        status: "posted",
        metadata: newMeta,
      }).eq("id", meta.original_transaction_id);
    }
  }

  // Simplified Void: Just update status. No need to join lines which might be complex or deleted.
  const { error } = await (supabase.from("transactions").update as any)({
    status: "void",
  }).eq("id", id);

  if (error) {
    console.error("Failed to void transaction:", error);
    return false;
  }

  const affected = new Set<string>();
  if ((existing as any)?.account_id) affected.add((existing as any).account_id);
  if ((existing as any)?.target_account_id)
    affected.add((existing as any).target_account_id);
  // Also try to trigger sync delete to sheet if possible, but service method might not have full context.
  // The ACTION layer handles sheet sync better. Service is low-level.

  await recalcForAccounts(affected);

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/people");
  if ((existing as any)?.person_id) {
    revalidatePath(`/people/${(existing as any).person_id}`);
  }

  // CASHBACK INTEGRATION
  try {
    await removeTransactionCashback(id);
  } catch (cbError) {
    console.error("Failed to remove cashback entry (void):", cbError);
  }

  // BATCH INTEGRATION: Revert batch item if exists
  try {
    // Dynamic import to avoid circular dependency if any
    const { revertBatchItem } = await import("./batch.service");
    await revertBatchItem(id);
  } catch (batchError) {
    console.error("Failed to revert batch item (void):", batchError);
  }

  return true;
}

export async function restoreTransaction(id: string): Promise<boolean> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("transactions")
    .select("account_id, target_account_id, person_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await (supabase.from("transactions").update as any)({
    status: "posted",
  }).eq("id", id);

  if (error) {
    console.error("Failed to restore transaction:", error);
    return false;
  }

  const affected = new Set<string>();
  if ((existing as any)?.account_id) affected.add((existing as any).account_id);
  if ((existing as any)?.target_account_id)
    affected.add((existing as any).target_account_id);
  await recalcForAccounts(affected);

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/people");
  if ((existing as any)?.person_id) {
    revalidatePath(`/people/${(existing as any).person_id}`);
  }

  // CASHBACK INTEGRATION (Restore)
  try {
    const { data: rawTxn } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .eq("id", id)
      .single();
    if (rawTxn) {
      const txnShape: any = {
        ...(rawTxn as any),
        category_name: (rawTxn as any).categories?.name,
      };
      await upsertTransactionCashback(txnShape);
    }
  } catch (cbError) {
    console.error("Failed to restore cashback entry:", cbError);
  }

  return true;
}

export async function getRecentTransactions(
  limit: number = 10,
): Promise<TransactionWithDetails[]> {
  return loadTransactions({ limit });
}

export async function getTransactionById(
  transactionId: string,
  includeVoided: boolean = true,
): Promise<TransactionWithDetails | null> {
  if (!transactionId) return null;
  const rows = await loadTransactions({
    transactionId,
    includeVoided,
    limit: 1,
  });
  return rows[0] ?? null;
}

export async function getTransactionsByShop(
  shopId: string,
  limit: number = 50,
): Promise<TransactionWithDetails[]> {
  return loadTransactions({ shopId, limit });
}

export async function getTransactionsByPeople(
  personIds: string[],
  limit: number = 1000,
): Promise<TransactionWithDetails[]> {
  if (!personIds.length) return [];
  return loadTransactions({ personIds, limit, context: "person" });
}

type UnifiedTransactionParams = {
  accountId?: string;
  personId?: string;
  limit?: number;
  context?: "person" | "account";
  includeVoided?: boolean;
};

export async function getUnifiedTransactions(
  accountOrOptions?: string | UnifiedTransactionParams,
  limitArg: number = 50,
): Promise<TransactionWithDetails[]> {
  const parsed =
    typeof accountOrOptions === "object" && accountOrOptions !== null
      ? accountOrOptions
      : { accountId: accountOrOptions as string | undefined, limit: limitArg };

  return loadTransactions({
    accountId: parsed.accountId,
    personId: parsed.personId,
    limit: parsed.limit ?? limitArg,
    context: parsed.context,
    includeVoided: parsed.includeVoided,
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

  original_note: string | null;
  original_category: string | null;
  linked_transaction_id?: string;
};

// Simplified Refund Logic for Single Table
export async function requestRefund(
  transactionId: string,
  amount: number,
  isPartial: boolean,
): Promise<{ success: boolean; refundTransactionId?: string; error?: string }> {
  const supabase = createClient();

  // 1. Fetch original transaction to get metadata
  const { data: originalTxn, error: fetchError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (fetchError || !originalTxn) {
    return { success: false, error: "Original transaction not found" };
  }

  const originalRow = originalTxn as unknown as FlatTransactionRow;
  const originalMeta = (originalRow.metadata || {}) as Record<string, any>;

  // 1a. Format Note (GD2) - No prefix ID, badges show ID separately
  const shortId = originalRow.id.split("-")[0].toUpperCase();
  let formattedNote = `Refund Request: ${originalRow.note ?? ""}`;

  // If original was debt (had person_id), append Cancel Debt info
  if (originalRow.person_id) {
    // Fetch person name if possible, or just append generic.
    // We can try to fetch, or just accept that we might not have name handy here without extra query.
    // But wait, we can do a quick lookup if we want, or just "Cancel Debt".
    // "Cancel Debt: ${PersonName}" was requested.
    const { data: person } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", originalRow.person_id)
      .single();
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
    type: "income",
    account_id: "99999999-9999-9999-9999-999999999999", // REFUND_PENDING_ACCOUNT_ID
    category_id: "e0000000-0000-0000-0000-000000000095", // REFUND_CAT_ID (System Category)
    note: formattedNote,
    status: "pending", // Yellow badge for pending
    metadata: {
      original_transaction_id: transactionId,
      original_account_id: originalRow.account_id,
      refund_type: isPartial ? "partial" : "full",
      original_note: originalRow.note,
    },
    created_by: null,
  };

  const { data: newRefund, error } = await supabase
    .from("transactions")
    .insert(refundTransaction as any)
    .select()
    .single();

  if (error || !newRefund) {
    console.error("Failed to create refund transaction:", error);
    return { success: false, error: error?.message };
  }

  // Update original transaction metadata to indicate refund requested
  const isFullRefund = Math.abs(amount) >= Math.abs(originalRow.amount);

  const updatePayload: any = {
    metadata: {
      ...originalMeta,
      refund_status: isFullRefund ? "refunded" : "requested",
      refunded_amount: originalMeta.refunded_amount
        ? originalMeta.refunded_amount + amount
        : amount,
      has_refund_request: true,
      refund_request_id: (newRefund as any).id,
    },
  };

  // UNLINK PERSON IF FULL REFUND
  if (isFullRefund) {
    updatePayload.person_id = null; // Unlink person to clear debt

    // Preserve Person Name in Note if unlinking
    if (originalRow.person_id) {
      // SHEET SYNC: Trigger DELETE from sheet because we are unlinking the person
      try {
        const { syncTransactionToSheet } = await import("./sheet.service");
        console.log(
          "[Sheet Sync] Full Refund - Deleting entry for person:",
          originalRow.person_id,
        );

        // We need to delete the ORIGINAL transaction from the sheet
        const deletePayload = {
          id: transactionId,
          occurred_at: originalRow.occurred_at,
          note: originalRow.note,
          tag: originalRow.tag, // Need tag for lookup? Yes usually.
          amount: originalRow.amount ?? 0,
        };

        // We use void to not block the main transaction update, but we log errors
        void syncTransactionToSheet(
          originalRow.person_id,
          deletePayload as any,
          "delete",
        ).catch((err) => {
          console.error("[Sheet Sync] Refund delete failed:", err);
        });
      } catch (syncErr) {
        console.error("[Sheet Sync] Failed to import sync service:", syncErr);
      }

      // "Cancel Debt: {Name}" logic was used for GD2 note. We can reuse 'person' data.
      const { data: personP } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", originalRow.person_id)
        .single();
      const personName = (personP as any)?.name;
      if (personName) {
        const currentNote = originalRow.note || "";
        if (!currentNote.includes(`(Debtor: ${personName})`)) {
          updatePayload.note = `${currentNote} - (Debtor: ${personName})`;
        }
      }
    }
  }

  if (isFullRefund) {
    updatePayload.status = "waiting_refund"; // Orange/Amber badge
  }

  await (supabase.from("transactions").update as any)(updatePayload).eq(
    "id",
    transactionId,
  );

  revalidatePath("/transactions");
  return { success: true, refundTransactionId: (newRefund as any).id };
}

export async function confirmRefund(
  pendingTransactionId: string,
  targetAccountId: string,
): Promise<{
  success: boolean;
  confirmTransactionId?: string;
  error?: string;
}> {
  const supabase = createClient();

  // 1. Fetch the Pending Transaction (GD2)
  const { data: pendingTxn, error: fetchError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", pendingTransactionId)
    .single();

  if (fetchError || !pendingTxn) {
    return { success: false, error: "Pending refund transaction not found" };
  }

  const pendingRow = pendingTxn as unknown as FlatTransactionRow;
  const pendingMeta = (pendingRow.metadata || {}) as Record<string, any>;

  // Extract Short ID from Original Transaction ID (if available)
  const originalTxnId = pendingMeta.original_transaction_id as
    | string
    | undefined;
  const shortId = originalTxnId
    ? originalTxnId.substring(0, 4).toUpperCase()
    : "????";

  // 2. Update GD2 -> Completed
  const { error: updateError } = await (
    supabase.from("transactions").update as any
  )({
    status: "completed", // Green/Done
  }).eq("id", pendingTransactionId);

  if (updateError) {
    console.error("Confirm refund failed (update pending):", updateError);
    return { success: false, error: updateError.message };
  }

  // 3. Create GD3: Real Money In Transaction
  const confirmationTransaction = {
    occurred_at: new Date().toISOString(),
    amount: Math.abs(pendingRow.amount),
    type: "income",
    account_id: targetAccountId, // The Real Bank
    category_id: "e0000000-0000-0000-0000-000000000095", // REFUND_CAT_ID
    note: `Refund Received`,
    status: "posted",
    created_by: null,
    // linked_transaction_id column = GD2's ID so void guard can detect it
    linked_transaction_id: pendingTransactionId,
    metadata: {
      original_transaction_id: pendingMeta.original_transaction_id,
      pending_refund_id: pendingTransactionId,
      is_refund_confirmation: true,
    },
  };

  const { error: createError } = await supabase
    .from("transactions")
    .insert(confirmationTransaction as any);

  if (createError) {
    console.error("Confirm refund failed (create confirmation):", createError);
    // Rollback GD2 update theoretically, but let's just return error for now
    return { success: false, error: createError.message };
  }

  await recalcForAccounts(
    new Set([targetAccountId, "99999999-9999-9999-9999-999999999999"]),
  );

  // Also finalize the original transaction if it was full refund?
  if (pendingMeta.original_transaction_id) {
    const { data: original } = await supabase
      .from("transactions")
      .select("status, metadata")
      .eq("id", pendingMeta.original_transaction_id)
      .single() as { data: { status: string, metadata: any } | null };
    if (original) {
      const originalMeta = (original.metadata || {}) as any;
      const newMeta = { ...originalMeta, refund_status: 'completed' };
      const updatePayload: any = { metadata: newMeta };

      // Also update status if currently waiting
      if ((original as any).status === "waiting_refund") {
        updatePayload.status = "refunded";
      }

      await (supabase.from("transactions").update as any)(updatePayload).eq("id", pendingMeta.original_transaction_id);
    }
  }

  revalidatePath("/transactions");

  return { success: true };
}

export async function getPendingRefunds(accountId?: string): Promise<PendingRefundItem[]> {
  const supabase = createClient()

  // Logic: status='waiting_refund' OR metadata->has_refund_request=true
  // Single query with OR logic
  let query = supabase
    .from('transactions')
    .select(`
      id,
      occurred_at,
      amount,
      note,
      status,
      tag,
      metadata,
      account_id,
      category:categories(name)
    `)
    .or('status.eq.waiting_refund,metadata->>has_refund_request.eq.true')
    .neq('status', 'void')
    .order('occurred_at', { ascending: false })

  if (accountId) {
    query = query.eq('account_id', accountId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch pending refunds:', error)
    return []
  }

  return (data || []).map((txn: any) => {
    // We need parseMetadata here. Ensure it is imported.
    const meta = txn.metadata // parseMetadata(txn.metadata) - simplified access since we just need fields
    // Actually better to use helper if available. 
    // I will assume I fix import next.

    return {
      id: txn.id,
      occurred_at: txn.occurred_at,
      amount: Math.abs(txn.amount),
      status: txn.status,
      note: txn.note,
      tag: txn.tag,
      original_category: txn.category?.name ?? null,
      original_note: meta?.original_note ?? txn.note
    }
  })
}

/**
 * SPLIT BILL MANAGEMENT
 */

/**
 * Get all transactions related to a split bill (base + children)
 */
export async function getSplitBillTransactions(baseTransactionId: string) {
  const supabase = createClient();

  // Get base transaction
  const { data: baseTransaction, error: baseError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", baseTransactionId)
    .maybeSingle();

  if (baseError) {
    console.error("Error fetching base transaction:", baseError);
    return { base: null, children: [] };
  }

  // Get all child transactions using JSONB query
  const { data: childTransactions, error: childError } = await supabase
    .from("transactions")
    .select("*")
    .contains("metadata", { split_parent_id: baseTransactionId } as any);

  if (childError) {
    console.error("Error fetching child transactions:", childError);
    return { base: baseTransaction, children: [] };
  }

  return {
    base: baseTransaction,
    children: childTransactions || [],
  };
}

/**
 * Delete an entire split bill (base transaction + all child transactions)
 * Returns the number of transactions deleted
 */
export async function deleteSplitBill(
  baseTransactionId: string,
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  const supabase = createClient();

  try {
    // First, get all transactions to know which accounts to recalculate
    const { base, children } = await getSplitBillTransactions(baseTransactionId);

    if (!base) {
      return { success: false, error: "Base transaction not found" };
    }

    // Collect all affected accounts
    const affectedAccounts = new Set<string>();
    affectedAccounts.add((base as any).account_id);
    if ((base as any).target_account_id) {
      affectedAccounts.add((base as any).target_account_id);
    }

    children.forEach((child: any) => {
      affectedAccounts.add(child.account_id);
      if (child.target_account_id) {
        affectedAccounts.add(child.target_account_id);
      }
    });

    // Delete cashback_entries first (foreign key constraint)
    const allTransactionIds = [baseTransactionId, ...children.map((c: any) => c.id)];
    const { error: cashbackDeleteError } = await supabase
      .from("cashback_entries")
      .delete()
      .in("transaction_id", allTransactionIds);

    if (cashbackDeleteError) {
      console.error("Error deleting cashback entries:", cashbackDeleteError);
      // Continue anyway, cashback entries might not exist
    }

    // Delete child transactions
    const { error: childDeleteError } = await supabase
      .from("transactions")
      .delete()
      .contains("metadata", { split_parent_id: baseTransactionId } as any);

    if (childDeleteError) {
      console.error("Error deleting child transactions:", childDeleteError);
      return {
        success: false,
        error: `Failed to delete child transactions: ${childDeleteError.message}`,
      };
    }

    // Delete base transaction
    const { error: baseDeleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", baseTransactionId);

    if (baseDeleteError) {
      console.error("Error deleting base transaction:", baseDeleteError);
      return {
        success: false,
        error: `Failed to delete base transaction: ${baseDeleteError.message}`,
      };
    }

    // Recalculate balances for all affected accounts
    await recalcForAccounts(affectedAccounts);

    const deletedCount = 1 + children.length; // base + children

    return { success: true, deletedCount };
  } catch (error) {
    console.error("Unhandled error in deleteSplitBill:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update split bill amounts and participants
 */
export async function updateSplitBillAmounts(
  baseTransactionId: string,
  updates: {
    title?: string;
    note?: string;
    qrImageUrl?: string | null;
    participants: Array<{
      personId: string;
      amount: number;
      isNew?: boolean;
      isRemoved?: boolean;
      transactionId?: string;
    }>;
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Get base transaction
    const { data: baseTransaction, error: baseError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", baseTransactionId)
      .maybeSingle();

    if (baseError || !baseTransaction) {
      return { success: false, error: "Base transaction not found" };
    }

    const baseMeta = (baseTransaction as any).metadata || {};

    // Calculate new total from non-removed participants
    const newTotal = updates.participants
      .filter((p) => !p.isRemoved)
      .reduce((sum, p) => sum + p.amount, 0);

    // Collect affected accounts
    const affectedAccounts = new Set<string>();
    affectedAccounts.add((baseTransaction as any).account_id);
    if ((baseTransaction as any).target_account_id) {
      affectedAccounts.add((baseTransaction as any).target_account_id);
    }

    // Update base transaction
    const { error: baseUpdateError } = await supabase
      .from("transactions")
      .update({
        amount: -Math.abs(newTotal), // Negative for expense
        note: updates.note || (baseTransaction as any).note,
        metadata: {
          ...baseMeta,
          split_qr_image_url: updates.qrImageUrl ?? baseMeta.split_qr_image_url,
          split_group_name: updates.title || baseMeta.split_group_name,
        },
      } as any)
      .eq("id", baseTransactionId);

    if (baseUpdateError) {
      console.error("Error updating base transaction:", baseUpdateError);
      return {
        success: false,
        error: `Failed to update base transaction: ${baseUpdateError.message}`,
      };
    }

    // Update existing participants
    for (const p of updates.participants.filter((p) => !p.isNew && !p.isRemoved)) {
      if (!p.transactionId) continue;

      const { error: updateError } = await supabase
        .from("transactions")
        .update({ amount: -Math.abs(p.amount) } as any) // Negative for debt
        .eq("id", p.transactionId);

      if (updateError) {
        console.error(`Error updating participant ${p.personId}:`, updateError);
      }

      // Track affected account
      const { data: txn } = await supabase
        .from("transactions")
        .select("account_id")
        .eq("id", p.transactionId)
        .single();
      if (txn) affectedAccounts.add((txn as any).account_id);
    }

    // Void removed participants
    for (const p of updates.participants.filter((p) => p.isRemoved)) {
      if (!p.transactionId) continue;

      const { error: voidError } = await supabase
        .from("transactions")
        .update({ status: "void" } as any)
        .eq("id", p.transactionId);

      if (voidError) {
        console.error(`Error voiding participant ${p.personId}:`, voidError);
      }
    }

    // Create new participants
    for (const p of updates.participants.filter((p) => p.isNew)) {
      const newChildPayload = {
        occurred_at: (baseTransaction as any).occurred_at,
        note: updates.note || (baseTransaction as any).note,
        status: "posted",
        tag: (baseTransaction as any).tag,
        created_by: (baseTransaction as any).created_by,
        type: "debt",
        amount: -Math.abs(p.amount), // Negative for debt
        account_id: (baseTransaction as any).account_id,
        target_account_id: null,
        category_id: (baseTransaction as any).category_id,
        person_id: p.personId,
        metadata: {
          split_parent_id: baseTransactionId,
          split_group_name: updates.title || baseMeta.split_group_name,
        },
      };

      const { error: createError } = await supabase
        .from("transactions")
        .insert(newChildPayload as any);

      if (createError) {
        console.error(`Error creating new participant ${p.personId}:`, createError);
      }
    }

    // Recalculate balances
    await recalcForAccounts(affectedAccounts);

    return { success: true };
  } catch (error) {
    console.error("Unhandled error in updateSplitBillAmounts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function loadAccountTransactionsV2(accountId: string, limit: number = 5) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id, occurred_at, note, amount, type, status,
      category:categories(name, icon),
      person:people(name)
    `)
    .eq('account_id', accountId)
    .neq('status', 'void')
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error loading account transactions:', error);
    return [];
  }


  return data.map((t: any) => ({
    id: t.id,
    occurred_at: t.occurred_at,
    note: t.note,
    amount: t.amount,
    type: t.type,
    status: t.status,
    category_name: t.category?.name,
    category_icon: t.category?.icon, // Only use DB icon URL if exists
    person_name: t.person?.name,
    displayType: t.type // Map if needed, but UI uses explicit check
  }));
}

export async function bulkMoveToCategory(transactionIds: string[], targetCategoryId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // 1. Update transactions
  const { data: updatedTxns, error } = await supabase
    .from("transactions")
    .update({ category_id: targetCategoryId } as any)
    .in("id", transactionIds)
    .select(
      `
      id, occurred_at, note, status, tag, created_at, created_by, amount, type, account_id,
      target_account_id, category_id, person_id, metadata, shop_id, persisted_cycle_tag,
      is_installment, installment_plan_id, cashback_share_percent, cashback_share_fixed,
      cashback_share_amount, cashback_mode, currency, final_price
     `
    );

  if (error) {
    console.error("Failed to bulk move transactions:", error);
    return { success: false, error: "Failed to update transactions" };
  }

  // 2. Trigger cashback recalculation for each transaction
  // import { upsertTransactionCashback } from "./cashback.service";
  // We need to fetch full details including category names for policy resolution if needed, 
  // but upsertTransactionCashback fetches its own data from DB usually.
  // However, the mapping might be needed.

  if (updatedTxns) {
    for (const txn of updatedTxns) {
      try {
        await upsertTransactionCashback(txn as any);
      } catch (err) {
        console.error(`Failed to trigger cashback upsert for ${txn.id}:`, err);
      }
    }
  }

  revalidatePath("/");
  return { success: true };
}
