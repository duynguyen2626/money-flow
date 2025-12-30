"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Check,
  X,
} from "lucide-react";

type WizardStep =
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
  destinationAccount: Account | null;
  occurredAt: Date | null;
  note: string | null;
  splitBill: boolean | null;
  splitBillConfirmed: boolean;
};

type QuickAddInitialValues = Partial<TransactionFormValues> & {
  split_group_id?: string;
  split_person_ids?: string[];
};

const normalizeName = (value: string) => value.trim().toLowerCase();

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
  const cleaned = value.trim().toLowerCase();
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
  const cleaned = value.trim().toLowerCase();
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

const buildInitialDraft = (): QuickAddDraft => ({
  intent: null,
  amount: null,
  people: [],
  group: null,
  sourceAccount: null,
  destinationAccount: null,
  occurredAt: null,
  note: null,
  splitBill: null,
  splitBillConfirmed: false,
});

const stepPrompts: Record<WizardStep, string> = {
  input:
    "Tell me what you want to add. Example: 'Paid 120k for lunch today from Cash'.",
  type: "What type is this transaction?",
  amount: "How much is it?",
  who: "Who is this for? Choose a person or group.",
  account: "Which account should be used?",
  transfer_destination: "Which account should receive the transfer?",
  date: "When did it happen? Use YYYY-MM-DD or 'today'.",
  note: "Add a note? (optional)",
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
}: {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  shops: Shop[];
}) {
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

  const recentAccounts = useMemo(
    () => accounts.filter((account) => account.type !== "system").slice(0, 6),
    [accounts],
  );

  const isDebtIntent = draft.intent === "lend" || draft.intent === "repay";

  useEffect(() => {
    if (!open) return;
    if (lastPromptedStep.current === step) return;
    if (step === "review") return;
    setMessages((prev) => [
      ...prev,
      { id: createId(), role: "assistant", content: stepPrompts[step] },
    ]);
    lastPromptedStep.current = step;
  }, [open, step]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    historyRef.current = [];
    lastPromptedStep.current = "input";
  };

  const openWizard = () => {
    resetWizard();
    setOpen(true);
  };

  const appendMessage = (role: "assistant" | "user", content: string) => {
    setMessages((prev) => [...prev, { id: createId(), role, content }]);
  };

  const computeNextStep = (nextDraft: QuickAddDraft): WizardStep => {
    if (!nextDraft.intent) return "type";
    if (!nextDraft.amount) return "amount";
    if (nextDraft.intent === "lend" || nextDraft.intent === "repay") {
      if (!nextDraft.group && nextDraft.people.length === 0) return "who";
    }
    if (!nextDraft.sourceAccount) return "account";
    if (nextDraft.intent === "transfer" && !nextDraft.destinationAccount) {
      return "transfer_destination";
    }
    if (!nextDraft.occurredAt) return "date";
    if (nextDraft.note === null) return "note";
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
    const group =
      findByName(groups, result.group_name ?? undefined) ?? null;
    const resolvedPeople = result.people
      .map((ref) => findByName(individualPeople, ref.name))
      .filter((person): person is Person => Boolean(person));
    const sourceAccount =
      findByName(accounts, result.source_account_name ?? undefined) ?? null;
    const destinationAccount =
      findByName(accounts, result.debt_account_name ?? undefined) ?? null;
    const occurredAt = result.occurred_at
      ? new Date(`${result.occurred_at}T12:00:00`)
      : null;

    const splitBill =
      group ? true : result.split_bill ?? (resolvedPeople.length > 1 ? true : null);

    const nextDraft: QuickAddDraft = {
      ...draft,
      intent,
      amount: result.amount ?? draft.amount,
      group,
      people: group ? [] : resolvedPeople,
      sourceAccount,
      destinationAccount,
      occurredAt,
      note: result.note ?? draft.note,
      splitBill,
      splitBillConfirmed: false,
    };

    setDraft(nextDraft);
    const nextStep = computeNextStep(nextDraft);
    goToStep(nextStep);
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
      applyParsedResult(data.result);
    } catch (error) {
      setParseError("Parsing failed. We'll continue manually.");
      goToStep("type");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmitInput = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed && step !== "note") return;

    if (trimmed) {
      appendMessage("user", trimmed);
    }

    if (step === "input") {
      if (!trimmed) return;
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
      const nextDraft = { ...draft, amount };
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
        const nextDraft = {
          ...draft,
          group: matchedGroup,
          people: [],
          splitBill: true,
          splitBillConfirmed: false,
        };
        setDraft(nextDraft);
        goToStep(computeNextStep(nextDraft));
        setInputValue("");
        return;
      }
      const matchedPeople = parts
        .map((part) => findByName(individualPeople, part))
        .filter((person): person is Person => Boolean(person));
      if (matchedPeople.length === 0) {
        appendMessage("assistant", "I couldn't find those people.");
        return;
      }
      const nextDraft = {
        ...draft,
        people: matchedPeople,
        group: null,
        splitBill: matchedPeople.length > 1 ? true : draft.splitBill,
      };
      setDraft(nextDraft);
      goToStep(computeNextStep(nextDraft));
      setInputValue("");
      return;
    }

    if (step === "account") {
      const account = findByName(accounts, trimmed);
      if (!account) {
        appendMessage("assistant", "I couldn't find that account.");
        return;
      }
      const nextDraft = { ...draft, sourceAccount: account };
      setDraft(nextDraft);
      goToStep(computeNextStep(nextDraft));
      setInputValue("");
      return;
    }

    if (step === "transfer_destination") {
      const account = findByName(accounts, trimmed);
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
      const nextDraft = { ...draft, destinationAccount: account };
      setDraft(nextDraft);
      goToStep(computeNextStep(nextDraft));
      setInputValue("");
      return;
    }

    if (step === "date") {
      const parsedDate = parseDateValue(trimmed);
      if (!parsedDate) {
        appendMessage("assistant", "Please use YYYY-MM-DD or 'today'.");
        return;
      }
      const nextDraft = { ...draft, occurredAt: parsedDate };
      setDraft(nextDraft);
      goToStep(computeNextStep(nextDraft));
      setInputValue("");
      return;
    }

    if (step === "note") {
      const noteValue = trimmed || "";
      const nextDraft = { ...draft, note: noteValue };
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
  };

  const handleSplitConfirm = (value: boolean) => {
    if (!isDebtIntent) return;
    if (draft.group && !value) return;
    if (!value && draft.people.length > 1) {
      appendMessage("assistant", "Choose a single person for no split.");
      goToStep("who");
      return;
    }
    const nextDraft = { ...draft, splitBill: value, splitBillConfirmed: true };
    setDraft(nextDraft);
    goToStep(computeNextStep(nextDraft));
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

  const handleBack = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setStep(prev);
  };

  const renderQuickPicks = () => {
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
                const nextDraft = { ...draft, intent: option.intent };
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
                    const nextDraft = {
                      ...draft,
                      group,
                      people: [],
                      splitBill: true,
                      splitBillConfirmed: false,
                    };
                    setDraft(nextDraft);
                    goToStep(computeNextStep(nextDraft));
                  }}
                >
                  {group.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {recentPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                onClick={() => {
                  appendMessage("user", person.name);
                  const nextDraft = {
                    ...draft,
                    people: [person],
                    group: null,
                  };
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
      return (
        <div className="flex flex-wrap gap-2">
          {recentAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
              onClick={() => {
                appendMessage("user", account.name);
                const nextDraft = { ...draft, sourceAccount: account };
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

    if (step === "transfer_destination") {
      return (
        <div className="flex flex-wrap gap-2">
          {recentAccounts
            .filter((account) => account.id !== draft.sourceAccount?.id)
            .map((account) => (
              <button
                key={account.id}
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                onClick={() => {
                  appendMessage("user", account.name);
                  const nextDraft = { ...draft, destinationAccount: account };
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

    if (step === "date") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
            onClick={() => {
              appendMessage("user", "Today");
              const nextDraft = { ...draft, occurredAt: new Date() };
              setDraft(nextDraft);
              goToStep(computeNextStep(nextDraft));
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
            onClick={() => {
              const date = new Date();
              date.setDate(date.getDate() - 1);
              appendMessage("user", "Yesterday");
              const nextDraft = { ...draft, occurredAt: date };
              setDraft(nextDraft);
              goToStep(computeNextStep(nextDraft));
            }}
          >
            Yesterday
          </button>
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
            onClick={() => handleSplitConfirm(true)}
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
            onClick={() => handleSplitConfirm(false)}
          >
            No split
          </button>
        </div>
      );
    }

    return null;
  };

  const renderReview = () => {
    const groupCount = draft.group
      ? groupMembers.get(draft.group.id)?.length ?? 0
      : 0;
    const whoLabel = draft.group
      ? draft.group.name
      : draft.people.length > 0
        ? draft.people.map((person) => person.name).join(", ")
        : "-";
    const splitLabel = isDebtIntent
      ? draft.splitBill
        ? draft.group
          ? `On (Group • ${groupCount} people)`
          : "On"
        : "Off"
      : "N/A";

    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Type</span>
            <span className="capitalize">{draft.intent ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Amount</span>
            <span>{draft.amount?.toLocaleString() ?? "-"}</span>
          </div>
          {isDebtIntent && (
            <div className="flex items-center justify-between">
              <span className="font-semibold">Who</span>
              <span>{whoLabel}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-semibold">Account</span>
            <span>{draft.sourceAccount?.name ?? "-"}</span>
          </div>
          {draft.intent === "transfer" && (
            <div className="flex items-center justify-between">
              <span className="font-semibold">Destination</span>
              <span>{draft.destinationAccount?.name ?? "-"}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-semibold">Date</span>
            <span>
              {draft.occurredAt
                ? draft.occurredAt.toISOString().slice(0, 10)
                : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Note</span>
            <span>{draft.note || "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold">Split Bill</span>
            <span>{splitLabel}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => goToStep("type")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Edit
          </Button>
          <Button onClick={confirmAndOpenForm} className="gap-2">
            <Check className="h-4 w-4" />
            Confirm & Open Form
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Button
        onClick={openWizard}
        className="gap-2"
        variant="secondary"
      >
        <MessageSquareText className="h-4 w-4" />
        Quick Add (Chat)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              Quick Add (Chat)
            </DialogTitle>
            <DialogDescription>
              Describe a transaction, then confirm before creating it.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 max-h-[320px] overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "bg-white text-slate-700",
                )}
              >
                {message.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {parseError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {parseError}
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
                  placeholder={
                    step === "note"
                      ? "Add a note or leave blank"
                      : "Type your answer..."
                  }
                  className="min-h-[72px]"
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
                <Button variant="outline" onClick={resetWizard} className="gap-2">
                  <X className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
        buttonClassName="hidden"
        buttonText="Quick Add"
        initialValues={reviewValues ?? undefined}
      />
    </>
  );
}
