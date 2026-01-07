"use client";

import { MouseEvent, ReactNode, useState, useEffect } from "react";
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

  // Fix: Fetch transaction details if ID is provided but initialValues are missing (e.g. from Debt Cycle Popover)
  // OR if initialValues indicate this is a child transaction (needs redirection to parent)
  useEffect(() => {
    // Only proceed if dialog is open and we have a transactionId in edit mode
    if (!open || !transactionId || mode !== 'edit') return;

    // Check if we need to redirect to parent
    const meta = (initialValues as any)?.metadata;
    // Helper to safely check property existence in varied meta shapes
    const parentIdFromMeta =
      meta?.parent_transaction_id ||
      (typeof meta === 'string' && meta.includes('parent_transaction_id') ? JSON.parse(meta).parent_transaction_id : undefined);

    const isChild = !!parentIdFromMeta;

    // If we have initialValues AND it's not a child that needs redirection, we can skip fetching
    if (initialValues && !isChild) {
      if (fetchedInitialValues) {
        // If we switched from a child (fetched) back to a normal txn that has initialValues, 
        // we might want to clear fetched, but for now, rely on parent to pass correct initialValues
      }
      return;
    }

    setIsFetchingTransaction(true);
    setFetchedInitialValues(undefined); // Clear previous

    const fetchDetails = async () => {
      try {
        const { loadTransactions } = await import("@/services/transaction.service");
        const txns = await loadTransactions({ transactionId });

        if (txns && txns.length > 0) {
          const { buildEditInitialValues, parseMetadata } = await import("@/lib/transaction-mapper");

          const firstTxn = txns[0];
          const parsedMeta = parseMetadata(firstTxn.metadata);

          // Re-check parent ID from the fresh fetch
          const trueParentId = (parsedMeta as any)?.parent_transaction_id;

          if (typeof trueParentId === 'string' && trueParentId) {
            console.log("[AddTransactionDialog] Child transaction detected. Redirecting to Parent:", trueParentId);
            const service = await import("@/services/transaction.service");
            const parentTxns = await service.loadTransactions({ transactionId: trueParentId });

            if (parentTxns && parentTxns.length > 0) {
              const parentRaw = parentTxns[0];
              // Ensure we force the type to 'repayment' for the parent of a debt repayment
              // This is handled in 'buildEditInitialValues', but we can be defensive
              const parentFormatted = buildEditInitialValues(parentRaw);
              console.log("[AddTransactionDialog] Parent details loaded:", parentFormatted);
              setFetchedInitialValues(parentFormatted);
              return;
            } else {
              console.warn("[AddTransactionDialog] Parent transaction found but failed to load data:", trueParentId);
            }
          }

          // Fallback: Just load the requested transaction
          console.log("[AddTransactionDialog] Loading transaction directly:", firstTxn.id);
          const formatted = buildEditInitialValues(firstTxn);
          setFetchedInitialValues(formatted);

        } else {
          console.warn("[AddTransactionDialog] Transaction not found:", transactionId);
        }
      } catch (error) {
        console.error("[AddTransactionDialog] Failed to load transaction:", error);
      } finally {
        setIsFetchingTransaction(false);
      }
    };

    fetchDetails();

  }, [open, transactionId, initialValues, mode]);

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

  const handleSuccess = () => {
    handleOpenChange(false);
    setUrlValues(null); // Reset
    router.refresh();
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
      setHasUnsavedChanges(false);
      setShowCloseWarning(false);
      setCloseAction(null);
    }
  }, [open]);

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < 640);
      }
    };
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on overlay, not on content
    if (event.target === event.currentTarget) {
      if (hasUnsavedChanges) {
        setCloseAction("close");
        setShowCloseWarning(true);
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

  const handleCloseRequest = (action: "close" | "backToChat") => {
    if (hasUnsavedChanges) {
      setCloseAction(action);
      setShowCloseWarning(true);
      return;
    }
    closeDialog();
    if (action === "backToChat") {
      onBackToChat?.();
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
              className={`flex w-full flex-col bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden ${isMobile ? "h-[100dvh] max-w-none rounded-none" : "max-w-2xl md:max-w-3xl rounded-2xl"}`}
              style={{ maxHeight: isMobile ? "none" : "90vh" }}
              onClick={stopPropagation}
            >
              {isMobile && (
                <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                  <button
                    className="text-sm font-semibold text-slate-700"
                    onClick={() => {
                      handleCloseRequest("close");
                    }}
                  >
                    Close
                  </button>
                  <span className="text-sm font-semibold text-slate-900">{mode === "edit" ? "Edit Transaction" : "New Transaction"}</span>
                  <button
                    className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    onClick={() => {
                      const formEl = document.getElementById("transaction-form") as HTMLFormElement | null;
                      formEl?.requestSubmit();
                    }}
                  >
                    Save
                  </button>
                </div>
              )}
              {onBackToChat && (
                <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
                    onClick={() => handleCloseRequest("backToChat")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {backToChatLabel}
                  </button>
                </div>
              )}
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
                    handleCloseRequest("close");
                  }}
                  onFormChange={setHasUnsavedChanges}
                  defaultTag={defaultTag}
                  defaultPersonId={urlValues?.person_id ?? defaultPersonId}
                  defaultType={defaultType}
                  defaultSourceAccountId={defaultSourceAccountId}
                  defaultDebtAccountId={defaultDebtAccountId}
                  transactionId={transactionId}
                  mode={mode}
                  initialValues={{
                    ...urlValues,
                    ...(defaultAmount ? { amount: defaultAmount } : {}),
                    ...(cloneInitialValues || {}),
                    ...(initialValues || {}),
                    ...(fetchedInitialValues || {}),
                  }}
                />
              )}
            </div>

            {/* Unsaved Changes Warning Dialog */}
            {/* Unsaved Changes Warning Dialog */}
            {showCloseWarning && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                <div
                  className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100"
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
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
