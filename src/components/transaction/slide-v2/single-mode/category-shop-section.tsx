"use client";

import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Book, Store, Tag } from "lucide-react";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { SingleTransactionFormValues } from "../types";
import { Shop, Category } from "@/types/moneyflow.types";
import { Combobox } from "@/components/ui/combobox";

type CategoryShopSectionProps = {
    shops: Shop[];
    categories: Category[];
    onAddNewCategory?: () => void;
    onAddNewShop?: () => void;
    isLoadingCategories?: boolean;
};

export function CategoryShopSection({ shops, categories, onAddNewCategory, onAddNewShop, isLoadingCategories }: CategoryShopSectionProps) {
    const form = useFormContext<SingleTransactionFormValues>();
    const transactionType = useWatch({ control: form.control, name: "type" });

    // Filter categories based on transaction type
    const filteredCategories = useMemo(() => {
        return categories.filter(c => {
            if (!c.type) return true;
            const catType = c.type.toLowerCase();
            const txType = transactionType?.toLowerCase() || 'expense';

            if (['expense', 'debt', 'credit_pay'].includes(txType)) return catType === 'expense';
            if (['income', 'repayment'].includes(txType)) return catType === 'income';
            if (txType === 'transfer') return catType === 'transfer';

            return true;
        });
    }, [categories, transactionType]);

    const categoryOptions = filteredCategories.map(c => ({
        value: c.id,
        label: c.name,
        icon: c.image_url ? (
            <img src={c.image_url} alt={c.name} className="w-5 h-5 object-contain rounded-none" />
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
            <img src={s.image_url} alt={s.name} className="w-6 h-6 object-contain rounded-none" />
        ) : <Store className="w-4 h-4 text-slate-400" />
    }));

    // Auto-select defaults logic
    useEffect(() => {
        if (form.getValues('category_id')) return;

        if (transactionType === 'debt') {
            const shoppingCat = categories.find(c => c.name === 'Shopping' || c.name === 'Mua sắm');
            if (shoppingCat) form.setValue('category_id', shoppingCat.id);
        } else if (transactionType === 'repayment') {
            const repaymentCat = categories.find(c => c.name === 'Repayment' || c.name === 'Thu nợ');
            if (repaymentCat) form.setValue('category_id', repaymentCat.id);
        }
    }, [transactionType, categories, form]);

    // Shop is only truly irrelevant for Internal Transfers and Credit Card Payments
    const isShopHidden = ['transfer', 'credit_pay'].includes(transactionType);

    return (
        <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-slate-300">
            <div className="flex items-center gap-2 mb-1 px-1 border-b border-slate-50 pb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">Classifications</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Grouping & Context</span>
                </div>
            </div>

            <div className={cn("grid gap-4", isShopHidden ? "grid-cols-1" : "grid-cols-2")}>
                {/* Category Selection */}
                <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                                Category
                            </FormLabel>
                            <FormControl>
                                <Combobox
                                    items={categoryOptions}
                                    value={field.value || undefined}
                                    onValueChange={field.onChange}
                                    placeholder="Select Category"
                                    className="w-full h-11 bg-slate-50/50 border-slate-200 rounded-xl"
                                    onAddNew={onAddNewCategory}
                                    addLabel="Category"
                                    isLoading={isLoadingCategories}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Shop Selection */}
                {!isShopHidden && (
                    <FormField
                        control={form.control}
                        name="shop_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                                    Merchant / Shop
                                </FormLabel>
                                <FormControl>
                                    <Combobox
                                        items={shopOptions}
                                        value={field.value || undefined}
                                        onValueChange={field.onChange}
                                        placeholder="External Source"
                                        className="w-full h-11 bg-slate-50/50 border-slate-200 rounded-xl"
                                        onAddNew={onAddNewShop}
                                        addLabel="Shop"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
        </div>
    );
}
