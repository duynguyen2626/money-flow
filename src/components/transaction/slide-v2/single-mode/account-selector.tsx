"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormContext, useWatch, Controller } from "react-hook-form";
import { User, ArrowUpRight, ArrowDownLeft, RefreshCcw, ArrowRightLeft, Users, Store, AlertCircle, Landmark, CreditCard, Wallet, Smartphone, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";

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
import { getLastTransactionPersonId } from "@/actions/account-actions";

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

    const params = useParams();
    const currentAccountId = params?.id as string | undefined;

    // MF5.5: Recent People Optimization
    const [lastSubmittedPersonId, setLastSubmittedPersonId] = useState<string | null>(null);
    const [lastClickedPersonId, setLastClickedPersonId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('mf_last_clicked_person_id');
        }
        return null;
    });

    useEffect(() => {
        getLastTransactionPersonId().then(setLastSubmittedPersonId);
    }, []);

    const selectedPerson = useMemo(() => people.find(p => p.id === personId), [people, personId]);

    // Mode detection
    const isSpecialMode = ['transfer', 'credit_pay', 'invest'].includes(type);

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

    // Enforce BẬP BÊNH from Type (inverse logic)
    useEffect(() => {
        if (isSpecialMode) return;

        if (['income', 'repayment'].includes(type)) {
            if (sourceId) form.setValue('source_account_id', null);
        } else if (['expense', 'debt'].includes(type)) {
            if (targetId) form.setValue('target_account_id', null);
        }
    }, [type, isSpecialMode, sourceId, targetId, form]);

    // Filtering logic for special rules
    const mapAccountToItem = (a: Account) => {
        let typeIcon = null;
        let typeLabel: any = a.type || 'Acc';
        let colorClass = "text-slate-500 border-slate-200 bg-slate-50";

        switch (a.type) {
            case 'bank':
                typeIcon = <Landmark className="h-2.5 w-2.5" />;
                typeLabel = 'Bank';
                colorClass = "text-blue-600 border-blue-200 bg-blue-50";
                break;
            case 'credit_card':
                typeIcon = <CreditCard className="h-2.5 w-2.5" />;
                typeLabel = 'Credit';
                colorClass = "text-violet-600 border-violet-200 bg-violet-50";
                break;
            case 'cash':
                typeIcon = <Wallet className="h-2.5 w-2.5" />;
                typeLabel = 'Cash';
                colorClass = "text-emerald-600 border-emerald-200 bg-emerald-50";
                break;
            case 'ewallet':
                typeIcon = <Smartphone className="h-2.5 w-2.5" />;
                typeLabel = 'Wallet';
                colorClass = "text-orange-600 border-orange-200 bg-orange-50";
                break;
            case 'savings':
            case 'investment':
                typeIcon = <PiggyBank className="h-2.5 w-2.5" />;
                typeLabel = 'Saving';
                colorClass = "text-sky-600 border-sky-200 bg-sky-50";
                break;
            default:
                typeIcon = <Landmark className="h-2.5 w-2.5" />;
                typeLabel = a.type || 'Acc';
        }

        return {
            value: a.id,
            label: a.name,
            icon: a.image_url ? <img src={a.image_url} alt="" className="w-5 h-auto max-w-[20px] object-contain rounded-none" /> : undefined,
            badge: (
                <div className={`flex items-center gap-1 rounded-[4px] border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${colorClass}`}>
                    {typeIcon}
                    <span>{typeLabel}</span>
                </div>
            )
        };
    };

    const getAccountGroups = (side: 'source' | 'target'): ComboboxGroup[] => {
        let filtered = accounts;

        if (type === 'transfer') {
            if (side === 'source' && targetId) filtered = accounts.filter(a => a.id !== targetId);
            if (side === 'target' && sourceId) filtered = accounts.filter(a => a.id !== sourceId);
        } else if (type === 'credit_pay') {
            if (side === 'source') filtered = accounts.filter(a => a.type !== 'credit_card');
            else filtered = accounts.filter(a => a.type === 'credit_card');
        }

        const currentAccount = currentAccountId ? filtered.find(a => a.id === currentAccountId) : null;
        const creditAccounts = filtered.filter(a => a.type === 'credit_card' && a.id !== currentAccountId);
        const cashAccounts = filtered.filter(a => a.type !== 'credit_card' && a.type !== 'debt' && a.id !== currentAccountId);

        return [
            ...(currentAccount ? [{ label: "Current Account", items: [mapAccountToItem(currentAccount)] }] : []),
            ...(creditAccounts.length > 0 ? [{ label: "Credit Cards", items: creditAccounts.map(mapAccountToItem) }] : []),
            { label: "Cash & Banks", items: cashAccounts.map(mapAccountToItem) }
        ];
    };

    const peopleGroups: ComboboxGroup[] = useMemo(() => {
        const recentIds = Array.from(new Set([lastClickedPersonId, lastSubmittedPersonId].filter(Boolean))) as string[];
        const recentPeopleList = people.filter(p => recentIds.includes(p.id));
        const allOtherPeople = people.filter(p => !recentIds.includes(p.id));

        return [
            ...(recentPeopleList.length > 0 ? [{
                label: "Recent Involved",
                items: recentPeopleList.map(p => ({
                    value: p.id,
                    label: p.name,
                    icon: <PersonAvatar name={p.name} imageUrl={p.image_url} size="sm" className="rounded-none" />
                }))
            }] : []),
            {
                label: "All People",
                items: allOtherPeople.map(p => ({
                    value: p.id,
                    label: p.name,
                    icon: <PersonAvatar name={p.name} imageUrl={p.image_url} size="sm" className="rounded-none" />
                }))
            }
        ];
    }, [people, lastClickedPersonId, lastSubmittedPersonId]);

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
                            <FormLabel className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 capitalize tracking-wide mb-1.5">
                                <Users className="w-3 h-3" />
                                Involved Person
                            </FormLabel>
                            <FormControl>
                                <Combobox
                                    groups={peopleGroups}
                                    value={field.value ?? undefined}
                                    onValueChange={(val) => {
                                        field.onChange(val);
                                        if (val) {
                                            setLastClickedPersonId(val);
                                            localStorage.setItem('mf_last_clicked_person_id', val);
                                        }
                                    }}
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

        </div>
    );
}
