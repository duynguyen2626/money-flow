'use client'

import { Installment } from "@/services/installment.service"
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
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

import { InstallmentDetailsDialog } from "./installment-details-dialog"

interface InstallmentTableProps {
    installments: Installment[]
}

export function InstallmentTable({ installments }: InstallmentTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
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
                            <TableCell colSpan={7} className="h-24 text-center">
                                No active installments.
                            </TableCell>
                        </TableRow>
                    ) : (
                        installments.map((inst) => {
                            const progress = ((inst.total_amount - inst.remaining_amount) / inst.total_amount) * 100
                            return (
                                <TableRow key={inst.id}>
                                    <TableCell className="font-medium">
                                        <div>{inst.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatCurrency(inst.total_amount)} total
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {inst.original_transaction?.transaction_lines?.find((l: any) => l.type === 'credit')?.account?.name || '-'}
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
