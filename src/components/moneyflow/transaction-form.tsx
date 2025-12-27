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
import { ensureDebtAccountAction } from "@/actions/people-actions";
import {
  createTransaction,
  updateTransaction,
  requestRefund,
  confirmRefund,
} from "@/services/transaction.service";
import {
  previewCashbackAction,
  CashbackPreviewResult,
} from "@/actions/cashback-preview.action";
import { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { getDisplayBalance } from "@/lib/display-balance";
import {
  CashbackCard,
  AccountSpendingStats,
  CashbackPolicyMetadata,
} from "@/types/cashback.types";
import { Installment } from "@/services/installment.service";
import { Combobox } from "@/components/ui/combobox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateTag } from "@/lib/tag";
import { REFUND_PENDING_ACCOUNT_ID } from "@/constants/refunds";
import {
  Wallet,
  Store,
  Tag,
  Calendar,
  FileText,
  Percent,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  ChevronLeft,
  ExternalLink,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn, getAccountInitial } from "@/lib/utils";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { CategoryDialog } from "@/components/moneyflow/category-dialog";
import { AddShopDialog } from "@/components/moneyflow/add-shop-dialog";
import { CreatePersonDialog } from "@/components/people/create-person-dialog";
import {
  formatPercent,
  formatPolicyLabel,
  normalizePolicyMetadata,
} from "@/lib/cashback-policy";

import { EditAccountDialog } from "./edit-account-dialog";
import { QuickPeopleSettings } from "./quick-people-settings";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

const formSchema = z
  .object({
    occurred_at: z.date(),
    type: z.enum(["expense", "income", "debt", "transfer", "repayment"]),
    amount: z.coerce.number().positive(),
    note: z.string().optional(),
    tag: z.string().min(1, "Tag is required"),
    source_account_id: z
      .string()
      .min(1, { message: "Please select an account." }),
    category_id: z.string().optional(),
    person_id: z.string().optional(),
    debt_account_id: z.string().optional(),
    cashback_share_percent: z.coerce.number().min(0).optional(),
    cashback_share_fixed: z.coerce.number().min(0).optional(),
    shop_id: z.string().optional(),
    is_voluntary: z.boolean().optional(),
    is_installment: z.boolean().optional(),
    installment_plan_id: z.string().optional(),
    cashback_mode: z
      .enum(["none_back", "voluntary", "real_fixed", "real_percent"])
      .optional(),
  })
  .refine(
    (data) => {
      if (
        (data.type === "expense" || data.type === "income") &&
        !data.category_id
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Category is required for expenses and incomes.",
      path: ["category_id"],
    },
  )
  .refine(
    (data) => {
      if (
        (data.type === "debt" || data.type === "repayment") &&
        !data.person_id
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Please choose a person for this transaction.",
      path: ["person_id"],
    },
  )
  .refine(
    (data) => {
      if (
        (data.type === "debt" ||
          data.type === "transfer" ||
          data.type === "repayment") &&
        !data.debt_account_id
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Destination account is required for this transaction.",
      path: ["debt_account_id"],
    },
  )
  .refine(
    (data) => {
      if (
        (data.type === "transfer" ||
          data.type === "debt" ||
          data.type === "repayment") &&
        data.debt_account_id &&
        data.debt_account_id === data.source_account_id
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Source and destination must be different.",
      path: ["debt_account_id"],
    },
  );

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
const REFUND_CATEGORY_ID = "e0000000-0000-0000-0000-000000000095";

export type TransactionFormValues = z.infer<typeof formSchema>;

function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const legacyMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!isoMatch && !legacyMatch) return null;

  const year = Number(isoMatch ? isoMatch[1] : legacyMatch![3]);
  const month = Number(isoMatch ? isoMatch[2] : legacyMatch![2]);
  const day = Number(isoMatch ? isoMatch[3] : legacyMatch![1]);

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const candidate = new Date(year, month - 1, day, 12, 0, 0);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return candidate;
}

type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  shops?: Shop[];
  installments?: Installment[]; // Phase 7X
  onSuccess?: () => void;
  defaultTag?: string;
  defaultPersonId?: string;
  defaultType?: "expense" | "income" | "debt" | "transfer" | "repayment";
  defaultSourceAccountId?: string;
  defaultDebtAccountId?: string;
  transactionId?: string;
  initialValues?: Partial<TransactionFormValues> & {
    category_name?: string;
    account_name?: string;
    metadata?: any;
  };
  mode?: "create" | "edit" | "refund";
  refundTransactionId?: string;
  refundAction?: "request" | "confirm";
  refundMaxAmount?: number;
  defaultRefundStatus?: "pending" | "received";
  onCancel?: () => void;
  onFormChange?: (hasChanges: boolean) => void;
};

type StatusMessage = {
  type: "success" | "error";
  text: string;
} | null;

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
  initialValues,
  installments = [], // Phase 7X
  mode = "create",
  refundTransactionId,
  refundAction = "request",
  refundMaxAmount,
  defaultRefundStatus = "pending",
  onCancel,
  onFormChange,
}: TransactionFormProps) {
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
    peopleState.forEach((person) => {
      if (person.debt_account_id) {
        map.set(person.id, person.debt_account_id);
      }
    });
    return map;
  }, [peopleState]);

  const refundCategoryId = useMemo(() => {
    const direct = categories.find((cat) => cat.id === REFUND_CATEGORY_ID);
    if (direct) return direct.id;
    const byName = categories.find((cat) =>
      (cat.name ?? "").toLowerCase().includes("refund"),
    );
    return byName?.id ?? REFUND_CATEGORY_ID;
  }, [categories]);

  const [, setStatus] = useState<StatusMessage>(null);
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
  >("credit");
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

  // Prompt unsaved changes on refresh/close
  useUnsavedChanges(form.formState.isDirty);

  const applyDefaultPersonSelection = useCallback(() => {
    if (!defaultPersonId) {
      return;
    }
    const direct = personMap.get(defaultPersonId);
    if (direct) {
      form.setValue("person_id", direct.id, { shouldDirty: false });
      form.setValue("debt_account_id", direct.debt_account_id ?? undefined, { shouldDirty: false });
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

      if (sourceAcc?.type === "debt") {
        if (newValues.debt_account_id) {
          const temp = newValues.source_account_id;
          newValues.source_account_id = newValues.debt_account_id;
          newValues.debt_account_id = temp;
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
        "[TransactionForm] Resetting form with new values (Clone/Edit update)",
      );
      form.reset(newValues, { keepDirty: false });
      setManualTagMode(true);
      setTransactionType(newValues.type);
      setIsInstallment(Boolean(initialValues.is_installment));
      if (initialValues.installment_plan_id) {
        form.setValue("installment_plan_id", initialValues.installment_plan_id, { shouldDirty: false });
      }
      initialValuesRef.current = initialValues;
    }
  }, [baseDefaults, form, initialValues, allAccounts]);

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

      const rawPercent = Number(values.cashback_share_percent ?? 0);

      // Check if this is a group debt repayment and append payer name to note
      const selectedPerson = values.person_id
        ? personMap.get(values.person_id)
        : null;
      const isGroupDebt =
        selectedPerson?.name?.toLowerCase().includes("clt") ||
        selectedPerson?.name?.toLowerCase().includes("group");

      let finalNote = values.note ?? "";
      if (
        (values.type === "repayment" || values.type === "debt") &&
        isGroupDebt &&
        payerName.trim()
      ) {
        finalNote = `${finalNote} (paid by ${payerName.trim()})`;
      }

      const payload: Parameters<typeof createTransaction>[0] = {
        ...values,
        occurred_at: values.occurred_at.toISOString(),
        shop_id: values.shop_id ?? undefined,
        note: finalNote,
        destination_account_id:
          values.type === "income" ? values.source_account_id : undefined,
        is_installment: isInstallment,
        cashback_share_percent: rawPercent / 100, // Always divide by 100 to store as decimal (0.08 for 8%)
        metadata: values.installment_plan_id
          ? {
            installment_id: values.installment_plan_id,
            ...(initialValues?.metadata || {}), // Preserve other metadata if any
          }
          : undefined,
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

        router.refresh();
        if (isEditMode) {
          onSuccess?.();
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
        });
        setManualTagMode(Boolean(defaultTag));
        setIsInstallment(false);
        applyDefaultPersonSelection();
        onSuccess?.();
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
    }
  }, [transactionType, categories, shops, form, isEditMode]);

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

  const watchedDate = useWatch({
    control,
    name: "occurred_at",
  });

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

  const watchedPersonId = useWatch({
    control,
    name: "person_id",
  });

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
    watchedDate,
    transactionType,
    allAccounts,
    form,
  ]);

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
      account: new Set(["bank", "cash", "ewallet"]),
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
      if (!matchesFilter(acc)) return false;

      if (
        acc.id === REFUND_PENDING_ACCOUNT_ID &&
        (!isRefundMode || refundStatus !== "pending")
      )
        return false;
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
      if (acc.type === "system" || acc.type === "debt") return false;
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
      peopleState.map((person) => ({
        value: person.id,
        label: person.name,
        description: person.email || "No email",
        searchValue: `${person.name} ${person.email ?? ""}`.trim(),
        icon: person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
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
          s.default_category_id === selectedCategoryId,
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
    if (!defaultPersonId) {
      return;
    }
    const currentPerson = form.getValues("person_id");
    const currentDebt = form.getValues("debt_account_id");
    if (currentPerson || currentDebt) {
      return;
    }
    applyDefaultPersonSelection();
  }, [applyDefaultPersonSelection, defaultPersonId, form]);

  useEffect(() => {
    if (transactionType !== "debt" && transactionType !== "repayment") {
      setDebtEnsureError(null);
      return;
    }
    if (!watchedPersonId) {
      form.setValue("debt_account_id", undefined, { shouldDirty: false });
      setDebtEnsureError(null);
      return;
    }
    setDebtEnsureError(null);
    const linkedAccountId = debtAccountByPerson.get(watchedPersonId);
    form.setValue("debt_account_id", linkedAccountId ?? undefined, { shouldDirty: false });
  }, [transactionType, watchedPersonId, debtAccountByPerson, form]);

  useEffect(() => {
    if (
      transactionType !== "expense" &&
      transactionType !== "debt" &&
      transactionType !== "repayment"
    ) {
      form.setValue("shop_id", undefined, { shouldDirty: false });
    }
  }, [transactionType, form]);

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
  }, [isRefundMode, watchedAccountId, watchedDate, watchedCategoryId]);

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
      `/api/cashback/progress?accountId=${selectedAccount.id}&date=${watchedDate.toISOString()}`,
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
  }, [selectedAccount?.id, watchedDate]);

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
            <TabsList className="grid w-full grid-cols-5 p-1 bg-slate-100/80 rounded-xl h-auto">
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
    if (transactionType !== "repayment" || !watchedDebtAccountId) return null;
    return allAccounts.find((acc) => acc.id === watchedDebtAccountId) ?? null;
  }, [transactionType, watchedDebtAccountId, allAccounts]);

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
    transactionType === "debt" ||
      transactionType === "repayment" ||
      (transactionType === "income" && !isRefundMode) ? (
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Person</label>
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
              />
            )}
          />
          {errors.person_id && (
            <p className="text-sm text-red-600 font-medium mt-1 animate-pulse">
              ⚠️ {errors.person_id.message}
            </p>
          )}
          {debtAccountName && (
            <p className="text-xs text-slate-500 mt-1">
              Debt Account:{" "}
              <span className="font-semibold text-slate-700">
                {debtAccountName}
              </span>
            </p>
          )}
        </div>

        {/* Payer Name Input for Group Debt Repayments/Lending */}
        {(transactionType === "repayment" || transactionType === "debt") &&
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

        {watchedPersonId && !debtAccountByPerson.get(watchedPersonId) ? (
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
        ) : watchedPersonId && debtAccountByPerson.get(watchedPersonId) ? (
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Linked
            </span>
            <a
              href={`/people/${watchedPersonId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              View Details <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}
        {errors.debt_account_id && (
          <p className="text-sm text-red-600 font-medium mt-1 animate-pulse">
            ⚠️ {errors.debt_account_id.message}
          </p>
        )}
      </div>
    ) : null;

  const DestinationAccountInput =
    transactionType === "transfer" ? (
      <div className="space-y-3">
        <div className="space-y-2">
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
      </div>
    ) : null;

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
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="yyyy-mm-dd"
              value={dateInputValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                setDateInputValue(nextValue);
                const parsed = parseDateInput(nextValue);
                if (parsed) {
                  field.onChange(parsed);
                }
              }}
              onBlur={() => {
                const parsed = parseDateInput(dateInputValue);
                if (!parsed && field.value) {
                  setDateInputValue(format(field.value, "yyyy-MM-dd"));
                }
              }}
              className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="button"
              onClick={() => {
                const input = hiddenDateInputRef.current;
                if (!input) return;
                const picker = input as HTMLInputElement & { showPicker?: () => void };
                if (typeof picker.showPicker === "function") {
                  picker.showPicker();
                } else {
                  input.focus();
                  input.click();
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700"
              aria-label="Open date picker"
            >
              <Calendar className="h-4 w-4" />
            </button>
            <input
              ref={hiddenDateInputRef}
              type="date"
              value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
              onChange={(event) => {
                const dateStr = event.target.value;
                if (!dateStr) return;
                const [y, m, d] = dateStr.split("-").map(Number);
                const newDate = new Date(y, m - 1, d, 12, 0, 0);
                field.onChange(newDate);
              }}
              className="absolute h-0 w-0 opacity-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
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

  const NoteInput = (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-500" />
        Note
      </label>
      <textarea
        {...register("note")}
        placeholder="Add a note..."
        className="min-h-[60px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {errors.note && (
        <p className="text-sm text-red-600">{errors.note.message}</p>
      )}
    </div>
  );

  const INSTALLMENT_MIN_AMOUNT = 3_000_000; // 3 million VND threshold
  const showInstallmentToggle =
    (transactionType === "debt" || transactionType === "repayment") &&
    !isRefundMode &&
    (watchedAmount ?? 0) >= INSTALLMENT_MIN_AMOUNT;

  const InstallmentInput = showInstallmentToggle ? (
    <div className="rounded-lg border border-slate-200 p-4 space-y-4 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <label className="text-sm font-medium text-slate-900">
            Installment Plan
          </label>
          <p className="text-xs text-slate-500">
            Convert this transaction into an installment plan
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
              }}
            />
          )}
        />
      </div>
    </div>
  ) : null;

  const InstallmentRepaymentSelector =
    (installments && installments.length > 0) ||
      form.getValues("installment_plan_id") ? (
      <div className="rounded-lg border border-purple-200 p-4 space-y-4 bg-purple-50/50">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <h4 className="text-sm font-semibold text-purple-900">
            Installment Repayment
          </h4>
        </div>
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
                  // Auto-fill details if plan selected details are available
                  const plan = installments.find((i) => i.id === val);
                  if (plan) {
                    // If Amount is empty or 0, auto fill monthly amount
                    const currentAmt = form.getValues("amount");
                    if (!currentAmt || currentAmt === 0) {
                      form.setValue("amount", plan.monthly_amount);
                    }

                    // Update Note if empty or generic
                    const currentNote = form.getValues("note");
                    if (!currentNote || currentNote.trim() === "") {
                      // Calculate month index
                      const start = new Date(plan.start_date);
                      const now = new Date();
                      // Rough month diff
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
                disabled={!installments.length && !!field.value} // Read-only if ID set but no list
              />
              {!installments.length && field.value && (
                <p className="text-[10px] text-purple-600 italic">
                  Linked to plan ID: {field.value.slice(0, 8)}... (List not
                  loaded)
                </p>
              )}
            </div>
          )}
        />
      </div>
    ) : null;

  const showCashbackSection =
    transactionType === "expense" ||
    (transactionType === "debt" && selectedAccount?.type === "credit_card");

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
                        spendingStats.maxCashback - spendingStats.earnedSoFar,
                      )
                      : Infinity;
                    const rateMaxAmount =
                      (amountValue * (rateLimitPercent ?? 100)) / 100;
                    const absoluteLimit = Math.min(budgetLeft, rateMaxAmount);
                    const currentFixed =
                      form.getValues("cashback_share_fixed") || 0;
                    const isFullyConsumedByFixed =
                      currentFixed >= absoluteLimit - 100; // tolerance

                    return (
                      <SmartAmountInput
                        value={field.value}
                        unit="%"
                        disabled={isFullyConsumedByFixed && !field.value} // Disable if consumed AND empty
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

                          const currentFixed =
                            form.getValues("cashback_share_fixed") || 0;
                          const remainingForPercent = Math.max(
                            0,
                            absoluteLimit - currentFixed,
                          );

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
                        spendingStats.maxCashback - spendingStats.earnedSoFar,
                      )
                      : Infinity;
                    const rateMaxAmount =
                      (amountValue * (rateLimitPercent ?? 100)) / 100;
                    const absoluteLimit = Math.min(budgetLeft, rateMaxAmount);
                    const currentPercent =
                      form.getValues("cashback_share_percent") || 0;
                    const percentAmount = (amountValue * currentPercent) / 100;
                    const isFullyConsumedByPercent =
                      percentAmount >= absoluteLimit - 100; // tolerance

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
                        <Sparkles className="h-3 w-3" />
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
                      // Total cannot exceed Amount
                      // Also Cap % by Card Rate
                      const currentFixed =
                        form.getValues("cashback_share_fixed") || 0;
                      const remainingForPercent = Math.max(
                        0,
                        amountValue - currentFixed,
                      );
                      let safePercent = val;

                      // 1. Cap by Card Rate (if exists)
                      if (
                        safePercent !== undefined &&
                        rateLimitPercent !== null &&
                        safePercent > rateLimitPercent
                      ) {
                        safePercent = rateLimitPercent;
                      }

                      // 2. Cap by Remaining Amount Space
                      if (safePercent !== undefined && amountValue > 0) {
                        const impliedAmount = (amountValue * safePercent) / 100;
                        if (impliedAmount > remainingForPercent) {
                          safePercent =
                            (remainingForPercent / amountValue) * 100;
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
                      // Total cannot exceed Amount
                      const currentPercent =
                        form.getValues("cashback_share_percent") || 0;
                      const percentAmount =
                        (amountValue * currentPercent) / 100;
                      const remainingForFixed = Math.max(
                        0,
                        amountValue - percentAmount,
                      );

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

          {/* Voluntary Real-time Display */}
          <div className="flex justify-between items-center px-2 py-1 bg-amber-100/50 rounded border border-amber-200/50">
            <span className="text-xs font-medium text-amber-700">
              Total Overflow:
            </span>
            <span className="text-sm font-bold text-amber-800">
              {numberFormatter.format(
                (amountValue * (watchedCashbackPercent || 0)) / 100 +
                (watchedCashbackFixed || 0),
              )}
            </span>
          </div>

          <p className="text-[10px] text-amber-600 italic">
            * This amount is tracked as overflow loss and does not count towards
            standard budget.
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
    </div>
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
          onSubmit={handleSubmit(onSubmit, (errors) => {
            console.error(
              "[Form Validation Error]",
              JSON.stringify(errors, null, 2),
            );
            // Optionally set a status error to inform user why nothing happened
            setStatus({
              type: "error",
              text: "Please fix the errors in the form.",
            });
          })}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* STICKY HEADER */}
          <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm flex-none">
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
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

            {/* Refund Status in Header if needed, or keep in body? keeping in body for now as it's niche */}
          </div>

          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            <div className="px-5 py-6 space-y-6">
              {RefundStatusInput}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {transactionType === "debt" ||
                  transactionType === "repayment" ? (
                  <>
                    <div className="md:col-span-2">{PersonInput}</div>
                    <div className="md:col-span-1">{DateInput}</div>
                    <div className="md:col-span-1">{TagInput}</div>
                    {/* Always show Category Input for Repayment now */}
                    <div className="md:col-span-1">{CategoryInput}</div>
                    <div
                      className={
                        transactionType === "repayment"
                          ? "md:col-span-1"
                          : "md:col-span-1"
                      }
                    >
                      {ShopInput}
                    </div>
                    <div className="md:col-span-1">{SourceAccountInput}</div>
                    <div className="md:col-span-1">{AmountInput}</div>
                  </>
                ) : (
                  <>
                    <div className="md:col-span-2">{DateInput}</div>
                    {transactionType === "transfer" ? (
                      <>
                        <div className="md:col-span-2">{CategoryInput}</div>
                        <div className="md:col-span-1">{SourceAccountInput}</div>
                        <div className="md:col-span-1">
                          {DestinationAccountInput}
                        </div>
                        <div className="md:col-span-2">{AmountInput}</div>
                      </>
                    ) : transactionType === "income" ? (
                      <>
                        <div className="md:col-span-1">{CategoryInput}</div>
                        <div className="md:col-span-1">{SourceAccountInput}</div>
                        <div className="md:col-span-1">{AmountInput}</div>
                        <div className="md:col-span-1">{PersonInput}</div>
                      </>
                    ) : (
                      <>
                        <div className="md:col-span-1">{CategoryInput}</div>
                        <div className="md:col-span-1">{ShopInput}</div>
                        <div className="md:col-span-1">{SourceAccountInput}</div>
                        <div className="md:col-span-1">{AmountInput}</div>
                        <div className="md:col-span-2">{PersonInput}</div>
                      </>
                    )}
                  </>
                )}

                <div className="col-span-1 md:col-span-2 space-y-4 pt-2 border-t border-slate-100">
                  {/* Phase 7X: Explicit Installment Toggle */}
                  {(transactionType === "repayment" || transactionType === "expense" || transactionType === "income") && installments.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="space-y-0.5">
                        <Label htmlFor="is-installment-repay" className="text-sm font-medium text-slate-900">
                          Pay for Installment?
                        </Label>
                        <p className="text-xs text-slate-500">
                          Link this {transactionType} to an active plan
                        </p>
                      </div>
                      <Controller
                        control={control}
                        name="is_installment"
                        render={({ field }) => (
                          <Switch
                            id="is-installment-repay"
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (!checked) {
                                form.setValue("installment_plan_id", undefined);
                              }
                            }}
                          />
                        )}
                      />
                    </div>
                  )}

                  {watchedIsInstallment && InstallmentRepaymentSelector}
                  {!watchedIsInstallment && InstallmentInput}
                  {CashbackModeInput}
                  {NoteInput}
                </div>
              </div>
            </div>
          </div>

          {/* FIXED FOOTER */}
          <div className="sticky bottom-0 z-20 bg-white border-t border-slate-100 px-5 py-4 flex-none">
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
          </div>
        </form>
      )}

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
