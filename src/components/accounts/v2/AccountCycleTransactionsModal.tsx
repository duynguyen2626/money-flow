'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useEffect, useState, useMemo } from 'react'
import { fetchAccountCycleTransactions, fetchAccountCyclesAction } from '@/actions/cashback.actions'
import { Loader2, Copy, Pencil, User, CalendarRange } from 'lucide-react'
import { CashbackTransaction } from '@/types/cashback.types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select-shadcn"
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { Badge } from '@/components/ui/badge'

interface AccountCycleTransactionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountId: string;
    accountName: string;
    cycleDisplay: string;
    onEditTransaction?: (id: string) => void;
    refreshKey?: number; // Trigger refresh when this changes
}

type AccountCycle = {
    id: string;
    cycle_tag: string;
    spent_amount: number;
    real_awarded: number;
    virtual_profit: number;
    min_spend_target: number | null;
    max_budget: number | null;
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
    const [cycles, setCycles] = useState<AccountCycle[]>([])
    const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)

    const [loading, setLoading] = useState(false)
    const [loadingCycles, setLoadingCycles] = useState(false)
    const [editingTxnId, setEditingTxnId] = useState<string | null>(null)

    const [selectedYear, setSelectedYear] = useState<string | null>(null);

    // Helper to get year from cycle
    const getYear = (c: AccountCycle) => c.cycle_tag.split('-')[0] || 'Unknown';

    // Derived: Available years
    const availableYears = useMemo(() => {
        const years = new Set(cycles.map(getYear));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [cycles]);

    // Derived: Cycles for selected year
    const filteredCycles = useMemo(() => {
        if (!selectedYear) return [];
        return cycles
            .filter(c => getYear(c) === selectedYear)
            .sort((a, b) => b.cycle_tag.localeCompare(a.cycle_tag)); // Descending by tag/time
    }, [cycles, selectedYear]);

    // Auto-select latest year and cycle when cycles are loaded
    useEffect(() => {
        console.log('Auto-select effect:', { cyclesLength: cycles.length, selectedYear, availableYears });
        if (cycles.length > 0 && !selectedYear) {
            const latestYear = availableYears[0];
            console.log('Setting year to:', latestYear);
            setSelectedYear(latestYear);

            // Auto-select first cycle in that year
            const cyclesInYear = cycles
                .filter(c => getYear(c) === latestYear)
                .sort((a, b) => b.cycle_tag.localeCompare(a.cycle_tag));

            console.log('Cycles in year:', cyclesInYear.map(c => c.cycle_tag));
            if (cyclesInYear.length > 0) {
                console.log('Setting cycle to:', cyclesInYear[0].cycle_tag, cyclesInYear[0].id);
                setSelectedCycleId(cyclesInYear[0].id);
            }
        }
    }, [cycles, availableYears]);

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setSelectedYear(null);
            setSelectedCycleId(null);
        }
    }, [open]);

    // 1. Fetch Cycles on Open
    useEffect(() => {
        if (!open || !accountId) return;

        const loadCycles = async () => {
            setLoadingCycles(true);
            try {
                const res = await fetchAccountCyclesAction(accountId);
                setCycles(Array.isArray(res) ? res : []);
            } catch (err) {
                console.error("Failed to load cycles", err);
                setCycles([]);
            } finally {
                setLoadingCycles(false);
            }
        };

        loadCycles();
    }, [open, accountId]);

    // 2. Fetch Transactions when Cycle Selected or Open
    useEffect(() => {
        if (!open) return
        // If we have selected cycle, fetch for that.
        // If not (e.g. still loading cycles, or none found), we might default or wait.
        // But for initial load (when open), we might want to fetch *current* stats-based txns if no cycle ID is passed?
        // Actually, if we use the NEW fetchAccountCycleTransactions which calls getTransactionsForCycle(id), we strictly need an ID.
        // So we should wait for cycles to load?
        // HOWEVER, if it's the *current* cycle (not yet saved to DB fully?), getCashbackProgress would capture it.
        // Let's implement fallback: If selectedCycleId is set, use it. If not, fetch using default logic (which uses getCashbackProgress).

        const fetchData = async () => {
            setLoading(true)
            try {
                // If we have a selected cycle ID, use it.
                // Otherwise, fall back to default (0 offset / current)
                const res = await fetchAccountCycleTransactions(accountId, selectedCycleId || undefined)
                setTransactions(res)
            } catch (error) {
                console.error('Error fetching cycle transactions:', error)
                setTransactions([])
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [open, accountId, refreshKey, selectedCycleId])

    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n))

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
                                <Select
                                    value={selectedYear || undefined}
                                    onValueChange={(val) => {
                                        setSelectedYear(val || null);
                                        // Reset cycle to first (most recent) in new year
                                        const cyclesInYear = cycles
                                            .filter(c => getYear(c) === val)
                                            .sort((a, b) => b.cycle_tag.localeCompare(a.cycle_tag));
                                        if (cyclesInYear.length > 0) {
                                            setSelectedCycleId(cyclesInYear[0].id);
                                        } else {
                                            setSelectedCycleId(null);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-[100px] h-9 text-xs font-bold">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map(year => (
                                            <SelectItem key={year} value={year} className="text-xs font-medium">
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Cycle Selector (Searchable) */}
                                <div className="w-[240px]">
                                    <CustomDropdown
                                        value={selectedCycleId || ''}
                                        onChange={setSelectedCycleId}
                                        options={filteredCycles.map(c => ({
                                            value: c.id,
                                            label: `${c.cycle_tag} • ${new Intl.NumberFormat('vi-VN', { notation: "compact" }).format(c.real_awarded + c.virtual_profit)}`,
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
                                            <TableHead className="text-right text-[10px] font-black uppercase tracking-wider text-slate-500">Rate</TableHead>
                                            <TableHead className="text-right text-[10px] font-black uppercase tracking-wider text-slate-500">Earned</TableHead>
                                            <TableHead className="w-20 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12 text-slate-400 font-medium italic">
                                                    No contributing transactions found in this cycle.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            transactions.map((t) => (
                                                <TableRow key={t.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="whitespace-nowrap py-3 font-mono text-[11px] text-slate-500 align-top">
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
                                                    <TableCell className="text-right py-3 font-mono text-xs font-bold text-slate-700 align-top">
                                                        {fmt(Math.abs(t.amount))}
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 align-top">
                                                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 whitespace-nowrap">
                                                            {(t.effectiveRate * 100).toFixed(1)}%
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 font-black text-xs text-indigo-600 align-top">
                                                        {fmt(t.earned)}
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
                                    </TableBody>
                                </Table>
                            </div>

                            {transactions.length > 0 && (
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-8">
                                    <div className="flex flex-col items-end opacity-60">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Spend</span>
                                        <span className="text-md font-black text-slate-600">
                                            {fmt(transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0))}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Earned</span>
                                        <span className="text-xl font-black text-indigo-700">
                                            {fmt(transactions.reduce((sum, t) => sum + t.earned, 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
