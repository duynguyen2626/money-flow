'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useEffect, useState } from 'react'
import { fetchAccountCycleTransactions } from '@/actions/cashback.actions'
import { Loader2, Copy, Pencil } from 'lucide-react'
import { CashbackTransaction } from '@/types/cashback.types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AccountCycleTransactionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountId: string;
    accountName: string;
    cycleDisplay: string;
    onEditTransaction?: (id: string) => void;
    refreshKey?: number; // Trigger refresh when this changes
}

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
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open) return

        const fetchData = async () => {
            setLoading(true)
            try {
                const res = await fetchAccountCycleTransactions(accountId)
                setTransactions(res)
            } catch (error) {
                console.error('Error fetching cycle transactions:', error)
                setTransactions([])
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [open, accountId, refreshKey]) // Re-fetch when refreshKey changes

    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n))

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden">
                <div className="p-6 bg-slate-50/50 border-b border-slate-200">
                    <DialogHeader className="text-left">
                        <DialogTitle className="text-xl font-black text-slate-900 leading-tight">
                            Transactions contributing to Cashback
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium text-slate-500">
                            {accountName} • Cycle: {cycleDisplay}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-hidden p-6">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : (
                        <div className="h-full border rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                            <div className="overflow-auto flex-1">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                        <TableRow className="hover:bg-transparent border-slate-200">
                                            <TableHead className="w-24 text-[10px] font-black uppercase tracking-wider text-slate-500">Date</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500">Description</TableHead>
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
                                                <TableCell colSpan={6} className="text-center py-12 text-slate-400 font-medium italic">
                                                    No contributing transactions found in this cycle.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            transactions.map((t) => (
                                                <TableRow key={t.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="whitespace-nowrap py-3 font-mono text-[11px] text-slate-500">
                                                        {new Date(t.occurred_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-800 line-clamp-1">{t.note || t.shopName || 'Transaction'}</span>
                                                            {t.shopName && <span className="text-[9px] text-slate-400 font-medium">{t.shopName}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm">{t.categoryIcon}</span>
                                                            <span className="text-[11px] font-bold text-slate-600">{t.categoryName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 font-mono text-xs font-bold text-slate-700">
                                                        {fmt(Math.abs(t.amount))}
                                                    </TableCell>
                                                    <TableCell className="text-right py-3">
                                                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                            {(t.effectiveRate * 100).toFixed(1)}%
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right py-3 font-black text-xs text-indigo-600">
                                                        {fmt(t.earned)}
                                                    </TableCell>
                                                    <TableCell className="text-right py-3">
                                                        <div className="flex items-center justify-end gap-1">
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
                                                                            <Copy className="h-3 w-3" />
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
                                                                                className="h-6 w-6 text-slate-400 hover:text-indigo-600"
                                                                                onClick={() => onEditTransaction(t.id)}
                                                                            >
                                                                                <Pencil className="h-3 w-3" />
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
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Earned</span>
                                        <span className="text-lg font-black text-indigo-700">
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
