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

interface ItemsTableProps {
    items: any[]
    batchId: string
    onSelectionChange?: (selectedIds: string[]) => void
}

export function ItemsTable({ items, batchId, onSelectionChange }: ItemsTableProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [showConfirm, setShowConfirm] = useState(false)
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

    async function handleConfirm(id: string) {
        await confirmBatchItemAction(id, batchId)
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
                        <TableHead>Bank</TableHead>
                        <TableHead>Status</TableHead>
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
                            <TableCell>{item.note}</TableCell>
                            <TableCell>
                                {item.target_account_id ? (
                                    <Link href={`/accounts/${item.target_account_id}`} className="text-blue-600 hover:underline">
                                        {item.bank_name || item.target_account?.name || '-'}
                                        {item.card_name && ` (${item.card_name})`}
                                    </Link>
                                ) : (
                                    <span>
                                        {item.bank_name || '-'}
                                        {item.card_name && ` (${item.card_name})`}
                                    </span>
                                )}
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
                                <div className="flex items-center gap-1">
                                    {item.status !== 'confirmed' && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleConfirm(item.id)}
                                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                title="Confirm"
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
                                            <span className="text-green-600 text-xs font-medium mr-2">Confirmed</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleVoid(item.id)}
                                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                title="Void"
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
        </>
    )
}
