/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2, CheckCircle2, Ban, CreditCard, CalendarClock, Copy, Loader2, ArrowRight, MoreVertical } from 'lucide-react'
import { deleteBatchItemAction, updateBatchItemAction, confirmBatchItemAction, voidBatchItemAction, deleteBatchItemsBulkAction, cloneBatchItemAction } from '@/actions/batch.actions'
import { Checkbox } from '@/components/ui/checkbox'
import { EditItemDialog } from './edit-item-dialog'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ConfirmTransferDialog } from './confirm-transfer-dialog'
import { InstallmentPaymentDialog } from './installment-payment-dialog'
import { parseCashbackConfig } from '@/lib/cashback'
import { Badge } from '@/components/ui/badge'
import { TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface ItemsTableProps {
    items: any[]
    batchId: string
    onSelectionChange?: (selectedIds: string[]) => void
    selectedIds?: string[]
    activeInstallmentAccounts?: string[]
    bankType?: 'VIB' | 'MBB',
    accounts: any[],
    bankMappings?: any[]
    onEditItem?: (item: any) => void
}

export function ItemsTable({
    items: initialItems,
    batchId,
    onSelectionChange,
    selectedIds = [],
    activeInstallmentAccounts = [],
    bankType = 'VIB',
    accounts,
    bankMappings = [],
    onEditItem
}: ItemsTableProps) {
    // Sort items: Nearest Due Date -> Created At (desc)
    const items = useMemo(() => {
        return [...initialItems].sort((a, b) => {

            const getDaysUntilDue = (item: any) => {
                if (!item.target_account?.cashback_config) return 999
                const config = parseCashbackConfig(item.target_account.cashback_config)
                if (!config.dueDate) return 999

                const today = new Date()
                const currentDay = today.getDate()
                const dueDay = config.dueDate

                let daysDiff = dueDay - currentDay
                if (daysDiff < 0) {
                    // Due date has passed this month, so it's next month
                    // Approximate days in month as 30 for sorting
                    daysDiff += 30
                }
                return daysDiff
            }

            const dueA = getDaysUntilDue(a)
            const dueB = getDaysUntilDue(b)

            if (dueA !== dueB) return dueA - dueB
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
    }, [initialItems])

    const [showConfirm, setShowConfirm] = useState(false)
    const [showTransferDialog, setShowTransferDialog] = useState(false)
    const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<any>(null)
    const [cloningItemId, setCloningItemId] = useState<string | null>(null)
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
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

    // Bulk delete logic moved to BatchDetail

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

    async function handleClone(id: string) {
        setCloningItemId(id)
        try {
            const result = await cloneBatchItemAction(id, batchId)
            if (result && result.success && result.data?.id) {
                // Open edit slide/dialog for the newly cloned item
                if (onEditItem) {
                    onEditItem(result.data)
                } else {
                    setEditingItemId(result.data.id)
                }
            } else if (result && !result.success) {
                console.error('Clone failed:', result.error)
            }
        } catch (error) {
            console.error('Clone error:', error)
        } finally {
            setCloningItemId(null)
        }
    }



    const handleSelectAll = (checked: boolean) => {
        const newSelectedIds = checked ? items.map(i => i.id) : []
        onSelectionChange?.(newSelectedIds)
    }

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelectedIds = checked
            ? [...selectedIds, id]
            : selectedIds.filter(sid => sid !== id)
        onSelectionChange?.(newSelectedIds)
    }

    return (
        <>
            {/* Bulk action bar removed - moved to BatchDetail */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-b border-slate-200">
                            <TableHead className="w-[40px] pl-6">
                                <Checkbox
                                    checked={items.length > 0 && selectedIds.length === items.length}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                    className="rounded-[4px] border-slate-300"
                                />
                            </TableHead>
                            <TableHead className="w-[60px] text-[10px] font-black uppercase text-slate-400 tracking-widest">ID</TableHead>
                            {bankType === 'MBB' ? (
                                <>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Number / Receiver</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bank</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Amount</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Note</TableHead>
                                </>
                            ) : (
                                <>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Receiver / Number</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Amount</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Note</TableHead>
                                </>
                            )}
                            <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Account Flow</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-right pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={bankType === 'MBB' ? 9 : 8} className="h-32 text-center text-slate-400 font-medium">
                                    No items found in this category.
                                </TableCell>
                            </TableRow>
                        )}
                        {items.map((item, index) => (
                            <TableRow key={item.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="pl-6">
                                    <Checkbox
                                        checked={selectedIds.includes(item.id)}
                                        onCheckedChange={(checked) => handleSelectOne(item.id, checked as boolean)}
                                        className="rounded-[4px] border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                    />
                                </TableCell>
                                <TableCell className="text-xs font-bold text-slate-400">{index + 1}</TableCell>

                                {bankType === 'MBB' ? (
                                    <>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 leading-tight">{item.receiver_name || 'Unknown'}</span>
                                                <span className="text-xs font-medium text-slate-400">{item.bank_number || '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                                                {item.bank_name}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-sm font-black text-slate-900">
                                                {new Intl.NumberFormat('en-US').format(item.amount)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1.5 min-w-[150px]">
                                                <span className="text-xs text-slate-600 font-medium line-clamp-1 group-hover:line-clamp-none transition-all">{item.note}</span>
                                                {item.target_account?.cashback_config && (
                                                    (() => {
                                                        const config = parseCashbackConfig(item.target_account.cashback_config)
                                                        if (config.dueDate) {
                                                            const today = new Date()
                                                            const currentDay = today.getDate()
                                                            const dueDay = config.dueDate
                                                            let daysDiff = dueDay - currentDay
                                                            if (daysDiff < 0) daysDiff += 30

                                                            const isCritical = daysDiff <= 3
                                                            const isWarning = daysDiff <= 7

                                                            return (
                                                                <div className={cn(
                                                                    "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded w-fit border",
                                                                    isCritical ? "bg-red-50 text-red-600 border-red-100" :
                                                                        isWarning ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                            "bg-blue-50 text-blue-600 border-blue-100"
                                                                )}>
                                                                    <CalendarClock className="h-3 w-3" />
                                                                    Due in {daysDiff}d
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    })()
                                                )}
                                            </div>
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 leading-tight">{item.receiver_name || 'Unknown'}</span>
                                                <span className="text-xs font-medium text-slate-400">{item.bank_number || '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-sm font-black text-slate-900">
                                                {new Intl.NumberFormat('en-US').format(item.amount)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1.5 min-w-[150px]">
                                                <span className="text-xs text-slate-600 font-medium line-clamp-1 group-hover:line-clamp-none transition-all">{item.note}</span>
                                                {item.target_account?.cashback_config && (
                                                    (() => {
                                                        const config = parseCashbackConfig(item.target_account.cashback_config)
                                                        if (config.dueDate) {
                                                            const today = new Date()
                                                            const currentDay = today.getDate()
                                                            const dueDay = config.dueDate
                                                            let daysDiff = dueDay - currentDay
                                                            if (daysDiff < 0) daysDiff += 30

                                                            const isCritical = daysDiff <= 3
                                                            const isWarning = daysDiff <= 7

                                                            return (
                                                                <div className={cn(
                                                                    "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded w-fit border",
                                                                    isCritical ? "bg-red-50 text-red-600 border-red-100" :
                                                                        isWarning ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                            "bg-blue-50 text-blue-600 border-blue-100"
                                                                )}>
                                                                    <CalendarClock className="h-3 w-3" />
                                                                    Due in {daysDiff}d
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    })()
                                                )}
                                            </div>
                                        </TableCell>
                                    </>
                                )}

                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                                            <div className="w-4 h-4 rounded-none bg-indigo-500 flex items-center justify-center text-[8px] text-white">B</div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Pool</span>
                                        </div>
                                        <ArrowRight className="h-3 w-3 text-slate-300" />
                                        {item.target_account_id ? (
                                            <Link href={`/accounts/${item.target_account_id}`}>
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md border border-blue-100 hover:border-blue-300 transition-colors">
                                                    {/* ROUNDED NONE for account icon */}
                                                    <div className="w-5 h-5 rounded-none bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shrink-0 uppercase">
                                                        {item.target_account?.name?.[0] || 'A'}
                                                    </div>
                                                    <span className="text-[10px] font-black text-blue-700 whitespace-nowrap">
                                                        {item.target_account?.name || 'Account'}
                                                    </span>
                                                    {activeInstallmentAccounts.includes(item.target_account_id) && (
                                                        <CreditCard className="h-3 w-3 text-purple-500 shrink-0" />
                                                    )}
                                                </div>
                                            </Link>
                                        ) : (
                                            <div className="text-[10px] font-bold text-amber-600 italic px-2 py-1 bg-amber-50 rounded-md border border-amber-100">Select target...</div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        {item.status === 'confirmed' ? (
                                            <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Done
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-amber-600 font-bold text-[10px] uppercase tracking-wider bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                Pending
                                            </div>
                                        )}

                                        {item.is_installment_payment && (
                                            <div className="flex items-center gap-1 text-indigo-600 font-bold text-[10px] uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                                <CreditCard className="h-3 w-3" />
                                                PP
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="pr-6 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {item.status !== 'confirmed' ? (
                                            <>
                                                {/* Smart Quick Match for Installments */}
                                                {item.target_account_id && activeInstallmentAccounts.includes(item.target_account_id) && (
                                                    <InstallmentPaymentDialog
                                                        batchItemId={item.id}
                                                        batchItemAmount={Math.abs(item.amount)}
                                                        targetAccountId={item.target_account_id}
                                                        onSuccess={() => window.location.reload()}
                                                    />
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openTransferDialog(item)}
                                                    className="h-8 px-3 text-emerald-600 hover:bg-emerald-50 rounded-lg font-bold text-[10px] uppercase gap-1.5"
                                                    title="Quick Confirm"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Confirm
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-lg">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuItem onClick={() => onEditItem?.(item)} className="cursor-pointer gap-2 font-bold text-xs">
                                                            <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                                                            Edit Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleClone(item.id)} disabled={cloningItemId === item.id} className="cursor-pointer gap-2 font-bold text-xs">
                                                            {cloningItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                                                            Duplicate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(item.id)} className="cursor-pointer gap-2 font-bold text-xs text-red-600">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Delete Item
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleVoid(item.id)}
                                                className="h-8 px-3 text-orange-600 hover:bg-orange-50 font-bold text-[10px] uppercase gap-1.5"
                                            >
                                                <Ban className="h-3.5 w-3.5" />
                                                Void
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

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
