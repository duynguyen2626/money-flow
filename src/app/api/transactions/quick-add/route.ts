import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createTransaction } from "@/services/transaction.service";
import { generateTag } from "@/lib/tag";
import type { CashbackMode } from "@/types/moneyflow.types";

const SPLIT_BILL_SYSTEM_ACCOUNT_ID = "88888888-9999-9999-9999-888888888888";

type QuickAddPayload = {
  type: "expense" | "income" | "transfer" | "debt" | "repayment";
  amount: number;
  occurred_at: string;
  note?: string | null;
  source_account_id: string;
  destination_account_id?: string | null;
  person_ids?: string[];
  group_id?: string | null;
  split_bill?: boolean;
  category_id?: string | null;
  shop_id?: string | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  cashback_mode?: string | null;
};

const allowedTypes = new Set([
  "expense",
  "income",
  "transfer",
  "debt",
  "repayment",
]);
const allowedCashbackModes = new Set([
  "none_back",
  "real_fixed",
  "real_percent",
  "voluntary",
]);

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCashbackMode = (value: unknown): CashbackMode | null => {
  if (typeof value !== "string") return null;
  return allowedCashbackModes.has(value) ? (value as CashbackMode) : null;
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: QuickAddPayload;
  try {
    payload = (await request.json()) as QuickAddPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!payload || !allowedTypes.has(payload.type)) {
    return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
  }

  const amount = toNumber(payload.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (!payload.source_account_id) {
    return NextResponse.json({ error: "Missing source account" }, { status: 400 });
  }

  if (!payload.occurred_at) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  if (payload.type === "transfer" && !payload.destination_account_id) {
    return NextResponse.json(
      { error: "Missing destination account" },
      { status: 400 },
    );
  }

  const personIds = Array.isArray(payload.person_ids)
    ? payload.person_ids.filter((id) => typeof id === "string" && id.trim())
    : [];

  if (
    (payload.type === "debt" || payload.type === "repayment") &&
    personIds.length === 0
  ) {
    return NextResponse.json(
      { error: "Missing person or group" },
      { status: 400 },
    );
  }

  const occurredAt = payload.occurred_at;
  const tag = generateTag(new Date(occurredAt));
  const note = payload.note ?? "";
  const splitEnabled =
    Boolean(payload.split_bill) &&
    (payload.type === "debt" || payload.type === "repayment") &&
    personIds.length > 1;
  const cashbackMode = normalizeCashbackMode(payload.cashback_mode);

  if (!splitEnabled) {
    const createdId = await createTransaction({
      occurred_at: occurredAt,
      note,
      type: payload.type,
      source_account_id: payload.source_account_id,
      amount,
      tag,
      category_id: payload.category_id ?? undefined,
      person_id:
        payload.type === "debt" || payload.type === "repayment"
          ? personIds[0] ?? undefined
          : undefined,
      destination_account_id:
        payload.type === "transfer"
          ? payload.destination_account_id ?? undefined
          : undefined,
      shop_id: payload.shop_id ?? undefined,
      cashback_share_percent: payload.cashback_share_percent ?? undefined,
      cashback_share_fixed: payload.cashback_share_fixed ?? undefined,
      cashback_mode: cashbackMode ?? undefined,
    });

    if (!createdId) {
      return NextResponse.json(
        { error: "Failed to create transaction" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, id: createdId });
  }

  const splitCount = personIds.length;
  const splitAmount = splitCount > 0 ? amount / splitCount : 0;
  const basePrefix =
    payload.type === "repayment" ? "[SplitRepay Base]" : "[SplitBill Base]";
  const childPrefix =
    payload.type === "repayment" ? "[SplitRepay]" : "[SplitBill]";
  const billTitle = note.trim() || "Split Bill";
  const groupLabel = payload.group_id ? "Group" : "People";
  const baseNote = `${basePrefix} ${groupLabel} | ${billTitle}`;
  const childNoteBase = `${childPrefix} ${groupLabel} | ${billTitle}`;
  const baseType = payload.type === "repayment" ? "income" : payload.type;
  const fixedTotal = Number(payload.cashback_share_fixed ?? 0);
  const fixedShare = splitCount > 0 ? fixedTotal / splitCount : 0;

  const baseId = await createTransaction({
    occurred_at: occurredAt,
    note: baseNote,
    type: baseType,
    source_account_id: payload.source_account_id,
    amount,
    tag,
    category_id: payload.category_id ?? undefined,
    person_id: payload.group_id ?? undefined,
    shop_id: payload.shop_id ?? undefined,
    cashback_share_percent: payload.cashback_share_percent ?? undefined,
    cashback_share_fixed: payload.cashback_share_fixed ?? undefined,
    cashback_mode: cashbackMode ?? undefined,
    metadata: {
      is_split_bill_base: true,
      split_group_id: payload.group_id ?? null,
      split_count: splitCount,
      split_type: payload.type,
    },
  });

  if (!baseId) {
    return NextResponse.json(
      { error: "Failed to create split base transaction" },
      { status: 500 },
    );
  }

  const results = await Promise.all(
    personIds.map((personId) =>
      createTransaction({
        occurred_at: occurredAt,
        note: childNoteBase,
        type: payload.type,
        source_account_id: SPLIT_BILL_SYSTEM_ACCOUNT_ID,
        amount: splitAmount,
        tag,
        category_id: payload.category_id ?? undefined,
        person_id: personId,
        shop_id: payload.shop_id ?? undefined,
        cashback_share_percent: payload.cashback_share_percent ?? undefined,
        cashback_share_fixed: fixedShare,
        cashback_mode: cashbackMode ?? undefined,
        metadata: {
          split_parent_id: baseId,
          split_group_id: payload.group_id ?? null,
        },
      }),
    ),
  );

  const failed = results.filter((result) => !result);
  if (failed.length > 0) {
    return NextResponse.json(
      { error: "Failed to create split transactions" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: baseId });
}
