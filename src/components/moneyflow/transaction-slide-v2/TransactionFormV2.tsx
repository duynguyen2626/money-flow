"use client";

import React, { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    formSchema,
    TransactionFormValues,
} from "@/components/moneyflow/transaction-form/types";
import { Account, Category, Person, Shop, Installment } from "@/types/moneyflow.types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LendingTab } from "./tabs/LendingTab";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { createTransaction } from "@/services/transaction.service"; // Need a client-safe wrapper or server action?
import { createSplitBillAction } from "@/actions/split-bill-actions";

interface TransactionFormV2Props {
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops?: Shop[];
    installments?: Installment[];
    onSuccess?: () => void;
    onCancel?: () => void;
}

const defaultValues: Partial<TransactionFormValues> = {
    type: "expense",
    amount: 0,
    occurred_at: new Date(),
    note: "",
    is_installment: false,
    split_bill: false,
    split_bill_participants: [],
    cashback_mode: "none_back",
};

export function TransactionFormV2({
    accounts,
    categories,
    people,
    shops,
    onSuccess,
    onCancel,
}: TransactionFormV2Props) {
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });

    const [activeTab, setActiveTab] = useState("expense");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (data: TransactionFormValues) => {
        setIsSubmitting(true);
        try {
            console.log("Submitting V2:", data);
            // TODO: Call proper Server Action
            // For now just simulate
            await new Promise(r => setTimeout(r, 1000));
            onSuccess?.();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                {/* Tabs */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur px-6 pt-2 pb-2 border-b">
                    <Tabs
                        value={activeTab}
                        onValueChange={(val) => {
                            setActiveTab(val);
                            // Auto-set type based on tab?
                            if (val === "lending") form.setValue("type", "debt");
                            if (val === "expense") form.setValue("type", "expense");
                            if (val === "income") form.setValue("type", "income");
                            if (val === "repayment") form.setValue("type", "repayment");
                        }}
                        className="w-full"
                    >
                        <TabsList className="w-full flex h-11 p-1 bg-muted rounded-xl">
                            <TabsTrigger value="expense" className="flex-1 rounded-lg">Expense</TabsTrigger>
                            <TabsTrigger value="income" className="flex-1 rounded-lg">Income</TabsTrigger>
                            <TabsTrigger value="lending" className="flex-1 rounded-lg">Lending</TabsTrigger>
                            <TabsTrigger value="repayment" className="flex-1 rounded-lg">Repay</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-6 space-y-6">
                    {activeTab === "lending" ? (
                        <LendingTab
                            accounts={accounts}
                            people={people}
                        />
                    ) : (
                        <div className="text-center text-muted-foreground p-10">
                            Tab {activeTab} coming soon in Phase 2.
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="sticky bottom-0 bg-background p-6 border-t flex justify-between gap-4">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Transaction
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}
