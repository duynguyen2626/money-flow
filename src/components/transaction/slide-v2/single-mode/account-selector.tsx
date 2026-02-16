"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormContext, useWatch, Controller } from "react-hook-form";
import { User, ArrowUpRight, ArrowDownLeft, RefreshCcw, ArrowRightLeft, Users, Store, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import {
    FormControl,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { SingleTransactionFormValues } from "../types";
import { Account, Person } from "@/types/moneyflow.types";
import { Combobox, ComboboxGroup } from "@/components/ui/combobox";
import { PersonAvatar } from "@/components/ui/person-avatar";

type AccountSelectorProps = {
    accounts: Account[];
    people: Person[];
    onAddNewAccount?: () => void;
    onAddNewPerson?: () => void;
};

export function AccountSelector({ accounts, people, onAddNewAccount, onAddNewPerson }: AccountSelectorProps) {
    const form = useFormContext<SingleTransactionFormValues>();
    const type = useWatch({ control: form.control, name: "type" });
    const personId = useWatch({ control: form.control, name: "person_id" });
    const sourceId = useWatch({ control: form.control, name: "source_account_id" });
    const targetId = useWatch({ control: form.control, name: "target_account_id" });

    const selectedPerson = useMemo(() => people.find(p => p.id === personId), [people, personId]);

    // Mode detection
    const isSpecialMode = ['transfer', 'credit_pay'].includes(type);

    // Smart Type Inferrer
    useEffect(() => {
        if (isSpecialMode) return;

        if (personId) {
            if (sourceId && !targetId) form.setValue('type', 'debt');
            else if (!sourceId && targetId) form.setValue('type', 'repayment');
        } else {
            if (sourceId && !targetId) form.setValue('type', 'expense');
            else if (!sourceId && targetId) form.setValue('type', 'income');
        }
    }, [sourceId, targetId, personId, isSpecialMode, form]);

    // Filtering logic for special rules
    const mapAccountToItem = (a: Account) => ({
        value: a.id,
        label: a.name,
        icon: a.image_url ? <img src={a.image_url} alt="" className="w-4 h-4 object-contain rounded-none" /> : undefined
    });

    const getAccountGroups = (side: 'source' | 'target'): ComboboxGroup[] => {
        let filtered = accounts;

        if (type === 'transfer') {
            if (side === 'source' && targetId) filtered = accounts.filter(a => a.id !== targetId);
            if (side === 'target' && sourceId) filtered = accounts.filter(a => a.id !== sourceId);
        } else if (type === 'credit_pay') {
            if (side === 'source') filtered = accounts.filter(a => a.type !== 'credit_card');
            else filtered = accounts.filter(a => a.type === 'credit_card');
        }

        const creditAccounts = filtered.filter(a => a.type === 'credit_card');
        const cashAccounts = filtered.filter(a => a.type !== 'credit_card' && a.type !== 'debt');

        return [
            ...(creditAccounts.length > 0 ? [{ label: "Credit Cards", items: creditAccounts.map(mapAccountToItem) }] : []),
            { label: "Cash / Bank", items: cashAccounts.map(mapAccountToItem) }
        ];
    };

    const peopleGroups: ComboboxGroup[] = [
        {
            label: "All People",
            items: people.map(p => ({
                value: p.id,
                label: p.name,
                icon: <PersonAvatar name={p.name} imageUrl={p.image_url} size="sm" className="rounded-none" />
            }))
        }
    ];

    const isIncomeFlow = !sourceId && !!targetId;
    const isExpenseFlow = !!sourceId && !targetId;
    const isTransferFlow = isSpecialMode || (!!sourceId && !!targetId);

    // --- Dynamic Placeholder Logic (BẬP BÊNH) ---
    const sourcePlaceholder = useMemo(() => {
        if (targetId && !isSpecialMode) {
            if (personId) return `Payer: ${selectedPerson?.name || 'Person'}`;
            return "Receiving Mode (Bank Active)";
        }
        return "Choose Pay With";
    }, [targetId, isSpecialMode, personId, selectedPerson]);

    const targetPlaceholder = useMemo(() => {
        if (sourceId && !isSpecialMode) {
            if (personId) return `Borrower: ${selectedPerson?.name || 'Person'}`;
            return "Spending Mode (Bank Active)";
        }
        return "Choose Deposit To";
    }, [sourceId, isSpecialMode, personId, selectedPerson]);

    return (
        <div className="space-y-6 pt-2">
            {/* ROW 1: PEOPLE */}
            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                <Controller
                    control={form.control}
                    name="person_id"
                    render={({ field }) => (
                        <FormItem className="w-full">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Involved Person
                            </FormLabel>
                            <FormControl>
                                <Combobox
                                    groups={peopleGroups}
                                    value={field.value ?? undefined}
                                    onValueChange={field.onChange}
                                    placeholder="Personal Flow (No one)"
                                    className="w-full h-11 bg-white border-slate-200 shadow-sm transition-all hover:bg-slate-50/50"
                                    onAddNew={onAddNewPerson}
                                    addLabel="Person"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* ROW 2: ACCOUNT FLOW */}
            <div className="grid grid-cols-2 gap-4 items-start relative">
                {/* Visual Connector: The BẬP BÊNH beam */}
                <div className="absolute left-1/2 top-11 -translate-x-1/2 w-8 h-[2px] bg-slate-100 z-0 hidden sm:block" />

                {/* SOURCE */}
                <div className="space-y-1.5 z-10">
                    <FormLabel className={cn(
                        "text-[10px] font-black uppercase tracking-wider block mb-1 transition-colors",
                        isIncomeFlow ? "text-slate-200" : "text-rose-500"
                    )}>
                        Pay With (Từ)
                    </FormLabel>

                    <Controller
                        control={form.control}
                        name="source_account_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Combobox
                                        groups={getAccountGroups('source')}
                                        value={field.value ?? undefined}
                                        onValueChange={(val) => {
                                            field.onChange(val || undefined); // Use undefined instead of null to fix lint
                                            // BẬP BÊNH logic: Selecting source clears target if standard mode
                                            if (val && !isSpecialMode && targetId) {
                                                form.setValue('target_account_id', undefined as any);
                                            }
                                        }}
                                        placeholder={sourcePlaceholder}
                                        triggerClassName={cn(
                                            "h-11 border-slate-200 transition-all duration-300",
                                            isIncomeFlow && "opacity-40 border-dashed bg-slate-50 grayscale",
                                            field.value && "border-rose-100 shadow-sm ring-1 ring-rose-50"
                                        )}
                                        className="w-full"
                                        onAddNew={onAddNewAccount}
                                        addLabel="Account"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* TARGET */}
                <div className="space-y-1.5 z-10">
                    <FormLabel className={cn(
                        "text-[10px] font-black uppercase tracking-wider block mb-1 transition-colors",
                        isExpenseFlow ? "text-slate-200" : "text-emerald-500"
                    )}>
                        Deposit To (Đến)
                    </FormLabel>

                    <Controller
                        control={form.control}
                        name="target_account_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Combobox
                                        groups={getAccountGroups('target')}
                                        value={field.value ?? undefined}
                                        onValueChange={(val) => {
                                            field.onChange(val || undefined);
                                            // BẬP BÊNH logic: Selecting target clears source if standard mode
                                            if (val && !isSpecialMode && sourceId) {
                                                form.setValue('source_account_id', undefined as any);
                                            }
                                        }}
                                        placeholder={targetPlaceholder}
                                        triggerClassName={cn(
                                            "h-11 border-slate-200 transition-all duration-300",
                                            isExpenseFlow && "opacity-40 border-dashed bg-slate-50 grayscale",
                                            field.value && "border-emerald-100 shadow-sm ring-1 ring-emerald-50"
                                        )}
                                        className="w-full"
                                        onAddNew={onAddNewAccount}
                                        addLabel="Account"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* ROW 3: CONTEXT HINT */}
            <div className="animate-in fade-in slide-in-from-bottom-1 duration-400">
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/50 shadow-sm flex items-start gap-4 transition-all overflow-hidden group">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-all duration-500",
                        isIncomeFlow ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-100" :
                            isExpenseFlow ? "bg-rose-500 text-white border-rose-600 shadow-rose-100" :
                                isTransferFlow ? (type === 'credit_pay' ? "bg-violet-600 text-white border-violet-700 shadow-violet-100" : "bg-blue-500 text-white border-blue-600 shadow-blue-100") :
                                    "bg-white text-slate-400 border-slate-200"
                    )}>
                        {isIncomeFlow ? <ArrowUpRight className="w-5 h-5 animate-pulse" /> :
                            isExpenseFlow ? <ArrowDownLeft className="w-5 h-5 animate-pulse" /> :
                                isTransferFlow ? (type === 'credit_pay' ? <RefreshCcw className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />) :
                                    <User className="w-5 h-5" />}
                    </div>
                    <div className="space-y-0.5 flex-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Automated Flow Summary</span>
                        <p className="text-[11px] text-slate-600 leading-tight font-bold">
                            {type === 'credit_pay' ? (
                                sourceId && targetId ? "Card Repayment Match: Moving funds to settle credit debt." : "Card Repayment Mode: Please choose source bank and target credit card."
                            ) : isTransferFlow ? (
                                sourceId && targetId ? "Internal Transfer: Moving funds between your own assets." : "Transfer Mode: Please select both source and destination accounts."
                            ) : isIncomeFlow ? (
                                personId ? `Repayment Flow: ${selectedPerson?.name} is paying you back into ${accounts.find(a => a.id === targetId)?.name}.` :
                                    `Income Flow: Receiving funds into ${accounts.find(a => a.id === targetId)?.name}.`
                            ) : isExpenseFlow ? (
                                personId ? `Lending Flow: You are lending to ${selectedPerson?.name} from ${accounts.find(a => a.id === sourceId)?.name}.` :
                                    `Expense Flow: Paying from ${accounts.find(a => a.id === sourceId)?.name}.`
                            ) : (
                                "Intelligent Transaction Flow: Start by picking an account or person."
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
