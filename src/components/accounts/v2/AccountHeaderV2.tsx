"use client"

import React from 'react';
import { Search, Plus, Filter, LayoutGrid, List, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface AccountHeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeFilter: 'accounts_cards' | 'credit' | 'savings' | 'debt';
    onFilterChange: (filter: 'accounts_cards' | 'credit' | 'savings' | 'debt') => void;
    onAdd: () => void;
    viewMode: 'table' | 'grid';
    onViewModeChange: (mode: 'table' | 'grid') => void;
    activeCount: number;
    debtCount: number;
    closedCount: number;
}

export function AccountHeaderV2({
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    onAdd,
    viewMode,
    onViewModeChange,
    activeCount,
    debtCount,
    closedCount,
}: AccountHeaderProps) {
    const filters = [
        { id: 'accounts_cards' as const, label: 'Accounts & Cards', count: activeCount, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'credit' as const, label: 'Credit', count: 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { id: 'savings' as const, label: 'Savings', count: 0, color: 'text-amber-600', bg: 'bg-amber-50' },
        { id: 'debt' as const, label: 'Debt', count: debtCount, color: 'text-rose-600', bg: 'bg-rose-50' },
    ];
    // NOTE: The counts above are placeholders because the parent doesn't provide breakdown yet.
    // I will implement the UI first.

    return (
        <div className="flex flex-col sm:flex-row items-center gap-2 p-4 border-b bg-white sticky top-0 z-20 shadow-sm transition-all duration-200">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar">
                {filters.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => onFilterChange(f.id)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border",
                            activeFilter === f.id
                                ? `bg-slate-900 text-white border-slate-900 shadow-md`
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                    >
                        <span>{f.label}</span>
                        {/* <span className={cn(
                            "text-[9px] px-1.5 py-0 rounded-full font-black",
                            activeFilter === f.id ? "bg-white/20 text-white" : f.bg + " " + f.color
                        )}>
                            {f.count}
                        </span> */}
                    </button>
                ))}
            </div>

            {/* Search Bar - Flex to fill remaining space */}
            <div className="relative flex-1 max-w-lg mr-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search accounts..."
                    className="pl-9 pr-8 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg font-medium shadow-sm hover:border-slate-300"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <span className="sr-only">Clear</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8 rounded-md transition-all",
                            viewMode === 'table' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                        )}
                        onClick={() => onViewModeChange('table')}
                        title="Table View"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8 rounded-md transition-all",
                            viewMode === 'grid' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                        )}
                        onClick={() => onViewModeChange('grid')}
                        title="Grid View"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>

                <Button
                    className="h-10 px-4 bg-slate-900 hover:bg-black text-white rounded-lg gap-2 font-black shadow-sm transition-all active:scale-95"
                    onClick={onAdd}
                >
                    <Plus className="h-4 w-4" />
                    <span className="uppercase tracking-wider text-xs">Add Account</span>
                </Button>
            </div>
        </div>
    );
}
