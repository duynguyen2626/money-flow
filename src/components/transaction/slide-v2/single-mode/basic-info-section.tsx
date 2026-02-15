"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useEffect } from "react";
import { format, subMonths } from "date-fns";
import { CalendarIcon, Store, Tag, RefreshCw, Book, History, Check, X } from "lucide-react";

import {
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SingleTransactionFormValues } from "../types";
import { Shop, Category, Person } from "@/types/moneyflow.types";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { Combobox } from "@/components/ui/combobox";
import { formatShortVietnameseCurrency } from "@/lib/number-to-text";

type BasicInfoSectionProps = {
    shops: Shop[];
    categories: Category[];
    people: Person[];
    onAddNewCategory?: () => void;
    operationMode?: 'add' | 'edit' | 'duplicate';
    isLoadingCategories?: boolean;
};

export function BasicInfoSection({ shops, categories, people, onAddNewCategory, operationMode, isLoadingCategories }: BasicInfoSectionProps) {
    const form = useFormContext<SingleTransactionFormValues>();
    const transactionType = useWatch({ control: form.control, name: "type" });
    const isShopHidden = ['income', 'repayment', 'transfer', 'credit_pay'].includes(transactionType);
    const amount = useWatch({ control: form.control, name: "amount" });
    const serviceFee = useWatch({ control: form.control, name: "service_fee" });

    // Sync Tag with Date
    const occurredAt = useWatch({ control: form.control, name: "occurred_at" });
    useEffect(() => {
        if (occurredAt) {
            form.setValue("tag", format(occurredAt, "yyyy-MM"));
        }
    }, [occurredAt, form]);

    // Filter categories based on transaction type (Case-insensitve & Robust)
    const filteredCategories = categories.filter(c => {
        if (!c.type) return true; // Show uncategorized if any
        const catType = c.type.toLowerCase();
        const txType = transactionType?.toLowerCase() || 'expense';

        if (txType === 'expense' || txType === 'debt' || txType === 'credit_pay') return catType === 'expense';
        if (txType === 'income' || txType === 'repayment') return catType === 'income';
        // For transfer, usually we want 'transfer' categories, but sometimes 'expense' (e.g. fees)
        if (txType === 'transfer') return catType === 'transfer';

        return true;
    });

    // Auto-select defaults for Debt (Lend) and Repayment
    useEffect(() => {
        // Skip auto-assignment if not a new transaction or if category already set
        const currentCategoryId = form.getValues('category_id');
        if (operationMode === 'edit' || operationMode === 'duplicate' || currentCategoryId) return;

        if (transactionType === 'debt') {
            const shoppingCat = categories.find(c => c.name === 'Shopping');
            if (shoppingCat) {
                form.setValue('category_id', shoppingCat.id);
            }
            const shopeeShop = shops.find(s => s.name === 'Shopee');
            if (shopeeShop) {
                form.setValue('shop_id', shopeeShop.id);
            }
        } else if (transactionType === 'repayment') {
            const repaymentCat = categories.find(c => c.name === 'Repayment');
            if (repaymentCat) {
                form.setValue('category_id', repaymentCat.id);
            }
        }
    }, [transactionType, categories, shops, form]);

    const categoryOptions = filteredCategories.map(c => ({
        value: c.id,
        label: c.name,
        icon: c.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.image_url} alt={c.name} className="w-5 h-5 object-contain rounded-md" />
        ) : c.icon ? (
            <span className="text-sm">{c.icon}</span>
        ) : (
            <Book className="w-4 h-4 text-slate-400" />
        )
    }));

    const shopOptions = shops.map(s => ({
        value: s.id,
        label: s.name,
        icon: s.image_url ? (
            <img
                src={s.image_url}
                alt={s.name}
                className="w-6 h-6 object-contain rounded-md"
            />
        ) : <Store className="w-4 h-4 text-slate-400" />
    }));

    return (
        <div className="space-y-3">

            {/* ROW 1: Date & Tag */}
            <div className="flex gap-3">
                {/* Date Picker */}
                <div className="flex-1">
                    <FormField
                        control={form.control}
                        name="occurred_at"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal h-10 border-slate-200 bg-white",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "dd/MM/yyyy")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={(newDate) => {
                                                if (!newDate) return;
                                                const current = field.value || new Date();
                                                const preserved = new Date(newDate);
                                                preserved.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
                                                field.onChange(preserved);
                                            }}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Tag Input */}
                <div className="flex-1">
                    <FormField
                        control={form.control}
                        name="tag"
                        render={({ field }) => (
                            <FormItem>
                                <div className="relative flex gap-1">
                                    <div className="relative flex-1">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Tag / Cycle"
                                            className="pl-9 pr-16 bg-white border-slate-200"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="Recent Tags"
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-40 p-1" align="end">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-semibold text-slate-500 px-2 py-1 bg-slate-50 rounded-sm mb-1">
                                                            Recent Cycles
                                                        </span>
                                                        {Array.from({ length: 3 }).map((_, i) => {
                                                            const date = subMonths(new Date(), i);
                                                            const tag = format(date, "yyyy-MM");
                                                            return (
                                                                <button
                                                                    key={tag}
                                                                    type="button"
                                                                    onClick={() => field.onChange(tag)}
                                                                    className={cn(
                                                                        "text-xs px-2 py-1.5 rounded-sm hover:bg-slate-100 text-left transition-colors flex items-center justify-between group",
                                                                        field.value === tag && "bg-blue-50 text-blue-600 font-medium hover:bg-blue-100"
                                                                    )}
                                                                >
                                                                    <span>{tag}</span>
                                                                    {field.value === tag && <Check className="h-3 w-3" />}
                                                                </button>
                                                            )
                                                        })}
                                                        <div className="h-px bg-slate-100 my-1" />
                                                        <button
                                                            type="button"
                                                            onClick={() => field.onChange(format(new Date(), "yyyy-MM"))}
                                                            className="text-xs px-2 py-1.5 rounded-sm hover:bg-slate-100 text-left text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
                                                        >
                                                            <RefreshCw className="h-3 w-3" />
                                                            <span>Current</span>
                                                        </button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* ROW 2: Amount (Prominent) */}
            <div className="space-y-1.5">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem className="space-y-1">
                            <FormControl>
                                <SmartAmountInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    hideLabel={true}
                                    className="text-2xl font-bold h-12"
                                    placeholder="0"
                                />
                            </FormControl>
                            {field.value ? (
                                <p className="text-[10px] font-bold text-rose-600 px-1 italic">
                                    {formatShortVietnameseCurrency(field.value)}
                                </p>
                            ) : null}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Service Fee (Optional) */}
                <FormField
                    control={form.control}
                    name="service_fee"
                    render={({ field }) => {
                        const fee = field.value || 0;
                        const hasFee = fee > 0;
                        const totalAmount = (amount || 0) + fee;

                        return (
                            <FormItem className="space-y-0">
                                <div className="flex items-center justify-between gap-3 bg-indigo-50/30 rounded-lg px-4 py-3 border border-dashed border-indigo-200 shadow-sm">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-700 shadow-sm">FEE</div>
                                            <span className="text-xs font-black text-indigo-900/70 uppercase tracking-wider">Service Fee</span>
                                        </div>
                                        {hasFee && (
                                            <p className="text-[10px] font-bold text-rose-600 px-1 italic leading-none mt-1">
                                                {formatShortVietnameseCurrency(fee)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <FormControl>
                                            <SmartAmountInput
                                                value={field.value || undefined}
                                                onChange={field.onChange}
                                                hideLabel={true}
                                                placeholder="0"
                                                className="w-28 h-9 text-sm font-black text-right"
                                                compact={true}
                                                hideCurrencyText={true}
                                                hideCalculator={true}
                                            />
                                        </FormControl>
                                        {hasFee && (
                                            <div className="flex items-center gap-2 pl-3 border-l-2 border-slate-200/50">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Total</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-lg font-black text-slate-900 tabular-nums leading-none">
                                                            {new Intl.NumberFormat('vi-VN').format(totalAmount)}
                                                        </span>
                                                        <div className="p-0.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200 shadow-sm">
                                                            <Check className="w-2.5 h-2.5" />
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-rose-600 italic leading-none mt-0.5">
                                                        {formatShortVietnameseCurrency(totalAmount)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        );
                    }}
                />
            </div>

            {/* ROW 3: Category & Shop */}
            <div className={cn("grid gap-3", isShopHidden ? "grid-cols-1" : "grid-cols-2")}>
                {/* Category Selection */}
                <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Combobox
                                    items={categoryOptions}
                                    value={field.value || undefined}
                                    onValueChange={field.onChange}
                                    placeholder="Category"
                                    inputPlaceholder="Search category..."
                                    className="w-full h-10 bg-white"
                                    onAddNew={onAddNewCategory}
                                    addLabel="Category"
                                    isLoading={isLoadingCategories}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Shop Selection (Hidden for Income/Transfer/Repayment) */}
                {!isShopHidden && (
                    <FormField
                        control={form.control}
                        name="shop_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Combobox
                                        items={shopOptions}
                                        value={field.value || undefined}
                                        onValueChange={field.onChange}
                                        placeholder="Select Shop"
                                        inputPlaceholder="Search shops..."
                                        emptyState="No shop found."
                                        className="w-full h-10 bg-white"
                                        onAddNew={() => console.log("Add new shop clicked")}
                                        addLabel="Shop"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

            {/* ROW 4: Note */}
            <FormField
                control={form.control}
                name="note"
                render={({ field }) => {
                    // Calculate #nosync label based on selected person
                    const personId = form.getValues("person_id");
                    const selectedPerson = people?.find(p => p.id === personId);
                    const hasSheet = !!selectedPerson?.google_sheet_url;
                    const nosyncLabel = hasSheet ? "+ Not sync" : "+ #nosync";

                    return (
                        <FormItem>
                            <div className="flex items-center justify-between px-1 mb-1.5">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Note</span>
                                <span
                                    onClick={(e) => {
                                        e.preventDefault(); // Prevent focus stealing issues
                                        const current = field.value || "";
                                        if (!current.includes("#nosync")) {
                                            const newValue = current ? `${current} #nosync` : "#nosync";
                                            field.onChange(newValue);
                                        }
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-blue-600 hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                    title="Click to add #nosync tag"
                                >
                                    {nosyncLabel}
                                </span>
                            </div>
                            <FormControl>
                                <div className="relative">
                                    <Textarea
                                        placeholder="Add a note..."
                                        className="resize-none min-h-[60px] bg-white border-slate-200 pr-8"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                    {field.value && (
                                        <button
                                            type="button"
                                            onClick={() => field.onChange("")}
                                            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    );
                }}
            />

        </div>
    );
}
