"use client";

import React from "react";
import { Person } from "@/types/moneyflow.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Wallet, TrendingDown, Gift, LayoutGrid, ChevronLeft, MoreHorizontal, Settings, History, DollarSign, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ManageSheetButton } from "@/components/people/manage-sheet-button";
import { Account } from "@/types/moneyflow.types";

export type PersonTab = 'timeline' | 'history' | 'split-bill';

interface PersonDetailHeaderV2Props {
    person: Person;
    activeTab: PersonTab;
    onTabChange: (tab: PersonTab) => void;
    // Manage Sheet Props
    accounts?: Account[];
    showManageSheet?: boolean;
}

export function PersonDetailHeaderV2({
    person,
    activeTab,
    onTabChange,
    accounts = [],
    showManageSheet = false,
}: PersonDetailHeaderV2Props) {
    const totalDebt = (person.current_cycle_debt || 0) + (person.outstanding_debt || 0);

    return (
        <div className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Navigation & Actions */}
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <Link href="/people">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 rounded-full">
                                <AvatarImage src={person.image_url || undefined} alt={person.name} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {person.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>
                            <h1 className="font-bold text-slate-900 tracking-tight">{person.name}</h1>
                            {person.is_group && (
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 uppercase text-[10px] tracking-wider px-2 py-0 h-5">
                                    Group
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {showManageSheet && (
                            <ManageSheetButton
                                personId={person.id}
                                cycleTag={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
                                scriptLink={person.sheet_link}
                                googleSheetUrl={person.google_sheet_url}
                                sheetFullImg={person.sheet_full_img}
                                showBankAccount={person.sheet_show_bank_account ?? undefined}
                                sheetLinkedBankId={person.sheet_linked_bank_id ?? undefined}
                                showQrImage={person.sheet_show_qr_image ?? undefined}
                                accounts={accounts}
                                buttonClassName="h-9 bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                size="sm"
                                showCycleAction={false}
                            />
                        )}
                        <Button variant="outline" size="sm" className="h-9 px-3 gap-2 text-slate-600 border-slate-200 rounded-lg">
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
                    <StatCard
                        label="Outstanding Balance"
                        value={totalDebt}
                        icon={<Wallet className="h-4 w-4" />}
                        variant={totalDebt > 0 ? "danger" : totalDebt < 0 ? "success" : "neutral"}
                    />
                    <StatCard
                        label="Net Debt"
                        value={person.total_net_debt || 0}
                        icon={<TrendingDown className="h-4 w-4" />}
                        variant="neutral"
                    />
                    <StatCard
                        label="Active Subs"
                        value={person.subscription_count || 0}
                        icon={<LayoutGrid className="h-4 w-4" />}
                        variant="info"
                        isCurrency={false}
                    />
                    <StatCard
                        label="Lifetime Cashback"
                        value={person.total_cashback || 0}
                        icon={<Gift className="h-4 w-4" />}
                        variant="success"
                    />
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-8 mt-2 overflow-x-auto no-scrollbar">
                    <TabButton
                        active={activeTab === 'timeline'}
                        onClick={() => onTabChange('timeline')}
                        label="Timeline"
                        icon={<LayoutDashboard className="h-4 w-4" />}
                    />
                    <TabButton
                        active={activeTab === 'history'}
                        onClick={() => onTabChange('history')}
                        label="All History"
                        icon={<History className="h-4 w-4" />}
                    />
                    <TabButton
                        active={activeTab === 'split-bill'}
                        onClick={() => onTabChange('split-bill')}
                        label="Split Bill"
                        icon={<DollarSign className="h-4 w-4" />}
                    />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, variant, isCurrency = true }: { label: string; value: number; icon: React.ReactNode; variant: 'danger' | 'success' | 'info' | 'neutral'; isCurrency?: boolean }) {
    return (
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {icon}
                {label}
            </div>
            <div className={cn(
                "text-xl font-bold tracking-tight tabular-nums",
                variant === 'danger' && "text-rose-600",
                variant === 'success' && "text-emerald-600",
                variant === 'info' && "text-indigo-600",
                variant === 'neutral' && "text-slate-900"
            )}>
                {isCurrency ? formatMoneyVND(value) : value}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "h-12 flex items-center gap-2 relative text-sm font-semibold transition-colors whitespace-nowrap px-1",
                active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
        >
            {icon}
            {label}
            {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
            )}
        </button>
    );
}

function formatMoneyVND(amount: number) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}
