'use client'

import { format } from "date-fns"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { CreateInstallmentDialog } from "./create-installment-dialog"
import { Settings } from "lucide-react"

interface PendingTransaction {
    id: string
    occurred_at: string
    note: string
    amount: number // This is usually negative for expense, need to handle absolute
    // Add other fields if needed
}

interface PendingInstallmentTableProps {
    transactions: PendingTransaction[]
}

export function PendingInstallmentTable({ transactions }: PendingInstallmentTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No pending installment transactions.
                            </TableCell>
                        </TableRow>
                    ) : (
                        transactions.map((txn) => {
                            const originalAmount = typeof (txn as any).original_amount === 'number' ? (txn as any).original_amount : txn.amount;
                            const amount = originalAmount ? Math.abs(Number(originalAmount)) : 0;
                            return (
                                <TableRow key={txn.id}>
                                    <TableCell>
                                        {format(new Date(txn.occurred_at), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {txn.note || 'No note'}
                                    </TableCell>
                                    <TableCell>{formatCurrency(amount)}</TableCell>
                                    <TableCell className="text-right">
                                        <CreateInstallmentDialog
                                            initialData={{
                                                name: txn.note || `Installment Plan ${format(new Date(txn.occurred_at), 'MM/yy')}`,
                                                totalAmount: amount,
                                                transactionId: txn.id
                                            }}
                                            trigger={
                                                <Button size="sm" variant="outline" className="gap-2">
                                                    <Settings className="h-4 w-4" />
                                                    Setup Plan
                                                </Button>
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
