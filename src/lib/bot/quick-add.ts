import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  ParseTransactionContext,
  ParseTransactionIntent,
  ParsedTransaction,
} from "@/types/ai.types";
import { parseTransaction } from "@/lib/ai/parse-transaction";
import type { BotTransactionDraft } from "@/services/bot-transaction.service";

export type BotWizardStep =
  | "input"
  | "type"
  | "amount"
  | "who"
  | "account"
  | "transfer_destination"
  | "split_confirm"
  | "review";

export type BotWizardDraft = {
  intent: ParseTransactionIntent | null;
  amount: number | null;
  person_ids: string[];
  group_id: string | null;
  source_account_id: string | null;
  destination_account_id: string | null;
  occurred_at: string | null;
  note: string | null;
  split_bill: boolean | null;
  split_confirmed: boolean;
  shop_id: string | null;
  category_id: string | null;
  cashback_share_percent: number | null;
  cashback_share_fixed: number | null;
  cashback_mode: "none_back" | "voluntary" | "real_fixed" | "real_percent" | null;
  account_candidates: Array<{ id: string; name: string }>;
  destination_candidates: Array<{ id: string; name: string }>;
};

export type BotWizardState = {
  step: BotWizardStep;
  draft: BotWizardDraft;
};

type BotContext = {
  accounts: Array<{
    id: string;
    name: string;
    type: string | null;
    has_cashback: boolean;
  }>;
  people: Array<{
    id: string;
    name: string;
    is_group: boolean | null;
    is_owner: boolean | null;
    group_parent_id: string | null;
  }>;
  shops: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
};

const createEmptyDraft = (): BotWizardDraft => ({
  intent: null,
  amount: null,
  person_ids: [],
  group_id: null,
  source_account_id: null,
  destination_account_id: null,
  occurred_at: new Date().toISOString().slice(0, 10),
  note: "",
  split_bill: null,
  split_confirmed: false,
  shop_id: null,
  category_id: null,
  cashback_share_percent: null,
  cashback_share_fixed: null,
  cashback_mode: null,
  account_candidates: [],
  destination_candidates: [],
});

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const parseAmount = (value: string) => {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^(\d+(\.\d+)?)(k|m|b)?$/i);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = match[3]?.toLowerCase();
  const multiplier =
    suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;
  return Math.abs(base) * multiplier;
};

const intentFromInput = (value: string): ParseTransactionIntent | null => {
  const cleaned = normalizeText(value);
  if (!cleaned) return null;
  if (["expense", "spend", "spent", "tieu", "chi", "chi tieu"].includes(cleaned)) {
    return "expense";
  }
  if (["income", "salary", "received"].includes(cleaned)) return "income";
  if (["transfer", "move", "moved"].includes(cleaned)) return "transfer";
  if (["lend", "loan", "debt", "lending", "cho muon", "muon tien"].includes(cleaned)) {
    return "lend";
  }
  if (["repay", "repayment", "payback", "pay back", "tra", "tra tien", "tra no", "hoan"].includes(cleaned)) {
    return "repay";
  }
  return null;
};

const splitPeopleInput = (value: string) =>
  value
    .split(/,|and/i)
    .map((part) => part.trim())
    .filter(Boolean);

const DEFAULT_CASHBACK_PERSON_ID =
  process.env.BOT_DEFAULT_CASHBACK_PERSON_ID ?? null;
const DEFAULT_CASHBACK_PERCENT = Number(
  process.env.BOT_DEFAULT_CASHBACK_PERCENT ?? 8,
);

const findByName = <T extends { name: string }>(
  list: T[],
  name: string | null | undefined,
) => {
  if (!name) return null;
  const normalized = normalizeText(name);
  return (
    list.find((item) => normalizeText(item.name) === normalized) ??
    list.find((item) => normalizeText(item.name).includes(normalized)) ??
    list.find((item) => normalized.includes(normalizeText(item.name))) ??
    null
  );
};

const findCandidates = <T extends { name: string; id: string }>(
  list: T[],
  text: string,
) => {
  const normalized = normalizeText(text);
  const matches = list.filter((item) =>
    normalizeText(item.name).includes(normalized),
  );
  return matches;
};

const pickCandidate = <T extends { name: string; id: string }>(
  input: string,
  candidates: T[],
) => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= candidates.length) {
    return candidates[asNumber - 1] ?? null;
  }
  return findByName(candidates, trimmed);
};

const resolveCashbackMode = (params: {
  hasCashback: boolean;
  percent?: number | null;
  fixed?: number | null;
}): BotWizardDraft["cashback_mode"] => {
  if (!params.percent && !params.fixed) return "none_back";
  if (!params.hasCashback) return "voluntary";
  if (params.percent && params.percent > 0) return "real_percent";
  return "real_fixed";
};

const getDefaultShop = (shops: Array<{ id: string; name: string }>) =>
  shops.find((shop) => normalizeText(shop.name).includes("shopee")) ?? null;

const getNextStep = (draft: BotWizardDraft): BotWizardStep => {
  const isDebt = draft.intent === "lend" || draft.intent === "repay";
  if (!draft.intent) return "type";
  if (!draft.amount) return "amount";
  if (isDebt && !draft.group_id && draft.person_ids.length === 0) return "who";
  if (!draft.source_account_id) return "account";
  if (draft.intent === "transfer" && !draft.destination_account_id) {
    return "transfer_destination";
  }
  if (isDebt && !draft.split_confirmed) return "split_confirm";
  return "review";
};

const buildReview = (draft: BotWizardDraft, context: BotContext) => {
  const account = context.accounts.find((item) => item.id === draft.source_account_id);
  const dest = context.accounts.find((item) => item.id === draft.destination_account_id);
  const group = context.people.find((item) => item.id === draft.group_id);
  const shop = context.shops.find((item) => item.id === draft.shop_id);
  const people = draft.person_ids
    .map((id) => context.people.find((item) => item.id === id)?.name)
    .filter(Boolean)
    .join(", ");
  const whoLabel = group?.name ?? people ?? "-";
  const splitLabel =
    draft.intent === "lend" || draft.intent === "repay"
      ? draft.split_bill
        ? "On"
        : "Off"
      : "N/A";

  return [
    "Review:",
    `- Type: ${draft.intent ?? "-"}`,
    `- Amount: ${draft.amount ?? "-"}`,
    draft.intent === "transfer"
      ? `- From: ${account?.name ?? "-"} -> ${dest?.name ?? "-"}`
      : `- Account: ${account?.name ?? "-"}`,
    (draft.intent === "lend" || draft.intent === "repay") ? `- Who: ${whoLabel}` : null,
    `- Date: ${draft.occurred_at ?? "-"}`,
    `- Note: ${draft.note ?? "-"}`,
    `- Shop: ${shop?.name ?? "-"}`,
    draft.cashback_share_percent || draft.cashback_share_fixed
      ? `- Back: ${draft.cashback_share_percent ?? 0}% / ${draft.cashback_share_fixed ?? 0} (${draft.cashback_mode ?? "none_back"})`
      : `- Back: none`,
    `- Split bill: ${splitLabel}`,
    "Reply yes to confirm, or no to edit.",
  ]
    .filter(Boolean)
    .join("\n");
};

const promptForStep = (
  step: BotWizardStep,
  options?: { candidates?: Array<{ name: string }> },
) => {
  switch (step) {
    case "type":
      return "What type? (expense, income, transfer, lend, repay)";
    case "amount":
      return "Amount?";
    case "who":
      return "Who is this for? (person or group name)";
    case "account":
      if (options?.candidates?.length) {
        const names = options.candidates.map((item, index) => `${index + 1}. ${item.name}`).join(" | ");
        return `Which account? Reply with a number or name: ${names}`;
      }
      return "Which account?";
    case "transfer_destination":
      if (options?.candidates?.length) {
        const names = options.candidates.map((item, index) => `${index + 1}. ${item.name}`).join(" | ");
        return `Which destination account? Reply with a number or name: ${names}`;
      }
      return "Which destination account?";
    case "split_confirm":
      return "Split bill? (yes/no)";
    case "review":
      return "Reviewing...";
    default:
      return "Tell me the transaction details.";
  }
};

const applyParseResult = (
  parsed: ParsedTransaction,
  draft: BotWizardDraft,
  context: BotContext,
) => {
  const next = { ...draft };
  next.intent = parsed.intent ?? next.intent;
  next.amount = parsed.amount ?? next.amount;
  next.occurred_at = parsed.occurred_at ?? next.occurred_at;
  next.note = parsed.note ?? next.note ?? "";

  const group = findByName(
    context.people.filter((person) => person.is_group),
    parsed.group_name ?? undefined,
  );
  if (group) {
    next.group_id = group.id;
    next.person_ids = [];
    next.split_bill = true;
    next.split_confirmed = true;
  }

  if (!group && parsed.people.length > 0) {
    const matched = parsed.people
      .map((ref) =>
        findByName(
          context.people.filter((person) => !person.is_group),
          ref.name,
        ),
      )
      .filter((person): person is (typeof context.people)[number] => Boolean(person));
    if (matched.length > 0) {
      next.person_ids = matched.map((person) => person.id);
      if (next.person_ids.length > 1 && next.split_bill === null) {
        next.split_bill = true;
      }
    }
  }

  const sourceAccount = findByName(
    context.accounts,
    parsed.source_account_name ?? undefined,
  );
  if (sourceAccount) {
    next.source_account_id = sourceAccount.id;
  }
  const destAccount = findByName(
    context.accounts,
    parsed.debt_account_name ?? undefined,
  );
  if (destAccount) {
    next.destination_account_id = destAccount.id;
  }

  if (parsed.split_bill !== null && !next.split_confirmed) {
    next.split_bill = parsed.split_bill;
  }

  if (parsed.cashback_share_percent !== undefined) {
    next.cashback_share_percent = parsed.cashback_share_percent ?? null;
  }
  if (parsed.cashback_share_fixed !== undefined) {
    next.cashback_share_fixed = parsed.cashback_share_fixed ?? null;
  }

  if (parsed.shop_name) {
    const shop = findByName(context.shops, parsed.shop_name);
    if (shop) {
      next.shop_id = shop.id;
    }
  }
  if (!next.shop_id) {
    const defaultShop = getDefaultShop(context.shops);
    next.shop_id = defaultShop?.id ?? null;
  }

  return next;
};

const expandGroupMembers = (draft: BotWizardDraft, context: BotContext) => {
  if (!draft.group_id) return draft;
  const members = context.people.filter(
    (person) => !person.is_group && person.group_parent_id === draft.group_id,
  );
  const owner = context.people.find((person) => person.is_owner);
  let memberIds = members.map((member) => member.id);
  if (draft.intent === "lend" && owner && !memberIds.includes(owner.id)) {
    memberIds = [...memberIds, owner.id];
  }
  if (draft.intent === "repay" && owner) {
    memberIds = memberIds.filter((id) => id !== owner.id);
  }
  return { ...draft, person_ids: memberIds };
};

const applyDefaultCashbackForPeople = (
  draft: BotWizardDraft,
  context: BotContext,
) => {
  if (
    draft.cashback_share_percent !== null ||
    draft.cashback_share_fixed !== null
  ) {
    return draft;
  }
  const lamPerson =
    (DEFAULT_CASHBACK_PERSON_ID
      ? draft.person_ids.includes(DEFAULT_CASHBACK_PERSON_ID)
      : false) ||
    draft.person_ids.some((id) => {
      const person = context.people.find((item) => item.id === id);
      return person ? normalizeText(person.name).includes("lam") : false;
    });
  if (!lamPerson) return draft;
  return { ...draft, cashback_share_percent: DEFAULT_CASHBACK_PERCENT };
};

const applyCashbackModeForAccount = (
  draft: BotWizardDraft,
  context: BotContext,
) => {
  if (!draft.source_account_id) return draft;
  const account = context.accounts.find(
    (item) => item.id === draft.source_account_id,
  );
  if (!account) return draft;
  const mode = resolveCashbackMode({
    hasCashback: account.has_cashback,
    percent: draft.cashback_share_percent,
    fixed: draft.cashback_share_fixed,
  });
  return { ...draft, cashback_mode: mode };
};

export async function loadBotContext(
  supabase: SupabaseClient<Database>,
): Promise<{ context: ParseTransactionContext; raw: BotContext }> {
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type, is_active, cashback_config")
    .neq("type", "system");

  const { data: people } = await supabase
    .from("people")
    .select("id, name, is_group, is_owner, group_parent_id, is_archived");

  const { data: shops } = await supabase
    .from("shops")
    .select("id, name");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name");

  const filteredPeople = (people ?? []).filter((person: any) => !person.is_archived);

  const raw = {
    accounts: (accounts ?? []).map((account: any) => ({
      id: account.id,
      name: account.name ?? "",
      type: account.type ?? null,
      has_cashback: Boolean(account.cashback_config),
    })),
    people: filteredPeople.map((person: any) => ({
      id: person.id,
      name: person.name ?? "",
      is_group: person.is_group ?? null,
      is_owner: person.is_owner ?? null,
      group_parent_id: person.group_parent_id ?? null,
    })),
    shops: (shops ?? []).map((shop: any) => ({
      id: shop.id,
      name: shop.name ?? "",
    })),
    categories: (categories ?? []).map((category: any) => ({
      id: category.id,
      name: category.name ?? "",
    })),
  };

  const context: ParseTransactionContext = {
    people: raw.people.filter((person) => !person.is_group).map((person) => ({
      id: person.id,
      name: person.name,
    })),
    groups: raw.people.filter((person) => person.is_group).map((person) => ({
      id: person.id,
      name: person.name,
    })),
    accounts: raw.accounts.map((account) => ({
      id: account.id,
      name: account.name,
    })),
    categories: raw.categories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
    shops: raw.shops.map((shop) => ({
      id: shop.id,
      name: shop.name,
    })),
  };

  return { context, raw };
}

export async function advanceWizard(params: {
  text: string;
  state?: BotWizardState | null;
  context: ParseTransactionContext;
  rawContext: BotContext;
}) {
  const trimmed = params.text.trim();
  const state =
    params.state ?? ({ step: "input", draft: createEmptyDraft() } as BotWizardState);
  let draft = { ...state.draft };
  let step = state.step;
  const replies: string[] = [];

  if (step === "input") {
    const parsed = await parseTransaction(trimmed, params.context);
    draft = applyParseResult(parsed, draft, params.rawContext);
    draft = expandGroupMembers(draft, params.rawContext);
    draft = applyDefaultCashbackForPeople(draft, params.rawContext);
    draft = applyCashbackModeForAccount(draft, params.rawContext);

    if (!draft.source_account_id) {
      const accountCandidates = findCandidates(params.rawContext.accounts, trimmed);
      if (accountCandidates.length > 1) {
        draft.account_candidates = accountCandidates.map((account) => ({
          id: account.id,
          name: account.name,
        }));
      } else if (accountCandidates.length === 1) {
        draft.source_account_id = accountCandidates[0]?.id ?? null;
        draft.account_candidates = [];
      }
    }

    step = getNextStep(draft);
    if (step === "review") {
      replies.push(buildReview(draft, params.rawContext));
    } else {
      const candidates =
        step === "account"
          ? draft.account_candidates
          : step === "transfer_destination"
            ? draft.destination_candidates
            : [];
      replies.push(promptForStep(step, { candidates }));
    }
    return { replies, state: { step, draft } };
  }

  if (step === "type") {
    const intent = intentFromInput(trimmed);
    if (!intent) {
      replies.push("Please choose a valid type.");
      replies.push(promptForStep(step));
      return { replies, state };
    }
    draft.intent = intent;
  }

  if (step === "amount") {
    const amount = parseAmount(trimmed);
    if (!amount) {
      replies.push("Please enter a valid amount.");
      replies.push(promptForStep(step));
      return { replies, state };
    }
    draft.amount = amount;
    draft = applyDefaultCashbackForPeople(draft, params.rawContext);
    draft = applyCashbackModeForAccount(draft, params.rawContext);
  }

  if (step === "who") {
    const parts = splitPeopleInput(trimmed);
    if (!parts.length) {
      replies.push("Please enter a person or group.");
      replies.push(promptForStep(step));
      return { replies, state };
    }
    const group = parts
      .map((part) =>
        findByName(
          params.rawContext.people.filter((person) => person.is_group),
          part,
        ),
      )
      .find(Boolean);
    if (group) {
      draft.group_id = group.id;
      draft.split_bill = true;
      draft.split_confirmed = true;
      draft = expandGroupMembers(draft, params.rawContext);
    } else {
      const matchedPeople = parts
        .map((part) =>
          findByName(
            params.rawContext.people.filter((person) => !person.is_group),
            part,
          ),
        )
        .filter(Boolean) as Array<{ id: string }>;
      if (!matchedPeople.length) {
        replies.push("I could not find those people.");
        replies.push(promptForStep(step));
        return { replies, state };
      }
      draft.person_ids = matchedPeople.map((person) => person.id);
      if (draft.person_ids.length > 1 && draft.split_bill === null) {
        draft.split_bill = true;
      }
    }
    draft = applyDefaultCashbackForPeople(draft, params.rawContext);
  }

  if (step === "account") {
    let selectedCandidate: { id: string; name: string } | null = null;
    let candidates = draft.account_candidates;

    // 1. If we have previous candidates, try to resolve from them (Index or Refinement)
    if (candidates.length > 0) {
      const index = parseInt(trimmed, 10);
      if (!isNaN(index) && index >= 1 && index <= candidates.length) {
        selectedCandidate = candidates[index - 1]; // Index Match
      } else {
        // Not a number? Try to refine the search globally.
        const refined = findCandidates(params.rawContext.accounts, trimmed).map((account) => ({
          id: account.id,
          name: account.name,
        }));

        if (refined.length > 0) {
          candidates = refined; // Update candidates list
          if (refined.length === 1) selectedCandidate = refined[0];
        } else {
          candidates = []; // No match found
        }
      }
    } else {
      // 2. First time search
      candidates = findCandidates(params.rawContext.accounts, trimmed).map((account) => ({
        id: account.id,
        name: account.name,
      }));
      if (candidates.length === 1) selectedCandidate = candidates[0];
    }

    if (selectedCandidate) {
      // Success!
      draft.source_account_id = selectedCandidate.id;
      draft.account_candidates = [];
      draft = applyCashbackModeForAccount(draft, params.rawContext);
      // Advance to next step
      step = getNextStep(draft);
      if (step === "review") {
        replies.push(buildReview(draft, params.rawContext));
      } else {
        replies.push(promptForStep(step));
      }
      return { replies, state: { step, draft } };

    } else if (candidates.length > 1) {
      // Still ambiguous
      draft.account_candidates = candidates;
      replies.push(promptForStep(step, { candidates }));
      return { replies, state: { step, draft } };

    } else {
      // No candidates found
      draft.account_candidates = [];
      replies.push("I could not find that account.");
      replies.push(promptForStep(step));
      return { replies, state: { step, draft } };
    }
  }

  if (step === "transfer_destination") {
    let selectedCandidate: { id: string; name: string } | null = null;
    let candidates = draft.destination_candidates;

    if (candidates.length > 0) {
      const index = parseInt(trimmed, 10);
      if (!isNaN(index) && index >= 1 && index <= candidates.length) {
        selectedCandidate = candidates[index - 1];
      } else {
        const refined = findCandidates(params.rawContext.accounts, trimmed).map((account) => ({
          id: account.id,
          name: account.name,
        }));
        if (refined.length > 0) {
          candidates = refined;
          if (refined.length === 1) selectedCandidate = refined[0];
        } else {
          candidates = [];
        }
      }
    } else {
      candidates = findCandidates(params.rawContext.accounts, trimmed).map((account) => ({
        id: account.id,
        name: account.name,
      }));
      if (candidates.length === 1) selectedCandidate = candidates[0];
    }

    if (selectedCandidate) {
      if (draft.source_account_id && selectedCandidate.id === draft.source_account_id) {
        replies.push("Destination must differ from source.");
        replies.push(promptForStep(step));
        return { replies, state: { step, draft } };
      }
      draft.destination_account_id = selectedCandidate.id;
      draft.destination_candidates = [];

      step = getNextStep(draft);
      if (step === "review") {
        replies.push(buildReview(draft, params.rawContext));
      } else {
        replies.push(promptForStep(step));
      }
      return { replies, state: { step, draft } };
    } else if (candidates.length > 1) {
      draft.destination_candidates = candidates;
      replies.push(promptForStep(step, { candidates }));
      return { replies, state: { step, draft } };
    } else {
      draft.destination_candidates = [];
      replies.push("I could not find that account.");
      replies.push(promptForStep(step));
      return { replies, state: { step, draft } };
    }
  }

  if (step === "split_confirm") {
    const normalized = normalizeText(trimmed);
    if (["yes", "y", "split", "on"].includes(normalized)) {
      draft.split_bill = true;
      draft.split_confirmed = true;
    } else if (["no", "n", "off"].includes(normalized)) {
      if (draft.group_id) {
        replies.push("Groups must use split bill.");
        replies.push(promptForStep(step));
        return { replies, state };
      }
      if (draft.person_ids.length > 1) {
        replies.push("Choose a single person for no split.");
        replies.push(promptForStep("who"));
        return { replies, state: { step: "who", draft } };
      }
      draft.split_bill = false;
      draft.split_confirmed = true;
    } else {
      replies.push("Please answer yes or no.");
      replies.push(promptForStep(step));
      return { replies, state };
    }
  }

  step = getNextStep(draft);
  if (step === "review") {
    replies.push(buildReview(draft, params.rawContext));
  } else {
    const candidates =
      step === "account"
        ? draft.account_candidates
        : step === "transfer_destination"
          ? draft.destination_candidates
          : [];
    replies.push(promptForStep(step, { candidates }));
  }

  return { replies, state: { step, draft } };
}

export function buildBotTransactionDraft(draft: BotWizardDraft): BotTransactionDraft | null {
  if (!draft.intent || !draft.amount || !draft.source_account_id || !draft.occurred_at) {
    return null;
  }
  const type =
    draft.intent === "lend"
      ? "debt"
      : draft.intent === "repay"
        ? "repayment"
        : draft.intent;

  const isSplit =
    (type === "debt" || type === "repayment") &&
    Boolean(draft.split_bill) &&
    draft.person_ids.length > 1;

  return {
    type: type as any,
    amount: draft.amount,
    occurred_at: draft.occurred_at,
    source_account_id: draft.source_account_id,
    destination_account_id: draft.destination_account_id,
    person_ids: isSplit ? draft.person_ids : draft.person_ids.slice(0, 1),
    group_id: draft.group_id,
    note: draft.note ?? "",
    split_bill: isSplit,
    shop_id: draft.shop_id ?? null,
    category_id: draft.category_id ?? null,
    cashback_share_percent:
      draft.cashback_share_percent !== null
        ? draft.cashback_share_percent / 100
        : null,
    cashback_share_fixed: draft.cashback_share_fixed ?? null,
    cashback_mode: draft.cashback_mode ?? null,
  };
}

export function buildDraftFromTemplate(payload: {
  intent?: ParseTransactionIntent | null;
  source_account_id?: string | null;
  destination_account_id?: string | null;
  person_ids?: string[];
  group_id?: string | null;
  category_id?: string | null;
  shop_id?: string | null;
  note?: string | null;
  split_bill?: boolean | null;
  cashback_share_percent?: number | null;
  cashback_share_fixed?: number | null;
  cashback_mode?: "none_back" | "voluntary" | "real_fixed" | "real_percent" | null;
}): BotWizardDraft {
  return {
    ...createEmptyDraft(),
    intent: payload.intent ?? null,
    source_account_id: payload.source_account_id ?? null,
    destination_account_id: payload.destination_account_id ?? null,
    person_ids: payload.person_ids ?? [],
    group_id: payload.group_id ?? null,
    category_id: payload.category_id ?? null,
    shop_id: payload.shop_id ?? null,
    note: payload.note ?? "",
    split_bill: payload.split_bill ?? null,
    split_confirmed: Boolean(payload.split_bill),
    cashback_share_percent: payload.cashback_share_percent ?? null,
    cashback_share_fixed: payload.cashback_share_fixed ?? null,
    cashback_mode: payload.cashback_mode ?? null,
  };
}

export function buildLinkHelp(profileId?: string) {
  return [
    "Link your bot to a profile:",
    "Example: link <profile_id> (or /link on Telegram)",
    profileId ? `Your profile id: ${profileId}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildQuickHelp() {
  return [
    "Commands:",
    "- /link <profile_id> or 'link <profile_id>' : link bot to your profile",
    "- /reset : reset the wizard",
    "- /status : show current draft",
    "- /cancel : cancel current draft",
    "- template list : list saved templates",
    "- template save <name> : save current draft as template",
    "- template <name> : load a template",
  ].join("\n");
}

export function summarizeDraft(draft: BotWizardDraft, context: BotContext) {
  return buildReview(draft, context);
}
