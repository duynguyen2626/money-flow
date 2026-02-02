/**
 * ⚠️ DEPRECATED - OLD MODAL DIALOG SYSTEM ⚠️
 * 
 * This file is part of the old modal-based transaction form (center screen popup).
 * The current system uses TransactionSlideV2 (slide-in panel from right edge).
 * 
 * **Current (V2):** src/components/transaction/slide-v2/transaction-slide-v2.tsx
 * 
 * This file is kept for backward compatibility with legacy components but should
 * NOT be used for new features. Migrate existing usages to TransactionSlideV2.
 * 
 * Last updated: Feb 2026
 */

"use client";

import { MouseEvent, ReactNode, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Slot } from "@radix-ui/react-slot";
import { TransactionForm, TransactionFormValues } from "./transaction-form";
import { useRouter, useSearchParams } from "next/navigation";
import { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { Installment } from "@/services/installment.service";
import { ArrowLeft } from "lucide-react";

type AddTransactionDialogProps = {
  accounts: Account[];
  categories: Category[];
  people: Person[];

  shops?: Shop[];
  installments?: Installment[];
  buttonText?: string;
  defaultTag?: string;
  defaultPersonId?: string;
  defaultType?: "expense" | "income" | "debt" | "transfer" | "repayment";
  buttonClassName?: string;
  defaultSourceAccountId?: string;
  defaultTargetAccountId?: string;
  defaultDebtAccountId?: string;
  defaultAmount?: number;
  triggerContent?: ReactNode;
  onOpen?: () => void;
  listenToUrlParams?: boolean;
  asChild?: boolean;
  cloneInitialValues?: Partial<TransactionFormValues> & {
    split_group_id?: string;
    split_person_ids?: string[];
  };
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBackToChat?: () => void;
  backToChatLabel?: string;
  // Edit Mode Props
  mode?: "create" | "edit" | "refund";
  transactionId?: string;
  initialValues?: Partial<TransactionFormValues> & {
    split_group_id?: string;
    split_person_ids?: string[];
  };
  onSuccess?: (txn?: any) => void;
};

export function AddTransactionDialog({
  accounts,
  categories,
  people,
  shops = [],
  installments = [],
  buttonText = "Add Transaction",
  defaultTag,
  defaultPersonId,
  defaultType,
  buttonClassName,
  defaultSourceAccountId,
  defaultTargetAccountId,
  defaultDebtAccountId,
  defaultAmount,
  triggerContent,
  onOpen,
  listenToUrlParams,
  asChild = false,
  cloneInitialValues,
  isOpen,
  onOpenChange,
  onBackToChat,
  backToChatLabel = "Back to chat",
  mode = "create",
  transactionId,
  initialValues,
  onSuccess,
}: AddTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen ?? internalOpen;

  // New: Internal state for fetched initial values
  const [fetchedInitialValues, setFetchedInitialValues] = useState<Partial<TransactionFormValues> | undefined>(undefined);
  const [isFetchingTransaction, setIsFetchingTransaction] = useState(false);

  // Phase 7X: Fetch installments if not provided
  const [fetchedInstallments, setFetchedInstallments] = useState<Installment[]>([]);
  useEffect(() => {
    if (open && installments.length === 0) {
      import("@/services/installment.service").then(({ getActiveInstallments }) => {
        getActiveInstallments().then((data) => {
          if (data) setFetchedInstallments(data);
        });
      });
    }
  }, [open, installments.length]);

  // Internal state for handling navigation between transactions (Parent <-> Child)
  const [activeTransactionId, setActiveTransactionId] = useState<string | undefined>(transactionId);

  // Reset active ID when prop changes (new open)
  useEffect(() => {
    setActiveTransactionId(transactionId);
  }, [transactionId, open]);

  // Handle switching transaction (e.g. from Child back to Parent, or Parent to Child)
  const handleSwitchTransaction = (newId: string | undefined) => {
    console.log("[AddTransactionDialog] Switching to transaction:", newId);
    setFetchedInitialValues(undefined); // Clear old values
    setIsFetchingTransaction(true); // Trigger loading
    setActiveTransactionId(newId); // Update ID to trigger fetch effect
    // The existing fetch effect below depends on `activeTransactionId` (which we update in the next effect)
  };

  // Fix: Fetch transaction details if ID is provided but initialValues are missing (e.g. from Debt Cycle Popover)
  // OR if initialValues indicate this is a child transaction (needs redirection to parent)
  useEffect(() => {
    // Only proceed if dialog is open and we have a transactionId in edit mode
    // Use activeTransactionId instead of prop transactionId
    if (!open || !activeTransactionId || mode !== 'edit') return;

    // Check if we need to redirect to parent
    const meta = (initialValues as any)?.metadata;
    // Helper to safely check property existence in varied meta shapes
    const parentIdFromMeta =
      meta?.parent_transaction_id ||
      (typeof meta === 'string' && meta.includes('parent_transaction_id') ? JSON.parse(meta).parent_transaction_id : undefined);

    const isChild = !!parentIdFromMeta;

    // If we have initialValues AND it's not a child that needs redirection, we can skip fetching
    // BUT only if we haven't switched IDs (activeTransactionId === transactionId)
    if (initialValues && !isChild && activeTransactionId === transactionId) {
      if (fetchedInitialValues) {
        // keep
      }
      return;
    }

    setIsFetchingTransaction(true);
    setFetchedInitialValues(undefined); // Clear previous

    const fetchDetails = async () => {
      try {
        const { loadTransactions } = await import("@/services/transaction.service");
        // Load the ACTIVE transaction
        const txns = await loadTransactions({ transactionId: activeTransactionId });

        if (txns && txns.length > 0) {
          const { buildEditInitialValues, parseMetadata } = await import("@/lib/transaction-mapper");

          const firstTxn = txns[0];
          const parsedMeta = parseMetadata(firstTxn.metadata);

          // Re-check parent ID from the fresh fetch (only if we are initially loading and want auto-redirect)
          // tailored logic: if we explicitly switched to a child, don't auto redirect back?
          // Actually, we want to allow editing the child. The "Redirect to Parent" logic was mainly for the initial load?
          // Let's assume if we are manually switching, we trust the ID. 
          // If it's the very first load (activeTransactionId === transactionId), we might want to redirect.

          /* 
             NOTE: The previous logic forced redirect to Parent.
             Now we want to allow editing Child, but show a "Back" button.
             So we should disable the auto-redirect if we want to edit the child.
             BUT, if the user requested to edit a child from the Table, maybe they EXPECT to see the full bill?
             Current logic: "Redirecting to Parent".
             If we want to support "Edit Child" specifically, we should maybe ONLY redirect if it's the specific "Split Bill" view we want.
             
             Let's KEEP the redirect for the *initial* open if it's a child, assuming the user likely wants to see the whole context.
             BUT if we switched explicitly (activeTransactionId !== transactionId), we presume intent.
          */

          const trueParentId = (parsedMeta as any)?.parent_transaction_id;
          const isInitialLoad = activeTransactionId === transactionId;

          // Only auto-redirect on initial load if we prefer Parent view. 
          // However, user might have clicked "Edit" on a specific Child row.
          // If we redirect, we assume Parent edit is better.
          // Let's keep existing behavior for now, but ensure we can "Switch" to child later.
          // Wait, if we redirect to Parent, how do we edit Child?
          // We need to render the Child form.
          // So actually, for the new flow, we might NOT want auto-redirect anymore?
          // Or we redirect, but then "Open Child" switches back.

          if (isInitialLoad && typeof trueParentId === 'string' && trueParentId) {
            // ... existing redirect logic ...
            // We can let it setFetchedInitialValues to Parent
            // AND setActiveTransactionId(trueParentId) to match?
            // If we just set fetchedInitialValues, the Form receives Parent data but ID is Child ID? Mismatch.

            console.log("[AddTransactionDialog] Child transaction detected. Redirecting to Parent:", trueParentId);
            setActiveTransactionId(trueParentId); // Restart effect with Parent ID
            return;
          }

          // Fallback: Just load the requested transaction
          console.log("[AddTransactionDialog] Loading transaction details:", firstTxn.id);
          const formatted = buildEditInitialValues(firstTxn);

          // Fix: Ensure debt_account_id is populated if missing but person is known
          if (formatted.person_id && !formatted.debt_account_id && people) {
            const p = people.find(x => x.id === formatted.person_id);
            if (p?.debt_account_id) {
              console.log("[AddTransactionDialog] Backfilling missing debt_account_id from person:", p.name);
              formatted.debt_account_id = p.debt_account_id;
            }
          }

          setFetchedInitialValues(formatted);

        } else {
          console.warn("[AddTransactionDialog] Transaction not found:", activeTransactionId);
        }
      } catch (error) {
        console.error("[AddTransactionDialog] Failed to load transaction:", error);
      } finally {
        setIsFetchingTransaction(false);
      }
    };

    fetchDetails();

  }, [open, activeTransactionId, transactionId, initialValues, mode]);

  const effectiveInstallments = installments.length > 0 ? installments : fetchedInstallments;

  const handleOpenChange = (newOpen: boolean) => {
    if (isOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const router = useRouter();

  const searchParams = useSearchParams();
  const [urlValues, setUrlValues] = useState<any>(null);

  useEffect(() => {
    if (listenToUrlParams && searchParams.get("action") === "new") {
      handleOpenChange(true);

      const amountParam = searchParams.get("amount");
      const noteParam = searchParams.get("note");
      const shopParam = searchParams.get("shop");
      const personParam = searchParams.get("for");

      const amount = amountParam ? parseFloat(amountParam) : undefined;

      let shopId = undefined;
      if (shopParam) {
        const found = shops.find(
          (s) => s.name.toLowerCase() === shopParam.toLowerCase(),
        );
        shopId = found?.id;

        if (!shopId && shopParam.toLowerCase() === "shopee") {
          const shopee = shops.find((s) =>
            s.name.toLowerCase().includes("shopee"),
          );
          shopId = shopee?.id;
        }
      }

      setUrlValues({
        amount,
        note: noteParam || undefined,
        shop_id: shopId,
        person_id: personParam || undefined,
      });
    }
  }, [listenToUrlParams, searchParams, shops]);

  const handleSuccess = (txn?: any) => {
    handleOpenChange(false);
    setUrlValues(null); // Reset
    router.refresh();
    onSuccess?.(txn);
  };

  const closeDialog = () => {
    handleOpenChange(false);
    setUrlValues(null);
  };

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [closeAction, setCloseAction] = useState<"close" | "backToChat" | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (open) {
      // In edit or refund mode, consider it as having unsaved changes initially
      // so warning shows when trying to close without saving
      const considerAsChanged = mode === 'edit' || mode === 'refund';
      console.log('[AddTransactionDialog] Open state changed:', { mode, considerAsChanged });
      setHasUnsavedChanges(considerAsChanged);
      setShowCloseWarning(false);
      setCloseAction(null);
    }
  }, [open, mode]);

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < 768);
      }
    };
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  // Memoize initialValues to prevent recalculation on every render (which was clearing user input)
  const memoizedInitialValues = useMemo(() => ({
    ...urlValues,
    ...(defaultAmount ? { amount: defaultAmount } : {}),
    ...(defaultPersonId && !initialValues?.person_id ? { person_id: defaultPersonId } : {}),
    ...(defaultSourceAccountId && !initialValues?.source_account_id ? { source_account_id: defaultSourceAccountId } : {}),
    ...(defaultTargetAccountId && !initialValues?.target_account_id ? { target_account_id: defaultTargetAccountId } : {}),
    // Auto-populate Category based on type
    ...(!initialValues?.category_id && defaultType ? (() => {
      if (defaultType === 'repayment') {
        const repaymentCat = categories.find(c =>
          c.name.toLowerCase().includes('thu nợ') ||
          c.name.toLowerCase().includes('repayment')
        );
        return repaymentCat ? { category_id: repaymentCat.id } : {};
      } else if (defaultType === 'debt') {
        const shoppingCat = categories.find(c =>
          c.name.toLowerCase().includes('people shopping') ||
          c.name.toLowerCase() === 'shopping'
        );
        return shoppingCat ? { category_id: shoppingCat.id } : {};
      }
      return {};
    })() : {}),
    // Auto-populate Shop based on type
    ...(!initialValues?.shop_id && defaultType === 'debt' ? (() => {
      const shopeeShop = shops.find(s =>
        s.name.toLowerCase().includes('shopee')
      );
      return shopeeShop ? { shop_id: shopeeShop.id } : {};
    })() : {}),
    // Auto-populate Source Account (smart defaults based on type)
    ...(!initialValues?.source_account_id && !defaultSourceAccountId ? (() => {
      if (typeof window !== 'undefined') {
        try {
          const recentStr = localStorage.getItem('recentAccountIds');
          if (recentStr) {
            const recentIds = JSON.parse(recentStr) as string[];
            const recentAccount = accounts.find(a => a.id === recentIds[0]);
            if (recentAccount && recentAccount.is_active !== false) {
              return { source_account_id: recentAccount.id };
            }
          }
        } catch (e) {
          // Ignore localStorage errors
        }
      }

      // Fallback: Smart defaults based on transaction type
      if (defaultType === 'debt') {
        const creditCard = accounts.find(a =>
          a.type === 'credit_card' && a.is_active !== false
        );
        if (creditCard) {
          return { source_account_id: creditCard.id };
        }
      } else if (defaultType === 'repayment') {
        const bankAccount = accounts.find(a =>
          (a.type === 'bank' || a.type === 'ewallet') && a.is_active !== false
        );
        if (bankAccount) {
          return { source_account_id: bankAccount.id };
        }
      }

      return {};
    })() : {}),
    ...(cloneInitialValues || {}),
    ...(initialValues || {}),
    ...(fetchedInitialValues || {}),
  }), [
    urlValues,
    defaultAmount,
    defaultPersonId,
    defaultType,
    defaultSourceAccountId,
    defaultTargetAccountId,
    categories,
    shops,
    accounts,
    cloneInitialValues,
    initialValues,
    fetchedInitialValues,
  ]);

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on overlay, not on content
    if (event.target === event.currentTarget) {
      console.log('[AddTransactionDialog] Overlay click - hasUnsavedChanges:', hasUnsavedChanges);
      if (hasUnsavedChanges) {
        setCloseAction("close");
        setShowCloseWarning(true);
        console.log('[AddTransactionDialog] Showing warning dialog');
      } else {
        closeDialog();
      }
    }
  };

  const confirmClose = () => {
    setShowCloseWarning(false);
    setHasUnsavedChanges(false);
    const action = closeAction ?? "close";
    setCloseAction(null);
    closeDialog();
    if (action === "backToChat") {
      onBackToChat?.();
    }
  };

  const handleCloseRequest = (action: "close" | "backToChat", skipWarning = false) => {
    console.log('[AddTransactionDialog] Close request - hasUnsavedChanges:', hasUnsavedChanges, 'action:', action, 'skipWarning:', skipWarning);
    // Show warning only if there are unsaved changes and user hasn't explicitly skipped it
    if (hasUnsavedChanges && !skipWarning) {
      setCloseAction(action);
      setShowCloseWarning(true);
    } else {
      closeDialog();
      if (action === "backToChat") {
        onBackToChat?.();
      }
    }
  };

  const defaultClassName =
    triggerContent && !asChild
      ? "inline-flex items-center justify-center rounded-md p-0 bg-transparent text-inherit focus:outline-none focus-visible:ring-0"
      : "rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600";

  const Comp = asChild ? Slot : "button";

  return (
    <>
      <Comp
        type={asChild ? undefined : "button"}
        className={buttonClassName || defaultClassName}
        onMouseDown={onOpen}
        onClick={(event) => {
          event.stopPropagation();
          onOpen?.();
          handleOpenChange(true);
        }}
        aria-label={
          typeof buttonText === "string" ? buttonText : "Add transaction"
        }
      >
        {triggerContent ?? buttonText}
      </Comp>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add Transaction"
            className="fixed inset-0 z-[100] flex items-start md:items-center justify-center bg-black/60 px-0 md:px-4 py-4 backdrop-blur-sm"
            onClick={handleOverlayClick}
          >
            <div
              className={`flex w-full flex-col bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden ${isMobile ? "h-[100dvh] max-w-none rounded-none" : "max-w-2xl md:max-w-3xl rounded-2xl"} `}
              style={{ maxHeight: isMobile ? "none" : "90vh" }}
              onClick={stopPropagation}
            >
              {isFetchingTransaction ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4 h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="text-sm text-slate-500 font-medium">Loading transaction details...</p>
                </div>
              ) : (
                <TransactionForm
                  accounts={accounts}
                  categories={categories}
                  people={people}
                  shops={shops}
                  installments={effectiveInstallments}
                  onSuccess={handleSuccess}
                  onCancel={() => {
                    handleCloseRequest("close", true); // Skip warning for explicit Cancel action
                  }}
                  onFormChange={setHasUnsavedChanges}
                  defaultTag={defaultTag}
                  defaultPersonId={defaultPersonId}
                  defaultType={defaultType}
                  defaultSourceAccountId={defaultSourceAccountId}
                  defaultDebtAccountId={defaultDebtAccountId}
                  transactionId={activeTransactionId} // Use active ID
                  onSwitchTransaction={handleSwitchTransaction} // Pass switcher
                  mode={mode}
                  initialValues={memoizedInitialValues}
                />
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Unsaved Changes Warning Dialog - Separate Portal to ensure it's on top */}
      {showCloseWarning &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 pointer-events-none">
            <div
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100 pointer-events-auto relative z-[10000]"
              onClick={stopPropagation}
            >
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-slate-900 leading-none tracking-tight">
                  Unsaved Changes
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  You have unsaved changes. Are you sure you want to close
                  without saving?
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowCloseWarning(false)}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                >
                  Continue Editing
                </button>
                <button
                  onClick={confirmClose}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-950"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
