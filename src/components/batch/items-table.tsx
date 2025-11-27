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
import { Trash2, CheckCircle2, Clock } from 'lucide-react'
import { deleteBatchItemAction, updateBatchItemAction } from '@/actions/batch.actions'
import { Checkbox } from '@/components/ui/checkbox'
import { EditItemDialog } from './edit-item-dialog'

interface ItemsTableProps {
    items: any[]
    batchId: string
    onSelectionChange?: (selectedIds: string[]) => void
}

export function ItemsTable({ items, batchId, onSelectionChange }: ItemsTableProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    async function handleDelete(id: string) {
        if (confirm('Are you sure?')) {
            await deleteBatchItemAction(id, batchId)
        }
    }

    async function handleConfirm(id: string) {
        await updateBatchItemAction(id, { status: 'confirmed' })
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
                            {item.target_account_id ? (
                                <Link href={`/accounts/${item.target_account_id}`} className="text-blue-600 hover:underline">
                                    {item.receiver_name || item.target_account?.name || 'Unknown'}
                                </Link>
                            ) : (
                                <span>{item.receiver_name || 'Unknown'}</span>
                            )}
                        </TableCell>
                        <TableCell>{item.bank_number || '-'}</TableCell>
                        <TableCell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount)}</TableCell>
                        <TableCell>{item.note}</TableCell>
                        <TableCell>{item.bank_name || '-'}</TableCell>
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
                                    </>
                                )}
                                {item.status === 'confirmed' && (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-2" />
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table >
    )
}
