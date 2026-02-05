"use client";

import React from "react";
import { Person, Account } from "@/types/moneyflow.types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, HandCoins, Banknote, Edit, ChevronRight, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface PeopleGridProps {
    people: Person[];
    accounts?: Account[];
    onEdit: (person: Person) => void;
    onLend: (person: Person) => void;
    onRepay: (person: Person) => void;
}

export function PeopleGridV2({ people, onEdit, onLend, onRepay }: PeopleGridProps) {
    if (people.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <User className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No people found</h3>
                <p className="text-slate-500 max-w-xs text-center mt-1">
                    Try adjusting your search or filters to find what you're looking for.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {people.map((person) => (
                <PersonCard
                    key={person.id}
                    person={person}
                    onEdit={onEdit}
                    onLend={onLend}
                    onRepay={onRepay}
                />
            ))}
        </div>
    );
}

function PersonCard({ person, onEdit, onLend, onRepay }: { person: Person; onEdit: (p: Person) => void; onLend: (p: Person) => void; onRepay: (p: Person) => void }) {
    const totalDebt = (person.current_cycle_debt || 0) + (person.outstanding_debt || 0);

    return (
        <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden">
            {/* Top Section: Profile info */}
            <div className="p-5 flex flex-col items-center text-center border-b border-slate-50">
                <div className="relative mb-3">
                    <Avatar className="h-20 w-20 rounded-full ring-4 ring-slate-50 group-hover:ring-slate-100 transition-all">
                        <AvatarImage src={person.image_url || undefined} alt={person.name} />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                            {person.name?.[0]?.toUpperCase() || <User className="h-8 w-8" />}
                        </AvatarFallback>
                    </Avatar>
                    {person.is_group && (
                        <div className="absolute -bottom-1 -right-1 bg-indigo-100 text-indigo-700 p-1.5 rounded-full border-2 border-white shadow-sm" title="Group">
                            <LayoutGrid className="h-3 w-3" />
                        </div>
                    )}
                </div>

                <Link
                    href={`/people/${person.id}`}
                    className="font-bold text-slate-900 text-lg hover:text-blue-600 transition-colors leading-tight mb-1"
                >
                    {person.name}
                </Link>

                <div className="flex items-center gap-1.5 min-h-[20px]">
                    {person.google_sheet_url && (
                        <a
                            href={person.google_sheet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-green-100 hover:bg-green-100 transition-colors"
                        >
                            Sheet
                        </a>
                    )}
                </div>
            </div>

            {/* Middle Section: Debt Info */}
            <div className="flex-1 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Balance</span>
                    <Badge
                        variant="soft"
                        className={cn(
                            "tabular-nums text-sm font-bold px-2.5 py-1",
                            totalDebt > 0
                                ? "bg-rose-50 text-rose-600 border border-rose-100"
                                : "bg-slate-50 text-slate-400 opacity-60 border border-slate-100"
                        )}
                    >
                        {formatMoneyVND(totalDebt)}
                    </Badge>
                </div>

                {person.current_cycle_label && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                        <span className="text-xs text-slate-500">Cycle {person.current_cycle_label}</span>
                        <span className="text-xs font-medium text-slate-700">{formatMoneyVND(person.current_cycle_debt || 0)}</span>
                    </div>
                )}
            </div>

            {/* Bottom Section: Actions */}
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
                <TooltipProvider>
                    <div className="flex gap-2 w-full">
                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="flex-1 h-10 bg-white border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all font-semibold rounded-xl gap-2 shadow-sm"
                                    onClick={() => onLend(person)}
                                >
                                    <HandCoins className="h-4 w-4 shrink-0" />
                                    <span>Lend</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Lend money to {person.name}</TooltipContent>
                        </Tooltip>

                        <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="flex-1 h-10 bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all font-semibold rounded-xl gap-2 shadow-sm"
                                    onClick={() => onRepay(person)}
                                >
                                    <Banknote className="h-4 w-4 shrink-0" />
                                    <span>Repay</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Record repayment from {person.name}</TooltipContent>
                        </Tooltip>

                        <div className="flex gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl"
                                onClick={() => onEdit(person)}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Link href={`/people/${person.id}`}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </TooltipProvider>
            </div>
        </div>
    );
}

function formatMoneyVND(amount: number) {
    if (amount === 0) return 'Settled';
    return new Intl.NumberFormat('vi-VN').format(amount);
}
