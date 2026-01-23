'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEffect, useState, useMemo, useRef } from 'react'
import { fetchAccountCycleOptionsAction, fetchAccountCycleTransactions } from '@/actions/cashback.actions'
import { Loader2, Copy, Pencil, User, BarChart3, ListTree } from 'lucide-react'
import { CashbackTransaction } from '@/types/cashback.types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { parseCycleTag } from '@/lib/cashback'
import { cn } from '@/lib/utils'

interface AccountCycleTransactionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountId: string;
    accountName: string;
    cycleDisplay: string;
    onEditTransaction?: (id: string) => void;
    refreshKey?: number; // Trigger refresh when this changes
}

type AccountCycleOption = {
    tag: string;
    label: string;
    cycleId: string | null;
    statementDay: number | null;
    cycleType: string | null;
};

export function AccountCycleTransactionsModal({
    open,
    onOpenChange,
    accountId,
    accountName,
    cycleDisplay,
    onEditTransaction,
    refreshKey,
}: AccountCycleTransactionsModalProps) {
    const [transactions, setTransactions] = useState<CashbackTransaction[]>([])
    const [cycleOptions, setCycleOptions] = useState<AccountCycleOption[]>([])
    const [selectedCycleTag, setSelectedCycleTag] = useState<string | null>(null)

    const [loading, setLoading] = useState(false)
    const [loadingCycles, setLoadingCycles] = useState(false)
    const [editingTxnId, setEditingTxnId] = useState<string | null>(null)

    const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
    const [activeTab, setActiveTab] = useState<string>('all');
    const lastCycleKeyRef = useRef<string | null>(null);

    // Helper to get fiscal year from cycle (year of cycle start date)
    const getYear = (c: AccountCycleOption) => {
        const parsed = parseCycleTag(c.tag);
        if (!parsed) {
            const parts = c.tag.split('-');
            return parts[0] || 'Unknown';
        }
        
        // For statement cycles, need to determine actual start year
        // If statementDay is set and cycle is statement_cycle, the year might differ from tag year
        // Tag is usually end month (e.g., 2025-12 for Nov 20 - Dec 19)
        // For simplicity, if month is Dec (12) and statementDay > 15, likely started in previous month same year
        // If month is Jan (1) and statementDay > 15, likely started in Dec of previous year
        
        if (c.cycleType === 'statement_cycle' && c.statementDay && c.statementDay > 15) {
            // Cycle like 20th statement: Dec cycle actually spans Nov 20 - Dec 19
            // Tag 2025-12 means cycle ending in Dec 2025, started Nov 2025 -> year 2025
            // Tag 2026-01 means cycle ending in Jan 2026, started Dec 2025 -> year 2025
            if (parsed.month === 1) {
                return String(parsed.year - 1); // Jan cycle started in Dec of previous year
            }
        }
        
        return String(parsed.year);
    };

    // Derived: Available years
    const availableYears = useMemo(() => {
        const years = new Set(cycleOptions.map(getYear));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [cycleOptions]);

    // Derived: Cycles for selected year
    const filteredCycles = useMemo(() => {
        if (!selectedYear) return [];
        return cycleOptions
            .filter(c => getYear(c) === selectedYear)
            .sort((a, b) => b.tag.localeCompare(a.tag)); // Descending by tag/time
    }, [cycleOptions, selectedYear]);

    // Auto-select latest year and cycle when cycles are loaded
    useEffect(() => {
        if (cycleOptions.length === 0) return;

        const latestYear = selectedYear || availableYears[0];
        const cyclesInYear = cycleOptions
            .filter(c => getYear(c) === latestYear)
            .sort((a, b) => b.tag.localeCompare(a.tag));

        if (!selectedCycleTag && cyclesInYear.length > 0) {
            setSelectedCycleTag(cyclesInYear[0].tag);
        }
    }, [cycleOptions, availableYears, selectedYear, selectedCycleTag]);

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setSelectedYear(String(new Date().getFullYear()));
            setSelectedCycleTag(null);
        }
    }, [open]);

    // 1. Fetch Cycles on Open
    useEffect(() => {
        if (!open || !accountId) return;

        const loadCycles = async () => {
            setLoadingCycles(true);
            try {
                const res = await fetchAccountCycleOptionsAction(accountId);
                setCycleOptions(Array.isArray(res) ? res : []);
                if (res && res.length > 0 && !selectedCycleTag) {
                    const currentYear = String(new Date().getFullYear());
                    setSelectedYear(currentYear);

                    const inYear = res
                        .filter((c: AccountCycleOption) => getYear(c) === currentYear)
                        .sort((a: AccountCycleOption, b: AccountCycleOption) => b.tag.localeCompare(a.tag));

                    if (inYear.length > 0) {
                        setSelectedCycleTag(inYear[0].tag);
                    } else {
                        setSelectedCycleTag(res[0].tag);
                        setSelectedYear(getYear(res[0]));
                    }
                }
            } catch (err) {
                console.error("Failed to load cycles", err);
                setCycleOptions([]);
            } finally {
                setLoadingCycles(false);
            }
        };

        loadCycles();
    }, [open, accountId]);

    // 2. Fetch Transactions when Cycle Selected or Open
    useEffect(() => {
        if (!open) return;

        const selected = cycleOptions.find(c => c.tag === selectedCycleTag);

        // Wait for a selected cycle if options exist; otherwise allow fallback
        if (cycleOptions.length > 0 && !selected) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetchAccountCycleTransactions(
                    accountId,
                    selected?.cycleId || undefined,
                    selected?.tag,
                    selected?.statementDay,
                    selected?.cycleType
                );
                const cycleKey = selected?.cycleId || selected?.tag || 'fallback';
                const prevCycleKey = lastCycleKeyRef.current;

                setTransactions(prev => {
                    // Preserve last non-empty fallback result if the first cycle fetch returns empty
                    if (res.length === 0 && prev.length > 0 && prevCycleKey === 'fallback' && cycleKey !== 'fallback') {
                        return prev;
                    }
                    if (res.length === 0 && lastCycleKeyRef.current === cycleKey) {
                        return prev;
                    }
                    return res;
                });

                lastCycleKeyRef.current = cycleKey;
            } catch (error) {
                console.error('Error fetching cycle transactions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [open, accountId, refreshKey, selectedCycleTag, cycleOptions])

    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n))

    // Group transactions by strategy for "By Strategy" tab
    const groupedByStrategy = useMemo(() => {
        type StrategyGroup = {
            levelName: string;
            ruleName: string;
            rate: number;
            transactions: CashbackTransaction[];
            totalAmount: number;
            totalBankBack: number;
            totalPeopleBack: number;
            totalProfit: number;
            policySource: string;
        };

        const groups: StrategyGroup[] = [];

        transactions.forEach(t => {
            const policySource = t.policyMetadata?.policySource || 'default';
            const levelName = t.policyMetadata?.levelName || 'No Level';
            // Use category name from transaction, policyMetadata doesn't have categoryName
            const ruleName = t.categoryName || 'General';
            const rate = t.effectiveRate;

            // Find existing group
            let group = groups.find(g => 
                g.levelName === levelName && 
                g.ruleName === ruleName && 
                g.rate === rate &&
                g.policySource === policySource
            );

            if (!group) {
                group = {
                    levelName,
                    ruleName,
                    rate,
                    transactions: [],
                    totalAmount: 0,
                    totalBankBack: 0,
                    totalPeopleBack: 0,
                    totalProfit: 0,
                    policySource
                };
                groups.push(group);
            }

            group.transactions.push(t);
            group.totalAmount += Math.abs(t.amount);
            group.totalBankBack += (t.bankBack || t.earned);
            group.totalPeopleBack += (t.peopleBack || 0);
            group.totalProfit += (t.profit || t.earned);
        });

        // Sort groups by total bank back descending
        return groups.sort((a, b) => b.totalBankBack - a.totalBankBack);
    }, [transactions]);

    // Summary statistics
    const summary = useMemo(() => {
        const total = {
            amount: 0,
            bankBack: 0,
            peopleBack: 0,
            profit: 0,
            transactions: transactions.length
        };

        const byPolicySource: Record<string, { count: number; bankBack: number; amount: number }> = {};

        transactions.forEach(t => {
            total.amount += Math.abs(t.amount);
            total.bankBack += (t.bankBack || t.earned);
            total.peopleBack += (t.peopleBack || 0);
            total.profit += (t.profit || t.earned);

            const policySource = t.policyMetadata?.policySource || 'default';
            if (!byPolicySource[policySource]) {
                byPolicySource[policySource] = { count: 0, bankBack: 0, amount: 0 };
            }
            byPolicySource[policySource].count += 1;
            byPolicySource[policySource].bankBack += (t.bankBack || t.earned);
            byPolicySource[policySource].amount += Math.abs(t.amount);
        });

        return { total, byPolicySource };
    }, [transactions]);

    const formatCycleLabel = (tag: string, label: string, spent?: number) => {
        // For now, just use the provided label with spent amount
        let displayLabel = label;

        // Add spent amount if available
        if (spent && spent > 0) {
            const spentMillions = Math.floor(spent / 1000000);
            if (spentMillions > 0) {
                displayLabel += ` (${spentMillions}N)`;
            }
        }

        return displayLabel;
    };

    const handleEdit = (id: string) => {
        if (onEditTransaction) {
            setEditingTxnId(id);
            // Small timeout to simulate "start" of action, 
            // the parent likely handles the slide open.
            // We clear it after a bit or hope the slide open covers it?
            // User asked: "chờ rendering slide txn thì show loading".
            // Since we can't clear it reliably when slide is ready (unless we add a prop),
            // We'll just rely on the UI update or a timeout. 
            // Better to keep it spinning for a short while or until modal closes (if it closes).
            // But modal usually stays open. So a timeout is safest fallback.
            setTimeout(() => setEditingTxnId(null), 2000);
            onEditTransaction(id);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 overflow-hidden">
                <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex items-start justify-between">
                    <div>
                        <DialogHeader className="text-left space-y-1">
                            <DialogTitle className="text-xl font-black text-slate-900 leading-tight flex items-center gap-2">
                                Cashback Transactions
                            </DialogTitle>
                            <DialogDescription className="text-xs font-medium text-slate-500">
                                {accountName}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {/* Cycle Selector */}
                    <div className="flex items-center gap-2 mr-8">
                        {loadingCycles ? (
                            <div className="h-9 w-40 bg-slate-100 rounded animate-pulse" />
                        ) : (
                            <>
                                {/* Year Selector */}
                                <div className="w-[110px]">
                                    <CustomDropdown
                                        value={selectedYear || ''}
                                        onChange={(val) => {
                                            const nextYear = val || String(new Date().getFullYear());
                                            setSelectedYear(nextYear);
                                            const cyclesInYear = cycleOptions
                                                .filter(c => getYear(c) === nextYear)
                                                .sort((a, b) => b.tag.localeCompare(a.tag));
                                            if (cyclesInYear.length > 0) {
                                                setSelectedCycleTag(cyclesInYear[0].tag);
                                            } else if (cycleOptions.length > 0) {
                                                setSelectedCycleTag(cycleOptions[0].tag);
                                                setSelectedYear(getYear(cycleOptions[0]));
                                            } else {
                                                setSelectedCycleTag(null);
                                            }
                                        }}
                                        options={availableYears.map(year => ({ value: year, label: year }))}
                                        placeholder="Year"
                                        disabled={availableYears.length === 0}
                                        searchable={false}
                                        className="w-full"
                                    />
                                </div>

                                {/* Cycle Selector (Searchable) */}
                                <div className="w-[240px]">
                                    <CustomDropdown
                                        value={selectedCycleTag || ''}
                                        onChange={(val) => setSelectedCycleTag(val || null)}
                                        options={filteredCycles.map(c => ({
                                            value: c.tag,
                                            label: c.label,
                                        }))}
                                        placeholder="Select Cycle"
                                        searchable={true}
                                        className="w-full"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-6">
                    {loading ? (
                        <div className="h-full flex items-center justify-center flex-col gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                            <p className="text-xs font-medium text-slate-400">Loading transactions...</p>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                            <TabsList className="w-full justify-start bg-slate-100/50 border-b border-slate-200 rounded-none p-0 h-auto">
                                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 py-3 text-xs font-bold">
                                    <ListTree className="w-4 h-4 mr-2" />
                                    All Transactions
                                </TabsTrigger>
                                <TabsTrigger value="strategy" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 py-3 text-xs font-bold">
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    By Strategy
                                </TabsTrigger>
                                <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 py-3 text-xs font-bold">
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Summary
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="all" className="flex-1 overflow-hidden mt-0">
                                <div className="h-full border rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                                    <div className="overflow-auto flex-1">
                                        <Table>
                                            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                                <TableRow className="hover:bg-transparent border-slate-200">
                                                    <TableHead className="w-24 text-[10px] font-black uppercase tracking-wider text-slate-500">Date</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Description</TableHead>
                                                    <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-wider text-slate-500">People</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Category</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-wider text-slate-500">Amount</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-wider text-slate-500" title="Bank's rate & cashback">Bank Rate</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-wider text-slate-500" title="Cashback shared with people">People CB</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-wider text-slate-500" title="Your profit">Your Profit</TableHead>
                                                    <TableHead className="w-20 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                    <TableBody>
                                        {transactions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-12 text-slate-400 font-medium italic">
                                                    No contributing transactions found in this cycle.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            transactions.map((t) => (
                                                <TableRow key={t.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="whitespace-nowrap py-3 text-[11px] text-slate-500 align-top" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
                                                        {new Date(t.occurred_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                    </TableCell>
                                                    <TableCell className="py-3 align-top">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs font-bold text-slate-800 line-clamp-2 md:line-clamp-1" title={t.note || t.shopName || ''}>
                                                                {t.note || t.shopName || 'Transaction'}
                                                            </span>
                                                            {(t.note && t.shopName) && (
                                                                <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                                                                    {t.shopName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3 align-top">
                                                        {t.personName ? (
                                                            <div className="flex items-center gap-1.5 bg-indigo-50/50 px-1.5 py-0.5 rounded-full w-fit border border-indigo-100/50">
                                                                <User className="w-3 h-3 text-indigo-400" />
                                                                <span className="text-[10px] font-bold text-indigo-700">{t.personName}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 italic">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3 align-top">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm">{t.categoryIcon}</span>
                                                            <span className="text-[10px] font-bold text-slate-600 line-clamp-1">{t.categoryName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 text-xs font-bold text-slate-700 align-top" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
                                                        {fmt(Math.abs(t.amount))}
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 align-top">
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className="text-xs font-black text-emerald-700" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>{fmt(t.bankBack || t.earned)}</span>
                                                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 whitespace-nowrap">
                                                                {(t.effectiveRate * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 text-xs font-bold text-indigo-600 align-top" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }} title="Shared with people">
                                                        {t.peopleBack > 0 ? fmt(t.peopleBack) : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 font-black text-xs text-amber-700 align-top bg-amber-50/30" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }} title="Your profit">
                                                        {fmt(t.profit || t.earned)}
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 align-top">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-slate-400 hover:text-slate-600"
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(t.id);
                                                                                toast.success("Transaction ID copied");
                                                                            }}
                                                                        >
                                                                            <Copy className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Copy ID</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            {onEditTransaction && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 text-slate-400 hover:text-indigo-600 disabled:opacity-50"
                                                                                onClick={() => handleEdit(t.id)}
                                                                                disabled={!!editingTxnId}
                                                                            >
                                                                                {editingTxnId === t.id ? (
                                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                                ) : (
                                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                                )}
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Edit Transaction</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                        {transactions.length > 0 && (
                                            <TableRow className="bg-indigo-50/50 border-t-2 border-indigo-200">
                                                <TableCell colSpan={4} className="py-3 font-black text-xs text-slate-700 uppercase tracking-wider">
                                                    Totals
                                                </TableCell>
                                                <TableCell className="text-right py-3 text-sm font-black text-slate-800">
                                                    {fmt(transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0))}
                                                </TableCell>
                                                <TableCell className="text-right py-3">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-xs font-black text-emerald-700 tabular-nums">{fmt(transactions.reduce((sum, t) => sum + (t.bankBack || t.earned), 0))}</span>
                                                        <span className="text-[9px] font-black text-slate-500 opacity-60">—</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right py-3 text-sm font-black text-indigo-700" title="Total shared with people">
                                                    {fmt(transactions.reduce((sum, t) => sum + (t.peopleBack || 0), 0))}
                                                </TableCell>
                                                <TableCell className="text-right py-3 font-black text-sm text-amber-800 bg-amber-100/50" title="Total profit">
                                                    {fmt(transactions.reduce((sum, t) => sum + (t.profit || t.earned), 0))}
                                                </TableCell>
                                                <TableCell className="text-right py-3"></TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {transactions.length > 0 && (
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-6">
                                    <div className="flex flex-col items-end opacity-60">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Spend</span>
                                        <span className="text-md font-black text-slate-600">
                                            {fmt(transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0))}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bank Rate</span>
                                        <span className="text-lg font-black text-emerald-700">
                                            {fmt(transactions.reduce((sum, t) => sum + (t.bankBack || t.earned), 0))}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">People CB</span>
                                        <span className="text-lg font-black text-indigo-600">
                                            {fmt(transactions.reduce((sum, t) => sum + (t.peopleBack || 0), 0))}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Your Profit</span>
                                        <span className="text-xl font-black text-amber-700">
                                            {fmt(transactions.reduce((sum, t) => sum + (t.profit || t.earned), 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* By Strategy Tab */}
                    <TabsContent value="strategy" className="flex-1 overflow-hidden mt-0">
                        <div className="h-full border rounded-xl overflow-auto bg-white shadow-sm p-4 space-y-4">
                            {groupedByStrategy.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400 font-medium italic">
                                    No transactions to group
                                </div>
                            ) : (
                                groupedByStrategy.map((group, idx) => (
                                    <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                                        {/* Group Header */}
                                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 border-b border-slate-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider",
                                                        group.policySource === 'category_rule' ? "bg-emerald-100 text-emerald-700" :
                                                        group.policySource === 'level_default' ? "bg-amber-100 text-amber-700" :
                                                        "bg-slate-100 text-slate-600"
                                                    )}>
                                                        {group.policySource === 'category_rule' ? '🎯 Rule Match' :
                                                         group.policySource === 'level_default' ? '📊 Level Default' :
                                                         '⚙️ Program Default'}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-800">{group.levelName}</div>
                                                        <div className="text-xs text-slate-600">{group.ruleName}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500">Rate</div>
                                                        <div className="text-lg font-black text-emerald-700">{(group.rate * 100).toFixed(1)}%</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500">Bank Back</div>
                                                        <div className="text-lg font-black text-emerald-700">{fmt(group.totalBankBack)}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-500">Count</div>
                                                        <div className="text-sm font-bold text-slate-700">{group.transactions.length}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transactions in this group */}
                                        <div className="divide-y divide-slate-100">
                                            {group.transactions.map(t => (
                                                <div key={t.id} className="p-3 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <div className="text-[10px] text-slate-400 w-16">
                                                            {new Date(t.occurred_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-xs font-bold text-slate-800">{t.note || t.shopName || 'Transaction'}</div>
                                                            {t.personName && (
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <User className="w-3 h-3 text-indigo-400" />
                                                                    <span className="text-[9px] text-indigo-600">{t.personName}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-right">
                                                        <div className="text-xs font-bold text-slate-700">{fmt(Math.abs(t.amount))}</div>
                                                        <div className="text-xs font-black text-emerald-700 w-20">{fmt(t.bankBack || t.earned)}</div>
                                                        {t.peopleBack > 0 && (
                                                            <div className="text-xs font-bold text-indigo-600 w-20">{fmt(t.peopleBack)}</div>
                                                        )}
                                                        <div className="text-xs font-black text-amber-700 w-20">{fmt(t.profit || t.earned)}</div>
                                                        <div className="flex items-center gap-1 ml-2">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-slate-400 hover:text-slate-600"
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(t.id);
                                                                                toast.success("Transaction ID copied");
                                                                            }}
                                                                        >
                                                                            <Copy className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Copy ID</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            {onEditTransaction && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-slate-400 hover:text-indigo-600 disabled:opacity-50"
                                                                                onClick={() => handleEdit(t.id)}
                                                                                disabled={!!editingTxnId}
                                                                            >
                                                                                {editingTxnId === t.id ? (
                                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                                ) : (
                                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                                )}
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Edit</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* Summary Tab */}
                    <TabsContent value="summary" className="flex-1 overflow-hidden mt-0">
                        <div className="h-full border rounded-xl overflow-auto bg-white shadow-sm p-6">
                            {transactions.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400 font-medium italic">
                                    No transactions to summarize
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Overall Summary */}
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="border border-slate-200 rounded-lg p-4">
                                            <div className="text-xs text-slate-500 uppercase tracking-wider">Transactions</div>
                                            <div className="text-2xl font-black text-slate-800 mt-1">{summary.total.transactions}</div>
                                        </div>
                                        <div className="border border-slate-200 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-slate-100">
                                            <div className="text-xs text-slate-500 uppercase tracking-wider">Total Spent</div>
                                            <div className="text-2xl font-black text-slate-800 mt-1">{fmt(summary.total.amount)}</div>
                                        </div>
                                        <div className="border border-emerald-200 rounded-lg p-4 bg-gradient-to-br from-emerald-50 to-emerald-100">
                                            <div className="text-xs text-emerald-600 uppercase tracking-wider">Bank Back</div>
                                            <div className="text-2xl font-black text-emerald-700 mt-1">{fmt(summary.total.bankBack)}</div>
                                            <div className="text-[10px] text-emerald-600 mt-1">
                                                {((summary.total.bankBack / summary.total.amount) * 100).toFixed(2)}% avg
                                            </div>
                                        </div>
                                        <div className="border border-amber-200 rounded-lg p-4 bg-gradient-to-br from-amber-50 to-amber-100">
                                            <div className="text-xs text-amber-600 uppercase tracking-wider">Your Profit</div>
                                            <div className="text-2xl font-black text-amber-700 mt-1">{fmt(summary.total.profit)}</div>
                                            <div className="text-[10px] text-amber-600 mt-1">
                                                {((summary.total.profit / summary.total.amount) * 100).toFixed(2)}% avg
                                            </div>
                                        </div>
                                    </div>

                                    {/* By Policy Source */}
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <div className="bg-slate-50 p-3 border-b border-slate-200">
                                            <div className="text-xs font-black text-slate-700 uppercase tracking-wider">Breakdown by Strategy</div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {Object.entries(summary.byPolicySource)
                                                .sort((a, b) => b[1].bankBack - a[1].bankBack)
                                                .map(([source, data]) => (
                                                    <div key={source} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                                                                source === 'category_rule' ? "bg-emerald-100 text-emerald-700" :
                                                                source === 'level_default' ? "bg-amber-100 text-amber-700" :
                                                                "bg-slate-100 text-slate-600"
                                                            )}>
                                                                {source === 'category_rule' ? '🎯' :
                                                                 source === 'level_default' ? '📊' :
                                                                 '⚙️'}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-800">
                                                                    {source === 'category_rule' ? 'Rule Match' :
                                                                     source === 'level_default' ? 'Level Default' :
                                                                     'Program Default'}
                                                                </div>
                                                                <div className="text-[10px] text-slate-500">{data.count} transactions</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <div className="text-xs text-slate-500">Spent</div>
                                                                <div className="text-sm font-bold text-slate-700">{fmt(data.amount)}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs text-emerald-600">Bank Back</div>
                                                                <div className="text-sm font-black text-emerald-700">{fmt(data.bankBack)}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs text-slate-500">Avg Rate</div>
                                                                <div className="text-sm font-black text-slate-700">
                                                                    {((data.bankBack / data.amount) * 100).toFixed(2)}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
