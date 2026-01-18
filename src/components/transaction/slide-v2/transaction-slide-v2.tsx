"use client";

import { useState, useEffect } from "react";
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
    accounts,
    categories,
    people,
    shops,
    onSuccess
}: TransactionSlideV2Props) {
    const [mode, setMode] = useState<TransactionMode>(initialMode);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dialog States
    const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [isPeopleDialogOpen, setIsPeopleDialogOpen] = useState(false);

    // --- Single Transaction Form ---
    const singleForm = useForm<SingleTransactionFormValues>({
        resolver: zodResolver(singleTransactionSchema) as any,
        defaultValues: {
            type: "expense",
            category_id: "",
            occurred_at: new Date(),
            amount: 0,
            note: "",
            source_account_id: accounts[0]?.id || "",
            cashback_mode: "none_back",
            ui_is_cashback_expanded: false,
        }
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

    const onSingleSubmit = async (data: SingleTransactionFormValues) => {
        setIsSubmitting(true);
        console.log("Submitting Single:", data);
        await new Promise(r => setTimeout(r, 1000));
        setIsSubmitting(false);
        onOpenChange(false);
        onSuccess?.();
    };

    const onBulkSubmit = async (data: BulkTransactionFormValues) => {
        setIsSubmitting(true);
        try {
            await bulkCreateTransactions(data);
            onOpenChange(false);
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
                    "w-full p-0 flex flex-col h-full bg-slate-50 transition-all duration-300 ease-in-out",
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
                    <SheetTitle>
                        {mode === 'single' ? 'New Transaction' : 'Bulk Add'}
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
                                <form id="single-txn-form" onSubmit={singleForm.handleSubmit(onSingleSubmit)} className="space-y-6">
                                    <BasicInfoSection
                                        shops={shops}
                                        categories={categories}
                                        onAddNewCategory={() => setIsCategoryDialogOpen(true)}
                                    />
                                    <AccountSelector
                                        accounts={accounts}
                                        people={people}
                                        onAddNewAccount={() => setIsAccountDialogOpen(true)}
                                        onAddNewPerson={() => setIsPeopleDialogOpen(true)}
                                    />
                                    <SplitBillSection people={people} />
                                    <CashbackSection accounts={accounts} />
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
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
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
