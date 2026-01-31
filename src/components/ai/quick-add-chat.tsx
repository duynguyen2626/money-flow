"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import type { ComboboxGroup } from "@/components/ui/combobox";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { AddTransactionDialog } from "@/components/moneyflow/add-transaction-dialog";
import { generateTag } from "@/lib/tag";
import { cn } from "@/lib/utils";
import type { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import type {
  ParsedTransaction,
  ParseTransactionIntent,
} from "@/types/ai.types";
import type { TransactionFormValues } from "@/components/moneyflow/transaction-form";
import {
  MessageSquareText,
  Sparkles,
  ArrowLeft,
  Search,
  Check,
  X,
  Pencil,
} from "lucide-react";

type WizardStep =
  | "input"
  | "type"
  | "amount"
  | "who"
  | "account"
  | "transfer_destination"
  | "split_confirm"
  | "review";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type QuickAddDraft = {
  intent: ParseTransactionIntent | null;
  amount: number | null;
  people: Person[];
  group: Person | null;
  sourceAccount: Account | null;
  sourceAccountConfirmed: boolean;
  destinationAccount: Account | null;
  occurredAt: Date | null;
  note: string | null;
  splitBill: boolean | null;
  splitBillConfirmed: boolean;
  shop: Shop | null;
  category: Category | null;
  cashbackSharePercent: number | null;
  cashbackShareFixed: number | null;
  cashbackMode: "none_back" | "voluntary" | "real_fixed" | "real_percent" | null;
};

type QuickAddInitialValues = Partial<TransactionFormValues> & {
  split_group_id?: string;
  split_person_ids?: string[];
};

type QuickAddTemplatePayload = {
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
};

type QuickAddTemplate = {
  id: string;
  name: string;
  payload: QuickAddTemplatePayload;
};

type ReviewEditField =
  | "type"
  | "amount"
  | "who"
  | "account"
  | "destination"
  | "date"
  | "note"
  | "category"
  | "shop"
  | "back"
  | "split";


const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const findByName = <T extends { name: string }>(
  list: T[],
  name: string | null | undefined,
) => {
  if (!name) return null;
  const normalized = normalizeName(name);
  return (
    list.find((item) => normalizeName(item.name) === normalized) ??
    list.find((item) => normalizeName(item.name).includes(normalized)) ??
    list.find((item) => normalized.includes(normalizeName(item.name))) ??
    null
  );
};

const dedupeById = <T extends { id: string }>(list: T[]) => {
  const seen = new Set<string>();
  return list.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 0) return "";
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : "";
  return `${first}${last}`.toUpperCase();
};

const renderAvatarNode = (
  name: string,
  url?: string | null,
  rounded = true,
) => {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={cn(
          "h-6 w-6 object-contain", // Changed cover to contain per user request
          rounded ? "rounded-full" : "rounded-none", // Changed md to none per user request
        )}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-6 w-6 items-center justify-center bg-slate-200 text-[10px] font-semibold text-slate-600",
        rounded ? "rounded-full" : "rounded-none",
      )}
    >
      {getInitials(name)}
    </div>
  );
};

const parseAmount = (value: string) => {
  // Handle "2,5tr" / "2,5k" format specifically FIRST
  // If we see digits + comma + digits + suffix, treat comma as decimal
  if (/^\d+,\d+\s*(tr|k|m|b)$/i.test(value.trim())) {
    value = value.replace(",", ".");
  }

  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;

  // Handle mixed format like "6tr4" -> 6.4 million
  const mixedMatch = cleaned.match(/^(\d+)(tr)(\d+)$/i);
  if (mixedMatch) {
    const main = mixedMatch[1];
    const decimal = mixedMatch[3];
    const combined = parseFloat(`${main}.${decimal}`);
    return combined * 1_000_000;
  }

  const match = cleaned.match(/^(\d+([.,]\d+)?)(k|m|b|tr)?$/i);
  if (!match) return null;
  // Support comma as decimal separator (e.g. 2,5)
  const baseStr = match[1].replace(',', '.');
  const base = Number(baseStr);
  if (!Number.isFinite(base)) return null;
  const suffix = match[3]?.toLowerCase();
  const multiplier =
    suffix === "k"
      ? 1_000
      : suffix === "m" || suffix === "tr"
        ? 1_000_000
        : suffix === "b"
          ? 1_000_000_000
          : 1;
  return Math.abs(base) * multiplier;
};

const extractAmountFromText = (value: string) => {
  // Added 'tr' to regex and mixed format
  // Check specifically for XtrY pattern first
  const mixedMatch = value.match(/\b(\d+)tr(\d+)\b/i);
  if (mixedMatch) {
    const main = mixedMatch[1];
    const decimal = mixedMatch[2];
    return parseFloat(`${main}.${decimal}`) * 1_000_000;
  }
  const match = value.match(/(\d[\d,]*\.?\d*)\s*(k|m|b|tr)?/i);
  if (!match) return null;
  return parseAmount(match[0]);
};

const intentFromInput = (value: string): ParseTransactionIntent | null => {
  const cleaned = normalizeName(value);
  if (!cleaned) return null;
  if (["expense", "spend", "spent", "tieu", "chi", "chi tieu"].includes(cleaned)) {
    return "expense";
  }
  if (["income", "salary", "received"].includes(cleaned)) return "income";
  if (["transfer", "move", "moved"].includes(cleaned)) return "transfer";
  if (["lend", "loan", "debt", "lending", "cho muon", "muon tien"].includes(cleaned)) {
    return "lend";
  }
  if (["repay", "repayment", "payback", "pay back", "tra", "tra no", "tra tien", "hoan"].includes(cleaned)) {
    return "repay";
  }
  return null;
};

const splitPeopleInput = (value: string) =>
  value
    .split(/,|and/i)
    .map((part) => part.trim())
    .filter(Boolean);

const resolveCashbackMode = (
  account: Account | null,
  percent: number | null,
  fixed: number | null,
) => {
  if (!percent && !fixed) return "none_back" as const;
  const hasCashback = Boolean(account?.cashback_config);
  if (!hasCashback) return "voluntary" as const;
  if (percent && percent > 0) return "real_percent" as const;
  return "real_fixed" as const;
};

const getDefaultShop = (shops: Shop[]) =>
  shops.find((shop) => normalizeName(shop.name).includes("shopee")) ?? null;

const extractAccountKeyword = (text: string) => {
  const patterns = [
    /(?:thẻ|card|account)\s+(\w+)/i,
    /(\w+)\s+(?:card|account)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  // If no pattern matches, try to extract the last word
  const words = text.trim().split(/\s+/);
  if (words.length > 0) {
    const lastWord = words[words.length - 1];
    // Check if it looks like an account keyword (short, alphanumeric)
    if (lastWord.length <= 10 && /^[a-z0-9]+$/i.test(lastWord)) {
      return lastWord;
    }
  }
  return text; // fallback to full text
};

const findAccountCandidates = (text: string, accounts: Account[]) => {
  const normalizedInput = normalizeName(text);
  if (!normalizedInput) return [];

  // 1. Exact match (highest priority)
  const exact = accounts.find(acc => normalizeName(acc.name) === normalizedInput);
  if (exact) return [exact];

  // 2. Start-with match
  const startsWith = accounts.filter(acc => normalizeName(acc.name).startsWith(normalizedInput));
  if (startsWith.length > 0) return startsWith;

  // 3. Word-based match (smart keywords)
  const inputWords = normalizedInput.split(/\s+/);
  return accounts.filter((account) => {
    const accountName = normalizeName(account.name);
    // If the input is fully contained in the account name
    if (accountName.includes(normalizedInput)) return true;

    // If identifying words from the account name are present in the input
    // e.g. "vib credit" -> matches "Vib Platinum" if "vib" is a match
    const accountWords = accountName.split(/\s+/);
    const matchesAllInputKeywords = inputWords.every(word => accountName.includes(word));
    if (matchesAllInputKeywords) return true;

    return false;
  }).sort((a, b) => {
    // Prefer shorter names (more precise match) when fuzzy matching
    return a.name.length - b.name.length;
  });
};

const DEFAULT_CASHBACK_PERCENT = 8;

const pickCandidateByIndex = <T,>(value: string, list: T[]) => {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return null;
  if (asNumber < 1 || asNumber > list.length) return null;
  return list[asNumber - 1] ?? null;
};

const applyContextPerson = (
  draft: QuickAddDraft,
  contextPerson: Person | null | undefined,
) => {
  if (!contextPerson) return draft;
  if (draft.intent !== "lend" && draft.intent !== "repay") return draft;
  if (draft.group || draft.people.length > 0) return draft;
  if (contextPerson.is_group) {
    return {
      ...draft,
      group: contextPerson,
      people: [],
      splitBill: true,
      splitBillConfirmed: true,
    };
  }
  return {
    ...draft,
    group: null,
    people: [contextPerson],
    splitBill: false,
    splitBillConfirmed: true,
  };
};

const applyDefaultCashbackForPeople = (
  draft: QuickAddDraft,
  params: { groupMembers: Map<string, Person[]>; people: Person[] },
) => {
  if (draft.cashbackSharePercent !== null || draft.cashbackShareFixed !== null) {
    return draft;
  }
  const hasLam = (person: Person) =>
    normalizeName(person.name).includes("lam");
  const groupPeople = draft.group
    ? params.groupMembers.get(draft.group.id) ?? []
    : [];
  const shouldApply =
    draft.people.some(hasLam) || groupPeople.some(hasLam);
  if (!shouldApply) return draft;
  return {
    ...draft,
    cashbackSharePercent: DEFAULT_CASHBACK_PERCENT,
  };
};

const buildInitialDraft = (): QuickAddDraft => ({
  intent: null,
  amount: null,
  people: [],
  group: null,
  sourceAccount: null,
  sourceAccountConfirmed: false,
  destinationAccount: null,
  occurredAt: new Date(),
  note: "",
  splitBill: null,
  splitBillConfirmed: false,
  shop: null,
  category: null,
  cashbackSharePercent: null,
  cashbackShareFixed: null,
  cashbackMode: null,
});

const stepPrompts: Record<WizardStep, string> = {
  input:
    "Tell me what you want to add. Example: 'Paid 120k for lunch today from Cash'.",
  type: "What type is this transaction?",
  amount: "How much is it?",
  who: "Who is this for? Choose a person or group.",
  account: "Which account should be used?",
  transfer_destination: "Which account should receive the transfer?",
  split_confirm: "Should this be a split bill?",
  review: "Review your details before confirming.",
};

const quickTypeOptions: Array<{ label: string; intent: ParseTransactionIntent }> =
  [
    { label: "Expense", intent: "expense" },
    { label: "Income", intent: "income" },
    { label: "Transfer", intent: "transfer" },
    { label: "Lend", intent: "lend" },
    { label: "Repay", intent: "repay" },
  ];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

export function QuickAddChat({
  accounts,
  categories,
  people,
  shops,
  variant = "inline",
  contextPerson,
  modelName,
}: {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  shops: Shop[];
  variant?: "inline" | "floating";
  contextPerson?: Person | null;
  modelName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<QuickAddDraft>(buildInitialDraft());
  const [step, setStep] = useState<WizardStep>("input");
  const [inputValue, setInputValue] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [reviewValues, setReviewValues] = useState<QuickAddInitialValues | null>(
    null,
  );
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [accountCandidates, setAccountCandidates] = useState<Account[]>([]);
  const [accountQuery, setAccountQuery] = useState("");
  const [destinationCandidates, setDestinationCandidates] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<QuickAddTemplate[]>([]);
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSubmittingNow, setIsSubmittingNow] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewEditField, setReviewEditField] = useState<ReviewEditField | null>(
    null,
  );
  const [reviewEditValue, setReviewEditValue] = useState("");
  const [reviewEditSecondaryValue, setReviewEditSecondaryValue] = useState("");
  const [reviewAccountFilter, setReviewAccountFilter] = useState<"all" | "vib">(
    "all",
  );
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const historyRef = useRef<WizardStep[]>([]);
  const lastPromptedStep = useRef<WizardStep | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const groupMembers = useMemo(() => {
    const map = new Map<string, Person[]>();
    people.forEach((person) => {
      if (!person.group_parent_id) return;
      const list = map.get(person.group_parent_id) ?? [];
      list.push(person);
      map.set(person.group_parent_id, list);
    });
    return map;
  }, [people]);

  const groups = useMemo(
    () => people.filter((person) => person.is_group),
    [people],
  );

  const individualPeople = useMemo(
    () => people.filter((person) => !person.is_group),
    [people],
  );

  const recentPeople = useMemo(
    () => individualPeople.slice(0, 6),
    [individualPeople],
  );

  const recentGroups = useMemo(() => groups.slice(0, 4), [groups]);

  const selectableAccounts = useMemo(
    () => accounts.filter((account) => account.type !== "system"),
    [accounts],
  );

  // Lend allows System accounts (e.g. Wallet) but NOT Saving/Invest
  // Lend allows System accounts (e.g. Wallet) but NOT Saving/Invest
  const lendSelectableAccounts = useMemo(
    () => accounts.filter((account) => {
      const type = account.type.toLowerCase();
      // Aggressive filter: Block anything that looks like saving/invest/asset
      if (type.includes("saving")) return false;
      if (type.includes("invest")) return false;
      if (type.includes("asset")) return false;
      return true;
    }),
    [accounts],
  );

  const vibAccounts = useMemo(
    () => findAccountCandidates("vib", selectableAccounts),
    [selectableAccounts],
  );

  const recentAccounts = useMemo(
    () => selectableAccounts.slice(0, 6),
    [selectableAccounts],
  );

  useEffect(() => {
    if (!contextPerson) return;
    if (draft.intent !== "lend" && draft.intent !== "repay") return;
    if (draft.group || draft.people.length > 0) return;
    let nextDraft = applyContextPerson(draft, contextPerson);
    if (nextDraft === draft) return;
    nextDraft = applyDefaultCashbackForPeople(nextDraft, {
      groupMembers,
      people: individualPeople,
    });
    nextDraft.cashbackMode = resolveCashbackMode(
      nextDraft.sourceAccount,
      nextDraft.cashbackSharePercent,
      nextDraft.cashbackShareFixed,
    );
    setDraft(nextDraft);
  }, [
    contextPerson,
    draft,
    groupMembers,
    individualPeople,
  ]);

  const isDebtIntent = draft.intent === "lend" || draft.intent === "repay";
  const isFloating = variant === "floating";

  const accountItems = useMemo(() => {
    // Switch account source based on intent
    const sourceList = isDebtIntent ? lendSelectableAccounts : selectableAccounts;
    const list = reviewAccountFilter === "vib" ? findAccountCandidates("vib", sourceList) : sourceList;
    return list.map((account) => ({
      value: account.id,
      label: account.name,
      // description: account.type.replace(/_/g, " "), // Hidden per user request
      icon: renderAvatarNode(account.name, account.image_url ?? null, false),
      searchValue: `${account.name} ${account.type}`,
    }));
  }, [reviewAccountFilter, lendSelectableAccounts, selectableAccounts, isDebtIntent]);

  const personGroups = useMemo<ComboboxGroup[]>(() => {
    const groupItems = groups.map((group) => ({
      value: group.id,
      label: group.name,
      icon: renderAvatarNode(group.name, group.image_url ?? null),
      searchValue: group.name,
    }));
    const peopleItems = individualPeople.map((person) => ({
      value: person.id,
      label: person.name,
      // description: person.email ?? undefined, // Removed
      icon: renderAvatarNode(person.name, person.image_url ?? null),
      searchValue: person.name,
    }));
    return [
      { label: "Groups", items: groupItems },
      { label: "People", items: peopleItems },
    ];
  }, [groups, individualPeople]);

  const categoryItems = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: category.name,
        description: category.type,
      })),
    [categories],
  );

  const shopItems = useMemo(
    () =>
      shops.map((shop) => ({
        value: shop.id,
        label: shop.name,
        icon: shop.image_url
          ? renderAvatarNode(shop.name, shop.image_url, false)
          : null,
      })),
    [shops],
  );

  const formatAccountList = (list: Account[]) =>
    list.map((account, index) => `${index + 1}. ${account.name}`).join(" | ");

  const formatIntentLabel = (intent: ParseTransactionIntent | null) => {
    if (!intent) return "-";
    return `${intent.charAt(0).toUpperCase()}${intent.slice(1)}`;
  };

  const formatCashbackLabel = (data: QuickAddDraft) => {
    if (!data.cashbackSharePercent && !data.cashbackShareFixed) {
      return "None";
    }
    const percent = data.cashbackSharePercent ?? 0;
    const fixed = data.cashbackShareFixed ?? 0;
    return `${percent}% / ${fixed}`;
  };

  const formatSplitLabel = (data: QuickAddDraft) => {
    const isDebt = data.intent === "lend" || data.intent === "repay";
    if (!isDebt) return "N/A";
    const groupCount = data.group
      ? groupMembers.get(data.group.id)?.length ?? 0
      : 0;
    if (data.splitBill) {
      return data.group ? `On (Group - ${groupCount} people)` : "On";
    }
    return "Off";
  };

  const getPromptForStep = (currentStep: WizardStep) => {
    if (currentStep === "account") {
      if (draft.sourceAccount && !draft.sourceAccountConfirmed) {
        const list =
          accountCandidates.length > 1
            ? ` Choose: ${formatAccountList(accountCandidates)}`
            : "";
        return `Use account "${draft.sourceAccount.name}"? Reply yes to confirm, or pick another.${list}`;
      }
      if (accountCandidates.length > 1) {
        return `Which account? Reply with a number or name: ${formatAccountList(accountCandidates)}`;
      }
      return stepPrompts.account;
    }
    if (currentStep === "transfer_destination" && destinationCandidates.length > 1) {
      return `Which destination account? Reply with a number or name: ${formatAccountList(destinationCandidates)}`;
    }
    return stepPrompts[currentStep];
  };

  useEffect(() => {
    if (!open) return;
    if (lastPromptedStep.current === step) return;
    if (step === "review") return;
    setMessages((prev) => [
      ...prev,
      { id: createId(), role: "assistant", content: getPromptForStep(step) },
    ]);
    lastPromptedStep.current = step;
  }, [
    open,
    step,
    draft.sourceAccount,
    draft.sourceAccountConfirmed,
    accountCandidates,
    destinationCandidates,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && !isMinimized) {
      setUnreadCount(0);
    }
  }, [open, isMinimized]);


  const loadTemplates = async () => {
    setIsTemplateLoading(true);
    setTemplateError(null);
    try {
      const response = await fetch("/api/ai/templates");
      if (!response.ok) {
        throw new Error("Failed to load templates");
      }
      const data = (await response.json()) as { templates: QuickAddTemplate[] };
      setTemplates(data.templates ?? []);
    } catch (error) {
      setTemplateError("Failed to load templates.");
    } finally {
      setIsTemplateLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadTemplates();
  }, [open]);

  // Smart context detection: pre-populate from URL
  // Smart context detection: pre-populate from URL
  useEffect(() => {
    if (!open) return;

    // If contextPerson is provided directly (e.g. from props), use it
    if (contextPerson && !draft.intent && !draft.people.length) {
      setDraft(prev => {
        const next = {
          ...prev,
          intent: "lend" as ParseTransactionIntent,
          people: [contextPerson],
        };
        // Also pre-calculate cashback/mode immediately
        const withDefaults = applyDefaultCashbackForPeople(next, { groupMembers, people: individualPeople });
        withDefaults.cashbackMode = resolveCashbackMode(withDefaults.sourceAccount, withDefaults.cashbackSharePercent, withDefaults.cashbackShareFixed);
        return withDefaults;
      });
      appendMessage("assistant", `Detected you're on ${contextPerson.name}'s page. Setting type to Lend.`);
      // We can skip the 'type' step if we already have intent
      return;
    }

    if (!pathname) return;
    const personMatch = pathname.match(/\/people\/([^\/\?]+)/);
    if (personMatch?.[1] && people.length > 0) {
      const personId = personMatch[1];
      const person = people.find(p => p.id === personId);
      if (person && !draft.intent && !draft.people.length) {
        setDraft(prev => ({
          ...prev,
          intent: "lend",
          people: [person],
        }));
        appendMessage("assistant", `Detected you're on ${person.name}'s page. Setting type to Lend.`);
      }
    }
  }, [pathname, open, people, contextPerson]); // Added contextPerson dependency

  const resetWizard = () => {
    setDraft(buildInitialDraft());
    setMessages([
      {
        id: createId(),
        role: "assistant",
        content: stepPrompts.input,
      },
    ]);
    setStep("input");
    setInputValue("");
    setParseError(null);
    setSubmitError(null);
    setTemplateError(null);
    setTemplateName("");
    setAccountCandidates([]);
    setAccountQuery("");
    setDestinationCandidates([]);
    setReviewEditField(null);
    setReviewEditValue("");
    setReviewEditSecondaryValue("");
    setReviewAccountFilter("all");
    setIsMinimized(false);
    setUnreadCount(0);
    historyRef.current = [];
    lastPromptedStep.current = "input";
  };

  const openWizard = (forceReset = false) => {
    if (forceReset || messages.length === 0) {
      resetWizard();
    }
    setOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const closeChat = () => {
    setOpen(false);
    setIsMinimized(false);
  };

  const appendMessage = (role: "assistant" | "user", content: string) => {
    setMessages((prev) => [...prev, { id: createId(), role, content }]);
    if (isMinimized || !open) {
      setUnreadCount((prev) => prev + 1);
    }
  };

  const computeNextStep = (nextDraft: QuickAddDraft): WizardStep => {
    if (!nextDraft.intent) return "type";
    if (!nextDraft.amount) return "amount";
    if (nextDraft.intent === "lend" || nextDraft.intent === "repay") {
      const hasContextPerson = Boolean(contextPerson);
      if (!nextDraft.group && nextDraft.people.length === 0 && !hasContextPerson) {
        return "who";
      }
    }
    if (!nextDraft.sourceAccount || !nextDraft.sourceAccountConfirmed) return "account";
    if (nextDraft.intent === "transfer" && !nextDraft.destinationAccount) {
      return "transfer_destination";
    }
    if (
      (nextDraft.intent === "lend" || nextDraft.intent === "repay") &&
      !nextDraft.splitBillConfirmed
    ) {
      return "split_confirm";
    }
    return "review";
  };

  const goToStep = (nextStep: WizardStep) => {
    historyRef.current.push(step);
    setStep(nextStep);
    setInputValue("");
  };

  const applyParsedResult = (result: ParsedTransaction) => {
    const intent = result.intent;
    const groupCandidate =
      findByName(groups, result.group_name ?? undefined) ?? null;
    const resolvedPeople = dedupeById(
      result.people
        .map((ref) => findByName(individualPeople, ref.name))
        .filter((person): person is Person => Boolean(person)),
    );
    const group =
      groupCandidate &&
        resolvedPeople.some(
          (person) => normalizeName(person.name) === normalizeName(groupCandidate.name),
        )
        ? null
        : groupCandidate;
    const sourceAccount =
      findByName(accounts, result.source_account_name ?? undefined) ?? null;
    const destinationAccount =
      findByName(accounts, result.debt_account_name ?? undefined) ?? null;
    const occurredAt = result.occurred_at
      ? new Date(`${result.occurred_at}T12:00:00`)
      : null;
    const shop =
      findByName(shops, result.shop_name ?? undefined) ??
      getDefaultShop(shops);

    const splitBill =
      group
        ? true
        : result.split_bill ?? (resolvedPeople.length > 1 ? true : false);
    const splitBillConfirmed =
      group || result.split_bill !== null ? true : resolvedPeople.length <= 1;

    const cashbackSharePercent =
      result.cashback_share_percent ?? draft.cashbackSharePercent ?? null;
    const cashbackShareFixed =
      result.cashback_share_fixed ?? draft.cashbackShareFixed ?? null;

    let nextDraft: QuickAddDraft = {
      ...draft,
      intent,
      amount: result.amount ?? draft.amount,
      group,
      people: group ? [] : resolvedPeople,
      sourceAccount,
      sourceAccountConfirmed: sourceAccount ? false : draft.sourceAccountConfirmed,
      destinationAccount,
      occurredAt: occurredAt ?? draft.occurredAt ?? new Date(),
      note: result.note ?? draft.note ?? "",
      splitBill,
      splitBillConfirmed,
      shop: shop ?? null,
      category: findByName(categories, result.category_name ?? undefined),
      cashbackSharePercent,
      cashbackShareFixed,
      cashbackMode: result.cashback_mode ?? null,
    };

    nextDraft = applyContextPerson(nextDraft, contextPerson);
    const withDefault = applyDefaultCashbackForPeople(nextDraft, {
      groupMembers,
      people: individualPeople,
    });
    const resolvedMode =
      result.cashback_mode ??
      resolveCashbackMode(
        sourceAccount,
        withDefault.cashbackSharePercent,
        withDefault.cashbackShareFixed,
      );

    return {
      ...withDefault,
      cashbackMode: resolvedMode,
    };
  };

  const handleParseInput = async (text: string) => {
    setIsParsing(true);
    setParseError(null);
    try {
      const response = await fetch("/api/ai/parse-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          context: {
            people: individualPeople.map((person) => ({
              id: person.id,
              name: person.name,
            })),
            groups: groups.map((group) => ({
              id: group.id,
              name: group.name,
            })),
            accounts: accounts.map((account) => ({
              id: account.id,
              name: account.name,
            })),
            categories: categories.map((category) => ({
              id: category.id,
              name: category.name,
            })),
            shops: shops.map((shop) => ({
              id: shop.id,
              name: shop.name,
            })),
          },
        }),
      });
      if (!response.ok) {
        throw new Error("Unable to parse");
      }
      const data = (await response.json()) as { result: ParsedTransaction };
      let nextDraft: QuickAddDraft = applyParsedResult(data.result);

      // FIX: Preserve Context if AI returned no intent
      if (!nextDraft.intent && contextPerson) {
        // Force lend if context exists and no other intent detected
        // Logic: You are on a person page, default to DEBT/LEND
        nextDraft.intent = "lend";
        if (nextDraft.people.length === 0) {
          nextDraft.people = [contextPerson];
        }

        // Default Split Bill to True for Lend Context
        nextDraft.splitBill = true;

        appendMessage("assistant", `Keeping context: Lend to ${contextPerson.name}.`);

        nextDraft = applyDefaultCashbackForPeople(nextDraft, {
          groupMembers,
          people: individualPeople,
        });
        nextDraft.cashbackMode = resolveCashbackMode(
          nextDraft.sourceAccount,
          nextDraft.cashbackSharePercent,
          nextDraft.cashbackShareFixed,
        );
      } else if (!nextDraft.intent && contextPerson) {
        // Fallback if logic needs to check text "keywords" manually (kept from original code just in case)
        // But the block above should cover it. 
        // Merging logic:
        const normalizedText = normalizeName(text);
        const shouldLend =
          normalizedText.includes("back") ||
          normalizedText.includes("cho") ||
          normalizedText.includes("muon");
        if (shouldLend) {
          nextDraft = applyContextPerson(
            { ...nextDraft, intent: "lend" },
            contextPerson,
          );
          nextDraft = applyDefaultCashbackForPeople(nextDraft, {
            groupMembers,
            people: individualPeople,
          });
          nextDraft.cashbackMode = resolveCashbackMode(
            nextDraft.sourceAccount,
            nextDraft.cashbackSharePercent,
            nextDraft.cashbackShareFixed,
          );
        }
      }

      const accountLookupText =
        nextDraft.sourceAccount?.name ?? text;

      const lookupList = (nextDraft.intent === 'lend' || nextDraft.intent === 'repay')
        ? lendSelectableAccounts
        : selectableAccounts;

      const candidates = findAccountCandidates(accountLookupText, lookupList);
      if (candidates.length > 1) {
        setAccountCandidates(candidates);
      } else {
        setAccountCandidates([]);
      }
      setAccountQuery(accountLookupText);
      const nextStep = computeNextStep(nextDraft);
      setDraft(nextDraft);
      goToStep(nextStep);
    } catch (error) {
      setParseError("Parsing failed. We'll continue manually.");
      goToStep("type");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmitInput = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (trimmed) {
      appendMessage("user", trimmed);
    }

    if (step === "input") {
      if (!trimmed) return;
      const normalizedInput = normalizeName(trimmed);
      if (normalizedInput === "template list" || normalizedInput === "templates") {
        if (!templates.length) {
          appendMessage("assistant", "No templates yet.");
        } else {
          appendMessage(
            "assistant",
            `Templates: ${templates.map((tpl) => tpl.name).join(", ")}`,
          );
        }
        setInputValue("");
        return;
      }

      if (normalizedInput.startsWith("template ")) {
        const templateName = normalizedInput.replace(/^template\s+/, "").trim();
        const matched = templates.find(
          (tpl) => normalizeName(tpl.name) === templateName,
        );
        if (!matched) {
          appendMessage("assistant", "Template not found.");
          return;
        }
        applyTemplate(matched);
        return;
      }

      const matchedTemplate = templates.find(
        (tpl) => normalizeName(tpl.name) === normalizedInput,
      );
      if (matchedTemplate) {
        applyTemplate(matchedTemplate);
        return;
      }
      setRecentPrompts((prev) => {
        const next = [
          trimmed,
          ...prev.filter((prompt) => normalizeName(prompt) !== normalizedInput),
        ];
        return next.slice(0, 3);
      });
      await handleParseInput(trimmed);
      setInputValue("");
      return;
    }

    if (step === "type") {
      const intent = intentFromInput(trimmed);
      if (!intent) {
        appendMessage("assistant", "Please choose a valid type.");
        return;
      }
      const nextDraft = { ...draft, intent };
      setDraft(nextDraft);
      goToStep(computeNextStep(nextDraft));
      setInputValue("");
      return;
    }

    if (step === "amount") {
      const amount = parseAmount(trimmed);
      if (!amount) {
        appendMessage("assistant", "Please enter a valid amount.");
        return;
      }
      const nextDraft = {
        ...draft,
        amount,
        cashbackMode: resolveCashbackMode(
          draft.sourceAccount,
          draft.cashbackSharePercent,
          draft.cashbackShareFixed,
        ),
      };
      setDraft(nextDraft);
      goToStep(computeNextStep(nextDraft));
      setInputValue("");
      return;
    }

    if (step === "who") {
      const parts = splitPeopleInput(trimmed);
      if (parts.length === 0) {
        appendMessage("assistant", "Please enter a person or group.");
        return;
      }
      const matchedGroup = parts
        .map((part) => findByName(groups, part))
        .find(Boolean) as Person | undefined;
      if (matchedGroup) {
        let nextDraft: QuickAddDraft = {
          ...draft,
          group: matchedGroup,
          people: [],
          splitBill: true,
          splitBillConfirmed: true,
        };
        nextDraft = applyDefaultCashbackForPeople(nextDraft, {
          groupMembers,
          people: individualPeople,
        });
        nextDraft.cashbackMode = resolveCashbackMode(
          nextDraft.sourceAccount,
          nextDraft.cashbackSharePercent,
          nextDraft.cashbackShareFixed,
        );
        setDraft(nextDraft);
        goToStep(computeNextStep(nextDraft));
        setInputValue("");
        return;
      }
      const matchedPeople = dedupeById(
        parts
          .map((part) => findByName(individualPeople, part))
          .filter((person): person is Person => Boolean(person)),
      );
      if (matchedPeople.length === 0) {
        appendMessage("assistant", "I couldn't find those people.");
        return;
      }
      if (draft.splitBill === false && matchedPeople.length > 1) {
        appendMessage("assistant", "Choose a single person for no split.");
        return;
      }
      let nextDraft: QuickAddDraft = {
        ...draft,
        people: matchedPeople,
        group: null,
        splitBill:
          matchedPeople.length > 1
            ? true
            : draft.splitBill === false
              ? false
              : false,
        splitBillConfirmed:
          matchedPeople.length > 1 ? false : true,
      };
      nextDraft = applyDefaultCashbackForPeople(nextDraft, {
        groupMembers,
        people: individualPeople,
      });
      nextDraft.cashbackMode = resolveCashbackMode(
        nextDraft.sourceAccount,
        nextDraft.cashbackSharePercent,
        nextDraft.cashbackShareFixed,
      );
      setDraft(nextDraft);
      goToStep(computeNextStep(nextDraft));
      setInputValue("");
      return;
    }

    if (step === "account") {
      const normalized = normalizeName(trimmed);
      const isConfirmAnswer = ["yes", "y", "ok", "okay", "no", "n", "change", "different"].includes(normalized);
      if (!isConfirmAnswer) {
        // IMPROVEMENT: Use extracted keyword for search query instead of full text
        // This handles "voucher 300k, vib" -> searching "vib"
        const keyword = extractAccountKeyword(trimmed);
        setAccountQuery(keyword);
      }
      // Extract keyword from full prompt for better matching
      const searchKeyword = extractAccountKeyword(trimmed);
      const lookupList = isDebtIntent ? lendSelectableAccounts : selectableAccounts;
      const candidates =
        accountCandidates.length > 0
          ? accountCandidates
          : findAccountCandidates(searchKeyword, lookupList);
      if (candidates.length > 1 && accountCandidates.length === 0) {
        setAccountCandidates(candidates);
        appendMessage("assistant", "Multiple accounts match. Please choose one.");
        return;
      }
      if (draft.sourceAccount && !draft.sourceAccountConfirmed) {
        if (["yes", "y", "ok", "okay"].includes(normalized)) {
          const nextDraft = { ...draft, sourceAccountConfirmed: true };
          setDraft(nextDraft);
          setAccountCandidates([]);
          goToStep(computeNextStep(nextDraft));
          setInputValue("");
          return;
        }
        if (["no", "n", "change", "different"].includes(normalized)) {
          const nextDraft = {
            ...draft,
            sourceAccount: null,
            sourceAccountConfirmed: false,
          };
          setDraft(nextDraft);
          setInputValue("");
          lastPromptedStep.current = null;
          appendMessage("assistant", "Okay, pick another account.");
          return;
        }
      }
      const account =
        candidates.length === 1
          ? candidates[0]
          : pickCandidateByIndex(trimmed, candidates) ?? findByName(candidates, trimmed);
      if (!account) {
        if (draft.sourceAccount && !draft.sourceAccountConfirmed) {
          appendMessage(
            "assistant",
            "Reply yes to confirm, or choose another account.",
          );
        } else {
          appendMessage("assistant", "I couldn't find that account.");
        }
        return;
      }
      setAccountCandidates([]);
      const nextDraft = { ...draft, sourceAccount: account };
      nextDraft.sourceAccountConfirmed = true;
      nextDraft.cashbackMode = resolveCashbackMode(
        account,
        nextDraft.cashbackSharePercent,
        nextDraft.cashbackShareFixed,
      );
      setDraft(nextDraft);
      goToStep(computeNextStep(nextDraft));
      setInputValue("");
      return;
    }

    if (step === "transfer_destination") {
      const candidates =
        destinationCandidates.length > 0
          ? destinationCandidates
          : findAccountCandidates(trimmed, selectableAccounts);
      if (candidates.length > 1 && destinationCandidates.length === 0) {
        setDestinationCandidates(candidates);
        appendMessage(
          "assistant",
          `Multiple destinations match: ${candidates
            .map((account) => account.name)
            .join(", ")}.`,
        );
        return;
      }
      const account =
        candidates.length === 1
          ? candidates[0]
          : pickCandidateByIndex(trimmed, candidates) ?? findByName(candidates, trimmed);
      if (!account) {
        appendMessage("assistant", "I couldn't find that account.");
        return;
      }
      if (draft.sourceAccount && account.id === draft.sourceAccount.id) {
        appendMessage(
          "assistant",
          "Destination must be different from the source account.",
        );
        return;
      }
      setDestinationCandidates([]);
      const nextDraft = { ...draft, destinationAccount: account };
      setDraft(nextDraft);
      goToStep(computeNextStep(nextDraft));
      setInputValue("");
      return;
    }

    if (step === "split_confirm") {
      const normalized = trimmed.toLowerCase();
      if (["yes", "y", "split", "on"].includes(normalized)) {
        handleSplitConfirm(true);
        setInputValue("");
        return;
      }
      if (["no", "n", "off", "no split"].includes(normalized)) {
        handleSplitConfirm(false);
        setInputValue("");
        return;
      }
      appendMessage("assistant", "Please answer yes or no.");
      return;
    }

    if (step === "review") {
      const normalized = normalizeName(trimmed);
      const noteMatch = trimmed.match(/^(note|ghi\s*chu)[:\-\s]+(.+)$/i);
      const amountValue = extractAmountFromText(trimmed);
      if (
        amountValue &&
        (normalized.includes("amount") || normalized.includes("so tien") || normalized.startsWith("sua"))
      ) {
        const nextDraft = { ...draft, amount: amountValue };
        setDraft(nextDraft);
        appendMessage("assistant", `Updated amount to ${amountValue.toLocaleString()}.`);
        setInputValue("");
        return;
      }
      if (noteMatch && noteMatch[2]) {
        const nextNote = noteMatch[2].trim();
        const nextDraft = { ...draft, note: nextNote };
        setDraft(nextDraft);
        appendMessage("assistant", "Updated note.");
        setInputValue("");
        return;
      }
      if (
        normalized.includes("account") ||
        normalized.includes("the") ||
        normalized.includes("card")
      ) {
        const candidates = findAccountCandidates(trimmed, selectableAccounts);
        if (candidates.length === 0) {
          appendMessage("assistant", "I couldn't find that account.");
          return;
        }
        if (candidates.length > 1) {
          setAccountCandidates(candidates);
          setAccountQuery(trimmed);
          appendMessage("assistant", "Multiple accounts match. Please choose one.");
          goToStep("account");
          setInputValue("");
          return;
        }
        const account = candidates[0];
        const nextDraft = {
          ...draft,
          sourceAccount: account,
          sourceAccountConfirmed: true,
          cashbackMode: resolveCashbackMode(
            account,
            draft.cashbackSharePercent,
            draft.cashbackShareFixed,
          ),
        };
        setDraft(nextDraft);
        appendMessage("assistant", `Updated account to ${account.name}.`);
        setInputValue("");
        return;
      }
      appendMessage(
        "assistant",
        "You can edit amount, note, or account here. Example: amount 200k, note Zakka, or account Vib.",
      );
      return;
    }
  };

  const handleSplitConfirm = (value: boolean) => {
    if (!isDebtIntent) return;
    if (draft.group && !value) {
      appendMessage("assistant", "Groups must use split bill.");
      return;
    }
    if (!value && draft.people.length > 1) {
      appendMessage("assistant", "Choose a single person for no split.");
      const nextDraft = { ...draft, splitBill: false, splitBillConfirmed: false };
      setDraft(nextDraft);
      goToStep("who");
      return;
    }
    const nextDraft = { ...draft, splitBill: value, splitBillConfirmed: true };
    setDraft(nextDraft);
    goToStep(computeNextStep(nextDraft));
  };

  const applyTemplate = (template: QuickAddTemplate) => {
    const payload = template.payload ?? {};
    const sourceAccount =
      accounts.find((account) => account.id === payload.source_account_id) ?? null;
    const destinationAccount =
      accounts.find((account) => account.id === payload.destination_account_id) ??
      null;
    const group =
      payload.group_id
        ? groups.find((item) => item.id === payload.group_id) ?? null
        : null;
    const resolvedPeople = (payload.person_ids ?? [])
      .map((id) => individualPeople.find((person) => person.id === id))
      .filter((person): person is Person => Boolean(person));
    const shop =
      payload.shop_id
        ? shops.find((item) => item.id === payload.shop_id) ?? null
        : null;
    const category =
      payload.category_id
        ? categories.find((item) => item.id === payload.category_id) ?? null
        : null;

    let nextDraft: QuickAddDraft = {
      ...buildInitialDraft(),
      intent: payload.intent ?? null,
      amount: null,
      group,
      people: group ? [] : resolvedPeople,
      sourceAccount,
      sourceAccountConfirmed: Boolean(sourceAccount),
      destinationAccount,
      note: payload.note ?? "",
      splitBill:
        payload.split_bill ?? (group ? true : resolvedPeople.length > 1 ? true : null),
      splitBillConfirmed:
        payload.split_bill !== null || Boolean(group) || resolvedPeople.length > 1,
      shop,
      category,
      cashbackSharePercent: payload.cashback_share_percent ?? null,
      cashbackShareFixed: payload.cashback_share_fixed ?? null,
      cashbackMode: payload.cashback_mode ?? null,
    };

    nextDraft = applyContextPerson(nextDraft, contextPerson);
    nextDraft = applyDefaultCashbackForPeople(nextDraft, {
      groupMembers,
      people: individualPeople,
    });
    nextDraft.cashbackMode =
      payload.cashback_mode ??
      resolveCashbackMode(
        sourceAccount,
        nextDraft.cashbackSharePercent,
        nextDraft.cashbackShareFixed,
      );

    setDraft(nextDraft);
    setInputValue("");
    setAccountCandidates([]);
    setAccountQuery(sourceAccount?.name ?? "");
    setDestinationCandidates([]);
    appendMessage("assistant", `Template "${template.name}" loaded.`);
    lastPromptedStep.current = null;
    setStep(computeNextStep(nextDraft));
  };

  const saveTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;
    setIsSavingTemplate(true);
    setTemplateError(null);
    try {
      const payload: QuickAddTemplatePayload = {
        intent: draft.intent ?? null,
        source_account_id: draft.sourceAccount?.id ?? null,
        destination_account_id: draft.destinationAccount?.id ?? null,
        person_ids: draft.people.map((person) => person.id),
        group_id: draft.group?.id ?? null,
        category_id: draft.category?.id ?? null,
        shop_id: draft.shop?.id ?? null,
        note: draft.note ?? "",
        split_bill: draft.splitBill ?? null,
        cashback_share_percent: draft.cashbackSharePercent ?? null,
        cashback_share_fixed: draft.cashbackShareFixed ?? null,
        cashback_mode: draft.cashbackMode ?? null,
      };
      console.log("[QuickAddChat] Saving template:", { name, payload });
      const response = await fetch("/api/ai/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, payload }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[QuickAddChat] Template save failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData?.error || `Failed to save template (${response.status})`);
      }
      const result = await response.json();
      console.log("[QuickAddChat] Template saved successfully:", result);
      await loadTemplates();
      setTemplateName("");
      appendMessage("assistant", `Template "${name}" saved.`);
    } catch (error) {
      console.error("[QuickAddChat] Template save error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save template.";
      setTemplateError(errorMessage);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const submitNow = async () => {
    if (isSubmittingNow) return;
    setSubmitError(null);

    if (!draft.intent) {
      setSubmitError("Select a transaction type first.");
      return;
    }
    if (!draft.amount || draft.amount <= 0) {
      setSubmitError("Add a valid amount first.");
      return;
    }
    if (!draft.sourceAccount) {
      setSubmitError("Choose an account first.");
      return;
    }
    if (draft.intent === "transfer" && !draft.destinationAccount) {
      setSubmitError("Choose a destination account.");
      return;
    }
    if (isDebtIntent && !draft.group && draft.people.length === 0) {
      setSubmitError("Pick a person or group.");
      return;
    }

    const type: TransactionFormValues["type"] =
      draft.intent === "lend"
        ? "debt"
        : draft.intent === "repay"
          ? "repayment"
          : draft.intent;

    let personIds = draft.people.map((person) => person.id);
    const groupId = draft.group?.id ?? null;
    if (groupId) {
      const members = groupMembers.get(groupId) ?? [];
      const owner = people.find((person) => person.is_owner);
      let memberIds = members.map((member) => member.id);
      if (type === "debt" && owner && !memberIds.includes(owner.id)) {
        memberIds = [...memberIds, owner.id];
      }
      if (type === "repayment" && owner) {
        memberIds = memberIds.filter((id) => id !== owner.id);
      }
      personIds = memberIds;
    }

    const splitEnabled =
      (type === "debt" || type === "repayment") &&
      draft.splitBill === true &&
      personIds.length > 1;

    const cashbackMode =
      draft.cashbackMode ??
      resolveCashbackMode(
        draft.sourceAccount,
        draft.cashbackSharePercent,
        draft.cashbackShareFixed,
      );

    const payload = {
      type,
      amount: draft.amount,
      occurred_at: (draft.occurredAt ?? new Date()).toISOString(),
      note: draft.note ?? "",
      source_account_id: draft.sourceAccount.id,
      destination_account_id:
        type === "transfer" ? draft.destinationAccount?.id ?? null : null,
      person_ids: personIds,
      group_id: groupId,
      split_bill: splitEnabled,
      category_id: draft.category?.id ?? null,
      shop_id: draft.shop?.id ?? null,
      cashback_share_percent:
        draft.cashbackSharePercent !== null
          ? draft.cashbackSharePercent / 100
          : null,
      cashback_share_fixed: draft.cashbackShareFixed ?? null,
      cashback_mode: cashbackMode,
    };

    setIsSubmittingNow(true);
    try {
      const response = await fetch("/api/transactions/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Failed to save transaction.");
      }
      const data = (await response.json().catch(() => null)) as
        | { id?: string }
        | null;
      const createdId = data?.id ?? null;
      appendMessage("assistant", "Done! Transaction saved.");
      if (createdId) {
        router.push(`/transactions/temp-${createdId}`);
      } else {
        router.refresh();
      }
      setDraft(buildInitialDraft());
      setStep("input");
      setInputValue("");
      setAccountCandidates([]);
      setDestinationCandidates([]);
      setReviewEditField(null);
      setReviewEditValue("");
      setReviewEditSecondaryValue("");
      historyRef.current = [];
      lastPromptedStep.current = null;
    } catch (error: any) {
      setSubmitError(error?.message ?? "Failed to save transaction.");
    } finally {
      setIsSubmittingNow(false);
    }
  };

  const confirmAndOpenForm = () => {
    if (!draft.intent || !draft.amount) return;
    const occurredAt = draft.occurredAt ?? new Date();
    const tag = generateTag(occurredAt);
    const type: TransactionFormValues["type"] =
      draft.intent === "lend"
        ? "debt"
        : draft.intent === "repay"
          ? "repayment"
          : draft.intent;
    const cashbackMode =
      draft.cashbackMode ??
      resolveCashbackMode(
        draft.sourceAccount,
        draft.cashbackSharePercent,
        draft.cashbackShareFixed,
      );
    const splitEnabled = draft.splitBill === true && (type === "debt" || type === "repayment");
    const initialValues: QuickAddInitialValues = {
      type,
      amount: draft.amount,
      note: draft.note ?? "",
      occurred_at: occurredAt,
      tag,
      source_account_id: draft.sourceAccount?.id,
      debt_account_id:
        type === "transfer" ? draft.destinationAccount?.id : undefined,
      category_id: draft.category?.id ?? undefined,
      shop_id: draft.shop?.id ?? undefined,
      cashback_share_percent:
        draft.cashbackSharePercent !== null
          ? draft.cashbackSharePercent / 100
          : undefined,
      cashback_share_fixed: draft.cashbackShareFixed ?? undefined,
      cashback_mode: cashbackMode ?? undefined,
      person_id:
        type === "debt" || type === "repayment"
          ? splitEnabled
            ? undefined
            : draft.people[0]?.id
          : undefined,
      split_bill: splitEnabled,
    };
    if (splitEnabled) {
      if (draft.group) {
        initialValues.split_group_id = draft.group.id;
      } else if (draft.people.length > 0) {
        initialValues.split_person_ids = draft.people.map((person) => person.id);
      }
    }
    setReviewValues(initialValues);
    setOpen(false);
    setTransactionDialogOpen(true);
  };

  const closeReviewEdit = () => {
    setReviewEditField(null);
    setReviewEditValue("");
    setReviewEditSecondaryValue("");
  };

  const startReviewEdit = (field: ReviewEditField) => {
    setSubmitError(null);
    setReviewEditField(field);
    setReviewEditValue("");
    setReviewEditSecondaryValue("");
    if (field === "amount") {
      setReviewEditValue(draft.amount ? `${draft.amount}` : "");
      return;
    }
    if (field === "date") {
      setReviewEditValue(
        draft.occurredAt ? draft.occurredAt.toISOString().slice(0, 10) : "",
      );
      return;
    }
    if (field === "note") {
      setReviewEditValue(draft.note ?? "");
      return;
    }
    if (field === "back") {
      setReviewEditValue(
        draft.cashbackSharePercent !== null ? `${draft.cashbackSharePercent}` : "",
      );
      setReviewEditSecondaryValue(
        draft.cashbackShareFixed !== null ? `${draft.cashbackShareFixed}` : "",
      );
    }
  };

  const commitAmountEdit = () => {
    const parsed = parseAmount(reviewEditValue);
    if (!parsed || parsed <= 0) {
      setSubmitError("Amount must be a positive number.");
      return;
    }
    setDraft({ ...draft, amount: parsed });
    closeReviewEdit();
  };

  const commitDateEdit = () => {
    if (!reviewEditValue) {
      setSubmitError("Pick a valid date.");
      return;
    }
    const nextDate = new Date(`${reviewEditValue}T12:00:00`);
    if (Number.isNaN(nextDate.getTime())) {
      setSubmitError("Pick a valid date.");
      return;
    }
    setDraft({ ...draft, occurredAt: nextDate });
    closeReviewEdit();
  };

  const commitNoteEdit = () => {
    setDraft({ ...draft, note: reviewEditValue });
    closeReviewEdit();
  };

  const commitBackEdit = () => {
    const percentValue =
      reviewEditValue.trim() === ""
        ? null
        : Number(reviewEditValue.trim());
    const fixedValue =
      reviewEditSecondaryValue.trim() === ""
        ? null
        : Number(reviewEditSecondaryValue.trim());
    const percent = Number.isFinite(percentValue) ? percentValue : null;
    const fixed = Number.isFinite(fixedValue) ? fixedValue : null;
    const nextDraft = {
      ...draft,
      cashbackSharePercent: percent,
      cashbackShareFixed: fixed,
      cashbackMode: resolveCashbackMode(draft.sourceAccount, percent, fixed),
    };
    setDraft(nextDraft);
    closeReviewEdit();
  };

  const handleReviewAccountChange = (value?: string) => {
    if (!value) return;
    const account = selectableAccounts.find((item) => item.id === value);
    if (!account) return;
    const nextDraft = {
      ...draft,
      sourceAccount: account,
      sourceAccountConfirmed: true,
      cashbackMode: resolveCashbackMode(
        account,
        draft.cashbackSharePercent,
        draft.cashbackShareFixed,
      ),
    };
    setDraft(nextDraft);
    closeReviewEdit();
  };

  const handleReviewDestinationChange = (value?: string) => {
    if (!value) return;
    const account = selectableAccounts.find((item) => item.id === value);
    if (!account) return;
    if (draft.sourceAccount && account.id === draft.sourceAccount.id) {
      setSubmitError("Destination must be different from the source account.");
      return;
    }
    setDraft({ ...draft, destinationAccount: account });
    closeReviewEdit();
  };

  const handleReviewWhoChange = (value?: string) => {
    if (!value) return;
    const group = groups.find((item) => item.id === value);
    if (group) {
      let nextDraft: QuickAddDraft = {
        ...draft,
        group,
        people: [],
        splitBill: true,
        splitBillConfirmed: true,
      };
      nextDraft = applyDefaultCashbackForPeople(nextDraft, {
        groupMembers,
        people: individualPeople,
      });
      nextDraft.cashbackMode = resolveCashbackMode(
        nextDraft.sourceAccount,
        nextDraft.cashbackSharePercent,
        nextDraft.cashbackShareFixed,
      );
      setDraft(nextDraft);
      closeReviewEdit();
      return;
    }
    const person = individualPeople.find((item) => item.id === value);
    if (!person) return;
    let nextDraft: QuickAddDraft = {
      ...draft,
      group: null,
      people: [person],
      splitBill: false,
      splitBillConfirmed: true,
    };
    nextDraft = applyDefaultCashbackForPeople(nextDraft, {
      groupMembers,
      people: individualPeople,
    });
    nextDraft.cashbackMode = resolveCashbackMode(
      nextDraft.sourceAccount,
      nextDraft.cashbackSharePercent,
      nextDraft.cashbackShareFixed,
    );
    setDraft(nextDraft);
    closeReviewEdit();
  };

  const handleReviewCategoryChange = (value?: string) => {
    if (!value) return;
    const category = categories.find((item) => item.id === value) ?? null;
    setDraft({ ...draft, category });
    closeReviewEdit();
  };

  const handleReviewShopChange = (value?: string) => {
    if (!value) return;
    const shop = shops.find((item) => item.id === value) ?? null;
    setDraft({ ...draft, shop });
    closeReviewEdit();
  };

  const handleReviewTypeChange = (intent: ParseTransactionIntent) => {
    let nextDraft: QuickAddDraft = { ...draft, intent };
    nextDraft = applyContextPerson(nextDraft, contextPerson);
    nextDraft = applyDefaultCashbackForPeople(nextDraft, {
      groupMembers,
      people: individualPeople,
    });
    nextDraft.cashbackMode = resolveCashbackMode(
      nextDraft.sourceAccount,
      nextDraft.cashbackSharePercent,
      nextDraft.cashbackShareFixed,
    );
    setDraft(nextDraft);
    closeReviewEdit();
  };

  const handleReviewSplitChange = (value: boolean) => {
    if (draft.group && !value) {
      setSubmitError("Groups must use split bill.");
      return;
    }
    if (!value && draft.people.length > 1) {
      setSubmitError("Choose a single person for no split.");
      return;
    }
    setDraft({ ...draft, splitBill: value, splitBillConfirmed: true });
    closeReviewEdit();
  };

  const handleBack = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setStep(prev);
  };

  const renderQuickPicks = () => {
    if (step === "input") {
      if (isTemplateLoading) {
        return (
          <div className="text-xs text-slate-500">
            Loading templates...
          </div>
        );
      }
      return (
        <div className="space-y-2">
          {templates.length > 0 && (
            <>
              <div className="text-xs font-semibold text-slate-500">
                Templates
              </div>
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                    onClick={() => {
                      appendMessage("user", template.name);
                      applyTemplate(template);
                    }}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {recentPrompts.length > 0 && (
            <>
              <div className="text-xs font-semibold text-slate-500">
                Recent prompts
              </div>
              <div className="flex flex-wrap gap-2">
                {recentPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                    onClick={() => {
                      appendMessage("user", prompt);
                      void handleParseInput(prompt);
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }

    if (step === "type") {
      return (
        <div className="flex flex-wrap gap-2">
          {quickTypeOptions.map((option) => (
            <button
              key={option.intent}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
              onClick={() => {
                appendMessage("user", option.label);
                let nextDraft: QuickAddDraft = { ...draft, intent: option.intent };
                nextDraft = applyContextPerson(nextDraft, contextPerson);
                nextDraft = applyDefaultCashbackForPeople(nextDraft, {
                  groupMembers,
                  people: individualPeople,
                });
                nextDraft.cashbackMode = resolveCashbackMode(
                  nextDraft.sourceAccount,
                  nextDraft.cashbackSharePercent,
                  nextDraft.cashbackShareFixed,
                );
                setDraft(nextDraft);
                goToStep(computeNextStep(nextDraft));
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    }

    if (step === "who") {
      return (
        <div className="space-y-2">
          {recentGroups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recentGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                  onClick={() => {
                    appendMessage("user", group.name);
                    let nextDraft: QuickAddDraft = {
                      ...draft,
                      group,
                      people: [],
                      splitBill: true,
                      splitBillConfirmed: true,
                    };
                    nextDraft = applyDefaultCashbackForPeople(nextDraft, {
                      groupMembers,
                      people: individualPeople,
                    });
                    nextDraft.cashbackMode = resolveCashbackMode(
                      nextDraft.sourceAccount,
                      nextDraft.cashbackSharePercent,
                      nextDraft.cashbackShareFixed,
                    );
                    setDraft(nextDraft);
                    goToStep(computeNextStep(nextDraft));
                  }}
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Search people or groups..."
              className="h-9 pl-9 text-sm"
            />
          </div>
          {inputValue.trim() && (
            <Command className="rounded-lg border border-slate-200">
              <CommandList>
                <CommandEmpty>No results.</CommandEmpty>
                <CommandGroup>
                  {individualPeople
                    .filter((person) =>
                      normalizeName(person.name).includes(normalizeName(inputValue))
                    )
                    .map((person) => (
                      <CommandItem
                        key={person.id}
                        onSelect={() => {
                          appendMessage("user", person.name);
                          let nextDraft: QuickAddDraft = {
                            ...draft,
                            people: [person],
                            group: null,
                            splitBill: false,
                            splitBillConfirmed: true,
                          };
                          nextDraft = applyDefaultCashbackForPeople(nextDraft, {
                            groupMembers,
                            people: individualPeople,
                          });
                          nextDraft.cashbackMode = resolveCashbackMode(
                            nextDraft.sourceAccount,
                            nextDraft.cashbackSharePercent,
                            nextDraft.cashbackShareFixed,
                          );
                          setDraft(nextDraft);
                          goToStep(computeNextStep(nextDraft));
                          setInputValue("");
                        }}
                      >
                        {person.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
          <div className="flex flex-wrap gap-2">
            {recentPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                onClick={() => {
                  appendMessage("user", person.name);
                  let nextDraft: QuickAddDraft = {
                    ...draft,
                    people: [person],
                    group: null,
                    splitBill: false,
                    splitBillConfirmed: true,
                  };
                  nextDraft = applyDefaultCashbackForPeople(nextDraft, {
                    groupMembers,
                    people: individualPeople,
                  });
                  nextDraft.cashbackMode = resolveCashbackMode(
                    nextDraft.sourceAccount,
                    nextDraft.cashbackSharePercent,
                    nextDraft.cashbackShareFixed,
                  );
                  setDraft(nextDraft);
                  goToStep(computeNextStep(nextDraft));
                }}
              >
                {person.name}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === "account") {
      const query = accountQuery.trim();
      const filteredAccounts = query
        ? findAccountCandidates(query, selectableAccounts)
        : accountCandidates.length > 0
          ? accountCandidates
          : recentAccounts;
      const searchInput = (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={accountQuery}
            onChange={(event) => setAccountQuery(event.target.value)}
            placeholder="Search account..."
            className="h-9 pl-9 text-sm"
          />
        </div>
      );
      const quickFilters = vibAccounts.length ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
            onClick={() => {
              setAccountQuery("vib");
              setAccountCandidates(vibAccounts);
            }}
          >
            Vib
          </button>
        </div>
      ) : null;
      const accountList = filteredAccounts.length ? (
        <div className="flex flex-wrap gap-2">
          {filteredAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                account.id === draft.sourceAccount?.id
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700",
              )}
              onClick={() => {
                appendMessage("user", account.name);
                setAccountQuery(account.name);
                const nextDraft = {
                  ...draft,
                  sourceAccount: account,
                  sourceAccountConfirmed: true,
                  cashbackMode: resolveCashbackMode(
                    account,
                    draft.cashbackSharePercent,
                    draft.cashbackShareFixed,
                  ),
                };
                setDraft(nextDraft);
                setAccountCandidates([]);
                goToStep(computeNextStep(nextDraft));
              }}
            >
              {account.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-500">No matching accounts.</div>
      );

      if (draft.sourceAccount && !draft.sourceAccountConfirmed) {
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                onClick={() => {
                  appendMessage("user", "Yes");
                  const nextDraft = { ...draft, sourceAccountConfirmed: true };
                  setDraft(nextDraft);
                  setAccountCandidates([]);
                  setAccountQuery(nextDraft.sourceAccount?.name ?? "");
                  lastPromptedStep.current = null;
                  goToStep(computeNextStep(nextDraft));
                }}
              >
                Yes
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                onClick={() => {
                  appendMessage("user", "Change");
                  const nextDraft = {
                    ...draft,
                    sourceAccount: null,
                    sourceAccountConfirmed: false,
                  };
                  setDraft(nextDraft);
                  setAccountCandidates([]);
                  lastPromptedStep.current = null;
                  appendMessage("assistant", "Okay, pick another account.");
                }}
              >
                Change
              </button>
            </div>
            {searchInput}
            {quickFilters}
            {accountList}
          </div>
        );
      }
      return (
        <div className="space-y-2">
          {searchInput}
          {quickFilters}
          {accountList}
        </div>
      );
    }

    if (step === "transfer_destination") {
      const list = destinationCandidates.length > 0
        ? destinationCandidates
        : recentAccounts.filter((account) => account.id !== draft.sourceAccount?.id);
      return (
        <div className="flex flex-wrap gap-2">
          {list.map((account) => (
            <button
              key={account.id}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
              onClick={() => {
                appendMessage("user", account.name);
                const nextDraft = { ...draft, destinationAccount: account };
                setDestinationCandidates([]);
                setDraft(nextDraft);
                goToStep(computeNextStep(nextDraft));
              }}
            >
              {account.name}
            </button>
          ))}
        </div>
      );
    }

    if (step === "split_confirm") {
      const splitDisabled = Boolean(draft.group);
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              draft.splitBill
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-700",
            )}
            onClick={() => {
              appendMessage("user", "Yes");
              handleSplitConfirm(true);
            }}
          >
            Split
          </button>
          <button
            type="button"
            disabled={splitDisabled}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              !draft.splitBill
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-700",
              splitDisabled && "opacity-50 cursor-not-allowed",
            )}
            onClick={() => {
              appendMessage("user", "No");
              handleSplitConfirm(false);
            }}
          >
            No split
          </button>
        </div>
      );
    }

    return null;
  };

  const renderReview = () => {
    // whoLabel, splitLabel, cashbackLabel removed as unused
    const activePersonValue = draft.group?.id ?? draft.people[0]?.id ?? undefined;

    const renderField = ({
      label,
      children,
      className,
    }: {
      label: string;
      children: ReactNode;
      className?: string;
    }) => (
      <div className={cn("rounded-lg border border-slate-200 bg-white p-2 flex flex-col gap-1", className)}>
        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">
          {label}
        </label>
        {children}
      </div>
    );

    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-white text-sm text-slate-700">
          <div className="grid grid-cols-2 gap-2">
            {/* TYPE */}
            {renderField({
              label: "Type",
              children: (
                <div className="flex flex-wrap gap-1">
                  {quickTypeOptions.map((option) => (
                    <button
                      key={option.intent}
                      type="button"
                      className={cn(
                        "rounded px-2 py-1 text-xs font-semibold transition-colors",
                        draft.intent === option.intent
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                      )}
                      onClick={() => handleReviewTypeChange(option.intent)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ),
              className: "col-span-2",
            })}

            {/* AMOUNT */}
            {renderField({
              label: "Amount",
              children: (
                <Input
                  key={draft.amount} // Force re-render on amount change to update defaultValue
                  defaultValue={draft.amount ? new Intl.NumberFormat("en-US").format(draft.amount) : ""}
                  onBlur={(e) => {
                    const val = e.target.value;
                    const parsed = parseAmount(val);
                    if (parsed) setDraft({ ...draft, amount: parsed });
                    // If invalid, maybe show visual feedback? keeping simple for now
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  className="h-7 px-2 text-sm border-none focus-visible:ring-0 bg-transparent shadow-none p-0"
                  placeholder="e.g. 50k"
                />
              )
            })}

            {/* DATE */}
            {renderField({
              label: "Date",
              children: (
                <Input
                  type="date"
                  defaultValue={draft.occurredAt ? draft.occurredAt.toISOString().slice(0, 10) : ""}
                  onChange={(e) => {
                    const date = new Date(`${e.target.value}T12:00:00`);
                    if (!Number.isNaN(date.getTime())) {
                      setDraft({ ...draft, occurredAt: date });
                    }
                  }}
                  className="h-7 px-2 text-sm border-none focus-visible:ring-0 bg-transparent shadow-none p-0"
                />
              )
            })}

            {/* WHO (Lend only) */}
            {isDebtIntent && renderField({
              label: "Who",
              children: (
                <Combobox
                  groups={personGroups}
                  value={activePersonValue}
                  onValueChange={handleReviewWhoChange}
                  placeholder="Pick a person"
                  inputPlaceholder="Search people..."
                  triggerClassName="h-7 px-2 text-sm border-none bg-transparent justify-between shadow-none p-0 focus:ring-0"
                />
              )
            })}

            {/* ACCOUNT */}
            {renderField({
              label: "Account",
              children: (
                <Combobox
                  items={accountItems}
                  value={draft.sourceAccount?.id}
                  onValueChange={handleReviewAccountChange}
                  placeholder="Account"
                  inputPlaceholder="Search accounts..."
                  triggerClassName="h-7 px-2 text-sm border-none bg-transparent justify-between shadow-none p-0 focus:ring-0"
                  tabs={[
                    {
                      value: "all",
                      label: "All",
                      onClick: () => setReviewAccountFilter("all"),
                      active: reviewAccountFilter === "all",
                    },
                    {
                      value: "vib",
                      label: "Vib",
                      onClick: () => setReviewAccountFilter("vib"),
                      active: reviewAccountFilter === "vib",
                    },
                  ]}
                />
              )
            })}

            {/* DESTINATION (Transfer only) */}
            {draft.intent === "transfer" && renderField({
              label: "To Account",
              children: (
                <Combobox
                  items={accountItems}
                  value={draft.destinationAccount?.id}
                  onValueChange={handleReviewDestinationChange}
                  placeholder="Destination"
                  inputPlaceholder="Search accounts..."
                  triggerClassName="h-7 px-2 text-sm border-none bg-transparent justify-between shadow-none p-0 focus:ring-0"
                />
              )
            })}

            {/* CATEGORY */}
            {renderField({
              label: "Category",
              children: (
                <Combobox
                  items={categoryItems}
                  value={draft.category?.id}
                  onValueChange={handleReviewCategoryChange}
                  placeholder="Category"
                  inputPlaceholder="Search categories..."
                  triggerClassName="h-7 px-2 text-sm border-none bg-transparent justify-between shadow-none p-0 focus:ring-0"
                />
              )
            })}

            {/* SHOP */}
            {renderField({
              label: "Shop",
              children: (
                <Combobox
                  items={shopItems}
                  value={draft.shop?.id}
                  onValueChange={handleReviewShopChange}
                  placeholder="Shop"
                  inputPlaceholder="Search shops..."
                  triggerClassName="h-7 px-2 text-sm border-none bg-transparent justify-between shadow-none p-0 focus:ring-0"
                />
              )
            })}

            {/* NOTE */}
            {renderField({
              label: "Note",
              className: "col-span-2",
              children: (
                <Input
                  defaultValue={draft.note ?? ""}
                  onBlur={(e) => setDraft({ ...draft, note: e.target.value })}
                  className="h-7 px-2 text-sm border-none focus-visible:ring-0 bg-transparent shadow-none p-0"
                  placeholder="Note..."
                />
              )
            })}

            {/* CASHBACK */}
            {renderField({
              label: "Cashback (Fixed / %)",
              className: "col-span-2",
              children: (
                <div className="flex gap-2">
                  <Input
                    defaultValue={draft.cashbackShareFixed?.toString() ?? ""}
                    placeholder="Fixed Amount"
                    className="h-7 px-2 text-sm border-slate-100 focus-visible:ring-1 bg-transparent flex-1"
                    onBlur={(e) => {
                      const val = e.target.value.trim() ? Number(e.target.value) : null;
                      const next = { ...draft, cashbackShareFixed: val };
                      next.cashbackMode = resolveCashbackMode(next.sourceAccount, next.cashbackSharePercent, val);
                      setDraft(next);
                    }}
                  />
                  <Input
                    defaultValue={draft.cashbackSharePercent?.toString() ?? ""}
                    placeholder="Percent"
                    className="h-7 px-2 text-sm border-slate-100 focus-visible:ring-1 bg-transparent w-24"
                    onBlur={(e) => {
                      const val = e.target.value.trim() ? Number(e.target.value) : null;
                      const next = { ...draft, cashbackSharePercent: val };
                      next.cashbackMode = resolveCashbackMode(next.sourceAccount, val, next.cashbackShareFixed);
                      setDraft(next);
                    }}
                  />
                </div>
              )
            })}

            {/* SPLIT */}
            {isDebtIntent && renderField({
              label: "Split Bill",
              className: "col-span-2",
              children: (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleReviewSplitChange(true)}
                    className={cn("flex-1 rounded border px-3 py-1 text-xs font-semibold", draft.splitBill ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600")}
                  >
                    Split
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(draft.group)}
                    onClick={() => handleReviewSplitChange(false)}
                    className={cn("flex-1 rounded border px-3 py-1 text-xs font-semibold", !draft.splitBill ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600", draft.group && "opacity-50")}
                  >
                    No Split
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500">
            Save as template
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Template name"
            />
            <Button
              variant="outline"
              onClick={saveTemplate}
              disabled={isSavingTemplate || !templateName.trim()}
            >
              {isSavingTemplate ? "Saving..." : "Save"}
            </Button>
          </div>
          {templateError && (
            <div className="text-xs text-rose-600">
              {templateError}
            </div>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            variant="outline"
            onClick={() => goToStep("type")}
            className="gap-2 w-full"
          >
            <ArrowLeft className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={submitNow}
            disabled={isSubmittingNow}
            className="gap-2 w-full"
          >
            <Check className="h-4 w-4" />
            {isSubmittingNow ? "Submitting..." : "Submit Now"}
          </Button>
          <Button onClick={confirmAndOpenForm} className="gap-2 w-full">
            <Check className="h-4 w-4" />
            Review in Modal
          </Button>
        </div>
        {
          submitError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {submitError}
            </div>
          )
        }
      </div >
    );
  };

  const renderChatContent = () => (
    <>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 max-h-[320px] overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex w-full gap-2",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role !== "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Sparkles className="h-4 w-4" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                message.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white text-slate-700 border border-slate-100 rounded-bl-none"
              )}
            >
              <div
                className={cn(
                  "whitespace-pre-wrap break-words leading-relaxed",
                  message.role !== "user" && "text-slate-600"
                )}
              >
                {message.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {parseError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {parseError}
        </div>
      )}
      {templateError && step !== "review" && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {templateError}
        </div>
      )}

      {step === "review" ? (
        renderReview()
      ) : (
        <>
          {renderQuickPicks()}
          <div className="flex items-end gap-2">
            <Textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Type your answer..."
              className="min-h-[72px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isParsing) {
                    handleSubmitInput();
                  }
                }
              }}
            />
            <Button
              onClick={handleSubmitInput}
              disabled={isParsing}
              className="h-10"
            >
              {isParsing ? "Parsing..." : "Send"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={historyRef.current.length === 0}
            >
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={resetWizard} className="gap-2">
                <X className="h-4 w-4" />
                New chat
              </Button>
              {recentPrompts.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setRecentPrompts([])}
                  className="gap-2"
                >
                  Clear prompts
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {isFloating ? (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
          {!open && (
            <button
              type="button"
              onClick={() => openWizard()}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg hover:border-blue-300 hover:text-blue-700"
            >
              <MessageSquareText className="h-4 w-4" />
              Chat
            </button>
          )}
          {open && isMinimized && (
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg">
              <button
                type="button"
                onClick={() => setIsMinimized(false)}
                className="flex items-center gap-2"
              >
                <MessageSquareText className="h-4 w-4" />
                Chat
                {(unreadCount > 0 || messages.length > 0) && (
                  <span className="text-blue-600">{`(+${unreadCount > 0 ? unreadCount : 1})`}</span>
                )}
              </button>
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600"
                onClick={closeChat}
                aria-label="Close chat"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {open && !isMinimized && (
            <div
              className={cn(
                "flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl",
                "w-[600px]", // Increased width per user request
                "max-w-[calc(100vw-2rem)]",
              )}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Quick Add (Chat)
                  </div>
                  {modelName && (
                    <div className="pl-6 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                      {modelName}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"
                    aria-label="Minimize chat"
                  >
                    <span className="text-base leading-none">–</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeChat}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600"
                    aria-label="Close chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {renderChatContent()}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <Button
            onClick={() => openWizard(true)}
            className="gap-2"
            variant="secondary"
          >
            <MessageSquareText className="h-4 w-4" />
            Quick Add (Chat)
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
              className="max-w-4xl"
            >
              <DialogHeader>
                <DialogTitle className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Quick Add (Chat)
                  </div>
                  {modelName && (
                    <div className="pl-6 text-[10px] uppercase tracking-wider text-slate-400 font-medium font-normal">
                      {modelName}
                    </div>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Describe a transaction, then confirm before creating it.
                </DialogDescription>
              </DialogHeader>
              {renderChatContent()}
            </DialogContent>
          </Dialog>
        </>
      )}

      <AddTransactionDialog
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
        isOpen={transactionDialogOpen}
        onOpenChange={(nextOpen) => {
          setTransactionDialogOpen(nextOpen);
          if (!nextOpen) {
            setReviewValues(null);
          }
        }}
        onBackToChat={() => {
          setOpen(true);
          setIsMinimized(false);
        }}
        buttonClassName="hidden"
        buttonText="Quick Add"
        initialValues={reviewValues ?? undefined}
      />
    </>
  );
}

