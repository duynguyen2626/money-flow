"use client"

import React from 'react';
import { Account } from "@/types/moneyflow.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, Edit, Trash2, HandCoins, Banknote, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface AccountGridViewProps {
    accounts: Account[];
    onEdit: (account: Account) => void;
    onDelete: (id: string) => void;
}

export function AccountGridView({ accounts, onEdit, onDelete }: AccountGridViewProps) {
    const formatMoney = (amount: number) => {
        if (amount === 0) return '-';
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {accounts.map((account) => (
                <div
                    key={account.id}
                    className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-300 relative overflow-hidden"
                >
                    {/* Background accent */}
                    <div className={cn(
                        "absolute top-0 right-0 w-16 h-16 opacity-5 -mr-4 -mt-4 rounded-full",
                        account.type === 'credit_card' ? "bg-rose-500" : "bg-blue-500"
                    )} />

                    {/* Header: Avatar + Title + Status */}
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-lg border border-slate-100 shadow-sm">
                                <AvatarImage src={account.image_url || undefined} />
                                <AvatarFallback className="bg-slate-50 text-slate-500">
                                    <Wallet className="h-6 w-6" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <Link
                                    href={`/accounts/v2/${account.id}`}
                                    className="block font-black text-slate-900 text-sm hover:text-blue-600 transition-colors truncate max-w-[120px]"
                                >
                                    {account.name}
                                </Link>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{account.type}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Badge variant={account.is_active ? "outline" : "secondary"} className={cn(
                                "text-[9px] font-black h-4 px-1.5 uppercase tracking-tighter",
                                account.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500"
                            )}>
                                {account.is_active ? "Active" : "Closed"}
                            </Badge>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-40 p-1">
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => onEdit(account)}
                                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
                                        >
                                            <Edit className="h-3.5 w-3.5" />
                                            <span>Edit Account</span>
                                        </button>
                                        <button
                                            onClick={() => onDelete(account.id)}
                                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                            <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Code</p>
                            <p className="text-xs font-mono font-bold text-slate-600">{account.account_number?.slice(-4) || '—'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                            <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Members</p>
                            <p className="text-xs font-bold text-slate-600">0</p>
                        </div>

                        {account.type === 'credit_card' && (
                            <div className="col-span-2 bg-rose-50/50 rounded-lg p-2 border border-rose-100/50">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[9px] text-rose-400 uppercase font-black">Due + Spent</p>
                                    <span className="text-[9px] font-black text-rose-600">20th</span>
                                </div>
                                <p className="text-xs font-black text-rose-700">{formatMoney(account.stats?.spent_this_cycle || 0)}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer: Balance */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Balance</p>
                            <p className="text-lg font-black text-slate-900 tabular-nums leading-none mt-1">
                                {formatMoney(account.current_balance)}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50" title="Lend">
                                <HandCoins className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" title="Repay">
                                <Banknote className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
