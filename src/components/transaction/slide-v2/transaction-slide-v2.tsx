"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CycleSelector } from "@/components/ui/cycle-selector";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
    TransactionSlideV2Props,
    singleTransactionSchema,
    SingleTransactionFormValues,
    bulkTransactionSchema,
    BulkTransactionFormValues,
    TransactionMode
} from "./types";
import { cn } from "@/lib/utils";
import { bulkCreateTransactions } from "@/actions/bulk-transaction-actions";
import { createTransaction, updateTransaction } from "@/services/transaction.service";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";

// Components
import { BasicInfoSection } from "@/components/transaction/slide-v2/single-mode/basic-info-section";
import { AccountSelector } from "@/components/transaction/slide-v2/single-mode/account-selector";
import { CashbackSection } from "@/components/transaction/slide-v2/single-mode/cashback-section";
import { SplitBillSection } from "@/components/transaction/slide-v2/single-mode/split-bill-section";
import { BulkInputSection } from "@/components/transaction/slide-v2/bulk-mode/bulk-input-section";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Dialogs
import { CreateAccountDialog } from "@/components/moneyflow/create-account-dialog";
import { CategoryDialog } from "@/components/moneyflow/category-dialog";
import { QuickPeopleSettingsDialog } from "@/components/moneyflow/quick-people-settings-dialog";

export function TransactionSlideV2({
    open,
    onOpenChange,
    mode: initialMode = 'single',
    initialData,
    editingId,
    accounts,
    categories,
    people,
    shops,
    onSuccess,
    onHasChanges,
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

    // Get default values based on initialData - memoized to prevent infinite loops
    const defaultFormValues = useMemo((): SingleTransactionFormValues => {
        if (initialData) {
            return {
                type: initialData.type || "expense",
                category_id: initialData.category_id || "",
                occurred_at: initialData.occurred_at || new Date(),
                amount: initialData.amount || 0,
                note: initialData.note || "",
                source_account_id: initialData.source_account_id || accounts[0]?.id || "",
                target_account_id: initialData.target_account_id,
                shop_id: initialData.shop_id,
                person_id: initialData.person_id,
                tag: initialData.tag,
                cashback_mode: initialData.cashback_mode || "none_back",
                cashback_share_percent: initialData.cashback_share_percent,
                cashback_share_fixed: initialData.cashback_share_fixed,
                ui_is_cashback_expanded: false,
            };
        }
        return {
            type: "expense",
            category_id: "",
            occurred_at: new Date(),
            amount: 0,
            note: "",
            source_account_id: accounts[0]?.id || "",
            cashback_mode: "percent",
            ui_is_cashback_expanded: false,
        };
    }, [initialData, accounts]);

    // --- Single Transaction Form ---
    const singleForm = useForm<SingleTransactionFormValues>({
        resolver: zodResolver(singleTransactionSchema) as any,
        defaultValues: defaultFormValues,
    });

    // --- Bulk Transaction Form ---
    const bulkForm = useForm<BulkTransactionFormValues>({
        resolver: zodResolver(bulkTransactionSchema) as any,
        defaultValues: {
            rows: [],
            occurred_at: new Date(),
            default_source_account_id: accounts[0]?.id || "",
        }
    });

    // Reset form when slide opens or initialData changes
    useEffect(() => {
        if (open) {
            singleForm.reset(defaultFormValues);
            setHasChanges(false);
            onHasChanges?.(false);
        }
    }, [open, defaultFormValues, singleForm, onHasChanges]);

    // Track form changes by comparing with initial values
    useEffect(() => {
        if (!open) return; // Don't track when closed

        const subscription = singleForm.watch((currentValues) => {
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
                currentValues.occurred_at?.getTime() !== defaultFormValues.occurred_at?.getTime();

            setHasChanges(hasActualChanges);
            onHasChanges?.(hasActualChanges);
            setHasChanges(hasActualChanges);
            onHasChanges?.(hasActualChanges);
        });

        return () => subscription.unsubscribe();
    }, [open, defaultFormValues, singleForm, onHasChanges]);

    // Fetch data if editingId provided but no initialData
    useEffect(() => {
        if (open && editingId && !initialData) {
            setIsLoadingEdit(true);
            import("@/services/transaction.service").then(({ loadTransactions }) => {
                loadTransactions({ transactionId: editingId, limit: 1 }).then(([txn]) => {
                    if (txn) {
                        const formVal: SingleTransactionFormValues = {
                            type: (txn.type as any) || "expense",
                            amount: txn.original_amount ?? Math.abs(txn.amount),
                            occurred_at: new Date(txn.occurred_at),
                            note: txn.note || "",
                            source_account_id: txn.account_id,
                            target_account_id: txn.target_account_id || undefined,
                            category_id: txn.category_id || undefined,
                            shop_id: txn.shop_id || undefined,
                            person_id: txn.person_id || undefined,
                            tag: txn.tag || undefined,
                            cashback_mode: txn.cashback_mode || "none_back",
                            // Convert DB decimal (0.2) to UI percentage (20)
                            cashback_share_percent: txn.cashback_share_percent ? txn.cashback_share_percent * 100 : undefined,
                            cashback_share_fixed: txn.cashback_share_fixed || undefined,
                            ui_is_cashback_expanded: !!txn.cashback_mode && txn.cashback_mode !== 'none_back',
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
        const payload = {
            occurred_at: data.occurred_at.toISOString(),
            amount: data.amount,
            note: data.note,
            type: data.type,
            source_account_id: data.source_account_id,
            target_account_id: data.target_account_id,
            category_id: data.category_id || null,
            shop_id: data.shop_id || null,
            person_id: data.person_id || null,
            tag: data.tag,
            cashback_mode: data.cashback_mode,
            // Convert UI percentage (20) to DB decimal (0.2)
            cashback_share_percent: data.cashback_share_percent ? data.cashback_share_percent / 100 : null,
            cashback_share_fixed: data.cashback_share_fixed,
        };

        // UX: Close immediately if handler provided
        if (onSubmissionStart) {
            onSubmissionStart();
        } else {
            setIsSubmitting(true);
        }

        // Fire and forget (or await if parent logic keeps this alive)
        // Note: If component unmounts, this promise continues but state updates will fail/warn.
        // Since we closed the sheet, we shouldn't touch local state after this point if onSubmissionStart was used.
        try {
            let success = false;
            if (editingId) {
                success = await updateTransaction(editingId, payload);
                if (success) toast.success("Transaction updated successfully");
                else toast.error("Failed to update transaction");
            } else {
                const newId = await createTransaction(payload);
                if (newId) {
                    success = true;
                    toast.success("Transaction created successfully");
                } else toast.error("Failed to create transaction");
            }

            if (success) {
                if (!onSubmissionStart) {
                    setHasChanges(false);
                    onHasChanges?.(false);
                }
                onSuccess?.(editingId ? { id: editingId, ...payload } : undefined);
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("An error occurred. Please try again.");
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

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                showClose={false}
                className={cn(
                    "w-full p-0 flex flex-col h-full bg-slate-50 transition-all duration-300 ease-in-out z-[100]",
                    mode === 'single' ? "sm:max-w-[500px]" : "sm:max-w-[1000px]"
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
                    <SheetTitle className="flex items-center gap-2">
                        {mode === 'single'
                            ? (initialData || editingId ? 'Edit Transaction' : 'New Transaction')
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
                    {/* Note: relative needed for potential absolute positioning context if any, but mainly purely for scroll */}
                    {mode === 'single' ? (
                        <div className="px-6 py-6">
                            <FormProvider {...singleForm}>
                                <form
                                    id="single-txn-form"
                                    onSubmit={singleForm.handleSubmit(onSingleSubmit, (errors) => {
                                        console.error("Form validation errors:", errors);
                                        toast.error("Please fill in all required fields correctly.");
                                    })}
                                    className="space-y-6"
                                >
                                    <BasicInfoSection
                                        shops={shops}
                                        categories={categories}
                                        people={people}
                                        onAddNewCategory={() => setIsCategoryDialogOpen(true)}
                                    />
                                    <AccountSelector
                                        accounts={accounts}
                                        people={people}
                                        onAddNewAccount={() => setIsAccountDialogOpen(true)}
                                        onAddNewPerson={() => setIsPeopleDialogOpen(true)}
                                    />
                                    <SplitBillSection people={people} />
                                    <CashbackSection accounts={accounts} categories={categories} />
                                </form>
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
                                    onAddNewAccount={() => setIsAccountDialogOpen(true)}
                                    onAddNewPerson={() => setIsPeopleDialogOpen(true)}
                                />
                            </form>
                        </FormProvider>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-white border-t px-6 py-4 shrink-0 flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
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
                <CreateAccountDialog
                    open={isAccountDialogOpen}
                    onOpenChange={setIsAccountDialogOpen}
                    trigger={null}
                />

                <CategoryDialog
                    open={isCategoryDialogOpen}
                    onOpenChange={setIsCategoryDialogOpen}
                    onSuccess={() => {
                        setIsCategoryDialogOpen(false);
                    }}
                />

                <QuickPeopleSettingsDialog
                    isOpen={isPeopleDialogOpen}
                    onOpenChange={setIsPeopleDialogOpen}
                    people={people}
                />

            </SheetContent>
        </Sheet>
    );
}
