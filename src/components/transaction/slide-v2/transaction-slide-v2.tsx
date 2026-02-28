"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, FormProvider, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CycleSelector } from "@/components/ui/cycle-selector";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    FormControl,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { CategoryShopSection } from "./single-mode/category-shop-section";
import { Button } from "@/components/ui/button";
import {
    TransactionSlideV2Props,
    TransactionMode,
    SingleTransactionFormValues,
    BulkTransactionFormValues,
} from "./types";
import { singleTransactionSchema, bulkTransactionSchema } from "./schema";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";


import { cn } from "@/lib/utils";
import { bulkCreateTransactions } from "@/actions/bulk-transaction-actions";
import { logToServer, logErrorToServer } from "@/actions/log-actions";
import { createTransaction, updateTransaction } from "@/services/transaction.service";
import { getCategories } from "@/services/category.service";
import { getShops } from "@/services/shop.service";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";

// Components
import { TransactionTypeSelector } from "./single-mode/type-selector";
import { AmountSection } from "./single-mode/amount-section";
import { BasicInfoSection } from "@/components/transaction/slide-v2/single-mode/basic-info-section";
import { AccountSelector } from "@/components/transaction/slide-v2/single-mode/account-selector";
import { CashbackSection } from "@/components/transaction/slide-v2/single-mode/cashback-section";
import { SplitBillSection } from "@/components/transaction/slide-v2/single-mode/split-bill-section";
import { InstallmentSelector } from "./single-mode/installment-selector";
import { BulkInputSection } from "@/components/transaction/slide-v2/bulk-mode/bulk-input-section";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Dialogs
import { AccountSlideV2 } from "@/components/accounts/v2/AccountSlideV2";
import { CategorySlide } from "@/components/accounts/v2/CategorySlide";
import { QuickPeopleSettingsDialog } from "@/components/moneyflow/quick-people-settings-dialog";
import { CreatePersonDialog } from "@/components/people/create-person-dialog";
import { ShopSlide } from "@/components/shops/ShopSlide";
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";

export function TransactionSlideV2({
    open,
    onOpenChange,
    mode: initialMode = 'single',
    initialData,
    editingId,
    operationMode = 'add',
    accounts,
    categories,
    people,
    shops,
    onSuccess,
    onHasChanges,
    onBackButtonClick,
    onSubmissionStart,
    onSubmissionEnd
}: TransactionSlideV2Props) {
    const [mode, setMode] = useState<TransactionMode>(initialMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingEdit, setIsLoadingEdit] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Dialog States
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [isPeopleDialogOpen, setIsPeopleDialogOpen] = useState(false);
    const [isCreatePersonDialogOpen, setIsCreatePersonDialogOpen] = useState(false);
    const [isShopDialogOpen, setIsShopDialogOpen] = useState(false);

    // Category Auto-Refresh State
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [localCategories, setLocalCategories] = useState(categories);
    const [isLoadingShops, setIsLoadingShops] = useState(false);
    const [localShops, setLocalShops] = useState(shops);

    // Sync localCategories and localShops with prop changes
    useEffect(() => {
        setLocalCategories(categories);
    }, [categories]);

    useEffect(() => {
        setLocalShops(shops);
    }, [shops]);

    // Unsaved Changes Dialog State
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [pendingClose, setPendingClose] = useState(false);

    // DEBUG: Verify schemas are defined
    useEffect(() => {
        if (open) {
            console.log("🔍 TransactionSlideV2 Schema Check:", {
                single: !!singleTransactionSchema,
                bulk: !!bulkTransactionSchema,
            });
        }
    }, [open]);

    // Get default values based on initialData - memoized to prevent infinite loops
    const defaultFormValues = useMemo((): SingleTransactionFormValues => {

        console.log("🎨 defaultFormValues computed:");
        console.log("   initialData:", initialData);
        console.log("   operationMode:", operationMode);

        if (initialData) {
            // MF5.5: Check if we should override type based on initialData
            let type: SingleTransactionFormValues["type"] = initialData.type || "expense";

            // If we have both accounts, it's likely a transfer (even if not explicitly set)
            if (!initialData.type && initialData.source_account_id && initialData.target_account_id) {
                type = 'transfer';
            }

            // Duplicate logic: set occurred_at to now (note stays clean - badge shown in table)
            let note = initialData.note ?? "";
            let occurredAt = initialData.occurred_at || new Date();

            if (operationMode === 'duplicate') {
                occurredAt = new Date(); // Always now for duplicates
                // Do NOT append #Clone to note - the table shows a CLONE badge instead
            }

            const isIncome = type === 'income' || type === 'repayment';
            const values: SingleTransactionFormValues = {
                type,
                category_id: initialData.category_id ?? null,
                occurred_at: occurredAt,
                amount: Math.round(Math.abs(initialData.amount ?? 0)),
                note: note,
                source_account_id: isIncome ? null : initialData.source_account_id ?? null,
                target_account_id: isIncome ? (initialData.source_account_id ?? initialData.target_account_id ?? null) : (initialData.target_account_id ?? null),
                shop_id: initialData.shop_id ?? null,
                person_id: initialData.person_id ?? null,
                tag: initialData.tag ?? null,
                cashback_mode: initialData.cashback_mode || "none_back",
                cashback_share_percent: initialData.cashback_share_percent ?? null,
                cashback_share_fixed: initialData.cashback_share_fixed ?? null,
                ui_is_cashback_expanded: initialData.ui_is_cashback_expanded ?? false,
                is_installment: initialData.is_installment ?? false,
                metadata: initialData.metadata ?? null,
                service_fee: initialData.service_fee ?? (initialData.metadata?.service_fee ? Number(initialData.metadata.service_fee) : null),
            };
            console.log("   ✅ Using initialData values:", values);
            return values;
        }
        console.log("   ℹ️ No initialData - using defaults");

        // MF5.5: Default logic for blank new transaction
        const defaultValues: SingleTransactionFormValues = {
            type: "expense",
            category_id: null,
            occurred_at: new Date(),
            amount: 0,
            note: "",
            source_account_id: null,
            cashback_mode: "percent",
            ui_is_cashback_expanded: false,
            target_account_id: null,
            shop_id: null,
            person_id: null,
            tag: null,
            cashback_share_percent: null,
            cashback_share_fixed: null,
            is_installment: false,
            metadata: null,
            service_fee: null,
        };

        return defaultValues;
    }, [initialData, accounts, operationMode]);

    // --- Helper for safe schema resolution ---
    // Wraps zodResolver in a try-catch to prevent "Cannot read properties of undefined" crashes
    const safeResolver = useCallback((schema: any, name: string) => {
        return async (values: any, context: any, options: any) => {
            try {
                // 1. Basic Schema Validation
                if (!schema || typeof schema.safeParse !== 'function') {
                    const msg = `🚨 CRITICAL ERROR: ${name} schema is invalid or undefined! Type: ${typeof schema}`;
                    console.error(msg);
                    return { values: values, errors: {} };
                }

                // 2. Safe Execution
                try {
                    const resolver = zodResolver(schema);
                    return await resolver(values, context, options);
                } catch (e) {
                    console.error("Zod Resolver inner crash:", e);
                    return { values: values, errors: {} };
                }

            } catch (error) {
                // 3. Crash Prevention
                const msg = `🚨 CRASH CAUGHT: Resolver failed for ${name}`;
                console.error(msg, error);

                // If it's the specific "_zod" error, log it clearly
                if (error instanceof TypeError && error.message.includes("_zod")) {
                    console.error("⚠️ This looks like a Zod/HookForm version mismatch or malformed schema issue.");
                }

                logErrorToServer(msg, { error: String(error) });
                // Return valid empty result to keep form alive
                return { values: values, errors: {} };
            }
        };
    }, []);

    // DEBUG: Verify schemas are defined
    useEffect(() => {
        if (open) {
            const status = {
                single: !!singleTransactionSchema,
                bulk: !!bulkTransactionSchema,
                initialData: !!initialData
            };
            console.log("🔍 TransactionSlideV2 Schema Check:", status);
            logToServer("TransactionSlideV2 Open - Schema Check", status);
        }
    }, [open, initialData]);

    // --- Single Transaction Form ---
    const singleForm = useForm<SingleTransactionFormValues>({
        resolver: safeResolver(singleTransactionSchema, 'singleTransactionSchema'),
        defaultValues: defaultFormValues,
    });



    const { isDirty: isSingleDirty } = singleForm.formState;

    // --- Bulk Transaction Form ---
    const bulkForm = useForm<BulkTransactionFormValues>({
        resolver: safeResolver(bulkTransactionSchema, 'bulkTransactionSchema') as any,
        defaultValues: {
            rows: [],
            occurred_at: new Date(),
            default_source_account_id: accounts[0]?.id || "",
        }
    });

    const onAddNewAccount = () => {
        setIsAccountDialogOpen(true);
    };
    const onAddNewPerson = () => {
        setIsCreatePersonDialogOpen(true);
    };
    const onAddNewShop = () => {
        setIsShopDialogOpen(true);
    };

    const { isDirty: isBulkDirty } = bulkForm.formState;




    // Watch transaction type to sync with category creation
    const txnType = useWatch({
        control: singleForm.control,
        name: "type",
    });

    const categoryDefaults = useMemo(() => {
        // Map transaction type to category defaults
        // Lend (debt) and Repay (repayment) suggest Internal kind
        // Income/Expense suggest External kind
        // Transfer/Credit Pay suggest Internal kind
        switch (txnType) {
            case "income":
                return { type: "income" as const, kind: "external" as const };
            case "repayment":
                return { type: "income" as const, kind: "internal" as const };
            case "debt":
                return { type: "expense" as const, kind: "internal" as const };
            case "transfer":
            case "credit_pay":
                return { type: "transfer" as const, kind: "internal" as const };
            case "expense":
            default:
                return { type: "expense" as const, kind: "external" as const };
        }
    }, [txnType]);

    // Reset form when slide opens or initialData changes - optimized to prevent unnecessary resets
    useEffect(() => {
        if (open) {
            console.log("🔄 TransactionSlideV2 RESET TRIGGERED");
            console.log("   - operationMode:", operationMode);
            console.log("   - initialData present:", !!initialData);
            console.log("   - reset values:", defaultFormValues);
            singleForm.reset(defaultFormValues);
            setHasChanges(false);
            onHasChanges?.(false);
        }
    }, [open, defaultFormValues]);

    // Watch for bulk form rows
    const bulkRows = useWatch({ control: bulkForm.control, name: "rows" });

    useEffect(() => {
        if (mode === 'bulk') {
            // In bulk mode, if form is dirty and has rows, we check changes
            const hasBulkChanges = isBulkDirty && bulkRows && bulkRows.length > 0 && bulkRows.some((row: any) => row.amount > 0 || row.note || row.shop_id);
            setHasChanges(hasBulkChanges);
            onHasChanges?.(hasBulkChanges);
        }
    }, [bulkRows, mode, onHasChanges, isBulkDirty]);
    // Removed singleForm and onHasChanges from deps to avoid extra resets if they are stable
    // Note: react-hook-form provides stable identities for reset and the form object usually.

    // Track form changes by comparing with initial values
    useEffect(() => {
        if (!open) return; // Don't track when closed

        const subscription = singleForm.watch((currentValues) => {
            // Check if form is actually dirty from user interaction
            if (!isSingleDirty) {
                setHasChanges(false);
                onHasChanges?.(false);
                return;
            }

            // Deep comparison of relevant fields
            const hasActualChanges =
                currentValues.type !== defaultFormValues.type ||
                currentValues.amount !== defaultFormValues.amount ||
                currentValues.note !== defaultFormValues.note ||
                currentValues.source_account_id !== defaultFormValues.source_account_id ||
                currentValues.target_account_id !== defaultFormValues.target_account_id ||
                currentValues.category_id !== defaultFormValues.category_id ||
                currentValues.shop_id !== defaultFormValues.shop_id ||
                currentValues.person_id !== defaultFormValues.person_id ||
                currentValues.tag !== defaultFormValues.tag ||
                currentValues.cashback_mode !== defaultFormValues.cashback_mode ||
                currentValues.cashback_share_percent !== defaultFormValues.cashback_share_percent ||
                currentValues.cashback_share_fixed !== defaultFormValues.cashback_share_fixed ||
                currentValues.service_fee !== defaultFormValues.service_fee ||
                currentValues.is_installment !== defaultFormValues.is_installment ||
                currentValues.occurred_at?.getTime() !== defaultFormValues.occurred_at?.getTime();

            setHasChanges(hasActualChanges);
            onHasChanges?.(hasActualChanges);

        });

        return () => subscription.unsubscribe();
    }, [open, defaultFormValues, singleForm, onHasChanges, isSingleDirty]);

    // Watch for cashback auto-expand and reset special modes when person selected
    const sourceAccId = useWatch({ control: singleForm.control, name: "source_account_id" });
    const targetAccId = useWatch({ control: singleForm.control, name: "target_account_id" });
    const currentTxnType = useWatch({ control: singleForm.control, name: "type" });
    const currentPersonId = useWatch({ control: singleForm.control, name: "person_id" });

    // MF5.5: Reset Transfer/Pay when person selected
    useEffect(() => {
        if (!open) return;
        if (currentPersonId && (currentTxnType === 'transfer' || currentTxnType === 'credit_pay')) {
            console.log("👤 Person selected: Resetting special mode...");
            singleForm.setValue('type', 'expense', { shouldDirty: true });
        }
    }, [currentPersonId, currentTxnType, open, singleForm]);

    // MF5.5: Account selector logic to smartly move IDs when switching flow types
    const prevTypeRef = useRef<string | null>(null);

    useEffect(() => {
        if (!open) {
            prevTypeRef.current = null;
            return;
        }

        const type = singleForm.getValues('type');
        const sourceId = singleForm.getValues('source_account_id');
        const targetId = singleForm.getValues('target_account_id');

        if (prevTypeRef.current === null) {
            prevTypeRef.current = type;
            return;
        }

        if (prevTypeRef.current !== type) {
            const currentSourceAcc = accounts.find(a => a.id === sourceId);
            const currentTargetAcc = accounts.find(a => a.id === targetId);

            // 1. Logic for switching TO Special Modes (Transfer or Card Pay)
            if (type === 'credit_pay') {
                // Moving CC from source to target for Card Pay
                if (currentSourceAcc?.type === 'credit_card' && !targetId) {
                    console.log("💳 Credit Card Pay: Moving CC from source to target...");
                    singleForm.setValue('target_account_id', sourceId, { shouldDirty: true });

                    // Try to find a bank account for source (Pay From), but ONLY if current source is now the CC we just moved
                    const bankAcc = accounts.find(a => a.type === 'bank');
                    if (bankAcc) {
                        singleForm.setValue('source_account_id', bankAcc.id, { shouldDirty: true });
                    } else {
                        singleForm.setValue('source_account_id', null, { shouldDirty: true });
                    }
                }
            }
            else if (type === 'transfer') {
                // If moving to Transfer and source is a Credit Card, it MUST move to target (Credit Pay logic)
                // because you can't "transfer" from a CC effectively in this system's context.
                if (currentSourceAcc?.type === 'credit_card') {
                    console.log("🔄 Transfer with CC: Moving CC to target...");
                    singleForm.setValue('target_account_id', sourceId, { shouldDirty: true });
                    singleForm.setValue('source_account_id', null, { shouldDirty: true });
                }
            }

            // 2. Logic for switching FROM Special Modes back to regular modes (Expense/Debt/Income/Repayment)
            else if (['credit_pay', 'transfer'].includes(prevTypeRef.current) && ['expense', 'debt', 'income', 'repayment'].includes(type)) {
                // If we had a CC in target, move it back to source for Expense/Debt
                if (currentTargetAcc?.type === 'credit_card' && ['expense', 'debt'].includes(type)) {
                    console.log("🔄 Restoring CC from target back to source...");
                    singleForm.setValue('source_account_id', targetId, { shouldDirty: true });
                    singleForm.setValue('target_account_id', null, { shouldDirty: true });
                }
                // If we are on income/repayment, target is active, so we might want to keep it there if it's bank
                else if (['income', 'repayment'].includes(type)) {
                    if (sourceId && !targetId) {
                        singleForm.setValue('target_account_id', sourceId, { shouldDirty: true });
                        singleForm.setValue('source_account_id', null, { shouldDirty: true });
                    }
                }
                // Cleanup: If both are set and we are going to a single-flow mode, clear the irrelevant one
                else if (sourceId && targetId) {
                    if (['expense', 'debt'].includes(type)) {
                        singleForm.setValue('target_account_id', null, { shouldDirty: true });
                    } else if (['income', 'repayment'].includes(type)) {
                        singleForm.setValue('source_account_id', null, { shouldDirty: true });
                    }
                }
            }

            // 3. Fallback standard logic for simple type changes
            else if (['income', 'repayment'].includes(type)) {
                if (sourceId && !targetId) {
                    singleForm.setValue('target_account_id', sourceId, { shouldDirty: true });
                    singleForm.setValue('source_account_id', null, { shouldDirty: true });
                }
            }
            else if (['expense', 'debt'].includes(type)) {
                if (targetId && !sourceId) {
                    singleForm.setValue('source_account_id', targetId, { shouldDirty: true });
                    singleForm.setValue('target_account_id', null, { shouldDirty: true });
                }
            }

            prevTypeRef.current = type;
        }
    }, [currentTxnType, open, accounts, singleForm]);

    useEffect(() => {
        // Only auto-expand cashback for new transactions, not edit/duplicate
        if (!open || operationMode === 'edit' || operationMode === 'duplicate') return;

        const acc = accounts.find(a => a.id === sourceAccId);
        const hasCashback = acc && (acc as any).cb_type !== 'none';

        if (hasCashback) {
            singleForm.setValue('ui_is_cashback_expanded', true, { shouldDirty: false });

            // If it's debt (External Debt tab), auto Give Away
            if (currentTxnType === 'debt') {
                singleForm.setValue('cashback_mode', 'real_percent', { shouldDirty: false });
            }
        }
    }, [sourceAccId, currentTxnType, open, operationMode, accounts, singleForm]);

    // Fetch data if editingId provided but no initialData
    useEffect(() => {
        if (open && editingId && !initialData) {
            setIsLoadingEdit(true);
            import("@/services/transaction.service").then(({ loadTransactions }) => {
                loadTransactions({ transactionId: editingId, limit: 1 }).then(([txn]) => {
                    if (txn) {
                        const isIncome = txn.type === 'income' || txn.type === 'repayment';
                        const formVal: SingleTransactionFormValues = {
                            type: (txn.type as any) || "expense",
                            amount: txn.original_amount ?? Math.abs(txn.amount),
                            occurred_at: new Date(txn.occurred_at),
                            note: txn.note || "",
                            source_account_id: isIncome ? null : txn.account_id,
                            target_account_id: isIncome ? txn.account_id : (txn.target_account_id || null),
                            category_id: txn.category_id || null,
                            shop_id: txn.shop_id || null,
                            person_id: txn.person_id || null,
                            tag: txn.tag || null,
                            cashback_mode: txn.cashback_mode || "none_back",
                            cashback_share_percent: txn.cashback_share_percent ? txn.cashback_share_percent * 100 : null,
                            cashback_share_fixed: txn.cashback_share_fixed || null,
                            ui_is_cashback_expanded: !!txn.is_installment || (!!txn.cashback_mode && txn.cashback_mode !== 'none_back'),
                            is_installment: !!txn.is_installment,
                            service_fee: txn.metadata?.service_fee ? Number(txn.metadata.service_fee) : null,
                        };
                        singleForm.reset(formVal);
                    } else {
                        toast.error("Failed to load transaction details");
                    }
                    setIsLoadingEdit(false);
                }).catch(() => {
                    setIsLoadingEdit(false);
                    toast.error("Failed to load transaction");
                });
            });
        }
    }, [open, editingId, initialData, singleForm]);

    const onSingleSubmit = async (data: SingleTransactionFormValues) => {
        if (!data || (Object.keys(data).length === 0 && operationMode !== 'add')) {
            console.error("❌ CRITICAL: Form data is EMPTY during submit!");
            toast.error("Form data is empty. Please try again.");
            return;
        }

        console.log("✅ onSingleSubmit triggered:", {
            type: data.type,
            category_id: data.category_id,
            account_id: data.source_account_id,
            target_account_id: data.target_account_id,
            amount: data.amount,
            mode: operationMode
        });

        console.log("✅ onSingleSubmit called - Form validation PASSED");
        console.log("📋 Form data raw:", data);
        console.log("🎯 Operation:", operationMode, "| editingId:", editingId);
        console.log("🔀 Will call:", editingId ? "updateTransaction()" : "createTransaction()");

        // Auto-Note for Fee: Append #Fee=x,xxx to note if service_fee exists
        let finalNote = data.note || "";
        if (data.service_fee && data.service_fee > 0) {
            const feeMarker = `#Fee=${new Intl.NumberFormat('vi-VN').format(data.service_fee)}`;
            if (!finalNote.includes('#Fee=')) {
                finalNote = finalNote ? `${finalNote} ${feeMarker}` : feeMarker;
            } else {
                // Replace existing fee marker if it exists and is different
                finalNote = finalNote.replace(/#Fee=[\d,.]+/g, feeMarker);
            }
        }

        const payload: any = {
            occurred_at: data.occurred_at.toISOString(),
            amount: data.amount + (data.service_fee || 0),
            note: finalNote,
            type: data.type,
            // Directional Logic:
            // For Income/Repayment: Money goes TO target_account_id. Service expects principal in source_account_id.
            // For Expense/Debt: Money comes FROM source_account_id.
            // For Transfer/Credit Pay: Both are used.
            source_account_id: (((data.type === 'income' || data.type === 'repayment')
                ? (data.target_account_id || data.source_account_id)
                : (data.source_account_id || data.target_account_id)) || "") as string,
            target_account_id: (data.type === 'transfer' || data.type === 'credit_pay')
                ? data.target_account_id
                : null,
            category_id: data.category_id || null,
            shop_id: data.shop_id || null,
            person_id: data.person_id || null,
            tag: data.tag || "",
            cashback_mode: data.cashback_mode,
            cashback_share_percent: data.cashback_share_percent ? data.cashback_share_percent / 100 : null,
            cashback_share_fixed: data.cashback_share_fixed,
            is_installment: !!data.is_installment,
            installment_plan_id: data.installment_plan_id,
            metadata: {
                ...data.metadata,
                service_fee: data.service_fee || undefined
            },
        };

        console.log("🚀 Mapped Payload for Service:", payload);

        // UX: Close immediately if handler provided
        if (onSubmissionStart) {
            onSubmissionStart();
        } else {
            setIsSubmitting(true);
        }

        try {
            let success = false;
            let finalTxnId = editingId;

            if (editingId) {
                success = await updateTransaction(editingId, payload);
                if (success) toast.success("Transaction updated successfully");
                else toast.error("Failed to update transaction");
            } else {
                const newId = await createTransaction(payload);
                if (newId) {
                    success = true;
                    finalTxnId = newId;
                    toast.success("Transaction created successfully");
                } else toast.error("Failed to create transaction");
            }

            console.log("🎉 Submit success:", success);

            if (success) {
                if (!onSubmissionStart) {
                    setHasChanges(false);
                    onHasChanges?.(false);
                }
                onSuccess?.(finalTxnId ? { id: finalTxnId, ...payload } : undefined);
            }
        } catch (error) {
            console.error("❌ Submission error caught:", error);
            console.error("Error details:", {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });

            const errorMsg = error instanceof Error ? error.message : String(error);
            if (errorMsg.includes('BATCH_LOCKED:')) {
                const batchId = errorMsg.split('BATCH_LOCKED:')[1]?.trim();
                toast.error(
                    <div className="flex flex-col gap-1">
                        <span className="font-bold">Giao dịch Bot Batch</span>
                        <span className="text-xs">Không được sửa tại đây để tránh lệch Data.</span>
                        {batchId && (
                            <a href={`/batch/detail/${batchId}`} target="_blank" rel="noopener noreferrer" className="font-bold underline text-indigo-400 mt-1">
                                Mở trang Batch để Unconfirm
                            </a>
                        )}
                    </div>,
                    { duration: 8000 }
                );
            } else {
                toast.error(errorMsg || "An error occurred. Please try again.");
            }
        } finally {
            if (onSubmissionEnd) {
                onSubmissionEnd();
            } else {
                setIsSubmitting(false);
            }
        }
    };

    const onBulkSubmit = async (data: BulkTransactionFormValues) => {
        setIsSubmitting(true);
        try {
            await bulkCreateTransactions(data);
            onSuccess?.();
        } catch (error) {
            console.error("Bulk submit failed", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && hasChanges && !isSubmitting) {
            setPendingClose(true);
            setShowUnsavedDialog(true);
            return;
        }
        // Force reset changes state to allow closing
        if (!newOpen) {
            setHasChanges(false);
        }
        onOpenChange(newOpen);
    };

    const handleConfirmDiscard = () => {
        setShowUnsavedDialog(false);
        setHasChanges(false);
        setPendingClose(false);
        onOpenChange(false);
    };

    const handleCancelDiscard = () => {
        setShowUnsavedDialog(false);
        setPendingClose(false);
    };

    const handleBackWithCheck = () => {
        if (hasChanges) {
            setShowUnsavedDialog(true);
            return;
        }
        onBackButtonClick?.();
    };

    return (
        <>
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent
                    showClose={false}
                    className={cn(
                        "w-full p-0 flex flex-col h-full bg-slate-50 transition-all duration-300 ease-in-out z-[500] max-w-screen",
                        mode === 'single' ? "sm:max-w-[550px]" : "sm:max-w-[1000px]"
                    )}
                    side="right"
                    onInteractOutside={(e) => {
                        // Prevent closing if a dialog is open on top
                        if (isAccountDialogOpen || isCategoryDialogOpen || isPeopleDialogOpen) {
                            e.preventDefault();
                        }
                    }}
                >
                    {/* Header */}
                    <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            {/* Back Button */}
                            <button
                                type="button"
                                onClick={handleBackWithCheck}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                    initialData?.metadata?.source === 'chatbot'
                                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                )}
                                title="Back"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                {initialData?.metadata?.source === 'chatbot' && "Quay lại Chat"}
                            </button>

                            <SheetTitle className="flex items-center gap-2">
                                {mode === 'single'
                                    ? (operationMode === 'duplicate'
                                        ? 'Duplicate Transaction'
                                        : (operationMode === 'edit' || editingId)
                                            ? 'Edit Transaction'
                                            : 'New Transaction')
                                    : 'Bulk Add'
                                }
                                {isLoadingEdit && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Loading...
                                    </span>
                                )}
                            </SheetTitle>
                        </div>

                        {/* Quick Mode Toggle */}
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setMode('single')}
                                className={cn(
                                    "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                                    mode === 'single' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Single
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('bulk')}
                                className={cn(
                                    "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                                    mode === 'bulk' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Bulk
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50/50 relative">
                        {isLoadingEdit && (
                            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in duration-200">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white shadow-xl flex items-center justify-center border border-slate-100">
                                        <Loader2 className="h-6 w-6 text-slate-900 animate-spin" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-900 uppercase tracking-widest animate-pulse">Loading Details...</span>
                                </div>
                            </div>
                        )}
                        {/* Note: relative needed for potential absolute positioning context if any, but mainly purely for scroll */}
                        {mode === 'single' ? (
                            <div className="px-6 py-6">
                                <FormProvider {...singleForm}>
                                    <TooltipProvider>
                                        <form
                                            id="single-txn-form"
                                            onSubmit={singleForm.handleSubmit(
                                                onSingleSubmit,
                                                (errors) => {
                                                    console.error("❌ Form validation FAILED");
                                                    console.error("Validation errors object:", errors);
                                                    console.error("Form state:", {
                                                        isValid: singleForm.formState.isValid,
                                                        isSubmitting: singleForm.formState.isSubmitting,
                                                        errors: singleForm.formState.errors,
                                                    });
                                                    console.error("Current form values:", singleForm.getValues());
                                                    console.error("Operation mode:", operationMode, "| editingId:", editingId);
                                                    console.error("Initial data passed:", initialData);
                                                    toast.error("Please fill in all required fields correctly.");
                                                }
                                            )}
                                            className="space-y-6"
                                        >
                                            <TransactionTypeSelector />

                                            {/* A. FLOW: ACCOUNTS & PEOPLE */}
                                            <div className="pt-2">
                                                <AccountSelector
                                                    accounts={accounts}
                                                    people={people}
                                                    onAddNewAccount={onAddNewAccount}
                                                    onAddNewPerson={onAddNewPerson}
                                                />
                                            </div>

                                            {/* B. DETAILS GROUPING */}
                                            <div className="space-y-6 pt-6 border-t border-slate-100">
                                                <BasicInfoSection
                                                    people={people}
                                                    operationMode={operationMode}
                                                />

                                                <CategoryShopSection
                                                    shops={localShops}
                                                    categories={localCategories}
                                                    onAddNewCategory={() => setIsCategoryDialogOpen(true)}
                                                    onAddNewShop={onAddNewShop}
                                                    isLoadingCategories={isLoadingCategories}
                                                    isLoadingShops={isLoadingShops}
                                                />

                                                <AmountSection />

                                                <div className="grid grid-cols-1 gap-4 pt-2">
                                                    <InstallmentSelector />
                                                    <SplitBillSection people={people} />
                                                </div>
                                            </div>

                                            {/* C. PAYMENTS & PROMOTIONS */}
                                            <div className="space-y-4 pt-6 border-t border-slate-100">
                                                <div className="flex items-center justify-between px-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimizations & Add-ons</span>
                                                </div>

                                                <CashbackSection accounts={accounts} categories={categories} />
                                            </div>
                                        </form>
                                    </TooltipProvider>
                                </FormProvider>
                            </div>
                        ) : (
                            <FormProvider {...bulkForm}>
                                <form id="bulk-txn-form" onSubmit={bulkForm.handleSubmit(onBulkSubmit)} className="flex flex-col min-h-full">
                                    {/* Changed h-full to min-h-full to allow expansion */}
                                    <BulkInputSection
                                        shops={shops}
                                        accounts={accounts}
                                        people={people}
                                        onAddNewAccount={onAddNewAccount}
                                        onAddNewPerson={onAddNewPerson}
                                    />
                                </form>
                            </FormProvider>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-white border-t px-6 py-4 shrink-0 flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form={mode === 'single' ? 'single-txn-form' : 'bulk-txn-form'}
                            disabled={isSubmitting}
                            className="bg-slate-900 hover:bg-slate-800 text-white min-w-[100px]"
                        >
                            {isSubmitting ? "Saving..." : "Save Transaction"}
                        </Button>
                    </div>

                    {/* Dialogs */}
                    <AccountSlideV2
                        open={isAccountDialogOpen}
                        onOpenChange={setIsAccountDialogOpen}
                        allAccounts={accounts}
                        categories={localCategories}
                    />

                    <CategorySlide
                        open={isCategoryDialogOpen}
                        onOpenChange={setIsCategoryDialogOpen}
                        defaultType={categoryDefaults.type}
                        defaultKind={categoryDefaults.kind}
                        onBack={() => setIsCategoryDialogOpen(false)}
                        isExternalLoading={isLoadingCategories}
                        onSuccess={async (newCategoryId) => {
                            if (newCategoryId) {
                                setIsLoadingCategories(true);
                                try {
                                    // Fetch updated categories from Supabase
                                    const updatedCategories = await getCategories();
                                    setLocalCategories(updatedCategories);

                                    // Auto-select the newly created category
                                    singleForm.setValue('category_id', newCategoryId);

                                    toast.success("Category created and selected");
                                    setIsCategoryDialogOpen(false);
                                } catch (error) {
                                    console.error("Failed to refresh categories:", error);
                                    toast.error("Category created but failed to refresh list");
                                    setIsCategoryDialogOpen(false);
                                } finally {
                                    setIsLoadingCategories(false);
                                }
                            } else {
                                setIsCategoryDialogOpen(false);
                            }
                        }}
                    />

                    <QuickPeopleSettingsDialog
                        isOpen={isPeopleDialogOpen}
                        onOpenChange={setIsPeopleDialogOpen}
                        people={people}
                    />

                    <CreatePersonDialog
                        open={isCreatePersonDialogOpen}
                        onOpenChange={setIsCreatePersonDialogOpen}
                        subscriptions={[]} // Quick add doesn't need subs usually
                    />

                    <ShopSlide
                        open={isShopDialogOpen}
                        onOpenChange={setIsShopDialogOpen}
                        categories={localCategories}
                        defaultCategoryId={singleForm.getValues("category_id") || undefined}
                        onSuccess={async (newShopId) => {
                            if (newShopId) {
                                setIsLoadingShops(true);
                                try {
                                    const updatedShops = await getShops();
                                    setLocalShops(updatedShops);
                                    singleForm.setValue("shop_id", newShopId, { shouldDirty: true });
                                    toast.success("Shop created and selected");
                                } catch (error) {
                                    console.error("Failed to refresh shops:", error);
                                } finally {
                                    setIsLoadingShops(false);
                                }
                            }
                            setIsShopDialogOpen(false);
                        }}
                    />

                </SheetContent>
            </Sheet >

            {/* Unsaved Changes Dialog */}
            < UnsavedChangesDialog
                open={showUnsavedDialog}
                onOpenChange={setShowUnsavedDialog}
                onConfirm={handleConfirmDiscard}
                onCancel={handleCancelDiscard}
            />
        </>
    );
}
