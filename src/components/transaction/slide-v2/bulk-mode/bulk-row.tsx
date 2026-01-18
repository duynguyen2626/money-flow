"use client";

import { useFormContext } from "react-hook-form";
import { Store, Trash2, CreditCard, Wallet } from "lucide-react";

import {
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { ClearableInput } from "@/components/ui/clearable-input";
import { Button } from "@/components/ui/button";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { Combobox, ComboboxGroup } from "@/components/ui/combobox";
import { Shop, Account, Person } from "@/types/moneyflow.types";
import { QuickCashbackInput } from "./quick-cashback-input";
import { PersonAvatar } from "@/components/ui/person-avatar";

type BulkRowProps = {
    index: number;
    onRemove: (index: number) => void;
    shops: Shop[];
    accounts: Account[];
    people: Person[]; // Added
    onAddNewAccount?: () => void;
    onAddNewPerson?: () => void; // Added
};

export function BulkTransactionRow({ index, onRemove, shops, accounts, people, onAddNewAccount, onAddNewPerson }: BulkRowProps) {
    const form = useFormContext();
    const basePath = `rows.${index}`;

    const shopOptions = shops.map(s => ({
        value: s.id,
        label: s.name,
        icon: s.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.image_url} alt={s.name} className="w-4 h-4 object-contain rounded-md" />
        ) : (
            <Store className="w-4 h-4 text-slate-400" />
        )
    }));

    const peopleOptions = people.map(p => ({
        value: p.id,
        label: p.name,
        icon: <PersonAvatar name={p.name} imageUrl={p.image_url} size="sm" />
    }));

    const creditAccounts = accounts.filter(a => a.type === 'credit_card');
    const cashAccounts = accounts.filter(a => a.type !== 'credit_card' && a.type !== 'debt');

    // Prepare Groups for Account Combobox
    const accountGroups: ComboboxGroup[] = [
        {
            label: "Credit Cards",
            items: creditAccounts.map(a => ({
                value: a.id,
                label: a.name,
                icon: a.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image_url} alt="" className="w-4 h-4 object-contain" />
                ) : (
                    <CreditCard className="w-4 h-4 text-slate-400" />
                )
            }))
        },
        {
            label: "Cash / Bank",
            items: cashAccounts.map(a => ({
                value: a.id,
                label: a.name,
                icon: a.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.image_url} alt="" className="w-4 h-4 object-contain" />
                ) : (
                    <Wallet className="w-4 h-4 text-slate-400" />
                )
            }))
        }
    ];

    return (
        <div className="flex gap-2 items-center p-2 border rounded-lg bg-white hover:bg-slate-50 transition-colors group h-[52px]">

            {/* 1. Shop (Combobox) - Flexible Width */}
            <div className="flex-1 min-w-[140px]">
                <FormField
                    control={form.control}
                    name={`${basePath}.shop_id`}
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <FormControl>
                                <Combobox
                                    items={shopOptions}
                                    value={field.value}
                                    onValueChange={(val) => field.onChange(val)}
                                    placeholder="Merchant..."
                                    className="h-9 text-sm"
                                    inputPlaceholder="Search merchant..."
                                    emptyState="No merchant found."
                                    onAddNew={() => console.log("Add new merchant")} // Placeholder or need prop
                                    addLabel="Merchant"
                                />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                        </FormItem>
                    )}
                />
            </div>

            {/* 1.5 Person (Combobox) - Optional */}
            <div className="w-[120px]">
                <FormField
                    control={form.control}
                    name={`${basePath}.person_id`}
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <FormControl>
                                <Combobox
                                    items={peopleOptions}
                                    value={field.value}
                                    onValueChange={(val) => field.onChange(val)}
                                    placeholder="Person..."
                                    className="h-9 text-sm"
                                    inputPlaceholder="Search person..."
                                    emptyState="No person found."
                                    onAddNew={onAddNewPerson}
                                    addLabel="Person"
                                />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                        </FormItem>
                    )}
                />
            </div>

            {/* 2. Amount - Fixed Width */}
            <div className="w-[180px]">
                <FormField
                    control={form.control}
                    name={`${basePath}.amount`}
                    render={({ field }) => (
                        <FormItem className="space-y-0 relative">
                            <FormControl>
                                <SmartAmountInput
                                    value={field.value as number}
                                    onChange={field.onChange}
                                    placeholder="0"
                                    className="h-9 text-sm font-medium space-y-0"
                                    hideLabel
                                    hideCurrencyText={false}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            {/* 3. Note - Flexible/Hidden on small */}
            <div className="flex-1 min-w-[100px] hidden sm:block">
                <FormField
                    control={form.control}
                    name={`${basePath}.note`}
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <FormControl>
                                <ClearableInput
                                    {...field}
                                    value={field.value ?? ""}
                                    placeholder="Note..."
                                    className="h-9 text-sm text-muted-foreground"
                                    onClear={() => field.onChange("")}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            {/* 4. Account (Optional Override) */}
            <div className="w-[130px]">
                <FormField
                    control={form.control}
                    name={`${basePath}.source_account_id`}
                    render={({ field }) => (
                        <FormItem className="space-y-0">
                            <FormControl>
                                <Combobox
                                    groups={accountGroups}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    onAddNew={onAddNewAccount}
                                    addLabel="Account"
                                    placeholder="Account"
                                    className="h-9 text-xs"
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            {/* 5. Cashback */}
            <div className="shrink-0">
                <QuickCashbackInput index={index} accounts={accounts} />
            </div>

            {/* 6. Remove */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onRemove(index)}
            >
                <Trash2 className="w-4 h-4" />
            </Button>

        </div >
    );
}
