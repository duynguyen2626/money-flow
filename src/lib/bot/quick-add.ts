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
  | "date"
  | "note"
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
};

export type BotWizardState = {
  step: BotWizardStep;
  draft: BotWizardDraft;
};

type BotContext = {
  accounts: Array<{ id: string; name: string; type: string | null }>;
  people: Array<{
    id: string;
    name: string;
    is_group: boolean | null;
    is_owner: boolean | null;
    group_parent_id: string | null;
  }>;
};

const createEmptyDraft = (): BotWizardDraft => ({
  intent: null,
  amount: null,
  person_ids: [],
  group_id: null,
  source_account_id: null,
  destination_account_id: null,
  occurred_at: null,
  note: null,
  split_bill: null,
  split_confirmed: false,
});

const normalizeText = (value: string) => value.trim().toLowerCase();

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

const parseDateValue = (value: string) => {
  const cleaned = normalizeText(value);
  const today = new Date();
  if (cleaned === "today") return today;
  if (cleaned === "yesterday") {
    const date = new Date();
    date.setDate(today.getDate() - 1);
    return date;
  }
  const iso = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const candidate = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
    );
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }
  return null;
};

const intentFromInput = (value: string): ParseTransactionIntent | null => {
  const cleaned = normalizeText(value);
  if (!cleaned) return null;
  if (["expense", "spend", "spent"].includes(cleaned)) return "expense";
  if (["income", "salary", "received"].includes(cleaned)) return "income";
  if (["transfer", "move", "moved"].includes(cleaned)) return "transfer";
  if (["lend", "loan", "debt", "lending"].includes(cleaned)) return "lend";
  if (["repay", "repayment", "payback", "pay back"].includes(cleaned)) return "repay";
  return null;
};

const splitPeopleInput = (value: string) =>
  value
    .split(/,|and/i)
    .map((part) => part.trim())
    .filter(Boolean);

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

const getNextStep = (draft: BotWizardDraft): BotWizardStep => {
  const isDebt = draft.intent === "lend" || draft.intent === "repay";
  if (!draft.intent) return "type";
  if (!draft.amount) return "amount";
  if (isDebt && !draft.group_id && draft.person_ids.length === 0) return "who";
  if (!draft.source_account_id) return "account";
  if (draft.intent === "transfer" && !draft.destination_account_id) {
    return "transfer_destination";
  }
  if (!draft.occurred_at) return "date";
  if (draft.note === null) return "note";
  if (isDebt && !draft.split_confirmed) return "split_confirm";
  return "review";
};

const buildReview = (draft: BotWizardDraft, context: BotContext) => {
  const account = context.accounts.find((item) => item.id === draft.source_account_id);
  const dest = context.accounts.find((item) => item.id === draft.destination_account_id);
  const group = context.people.find((item) => item.id === draft.group_id);
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
    `- Split bill: ${splitLabel}`,
    "Reply yes to confirm, or no to edit.",
  ]
    .filter(Boolean)
    .join("\n");
};

const promptForStep = (step: BotWizardStep) => {
  switch (step) {
    case "type":
      return "What type? (expense, income, transfer, lend, repay)";
    case "amount":
      return "Amount?";
    case "who":
      return "Who is this for? (person or group name)";
    case "account":
      return "Which account?";
    case "transfer_destination":
      return "Which destination account?";
    case "date":
      return "Date? (YYYY-MM-DD or today)";
    case "note":
      return "Add a note? (reply with text or 'skip')";
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
  next.note = parsed.note ?? next.note;

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

  const sourceAccount = findByName(context.accounts, parsed.source_account_name ?? undefined);
  if (sourceAccount) {
    next.source_account_id = sourceAccount.id;
  }
  const destAccount = findByName(context.accounts, parsed.debt_account_name ?? undefined);
  if (destAccount) {
    next.destination_account_id = destAccount.id;
  }

  if (parsed.split_bill !== null && !next.split_confirmed) {
    next.split_bill = parsed.split_bill;
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

export async function loadBotContext(
  supabase: SupabaseClient<Database>,
): Promise<{ context: ParseTransactionContext; raw: BotContext }> {
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type, is_active")
    .neq("type", "system");

  const { data: people } = await supabase
    .from("profiles")
    .select("id, name, is_group, is_owner, group_parent_id, is_archived");

  const filteredPeople = (people ?? []).filter((person: any) => !person.is_archived);

  const raw = {
    accounts: (accounts ?? []).map((account: any) => ({
      id: account.id,
      name: account.name ?? "",
      type: account.type ?? null,
    })),
    people: filteredPeople.map((person: any) => ({
      id: person.id,
      name: person.name ?? "",
      is_group: person.is_group ?? null,
      is_owner: person.is_owner ?? null,
      group_parent_id: person.group_parent_id ?? null,
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
    step = getNextStep(draft);
    if (step === "review") {
      replies.push(buildReview(draft, params.rawContext));
    } else {
      replies.push(promptForStep(step));
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
  }

  if (step === "account") {
    const account = findByName(params.rawContext.accounts, trimmed);
    if (!account) {
      replies.push("I could not find that account.");
      replies.push(promptForStep(step));
      return { replies, state };
    }
    draft.source_account_id = account.id;
  }

  if (step === "transfer_destination") {
    const account = findByName(params.rawContext.accounts, trimmed);
    if (!account) {
      replies.push("I could not find that account.");
      replies.push(promptForStep(step));
      return { replies, state };
    }
    if (draft.source_account_id && account.id === draft.source_account_id) {
      replies.push("Destination must differ from source.");
      replies.push(promptForStep(step));
      return { replies, state };
    }
    draft.destination_account_id = account.id;
  }

  if (step === "date") {
    const parsedDate = parseDateValue(trimmed);
    if (!parsedDate) {
      replies.push("Please use YYYY-MM-DD or 'today'.");
      replies.push(promptForStep(step));
      return { replies, state };
    }
    draft.occurred_at = parsedDate.toISOString().slice(0, 10);
  }

  if (step === "note") {
    draft.note = trimmed.toLowerCase() === "skip" ? "" : trimmed;
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
    replies.push(promptForStep(step));
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
    type,
    amount: draft.amount,
    occurred_at: draft.occurred_at,
    source_account_id: draft.source_account_id,
    destination_account_id: draft.destination_account_id,
    person_ids: isSplit ? draft.person_ids : draft.person_ids.slice(0, 1),
    group_id: draft.group_id,
    note: draft.note ?? "",
    split_bill: isSplit,
  };
}

export function buildLinkHelp(profileId?: string) {
  return [
    "Link your bot to a profile:",
    "Example: /link <profile_id>",
    profileId ? `Your profile id: ${profileId}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildQuickHelp() {
  return [
    "Commands:",
    "- /link <profile_id> : link bot to your profile",
    "- /reset : reset the wizard",
    "- /status : show current draft",
    "- /cancel : cancel current draft",
  ].join("\n");
}

export function summarizeDraft(draft: BotWizardDraft, context: BotContext) {
  return buildReview(draft, context);
}
