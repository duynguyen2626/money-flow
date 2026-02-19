"use client";

import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Book, Store, Tag } from "lucide-react";
import Image from "next/image";
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

import { getRecentShopByCategoryId } from "@/actions/transaction-actions";

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
    const categoryId = useWatch({ control: form.control, name: "category_id" });

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

    const isValidUrl = (url: string | null | undefined): url is string => {
        if (!url) return false;
        try {
            // Next.js Image handles relative paths and absolute URLs
            if (url.startsWith('/') || url.startsWith('http')) return true;
            return false;
        } catch {
            return false;
        }
    };

    const categoryOptions = filteredCategories.map(c => ({
        value: c.id,
        label: c.name,
        icon: isValidUrl(c.image_url) ? (
            <Image src={c.image_url} alt={c.name} width={20} height={20} className="object-contain rounded-none" />
        ) : c.icon ? (
            <span className="text-sm">{c.icon}</span>
        ) : (
            <Book className="w-4 h-4 text-slate-400" />
        )
    }));

    const shopOptions = shops.map(s => ({
        value: s.id,
        label: s.name,
        icon: isValidUrl(s.image_url) ? (
            <Image src={s.image_url} alt={s.name} width={24} height={24} className="object-contain rounded-none" />
        ) : <Store className="w-4 h-4 text-slate-400" />
    }));

    // Auto-select shop based on recently used for selected category
    useEffect(() => {
        if (!categoryId) return;

        // Don't auto-set if shop is already selected (prevent overwriting user selection if they just picked one)
        // BUT if it's the very first time category is selected (form is clean), we should auto-set
        const currentShopId = form.getValues('shop_id');

        // We use a small flag or check if it's "clean"
        // Actually, usually users want smart suggestion if they just changed category
        const fetchRecent = async () => {
            const recentShopId = await getRecentShopByCategoryId(categoryId);
            if (recentShopId && !currentShopId) {
                form.setValue('shop_id', recentShopId);
            }
        };

        fetchRecent();
    }, [categoryId, form]);

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

    // Shop is only truly irrelevant for Internal Transfers, Credit Card Payments, Income and Repayment
    const isShopHidden = ['transfer', 'credit_pay', 'income', 'repayment'].includes(transactionType);

    // Auto-clear shop if hidden
    useEffect(() => {
        if (isShopHidden) {
            const currentShop = form.getValues('shop_id');
            if (currentShop) form.setValue('shop_id', null);
        }
    }, [isShopHidden, form]);

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
