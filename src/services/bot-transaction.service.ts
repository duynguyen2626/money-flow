"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { normalizeAmountForType } from "@/services/transaction.service";
import { recalculateBalanceWithClient } from "@/services/account.service";
import { generateTag } from "@/lib/tag";

export type BotTransactionType =
  | "expense"
  | "income"
  | "transfer"
  | "debt"
  | "repayment";

export type BotTransactionDraft = {
  type: BotTransactionType;
  amount: number;
  occurred_at: string;
  source_account_id: string;
  destination_account_id?: string | null;
  person_ids?: string[];
  group_id?: string | null;
  note?: string | null;
  split_bill?: boolean;
  created_by?: string | null;
  category_id?: string | null;
  shop_id?: string | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  cashback_mode?: string | null;
};

const SPLIT_BILL_SYSTEM_ACCOUNT_ID = "88888888-9999-9999-9999-888888888888";

type InsertRow = Database["public"]["Tables"]["transactions"]["Insert"];

const toIso = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length === 10) {
    return `${trimmed}T12:00:00.000Z`;
  }
  return trimmed;
};

const buildTransactionRow = async (
  input: {
    type: BotTransactionType;
    amount: number;
    occurred_at: string;
    source_account_id: string;
    person_id?: string | null;
    destination_account_id?: string | null;
    note?: string | null;
    tag?: string | null;
    metadata?: Json | null;
    created_by?: string | null;
    category_id?: string | null;
    shop_id?: string | null;
    cashback_share_percent?: number | null;
    cashback_share_fixed?: number | null;
    cashback_mode?: string | null;
  },
): Promise<InsertRow> => {
  const normalizedAmount = await normalizeAmountForType(
    input.type,
    input.amount,
  );

  const baseType =
    input.type === "repayment"
      ? "income"
      : input.type === "debt"
        ? "expense"
        : input.type;

  const targetAccountId =
    baseType === "transfer" ? input.destination_account_id ?? null : null;

  return {
    occurred_at: toIso(input.occurred_at),
    note: input.note ?? null,
    status: "posted",
    tag: input.tag ?? null,
    created_by: input.created_by ?? null,
    amount: normalizedAmount,
    type: input.type,
    account_id: input.source_account_id,
    target_account_id: targetAccountId,
    category_id: input.category_id ?? null,
    person_id: input.person_id ?? null,
    metadata: input.metadata ?? null,
    shop_id: input.shop_id ?? null,
    persisted_cycle_tag: null,
    is_installment: false,
    installment_plan_id: null,
    cashback_share_percent: input.cashback_share_percent ?? null,
    cashback_share_fixed: input.cashback_share_fixed ?? null,
    cashback_mode: input.cashback_mode ?? null,
  };
};

const recalcAccounts = async (
  supabase: SupabaseClient,
  accountIds: Set<string>,
) => {
  for (const accountId of accountIds) {
    await recalculateBalanceWithClient(supabase, accountId);
  }
};

export async function createBotTransactions(
  supabase: SupabaseClient<Database>,
  draft: BotTransactionDraft,
) {
  const tag = generateTag(new Date(draft.occurred_at));
  const createdIds: string[] = [];
  const impactedAccounts = new Set<string>();
  impactedAccounts.add(draft.source_account_id);
  if (draft.destination_account_id) {
    impactedAccounts.add(draft.destination_account_id);
  }

  const addTransaction = async (row: InsertRow) => {
    const { data, error } = await supabase
      .from("transactions")
      .insert(row as any)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create transaction.");
    }
    createdIds.push((data as { id: string }).id);
  };

  const isSplit =
    draft.split_bill &&
    (draft.type === "debt" || draft.type === "repayment") &&
    (draft.person_ids?.length ?? 0) > 1;

  if (!isSplit) {
    const row = await buildTransactionRow({
      type: draft.type,
      amount: draft.amount,
      occurred_at: draft.occurred_at,
      source_account_id: draft.source_account_id,
      destination_account_id: draft.destination_account_id,
      person_id: draft.person_ids?.[0] ?? null,
      note: draft.note ?? null,
      tag,
      created_by: draft.created_by ?? null,
      category_id: draft.category_id ?? null,
      shop_id: draft.shop_id ?? null,
      cashback_share_percent: draft.cashback_share_percent ?? null,
      cashback_share_fixed: draft.cashback_share_fixed ?? null,
      cashback_mode: draft.cashback_mode ?? null,
    });
    await addTransaction(row);
    await recalcAccounts(supabase, impactedAccounts);
    return createdIds;
  }

  const splitCount = draft.person_ids?.length ?? 0;
  const splitAmount = splitCount > 0 ? draft.amount / splitCount : 0;
  const basePrefix =
    draft.type === "repayment" ? "[SplitRepay Base]" : "[SplitBill Base]";
  const childPrefix =
    draft.type === "repayment" ? "[SplitRepay]" : "[SplitBill]";
  const billTitle = draft.note?.trim() || "Split Bill";
  const groupLabel = draft.group_id ? "Group" : "People";
  const baseNote = `${basePrefix} ${groupLabel} | ${billTitle}`;
  const childNoteBase = `${childPrefix} ${groupLabel} | ${billTitle}`;

  const baseRow = await buildTransactionRow({
    type: draft.type === "repayment" ? "income" : draft.type,
    amount: draft.amount,
    occurred_at: draft.occurred_at,
    source_account_id: draft.source_account_id,
    destination_account_id: draft.destination_account_id,
    person_id: draft.group_id ?? null,
    note: baseNote,
    tag,
    created_by: draft.created_by ?? null,
    category_id: draft.category_id ?? null,
    shop_id: draft.shop_id ?? null,
    cashback_share_percent: draft.cashback_share_percent ?? null,
    cashback_share_fixed: draft.cashback_share_fixed ?? null,
    cashback_mode: draft.cashback_mode ?? null,
    metadata: {
      is_split_bill_base: true,
      split_group_id: draft.group_id ?? null,
      split_count: splitCount,
      split_type: draft.type,
    },
  });

  await addTransaction(baseRow);
  const baseId = createdIds[createdIds.length - 1];

  for (const personId of draft.person_ids ?? []) {
    const row = await buildTransactionRow({
      type: draft.type,
      amount: splitAmount,
      occurred_at: draft.occurred_at,
      source_account_id: SPLIT_BILL_SYSTEM_ACCOUNT_ID,
      destination_account_id: draft.destination_account_id,
      person_id: personId,
      note: childNoteBase,
      tag,
      created_by: draft.created_by ?? null,
      category_id: draft.category_id ?? null,
      shop_id: draft.shop_id ?? null,
      metadata: {
        split_parent_id: baseId,
        split_group_id: draft.group_id ?? null,
      },
    });
    impactedAccounts.add(SPLIT_BILL_SYSTEM_ACCOUNT_ID);
    await addTransaction(row);
  }

  await recalcAccounts(supabase, impactedAccounts);
  return createdIds;
}
