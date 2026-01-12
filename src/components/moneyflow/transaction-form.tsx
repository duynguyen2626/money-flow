import { zodResolver } from "@hookform/resolvers/zod";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { format, subMonths, parseISO } from "date-fns";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  createPersonAction,
  ensureDebtAccountAction,
  updatePersonAction,
} from "@/actions/people-actions";
import { SYSTEM_ACCOUNTS, SYSTEM_CATEGORIES } from "@/lib/constants";
import {
  requestRefund,
  confirmRefund,
} from "@/services/transaction.service";
import { getSplitChildrenAction } from "@/actions/transaction-actions";
import {
  previewCashbackAction,
  CashbackPreviewResult,
} from "@/actions/cashback-preview.action";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Wallet,
  RotateCcw,
  Info,
  Lock,
  AlertCircle,
  Calendar,
  Tag,
  ChevronLeft,
  Store,
  Sparkles,
  Percent,
  Loader2,
  X,
  Trash2,
  ArrowDownToLine,
  LayoutList,
  Fingerprint,
  Users,
  User,
  FileText
} from "lucide-react";

import {
  Account,
  Category,
  Person,
  Shop,
  TransactionWithDetails,
  CashbackCard,
} from "@/types/moneyflow.types";
import { normalizePolicyMetadata, formatPolicyLabel, formatPercent } from "@/lib/cashback-policy";
import { getDisplayBalance } from "@/lib/display-balance";
import {
  CashbackPolicyMetadata,
  AccountSpendingStats,
} from "@/types/cashback.types";
import {
  AllocationResult,
  allocateTransactionRepayment,
} from "@/lib/debt-allocation";
import { Installment } from "@/services/installment.service";
import { SplitBillParticipant, SplitBillTable } from "./split-bill-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, getAccountInitial } from "@/lib/utils";
import {
  createTransaction,
  updateTransaction,
  CreateTransactionInput,
} from "@/services/transaction.service";
import { getOutstandingDebts } from "@/services/debt.service";

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const formSchema = z.object({
  type: z.enum(["expense", "income", "debt", "transfer", "repayment", "quick-people"]),
  amount: z.coerce.number(),
  occurred_at: z.date(),
  note: z.string().optional(),
  tag: z.string().optional(),
  source_account_id: z.string().optional(),
  debt_account_id: z.string().optional(),
  target_account_id: z.string().optional(),
  category_id: z.string().optional(),
  person_id: z.string().optional(),
  shop_id: z.string().optional(),
  is_installment: z.boolean().default(false).optional(),
  installment_plan_id: z.string().optional(),
  cashback_share_percent: z.number().optional(),
  cashback_share_fixed: z.number().optional(),
  cashback_mode: z.enum(["none_back", "percent", "fixed", "real_fixed", "real_percent", "voluntary"]).default("none_back").optional(),
  split_bill: z.boolean().default(false).optional(),
  metadata: z.any().optional(),
  refund_status: z.enum(["pending", "received"]).optional(),
});

export type TransactionFormValues = z.infer<typeof formSchema>;

import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { QuickPeopleSettings } from "./quick-people-settings";
import { CategoryDialog } from "./category-dialog";
import { AddShopDialog } from "./add-shop-dialog";
import { CreatePersonDialog } from "../people/create-person-dialog";
import { EditAccountDialog } from "./edit-account-dialog";

type StatusMessage = {
  type: "success" | "error";
  text: string;
} | null;

const REFUND_CATEGORY_ID = SYSTEM_CATEGORIES.REFUND;
const REFUND_PENDING_ACCOUNT_ID = SYSTEM_ACCOUNTS.PENDING_REFUNDS;

// ... props ...
type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  shops?: Shop[];
  installments?: Installment[]; // Phase 7X
  onSuccess?: (txn?: TransactionWithDetails) => void;
  defaultTag?: string;
  defaultPersonId?: string;
  defaultType?: "expense" | "income" | "debt" | "transfer" | "repayment";
  defaultSourceAccountId?: string;
  defaultDebtAccountId?: string;
  transactionId?: string;
  onSwitchTransaction?: (id: string | undefined) => void;
  initialValues?: Partial<TransactionFormValues> & {
    category_name?: string;
    account_name?: string;
    metadata?: any;
    split_group_id?: string;
    split_person_ids?: string[];
  };
  mode?: "create" | "edit" | "refund";
  refundTransactionId?: string;
  refundAction?: "request" | "confirm";
  refundMaxAmount?: number;
  defaultRefundStatus?: "pending" | "received";
  onCancel?: () => void;
  onFormChange?: (hasChanges: boolean) => void;
  onDelete?: (id: string) => void; // Added onDelete prop
};

// ...

export function TransactionForm({
  // Deployment Verification: Cashback Fix v2.1
  accounts: allAccounts,
  categories,
  people,
  shops = [],
  onSuccess,
  defaultTag,
  defaultPersonId,
  defaultType,
  defaultSourceAccountId,
  defaultDebtAccountId,
  transactionId,
  onSwitchTransaction,
  initialValues,
  installments = [], // Phase 7X
  mode = "create",
  refundTransactionId,
  refundAction = "request",
  refundMaxAmount,
  defaultRefundStatus = "pending",
  onCancel,
  onFormChange,
  onDelete, // Destructure onDelete
}: TransactionFormProps) {
  const [isPending, startTransition] = useTransition();
  // ... state ...

  // Helper for generating tags
  const generateTag = (date: Date) => format(date, 'yyyy-MM');

  // Hydrate Split Bill Data on Mount (Edit Mode)
  useEffect(() => {
    // Check if this is a split bill parent (support both old and new flags)
    const meta = initialValues?.metadata || {};
    const isSplitBill = meta.is_split_bill === true || meta.is_two_person_split_lend === true;
    const parentTxnId = meta.parent_transaction_id || (typeof meta === 'string' && meta.includes('parent_transaction_id') ? JSON.parse(meta).parent_transaction_id : undefined);

    if (mode === 'edit' && isSplitBill && transactionId) {
      console.log("[TransactionForm] Hydrating Split Bill for Parent:", transactionId);
      form.setValue('split_bill', true);

      // We need to construct the participants list.
      // 1. "Me" is the current transaction (my_share is in metadata, or use amount)
      // Note: my_share might be in metadata, but amount should be "my share" already if logic was correct.
      // If metadata.my_share exists, use it. Otherwise amount.
      const myAmount = meta.my_share ?? initialValues?.amount ?? 0;

      const meParticipant: SplitBillParticipant = {
        personId: "me",
        name: "Me (Mine)",
        amount: myAmount,
        paidBy: "Me", // Assuming I paid
        note: initialValues?.note || "",
        // The parent doesn't have a linkedTransactionId for "me" separate from itself, or we can use itself.
        // But clicking "Edit" on Me should just stay here.
      };

      // 2. Fetch children
      getSplitChildrenAction(transactionId).then((children) => {
        if (children) {
          const others: SplitBillParticipant[] = children.map((c: any) => ({
            personId: c.personId,
            name: c.name,
            amount: c.amount,
            paidBy: "Me", // Logic: I paid for them
            note: c.note || "",
            linkedTransactionId: c.id
          }));

          setSplitParticipants([meParticipant, ...others]);
        }
      });
    } else if (mode === 'edit' && parentTxnId) {
      // logic for displaying 'Back to Split Bill' is handled in render,
      // but we check here to debug
      console.log("[TransactionForm] Child of Split Bill. Parent:", parentTxnId);
    }
  }, [mode, initialValues, transactionId]);

  // Derived state for Split Bill Navigation
  const parentTxnId = useMemo(() => {
    const meta = initialValues?.metadata || {};
    return meta.parent_transaction_id || (typeof meta === 'string' && meta.includes('parent_transaction_id') ? JSON.parse(meta).parent_transaction_id : undefined);
  }, [initialValues]);

  const [sourceAccountsState, setSourceAccountsState] = useState<Account[]>(allAccounts);
  const [shopsState, setShopsState] = useState<Shop[]>(shops);
  const [peopleState, setPeopleState] = useState<Person[]>(people);

  useEffect(() => {
    setSourceAccountsState(allAccounts);
  }, [allAccounts]);

  useEffect(() => {
    setShopsState(shops);
  }, [shops]);

  useEffect(() => {
    setPeopleState(people);
  }, [people]);

  const [manualTagMode, setManualTagMode] = useState(() =>
    Boolean(defaultTag || initialValues?.tag),
  );

  const suggestedTags = useMemo(() => {
    const tags = [];
    const today = new Date();
    for (let i = 2; i >= 0; i--) {
      const date = subMonths(today, i);
      tags.push(generateTag(date));
    }
    return [...new Set(tags)];
  }, []);

  const personMap = useMemo(() => {
    const map = new Map<string, Person>();
    peopleState.forEach((person) => map.set(person.id, person));
    return map;
  }, [peopleState]);

  const debtAccountByPerson = useMemo(() => {
    const map = new Map<string, string>();
    // 1. Map explicit links from peopleState
    peopleState.forEach((person) => {
      if (person.debt_account_id) {
        map.set(person.id, person.debt_account_id);
      }
    });

    // 2. Map by owner_id from allAccounts (Debt accounts specifically)
    // This handles cases where peopleState link is missing but Account.owner_id is correct
    allAccounts.forEach((account) => {
      if (account.type === 'debt' && account.owner_id) {
        if (!map.has(account.owner_id)) {
          map.set(account.owner_id, account.id);
        }
      }
    });

    // CRITICAL: Add mapping for "Me (Mine)" - special case for split bill
    map.set("me", "c55445bb-30b5-4990-bd65-7b68997abddb");

    return map;
  }, [peopleState, allAccounts]);

  const defaultPayerName = useMemo(() => {
    return "Me (Mine)";
  }, []);

  const ownerPerson = useMemo(
    () => peopleState.find((person) => person.is_owner),
    [peopleState],
  );

  const splitBillGroups = useMemo(() => {
    const groupMembers = new Map<string, Person[]>();
    const groups = peopleState.filter((person) => Boolean(person.is_group));

    peopleState.forEach((person) => {
      if (person.is_group || !person.group_parent_id) return;
      const list = groupMembers.get(person.group_parent_id) ?? [];
      list.push(person);
      groupMembers.set(person.group_parent_id, list);
    });

    return groups
      .map((group) => ({
        id: group.id,
        name: group.name ?? "Group",
        imageUrl: group.image_url ?? null,
        members: (groupMembers.get(group.id) ?? []).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [peopleState]);

  const splitBillGroupMap = useMemo(() => {
    const map = new Map<string, (typeof splitBillGroups)[number]>();
    splitBillGroups.forEach((group) => map.set(group.id, group));
    return map;
  }, [splitBillGroups]);

  const splitBillGroupOptions = useMemo(
    () =>
      splitBillGroups.map((group) => ({
        value: group.id,
        label: group.name,
        description: `${group.members.length} members`,
        searchValue: `${group.name} ${group.members.length}`,
        icon: group.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.imageUrl}
            alt={group.name}
            className="h-5 w-5 object-contain rounded-none"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-none bg-slate-100 text-slate-500">
            <Users className="h-4 w-4" />
          </span>
        ),
      })),
    [splitBillGroups],
  );

  const getEvenSplitAmounts = useCallback(
    (totalAmount: number, count: number) => {
      if (!Number.isFinite(totalAmount) || count <= 0) return [];
      const scale = 100;
      const scaledTotal = Math.round(Math.abs(totalAmount) * scale);
      const base = Math.floor(scaledTotal / count);
      const remainder = scaledTotal % count;
      return Array.from({ length: count }, (_, index) =>
        (base + (index < remainder ? 1 : 0)) / scale,
      );
    },
    [],
  );

  const refundCategoryId = useMemo(() => {
    const direct = categories.find((cat) => cat.id === REFUND_CATEGORY_ID);
    if (direct) return direct.id;
    const byName = categories.find((cat) =>
      (cat.name ?? "").toLowerCase().includes("refund"),
    );
    return byName?.id ?? REFUND_CATEGORY_ID;
  }, [categories]);

  const [status, setStatus] = useState<StatusMessage>(null);
  const [cashbackProgress, setCashbackProgress] = useState<CashbackCard | null>(
    null,
  );
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [spendingStats, setSpendingStats] =
    useState<AccountSpendingStats | null>(null);
  const [transactionType, setTransactionType] = useState<
    "expense" | "income" | "debt" | "transfer" | "repayment" | "quick-people"
  >(initialValues?.type || defaultType || "expense");
  const [accountFilter, setAccountFilter] = useState<
    "credit" | "account" | "other" | "all"
  >(initialValues?.type === "repayment" ? "account" : "credit");
  const [accountSearch, setAccountSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payerName, setPayerName] = useState<string>("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [recentAccountIds, setRecentAccountIds] = useState<string[]>([]);
  const [dateInputValue, setDateInputValue] = useState("");

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isShopDialogOpen, setIsShopDialogOpen] = useState(false);
  const [isPersonDialogOpen, setIsPersonDialogOpen] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [accountDialogContext, setAccountDialogContext] = useState<'source' | 'debt' | null>(null);
  const [, setStatsLoading] = useState(false);
  const [, setStatsError] = useState<string | null>(null);
  const [debtEnsureError, setDebtEnsureError] = useState<string | null>(null);
  const [isEnsuringDebt, startEnsuringDebt] = useTransition();
  const [persistedMetadata, setPersistedMetadata] =
    useState<CashbackPolicyMetadata | null>(null);

  // When transaction type changes, set default account filter
  useEffect(() => {
    if (transactionType === 'repayment') {
      setAccountFilter('account');
    } else if (transactionType === 'expense') {
      setAccountFilter('credit');
    }
  }, [transactionType]);



  const [splitGroupId, setSplitGroupId] = useState<string | undefined>(undefined);
  const [splitParticipants, setSplitParticipants] = useState<
    SplitBillParticipant[]
  >([]);
  const [splitBillAutoSplit, setSplitBillAutoSplit] = useState(false);
  const [splitTotalDiff, setSplitTotalDiff] = useState(0);

  // Sprint 5 Features
  const [bulkRepayment, setBulkRepayment] = useState(
    Boolean(initialValues?.metadata?.bulk_allocation) || false
  );
  const [outstandingDebts, setOutstandingDebts] = useState<any[]>([]);
  const [allocationPreview, setAllocationPreview] = useState<AllocationResult | null>(null);
  const [allocationOverrides, setAllocationOverrides] = useState<Record<string, number>>({});
  const [ignoredDebtIds, setIgnoredDebtIds] = useState<Set<string>>(new Set());



  const handleDetailClick = (type: 'person' | 'account' | 'shop', id?: string) => {
    if (!id) return;
    const url = `/${type === 'shop' ? 'shops' : type === 'account' ? 'accounts' : 'people'}/${id}`;
    // Open in new tab or modal. For now new tab.
    window.open(url, '_blank');
  };

  const [splitBillError, setSplitBillError] = useState<string | null>(null);
  const [splitPersonInput, setSplitPersonInput] = useState("");
  const [splitPersonError, setSplitPersonError] = useState<string | null>(null);
  const [splitPersonDropdownOpen, setSplitPersonDropdownOpen] = useState(false);
  const [ownerRemoved, setOwnerRemoved] = useState(false);
  const [splitRepayPersonId, setSplitRepayPersonId] = useState<string | null>(null);
  const [isCreatingSplitPerson, startCreatingSplitPerson] = useTransition();

  // Phase 7.3: Cashback Preview State
  const [cashbackPreview, setCashbackPreview] =
    useState<CashbackPreviewResult | null>(null);

  const isEditMode =
    mode === "edit" || (mode !== "refund" && Boolean(transactionId));
  const isRefundMode = mode === "refund";
  const isConfirmRefund = isRefundMode && refundAction === "confirm";
  const [refundStatus, setRefundStatus] = useState<"pending" | "received">(
    isConfirmRefund ? "received" : defaultRefundStatus,
  );
  const router = useRouter();

  // Fix for Form Reset Loop
  const initialValuesRef = useRef(initialValues);
  const hiddenDateInputRef = useRef<HTMLInputElement | null>(null);
  const initialSplitAppliedRef = useRef(false);

  // Force update ref if transactionId changes (switching to another txn)
  useEffect(() => {
    initialValuesRef.current = initialValues;
  }, [initialValues, transactionId]);

  const baseDefaults = useMemo(
    () => ({
      occurred_at: new Date(),
      type: defaultType ?? (isRefundMode ? "income" : "expense"),
      amount: 0,
      note: "",
      tag: defaultTag ?? generateTag(new Date()),
      source_account_id: defaultSourceAccountId ?? undefined,
      person_id: undefined,
      debt_account_id: defaultDebtAccountId ?? undefined,
      split_bill: false,
      category_id: isRefundMode ? (refundCategoryId ?? undefined) : undefined,
      shop_id: undefined,
      cashback_share_percent: undefined,
      cashback_share_fixed: undefined,
      is_voluntary: false,
      is_installment: false,
      installment_plan_id: undefined,
      cashback_mode: "none_back" as const,
    }),
    [
      defaultDebtAccountId,
      defaultSourceAccountId,
      defaultTag,
      defaultType,
      isRefundMode,
      refundCategoryId,
    ],
  );

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      ...baseDefaults,
      ...initialValues,
      cashback_mode: (initialValues?.cashback_mode as any) ?? "none_back",
      occurred_at: initialValues?.occurred_at
        ? (initialValues.occurred_at instanceof Date
          ? initialValues.occurred_at
          : new Date(initialValues.occurred_at))
        : baseDefaults.occurred_at,
      amount: initialValues?.amount ? Math.abs(initialValues.amount) : 0,
      cashback_share_percent: initialValues?.cashback_share_percent
        ? initialValues.cashback_share_percent * 100
        : undefined,
    },
  });

  // Track form changes and notify parent
  useEffect(() => {
    onFormChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onFormChange]);

  // Handle Initial Values Reset (Especially when fetching Parent Transaction)
  // MOVED HERE: Must be after 'form' definition to avoid ReferenceError
  useEffect(() => {
    if (initialValues) {
      // Force type update if provided (critical for Parent Repayment redirect)
      if (initialValues.type && initialValues.type !== transactionType) {
        setTransactionType(initialValues.type);
      }

      // Ensure form resets with new values
      const timer = setTimeout(() => {
        form.reset({
          ...baseDefaults,
          ...initialValues,
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialValues, form]);

  // Prompt unsaved changes on refresh/close
  useUnsavedChanges(form.formState.isDirty);

  const applyDefaultPersonSelection = useCallback(() => {
    if (!defaultPersonId) {
      return;
    }
    // Prevent overwriting if initialValues (e.g. from Clone) already provide a person
    if (initialValues?.person_id) {
      return;
    }
    const direct = personMap.get(defaultPersonId);
    if (direct && !direct.is_group) {
      form.setValue("person_id", direct.id, { shouldDirty: false });
      form.setValue("debt_account_id", direct.debt_account_id ?? undefined, { shouldDirty: false });
      return;
    }
    if (direct && direct.is_group) {
      return;
    }
    const fromDebt = peopleState.find(
      (person) => person.debt_account_id === defaultPersonId,
    );
    if (fromDebt) {
      form.setValue("person_id", fromDebt.id, { shouldDirty: false });
      form.setValue("debt_account_id", fromDebt.debt_account_id ?? undefined, { shouldDirty: false });
      return;
    }
    form.setValue("debt_account_id", defaultPersonId, { shouldDirty: false });
  }, [defaultPersonId, form, peopleState, personMap]);

  const resolveSplitRepayPerson = useCallback(() => {
    const selectedPersonId = form.getValues("person_id");
    if (selectedPersonId) {
      return peopleState.find((person) => person.id === selectedPersonId) ?? null;
    }
    if (!defaultPersonId) return null;
    const direct = personMap.get(defaultPersonId);
    if (direct && !direct.is_group) return direct;
    return (
      peopleState.find((person) => person.debt_account_id === defaultPersonId) ??
      null
    );
  }, [defaultPersonId, form, peopleState, personMap]);

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    // Prevent reset if values haven't meaningfully changed (prevents reset on router.refresh)
    // We check if transactionId changed or if it's a fresh mount
    if (initialValuesRef.current === initialValues && form.formState.isDirty) {
      return;
    }

    const newValues = {
      ...baseDefaults,
      ...initialValues,
      cashback_mode: (initialValues.cashback_mode as any) ?? "none_back",
      occurred_at: initialValues.occurred_at
        ? initialValues.occurred_at instanceof Date
          ? initialValues.occurred_at
          : new Date(initialValues.occurred_at)
        : new Date(),
      amount: initialValues.amount ? Math.abs(initialValues.amount) : 0,
      cashback_share_percent: initialValues?.cashback_share_percent
        ? initialValues.cashback_share_percent * 100
        : undefined,
    };

    const isRepayment =
      initialValues.category_name?.toLowerCase().includes("thu nợ") ||
      initialValues.category_name?.toLowerCase().includes("repayment") ||
      initialValues.type === "repayment";

    const isDebt =
      initialValues.type === "debt" ||
      (initialValues.type as string) === "lending";
    const isIncomeWithPerson =
      initialValues.type === "income" && initialValues.person_id;

    if (isRepayment || (isIncomeWithPerson && !isDebt)) {
      newValues.type = "repayment";

      const sourceId = newValues.source_account_id;
      const sourceAcc = allAccounts.find((a) => a.id === sourceId);

      // Fix: ONLY swap if the source account is a DEBT account (meaning we are lending FROM debt?? No, repayment usually means User PAYS Debt).
      // If we are editing a Repayment:
      // Source = Bank (Money Out)
      // Destination (Debt Account) = Target Account (Money In)
      // The mapper sets debt_account_id = target_account_id.

      // If source is Debt, it implies inverted logic or raw mapping.
      if (sourceAcc?.type === "debt") {
        // If we have a valid debt_account_id, trust it but ensure it's not the same as source (unless swapping)
        if (newValues.debt_account_id && newValues.debt_account_id !== sourceId) {
          const temp = newValues.source_account_id;
          newValues.source_account_id = newValues.debt_account_id;
          newValues.debt_account_id = temp;
        } else {
          // If source is debt and no valid destination, move source to debt
          newValues.debt_account_id = sourceId;
          newValues.source_account_id = undefined;
        }
      }

      // CRITICAL FIX: If debt_account_id is missing BUT we have a person_id, try to fill it
      // This handles cases where "Reset" wipes debt_account_id or mapper didn't find it.
      if (!newValues.debt_account_id && newValues.person_id) {
        const person = peopleState.find(p => p.id === newValues.person_id);
        if (person?.debt_account_id) {
          newValues.debt_account_id = person.debt_account_id;
        }
      }
    }

    // Only reset if we are not deep into editing, or if it's a forced external update
    // For simplicity, we trust reference equality check at top + ID check
    // But since we want to allow router.refresh to NOT reset:
    if (
      JSON.stringify(initialValues) === JSON.stringify(initialValuesRef.current)
    ) {
      // Same values, do nothing
    } else {
      console.log(
        "[Form Debug] Resetting form with initialValues:",
        JSON.stringify({
          person_id: initialValues.person_id,
          debt_account_id: initialValues.debt_account_id,
          type: initialValues.type
        })
      );
      form.reset(newValues, { keepDirty: false });
      setManualTagMode(true);
      setTransactionType(newValues.type);
      setIsInstallment(Boolean(initialValues.is_installment));
      if (initialValues.installment_plan_id) {
        form.setValue("installment_plan_id", initialValues.installment_plan_id, { shouldDirty: false });
      }
      initialValuesRef.current = initialValues;
      // Sprint 5 Refine: Restore Bulk Repayment Toggle state
      setBulkRepayment(Boolean(initialValues.metadata?.bulk_allocation));
    }
  }, [baseDefaults, form, initialValues, allAccounts]);

  // Sprint 7 Fix: Aggressively restore Bulk Repayment Toggle
  // This ensures that even if reset logic is skipped/bypassed, the toggle is ON if metadata exists.
  useEffect(() => {
    if (initialValues?.metadata?.bulk_allocation && transactionType === 'repayment') {
      if (!bulkRepayment) {
        console.log("Forcing Bulk Repayment ON (Metadata Found)", initialValues.metadata);
        setBulkRepayment(true);
      }
    }
  }, [initialValues, transactionType, bulkRepayment]);

  // Auto-populate Person field when defaultPersonId is provided (LEND/REPAY buttons)
  useEffect(() => {
    // Only apply in create mode, not edit mode
    if (mode !== 'create' || !defaultPersonId) return;

    // Don't override if initialValues already has a person
    if (initialValues?.person_id) return;

    // Use setTimeout to ensure form and Select components are fully mounted
    const timer = setTimeout(() => {
      // Check if person_id is already set
      const currentPersonId = form.getValues('person_id');
      if (currentPersonId) return;

      // Find the person by ID
      const person = peopleState.find(p => p.id === defaultPersonId);
      if (person) {
        console.log('[TransactionForm] Auto-populating person:', person.name, person.id);
        form.setValue('person_id', person.id, { shouldDirty: false, shouldValidate: true });

        // Also set debt_account_id if available
        if (person.debt_account_id) {
          form.setValue('debt_account_id', person.debt_account_id, { shouldDirty: false });
        }
      }
    }, 100); // Small delay to ensure components are mounted

    return () => clearTimeout(timer);
  }, [defaultPersonId, mode, initialValues?.person_id, form, peopleState]);

  // Fix: Auto-populate Debt Account when Person changes manually (Lending/Repayment)
  // This handles the user picking a person from the dropdown
  const watchedPersonId = useWatch({ control: form.control, name: 'person_id' });

  useEffect(() => {
    // Only apply if we are in a mode that requires debt account linkage
    // debt (Lending), repayment (Collecting/Paying Debt)
    // Note: 'debt' type usually means "Lending" (Money Out -> To Person's Debt Account)
    if (!['debt', 'repayment'].includes(transactionType)) return;

    if (!watchedPersonId) return;

    const person = personMap.get(watchedPersonId);
    if (person && person.debt_account_id) {
      const currentDebtAcc = form.getValues('debt_account_id');
      // Only update if not already set or if we want to enforce the person's default
      // For better UX, we enforce it unless the user manually changed it?
      // Simplest: If the current debt account doesn't match the new person's debt account, update it.
      if (currentDebtAcc !== person.debt_account_id) {
        console.log('[TransactionForm] Auto-switching debt account for person:', person.name);
        form.setValue('debt_account_id', person.debt_account_id, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [watchedPersonId, transactionType, personMap, form]);

  // Bug Fix: Update account filter to ensure the selected account is visible in Edit Mode
  useEffect(() => {
    const sourceId = initialValues?.source_account_id || defaultSourceAccountId;
    if (sourceId) {
      const account = allAccounts.find((a) => a.id === sourceId);
      if (account) {
        if (["credit_card"].includes(account.type)) {
          setAccountFilter("credit");
        } else if (["bank", "cash", "ewallet"].includes(account.type)) {
          setAccountFilter("account");
        } else if (["savings", "investment", "asset"].includes(account.type)) {
          setAccountFilter("other"); // Save tab
        } else {
          setAccountFilter("other");
        }
      }
    }
  }, [initialValues?.source_account_id, defaultSourceAccountId, allAccounts]);

  // Smart Reset: Clear category/shop if current selection is invalid for the new type

  useEffect(() => {
    if (!isRefundMode) return;
    form.setValue("type", "income", { shouldDirty: false });
    setTransactionType("income");
    form.setValue("category_id", refundCategoryId ?? REFUND_CATEGORY_ID, {
      shouldValidate: true,
      shouldDirty: false,
    });
    const currentNote = form.getValues("note");
    if (!currentNote || currentNote.trim().length === 0) {
      // Clean the note - use only the original note without shop name
      let baseNote = initialValues?.note ?? "";

      // If the note already starts with "Refund:", extract the actual note part
      if (baseNote.startsWith("Refund:")) {
        baseNote = baseNote.replace(/^Refund:\s*/, "").trim();
      }

      // Build the refund note with just the original note
      const nextNote = baseNote ? `Refund: ${baseNote}` : "Refund";
      form.setValue("note", nextNote, { shouldDirty: false });
    }
  }, [form, initialValues?.note, isRefundMode, refundCategoryId]);

  const onSubmit = async (values: TransactionFormValues) => {
    const supabase = createSupabaseClient();
    setIsSubmitting(true);
    setStatus(null);
    setSplitBillError(null);
    try {
      if (isRefundMode) {
        const targetTransactionId = refundTransactionId ?? transactionId;
        if (!targetTransactionId) {
          setStatus({
            type: "error",
            text: "Missing target transaction to refund.",
          });
          return;
        }

        const maxRefund =
          typeof refundMaxAmount === "number"
            ? Math.abs(refundMaxAmount)
            : Math.abs(values.amount ?? 0);

        if (Math.abs(values.amount ?? 0) > maxRefund) {
          setStatus({
            type: "error",
            text: `Refund amount cannot exceed ${numberFormatter.format(maxRefund)}`,
          });
          return;
        }

        const safeAmount = Math.abs(values.amount ?? 0);
        if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
          setStatus({
            type: "error",
            text: "Please enter a valid refund amount.",
          });
          return;
        }

        const partialFlag = safeAmount < maxRefund;

        if (isConfirmRefund) {
          const targetAccountId = values.source_account_id;
          if (
            !targetAccountId ||
            targetAccountId === REFUND_PENDING_ACCOUNT_ID
          ) {
            setStatus({
              type: "error",
              text: "Choose the receiving account for this refund.",
            });
            return;
          }
          const confirmResult = await confirmRefund(
            targetTransactionId,
            targetAccountId,
          );
          if (!confirmResult.success) {
            setStatus({
              type: "error",
              text: confirmResult.error ?? "Unable to confirm refund.",
            });
            return;
          }
          router.refresh();
          setStatus({
            type: "success",
            text: "Refund confirmed successfully.",
          });
          onSuccess?.();
          return;
        }

        const requestResult = await requestRefund(
          targetTransactionId,
          safeAmount,
          partialFlag,
        );

        if (!requestResult.success) {
          setStatus({
            type: "error",
            text: requestResult.error ?? "Unable to create refund request.",
          });
          return;
        }

        if (refundStatus === "received") {
          const preferredAccount =
            values.source_account_id === REFUND_PENDING_ACCOUNT_ID
              ? (defaultSourceAccountId ??
                initialValues?.source_account_id ??
                null)
              : (values.source_account_id ?? null);

          if (!preferredAccount) {
            setStatus({
              type: "error",
              text: "Select where the refunded money was received.",
            });
            return;
          }

          const confirmResult = await confirmRefund(
            requestResult.refundTransactionId ?? "",
            preferredAccount,
          );
          if (!confirmResult.success) {
            setStatus({
              type: "error",
              text: confirmResult.error ?? "Unable to confirm refund.",
            });
            return;
          }
        }

        router.refresh();
        setStatus({
          type: "success",
          text:
            refundStatus === "received"
              ? "Refund confirmed successfully."
              : "Refund request created.",
        });
        onSuccess?.();
        return;
      }

      const { split_bill, ...restValues } = values;

      if (split_bill) {
        const totalAmount = Math.abs(restValues.amount ?? 0);
        const validationError = validateSplitBill(totalAmount, splitParticipants);
        if (validationError) {
          setSplitBillError(validationError);
          setStatus({ type: "error", text: validationError });
          return;
        }

        // General N-Person Split Bill Logic
        const myShare = splitParticipants.find(p => p.personId === "me" || p.name.toLowerCase() === "me (mine)");
        const otherParticipants = splitParticipants.filter(p => p.personId !== "me" && p.name.toLowerCase() !== "me (mine)");

        // Determine the main transaction's amount.
        // If "Me" is a participant, the main transaction is my share.
        // If "Me" is not a participant (e.g., I'm just paying for others), the main transaction amount is 0.
        const myAmount = myShare ? myShare.amount : 0;

        // CRITICAL: Check if editing existing split bill to prevent duplicate children
        // Support both new (is_split_bill) and legacy (is_two_person_split_lend) flags
        const isEditingExistingSplitBill = mode === 'edit' &&
          (initialValues?.metadata?.is_split_bill === true || initialValues?.metadata?.is_two_person_split_lend === true) &&
          transactionId;

        if (isEditingExistingSplitBill) {
          // This is an EDIT of existing split bill parent
          // DO NOT create new children - they already exist
          // Just update the parent transaction
          console.log("[Split Bill] Editing existing split bill parent - skipping child creation");

          await updateTransaction(transactionId, {
            occurred_at: restValues.occurred_at?.toISOString() ?? new Date().toISOString(),
            type: restValues.type === "repayment" ? "income" : (restValues.type === "quick-people" ? "expense" : restValues.type) as any,
            amount: myAmount,
            source_account_id: restValues.source_account_id!,
            category_id: restValues.category_id ?? undefined,
            shop_id: restValues.shop_id ?? undefined,
            note: restValues.note || "Split Bill",
            tag: restValues.tag,
            person_id: null,
            metadata: {
              ...(initialValues?.metadata || {}),
              is_split_bill: true,
              original_total_amount: totalAmount,
              split_participants_count: splitParticipants.length,
              my_share: myAmount
            },
          });
          router.refresh();
          setStatus({ type: "success", text: "Split bill updated successfully!" });
          setIsSubmitting(false);
          if (onSuccess) onSuccess();
          return;
        }

        // 1. Create Parent Transaction (My Expense Share)
        const parentExpensePayload: Parameters<typeof createTransaction>[0] = {
          occurred_at: restValues.occurred_at?.toISOString() ?? new Date().toISOString(),
          type: "expense", // ✅ Keep as expense (Total Bill)
          amount: totalAmount, // ✅ Parent keeps TOTAL amount (User Request for Recon)
          source_account_id: restValues.source_account_id!,
          category_id: restValues.category_id ?? undefined,
          shop_id: restValues.shop_id ?? undefined,
          note: restValues.note || "Split Bill",
          tag: restValues.tag,
          person_id: null,
          metadata: {
            ...(restValues.installment_plan_id ? { installment_id: restValues.installment_plan_id } : {}),
            ...(initialValues?.metadata || {}),
            is_split_bill: true,
            original_total_amount: totalAmount,
            split_participants_count: splitParticipants.length,
            my_share: myAmount // Keep track of my real share
          },
          is_installment: isInstallment,
          installment_plan_id: restValues.installment_plan_id ?? undefined,
          cashback_share_percent: Number(restValues.cashback_share_percent ?? 0) / 100,
          cashback_share_fixed: Number(restValues.cashback_share_fixed ?? 0),
          cashback_mode: (restValues.cashback_mode === 'fixed' ? 'real_fixed' :
            restValues.cashback_mode === 'percent' ? 'real_percent' :
              restValues.cashback_mode) as any,
        };

        // 1. Create OR Update Parent Transaction (My Expense Share)

        let mainTxnId = transactionId; // If editing, target the current ID

        if (mode === 'edit' && transactionId) {
          // UPDATE existing transaction to become the Split Bill Parent
          await updateTransaction(transactionId, parentExpensePayload);
          // mainTxnId remains transactionId
        } else {
          // CREATE new split bill parent
          const newId = await createTransaction(parentExpensePayload);
          if (!newId) {
            setStatus({ type: "error", text: "Failed to create main split transaction." });
            setIsSubmitting(false);
            return;
          }
          mainTxnId = newId;
        }

        // 2. Create Lend Transactions for OTHER participants only
        // (Me is already the parent expense, no need for separate transaction)
        const othersToCreate = otherParticipants;

        let failures = 0;

        for (const p of othersToCreate) {
          // Find their debt account
          let debtAccId = debtAccountByPerson.get(p.personId);

          // ... (keep finding debt account logic if it was here, assume it's safe to continue loop)
          // If debtAccId logic is inside loop, strict adherence to original code flow is needed. 
          // Re-inserting the loop content but with fixed NOTE:

          if (!debtAccId) {
            // Try to find existing debt account
            const { data: accounts } = await supabase
              .from("accounts")
              .select("id")
              .eq("person_id", p.personId)
              .eq("type", "debt")
              .limit(1);

            if (accounts && accounts.length > 0) {
              debtAccId = accounts[0].id;
              debtAccountByPerson.set(p.personId, debtAccId!);
            } else {
              // Create new debt account if needed
              const personName = splitParticipants.find(sp => sp.personId === p.personId)?.name || "Unknown";
              const newAccId = await ensureDebtAccountAction(p.personId, personName);
              if (newAccId) {
                debtAccId = newAccId;
                debtAccountByPerson.set(p.personId, debtAccId);
              }
            }
          }

          if (debtAccId) {
            const childPayload: Parameters<typeof createTransaction>[0] = {
              occurred_at: restValues.occurred_at?.toISOString() ?? new Date().toISOString(),
              type: "debt", // Lending is 'debt' type
              amount: p.amount,
              source_account_id: restValues.source_account_id!, // Money leaves my account
              target_account_id: undefined,
              category_id: undefined, // Usually no category for lending? Or allow?
              shop_id: undefined,
              note: restValues.note || "Split Bill", // ✅ Use Original Note
              tag: restValues.tag,
              person_id: p.personId,
              metadata: {
                parent_transaction_id: mainTxnId,
                is_split_share: true,
                // store link to main expense if needed
                linked_expense_id: mainTxnId,
                skip_wallet_deduction: true // Signal for future balance logic
              },
              cashback_share_percent: 0,
              cashback_share_fixed: 0,
              cashback_mode: 'none_back' as any
            };

            await createTransaction(childPayload);
          } else {
            console.error(`Could not find/create debt account for person ${p.personId}`);
            failures++;
          }
        }
        if (failures > 0) {
          // We warn but don't fail completely since main txn succeeded
          console.warn(`[Split Bill] Failed to create ${failures} lend transactions.`);
        }

        router.refresh();
        form.reset({
          ...baseDefaults,
          occurred_at: new Date(),
          amount: 0,
          note: "",
          tag: defaultTag ?? generateTag(new Date()),
          source_account_id: defaultSourceAccountId ?? undefined,
          category_id: undefined,
          person_id: undefined,
          debt_account_id: defaultDebtAccountId ?? undefined,
          shop_id: undefined,
          cashback_share_percent: undefined,
          cashback_share_fixed: undefined,
          split_bill: false,
        });
        setManualTagMode(Boolean(defaultTag));
        setIsInstallment(false);
        setSplitGroupId(undefined);
        setSplitParticipants([]);
        setSplitBillAutoSplit(true);
        setSplitBillError(null);

        setCashbackPreview(null);
        setStatus({ type: "success", text: "Split bill created successfully!" });
        onSuccess?.({ id: mainTxnId });
        setIsSubmitting(false);
        return;
      }



      const rawPercent = Number(restValues.cashback_share_percent ?? 0);

      // Check if this is a group debt repayment and append payer name to note
      const selectedPerson = restValues.person_id
        ? personMap.get(restValues.person_id)
        : null;
      const isGroupDebt =
        selectedPerson?.name?.toLowerCase().includes("clt") ||
        selectedPerson?.name?.toLowerCase().includes("group");

      let finalNote = restValues.note ?? "";
      if (
        (restValues.type === "repayment" || restValues.type === "debt") &&
        isGroupDebt &&
        payerName.trim()
      ) {
        finalNote = `${finalNote} (paid by ${payerName.trim()})`;
      }



      // Check if this is a split bill parent (for edit mode)
      // Support both new (is_split_bill) and legacy (is_two_person_split_lend) flags
      const isSplitBillParent = initialValues?.metadata?.is_split_bill === true ||
        initialValues?.metadata?.is_two_person_split_lend === true;

      const payload: CreateTransactionInput = {
        ...restValues,
        type: (restValues.type === "quick-people" ? "expense" : restValues.type) as any,
        source_account_id: restValues.source_account_id!,
        occurred_at: restValues.occurred_at?.toISOString() ?? new Date().toISOString(),
        shop_id: restValues.shop_id ?? undefined,
        note: finalNote,
        // CRITICAL: Clear person_id for split bill parent to avoid duplicate Sheet entries
        person_id: isSplitBillParent ? null : (restValues.person_id ?? undefined),
        destination_account_id:
          restValues.type === "income"
            ? restValues.source_account_id
            : undefined,
        is_installment: isInstallment,
        cashback_share_percent: rawPercent / 100, // Always divide by 100 to store as decimal (0.08 for 8%)
        metadata: {
          ...(restValues.installment_plan_id
            ? { installment_id: restValues.installment_plan_id }
            : {}),
          ...(initialValues?.metadata || {}),
          // CRITICAL: Preserve is_split_bill flag for split bill parents
          ...(isSplitBillParent ? { is_split_bill: true } : {}),
          // Sprint 6: Persist Bulk Allocation details
          ...(transactionType === "repayment" && bulkRepayment && allocationPreview
            ? {
              bulk_allocation: {
                total_allocated: allocationPreview.totalAllocated,
                debts: allocationPreview.paidDebts.map((p) => ({
                  id: p.transaction.id,
                  amount: p.allocatedAmount,
                  tag: p.transaction.tag,
                  note: p.transaction.note ? p.transaction.note.substring(0, 20) : undefined
                  // original_amount: p.transaction.amount (optional for audit)
                }))
              }
            }
            : {}
          ),
        },
        cashback_mode: (restValues.cashback_mode === 'fixed' ? 'real_fixed' :
          restValues.cashback_mode === 'percent' ? 'real_percent' :
            restValues.cashback_mode) as any,
      };



      console.log("[TransactionForm] Submitting payload:", {
        isInstallmentState: isInstallment,
        payloadIsInstallment: payload.is_installment,
        transactionId,
      });

      const result = transactionId
        ? await updateTransaction(transactionId, payload)
        : await createTransaction(payload);

      if (result) {
        setStatus({
          type: "success",
          text: isEditMode
            ? "Transaction updated successfully."
            : "Transaction created successfully.",
        });

        // router.refresh(); // Moved to startTransition below
        if (isEditMode) {
          // Construct Optimistic Transaction
          const optAccount = sourceAccountsState.find(a => a.id === payload.source_account_id) || { id: payload.source_account_id, name: 'Unknown', type: 'checking', image_url: null } as unknown as Account;
          const optCategory = categories.find(c => c.id === payload.category_id) || { id: payload.category_id || '', name: 'Uncategorized', type: 'expense', icon: null } as Category;
          const optPerson = people.find(p => p.id === payload.person_id);
          const optShop = shops?.find(s => s.id === payload.shop_id);
          // Normalize Amount for Display (Optimistic)
          // The table logic handles sign. We should pass raw amount or normalized?
          // Table expects `amount` to be signed based on type.
          // Service `normalizeAmountForType` does this.
          // We can approximate it here:
          let finalAmount = Math.abs(payload.amount);
          if (payload.type === 'expense' || payload.type === 'transfer') finalAmount = -finalAmount;
          if (payload.type === 'debt') finalAmount = -finalAmount; // Lending is negative flow

          const optimisticTxn: TransactionWithDetails = {
            id: transactionId || 'temp-id',
            occurred_at: payload.occurred_at,
            amount: finalAmount,
            original_amount: finalAmount, // Approximate
            type: payload.type,
            status: 'posted',
            note: payload.note || null,
            tag: payload.tag || null,
            account_id: payload.source_account_id,
            category_id: payload.category_id || null,
            person_id: payload.person_id || null,
            shop_id: payload.shop_id || null,
            target_account_id: payload.target_account_id || payload.debt_account_id || null, // debt_account_id is usually mapped to target_account_id in service

            // Relations
            account: optAccount,
            category: optCategory,
            people: optPerson ? { id: optPerson.id, name: optPerson.name, image_url: optPerson.image_url } : undefined,
            shop: optShop ? { id: optShop.id, name: optShop.name, image_url: optShop.image_url } : undefined,

            // Cashback (Approximate)
            cashback_share_percent: payload.cashback_share_percent,
            cashback_share_fixed: payload.cashback_share_fixed,
            final_price: finalAmount, // Complex calc omitted, table updates will fix exact value.

            created_at: new Date().toISOString(),
            // Add other fields as needed for Table display
            transaction_history: [],
            metadata: payload.metadata || null,
          };

          // CRITICAL: Reset submitting state BEFORE calling onSuccess to allow modal to close
          setIsSubmitting(false);

          onSuccess?.(optimisticTxn);
          startTransition(() => {
            router.refresh();
          });
          return;
        }
        form.reset({
          ...baseDefaults,
          occurred_at: new Date(),
          amount: 0,
          note: "",
          tag: defaultTag ?? generateTag(new Date()),
          source_account_id: defaultSourceAccountId ?? undefined,
          category_id: undefined,
          person_id: undefined,
          debt_account_id: defaultDebtAccountId ?? undefined,
          shop_id: undefined,
          cashback_share_percent: undefined,
          cashback_share_fixed: undefined,
          split_bill: false,
        });
        setManualTagMode(Boolean(defaultTag));
        setIsInstallment(false);
        setSplitGroupId(undefined);
        setSplitParticipants([]);
        setSplitBillAutoSplit(true);
        setSplitBillError(null);
        setSplitPersonInput("");
        setSplitPersonError(null);
        applyDefaultPersonSelection();
        onSuccess?.(); // Create mode - unlikely to optimize table addition yet, just refresh.
        startTransition(() => {
          router.refresh();
        });
      } else {
        setStatus({
          type: "error",
          text: "Failed to create transaction.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
    register,
    watch,
  } = form;

  // Watch for installment toggle
  const watchedIsInstallment = useWatch({ control, name: "is_installment" });

  useEffect(() => {
    if (transactionType === ("repayment")) {
      // Clear shop_id in repayment mode so the placeholder "To: Account" shows up
      form.setValue("shop_id", "", { shouldDirty: false });
    }
  }, [transactionType, form]);

  useEffect(() => {
    if (isEditMode) return;

    const currentCategoryId = form.getValues("category_id");

    // Only auto-set category if it's currently empty
    if (transactionType === "debt" && !currentCategoryId) {
      const peopleShoppingCat = categories.find(
        (c) => c.name === "People Shopping" || c.name === "Shopping",
      );
      if (peopleShoppingCat) {
        console.log(
          "[Category Auto-Set] Setting category to People Shopping/Shopping for debt type",
        );
        form.setValue("category_id", peopleShoppingCat.id, { shouldDirty: false });
      }
      const shopeeShop = shops.find((s) => s.name === "Shopee");
      if (shopeeShop) {
        form.setValue("shop_id", shopeeShop.id, { shouldDirty: false });
      }
    } else if (transactionType === "repayment" && !currentCategoryId) {
      const repaymentCatId = "e0000000-0000-0000-0000-000000000097";
      if (categories.some((c) => c.id === repaymentCatId)) {
        console.log(
          "[Category Auto-Set] Setting category to Repayment for repayment type",
        );
        form.setValue("category_id", repaymentCatId, { shouldDirty: false });
      } else {
        const repaymentCat = categories.find(
          (c) => c.name === "Thu nợ người khác" || c.name === "Repayment",
        );
        if (repaymentCat) {
          console.log(
            "[Category Auto-Set] Setting category to Thu nợ người khác for repayment type",
          );
          form.setValue("category_id", repaymentCat.id, { shouldDirty: false });
        }
      }
    } else if (transactionType === "transfer" && !currentCategoryId) {
      // Auto-set Money Transfer category
      const moneyTransferId = "e0000000-0000-0000-0000-000000000080";
      form.setValue("category_id", moneyTransferId, { shouldDirty: false });
    } else if (transactionType === "income" && !currentCategoryId) {
      // Auto-set Income category if available
      const incomeCat = categories.find(
        (c) => c.name === "Income" || c.name === "Thu nhập" || c.name === "Salary"
      );
      if (incomeCat) {
        form.setValue("category_id", incomeCat.id, { shouldDirty: false });
      }
    }
  }, [transactionType, categories, shops, form, isEditMode, allAccounts]);

  const watchedCategoryId = useWatch({
    control,
    name: "category_id",
  });

  const watchedAccountId = useWatch({
    control,
    name: "source_account_id",
  });

  const watchedShopId = useWatch({
    control,
    name: "shop_id",
  });

  const watchedAmount = useWatch({
    control,
    name: "amount",
  });

  const splitTotalAmount = useMemo(
    () =>
      typeof watchedAmount === "number" && Number.isFinite(watchedAmount)
        ? Math.abs(watchedAmount)
        : 0,
    [watchedAmount],
  );

  const watchedDate = useWatch({
    control,
    name: "occurred_at",
  });



  // Sprint 5 Refine: Persist defaults for Repay Account & Person
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Auto-fill Account for Repayment from history
    // Fix: Always load history when entering Repayment mode
    if (transactionType === "repayment") {
      const lastRepayAccount = localStorage.getItem("moneyflow_last_repay_account_id");
      // Ensure account exists in current list? Optional but safer.
      if (lastRepayAccount) {
        form.setValue("source_account_id", lastRepayAccount, { shouldDirty: false });
      }
    }

    // Auto-fill Person from history (if not provided via props/defaults)
    if (!watchedPersonId) {
      const lastPerson = localStorage.getItem("moneyflow_last_person_id");
      if (lastPerson) {
        form.setValue("person_id", lastPerson, { shouldDirty: false });
      }
    }
  }, [transactionType]); // Run when type switches or mounts

  // Save Defaults
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (transactionType === "repayment" && watchedAccountId) {
      localStorage.setItem("moneyflow_last_repay_account_id", watchedAccountId);
    }
  }, [transactionType, watchedAccountId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (watchedPersonId) {
      localStorage.setItem("moneyflow_last_person_id", watchedPersonId);
    }
  }, [watchedPersonId]);

  // Sprint 5: Fetch outstanding debts for bulk repayment
  useEffect(() => {
    if (transactionType === "repayment" && watchedPersonId && bulkRepayment) {
      getOutstandingDebts(watchedPersonId, transactionId).then((debts) => {
        setOutstandingDebts(debts);
      });
    } else {
      setOutstandingDebts([]);
    }
  }, [transactionType, watchedPersonId, bulkRepayment, transactionId]);

  // Sprint 5 Refine: Manual Allocation Overrides


  const handleOverrideChange = (transactionId: string, amount: number) => {
    setAllocationOverrides(prev => ({
      ...prev,
      [transactionId]: amount
    }));
  };

  // Sprint 6 Restore Logic: Moved to later effect with REF gate


  // Sprint 5: Calculate allocation preview
  useEffect(() => {
    // Reset overrides if critical context changes
    // Actually, we usually want to keep them if just amount changes?
    // If person changes, definitely reset.
    // If Bulk mode toggled off, reset?
  }, [watchedPersonId, bulkRepayment]);
  // Let's rely on manual reset or simple effect specific to reset.

  useEffect(() => {
    if (transactionType !== "repayment" || !watchedPersonId || !bulkRepayment) {
      setAllocationOverrides({});
    }
  }, [transactionType, watchedPersonId, bulkRepayment]);

  useEffect(() => {
    if (!bulkRepayment || outstandingDebts.length === 0 || !watchedAmount) {
      setAllocationPreview(null);
      return;
    }

    // Filter out ignored (deleted) debts
    const activeDebts = outstandingDebts.filter(d => !ignoredDebtIds.has(d.id));

    const allocation = allocateTransactionRepayment(
      activeDebts,
      Math.abs(watchedAmount),
      allocationOverrides // Pass overrides
    );
    setAllocationPreview(allocation);
  }, [bulkRepayment, outstandingDebts, watchedAmount, allocationOverrides, ignoredDebtIds]);

  // Sync Shop with Account for Repayment - One-way sync on Account Change
  useEffect(() => {
    if (transactionType === "repayment" && watchedAccountId) {
      const account = allAccounts.find(a => a.id === watchedAccountId);
      if (account) {
        // Try to find a shop with the precise account name
        const matchingShop = shops.find(s => s.name.toLowerCase() === account.name.toLowerCase());

        // If found, select it. If not found, clear it so "To: Account Name" placeholder shows
        if (matchingShop) {
          form.setValue("shop_id", matchingShop.id, { shouldDirty: false });
        } else {
          // Clear it to trigger the placeholder state "To: [Account Name]"
          form.setValue("shop_id", "", { shouldDirty: false });
        }
      }
    }
  }, [transactionType, watchedAccountId, allAccounts, shops, form]);

  useEffect(() => {
    let active = true;
    const loadRecentAccounts = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from("transactions")
          .select("account_id, target_account_id, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Failed to load recent accounts:", error);
          return;
        }

        const ids: string[] = [];
        const pushUnique = (id?: string | null) => {
          if (!id || ids.includes(id)) return;
          ids.push(id);
        };

        (data ?? []).forEach((row: any) => {
          pushUnique(row.account_id);
          pushUnique(row.target_account_id);
        });

        if (active) {
          setRecentAccountIds(ids);
        }
      } catch (err) {
        console.error("Failed to load recent accounts:", err);
      }
    };

    loadRecentAccounts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!watchedDate) {
      setDateInputValue("");
      return;
    }
    setDateInputValue(format(watchedDate, "yyyy-MM-dd"));
  }, [watchedDate]);



  const watchedSplitBill = useWatch({
    control,
    name: "split_bill",
  });

  const isSplitBill = Boolean(watchedSplitBill);

  const buildSplitParticipants = useCallback(
    (members: Person[], totalAmount: number): SplitBillParticipant[] => {
      const amounts = getEvenSplitAmounts(totalAmount, members.length);
      return members.map((person, index) => ({
        personId: person.id,
        name: person.name,
        amount: amounts[index] ?? 0,
        paidBefore: 0,
        paidBy: defaultPayerName,
        note: "",
      }));
    },
    [defaultPayerName, getEvenSplitAmounts],
  );

  const resplitParticipants = useCallback(
    (participants: SplitBillParticipant[], totalAmount: number) => {
      const amounts = getEvenSplitAmounts(totalAmount, participants.length);
      return participants.map((participant, index) => {
        const paidBefore = participant.paidBefore ?? 0;
        const baseAmount = amounts[index] ?? 0;
        return {
          ...participant,
          paidBefore,
          amount: Math.max(0, baseAmount - paidBefore),
        };
      });
    },
    [getEvenSplitAmounts],
  );

  const buildSingleSplitParticipant = useCallback(
    (person: Person, totalAmount: number, paidBy: string) => [
      {
        personId: person.id,
        name: person.name,
        amount: totalAmount,
        paidBefore: 0,
        paidBy,
        note: "",
      },
    ],
    [],
  );

  const validateSplitBill = useCallback(
    (totalAmount: number, participants: SplitBillParticipant[]) => {
      if (participants.length === 0) {
        return "Add at least one participant for split bill.";
      }

      const missingPerson = participants.find(
        (participant) => !participant.personId,
      );
      if (missingPerson) {
        return "Each split row must include a person.";
      }

      const missingDebtAccounts = participants
        .filter((participant) => !debtAccountByPerson.get(participant.personId))
        .map((participant) => participant.name);
      if (missingDebtAccounts.length > 0) {
        return `Missing debt accounts for: ${missingDebtAccounts.join(", ")}`;
      }

      const invalidAmount = participants.find(
        (participant) =>
          !Number.isFinite(participant.amount) || participant.amount < 0,
      );
      if (invalidAmount) {
        return "Split amounts must be zero or greater.";
      }

      const invalidPaidBefore = participants.find((participant) => {
        if (participant.paidBefore === undefined) return false;
        return !Number.isFinite(participant.paidBefore) || participant.paidBefore < 0;
      });
      if (invalidPaidBefore) {
        return "Paid before must be zero or greater.";
      }

      const sum = participants.reduce(
        (acc, participant) =>
          acc + (participant.amount || 0) + (participant.paidBefore || 0),
        0,
      );
      if (Math.abs(sum - totalAmount) > 0.01) {
        return "Split total plus paid before must match the main amount.";
      }

      return null;
    },
    [debtAccountByPerson],
  );

  // Phase 7.3: Cashback Simulation Effect
  useEffect(() => {
    // Only run if expenses and valid amount/account
    const type = form.getValues("type");
    const accountId = form.getValues("source_account_id");
    const categoryId = form.getValues("category_id");
    const amount = form.getValues("amount");
    const occurredAt = form.getValues("occurred_at");

    if (type !== "expense" || !accountId || !amount || amount <= 0) {
      setCashbackPreview(null);
      return;
    }

    // Determine if account is credit card
    const account = allAccounts.find((a) => a.id === accountId);
    if (account?.type !== "credit_card") {
      setCashbackPreview(null);
      return;
    }

    // Debounce
    const timeoutId = setTimeout(async () => {
      try {
        const result = await previewCashbackAction(
          accountId,
          amount,
          categoryId,
          occurredAt ? occurredAt.toISOString() : undefined,
        );
        setCashbackPreview(result);
      } catch (err) {
        console.error("Simulate Cashback Error:", err);
        setCashbackPreview(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    watchedAmount,
    watchedCategoryId,
    watchedAccountId,
    watchedDate ? watchedDate.getTime() : 0,
    transactionType,
    // form and allAccounts removed to prevent infinite loops; they are stable enough for this effect's purpose
  ]);

  // Sprint 6 Restore Logic: Apply overrides from metadata once debts are loaded
  // Use a ref to track if we've already restored to prevent re-running on every render
  const restoreAttemptedRef = useRef(false);
  useEffect(() => {
    if (restoreAttemptedRef.current) return;

    if (
      initialValues?.metadata?.bulk_allocation &&
      outstandingDebts.length > 0 &&
      Object.keys(allocationOverrides).length === 0
    ) {
      restoreAttemptedRef.current = true;
      const savedDebts = initialValues.metadata.bulk_allocation.debts as { id: string, amount: number }[];
      const restoredOverrides: Record<string, number> = {};

      savedDebts.forEach(d => {
        restoredOverrides[d.id] = d.amount;
      });

      outstandingDebts.forEach(d => {
        const saved = savedDebts.find(s => s.id === d.id);
        if (saved) {
          restoredOverrides[d.id] = saved.amount;
        } else {
          restoredOverrides[d.id] = 0; // Explicitly do not pay others
        }
      });

      if (Object.keys(restoredOverrides).length > 0) {
        setAllocationOverrides(restoredOverrides);
      }
    }
  }, [outstandingDebts, initialValues]); // We use the ref to gate this, so dependencies matter less, but still good to keep.

  const watchedDebtAccountId = useWatch({
    control,
    name: "debt_account_id",
  });

  const watchedCashbackPercent = useWatch({
    control,
    name: "cashback_share_percent",
  });

  const watchedCashbackFixed = useWatch({
    control,
    name: "cashback_share_fixed",
  });

  const watchedCashbackMode = useWatch({
    control,
    name: "cashback_mode",
  });

  const categoryOptions = useMemo(() => {
    if (isRefundMode && refundCategoryId) {
      const refundCat =
        categories.find((cat) => cat.id === refundCategoryId) ??
        categories.find((cat) =>
          (cat.name ?? "").toLowerCase().includes("refund"),
        ) ??
        categories.find((cat) =>
          (cat.name ?? "").toLowerCase().includes("pending"),
        ) ??
        null;
      return [
        {
          value: refundCategoryId,
          label: refundCat?.name ?? "Refund",
          description: refundCat?.type === "income" ? "Income" : "Expense",
          searchValue: refundCat?.name ?? "Refund",
          icon: refundCat?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={refundCat.image_url}
              alt={refundCat.name}
              className="h-5 w-5 object-contain rounded-none"
            />
          ) : (
            <span className="text-xl">{refundCat?.icon || "📦"}</span>
          ),
        },
      ];
    }

    return categories
      .filter((cat) => {
        if (cat.id === watchedCategoryId) return true;

        const kind = cat.kind ?? null;
        const allowMissingKind = kind === null;

        // Income tab: type=income AND kind=internal
        if (transactionType === "income") {
          return cat.type === "income" && (kind === "internal" || allowMissingKind);
        }

        // Expense tab: type=expense AND kind=external
        if (transactionType === "expense") {
          return cat.type === "expense" && (kind === "external" || allowMissingKind);
        }

        // Lending tab: type=expense AND kind=external
        if (transactionType === "debt") {
          return cat.type === "expense" && (kind === "external" || allowMissingKind);
        }

        // Repay tab: type=income AND kind=external
        if (transactionType === "repayment") {
          return cat.type === "income" && (kind === "external" || allowMissingKind);
        }

        // Transfer tab: type=transfer (kind doesn't matter)
        if (transactionType === "transfer") {
          return cat.type === "transfer";
        }

        return false;
      })
      .map((cat) => {
        const isTransfer = transactionType === "transfer";
        const typeLabel = cat.type === "income" ? "Income" : "Expense";
        const description = isTransfer ? undefined : typeLabel;

        return {
          value: cat.id,
          label: cat.name,
          description: description,
          searchValue: `${cat.name} ${typeLabel}`,
          icon: cat.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cat.image_url}
              alt={cat.name}
              className="h-5 w-5 object-contain rounded-full"
            />
          ) : (
            <span className="text-xl">{cat.icon || "📦"}</span>
          ),
        };
      });
  }, [
    categories,
    transactionType,
    isRefundMode,
    refundCategoryId,
    watchedCategoryId,
  ]);

  // Smart Reset: Clear category/shop if current selection is invalid for the new type
  useEffect(() => {
    const currentCatId = form.getValues("category_id");
    if (currentCatId) {
      // Check if current category is present in the AVAILABLE options for this type
      const isValid = categoryOptions.some((c) => c.value === currentCatId);
      if (!isValid) {
        console.log(
          "[Auto Reset] Clearing invalid category for type:",
          transactionType,
        );
        form.setValue("category_id", "", { shouldDirty: false });
        form.setValue("shop_id", "", { shouldDirty: false }); // Also clear shop as it depends on category
      }
    }
  }, [transactionType, categoryOptions, form, shopsState, isEditMode]);

  const debugCategoryClick = useCallback(() => {
    console.log("[Refund Category Debug]", {
      isRefundMode,
      categoryValue: form.getValues("category_id"),
      refundCategoryId,
      categoryOptions,
    });
  }, [categoryOptions, form, isRefundMode, refundCategoryId]);

  const { accountOptions, accountOptionGroups } = useMemo(() => {
    const accountTypes = {
      credit: new Set(["credit_card"]),
      account: new Set(["bank", "cash", "ewallet", "stock"]),
      save: new Set(["savings", "investment", "asset"]),
    };

    const matchesFilter = (acc: Account) => {
      if (accountFilter === "credit") return accountTypes.credit.has(acc.type);
      if (accountFilter === "account") return accountTypes.account.has(acc.type);
      if (accountFilter === "other") {
        return (
          !accountTypes.credit.has(acc.type) &&
          !accountTypes.account.has(acc.type)
        );
      }
      return true;
    };

    const eligibleAccounts = sourceAccountsState.filter((acc) => {
      if (acc.type === "system" || acc.type === "debt") return false;

      // Global Search: If searching (and search term is long enough), ignore tabs
      // NOTE: accountSearch is passed from Combobox via state
      if (accountSearch && accountSearch.trim().length > 0) return true;

      // Otherwise, respect the tab filter
      if (!matchesFilter(acc)) return false;

      if (
        acc.id === REFUND_PENDING_ACCOUNT_ID &&
        (!isRefundMode || refundStatus !== "pending")
      )
        return false;

      // ALWAYS include the currently selected account
      if (acc.id === form.getValues("source_account_id")) return true;

      if (transactionType === "transfer" && acc.type === "credit_card")
        return false;
      return true;
    });

    const buildItem = (acc: Account) => {
      const displayBalance =
        acc.type === "credit_card"
          ? getDisplayBalance(acc, "family_tab", sourceAccountsState)
          : acc.current_balance ?? 0;
      const typeLabel = acc.type.replace("_", " ");
      return {
        value: acc.id,
        label: acc.name,
        description: `${typeLabel} - ${numberFormatter.format(displayBalance)}`,
        searchValue: `${acc.name} ${typeLabel} ${displayBalance}`,
        icon: acc.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={acc.image_url}
            alt={acc.name}
            className="h-5 w-5 object-contain rounded-none"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-none bg-slate-100 text-[11px] font-semibold text-slate-600">
            {getAccountInitial(acc.name)}
          </span>
        ),
      };
    };

    const recentAccounts = recentAccountIds
      .map((id) => eligibleAccounts.find((acc) => acc.id === id))
      .filter((acc): acc is Account => Boolean(acc))
      .slice(0, 6);
    const recentSet = new Set(recentAccounts.map((acc) => acc.id));

    const creditAccounts = eligibleAccounts.filter(
      (acc) => accountTypes.credit.has(acc.type) && !recentSet.has(acc.id),
    );
    const accountAccounts = eligibleAccounts.filter(
      (acc) => accountTypes.account.has(acc.type) && !recentSet.has(acc.id),
    );
    const saveAccounts = eligibleAccounts.filter(
      (acc) => accountTypes.save.has(acc.type) && !recentSet.has(acc.id),
    );
    const otherAccounts = eligibleAccounts.filter(
      (acc) =>
        !recentSet.has(acc.id) &&
        !accountTypes.credit.has(acc.type) &&
        !accountTypes.account.has(acc.type) &&
        !accountTypes.save.has(acc.type),
    );

    let groups = [];
    if (accountFilter === "all") {
      groups = [
        { label: "Recent", items: recentAccounts.map(buildItem) },
        { label: "Credit", items: creditAccounts.map(buildItem) },
        { label: "Account", items: accountAccounts.map(buildItem) },
        { label: "Save", items: saveAccounts.map(buildItem) },
        { label: "Others", items: otherAccounts.map(buildItem) },
      ];
    } else if (accountFilter === "credit") {
      groups = [
        { label: "Recent", items: recentAccounts.map(buildItem) },
        { label: "Credit", items: creditAccounts.map(buildItem) },
      ];
    } else if (accountFilter === "account") {
      groups = [
        { label: "Recent", items: recentAccounts.map(buildItem) },
        { label: "Account", items: accountAccounts.map(buildItem) },
      ];
    } else {
      groups = [
        { label: "Recent", items: recentAccounts.map(buildItem) },
        { label: "Others", items: otherAccounts.map(buildItem) },
      ];
    }

    const filteredGroups = groups.filter((group) => group.items.length > 0);
    const items = filteredGroups.flatMap((group) => group.items);

    return { accountOptions: items, accountOptionGroups: filteredGroups };
  }, [
    sourceAccountsState,
    recentAccountIds,
    accountFilter,
    isRefundMode,
    refundStatus,
    transactionType,
  ]);

  const destinationAccountOptions = useMemo(() => {
    const filteredAccounts = allAccounts.filter((acc) => {
      if (acc.type === "system") return false;
      // Allow debt accounts only for relevant transaction types or if currently selected
      if (acc.type === "debt") {
        const isRelatedType = transactionType === "debt" || transactionType === "repayment";
        const isCurrent = form.getValues("debt_account_id") === acc.id;
        if (!isRelatedType && !isCurrent) return false;
      }
      if (watchedAccountId && acc.id === watchedAccountId) return false;
      return true;
    });

    return filteredAccounts.map((acc) => {
      const displayBalance =
        acc.type === "credit_card"
          ? getDisplayBalance(acc, "family_tab", allAccounts)
          : acc.current_balance ?? 0;
      return {
        value: acc.id,
        label: acc.name,
        description: numberFormatter.format(displayBalance),
        searchValue: `${acc.name} ${acc.type.replace("_", " ")} ${displayBalance}`,
        icon: acc.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={acc.image_url}
            alt={acc.name}
            className="h-5 w-5 object-contain rounded-none"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-none bg-slate-100 text-[11px] font-semibold text-slate-600">
            {getAccountInitial(acc.name)}
          </span>
        ),
      };
    });
  }, [allAccounts, watchedAccountId]);

  const personOptions = useMemo(
    () =>
      peopleState
        .filter((person) => !person.is_group)
        .map((person) => ({
          value: person.id,
          label: person.name,
          description: person.email || "No email",
          searchValue: `${person.name} ${person.email ?? ""}`.trim(),
          icon: person.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.image_url}
              alt={person.name}
              className="h-5 w-5 object-contain rounded-none"
            />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-none bg-slate-100 text-[11px] font-semibold text-slate-600">
              {getAccountInitial(person.name)}
            </span>
          ),
        })),
    [peopleState],
  );

  const splitPersonCandidates = useMemo(
    () => peopleState.filter((person) => !person.is_group),
    [peopleState],
  );

  const splitPersonSuggestions = useMemo(() => {
    const query = splitPersonInput.trim().toLowerCase();
    const selectedIds = new Set(splitParticipants.map((p) => p.personId));
    const groupMembers = splitGroupId
      ? splitBillGroupMap.get(splitGroupId)?.members ?? []
      : [];

    let baseList = splitGroupId ? groupMembers : splitPersonCandidates;
    baseList = baseList.filter((person) => !selectedIds.has(person.id));

    if (query) {
      baseList = baseList.filter((person) =>
        person.name.toLowerCase().includes(query),
      );
    } else if (!splitGroupId) {
      baseList = [...baseList].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      });
    }

    return baseList.slice(0, 6).map((person) => {
      const groupName = person.group_parent_id
        ? splitBillGroupMap.get(person.group_parent_id)?.name
        : null;
      const hint = splitGroupId
        ? "Group member"
        : groupName
          ? `In ${groupName}`
          : "Single";
      return {
        id: person.id,
        name: person.name,
        hint,
        image_url: person.image_url ?? null,
      };
    });
  }, [
    splitBillGroupMap,
    splitGroupId,
    splitParticipants,
    splitPersonCandidates,
    splitPersonInput,
  ]);

  const splitGroupMemberIds = useMemo(() => {
    if (!splitGroupId) return new Set<string>();
    const members = splitBillGroupMap.get(splitGroupId)?.members ?? [];
    return new Set(members.map((member) => member.id));
  }, [splitBillGroupMap, splitGroupId]);

  const splitExtraParticipants = useMemo(
    () =>
      splitParticipants.filter(
        (participant) => !splitGroupMemberIds.has(participant.personId),
      ),
    [splitGroupMemberIds, splitParticipants],
  );

  const shopOptions = useMemo(() => {
    // Filter shops: if category is selected, only show shops with that default_category_id
    // But user might want to see all shops?
    // User request: "Sửa shop dropdowns: nó chỉ show tương ứng với category đã match" -> Strict filter implied.
    const selectedCategoryId = watchedCategoryId;

    let filteredShops = shopsState;
    if (selectedCategoryId) {
      // Optional: include shops with NO default category too? Or strictly match?
      // Usually 'match' means match.
      filteredShops = shopsState.filter(
        (s) =>
          !s.default_category_id ||
          s.default_category_id === selectedCategoryId ||
          s.id === form.getValues("shop_id"), // ALWAYS keep the currently selected shop
      );
    }

    return filteredShops.map((s) => ({
      value: s.id,
      label: s.name,
      searchValue: s.name,
      // Add icon if image_url exists
      icon: s.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.image_url}
          alt=""
          className="w-5 h-5 rounded-full object-cover"
        />
      ) : (
        <Store className="w-4 h-4 text-slate-400" />
      ),
    }));
  }, [shopsState, watchedCategoryId]);

  const selectedAccount = useMemo(
    () => sourceAccountsState.find((acc) => acc.id === watchedAccountId),
    [sourceAccountsState, watchedAccountId],
  );

  useEffect(() => {
    // CRITICAL FIX: Only auto-set category from shop if:
    // 1. Not in edit mode (user is creating new transaction)
    // 2. Category is currently empty (user hasn't selected anything yet)
    // 3. Shop has a default category
    if (isEditMode) return;
    if (!watchedShopId) return;

    const currentCategoryId = form.getValues("category_id");
    if (currentCategoryId) {
      console.log(
        "[Shop Category] User already selected category, not overriding:",
        currentCategoryId,
      );
      return; // User already selected a category, don't override!
    }

    const shop = shopsState.find((s) => s.id === watchedShopId);
    if (shop?.default_category_id) {
      console.log(
        "[Shop Category] Auto-setting category from shop:",
        shop.name,
        shop.default_category_id,
      );
      form.setValue("category_id", shop.default_category_id, { shouldDirty: false });
    }
  }, [watchedShopId, shopsState, form, isEditMode]);

  useEffect(() => {
    if (!isRefundMode) return;
    if (refundStatus === "pending") {
      form.setValue("source_account_id", REFUND_PENDING_ACCOUNT_ID, {
        shouldValidate: true,
        shouldDirty: false,
      });
      return;
    }
    const preferredAccount =
      (watchedAccountId && watchedAccountId !== REFUND_PENDING_ACCOUNT_ID
        ? watchedAccountId
        : undefined) ??
      defaultSourceAccountId ??
      initialValues?.source_account_id ??
      sourceAccountsState.find((acc) => acc.id !== REFUND_PENDING_ACCOUNT_ID)?.id;

    if (preferredAccount) {
      form.setValue("source_account_id", preferredAccount, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [
    defaultSourceAccountId,
    form,
    initialValues?.source_account_id,
    isRefundMode,
    refundStatus,
    sourceAccountsState,
    watchedAccountId,
  ]);

  useEffect(() => {
    if (!defaultPersonId || isSplitBill) {
      return;
    }
    const currentPerson = form.getValues("person_id");
    const currentDebt = form.getValues("debt_account_id");
    if (currentPerson || currentDebt) {
      return;
    }
    applyDefaultPersonSelection();
  }, [applyDefaultPersonSelection, defaultPersonId, form, isSplitBill]);



  useEffect(() => {
    if (
      transactionType !== "expense" &&
      transactionType !== "debt" &&
      transactionType !== "repayment"
    ) {
      form.setValue("shop_id", undefined, { shouldDirty: false });
    }
  }, [transactionType, form]);

  // Sprint 5: Auto-sync Shop with "To Account" in Repayment mode
  useEffect(() => {
    if (transactionType !== "repayment") return;
    if (!watchedAccountId) {
      form.setValue("shop_id", undefined, { shouldDirty: false });
      return;
    }

    const account = allAccounts.find((acc) => acc.id === watchedAccountId);
    if (!account) return;

    // Find existing shop matching the account name
    const matchingShop = shopsState.find(
      (shop) => shop.name.toLowerCase() === account.name.toLowerCase()
    );

    if (matchingShop) {
      // Auto-select the matching shop
      form.setValue("shop_id", matchingShop.id, { shouldDirty: false });
    } else {
      // Clear shop if no match (user can manually create one if needed)
      form.setValue("shop_id", undefined, { shouldDirty: false });
    }
  }, [transactionType, watchedAccountId, allAccounts, shopsState, form]);

  useEffect(() => {
    if (transactionType === "debt" || transactionType === "repayment") {
      // Allow split bill to remain active for debt/repayment (e.g. split lending)
      return;
    }
    if (form.getValues("split_bill")) {
      form.setValue("split_bill", false, { shouldDirty: true });
    }
  }, [transactionType, form]);

  useEffect(() => {
    if (!isSplitBill || !splitBillAutoSplit) return;
    if (splitParticipants.length === 0) return;
    setSplitParticipants((prev) => resplitParticipants(prev, splitTotalAmount));
  }, [
    isSplitBill,
    splitBillAutoSplit,
    splitParticipants.length,
    splitTotalAmount,
    resplitParticipants,
  ]);

  useEffect(() => {
    if (!isSplitBill) return;
    setSplitBillError(validateSplitBill(splitTotalAmount, splitParticipants));
  }, [isSplitBill, splitParticipants, splitTotalAmount, validateSplitBill]);

  useEffect(() => {
    if (!isSplitBill || transactionType !== "repayment") return;
    const hasPaidBefore = splitParticipants.some(
      (participant) => (participant.paidBefore ?? 0) > 0,
    );
    if (!hasPaidBefore) return;
    setSplitParticipants((prev) =>
      resplitParticipants(
        prev.map((participant) => ({ ...participant, paidBefore: 0 })),
        splitTotalAmount,
      ),
    );
  }, [
    isSplitBill,
    transactionType,
    splitParticipants,
    resplitParticipants,
    splitTotalAmount,
  ]);

  const handleSplitAmountChange = (personId: string, amount: number) => {
    setSplitBillAutoSplit(false);
    setSplitParticipants((prev) =>
      prev.map((participant) =>
        participant.personId === personId
          ? { ...participant, amount }
          : participant,
      ),
    );
  };

  const handleSplitPaidByChange = (personId: string, paidBy: string) => {
    setSplitParticipants((prev) =>
      prev.map((participant) =>
        participant.personId === personId
          ? { ...participant, paidBy }
          : participant,
      ),
    );
  };

  const handleSplitNoteChange = (personId: string, note: string) => {
    setSplitParticipants((prev) =>
      prev.map((participant) =>
        participant.personId === personId
          ? { ...participant, note }
          : participant,
      ),
    );
  };

  const handleSplitPaidBeforeChange = (personId: string, paidBefore: number) => {
    setSplitBillAutoSplit(true);
    setSplitParticipants((prev) =>
      resplitParticipants(
        prev.map((participant) =>
          participant.personId === personId
            ? { ...participant, paidBefore }
            : participant,
        ),
        splitTotalAmount,
      ),
    );
  };

  const updatePersonState = useCallback(
    (personId: string, updates: Partial<Person>) => {
      setPeopleState((prev) =>
        prev.map((person) =>
          person.id === personId ? { ...person, ...updates } : person,
        ),
      );
    },
    [],
  );

  const ensureSplitPersonDebtAccount = useCallback(
    (person: Person) => {
      if (person.debt_account_id) return;
      startEnsuringDebt(async () => {
        const accountId = await ensureDebtAccountAction(person.id, person.name);
        if (accountId) {
          updatePersonState(person.id, { debt_account_id: accountId });
        }
      });
    },
    [startEnsuringDebt, updatePersonState],
  );

  const ensureSplitPersonGroup = useCallback(
    (person: Person) => {
      if (person.is_owner) return;
      if (!splitGroupId) return;
      if (person.group_parent_id === splitGroupId) return;
      startCreatingSplitPerson(async () => {
        const ok = await updatePersonAction(person.id, {
          group_parent_id: splitGroupId,
        });
        if (ok) {
          updatePersonState(person.id, { group_parent_id: splitGroupId });
        }
      });
    },
    [splitGroupId, startCreatingSplitPerson, updatePersonState],
  );

  useEffect(() => {
    if (isSplitBill) {
      setDebtEnsureError(null);
      return;
    }
    if (transactionType !== "debt" && transactionType !== "repayment") {
      setDebtEnsureError(null);
      return;
    }
    if (!watchedPersonId) return;

    const currentVal = form.getValues("debt_account_id");
    const linkedAccountId = debtAccountByPerson.get(watchedPersonId);

    // Aggressive Auto-Pick: If we have a match, force it, even in Edit mode
    if (linkedAccountId) {
      if (currentVal !== linkedAccountId) {
        console.log("[Auto-Pick] Forcing correct debt_account_id:", linkedAccountId);
        form.setValue("debt_account_id", linkedAccountId, {
          shouldValidate: true,
          shouldDirty: false
        });
      }
      return;
    }

    if (currentVal && currentVal !== "") return; // Fallback only if no value set yet

    // Secondary fallback: explicit search in allAccounts
    const person = peopleState.find(p => p.id === watchedPersonId);
    if (person) {
      const likelyName = `Receivable - ${person.name}`;
      const fallbackAccount = allAccounts.find(
        (a) => (a.owner_id === person.id || a.name === likelyName || a.name === person.name) && a.type === "debt"
      );

      if (fallbackAccount) {
        console.log("[Auto-Pick] Found account by fallback search:", fallbackAccount.name);
        form.setValue("debt_account_id", fallbackAccount.id, {
          shouldValidate: true,
          shouldDirty: false
        });
      }
    }
  }, [transactionType, watchedPersonId, debtAccountByPerson, form, allAccounts, peopleState, isSplitBill]);

  // Separate effect for "Ensuring" missing accounts (Async)
  useEffect(() => {
    if (transactionType !== "debt" && transactionType !== "repayment") return;
    if (isSplitBill) return;
    if (!watchedPersonId) return;

    const currentVal = form.getValues("debt_account_id");
    if (currentVal) return;

    const person = peopleState.find(p => p.id === watchedPersonId);
    if (person && !debtAccountByPerson.has(watchedPersonId)) {
      console.log("[Auto-Pick] Truly missing account, triggering ensure...");
      startEnsuringDebt(async () => {
        const accountId = await ensureDebtAccountAction(person.id, person.name);
        if (accountId) {
          updatePersonState(person.id, { debt_account_id: accountId });
          form.setValue("debt_account_id", accountId, { shouldValidate: true, shouldDirty: false });
        }
      });
    }
  }, [transactionType, watchedPersonId, debtAccountByPerson.size, form, peopleState, startEnsuringDebt, updatePersonState, isSplitBill]);

  const handleAddSplitParticipant = useCallback(
    (person: Person) => {
      if (ownerPerson && person.id === ownerPerson.id) {
        setOwnerRemoved(false);
      }
      if (!splitGroupId && person.group_parent_id) {
        setSplitGroupId(person.group_parent_id);
      }
      setSplitParticipants((prev) => {
        // Check for duplicate ID or (if adding owner) duplicate "me"
        if (prev.some((participant) => participant.personId === person.id || (ownerPerson && person.id === ownerPerson.id && participant.personId === 'me'))) {
          return prev;
        }
        const next = [
          ...prev,
          {
            personId: person.id,
            name: person.name,
            amount: 0,
            paidBefore: 0,
            paidBy: defaultPayerName,
            note: "",
          },
        ];
        return resplitParticipants(next, splitTotalAmount);
      });
      ensureSplitPersonGroup(person);
      ensureSplitPersonDebtAccount(person);
      setSplitBillAutoSplit(true);
    },
    [
      defaultPayerName,
      ensureSplitPersonDebtAccount,
      ensureSplitPersonGroup,
      ownerPerson,
      resplitParticipants,
      splitGroupId,
      splitTotalAmount,
    ],
  );

  const ensureOwnerParticipant = useCallback(() => {
    if (transactionType === "repayment") return;
    if (!ownerPerson) return;
    if (ownerRemoved) return;
    setSplitParticipants((prev) => {
      // Check for owner ID or "me" (from auto-fill) to prevent duplicate
      if (prev.some((participant) => participant.personId === ownerPerson.id || participant.personId === 'me')) {
        return prev;
      }
      const next = [
        ...prev,
        {
          personId: ownerPerson.id,
          name: ownerPerson.name,
          amount: 0,
          paidBefore: 0,
          paidBy: defaultPayerName,
          note: "",
        },
      ];
      return resplitParticipants(next, splitTotalAmount);
    });
    ensureSplitPersonDebtAccount(ownerPerson);
  }, [
    defaultPayerName,
    ownerPerson,
    ownerRemoved,
    resplitParticipants,
    splitTotalAmount,
    ensureSplitPersonDebtAccount,
    transactionType,
  ]);

  useEffect(() => {
    if (!isSplitBill || !splitGroupId) return;
    if (splitRepayPersonId) {
      const person = peopleState.find((item) => item.id === splitRepayPersonId);
      if (person) {
        setSplitPersonInput("");
        setSplitPersonError(null);
        const rawAmount = form.getValues("amount");
        const total =
          typeof rawAmount === "number" && Number.isFinite(rawAmount)
            ? Math.abs(rawAmount)
            : 0;
        setSplitParticipants(
          buildSingleSplitParticipant(person, total, person.name),
        );
        setSplitBillAutoSplit(true);
        return;
      }
    }
    const group = splitBillGroupMap.get(splitGroupId);
    if (!group) {
      setSplitParticipants([]);
      return;
    }
    setSplitPersonInput("");
    setSplitPersonError(null);
    const rawAmount = form.getValues("amount");
    const total =
      typeof rawAmount === "number" && Number.isFinite(rawAmount)
        ? Math.abs(rawAmount)
        : 0;
    let members = [...group.members];
    if (transactionType === "repayment" && ownerPerson) {
      members = members.filter((member) => member.id !== ownerPerson.id);
    }
    if (
      transactionType !== "repayment" &&
      ownerPerson &&
      !ownerRemoved &&
      !splitRepayPersonId &&
      !members.some((member) => member.id === ownerPerson.id)
    ) {
      members.push(ownerPerson);
    }
    setSplitParticipants(buildSplitParticipants(members, total));
    setSplitBillAutoSplit(true);
  }, [
    isSplitBill,
    splitGroupId,
    splitBillGroupMap,
    form,
    buildSplitParticipants,
    buildSingleSplitParticipant,
    peopleState,
    ownerPerson,
    ownerRemoved,
    splitRepayPersonId,
    transactionType,
  ]);

  useEffect(() => {
    if (!isSplitBill) {
      setSplitGroupId(undefined);
      setSplitParticipants([]);
      setSplitBillAutoSplit(true);
      setSplitBillError(null);
      setSplitPersonInput("");
      setSplitPersonError(null);
      setOwnerRemoved(false);
      setSplitRepayPersonId(null);
      initialSplitAppliedRef.current = false;
      if (!isEditMode) {
        applyDefaultPersonSelection();
      }
      return;
    }
    setSplitBillError(null);
    setPayerName("");
    setOwnerRemoved(false);
    const selectedPerson =
      transactionType === "repayment" ? resolveSplitRepayPerson() : null;
    if (transactionType === "repayment" && selectedPerson) {
      setSplitRepayPersonId(selectedPerson.id);
      setOwnerRemoved(true);
      setSplitGroupId(selectedPerson.group_parent_id ?? undefined);
      const rawAmount = form.getValues("amount");
      const total =
        typeof rawAmount === "number" && Number.isFinite(rawAmount)
          ? Math.abs(rawAmount)
          : 0;
      setSplitParticipants(
        buildSingleSplitParticipant(selectedPerson, total, selectedPerson.name),
      );
      setSplitBillAutoSplit(true);
      setSplitPersonInput("");
      setSplitPersonError(null);
    } else {
      setSplitRepayPersonId(null);
    }
    form.setValue("person_id", undefined, { shouldDirty: false });
    form.setValue("debt_account_id", undefined, { shouldDirty: false });
    if (!(transactionType === "repayment" && selectedPerson)) {
      ensureOwnerParticipant();
    }
  }, [
    isSplitBill,
    form,
    applyDefaultPersonSelection,
    isEditMode,
    ensureOwnerParticipant,
    transactionType,
    buildSingleSplitParticipant,
    resolveSplitRepayPerson,
  ]);

  useEffect(() => {
    if (!isSplitBill) return;
    if (initialSplitAppliedRef.current) return;

    const initialGroupId = initialValues?.split_group_id;
    const initialPersonIds = initialValues?.split_person_ids ?? [];
    const uniquePersonIds = Array.from(new Set(initialPersonIds));

    if (initialGroupId) {
      setSplitGroupId(initialGroupId);
      setSplitBillAutoSplit(true);
      initialSplitAppliedRef.current = true;
      return;
    }

    if (uniquePersonIds.length > 0) {
      const members = uniquePersonIds
        .map((id) => peopleState.find((person) => person.id === id))
        .filter((person): person is Person => Boolean(person));

      if (
        transactionType !== "repayment" &&
        ownerPerson &&
        !members.some((member) => member.id === ownerPerson.id)
      ) {
        members.push(ownerPerson);
      }

      if (members.length > 0) {
        setSplitParticipants(buildSplitParticipants(members, splitTotalAmount));
        setSplitBillAutoSplit(true);
      }
      initialSplitAppliedRef.current = true;
    }
  }, [
    isSplitBill,
    initialValues?.split_group_id,
    initialValues?.split_person_ids,
    peopleState,
    buildSplitParticipants,
    ownerPerson,
    transactionType,
    splitTotalAmount,
  ]);

  const handleRemoveSplitParticipant = (personId: string) => {
    if (ownerPerson && personId === ownerPerson.id) {
      setOwnerRemoved(true);
    }
    setSplitParticipants((prev) =>
      resplitParticipants(
        prev.filter((participant) => participant.personId !== personId),
        splitTotalAmount,
      ),
    );
    setSplitBillAutoSplit(true);
  };

  const handleSplitPersonSubmit = useCallback(async () => {
    const rawName = splitPersonInput.trim();
    if (!rawName) return;
    setSplitPersonError(null);

    const normalized = rawName.toLowerCase();
    const existing = splitPersonCandidates.find(
      (person) => person.name.toLowerCase() === normalized,
    );

    if (existing) {
      handleAddSplitParticipant(existing);
      setSplitPersonInput("");
      setSplitPersonDropdownOpen(false);
      return;
    }

    startCreatingSplitPerson(async () => {
      const created = await createPersonAction({
        name: rawName,
        group_parent_id: splitGroupId ?? null,
      });
      if (!created) {
        setSplitPersonError("Unable to create person.");
        return;
      }

      const newPerson: Person = {
        id: created.profileId,
        name: rawName,
        email: null,
        image_url: null,
        sheet_link: null,
        google_sheet_url: null,
        is_owner: null,
        is_archived: null,
        is_group: false,
        group_parent_id: splitGroupId ?? null,
        debt_account_id: created.debtAccountId ?? null,
        balance: 0,
      };

      setPeopleState((prev) =>
        prev.some((person) => person.id === newPerson.id)
          ? prev
          : [...prev, newPerson],
      );
      handleAddSplitParticipant(newPerson);
      setSplitPersonInput("");
      setSplitPersonDropdownOpen(false);
    });
  }, [
    handleAddSplitParticipant,
    splitGroupId,
    splitPersonCandidates,
    splitPersonInput,
    startCreatingSplitPerson,
  ]);

  const handleSelectSplitSuggestion = useCallback(
    (personId: string) => {
      const person = splitPersonCandidates.find((p) => p.id === personId);
      if (!person) return;
      setSplitPersonError(null);
      handleAddSplitParticipant(person);
      setSplitPersonInput("");
      setSplitPersonDropdownOpen(false);
    },
    [handleAddSplitParticipant, splitPersonCandidates],
  );

  // Clear source account if switching to Transfer and it's a credit card
  useEffect(() => {
    if (
      transactionType === "transfer" &&
      selectedAccount?.type === "credit_card"
    ) {
      form.setValue("source_account_id", "", { shouldDirty: false });
    }
  }, [transactionType, selectedAccount, form]);

  // Auto-Select "Real" Tab for Lending
  useEffect(() => {
    if (transactionType === "debt" && selectedAccount?.type === "credit_card") {
      const currentMode = form.getValues("cashback_mode");
      if (currentMode !== "real_fixed" && currentMode !== "real_percent") {
        console.log(
          "[Lending Auto-Set] Switching cashback mode to real_fixed for Lending on CC",
        );
        form.setValue("cashback_mode", "real_fixed", { shouldDirty: false });
      }
    }
  }, [transactionType, selectedAccount, form]);

  useEffect(() => {
    if (isRefundMode) {
      setSpendingStats(null);
      setStatsError(null);
      setStatsLoading(false);
      return;
    }

    if (!watchedAccountId) {
      setSpendingStats(null);
      setStatsError(null);
      setStatsLoading(false);
      return;
    }

    const controller = new AbortController();
    setStatsLoading(true);
    setStatsError(null);

    const params = new URLSearchParams();
    params.set("accountId", watchedAccountId);
    if (watchedDate) {
      params.set("date", watchedDate.toISOString());
    }
    if (watchedCategoryId) {
      params.set("categoryId", watchedCategoryId);
    }

    fetch(`/api/cashback/stats?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load spending stats");
        }
        const payload = await response.json();
        setSpendingStats(payload ?? null);
      })
      .catch((error) => {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
        console.error(error);
        setSpendingStats(null);
        setStatsError("Could not load Min Spend info");
      })
      .finally(() => {
        setStatsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [isRefundMode, watchedAccountId, watchedDate ? watchedDate.getTime() : 0, watchedCategoryId]);

  useEffect(() => {
    if (!selectedAccount?.id) {
      setCashbackProgress(null);
      setProgressError(null);
      return undefined;
    }

    const controller = new AbortController();
    setProgressLoading(true);
    setProgressError(null);

    fetch(
      `/api/cashback/progress?accountId=${selectedAccount.id}&date=${watchedDate ? watchedDate.toISOString() : new Date().toISOString()}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load cashback progress");
        }
        const payload = (await response.json()) as CashbackCard[];
        if (!payload.length) {
          setCashbackProgress(null);
          setProgressError("Could not find cashback cycle data");
          return;
        }
        setCashbackProgress(payload[0]);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
        console.error(error);
        setCashbackProgress(null);
        setProgressError("Could not load cashback info");
      })
      .finally(() => {
        setProgressLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [selectedAccount?.id, watchedDate ? watchedDate.getTime() : 0]);

  // Fetch persisted metadata for existing transactions
  useEffect(() => {
    if (!transactionId || !isEditMode) {
      setPersistedMetadata(null);
      return;
    }

    const fetchPersistedMetadata = async () => {
      try {
        const response = await fetch(
          `/api/cashback/policy-explanation?transactionId=${transactionId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setPersistedMetadata(normalizePolicyMetadata(data));
        }
      } catch (error) {
        console.error("Failed to fetch persisted cashback metadata:", error);
      }
    };

    fetchPersistedMetadata();
  }, [transactionId, isEditMode]);

  // Phase 7.3: Policy Metadata Resolution
  const policyMetadataToShow =
    cashbackPreview?.metadata ??
    (spendingStats?.matchReason
      ? ({
        policySource: "virtual" as any,
        reason: spendingStats.matchReason,
        rate: spendingStats.potentialRate ?? spendingStats.rate,
        ruleMaxReward: spendingStats.maxReward,
      } as CashbackPolicyMetadata)
      : null) ??
    persistedMetadata;

  const potentialCashback =
    cashbackPreview?.estimatedReward ??
    (spendingStats
      ? (watchedAmount || 0) *
      (spendingStats.potentialRate ?? spendingStats.rate)
      : 0);
  const livePolicyMetadata = !!cashbackPreview;

  const currentImpact = useMemo(() => {
    if (
      watchedCashbackMode === "real_fixed" ||
      watchedCashbackMode === "real_percent"
    ) {
      const pAmount =
        (Math.abs(watchedAmount) * (watchedCashbackPercent || 0)) / 100;
      const fAmount = watchedCashbackFixed || 0;
      return pAmount + fAmount;
    }
    if (watchedCashbackMode === "none_back") {
      return potentialCashback;
    }
    return 0;
  }, [
    watchedCashbackMode,
    watchedAmount,
    watchedCashbackPercent,
    watchedCashbackFixed,
    potentialCashback,
  ]);

  const amountValue =
    typeof watchedAmount === "number" ? Math.abs(watchedAmount) : 0;
  const projectedSpend = (spendingStats?.currentSpend ?? 0) + amountValue;
  const rateLimitPercent =
    spendingStats?.potentialRate !== undefined
      ? spendingStats.potentialRate * 100
      : typeof cashbackProgress?.rate === "number"
        ? cashbackProgress.rate * 100
        : null;
  const percentEntry = Number.isFinite(Number(watchedCashbackPercent ?? 0))
    ? Number(watchedCashbackPercent ?? 0)
    : 0;
  const appliedPercent =
    rateLimitPercent !== null
      ? Math.min(rateLimitPercent, Math.max(0, percentEntry))
      : Math.max(0, percentEntry);
  const fixedEntry = Math.max(0, Number(watchedCashbackFixed ?? 0));
  const percentBackValue = (appliedPercent / 100) * amountValue;
  const rawShareTotal = percentBackValue + fixedEntry;
  const remainingBudget =
    typeof cashbackProgress?.remainingBudget === "number"
      ? Math.max(0, cashbackProgress.remainingBudget)
      : null;
  const showCashbackInputs =
    (transactionType === "expense" ||
      (transactionType === "debt" &&
        selectedAccount?.type === "credit_card")) &&
    (watchedCashbackMode === "real_fixed" ||
      watchedCashbackMode === "real_percent" ||
      watchedCashbackMode === "voluntary");

  // Validation: Total cashback must be less than amount
  const cashbackExceedsAmount =
    showCashbackInputs && rawShareTotal >= amountValue && amountValue > 0;

  useEffect(() => {
    if (amountValue <= 0) {
      form.setValue("cashback_share_percent", undefined, { shouldDirty: false });
      form.setValue("cashback_share_fixed", undefined, { shouldDirty: false });
      return;
    }
    if (
      typeof watchedCashbackFixed === "number" &&
      watchedCashbackFixed > amountValue
    ) {
      form.setValue("cashback_share_fixed", amountValue, { shouldDirty: false });
    }
  }, [amountValue, form, watchedCashbackFixed]);

  const handleEnsureDebtAccount = () => {
    if (!watchedPersonId) {
      return;
    }
    const person = personMap.get(watchedPersonId);
    startEnsuringDebt(async () => {
      setDebtEnsureError(null);
      const accountId = await ensureDebtAccountAction(
        watchedPersonId,
        person?.name,
      );
      if (!accountId) {
        setDebtEnsureError("Could not create debt account. Please try again.");
        return;
      }
      setPeopleState((prev) =>
        prev.map((p) =>
          p.id === watchedPersonId ? { ...p, debt_account_id: accountId } : p,
        ),
      );
      form.setValue("debt_account_id", accountId, { shouldValidate: true });
    });
  };

  useEffect(() => {
    if (!manualTagMode && watchedDate) {
      form.setValue("tag", generateTag(watchedDate), { shouldDirty: false });
    }
  }, [watchedDate, manualTagMode, form]);

  useEffect(() => {
    if (isEditMode && initialValues?.tag) {
      return;
    }
    if (typeof defaultTag === "string") {
      form.setValue("tag", defaultTag, { shouldDirty: false });
      setManualTagMode(true);
    }
  }, [defaultTag, form, initialValues?.tag, isEditMode]);

  useEffect(() => {
    if (isEditMode || isRefundMode) return;
    if (defaultType) {
      form.setValue("type", defaultType, { shouldDirty: false });
      setTransactionType(defaultType);
    }
  }, [defaultType, form, isEditMode, isRefundMode]);

  useEffect(() => {
    if (isRefundMode) {
      form.setValue("type", "income", { shouldDirty: false });
      setTransactionType("income");
    }
  }, [form, isRefundMode]);

  useEffect(() => {
    if (isEditMode && initialValues?.source_account_id) return;
    if (defaultSourceAccountId) {
      form.setValue("source_account_id", defaultSourceAccountId, { shouldDirty: false });
    }
  }, [
    defaultSourceAccountId,
    form,
    initialValues?.source_account_id,
    isEditMode,
  ]);

  // Reset cashback when Account or Amount changes significantly
  useEffect(() => {
    // Only reset if we are not in edit mode loading phase
    if (!form.formState.isLoading && !isEditMode) {
      // If account changes, reset query logic resets stats, but we should reset inputs
      form.setValue("cashback_share_fixed", 0, { shouldDirty: false });
      form.setValue("cashback_share_percent", 0, { shouldDirty: false });
      // If amount is cleared, also reset
      if (!amountValue) {
        form.setValue("cashback_share_fixed", 0, { shouldDirty: false });
        form.setValue("cashback_share_percent", 0, { shouldDirty: false });
      }
    }
  }, [selectedAccount?.id, amountValue, form, isEditMode]);

  useEffect(() => {
    if (isEditMode && initialValues?.debt_account_id) return;
    if (defaultDebtAccountId) {
      form.setValue("debt_account_id", defaultDebtAccountId, { shouldDirty: false });
    }
  }, [defaultDebtAccountId, form, initialValues?.debt_account_id, isEditMode]);

  const debtAccountName = useMemo(() => {
    if (!watchedDebtAccountId) return null;
    const account = allAccounts.find((acc) => acc.id === watchedDebtAccountId);
    return account?.name ?? null;
  }, [watchedDebtAccountId, allAccounts]);

  const TypeInput = isRefundMode ? (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Type</label>
      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-slate-700">
        Refund
      </div>
    </div>
  ) : (
    <div className="w-full">
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Tabs
            value={field.value}
            onValueChange={(value) => {
              if (value === "quick-people") {
                setTransactionType("quick-people");
              } else {
                field.onChange(value);
                setTransactionType(value as any);
              }
            }}
            className="w-full"
          >
            <TabsList className="sticky top-0 z-10 bg-background grid w-full grid-cols-5 p-1 bg-slate-100/80 rounded-xl h-auto -mx-1 w-[calc(100%_+_0.5rem)]">
              <TabsTrigger
                value="expense"
                className="data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700 data-[state=active]:shadow-none rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
              >
                <div className="p-1 rounded-full bg-rose-200/50 text-rose-600 group-data-[state=active]:bg-rose-200">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <span>Expense</span>
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
              >
                <div className="p-1 rounded-full bg-emerald-200/50 text-emerald-600 group-data-[state=active]:bg-emerald-200">
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                </div>
                <span>Income</span>
              </TabsTrigger>
              <TabsTrigger
                value="transfer"
                className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:shadow-none rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
              >
                <div className="p-1 rounded-full bg-blue-200/50 text-blue-600 group-data-[state=active]:bg-blue-200">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </div>
                <span>Transfer</span>
              </TabsTrigger>
              <TabsTrigger
                value="debt"
                className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 data-[state=active]:shadow-none rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
              >
                <div className="p-1 rounded-full bg-purple-200/50 text-purple-600 group-data-[state=active]:bg-purple-200">
                  <Wallet className="h-3.5 w-3.5" />
                </div>
                <span>Lending</span>
              </TabsTrigger>
              <TabsTrigger
                value="repayment"
                className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700 data-[state=active]:shadow-none rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
              >
                <div className="p-1 rounded-full bg-orange-200/50 text-orange-600 group-data-[state=active]:bg-orange-200">
                  <RotateCcw className="h-3.5 w-3.5" />
                </div>
                <span>Repay</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      />
      {errors.type && (
        <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
      )}
    </div>
  );

  const RefundStatusInput = isRefundMode ? (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Refund Status</label>
      <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm font-semibold text-slate-600">
        <button
          type="button"
          className={`rounded-md px-3 py-1 transition ${refundStatus === "received"
            ? "bg-white text-slate-900 shadow-sm"
            : "hover:text-slate-900"
            }`}
          onClick={() => setRefundStatus("received")}
        >
          Received (Instant)
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1 transition ${refundStatus === "pending"
            ? "bg-white text-slate-900 shadow-sm"
            : "hover:text-slate-900"
            } ${isConfirmRefund ? "opacity-60 cursor-not-allowed" : ""}`}
          onClick={() => {
            if (isConfirmRefund) return;
            setRefundStatus("pending");
          }}
          disabled={isConfirmRefund}
        >
          Pending (Wait)
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {refundStatus === "pending"
          ? "Money will stay in the system account until you confirm it."
          : "Use the receiving account to mark the refund as received."}
      </p>
    </div>
  ) : null;

  const CategoryInput =
    // Update condition: Show for Repayment too per user request
    // transactionType !== 'repayment' &&  <-- Removed this exclusion
    transactionType === "expense" ||
      transactionType === "debt" ||
      transactionType === "transfer" ||
      transactionType === "income" ||
      transactionType === "repayment" || // Added repayment
      isRefundMode ? (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-500" />
          Category {transactionType === "transfer" ? "(Optional)" : ""}
        </label>
        <Controller
          control={control}
          name="category_id"
          render={({ field }) => (
            <div onClick={debugCategoryClick}>
              <Combobox
                value={field.value}
                onValueChange={field.onChange}
                items={categoryOptions}
                placeholder="Select category"
                inputPlaceholder="Search category..."
                emptyState="No matching category"
                disabled={false} // Explicitly allow selecting category in refund modal
                className="h-11"
                onAddNew={() => setIsCategoryDialogOpen(true)}
                addLabel="New Category"
              />
            </div>
          )}
        />
        {errors.category_id && (
          <p className="text-sm text-red-600">{errors.category_id.message}</p>
        )}
      </div>
    ) : null;

  const debtAccountForRepayment = useMemo(() => {
    // For Repayment, the "To Account" UI maps to source_account_id (watchedAccountId)
    // The money goes FROM User Link Account (source) -> TO Creditor/Bank
    if (transactionType !== "repayment" || !watchedAccountId) return null;
    return allAccounts.find((acc) => acc.id === watchedAccountId) ?? null;
  }, [transactionType, watchedAccountId, allAccounts]);

  const ShopInput =
    transactionType === "expense" ||
      transactionType === "debt" ||
      transactionType === "repayment" ||
      (isEditMode &&
        transactionType !== "income" &&
        transactionType !== "transfer") ? (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Store className="h-4 w-4 text-slate-500" />
          Shop
        </label>
        <Controller
          control={control}
          name="shop_id"
          render={({ field }) => (
            <Combobox
              value={field.value}
              onValueChange={field.onChange}
              items={shopOptions}
              disabled={transactionType === "repayment"}
              placeholder={
                debtAccountForRepayment && !field.value ? (
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-none bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {getAccountInitial(debtAccountForRepayment.name)}
                    </span>
                    <span>To: {debtAccountForRepayment.name}</span>
                  </span>
                ) : (
                  "Select shop"
                )
              }
              inputPlaceholder="Search shop..."
              emptyState="No shops yet"
              className="h-11"
              onAddNew={() => setIsShopDialogOpen(true)}
              addLabel="New Shop"
            />
          )}
        />
      </div>
    ) : null;

  const PersonInput =
    (transactionType === "debt" ||
      transactionType === "repayment" ||
      (transactionType === "income" && !isRefundMode)) ? (
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            Person
          </label>
          <Controller
            control={control}
            name="person_id"
            render={({ field }) => (
              <Combobox
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  const linkedAccount = value
                    ? debtAccountByPerson.get(value)
                    : undefined;
                  form.setValue("debt_account_id", linkedAccount ?? undefined, {
                    shouldValidate: true,
                  });
                }}
                items={personOptions}
                placeholder="Select person"
                inputPlaceholder="Search person..."
                emptyState="No person found"
                className="h-11"
                onAddNew={() => setIsPersonDialogOpen(true)}
                addLabel="New Person"
                disabled={isSplitBill}
                onDetailClick={() => handleDetailClick('person', field.value)}
              />
            )}
          />
          {isSplitBill && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold">i</span>
              Person is managed by Split Bill participants
            </p>
          )}
          {errors.person_id && (
            <p className="text-sm text-red-600 font-medium mt-1 animate-pulse">
              ⚠️ {errors.person_id.message}
            </p>
          )}

        </div>

        {/* Payer Name Input for Group Debt Repayments/Lending */}
        {!isSplitBill && (transactionType === "repayment" || transactionType === "debt") &&
          watchedPersonId &&
          (() => {
            const selectedPerson = personMap.get(watchedPersonId);
            const isGroupDebt =
              selectedPerson?.name?.toLowerCase().includes("clt") ||
              selectedPerson?.name?.toLowerCase().includes("group");
            return isGroupDebt ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Payer Name (Who paid?)
                </label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Enter payer name..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-xs text-slate-500">
                  This will be appended to the note as &quot;(paid by [name])&quot;
                </p>
              </div>
            ) : null;
          })()}

        {!isSplitBill && watchedPersonId && !debtAccountByPerson.get(watchedPersonId) ? (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <div className="space-y-1">
              <p className="font-semibold">
                This person does not have a debt account.
              </p>
              <p>
                A debt account will be created automatically when you click the
                button.
              </p>
              {debtEnsureError && (
                <p className="font-semibold text-red-600">{debtEnsureError}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleEnsureDebtAccount}
              disabled={isEnsuringDebt}
              className="shrink-0 rounded bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isEnsuringDebt ? "Creating..." : "Create & Link Now"}
            </button>
          </div>
        ) : !isSplitBill && watchedPersonId && debtAccountByPerson.get(watchedPersonId) ? null : null}
        {!isSplitBill && errors.debt_account_id && (
          <p className="text-sm text-red-600 font-medium mt-1 animate-pulse">
            ⚠️ {errors.debt_account_id.message}
          </p>
        )}
      </div>
    ) : null;

  const splitBillLabel =
    transactionType === "repayment" ? "Split Repayment" : "Split Bill";
  const splitBillDescription =
    transactionType === "repayment"
      ? "Split this repayment across multiple people."
      : "Split this bill across multiple people.";

  const SplitBillToggle =
    (transactionType === "debt" || transactionType === "repayment") &&
      !isRefundMode ? (
      <div className="space-y-2">
        <Label htmlFor="split-bill-toggle" className="text-sm font-medium text-gray-700">
          {splitBillLabel}
        </Label>
        <div
          className={cn(
            "flex items-center justify-between rounded-md border border-gray-300 px-3 py-2 shadow-sm",
            isEditMode && "opacity-60",
          )}
        >
          <p className="text-xs text-slate-500">{splitBillDescription}</p>
          <Controller
            control={control}
            name="split_bill"
            render={({ field }) => (
              <Switch
                id="split-bill-toggle"
                checked={field.value ?? false}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (checked) {
                    setSplitBillAutoSplit(true);

                    // AUTO-FILL: Add current person + Me (Mine) when toggle ON (only if not already present)
                    const currentPersonId = form.getValues("person_id");
                    if (currentPersonId && transactionType === 'debt') {
                      const selectedPerson = people.find(p => p.id === currentPersonId);
                      if (selectedPerson) {
                        // Check if participants already exist to prevent duplicate
                        const hasMine = splitParticipants.some(p => p.personId === "me");
                        const hasPerson = splitParticipants.some(p => p.personId === selectedPerson.id);

                        if (!hasMine && !hasPerson) {
                          // Only add if both are missing
                          const newParticipants: SplitBillParticipant[] = [
                            {
                              personId: "me",
                              name: "Me (Mine)",
                              amount: 0,
                              paidBy: "Me (Mine)", // Standardize to "Me (Mine)"
                              note: "",
                              paidBefore: 0,
                            },
                            {
                              personId: selectedPerson.id,
                              name: selectedPerson.name,
                              amount: 0,
                              paidBy: "Me (Mine)", // Standardize to "Me (Mine)"
                              note: "",
                              paidBefore: 0,
                            },
                          ];
                          setSplitParticipants(newParticipants);
                        }
                      }
                    }
                  } else {
                    // Clear participants when toggle OFF
                    setSplitParticipants([]);
                  }
                }}
              />
            )}
          />
        </div>
      </div>
    ) : null;

  const SplitBillSelection = isSplitBill ? (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500">
            Group
          </label>
          <Combobox
            items={splitBillGroupOptions}
            value={splitGroupId}
            onValueChange={(value) => setSplitGroupId(value)}
            placeholder="Select group"
            inputPlaceholder="Search group..."
            emptyState="No groups available"
            className="h-11"
          />
        </div>
        <div className="space-y-2 relative">
          <label className="text-xs font-semibold text-slate-500">
            Add person
          </label>
          <div className="min-h-[44px] rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {splitParticipants.map((participant, index) => (
                <span
                  key={`${participant.personId}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                >
                  {participant.name}
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveSplitParticipant(participant.personId)
                    }
                    className="rounded-full p-0.5 text-slate-400 hover:text-slate-600"
                    aria-label={`Remove ${participant.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={splitPersonInput}
                onChange={(event) => {
                  setSplitPersonInput(event.target.value);
                  if (splitPersonError) {
                    setSplitPersonError(null);
                  }
                }}
                onFocus={() => setSplitPersonDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => setSplitPersonDropdownOpen(false), 150);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSplitPersonSubmit();
                  }
                }}
                placeholder="Type name and press Enter"
                className="min-w-[160px] flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          {splitPersonDropdownOpen && splitPersonSuggestions.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
              {splitPersonSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelectSplitSuggestion(suggestion.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  {suggestion.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={suggestion.image_url}
                      alt={suggestion.name}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {getAccountInitial(suggestion.name)}
                    </span>
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-700">
                      {suggestion.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {suggestion.hint}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {splitPersonError && (
            <p className="text-xs text-rose-600">{splitPersonError}</p>
          )}
          {isCreatingSplitPerson && (
            <p className="text-[10px] text-slate-400">Saving person...</p>
          )}
        </div>
      </div>

      {/* 2-Person Split Info Banner */}
      {splitParticipants.length === 2 && (() => {
        const myShare = splitParticipants.find(p => p.personId === "me" || p.name.toLowerCase() === "me (mine)");
        const otherPerson = splitParticipants.find(p => p.personId !== "me" && p.name.toLowerCase() !== "me (mine)");

        if (!myShare || !otherPerson) return null;

        return (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-semibold">2-Person Split Detected</p>
                <p className="mt-1">
                  Your expense ({numberFormatter.format(myShare.amount)}) will be recorded with the full amount for bank reconciliation.
                  A "Lend" transaction ({numberFormatter.format(otherPerson.amount)}) will be created for {otherPerson.name}.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      <SplitBillTable
        participants={splitParticipants}
        totalAmount={splitTotalAmount}
        onAmountChange={handleSplitAmountChange}
        onPaidByChange={handleSplitPaidByChange}
        onNoteChange={handleSplitNoteChange}
        onPaidBeforeChange={handleSplitPaidBeforeChange}
        onRemove={handleRemoveSplitParticipant}
        allowPaidBefore={transactionType !== "repayment"}
        error={splitBillError}
        onEditTransaction={(id) => onSwitchTransaction?.(id)}
      />
    </div>
  ) : null;

  const SplitBillSection = SplitBillToggle ? (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          Participants
        </h3>
        {isSplitBill &&
          (splitBillAutoSplit ? (
            <span className="text-[10px] uppercase text-slate-400">
              Even split
            </span>
          ) : (
            <span className="text-[10px] uppercase text-amber-500">
              Custom split
            </span>
          ))}
      </div>
      {SplitBillToggle}
      {SplitBillSelection}
    </div>
  ) : null;

  const DestinationAccountInput = (() => {
    const isRelatedType =
      transactionType === "repayment" ||
      transactionType === "debt" ||
      transactionType === "transfer";
    if (!isRelatedType) return null;

    // TRANSFER: Allow manual selection
    if (transactionType === "transfer") {
      return (
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Destination account
          </label>
          <Controller
            control={control}
            name="debt_account_id"
            render={({ field }) => (
              <Combobox
                value={field.value}
                onValueChange={field.onChange}
                items={destinationAccountOptions}
                placeholder="Select destination"
                inputPlaceholder="Search account..."
                emptyState="No account found"
                className="h-11"
              />
            )}
          />
          {errors.debt_account_id && (
            <p className="text-sm text-red-600">
              {errors.debt_account_id.message}
            </p>
          )}
        </div>
      );
    }

    // DEBT / REPAYMENT: Strict Auto-Link (Read Only)
    const personLinkedId = watchedPersonId
      ? debtAccountByPerson.get(watchedPersonId)
      : null;
    const linkedAccount = personLinkedId
      ? allAccounts.find((a) => a.id === personLinkedId)
      : null;

    return (
      <div className="hidden">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          Destination Account
          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
            AUTO
          </span>
        </label>

        {watchedPersonId ? (
          linkedAccount ? (
            <div className="relative">
              <div className="flex items-center gap-3 w-full h-11 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100/80 cursor-default">
                <div className="p-1.5 bg-slate-200 rounded-full flex-none">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {linkedAccount.name}
                  </p>
                </div>
                {linkedAccount.current_balance !== undefined && (
                  <span
                    className={cn(
                      "text-xs font-mono",
                      linkedAccount.current_balance < 0
                        ? "text-red-600"
                        : "text-emerald-600",
                    )}
                  >
                    {numberFormatter.format(linkedAccount.current_balance)}
                  </span>
                )}
              </div>
              {/* Hidden Input to ensure form validation passes */}
              <input
                type="hidden"
                {...form.register("debt_account_id")}
                value={linkedAccount.id}
              />
            </div>
          ) : (
            // HIDDEN Manual Link UI per request
            <div className="hidden">
              <div className="w-full h-11 px-3 rounded-md border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-none" />
                <span>Person has no linked debt account.</span>
              </div>
            </div>
          )
        ) : (
          <div className="w-full h-11 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-400 text-sm flex items-center italic">
            Select a person first...
          </div>
        )}

        {errors.debt_account_id && (
          <p className="text-sm text-red-600">
            {errors.debt_account_id.message}
          </p>
        )}
      </div>
    );
  })();

  const DateInput = (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-500" />
        Date
      </label>
      <Controller
        control={control}
        name="occurred_at"
        render={({ field }) => (
          <DatePicker
            value={field.value}
            onChange={field.onChange}
            className="w-full h-11 border-gray-300 shadow-sm"
          />
        )}
      />
      {errors.occurred_at && (
        <p className="text-sm text-red-600">{errors.occurred_at.message}</p>
      )}
    </div>
  );

  const TagInput =
    transactionType === "debt" || transactionType === "repayment" ? (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Tag className="h-4 w-4 text-slate-500" />
            Tag
          </label>
          <div className="flex items-center gap-2">
            {suggestedTags.slice(0, 1).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  form.setValue("tag", tag, { shouldValidate: true });
                  setManualTagMode(true);
                }}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors border",
                  watch("tag") === tag
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                )}
              >
                {tag}
              </button>
            ))}
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={() => {
                const currentDate = watchedDate || new Date();
                const previousMonth = subMonths(currentDate, 1);
                const previousTag = generateTag(previousMonth);
                form.setValue("tag", previousTag, { shouldValidate: true });
                setManualTagMode(true);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                form.setValue("tag", generateTag(new Date()), {
                  shouldValidate: true,
                });
                setManualTagMode(true);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
              title="Reset to Current"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
        <Controller
          control={control}
          name="tag"
          render={({ field }) => (
            <input
              {...field}
              value={field.value || ""}
              onChange={(e) => {
                field.onChange(e.target.value);
                if (e.target.value) {
                  setManualTagMode(true);
                }
              }}
              className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Enter tag (e.g., 2025-11)"
            />
          )}
        />
        {errors.tag && (
          <p className="text-sm text-red-600">{errors.tag.message}</p>
        )}
      </div>
    ) : null;

  const SourceAccountInput = (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-slate-500" />
          <span>
            {isRefundMode
              ? refundStatus === "pending"
                ? "Holding Account"
                : "Receiving Account"
              : transactionType === "income" || transactionType === "repayment"
                ? "To Account"
                : transactionType === "transfer"
                  ? "Source of Funds"
                  : "From Account"}
          </span>
        </label>
        <Controller
          control={control}
          name="source_account_id"
          render={({ field }) => (
            <Combobox
              items={accountOptions}
              groups={accountOptionGroups}
              value={field.value}
              onValueChange={field.onChange}
              placeholder={
                isRefundMode && refundStatus === "pending"
                  ? "System Account"
                  : "Select account"
              }
              inputPlaceholder="Search account..."
              emptyState="No account found"
              disabled={isRefundMode && refundStatus === "pending"}
              className="h-11"
              tabs={[
                {
                  value: "credit",
                  label: "Credit",
                  active: accountFilter === "credit",
                  onClick: () => setAccountFilter("credit"),
                },
                {
                  value: "account",
                  label: "Account",
                  active: accountFilter === "account",
                  onClick: () => setAccountFilter("account"),
                },
                {
                  value: "other",
                  label: "Others",
                  active: accountFilter === "other",
                  onClick: () => setAccountFilter("other"),
                },
                {
                  value: "all",
                  label: "All",
                  active: accountFilter === "all",
                  onClick: () => setAccountFilter("all"),
                },
              ]}
              onAddNew={() => {
                setAccountDialogContext('source');
                setIsAccountDialogOpen(true);
              }}
              addLabel="New Account"
              onDetailClick={() => handleDetailClick('account', field.value)}
              onSearchChange={setAccountSearch}
            />
          )}
        />
        {errors.source_account_id && (
          <p className="text-sm text-red-600">
            {errors.source_account_id.message}
          </p>
        )}
      </div>
    </div>
  );

  const AmountInput = (
    <div className="space-y-3">
      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <SmartAmountInput
            value={field.value}
            onChange={field.onChange}
            disabled={isConfirmRefund}
            placeholder="0"
            error={errors.amount?.message}
            className="text-lg font-semibold"
          />
        )}
      />
      {progressLoading && (
        <p className="text-xs text-slate-400">Loading cashback history...</p>
      )}
      {progressError && (
        <p className="text-xs text-rose-600">{progressError}</p>
      )}
    </div>
  );

  const isDebtForm =
    transactionType === "debt" || transactionType === "repayment";

  const NoteInput = (
    <div
      className={cn(
        "space-y-2",
        (isDebtForm || transactionType === "income") && "h-full flex flex-col",
      )}
    >
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-500" />
        Note
      </label>
      {isDebtForm || transactionType === "income" ? (
        <input
          type="text"
          {...register("note")}
          placeholder="Add a note..."
          className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      ) : (
        <textarea
          {...register("note")}
          placeholder="Add a note..."
          className={cn(
            "w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200",
            "min-h-[60px]",
          )}
        />
      )}
      {errors.note && (
        <p className="text-sm text-red-600">{errors.note.message}</p>
      )}
    </div>
  );

  const INSTALLMENT_MIN_AMOUNT = 3_000_000; // 3 million VND threshold
  const showInstallmentToggle =
    !isRefundMode &&
    (transactionType === "repayment"
      ? true
      : transactionType === "debt"
        ? (watchedAmount ?? 0) >= INSTALLMENT_MIN_AMOUNT
        : installments.length > 0 &&
        (transactionType === "expense" || transactionType === "income"));

  const hasInstallmentPlans = installments.length > 0;

  const InstallmentPlanPicker = watchedIsInstallment ? (
    transactionType === "repayment" && hasInstallmentPlans ? (
      <Controller
        control={control}
        name="installment_plan_id"
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
              Select Plan
            </label>
            <Combobox
              items={installments.map((i) => ({
                value: i.id,
                label: i.name,
                description: `Due: ${i.next_due_date ? format(new Date(i.next_due_date), "dd/MM/yyyy") : "N/A"} - ${numberFormatter.format(i.monthly_amount)}`,
                icon: <Sparkles className="w-4 h-4 text-purple-500" />,
              }))}
              value={field.value}
              onValueChange={(val: string | undefined) => {
                if (!val) {
                  field.onChange(undefined);
                  return;
                }
                field.onChange(val);
                const plan = installments.find((i) => i.id === val);
                if (plan) {
                  const currentAmt = form.getValues("amount");
                  if (!currentAmt || currentAmt === 0) {
                    form.setValue("amount", plan.monthly_amount);
                  }

                  const currentNote = form.getValues("note");
                  if (!currentNote || currentNote.trim() === "") {
                    const start = new Date(plan.start_date);
                    const now = new Date();
                    const diffMonths =
                      (now.getFullYear() - start.getFullYear()) * 12 +
                      (now.getMonth() - start.getMonth()) +
                      1;
                    const monthNum = Math.min(
                      Math.max(1, diffMonths),
                      plan.term_months,
                    );
                    form.setValue(
                      "note",
                      `${plan.name} (Month ${monthNum}/${plan.term_months})`,
                    );
                  }
                }
              }}
              placeholder="Select Installment Plan..."
              className="w-full bg-white border-purple-200"
            />
          </div>
        )}
      />
    ) : (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        New installment plan will be created on submit.
      </div>
    )
  ) : null;

  const InstallmentSection = showInstallmentToggle ? (
    <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <label className="text-sm font-medium text-slate-900">
            {transactionType === "repayment" ? "Installment Repayment" : "Installment Plan"}
          </label>
          <p className="text-xs text-slate-500">
            {transactionType === "repayment"
              ? "Link this repayment to an installment plan"
              : "Convert this transaction into an installment plan"}
          </p>
        </div>
        <Controller
          control={control}
          name="is_installment"
          render={({ field }) => (
            <Switch
              checked={field.value ?? false}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                setIsInstallment(checked);
                if (!checked) {
                  form.setValue("installment_plan_id", undefined, {
                    shouldDirty: true,
                  });
                }
              }}
            />
          )}
        />
      </div>
      {InstallmentPlanPicker}
    </div>
  ) : null;





  const showCashbackSection =
    transactionType === "expense" ||
    transactionType === "debt";

  const CashbackModeInput = showCashbackSection ? (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
          <Percent className="h-4 w-4 text-blue-500" />
          Cashback
        </h4>
        {spendingStats && spendingStats.cycle && (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            {format(parseISO(spendingStats.cycle.start), "dd MMM")} -{" "}
            {format(parseISO(spendingStats.cycle.end), "dd MMM")}
          </span>
        )}
      </div>

      {/* Mode Selector - Simplified */}
      <Controller
        control={control}
        name="cashback_mode"
        render={({ field }) => (
          <div className="flex p-1 bg-slate-200/50 rounded-lg">
            <button
              type="button"
              onClick={() => field.onChange("none_back")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
                !field.value || field.value === "none_back"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
              )}
            >
              Virtual (Auto)
            </button>
            <button
              type="button"
              onClick={() =>
                field.onChange(
                  field.value === "real_percent"
                    ? "real_percent"
                    : "real_fixed",
                )
              }
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
                field.value === "real_fixed" || field.value === "real_percent"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
              )}
            >
              Real (Claimed)
            </button>
            <button
              type="button"
              onClick={() => field.onChange("voluntary")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
                field.value === "voluntary"
                  ? "bg-white text-amber-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
              )}
            >
              Voluntary
            </button>
          </div>
        )}
      />

      {/* Real Mode: Unified % and Fixed */}
      {(watchedCashbackMode === "real_fixed" ||
        watchedCashbackMode === "real_percent") && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-1 bg-white p-3 rounded-md border border-slate-100 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Percent Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-medium text-slate-500">
                    % Rate
                  </label>
                  {(() => {
                    const budgetLeft = spendingStats?.maxCashback
                      ? Math.max(
                        0,
                        spendingStats.maxCashback - spendingStats.earnedSoFar,
                      )
                      : Infinity;
                    const rateMaxAmount =
                      (amountValue * (rateLimitPercent ?? 100)) / 100;
                    const absoluteLimit = Math.min(budgetLeft, rateMaxAmount);
                    const currentFixed =
                      form.getValues("cashback_share_fixed") || 0;
                    const remainingForPercent = Math.max(
                      0,
                      absoluteLimit - currentFixed,
                    );
                    // Calculate implied max percent
                    const maxPercent =
                      amountValue > 0
                        ? (remainingForPercent / amountValue) * 100
                        : 0;

                    return (
                      <span className="text-[10px] text-slate-400">
                        Max: {numberFormatter.format(maxPercent)}%
                      </span>
                    );
                  })()}
                </div>
                <Controller
                  control={control}
                  name="cashback_share_percent"
                  render={({ field }) => {
                    const budgetLeft = spendingStats?.maxCashback
                      ? Math.max(
                        0,
                        spendingStats.maxCashback -
                        spendingStats.earnedSoFar,
                      )
                      : Infinity;
                    const rateMaxAmount =
                      (amountValue * (rateLimitPercent ?? 100)) / 100;
                    const absoluteLimit = Math.min(
                      budgetLeft,
                      rateMaxAmount,
                    );

                    const currentFixed =
                      form.getValues("cashback_share_fixed") || 0;
                    const remainingForPercent = Math.max(
                      0,
                      absoluteLimit - currentFixed,
                    );

                    const isFullyConsumedByFixed = remainingForPercent <= 0;

                    return (
                      <SmartAmountInput
                        value={field.value}
                        onChange={(val: number | undefined) => {
                          // Calculate implied amount from this %
                          let safePercent = val;
                          if (val !== undefined && amountValue > 0) {
                            const impliedAmount = (amountValue * val) / 100;
                            if (impliedAmount > remainingForPercent) {
                              safePercent =
                                (remainingForPercent / amountValue) * 100;
                            }
                          }

                          field.onChange(safePercent);
                          form.setValue("cashback_mode", "real_percent");
                        }}
                        placeholder="0"
                        className={cn(
                          "w-full",
                          isFullyConsumedByFixed &&
                          !field.value &&
                          "opacity-50 bg-slate-100 cursor-not-allowed",
                        )}
                      />
                    );
                  }}
                />
              </div>

              {/* Fixed Input */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-medium text-slate-500">
                    Amount
                  </label>
                  {(() => {
                    const budgetLeft = spendingStats?.maxCashback
                      ? Math.max(
                        0,
                        spendingStats.maxCashback - spendingStats.earnedSoFar,
                      )
                      : Infinity;
                    const rateMaxAmount =
                      (amountValue * (rateLimitPercent ?? 100)) / 100;
                    const absoluteLimit = Math.min(budgetLeft, rateMaxAmount);
                    const currentPercent =
                      form.getValues("cashback_share_percent") || 0;
                    const percentAmount = (amountValue * currentPercent) / 100;
                    const remainingForFixed = Math.max(
                      0,
                      absoluteLimit - percentAmount,
                    );

                    return (
                      <span className="text-[10px] text-slate-400">
                        Max: {numberFormatter.format(remainingForFixed)}
                      </span>
                    );
                  })()}
                </div>
                <Controller
                  control={control}
                  name="cashback_share_fixed"
                  render={({ field }) => {
                    const budgetLeft = spendingStats?.maxCashback
                      ? Math.max(
                        0,
                        spendingStats.maxCashback -
                        spendingStats.earnedSoFar,
                      )
                      : Infinity;
                    const rateMaxAmount =
                      (amountValue * (rateLimitPercent ?? 100)) / 100;
                    const absoluteLimit = Math.min(
                      budgetLeft,
                      rateMaxAmount,
                    );

                    const currentPercent =
                      form.getValues("cashback_share_percent") || 0;
                    const isFullyConsumedByPercent =
                      (amountValue * currentPercent) / 100 >= absoluteLimit - 100; // tolerance

                    return (
                      <SmartAmountInput
                        value={field.value}
                        disabled={isFullyConsumedByPercent && !field.value} // Disable if consumed AND empty
                        onChange={(val) => {
                          const budgetLeft = spendingStats?.maxCashback
                            ? Math.max(
                              0,
                              spendingStats.maxCashback -
                              spendingStats.earnedSoFar,
                            )
                            : Infinity;
                          const rateMaxAmount =
                            (amountValue * (rateLimitPercent ?? 100)) / 100;
                          const absoluteLimit = Math.min(
                            budgetLeft,
                            rateMaxAmount,
                          );

                          const currentPercent =
                            form.getValues("cashback_share_percent") || 0;
                          const percentAmount =
                            (amountValue * currentPercent) / 100;
                          const remainingForFixed = Math.max(
                            0,
                            absoluteLimit - percentAmount,
                          );

                          let safeVal = val;
                          if (val !== undefined && val > remainingForFixed) {
                            safeVal = remainingForFixed;
                          }

                          field.onChange(safeVal);
                          form.setValue("cashback_mode", "real_fixed");
                        }}
                        placeholder="Amount"
                        className={cn(
                          "w-full",
                          isFullyConsumedByPercent &&
                          !field.value &&
                          "opacity-50 bg-slate-100 cursor-not-allowed",
                        )}
                      />
                    );
                  }}
                />
              </div>
            </div>

            {/* Real-time Calculation Display */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-2 py-1 bg-slate-50 rounded border border-slate-100">
                <span className="text-xs font-medium text-slate-500">
                  {transactionType === "debt"
                    ? "Total Give Away:"
                    : "Total Claim:"}
                </span>
                <span className="text-sm font-bold text-emerald-700">
                  {numberFormatter.format(
                    (amountValue * (watchedCashbackPercent || 0)) / 100 +
                    (watchedCashbackFixed || 0),
                  )}
                </span>
              </div>

              {/* Virtual Profit Hint */}
              {(() => {
                // Calculate "Potential Max" based on Rate Limit (if exists) or Budget Left
                const budgetLeft = spendingStats?.maxCashback
                  ? Math.max(
                    0,
                    spendingStats.maxCashback - spendingStats.earnedSoFar,
                  )
                  : Infinity;
                // If there's a specific rate limit, that is the theoretical max for this transaction
                const cardRateLimit = rateLimitPercent ?? 100;
                const rateMaxAmount = (amountValue * cardRateLimit) / 100;

                // The potential max is the lower of Budget Left or Rate Cap
                const potentialMax = Math.min(budgetLeft, rateMaxAmount);

                const currentClaim =
                  (amountValue * (watchedCashbackPercent || 0)) / 100 +
                  (watchedCashbackFixed || 0);
                const virtualProfit = potentialMax - currentClaim;

                // Only show if there is a meaningful positive difference (> 1k VND to avoid rounding noise)
                if (virtualProfit > 1000) {
                  return (
                    <div className="flex justify-between items-center px-2 py-1 bg-emerald-50 rounded border border-emerald-100">
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Virtual Profit (Mine):
                      </span>
                      <span className="text-sm font-bold text-emerald-600">
                        +{numberFormatter.format(virtualProfit)}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Hints for Real Mode */}
            <div className="text-xs text-slate-500 flex flex-col gap-1 border-t border-slate-100 pt-2">
              <div className="flex justify-between">
                <span>Match Policy:</span>
                <span className="font-medium text-slate-700 capitalize">
                  {spendingStats?.matchReason?.replace(/_/g, " ") || "Default"}
                  {spendingStats?.maxReward &&
                    ` (Max ${numberFormatter.format(spendingStats.maxReward)})`}
                </span>
              </div>
              {rateLimitPercent !== null && (
                <div className="flex justify-between">
                  <span>Applied Rate:</span>
                  <span className="font-medium bg-slate-100 px-1 py-0.5 rounded">
                    {rateLimitPercent}%
                  </span>
                </div>
              )}
              {spendingStats?.maxCashback && (
                <div className="flex justify-between text-amber-600">
                  <span>Budget Left:</span>
                  <span>
                    {remainingBudget !== null
                      ? numberFormatter.format(
                        Math.max(0, remainingBudget - currentImpact),
                      )
                      : "--"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Voluntary Mode: Decoupled Logic with Total Validated against Amount */}
      {/* Voluntary Mode: Decoupled Logic - Reusable */}
      {watchedCashbackMode === "voluntary" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 bg-amber-50/50 p-3 rounded-md border border-amber-100 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Voluntary Percent */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-amber-700">
                % Voluntary
              </label>
              <Controller
                control={control}
                name="cashback_share_percent"
                render={({ field }) => (
                  <SmartAmountInput
                    value={field.value}
                    unit="%"
                    onChange={(val) => {
                      const currentFixed = form.getValues("cashback_share_fixed") || 0;
                      const remainingForPercent = Math.max(0, amountValue - currentFixed);
                      let safePercent = val;
                      if (safePercent !== undefined && rateLimitPercent !== null && safePercent > rateLimitPercent) {
                        safePercent = rateLimitPercent;
                      }
                      if (safePercent !== undefined && amountValue > 0) {
                        const impliedAmount = (amountValue * safePercent) / 100;
                        if (impliedAmount > remainingForPercent) {
                          safePercent = (remainingForPercent / amountValue) * 100;
                        }
                      }
                      field.onChange(safePercent);
                    }}
                    placeholder="%"
                    className="w-full border-amber-200 focus-visible:ring-amber-200"
                  />
                )}
              />
            </div>
            {/* Voluntary Fixed */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-amber-700">
                Amount Voluntary
              </label>
              <Controller
                control={control}
                name="cashback_share_fixed"
                render={({ field }) => (
                  <SmartAmountInput
                    value={field.value}
                    onChange={(val) => {
                      const currentPercent = form.getValues("cashback_share_percent") || 0;
                      const percentAmount = (amountValue * currentPercent) / 100;
                      const remainingForFixed = Math.max(0, amountValue - percentAmount);
                      let safeVal = val;
                      if (val !== undefined && val > remainingForFixed) {
                        safeVal = remainingForFixed;
                      }
                      field.onChange(safeVal);
                    }}
                    placeholder="Overflow Amount"
                    className="w-full border-amber-200 focus-visible:ring-amber-200"
                  />
                )}
              />
            </div>
          </div>
          <div className="flex justify-between items-center px-2 py-1 bg-amber-100/50 rounded border border-amber-200/50">
            <span className="text-xs font-medium text-amber-700">Total Overflow:</span>
            <span className="text-sm font-bold text-amber-800">
              {numberFormatter.format((amountValue * (watchedCashbackPercent || 0)) / 100 + (watchedCashbackFixed || 0))}
            </span>
          </div>
          <p className="text-[10px] text-amber-600 italic">
            * This amount is tracked as overflow loss and does not count towards standard budget.
          </p>
        </div>
      )}

      {/* Stats / Info - Always Visible if Useful */}
      <div className="pt-2 border-t border-slate-200/60 space-y-2">
        {/* Policy Explanation */}
        {policyMetadataToShow && (
          <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-blue-500" />
              Cashback Policy Details
            </div>

            <div className="space-y-1.5">
              {(() => {
                const meta = policyMetadataToShow;
                const policyLabel = formatPolicyLabel(meta, numberFormatter);
                const items = [
                  {
                    label: "Summary",
                    value: policyLabel,
                    active: Boolean(policyLabel),
                  },
                  {
                    label: "Source",
                    value: meta.policySource?.replace("_", " "),
                    active: true,
                  },
                  {
                    label: "Level",
                    value: meta.levelName
                      ? `${meta.levelName}${meta.levelMinSpend ? ` (>= ${numberFormatter.format(meta.levelMinSpend)})` : ""}`
                      : null,
                    active: !!meta.levelName,
                  },
                  {
                    label: "Match Rate",
                    value: formatPercent(meta.rate),
                    active: true,
                  },
                  {
                    label: "Max Reward",
                    value:
                      typeof meta.ruleMaxReward === "number"
                        ? numberFormatter.format(meta.ruleMaxReward)
                        : null,
                    active: typeof meta.ruleMaxReward === "number",
                  },
                  {
                    label: "Reason",
                    value: meta.reason,
                    active: !!meta.reason,
                  },
                ];

                return items
                  .filter((i) => i.active && i.value)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs"
                    >
                      <span className="text-slate-500">{item.label}:</span>
                      <span className="font-semibold text-slate-700 capitalize text-right">
                        {item.value}
                      </span>
                    </div>
                  ));
              })()}
            </div>
            {persistedMetadata && !livePolicyMetadata && (
              <p className="text-[10px] text-slate-400 italic mt-1 border-t border-slate-200 pt-1">
                * Persisted information from database.
              </p>
            )}
            {!persistedMetadata && livePolicyMetadata && (
              <p className="text-[10px] text-blue-500/80 italic mt-1 border-t border-slate-100 pt-1 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Live policy projection based on selection.
              </p>
            )}
          </div>
        )}

        {watchedCashbackMode === "none_back" && potentialCashback > 0 && (
          <p className="text-xs flex justify-between bg-emerald-50/50 p-2 rounded text-emerald-700 border border-emerald-100/50">
            <span className="opacity-80">Estimated Earnings:</span>
            <span className="font-bold">
              +{numberFormatter.format(potentialCashback)}
            </span>
          </p>
        )}

        {spendingStats &&
          spendingStats.minSpend &&
          spendingStats.minSpend > 0 && (
            <div className="text-xs flex justify-between items-center px-1">
              <span className="text-slate-500">Min Spend Progress:</span>
              <span
                className={cn(
                  "font-medium",
                  projectedSpend >= spendingStats.minSpend
                    ? "text-emerald-600"
                    : "text-amber-600",
                )}
              >
                {projectedSpend < spendingStats.minSpend && (
                  <span className="text-slate-400 mr-1 font-normal text-[10px] uppercase tracking-wide">
                    Spend More:
                  </span>
                )}
                {numberFormatter.format(projectedSpend)} /{" "}
                {numberFormatter.format(spendingStats.minSpend)}
              </span>
            </div>
          )}
      </div>
    </div >
  ) : null;

  const submitLabel = isSubmitting
    ? "Saving..."
    : isRefundMode
      ? refundStatus === "received"
        ? "Confirm Refund"
        : "Request Refund"
      : isEditMode
        ? "Update Transaction"
        : "Add Transaction";

  return (
    <>
      {transactionType === "quick-people" ? (
        <div className="h-full flex flex-col">
          <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-3 shadow-sm">
            {TypeInput}
          </div>
          <div className="flex-1 overflow-auto px-6 py-6">
            <QuickPeopleSettings people={peopleState} />
          </div>
        </div>
      ) : (
        <form
          id="transaction-form"
          onSubmit={handleSubmit(
            (values) => {
              console.log("[Form Submit] Valid values:", JSON.stringify(values, null, 2));
              return onSubmit(values);
            },
            (errors) => {
              console.error(
                "[Form Validation Error]",
                JSON.stringify(errors, null, 2),
              );
              console.log("[Form Values at Failure]", JSON.stringify(form.getValues(), null, 2));
              // Optionally set a status error to inform user why nothing happened
              setStatus({
                type: "error",
                text: "Please fix the errors in the form.",
              });
            }
          )}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* STICKY HEADER */}
          <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm flex-none">
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {parentTxnId && (
                  <button
                    type="button"
                    onClick={() => onSwitchTransaction?.(parentTxnId)}
                    className="mr-1 p-1.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                    title="Back to Split Bill"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                {transactionType === "expense" && (
                  <div className="p-1.5 bg-rose-100 rounded-full">
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  </div>
                )}
                {transactionType === "income" && (
                  <div className="p-1.5 bg-emerald-100 rounded-full">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                {transactionType === "transfer" && (
                  <div className="p-1.5 bg-blue-100 rounded-full">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                  </div>
                )}
                {transactionType === "debt" && (
                  <div className="p-1.5 bg-purple-100 rounded-full">
                    <Wallet className="w-4 h-4 text-purple-600" />
                  </div>
                )}
                {transactionType === "repayment" && (
                  <div className="p-1.5 bg-amber-100 rounded-full">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                  </div>
                )}
                <h2 className="text-lg font-semibold text-slate-900 capitalize">
                  {isEditMode ? "Edit" : "New"}{" "}
                  {transactionType === "debt"
                    ? "Lending"
                    : transactionType === "repayment"
                      ? "Repayment"
                      : transactionType}
                </h2>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-3">
              <Controller
                control={control}
                name="type"
                render={() => <>{TypeInput}</>}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[500px]">
            {status?.type === "error" && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {status.text}
              </div>
            )}

            {isDebtForm ? (
              <div className="space-y-4">
                {transactionType === "repayment" ? (
                  <div className="space-y-4">
                    {/* REPAYMENT LAYOUT */}
                    {/* Row 1: Date - Tag */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <div>{DateInput}</div>
                      <div>{TagInput}</div>
                    </div>

                    {/* Row 2: To Account (Source) - Shop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <div>{SourceAccountInput}</div>
                      <div>{ShopInput}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <div>{CategoryInput}</div>
                      <div>{PersonInput}</div>
                    </div>

                    {/* Destination Account Link Section */}
                    {(transactionType === "repayment" || transactionType === "debt" || transactionType === "transfer") && (
                      <div className={cn(
                        "p-3 rounded-lg border transition-all",
                        (!form.getValues("debt_account_id") || errors.debt_account_id)
                          ? "bg-amber-50 border-amber-200"
                          : "bg-slate-50 border-slate-200"
                      )}>
                        {(!form.getValues("debt_account_id") || errors.debt_account_id) && !isSplitBill && (
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] font-bold text-amber-600 uppercase">Manual Link Required</span>
                          </div>
                        )}
                        {DestinationAccountInput}
                      </div>
                    )}

                    {/* Row 4: Amount - Note */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <div>{AmountInput}</div>
                      <div>{NoteInput}</div>
                    </div>

                    {/* Bulk Repayment Mode (Bottom) */}
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="bulk-repay" className="text-sm font-medium text-slate-900">
                          Bulk Repayment Mode
                        </Label>
                        <p className="text-xs text-slate-500">
                          Automatically allocate to oldest debts first. Manually edit to override.
                        </p>
                      </div>
                      <Switch
                        id="bulk-repay"
                        checked={bulkRepayment}
                        onCheckedChange={setBulkRepayment}
                      />
                    </div>

                    {/* Interactive Allocation Preview */}
                    {bulkRepayment && outstandingDebts.length > 0 && (
                      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-2">
                            <LayoutList className="w-3 h-3" />
                            Allocation Preview
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                console.log("[Form Debug] Allocation Reset clicked");
                                setAllocationOverrides({});
                                setIgnoredDebtIds(new Set());
                              }}
                              className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                              title="Reset and Restore All"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Reset
                            </button>
                            <span className="text-xs font-medium text-blue-600">
                              {allocationPreview ? (
                                `Allocated: ${numberFormatter.format(allocationPreview.totalAllocated)} / ${numberFormatter.format(watchedAmount || 0)}`
                              ) : "Calculating..."}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                          {outstandingDebts
                            .filter(d => !ignoredDebtIds.has(d.id))
                            .map((debt: TransactionWithDetails) => {
                              const allocEntry = allocationPreview?.paidDebts.find((p: any) => p.transaction.id === debt.id);
                              const allocatedAmount = allocEntry?.allocatedAmount || 0;
                              // const isManual = allocEntry?.isManual || false;
                              const isOverpaid = allocatedAmount > Math.abs(debt.amount);

                              return (
                                <div key={debt.id} className="flex items-center gap-2 text-xs text-slate-700 border-b border-blue-100/50 pb-1 last:border-0 last:pb-0">
                                  {/* INFO */}
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate font-medium">
                                      {format(parseISO(debt.occurred_at), "dd.MM.yyyy")} - {debt.note || "No Note"}
                                    </div>
                                    <div className="text-[10px] text-slate-500 flex flex-wrap gap-2">
                                      <span>Total: {numberFormatter.format(Math.abs(debt.amount))}</span>
                                      {/* Overpay Warning */}
                                      {isOverpaid && (
                                        <span className="text-red-600 font-bold flex items-center gap-0.5">
                                          <AlertCircle className="w-3 h-3" /> Overpay! (+{numberFormatter.format(allocatedAmount - Math.abs(debt.amount))})
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Trash Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSet = new Set(ignoredDebtIds);
                                      newSet.add(debt.id);
                                      setIgnoredDebtIds(newSet);

                                      // Clear any manual override
                                      const newOverrides = { ...allocationOverrides };
                                      delete newOverrides[debt.id];
                                      setAllocationOverrides(newOverrides);
                                    }}
                                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded-md hover:bg-rose-50 transition-colors flex-none"
                                    title="Exclude from allocation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Absorb Remaining Button */}
                                  {allocationPreview?.remainingRepayment && allocationPreview.remainingRepayment > 0.1 ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const remaining = allocationPreview.remainingRepayment;
                                        const newTotal = allocatedAmount + remaining;
                                        const newOverrides = { ...allocationOverrides };
                                        newOverrides[debt.id] = newTotal;
                                        setAllocationOverrides(newOverrides);
                                      }}
                                      className="text-emerald-500 hover:text-emerald-700 p-1.5 rounded-md hover:bg-emerald-50 transition-colors flex-none"
                                      title="Absorb all remaining amount"
                                    >
                                      <ArrowDownToLine className="w-3.5 h-3.5" />
                                    </button>
                                  ) : null}

                                  {/* INPUT */}
                                  <div className="w-24 flex-none">
                                    <input
                                      type="text"
                                      className={cn(
                                        "w-full h-7 px-2 text-right text-xs rounded border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-sans",
                                        allocationOverrides[debt.id] !== undefined && "bg-yellow-50 border-yellow-300 font-semibold",
                                        isOverpaid && "text-red-600 border-red-300 bg-red-50"
                                      )}
                                      value={numberFormatter.format(allocatedAmount)}
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(/,/g, '');
                                        if (raw === "") {
                                          const newOverrides = { ...allocationOverrides };
                                          newOverrides[debt.id] = 0;
                                          setAllocationOverrides(newOverrides);
                                          return;
                                        }
                                        const val = parseInt(raw, 10);
                                        if (!isNaN(val)) {
                                          const newOverrides = { ...allocationOverrides };
                                          newOverrides[debt.id] = val;
                                          setAllocationOverrides(newOverrides);
                                        }
                                      }}
                                      onBlur={() => {
                                        // Optional: On blur, if 0 and auto would be 0, maybe clear override?
                                        // For now keep it simple.
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}


                          {allocationPreview && allocationPreview.remainingRepayment > 0.1 && (
                            <div className="flex justify-between text-xs text-orange-600 font-medium pt-1">
                              <span>Unallocated Remaining:</span>
                              <span>{numberFormatter.format(allocationPreview.remainingRepayment)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* LENDING LAYOUT (Original) */
                  <div className="space-y-4">
                    {/* Row 1: Date - Tag */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <div>{DateInput}</div>
                      <div>{TagInput}</div>
                    </div>
                    {/* Row 2: Person - Note */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <div>{PersonInput}</div>
                      <div>{NoteInput}</div>
                    </div>
                    {/* Row 3: Category - Shop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <div>{CategoryInput}</div>
                      <div>{ShopInput}</div>
                    </div>
                    {/* Row 4: Account - Amount */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      <div>{SourceAccountInput}</div>
                      <div>{AmountInput}</div>
                    </div>

                    {/* Destination Account Link Section (Visible for Lending too) */}
                    <div className="hidden">
                      {(!form.getValues("debt_account_id") || errors.debt_account_id) && !isSplitBill && (
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                          <span className="text-[10px] font-bold text-amber-600 uppercase">Manual Link Required</span>
                        </div>
                      )}
                      {DestinationAccountInput}
                    </div>
                  </div>
                )}

                {/* VolunteerSection removed (Merged into Cashback UI) */}

                {InstallmentSection}
                {SplitBillSection}
              </div>
            ) : transactionType === "income" ? (
              <div className="space-y-4">
                {/* Row 1: Date - Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    {DateInput}
                  </div>
                  <div>
                    {NoteInput}
                  </div>
                </div>

                {/* Row 2: To Account - Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    {SourceAccountInput}
                  </div>
                  <div>
                    {CategoryInput}
                  </div>
                </div>

                {/* Row 3: Amount (Full Width) */}
                <div className="w-full">
                  {AmountInput}
                </div>

                {SplitBillSection}
              </div>
            ) : transactionType === "expense" ? (
              <div className="space-y-4">
                {/* EXPENSE LAYOUT (New) */}
                {/* Row 1: Date - Note */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>{DateInput}</div>
                  <div>{NoteInput}</div>
                </div>

                {/* Row 2: From Account - Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>{SourceAccountInput}</div>
                  <div>{CategoryInput}</div>
                </div>

                {/* Row 3: Shop */}
                <div className="w-full">
                  {ShopInput}
                </div>

                {/* Row 4: Amount */}
                <div className="w-full">
                  {AmountInput}
                </div>

                {/* Extras */}
                {SplitBillToggle}
                {RefundStatusInput}
                {SplitBillSection}
              </div>
            ) : (
              /* TRANSFER LAYOUT (Original Fallback) */
              <>
                <div className="space-y-4 mb-4">
                  {AmountInput}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    {DateInput}
                    {NoteInput}
                    {TagInput}
                  </div>
                  <div className="space-y-4">
                    {SourceAccountInput}
                    {CategoryInput}
                    {ShopInput}
                    {SplitBillToggle}
                    {DestinationAccountInput}
                    {RefundStatusInput}
                  </div>
                </div>

                {SplitBillSection}
              </>
            )}

            <div className="space-y-4 pt-2 border-t border-slate-100">
              {/* Allocation Preview removed from here (moved to Repayment block) */}

              {!isDebtForm && InstallmentSection}
              {CashbackModeInput}
            </div>
          </div >


          {/* FIXED FOOTER */}
          < div className="sticky bottom-0 z-20 bg-white border-t border-slate-100 px-5 py-4 flex-none" >
            <div className="flex justify-end gap-3">
              {isEditMode && (
                <button
                  type="button"
                  // Add delete handler logic here if needed, or if it was supposed to be here
                  className="mr-auto text-rose-600 text-sm font-medium hover:underline"
                >
                  Delete
                </button>
              )}

              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || cashbackExceedsAmount}
                className={cn(
                  "rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700",
                )}
                title={
                  cashbackExceedsAmount
                    ? "Cashback must be less than amount"
                    : undefined
                }
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                )}
                {submitLabel}
              </button>
            </div>
          </div >
        </form >
      )
      }


      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onSuccess={() => {
          // Ideally we should refresh categories or select the new one
          // But for now just closing is fine, the parent might refresh
        }}
        defaultType={transactionType === "income" ? "income" : "expense"}
      />

      <AddShopDialog
        open={isShopDialogOpen}
        onOpenChange={setIsShopDialogOpen}
        categories={categories}
        preselectedCategoryId={watchedCategoryId}
        onShopCreated={(shop) => {
          console.log("Shop created, auto-selecting:", shop);
          setShopsState(prev => [...prev, shop]);
          form.setValue("shop_id", shop.id, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
      />

      <CreatePersonDialog
        open={isPersonDialogOpen}
        onOpenChange={setIsPersonDialogOpen}
        subscriptions={[]}
      />
      <EditAccountDialog
        account={
          {
            id: "new",
            name: "",
            type: accountFilter === 'credit' ? 'credit_card' : 'bank',
            current_balance: 0,
            credit_limit: undefined,
            cashback_config: null,
            secured_by_account_id: undefined,
            is_active: true,
            owner_id: "",
            image_url: null,
          } as Account
        }
        open={isAccountDialogOpen}
        onOpenChange={setIsAccountDialogOpen}
        accounts={allAccounts}
        onSuccess={(newAccount) => {
          console.log("Account created, auto-selecting:", newAccount);
          setSourceAccountsState(prev => [...prev, newAccount]);
          if (accountDialogContext === 'source') {
            form.setValue('source_account_id', newAccount.id, { shouldValidate: true, shouldDirty: true });
          }
          setAccountDialogContext(null);
        }}
      />
    </>
  );
}
