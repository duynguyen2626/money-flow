import { useState, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { User, ArrowUpRight, ArrowDownLeft, RefreshCcw, ArrowRightLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SingleTransactionFormValues } from "../types";
import { Account, Person } from "@/types/moneyflow.types";
import { Combobox, ComboboxGroup } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

    const [showAllAccounts, setShowAllAccounts] = useState(false);
    const [lastSubmittedPersonId, setLastSubmittedPersonId] = useState<string | null>(null);
    const [lastSubmittedAccountId, setLastSubmittedAccountId] = useState<string | null>(null);

    // Load last submitted person and account on mount
    useEffect(() => {
        try {
            const savedPerson = localStorage.getItem("mf_last_submitted_person_id");
            if (savedPerson) setLastSubmittedPersonId(savedPerson);

            const savedAccount = localStorage.getItem("mf_last_submitted_account_id");
            if (savedAccount) setLastSubmittedAccountId(savedAccount);
        } catch (e) {
            console.error("Failed to load last submitted data", e);
        }
    }, []);

    // Filter accounts based on type and toggle
    const validAccounts = accounts.filter(a => {
        if (type === 'transfer' && !showAllAccounts) {
            // For transfer, usually hide credit cards unless toggled
            return a.type !== 'credit_card';
        }
        return true;
    });

    const creditAccounts = validAccounts.filter(a => a.type === 'credit_card');
    const cashAccounts = validAccounts.filter(a => a.type !== 'credit_card' && a.type !== 'debt');

    // Helper to map account to item
    const mapAccountToItem = (a: Account) => ({
        value: a.id,
        label: a.name,
        icon: a.image_url ? <img src={a.image_url} alt="" className="w-4 h-4 object-contain rounded-sm" /> : undefined
    });

    // Recent Accounts Logic (Current + Last Submitted)
    const sourceId = useWatch({ control: form.control, name: "source_account_id" });
    const recentAccountItems: any[] = [];

    // 1. Current Selection
    const currentAcc = sourceId ? validAccounts.find(a => a.id === sourceId) : null;
    if (currentAcc) recentAccountItems.push(mapAccountToItem(currentAcc));

    // 2. Last Submitted (if valid and different)
    const lastAcc = lastSubmittedAccountId ? validAccounts.find(a => a.id === lastSubmittedAccountId) : null;
    if (lastAcc && lastAcc.id !== sourceId) recentAccountItems.push(mapAccountToItem(lastAcc));

    // Prepare Groups for Combobox
    const accountGroups: ComboboxGroup[] = [
        ...(recentAccountItems.length > 0 ? [{ label: "Recent", items: recentAccountItems }] : []),
        ...(creditAccounts.length > 0 ? [{
            label: "Credit Cards",
            items: creditAccounts.map(mapAccountToItem)
        }] : []),
        {
            label: "Cash / Bank",
            items: cashAccounts.map(mapAccountToItem)
        }
    ];

    // People Options & Groups
    const peopleList = people.map(p => ({
        value: p.id,
        label: p.name,
        icon: <PersonAvatar name={p.name} imageUrl={p.image_url} size="sm" className="rounded-md" />
    }));

    // Logic: 1. Current (if exists), 2. Last Submitted (if exists and != current)
    const recentItems: any[] = [];
    const validCurrent = personId ? peopleList.find(p => p.value === personId) : null;
    const validLast = lastSubmittedPersonId ? peopleList.find(p => p.value === lastSubmittedPersonId) : null;

    if (validCurrent) recentItems.push(validCurrent);
    if (validLast && validLast.value !== personId) recentItems.push(validLast);

    const peopleGroups: ComboboxGroup[] = [
        ...(recentItems.length > 0 ? [{ label: "Recent", items: recentItems }] : []),
        { label: "All People", items: peopleList }
    ];

    return (
        <div className="space-y-4 pt-2">

            {/* TYPE TABS */}
            <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <div className="flex flex-col gap-3">
                                {/* LEVEL 1: Main Context (Personal vs External) */}
                                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100/50 rounded-lg border border-slate-200/60">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!['expense', 'income', 'transfer'].includes(field.value)) {
                                                field.onChange('expense');
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                            ['expense', 'income', 'transfer'].includes(field.value)
                                                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                        )}
                                    >
                                        <User className="w-4 h-4" />
                                        <span>Personal</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!['debt', 'repayment'].includes(field.value)) {
                                                field.onChange('debt');
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                            ['debt', 'repayment'].includes(field.value)
                                                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                        )}
                                    >
                                        <Users className="w-4 h-4" />
                                        <span>External (Debt)</span>
                                    </button>
                                </div>

                                {/* LEVEL 2: Sub-Types */}
                                {['expense', 'income', 'transfer'].includes(field.value) ? (
                                    <Tabs
                                        value={field.value}
                                        onValueChange={(val) => field.onChange(val as any)}
                                        className="w-full"
                                    >
                                        <TabsList className="grid w-full grid-cols-3 h-9 bg-slate-100/50">
                                            <TabsTrigger
                                                value="expense"
                                                className="text-xs gap-1.5 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700 data-[state=active]:shadow-sm hover:text-rose-600 transition-colors"
                                            >
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                                Expense
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="income"
                                                className="text-xs gap-1.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm hover:text-emerald-600 transition-colors"
                                            >
                                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                                Income
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="transfer"
                                                className="text-xs gap-1.5 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm hover:text-blue-600 transition-colors"
                                            >
                                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                                Transfer
                                            </TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                ) : (
                                    <div className="hidden" />
                                )}
                            </div>
                        </FormControl>
                    </FormItem>
                )}
            />

            {/* ACCOUNT SELECTION GRID */}
            <div className="grid grid-cols-2 gap-4">

                {/* SOURCE ACCOUNT: Full width for Expense/Income */}
                <div className={cn(
                    "space-y-2",
                    (type === 'expense' || type === 'income') ? "col-span-2" : "col-span-1"
                )}>
                    <FormField
                        control={form.control}
                        name="source_account_id"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5 mb-1">
                                    <FormLabel className="text-xs font-semibold text-slate-500">
                                        {type === 'income' ? 'Deposit To' : 'Pay With'}
                                    </FormLabel>
                                    {type === 'transfer' && (
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="show-all" className="text-[10px] text-slate-400 font-medium cursor-pointer">All</Label>
                                            <Switch
                                                id="show-all"
                                                checked={showAllAccounts}
                                                onCheckedChange={setShowAllAccounts}
                                                className="scale-75 origin-right"
                                            />
                                        </div>
                                    )}
                                    {(type === 'debt' || type === 'repayment') && (
                                        <div className="flex items-center gap-2 bg-slate-100/50 px-2 py-0.5 rounded-full border border-slate-200">
                                            <span className={cn("text-[10px] font-bold uppercase transition-colors", type === 'debt' ? "text-rose-600" : "text-slate-400")}>
                                                Lend
                                            </span>
                                            <Switch
                                                checked={type === 'repayment'}
                                                onCheckedChange={(checked) => form.setValue('type', checked ? 'repayment' : 'debt')}
                                                className={cn(
                                                    "scale-75 data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-rose-500"
                                                )}
                                            />
                                            <span className={cn("text-[10px] font-bold uppercase transition-colors", type === 'repayment' ? "text-emerald-600" : "text-slate-400")}>
                                                Repay
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <FormControl>
                                    <Combobox
                                        groups={accountGroups}
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        placeholder="Select account"
                                        className="w-full h-10"
                                        onAddNew={onAddNewAccount}
                                        addLabel="Account"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* TARGET ACCOUNT (Transfer Only) */}
                {type === 'transfer' && (
                    <div className="space-y-2 col-span-1">
                        <FormField
                            control={form.control}
                            name="target_account_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-slate-500">To Account</FormLabel>
                                    <FormControl>
                                        <Combobox
                                            groups={accountGroups}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Destination"
                                            className="w-full h-10"
                                            onAddNew={onAddNewAccount}
                                            addLabel="Account"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}

                {/* PERSON (Debt/Repayment Only) */}
                {(type === 'debt' || type === 'repayment') && (
                    <div className="space-y-2 col-span-1">
                        <FormField
                            control={form.control}
                            name="person_id"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between h-5 mb-1">
                                        <FormLabel className="text-xs font-semibold text-slate-500">Person</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Combobox
                                            groups={peopleGroups}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Select person"
                                            className="w-full h-10"
                                            onAddNew={onAddNewPerson}
                                            addLabel="Person"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
            </div>

        </div>
    );
}
