import { Search, Plus, Landmark, LayoutGrid, List, Filter, X, Users, Users2, CalendarClock, Target, Sparkles, Building2, ShieldCheck, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Category } from "@/types/moneyflow.types";
import { VietnameseCurrency } from "@/components/ui/vietnamese-currency";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    HoverCard,
    HoverCardTrigger,
    HoverCardContent,
} from "@/components/ui/hover-card";
import { Checkbox } from "@/components/ui/checkbox";

export interface AdvancedFilters {
    family: boolean;
    dueSoon: boolean;
    needsSpendMore: boolean;
    multiRuleCb: boolean;
    holderOthers: boolean;
}

interface AccountHeaderProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeFilter: 'accounts_cards' | 'credit' | 'savings' | 'debt' | 'closed' | 'system';
    onFilterChange: (filter: 'accounts_cards' | 'credit' | 'savings' | 'debt' | 'closed' | 'system') => void;
    onAdd: () => void;
    viewMode: 'table' | 'grid';
    onViewModeChange: (mode: 'table' | 'grid') => void;
    activeCount: number;
    debtCount: number;
    closedCount: number;
    systemCount: number;
    categories?: Category[];
    selectedCategory?: string | null;
    onCategoryChange?: (categoryId: string | undefined) => void;
    advancedFilters: AdvancedFilters;
    onAdvancedFiltersChange: (filters: AdvancedFilters) => void;
    othersStats?: {
        limit: number;
        debt: number;
    };
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
    systemCount,
    categories = [],
    selectedCategory,
    onCategoryChange,
    advancedFilters,
    onAdvancedFiltersChange,
    othersStats,
}: AccountHeaderProps) {
    const filters = [
        { id: 'accounts_cards' as const, label: 'Standard' },
        { id: 'credit' as const, label: 'Credit' },
        { id: 'savings' as const, label: 'Savings' },
        { id: 'debt' as const, label: 'Debt' },
        { id: 'system' as const, label: `System` },
        { id: 'closed' as const, label: `Closed` },
    ];

    const hasActiveAdvanced = Object.values(advancedFilters).some(v => v);

    return (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 transition-all duration-200">
            <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between gap-6">
                {/* 1. Brand & High-Level Stats - More substantial cluster */}
                <div className="flex items-center gap-4 shrink-0">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-lg shadow-indigo-100 ring-2 ring-white">
                        <Landmark className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-[13px] font-black text-slate-900 leading-none tracking-tight uppercase">Accounts & Cards</h1>
                            <div className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{activeCount} ACTIVE</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Unified Financial Directory</p>
                    </div>
                </div>

                {/* 2. Primary Navigation - Sleek Segmented Control */}
                <div className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                    {filters.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => onFilterChange(f.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 h-7 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap",
                                activeFilter === f.id
                                    ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200 border border-slate-100"
                                    : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
                            )}
                        >
                            <span>{f.label}</span>
                        </button>
                    ))}
                </div>

                {/* 3. Global Actions - Refined Grid */}
                <div className="flex items-center gap-3 flex-1 justify-end">
                    {/* Search - Contextual width */}
                    <div className="relative w-36 lg:w-48 group transition-all focus-within:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                            placeholder="Find accounts..."
                            className="pl-8 pr-8 h-8 bg-slate-50/50 border-slate-200 focus:bg-white transition-all rounded-lg font-bold shadow-none text-[10px] hover:border-slate-300"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    {/* Relative Coverage - Integrated Design */}
                    {othersStats && (othersStats.limit > 0 || othersStats.debt > 0) && (
                        <HoverCard openDelay={100} closeDelay={100}>
                            <HoverCardTrigger asChild>
                                <div className="hidden xl:flex items-center gap-2 bg-indigo-50/[0.4] px-2 h-8 rounded-lg border border-indigo-100/30 cursor-help group hover:bg-white hover:border-indigo-200 transition-all">
                                    <Users2 className="h-3 w-3 text-indigo-400 shrink-0 group-hover:text-indigo-600" />
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Coverage</span>
                                        <span className="text-[10px] font-black text-slate-700 tabular-nums">
                                            {formatMoneyVND(othersStats.limit)} / <span className="text-rose-600">{formatMoneyVND(othersStats.debt)}</span>
                                        </span>
                                    </div>
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80 p-0 rounded-2xl shadow-2xl border-indigo-100 overflow-hidden" align="center">
                                <div className="p-3 bg-indigo-600 text-white">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <Users2 className="h-3 w-3" />
                                        Others' Credit Awareness
                                    </h4>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total External Limit</span>
                                        <span className="text-[11px] font-black text-slate-900">{formatMoneyVND(othersStats.limit)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Current External Debt</span>
                                        <span className="text-[11px] font-black text-rose-600">{formatMoneyVND(othersStats.debt)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100">
                                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                            This metric tracks the total credit exposure of accounts where you are not the primary holder (e.g., family, others). It represents your maximum potential liability vs current usage.
                                        </p>
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>
                    )}

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-8 gap-2 px-3 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg",
                                    hasActiveAdvanced ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 whitespace-nowrap"
                                )}
                            >
                                <Filter className={cn("h-3 w-3", hasActiveAdvanced && "fill-indigo-600")} />
                                <span>FILTER</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 shadow-2xl border-slate-200 rounded-2xl" align="end">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advanced Filters</h4>
                                    {hasActiveAdvanced && (
                                        <button
                                            onClick={() => onAdvancedFiltersChange({
                                                family: false,
                                                dueSoon: false,
                                                needsSpendMore: false,
                                                multiRuleCb: false,
                                                holderOthers: false
                                            })}
                                            className="text-[9px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <div className="grid gap-1.5">
                                    {[
                                        { id: 'family', label: 'Family Accounts', icon: Users2, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                                        { id: 'dueSoon', label: 'Due Soon', icon: CalendarClock, color: 'text-amber-500', bg: 'bg-amber-50' },
                                        { id: 'needsSpendMore', label: 'Incomplete Target', icon: Target, color: 'text-blue-500', bg: 'bg-blue-50' },
                                        { id: 'multiRuleCb', label: 'Advanced Cashback', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-50' },
                                        { id: 'holderOthers', label: "Others' Cards", icon: Building2, color: 'text-rose-500', bg: 'bg-rose-50' },
                                    ].map((item: any) => (
                                        <div
                                            key={item.id}
                                            onClick={() => onAdvancedFiltersChange({ ...advancedFilters, [item.id as keyof AdvancedFilters]: !advancedFilters[item.id as keyof AdvancedFilters] })}
                                            className={cn(
                                                "group flex items-center gap-2.5 p-1.5 rounded-lg transition-all border cursor-pointer",
                                                advancedFilters[item.id as keyof AdvancedFilters]
                                                    ? "bg-white border-slate-200 shadow-sm"
                                                    : "bg-transparent border-transparent hover:bg-slate-50"
                                            )}
                                        >
                                            <div className={cn("h-7 w-7 rounded flex items-center justify-center transition-all", item.bg, item.color)}>
                                                <item.icon className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className={cn("text-[10px] font-black leading-tight", advancedFilters[item.id as keyof AdvancedFilters] ? "text-slate-900" : "text-slate-600")}>
                                                    {item.label}
                                                </p>
                                            </div>
                                            <Checkbox
                                                checked={advancedFilters[item.id as keyof AdvancedFilters]}
                                                className="h-3.5 w-3.5 border-slate-300"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                    <div className="flex items-center gap-1 bg-slate-100/50 p-0.5 rounded-lg border border-slate-200">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-md transition-all",
                                viewMode === 'table' ? "bg-white text-indigo-700 shadow-sm border border-slate-200" : "text-slate-400"
                            )}
                            onClick={() => onViewModeChange('table')}
                        >
                            <List className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-md transition-all",
                                viewMode === 'grid' ? "bg-white text-indigo-700 shadow-sm border border-slate-200" : "text-slate-400"
                            )}
                            onClick={() => onViewModeChange('grid')}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <Button
                        className="h-8 px-4 bg-slate-900 hover:bg-black text-white rounded-lg gap-2 font-black shadow-lg shadow-slate-200 transition-all active:scale-95 text-[10px] tracking-wider uppercase"
                        onClick={onAdd}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        ADD
                    </Button>
                </div>
            </div>
        </div >
    );
}

function formatMoneyVND(amount: number) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}
