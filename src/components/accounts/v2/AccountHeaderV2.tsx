import { Search, Plus, Landmark, LayoutGrid, List, Filter, X, Users, Users2, CalendarClock, Target, Sparkles, Building2, ShieldCheck, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Category } from "@/types/moneyflow.types";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
    activeFilter: 'accounts_cards' | 'credit' | 'savings' | 'debt' | 'closed';
    onFilterChange: (filter: 'accounts_cards' | 'credit' | 'savings' | 'debt' | 'closed') => void;
    onAdd: () => void;
    viewMode: 'table' | 'grid';
    onViewModeChange: (mode: 'table' | 'grid') => void;
    activeCount: number;
    debtCount: number;
    closedCount: number;
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
    categories = [],
    selectedCategory,
    onCategoryChange,
    advancedFilters,
    onAdvancedFiltersChange,
    othersStats,
}: AccountHeaderProps) {
    const filters = [
        { id: 'accounts_cards' as const, label: 'Accounts & Cards' },
        { id: 'credit' as const, label: 'Credit' },
        { id: 'savings' as const, label: 'Savings' },
        { id: 'debt' as const, label: 'Debt' },
        { id: 'closed' as const, label: `Closed (${closedCount})` },
    ];

    const hasActiveAdvanced = Object.values(advancedFilters).some(v => v);

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between sticky top-0 z-20 shadow-sm transition-all duration-200">
            {/* Left Group: Title & Stats */}
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                    <Landmark className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-xl font-black text-slate-900 leading-none tracking-tight">Accounts & Cards</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Directory</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{activeCount} Active</span>
                    </div>
                </div>
            </div>

            {/* Center Group: Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                {filters.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => onFilterChange(f.id)}
                        className={cn(
                            "flex items-center gap-2 px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200",
                            activeFilter === f.id
                                ? `bg-white text-slate-900 shadow-[0_2px_4px_rgba(0,0,0,0.05)] border border-slate-200 border-b-slate-300 ring-1 ring-slate-100`
                                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                        )}
                    >
                        <span>{f.label}</span>
                    </button>
                ))}
            </div>

            {/* Right Group: Search and Action */}
            <div className="flex flex-col gap-2">
                {othersStats && (othersStats.limit > 0 || othersStats.debt > 0) && (
                    <div className="flex items-center justify-end gap-3 text-[9px] font-black uppercase tracking-widest text-slate-400 animate-in fade-in slide-in-from-right-2">
                        <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-amber-500" />
                            Relatives Coverage:
                        </span>
                        <div className="flex items-center gap-3 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">Limit:</span>
                                <span className="text-slate-700 font-bold">{formatMoneyVND(othersStats.limit)}</span>
                            </div>
                            <span className="h-2 w-px bg-slate-200" />
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">Debt:</span>
                                <span className="text-rose-600 font-bold">{formatMoneyVND(othersStats.debt)}</span>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <div className="relative w-48 lg:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                            placeholder="Search accounts..."
                            className="pl-9 pr-8 h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-all rounded-lg font-medium shadow-sm hover:border-slate-300 text-xs"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden lg:block" />

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-9 gap-2 px-3 text-[10px] font-black uppercase tracking-wider transition-all",
                                    hasActiveAdvanced ? "bg-blue-50 text-blue-600 border border-blue-100" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                <Filter className={cn("h-3.5 w-3.5", hasActiveAdvanced && "fill-blue-600")} />
                                Advanced
                                {hasActiveAdvanced && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[8px]">
                                        {Object.values(advancedFilters).filter(Boolean).length}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 shadow-2xl border-slate-200 rounded-2xl animate-in fade-in zoom-in-95" align="end">
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
                                            Reset All
                                        </button>
                                    )}
                                </div>

                                <div className="grid gap-1.5">
                                    {[
                                        { id: 'family', label: 'Family Accounts', icon: Users2, desc: 'Parent/Child relations', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                                        { id: 'dueSoon', label: 'Due Soon', icon: CalendarClock, desc: 'Payment due < 5 days', color: 'text-amber-500', bg: 'bg-amber-50' },
                                        { id: 'needsSpendMore', label: 'Incomplete Target', icon: Target, desc: 'Under min spend target', color: 'text-blue-500', bg: 'bg-blue-50' },
                                        { id: 'multiRuleCb', label: 'Advanced Cashback', icon: Sparkles, desc: '3+ special sub-rules', color: 'text-purple-500', bg: 'bg-purple-50' },
                                        { id: 'holderOthers', label: "Others' Cards", icon: Building2, desc: 'Relatives/Other owners', color: 'text-rose-500', bg: 'bg-rose-50' },
                                    ].map((item: any) => (
                                        <div
                                            key={item.id}
                                            onClick={() => onAdvancedFiltersChange({ ...advancedFilters, [item.id as keyof AdvancedFilters]: !advancedFilters[item.id as keyof AdvancedFilters] })}
                                            className={cn(
                                                "group flex items-center gap-3 p-2 rounded-xl transition-all border cursor-pointer",
                                                advancedFilters[item.id as keyof AdvancedFilters]
                                                    ? "bg-white border-slate-200 shadow-sm ring-1 ring-slate-100"
                                                    : "bg-transparent border-transparent hover:bg-slate-50"
                                            )}
                                        >
                                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-all", item.bg, item.color)}>
                                                <item.icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                <p className={cn("text-[11px] font-black leading-tight", advancedFilters[item.id as keyof AdvancedFilters] ? "text-slate-900" : "text-slate-600")}>
                                                    {item.label}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">{item.desc}</p>
                                            </div>
                                            <Checkbox
                                                checked={advancedFilters[item.id as keyof AdvancedFilters]}
                                                className="rounded-full h-4 w-4 border-slate-300"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden lg:block" />

                    <div className="flex items-center gap-1 bg-slate-100/50 p-0.5 rounded-lg border border-slate-200">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-md transition-all",
                                viewMode === 'table' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500"
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
                                viewMode === 'grid' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500"
                            )}
                            onClick={() => onViewModeChange('grid')}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <Button
                        className="h-9 px-4 bg-slate-900 hover:bg-black text-white rounded-lg gap-2 font-black shadow-sm transition-all active:scale-95 text-xs uppercase tracking-wider"
                        onClick={onAdd}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                    </Button>
                </div>
            </div>
        </div >
    );
}

function formatMoneyVND(amount: number) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}
