'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2, CheckCircle2, Clock, Ban } from 'lucide-react'
import { deleteBatchItemAction, updateBatchItemAction, confirmBatchItemAction, voidBatchItemAction } from '@/actions/batch.actions'
import { Checkbox } from '@/components/ui/checkbox'
import { EditItemDialog } from './edit-item-dialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ConfirmTransferDialog } from './confirm-transfer-dialog'

interface ItemsTableProps {
    items: any[]
    batchId: string
    onSelectionChange?: (selectedIds: string[]) => void
    activeInstallmentAccounts?: string[]
}

import { parseCashbackConfig } from '@/lib/cashback'
import { Badge } from '@/components/ui/badge'
import { CalendarClock, CreditCard } from 'lucide-react'
import { format } from 'date-fns'

export function ItemsTable({ items: initialItems, batchId, onSelectionChange, activeInstallmentAccounts = [] }: ItemsTableProps) {
    // Sort items: Due Date (asc) -> Created At (desc)
    const items = [...initialItems].sort((a, b) => {
        const getDueDate = (item: any) => {
            if (!item.target_account?.cashback_config) return 999
            const config = parseCashbackConfig(item.target_account.cashback_config)
            return config.dueDate || 999
        }
        const dueA = getDueDate(a)
        const dueB = getDueDate(b)
        if (dueA !== dueB) return dueA - dueB
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [showConfirm, setShowConfirm] = useState(false)
    const [showTransferDialog, setShowTransferDialog] = useState(false)
    const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<any>(null)
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string
        description: string
        onConfirm: () => void
        variant?: 'default' | 'destructive'
    }>({ title: '', description: '', onConfirm: () => { } })

    async function handleDelete(id: string) {
        const item = items.find(i => i.id === id)
        if (item?.status === 'confirmed') {
            setConfirmConfig({
                title: 'Cannot Delete',
                description: 'Cannot delete confirmed items. Please use Void instead.',
                onConfirm: () => { },
                variant: 'destructive'
            })
            setShowConfirm(true)
            return
        }
        setConfirmConfig({
            title: 'Delete Item',
            description: 'Are you sure you want to delete this item? This action cannot be undone.',
            onConfirm: async () => {
                await deleteBatchItemAction(id, batchId)
            },
            variant: 'destructive'
        })
        setShowConfirm(true)
    }

    function openTransferDialog(item: any) {
        setSelectedItemForTransfer(item)
        setShowTransferDialog(true)
    }

    async function handleConfirmTransfer(targetAccountId: string) {
        if (selectedItemForTransfer) {
            await confirmBatchItemAction(selectedItemForTransfer.id, batchId, targetAccountId)
        }
    }

    async function handleVoid(id: string) {
        setConfirmConfig({
            title: 'Void Item',
            description: 'Are you sure you want to void this item? This will also void the associated transaction and reverse the balance changes.',
            onConfirm: async () => {
                await voidBatchItemAction(id, batchId)
            },
            variant: 'destructive'
        })
        setShowConfirm(true)
    }

    const handleSelectAll = (checked: boolean) => {
        const newSelectedIds = checked ? items.map(i => i.id) : []
        setSelectedIds(newSelectedIds)
        onSelectionChange?.(newSelectedIds)
    }

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelectedIds = checked
            ? [...selectedIds, id]
            : selectedIds.filter(sid => sid !== id)
        setSelectedIds(newSelectedIds)
        onSelectionChange?.(newSelectedIds)
    }

    return (
        <>
            <Table>

                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">
                            <Checkbox
                                checked={items.length > 0 && selectedIds.length === items.length}
                                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                            />
                        </TableHead>
                        <TableHead className="w-[50px]">STT</TableHead>
                        <TableHead>Receiver</TableHead>
                        <TableHead>Number</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Account Flow</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item, index) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedIds.includes(item.id)}
                                    onCheckedChange={(checked) => handleSelectOne(item.id, checked as boolean)}
                                />
                            </TableCell>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                                {item.receiver_name || 'Unknown'}
                            </TableCell>
                            <TableCell>{item.bank_number || '-'}</TableCell>
                            <TableCell>{new Intl.NumberFormat('en-US').format(item.amount)}</TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <span>{item.note}</span>
                                    {item.target_account?.cashback_config && (
                                        (() => {
                                            const config = parseCashbackConfig(item.target_account.cashback_config)
                                            if (config.dueDate) {
                                                const today = new Date()
                                                const dueDay = config.dueDate
                                                const currentDay = today.getDate()

                                                // Simple logic: if due day is close?
                                                // Just show the day for now
                                                return (
                                                    <Badge variant="outline" className="w-fit gap-1 text-[10px] h-5 px-1.5 font-normal text-slate-500">
                                                        <CalendarClock className="h-3 w-3" />
                                                        Due: {dueDay}
                                                    </Badge>
                                                )
                                            }
                                            return null
                                        })()
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1 text-sm">
                                    <span className="text-muted-foreground">Draft Fund</span>
                                    <span className="text-muted-foreground">➔</span>
                                    {item.target_account_id ? (
                                        <Link href={`/accounts/${item.target_account_id}`} className="text-blue-600 hover:underline font-medium flex items-center gap-1">
                                            {item.target_account?.name || 'Account'}
                                            {activeInstallmentAccounts.includes(item.target_account_id) && (
                                                <span title="Has Active Installments">
                                                    <CreditCard className="h-3 w-3 text-purple-500" />
                                                </span>
                                            )}
                                        </Link>
                                    ) : (
                                        <span className="text-orange-500 italic">Select...</span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {item.bank_name} {item.card_name && `(${item.card_name})`}
                                </div>
                            </TableCell>
                            <TableCell>
                                {item.status === 'confirmed' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Confirmed
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Pending
                                    </span>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`inst-${item.id}`}
                                            checked={item.is_installment_payment}
                                            onCheckedChange={async (checked) => {
                                                await updateBatchItemAction(item.id, { is_installment_payment: checked })
                                            }}
                                            disabled={item.status === 'confirmed'}
                                        />
                                        <label
                                            htmlFor={`inst-${item.id}`}
                                            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-500"
                                            title="Mark as Installment Payment"
                                        >
                                            Inst.
                                        </label>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1">
                                    {item.status !== 'confirmed' && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openTransferDialog(item)}
                                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                title="Confirm Transfer"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </Button>
                                            <EditItemDialog item={item} />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(item.id)}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                    {item.status === 'confirmed' && (
                                        <>
                                            <span className="text-green-600 text-xs font-medium mr-2">Done</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleVoid(item.id)}
                                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                title="Void (Revert)"
                                            >
                                                <Ban className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <ConfirmDialog
                open={showConfirm}
                onOpenChange={setShowConfirm}
                title={confirmConfig.title}
                description={confirmConfig.description}
                onConfirm={confirmConfig.onConfirm}
                variant={confirmConfig.variant}
                confirmText="Confirm"
                cancelText="Cancel"
            />

            <ConfirmTransferDialog
                open={showTransferDialog}
                onOpenChange={setShowTransferDialog}
                item={selectedItemForTransfer}
                onConfirm={handleConfirmTransfer}
            />
        </>
    )
}
