'use client'

import { Installment } from "@/services/installment.service"
import {
    Copy,
    CheckCheck,
} from "lucide-react"
import { useState, useEffect } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { formatCurrency, cn } from "@/lib/utils"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

import { InstallmentDetailsDialog } from "./installment-details-dialog"

interface InstallmentTableProps {
    installments: Installment[]
    highlightTxnId?: string | null
}

export function InstallmentTable({ installments, highlightTxnId }: InstallmentTableProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [highlightedId, setHighlightedId] = useState<string | null>(highlightTxnId ?? null)

    // Clear highlight after 5 seconds for visual feedback
    useEffect(() => {
        if (highlightedId) {
            const timer = setTimeout(() => setHighlightedId(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [highlightedId])

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Original Txn</TableHead>
                        <TableHead>Plan Name</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Monthly</TableHead>
                        <TableHead>Next Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {installments.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                                No active installments.
                            </TableCell>
                        </TableRow>
                    ) : (
                        installments.map((inst) => {
                            const progress = ((inst.total_amount - inst.remaining_amount) / inst.total_amount) * 100
                            const isHighlighted = highlightedId && inst.original_transaction_id === highlightedId
                            return (
                                <TableRow
                                    key={inst.id}
                                    className={cn(
                                        isHighlighted && "bg-amber-100 animate-pulse ring-2 ring-amber-400"
                                    )}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {inst.original_transaction_id ? (
                                                <>
                                                    <span className="font-mono text-xs text-muted-foreground" title={inst.original_transaction_id}>
                                                        {inst.original_transaction_id.slice(0, 8) + '...'}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(inst.original_transaction_id!);
                                                            setCopiedId(inst.original_transaction_id!);
                                                            setTimeout(() => setCopiedId(null), 2000);
                                                        }}
                                                        className="text-slate-400 hover:text-slate-600 transition-colors"
                                                        title="Copy ID"
                                                    >
                                                        {copiedId === inst.original_transaction_id ? <CheckCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                                    </button>
                                                </>
                                            ) : (
                                                '-'
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div>{inst.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatCurrency(inst.total_amount)} total
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {inst.original_transaction?.account?.name || '-'}
                                    </TableCell>
                                    <TableCell className="w-[200px]">
                                        <div className="flex items-center gap-2">
                                            <Progress value={progress} className="h-2" />
                                            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(inst.monthly_amount)}</TableCell>
                                    <TableCell>
                                        {inst.next_due_date ? format(new Date(inst.next_due_date), 'dd/MM/yyyy') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={inst.status === 'active' ? 'default' : 'secondary'}>
                                            {inst.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <InstallmentDetailsDialog
                                            installment={inst}
                                            trigger={
                                                <Button variant="ghost" size="sm">Details</Button>
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
