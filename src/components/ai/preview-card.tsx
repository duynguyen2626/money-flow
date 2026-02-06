"use client";

import { useState, useEffect } from "react";
import { Check, X, Edit2, Calendar, Wallet, Tag, ShoppingBag, ArrowUpRight, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ParsedTransaction } from "@/types/ai.types";
import type { Account, Category, Person, Shop } from "@/types/moneyflow.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EntityPicker } from "./entity-picker";

interface PreviewCardProps {
    parsedData: ParsedTransaction;
    accounts: Account[];
    categories: Category[];
    people: Person[];
    shops: Shop[];
    onConfirm: (data: ParsedTransaction) => void;
    onCancel: () => void;
    onOpenSlide?: (data: ParsedTransaction) => void;
}

export function PreviewCard({
    parsedData,
    accounts,
    categories,
    people,
    shops,
    onConfirm,
    onCancel,
    onOpenSlide
}: PreviewCardProps) {
    const [editedData, setEditedData] = useState(parsedData);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [amountValue, setAmountValue] = useState(parsedData.amount?.toString() || "");

    // Sync internal state with new parsedData from AI
    useEffect(() => {
        const matchedAccount = accounts.find(a => a.id === parsedData.source_account_id) ||
            accounts.find(a => a.name.toLowerCase().includes(parsedData.source_account_name?.toLowerCase() || ""));

        const matchedCategory = categories.find(c => c.id === parsedData.category_id) ||
            categories.find(c => c.name.toLowerCase().includes(parsedData.category_name?.toLowerCase() || ""));

        const matchedShop = shops.find(s => s.id === parsedData.shop_id) ||
            shops.find(s => s.name.toLowerCase().includes(parsedData.shop_name?.toLowerCase() || ""));

        setEditedData({
            ...parsedData,
            source_account_id: matchedAccount?.id || parsedData.source_account_id,
            source_account_name: matchedAccount?.name || parsedData.source_account_name,
            category_id: matchedCategory?.id || parsedData.category_id,
            category_name: matchedCategory?.name || parsedData.category_name,
            shop_id: matchedShop?.id || parsedData.shop_id,
            shop_name: matchedShop?.name || parsedData.shop_name,
        });

        setAmountValue(parsedData.amount?.toString() || "");
    }, [parsedData, accounts, categories, shops]);

    // Detection for Advanced Flows (Debt, Repayment, or Cashback detected)
    const isAdvancedFlow = ["debt", "lend", "loan", "repayment"].includes(editedData.intent?.toLowerCase() || "") ||
        (editedData.cashback_share_percent || 0) > 0 ||
        (editedData.cashback_share_fixed || 0) > 0;

    // Format amount for display
    const formatAmount = (val: string | number) => {
        const numStr = val.toString().replace(/\D/g, "");
        if (!numStr) return "0";
        return new Intl.NumberFormat("vi-VN").format(parseInt(numStr));
    };

    const handleAmountChange = (val: string) => {
        const rawValue = val.replace(/\D/g, "");
        setAmountValue(val);
        setEditedData({ ...editedData, amount: rawValue ? parseInt(rawValue) : 0 });
    };

    const matchedAccount = accounts.find(a => a.id === editedData.source_account_id);
    const matchedCategory = categories.find(c => c.id === editedData.category_id);
    const matchedShop = shops.find(s => s.id === editedData.shop_id);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4 rounded-3xl border border-blue-100 bg-white p-4 shadow-2xl shadow-blue-500/10 overflow-visible relative">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    <h3 className="text-xs font-extrabold text-slate-800 tracking-tight">Xác nhận giao dịch</h3>
                </div>
                <div className={cn(
                    "rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest",
                    editedData.intent === "income" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                        ["expense", "debt", "lend", "loan"].includes(editedData.intent?.toLowerCase() || "") ? "bg-rose-100 text-rose-700 border border-rose-200" :
                            "bg-blue-100 text-blue-700 border border-blue-200"
                )}>
                    {editedData.intent}
                </div>
            </div>

            {/* Suggestion for Advanced Flow */}
            {isAdvancedFlow && (
                <div className="animate-in zoom-in-95 duration-300 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-3 shadow-sm ring-1 ring-orange-200/50">
                    <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 shadow-inner">
                            <ExternalLink className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[12px] font-bold text-orange-900">Tính năng nâng cao!</p>
                            <p className="text-[10.5px] text-orange-800/80 leading-snug mt-0.5">
                                Giao dịch <b>{editedData.intent}</b> cần thiết lập kỳ hạn hoặc cashback trong Slide.
                            </p>
                            <Button
                                variant="link"
                                className="h-auto p-0 text-[10.5px] font-bold text-blue-600 underline decoration-blue-300 underline-offset-4 mt-2 hover:text-blue-700 transition-colors"
                                onClick={() => onOpenSlide?.(editedData)}
                            >
                                Mở Slide chi tiết ngay →
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid Fields */}
            <div className="grid grid-cols-2 gap-2 overflow-visible">
                {/* Amount Field */}
                <div className="col-span-2 group relative flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-2.5 transition-all hover:border-blue-200 hover:bg-white hover:shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden w-full">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-50 transition-colors">
                            <ArrowUpRight className="h-4 w-4" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-[10px] font-medium text-slate-400 capitalize">số tiền *</p>
                            {editingField === 'amount' ? (
                                <Input
                                    autoFocus
                                    value={formatAmount(amountValue)}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    onBlur={() => setEditingField(null)}
                                    onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                                    className="h-7 w-full border-none p-0 text-sm font-bold focus-visible:ring-0"
                                />
                            ) : (
                                <p
                                    className="truncate text-sm font-bold text-slate-900 cursor-pointer"
                                    onClick={() => setEditingField('amount')}
                                >
                                    {formatAmount(editedData.amount || 0)}đ
                                </p>
                            )}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity" onClick={() => setEditingField('amount')}>
                        <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                </div>

                {/* Entity Pickers */}
                <div className="group relative flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-1.5 hover:border-blue-200 hover:bg-white transition-all overflow-visible pr-8">
                    <EntityPicker
                        items={accounts}
                        value={editedData.source_account_id}
                        onSelect={(id, name) => setEditedData({ ...editedData, source_account_id: id, source_account_name: name })}
                        placeholder="tài khoản"
                        icon={<Wallet className="h-4 w-4" />}
                    />
                    <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none group-hover:text-blue-400 opacity-50 group-hover:opacity-100 transition-all" />
                </div>

                <div className="group relative flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-1.5 hover:border-blue-200 hover:bg-white transition-all overflow-visible pr-8">
                    <EntityPicker
                        items={categories}
                        value={editedData.category_id}
                        onSelect={(id, name) => setEditedData({ ...editedData, category_id: id, category_name: name })}
                        placeholder="hạng mục"
                        icon={<Tag className="h-4 w-4" />}
                    />
                    <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none group-hover:text-blue-400 opacity-50 group-hover:opacity-100 transition-all" />
                </div>

                <div className="group relative flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-1.5 hover:border-blue-200 hover:bg-white transition-all overflow-visible pr-8">
                    <EntityPicker
                        items={shops}
                        value={editedData.shop_id}
                        onSelect={(id, name) => setEditedData({ ...editedData, shop_id: id, shop_name: name })}
                        placeholder="cửa hàng"
                        icon={<ShoppingBag className="h-4 w-4" />}
                    />
                    <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none group-hover:text-blue-400 opacity-50 group-hover:opacity-100 transition-all" />
                </div>

                {/* Date Field */}
                <div className="rounded-xl border border-slate-100 bg-white/50 p-2.5 hover:border-blue-200 hover:bg-white transition-all overflow-hidden">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                            <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-medium text-slate-400 capitalize">ngày</p>
                            <p className="truncate text-sm font-bold text-slate-900">
                                {editedData.occurred_at ? new Date(editedData.occurred_at).toLocaleDateString("vi-VN") : "Hôm nay"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Note Field */}
                <div className="col-span-2 group relative flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 p-2.5 transition-all hover:border-blue-200 hover:bg-white hover:shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden w-full">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                            <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-[10px] font-medium text-slate-400 capitalize">ghi chú</p>
                            {editingField === 'note' ? (
                                <Input
                                    autoFocus
                                    value={editedData.note || ""}
                                    onChange={(e) => setEditedData({ ...editedData, note: e.target.value })}
                                    onBlur={() => setEditingField(null)}
                                    onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                                    className="h-7 w-full border-none p-0 text-sm font-bold focus-visible:ring-0"
                                />
                            ) : (
                                <p
                                    className={cn("truncate text-sm font-bold cursor-pointer", !editedData.note && "text-slate-300 font-normal italic")}
                                    onClick={() => setEditingField('note')}
                                >
                                    {editedData.note || "Không có ghi chú"}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity" onClick={() => setEditingField('note')}>
                        <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1 relative z-50">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1 h-11 rounded-2xl border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                    Hủy bỏ
                </Button>
                <Button
                    variant="outline"
                    onClick={() => onOpenSlide?.(editedData)}
                    className="flex-1 h-11 rounded-2xl border-blue-200 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
                >
                    <Edit2 className="h-3.5 w-3.5" />
                    Sửa thêm
                </Button>
                <Button
                    onClick={() => onConfirm(editedData)}
                    disabled={!editedData.amount || !editedData.source_account_id}
                    className="flex-[2] h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 border-none text-xs font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-white"
                >
                    Xác nhận tạo
                </Button>
            </div>
        </div>
    );
}
