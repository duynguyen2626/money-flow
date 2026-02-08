"use client";

import React from "react";
import { Search, Plus, Filter, CheckCircle2, TrendingUp, Archive, LayoutGrid, Calendar, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type FilterStatus = 'all' | 'outstanding' | 'settled' | 'archived' | 'groups';

interface PeopleTableHeaderV2Props {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeFilter: FilterStatus;
    onFilterChange: (filter: FilterStatus) => void;
    onAdd: () => void;
    stats: {
        outstandingCount: number;
        settledCount: number;
        archivedCount: number;
        groupsCount: number;
    };
    showArchived: boolean;
    onToggleArchived: (show: boolean) => void;
    selectedYear: number;
    onYearChange: (year: number) => void;
    availableYears: number[];
    onRefreshAll?: () => void;
    isSyncingAll?: boolean;
    canResetSort?: boolean;
    onResetSort?: () => void;
}

export function PeopleTableHeaderV2({
    searchQuery,
    onSearchChange,
    activeFilter,
    onFilterChange,
    onAdd,
    stats,
    showArchived,
    onToggleArchived,
    selectedYear,
    onYearChange,
    availableYears,
    onRefreshAll,
    isSyncingAll,
    canResetSort,
    onResetSort,
}: PeopleTableHeaderV2Props) {
    const years = availableYears.length > 0 ? availableYears : [new Date().getFullYear()];
    const filters: { id: FilterStatus; label: string; icon: React.ReactNode; count?: number; color: string }[] = [
        { id: 'all', label: 'All Members', icon: <Filter className="h-4 w-4" />, color: "text-slate-600" },
        { id: 'outstanding', label: 'Outstanding Debt', icon: <TrendingUp className="h-4 w-4" />, count: stats.outstandingCount, color: "text-rose-600" },
        { id: 'settled', label: 'Settled', icon: <CheckCircle2 className="h-4 w-4" />, count: stats.settledCount, color: "text-emerald-600" },
        { id: 'groups', label: 'Groups', icon: <LayoutGrid className="h-4 w-4" />, count: stats.groupsCount, color: "text-indigo-600" },
        { id: 'archived', label: 'Archived', icon: <Archive className="h-4 w-4" />, count: stats.archivedCount, color: "text-slate-500" },
    ];

    const activeItem = filters.find(f => f.id === activeFilter) || filters[0];

    return (
        <div className="flex items-center gap-3 p-4 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
            {/* Filter Dropdown */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 gap-2 border-slate-200 bg-slate-50 hover:bg-white text-slate-700 font-medium min-w-[140px] justify-between">
                        <div className="flex items-center gap-2">
                            <span className={activeItem.color}>{activeItem.icon}</span>
                            <span>{activeItem.label}</span>
                        </div>
                        {/* Indicator if filtering */}
                        {activeFilter !== 'all' && (
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-1" align="start">
                    <div className="flex flex-col gap-0.5">
                        {filters.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => onFilterChange(filter.id)}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors w-full",
                                    activeFilter === filter.id
                                        ? "bg-slate-100 font-medium text-slate-900"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={cn(activeFilter === filter.id ? filter.color : "text-slate-400 group-hover:text-slate-500")}>
                                        {filter.icon}
                                    </span>
                                    {filter.label}
                                </div>
                                {filter.count !== undefined && (
                                    <Badge variant="secondary" className="px-1.5 h-5 min-w-[20px] justify-center text-[10px] bg-slate-200 text-slate-600">
                                        {filter.count}
                                    </Badge>
                                )}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Search Bar */}
            <div className="flex-1 relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search people..."
                    className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            {/* Year Filter */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 gap-2 border-slate-200 bg-slate-50 hover:bg-white text-slate-700 font-medium min-w-[100px] justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <span>{selectedYear}</span>
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[120px] p-1" align="start">
                    <div className="flex flex-col gap-0.5">
                        {years.map((year) => (
                            <button
                                key={year}
                                onClick={() => onYearChange(year)}
                                className={cn(
                                    "px-3 py-2 text-sm rounded-md transition-colors w-full text-left",
                                    selectedYear === year
                                        ? "bg-slate-100 font-medium text-slate-900"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Add Button */}
            <Button
                className="h-10 px-4 bg-slate-900 hover:bg-black text-white rounded-lg gap-2 font-bold shadow-sm transition-all active:scale-95"
                onClick={onAdd}
            >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
            </Button>

            {/* Active/Archive Toggle */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 px-3 text-xs font-medium rounded-md transition-all",
                        !showArchived
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                    )}
                    onClick={() => onToggleArchived(false)}
                >
                    Active
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 px-3 text-xs font-medium rounded-md transition-all",
                        showArchived
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                    )}
                    onClick={() => onToggleArchived(true)}
                >
                    Archive
                </Button>
            </div>

            {/* Refresh All Sheets Button */}
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    "h-10 px-3 gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold shadow-sm transition-all",
                    isSyncingAll && "opacity-50 cursor-not-allowed"
                )}
                onClick={onRefreshAll}
                disabled={isSyncingAll}
            >
                <RotateCw className={cn("h-4 w-4", isSyncingAll && "animate-spin")} />
                <span className="hidden lg:inline">Sync All Sheets</span>
            </Button>

            {/* Reset Sort Button */}
            {canResetSort && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 px-3 gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold"
                    onClick={onResetSort}
                >
                    <X className="h-4 w-4" />
                    <span>Reset Sort</span>
                </Button>
            )}
        </div>
    );
}
