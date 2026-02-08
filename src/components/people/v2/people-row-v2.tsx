import React from 'react';
import Link from 'next/link';
import { Person } from "@/types/moneyflow.types";
import { PeopleColumnConfig } from "@/hooks/usePeopleColumnPreferences";
import { ExpandIcon } from "@/components/transaction/ui/ExpandIcon";
import { PeopleRowDetailsV2 } from "./people-row-details-v2";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, User, CheckCircle2, HandCoins, Banknote, ExternalLink, RotateCw, FileSpreadsheet, Calendar, RefreshCcw, Landmark, Info } from "lucide-react";
import { cn, formatMoneyVND, formatVNLongAmount } from "@/lib/utils";
import { SubscriptionBadges } from "./subscription-badges";
import { ManageSheetButton } from "@/components/people/manage-sheet-button";
import { Account } from "@/types/moneyflow.types";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface PeopleRowProps {
    person: Person;
    visibleColumns: PeopleColumnConfig[];
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onEdit: (person: Person) => void;
    onLend: (person: Person) => void;
    onRepay: (person: Person) => void;
    onSync: (personId: string) => Promise<void>;
    accounts?: Account[];
}

const VNLongAmount = ({ amount, className }: { amount: number, className?: string }) => {
    const text = formatVNLongAmount(amount);
    const parts = text.split(/(\d+)/g);
    return (
        <span className={cn("inline-flex items-center gap-0.5", className)}>
            {parts.map((part, i) => (
                /^\d+$/.test(part)
                    ? <strong key={i} className="font-black text-rose-600/90">{part}</strong>
                    : <span key={i} className="text-slate-400 font-medium">{part}</span>
            ))}
        </span>
    );
};

export function PeopleRowV2({
    person,
    visibleColumns,
    isExpanded,
    onToggleExpand,
    onEdit,
    onLend,
    onRepay,
    onSync,
    accounts = [],
}: PeopleRowProps) {
    const handleRowClick = (e: React.MouseEvent) => {
        // Only expand on row click if not clicking action buttons
        const target = e.target as HTMLElement;
        if (!target.closest('.action-cell')) {
            onToggleExpand(person.id);
        }
    };

    const handleExpandToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleExpand(person.id);
    };

    return (
        <>
            <tr
                className={cn(
                    "group transition-colors hover:bg-muted/50 cursor-pointer border-b",
                    isExpanded && "bg-muted/50"
                )}
                onClick={handleRowClick}
            >
                {/* Expand Column (always first) */}
                <td className="sticky left-0 z-20 bg-inherit w-10 px-2 py-3 text-center border-r border-slate-200">
                    <ExpandIcon
                        isExpanded={isExpanded}
                        onClick={handleExpandToggle}
                    />
                </td>

                {/* Dynamic Columns */}
                {visibleColumns.map((col, idx) => (
                    <td
                        key={`${person.id}-${col.key}`}
                        className={cn(
                            "px-4 py-3 align-middle text-sm font-normal text-foreground",
                            idx < visibleColumns.length - 1 ? 'border-r border-slate-200' : '',
                            col.key === 'current_debt' && "bg-amber-50/40",
                            col.key === 'balance' && "bg-blue-50/30",
                            col.key === 'name' && "sticky left-10 z-10 bg-inherit" // Part of freeze name logic if needed, but let's keep it simple
                        )}
                    >
                        {renderCell(person, col.key, onEdit, onLend, onRepay, onSync, accounts)}
                    </td>
                ))}
            </tr>

            {/* Expanded Details Row */}
            {isExpanded && (
                <tr className="bg-muted/30">
                    <td colSpan={visibleColumns.length + 1} className="p-0 border-b">
                        <PeopleRowDetailsV2
                            person={person}
                            isExpanded={isExpanded}
                        />
                    </td>
                </tr>
            )}
        </>
    );
}

function renderCell(person: Person, key: string, onEdit: (p: Person) => void, onLend: (p: Person) => void, onRepay: (p: Person) => void, onSync?: (pid: string) => void, accounts?: Account[]) {
    switch (key) {
        case 'name':
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-none border border-slate-200 flex-shrink-0">
                        <AvatarImage src={person.image_url || undefined} alt={person.name} className="object-cover" />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary rounded-none">
                            {person.name?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 overflow-hidden w-full pr-1">
                            <Link
                                href={`/people/${person.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-sm leading-none hover:underline hover:text-blue-600 transition-colors truncate flex-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {person.name}
                            </Link>

                            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                                {person.is_group && <span className="text-[10px] text-muted-foreground bg-slate-100 px-1 rounded">Group</span>}
                                <SubscriptionBadges
                                    subscriptions={person.subscription_details || []}
                                    maxDisplay={2}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'current_tag':
            return (
                <div className="flex items-center gap-2">
                    {/* ManageSheetButton with Split Mode */}
                    {person.sheet_link ? (
                        <div className="flex items-center gap-1.5 h-full">
                            {(() => {
                                const now = new Date();
                                const currentTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                const cycleSheet = person.cycle_sheets?.find(s => s.cycle_tag === currentTag);
                                return (
                                    <ManageSheetButton
                                        personId={person.id}
                                        cycleTag={currentTag}
                                        initialSheetUrl={cycleSheet?.sheet_url}
                                        scriptLink={person.sheet_link}
                                        googleSheetUrl={person.google_sheet_url}
                                        sheetFullImg={person.sheet_full_img}
                                        showBankAccount={person.sheet_show_bank_account ?? undefined}
                                        sheetLinkedBankId={person.sheet_linked_bank_id ?? undefined}
                                        showQrImage={person.sheet_show_qr_image ?? undefined}
                                        accounts={accounts}
                                        buttonClassName="h-8 text-xs px-3"
                                        size="sm"
                                        showCycleAction={true}
                                        splitMode={true}
                                    />
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="w-[170px] min-w-[170px]">
                            <Badge
                                variant="outline"
                                className="h-8 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 bg-white border-2 border-slate-200 rounded-md tracking-tight shadow-none"
                            >
                                <Calendar className="h-3 w-3 opacity-70" />
                                {person.current_cycle_label || 'NO TAG'}
                            </Badge>
                        </div>
                    )}
                </div>
            );
        case 'current_debt':
            // Show current cycle debt amount only (label is in debt_tag column)
            return (
                <Badge variant="outline" className="tabular-nums tracking-tight font-medium bg-slate-50 text-slate-500 border-slate-200 px-2 py-0.5">
                    {formatMoneyVND(person.current_cycle_debt || 0)}
                </Badge>
            );
        case 'base_lend':
            return (
                <Badge variant="outline" className="tabular-nums tracking-tight font-medium bg-slate-50 text-slate-500 border-slate-200 px-2 py-0.5">
                    {formatMoneyVND(person.total_base_debt || 0)}
                </Badge>
            );
        case 'cashback': // Settled
            return (
                <Badge variant="outline" className="tabular-nums tracking-tight font-bold bg-emerald-50 text-emerald-600 border-emerald-100 px-2 py-0.5">
                    {formatMoneyVND(person.total_cashback || 0)}
                </Badge>
            );
        case 'net_lend': // Outstanding
            return (
                <Badge variant="outline" className="tabular-nums tracking-tight font-bold bg-indigo-50 text-indigo-600 border-indigo-100 px-2 py-0.5">
                    {formatMoneyVND(person.total_net_debt || 0)}
                </Badge>
            );
        case 'balance': // Remains
            // Show TOTAL debt (current + outstanding)
            const totalDebt = (person.current_debt || 0) + (person.outstanding_debt || 0);
            return (
                <div className="flex flex-col items-start gap-1 justify-center py-1">
                    <Badge
                        variant="outline"
                        className={cn(
                            "tabular-nums tracking-tight font-medium border-0 px-2 py-0.5 text-[15px] leading-none",
                            totalDebt > 0
                                ? "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200"
                                : "bg-slate-50 text-slate-500 opacity-40 grayscale"
                        )}
                    >
                        {formatMoneyVND(totalDebt)}
                    </Badge>
                    {totalDebt > 0 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help transition-all hover:opacity-80">
                                        <VNLongAmount amount={totalDebt} className="text-[12px] truncate max-w-[160px]" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-slate-900 text-white border-none p-2 shadow-xl">
                                    <p className="text-xs font-bold flex items-center gap-1.5">
                                        <Info className="h-3.5 w-3.5 text-blue-400" />
                                        <VNLongAmount amount={totalDebt} className="text-white" />
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            );
        case 'action':
            return (
                <TooltipProvider>
                    <div className="action-cell flex items-center gap-1">
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLend(person);
                                    }}
                                >
                                    <HandCoins className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-rose-900 text-white border-rose-800">
                                <p>Lend Money</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRepay(person);
                                    }}
                                >
                                    <Banknote className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-blue-900 text-white border-blue-800">
                                <p>Repay Debt</p>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-slate-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(person);
                                    }}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Edit Details</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            );
        default:
            return '—';
    }
}

