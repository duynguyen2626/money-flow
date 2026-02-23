'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RotateCcw, CheckCircle2, Circle, Loader2, Calendar, ArrowRight, Wallet, ShoppingBag, Edit2, XCircle, Info, ExternalLink, ThumbsUp, MapPin, RefreshCw, FileSpreadsheet, Search } from 'lucide-react'
import { getChecklistDataAction } from '@/actions/batch-checklist.actions'
import { upsertBatchItemAmountAction, bulkInitializeFromMasterAction, toggleBatchItemConfirmAction, bulkConfirmBatchItemsAction, bulkUnconfirmBatchItemsAction } from '@/actions/batch-speed.actions'
import { fundBatchAction, sendBatchToSheetAction } from '@/actions/batch.actions'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { formatShortVietnameseCurrency, formatVietnameseCurrencyText } from '@/lib/number-to-text'
import { useRouter } from 'next/navigation'
import { Combobox } from '@/components/ui/combobox'
import Link from 'next/link'

interface BatchMasterChecklistProps {
    bankType: 'MBB' | 'VIB'
    accounts: any[]
    period?: 'before' | 'after'
    monthYear?: string
}

export function BatchMasterChecklist({ bankType, accounts, period, monthYear }: BatchMasterChecklistProps) {
    const router = useRouter()
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1 // 1-12
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

    const [selectedMonth, setSelectedMonth] = useState(monthYear || currentMonthStr)
    const [masterItems, setMasterItems] = useState<any[]>([])
    const [batches, setBatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPhase, setSelectedPhase] = useState<'before' | 'after'>('before')
    const [performingAction, setPerformingAction] = useState(false)
    const [confirmFundOpen, setConfirmFundOpen] = useState(false)
    const [confirmStep3Open, setConfirmStep3Open] = useState(false)
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())

    // Auto-refresh when tab gains focus (e.g. after voiding txn in another tab)
    useEffect(() => {
        const handleFocus = () => {
            console.log('Tab focused, refreshing batch data...')
            handleFastRefresh()
        }
        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [])

    // Derived Account Options for Funding
    const bankAccounts = accounts?.filter((a: any) => a.type === 'bank') || []
    let defaultSource = ''
    if (bankAccounts.length > 0) {
        // Try to match exact bankType first
        const matched = bankAccounts.find((a: any) => a.name.toLowerCase().includes(bankType.toLowerCase()))
        defaultSource = matched ? matched.id : bankAccounts[0].id
    }
    const [fundSourceAccountId, setFundSourceAccountId] = useState(defaultSource)

    // Derived data: Map existing batch items to master items for the selected month
    const [itemsByPeriod, setItemsByPeriod] = useState<{
        before: any[],
        after: any[]
    }>({ before: [], after: [] })

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    useEffect(() => {
        loadData()
    }, [bankType])

    useEffect(() => {
        if (monthYear) setSelectedMonth(monthYear)
    }, [monthYear])

    useEffect(() => {
        refreshChecklist()
    }, [selectedMonth, masterItems, batches])

    async function loadData() {
        setLoading(true)
        try {
            const result = await getChecklistDataAction(bankType, currentYear)
            if (result.success && result.data) {
                setMasterItems(result.data.masterItems || [])
                setBatches(result.data.batches || [])
            }
        } catch (error) {
            console.error('Failed to load checklist data', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleFastRefresh() {
        router.refresh()
        const result = await getChecklistDataAction(bankType, currentYear)
        if (result.success && result.data) {
            setMasterItems(result.data.masterItems || [])
            setBatches(result.data.batches || [])
        }
    }

    function refreshChecklist() {
        if (!masterItems.length) return

        const before: any[] = []
        const after: any[] = []

        masterItems.forEach(master => {
            const periodBatches = batches.filter(b =>
                b.month_year === selectedMonth &&
                (b.period === master.cutoff_period || b.name?.toLowerCase().includes(master.cutoff_period === 'before' ? 'early' : 'late')) &&
                b.bank_type === bankType
            )

            const targetBatch = periodBatches[0]
            const existingItem = targetBatch?.batch_items?.find((bi: any) => bi.master_item_id === master.id)

            const itemData = {
                ...master,
                amount: existingItem?.amount || 0,
                status: existingItem?.status || 'none',
                batch_item_id: existingItem?.id,
                batch_id: targetBatch?.id,
                transaction_id: existingItem?.transaction_id
            }

            if (master.cutoff_period === 'before') before.push(itemData)
            else after.push(itemData)
        })

        setItemsByPeriod({ before, after })
    }

    async function handleGlobalSync() {
        setPerformingAction(true)
        try {
            const result = await bulkInitializeFromMasterAction({
                monthYear: selectedMonth,
                period: selectedPhase,
                bankType
            })
            if (result.success) toast.success(`${selectedPhase.toUpperCase()} synced: ${result.initializedCount} items`)
            handleFastRefresh()
        } catch (e) {
            toast.error('Sync failed')
        } finally {
            setPerformingAction(false)
        }
    }

    function requestGlobalFund() {
        const items = selectedPhase === 'before' ? itemsByPeriod.before : itemsByPeriod.after
        const bId = items.find((i: any) => i.batch_id)?.batch_id
        const totalAmount = items.reduce((sum: number, i: any) => sum + Math.abs(i.amount || 0), 0)

        if (!bId) {
            toast.error(`Sync Master for ${selectedPhase.toUpperCase()} first`)
        } else if (!fundSourceAccountId) {
            toast.error('Please select an account to fund from.')
        } else if (totalAmount === 0) {
            toast.error('Cannot fund Phase with 0 amount')
        } else {
            setConfirmFundOpen(true)
        }
    }

    async function handleGlobalFund() {
        setConfirmFundOpen(false)
        setPerformingAction(true)
        toast.info(`Process: Starting Fund Allocation...`, { id: 'fund-process' })
        try {
            const items = selectedPhase === 'before' ? itemsByPeriod.before : itemsByPeriod.after
            const bId = items.find((i: any) => i.batch_id)?.batch_id

            const result = await fundBatchAction(bId, fundSourceAccountId)
            if (result.transactionId) {
                toast.success(`${selectedPhase.toUpperCase()} funded successfully`, { id: 'fund-process', duration: 4000 })
                toast.message('Next recommended step:', {
                    description: 'Wait a moment, then click Step 2: To Sheet.'
                })
            } else if (result.status === 'already_funded') {
                toast.success(`${selectedPhase.toUpperCase()} is already fully funded. Txn ID: ${result.transactionId || 'Found'}`, { id: 'fund-process', duration: 4000 })
            } else {
                toast.info(`${selectedPhase.toUpperCase()} fund status: ${result.status}`, { id: 'fund-process' })
            }
            handleFastRefresh()
        } catch (e) {
            toast.error('Funding error or no difference to fund.', { id: 'fund-process' })
        } finally {
            setPerformingAction(false)
        }
    }

    async function handleGlobalToSheet() {
        setPerformingAction(true)
        try {
            const items = selectedPhase === 'before' ? itemsByPeriod.before : itemsByPeriod.after
            const bId = items.find((i: any) => i.batch_id)?.batch_id
            const totalAmount = items.reduce((sum: number, i: any) => sum + Math.abs(i.amount || 0), 0)

            if (!bId) {
                toast.error(`Sync Master for ${selectedPhase.toUpperCase()} first`)
                setPerformingAction(false)
                return
            }
            if (totalAmount === 0) {
                toast.error('Cannot send Phase with 0 amount to sheet')
                setPerformingAction(false)
                return
            }

            toast.promise(sendBatchToSheetAction(bId), {
                loading: `Sending ${selectedPhase.toUpperCase()} to Google Sheets...`,
                success: (data) => {
                    if (data.success) return `Successfully sent ${(data as any).count} items to sheet!`
                    throw new Error((data as any).error)
                },
                error: (err) => `Failed to send to sheet: ${err.message}`
            })

        } catch (e) {
            console.error(e)
            toast.error('Sheet error')
        } finally {
            setPerformingAction(false)
        }
    }

    async function handleGlobalUnconfirm() {
        setPerformingAction(true)
        try {
            const items = selectedPhase === 'before' ? itemsByPeriod.before : itemsByPeriod.after
            const confirmedItems = items.filter((i: any) => i.status === 'confirmed')
            const itemIds = confirmedItems.map((i: any) => i.batch_item_id).filter(Boolean)

            if (itemIds.length === 0) {
                toast.info(`No confirmed items to uncheck in ${selectedPhase.toUpperCase()}`)
                setPerformingAction(false)
                return
            }

            const bId = items.find((i: any) => i.batch_id)?.batch_id
            if (bId) {
                const result = await bulkUnconfirmBatchItemsAction(bId, itemIds)
                if (result.success) toast.success(`Unchecked ${result.count} items in ${selectedPhase.toUpperCase()}`)
                handleFastRefresh()
            }
        } catch (e) {
            toast.error('Unconfirm error')
        } finally {
            setPerformingAction(false)
        }
    }

    function requestGlobalConfirm() {
        const items = selectedPhase === 'before' ? itemsByPeriod.before : itemsByPeriod.after

        // If items are selected via checkboxes, use those. Otherwise all pending.
        const itemsToProcess = selectedItemIds.size > 0
            ? items.filter((i: any) => i.batch_item_id && selectedItemIds.has(i.batch_item_id))
            : items.filter((i: any) => i.batch_item_id && i.status !== 'confirmed')

        const itemIds = itemsToProcess.map((i: any) => i.batch_item_id).filter(Boolean)

        if (itemIds.length === 0) {
            toast.info(selectedItemIds.size > 0
                ? "No valid selected items to confirm"
                : `No pending items to confirm in ${selectedPhase.toUpperCase()}`)
            return
        }

        const bId = items.find((i: any) => i.batch_id)?.batch_id
        if (!bId) {
            toast.error(`Sync Master for ${selectedPhase.toUpperCase()} first`)
        } else {
            setConfirmStep3Open(true)
        }
    }

    async function handleGlobalConfirm() {
        setConfirmStep3Open(false)
        setPerformingAction(true)
        try {
            const items = selectedPhase === 'before' ? itemsByPeriod.before : itemsByPeriod.after

            // If items are selected via checkboxes, use those. Otherwise all pending.
            const itemsToProcess = selectedItemIds.size > 0
                ? items.filter((i: any) => i.batch_item_id && selectedItemIds.has(i.batch_item_id))
                : items.filter((i: any) => i.batch_item_id && i.status !== 'confirmed')

            const itemIds = itemsToProcess.map((i: any) => i.batch_item_id).filter(Boolean)
            const bId = items.find((i: any) => i.batch_id)?.batch_id

            const result = await bulkConfirmBatchItemsAction(bId, itemIds)
            if (result.success) {
                toast.success(`Confirmed ${result.count} items in ${selectedPhase.toUpperCase()}`)
                setSelectedItemIds(new Set()) // Clear selection
            }
            handleFastRefresh()
        } catch (e) {
            toast.error('Confirm error')
        } finally {
            setPerformingAction(false)
        }
    }

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Preparing 12-month grid...</p>
            </div>
        )
    }

    const phaseNameText = selectedPhase === 'before' ? 'PHASE 1' : 'PHASE 2'

    const currentPhaseItems = selectedPhase === 'before' ? itemsByPeriod.before : itemsByPeriod.after
    const totalItems = currentPhaseItems.length;
    const confirmedCount = currentPhaseItems.filter((i: any) => i.status === 'confirmed').length;
    const bId = currentPhaseItems.find((i: any) => i.batch_id)?.batch_id;
    const currentBatch = batches?.find((b: any) => b.id === bId);
    let phaseStatusLabel = 'Active';
    let PhaseStatusIcon = Circle;
    let phaseStatusColor = 'text-slate-500 bg-slate-100';

    if (totalItems > 0) {
        if (confirmedCount === totalItems) {
            phaseStatusLabel = 'Done';
            PhaseStatusIcon = CheckCircle2;
            phaseStatusColor = 'text-emerald-700 bg-emerald-100';
        } else if (confirmedCount > 0) {
            phaseStatusLabel = 'Processing';
            PhaseStatusIcon = RotateCcw;
            phaseStatusColor = 'text-amber-700 bg-amber-100';
        }
    } else {
        phaseStatusLabel = 'Empty';
    }

    return (
        <div className="space-y-6">
            {/* Overlay Spinner */}
            {performingAction && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
                    <p className="text-sm font-black text-indigo-900 uppercase tracking-widest animate-pulse">Processing...</p>
                </div>
            )}

            {/* Consolidated Actions Bar */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/40 relative z-10">
                <div className="flex-1 flex items-center gap-2">
                    <div className="bg-slate-900 text-white px-3 h-10 flex items-center rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200">
                        {selectedPhase === 'before' ? 'Phase 1' : 'Phase 2'}
                    </div>
                    <div className={cn("px-3 h-10 flex items-center gap-2 rounded-xl font-black uppercase tracking-tighter text-[10px] shadow-sm border border-black/5", phaseStatusColor)}>
                        <PhaseStatusIcon className="h-3.5 w-3.5" />
                        Status: {phaseStatusLabel}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleGlobalSync}
                        disabled={performingAction}
                        className="h-10 w-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                        title="Sync Master for this Phase"
                    >
                        {performingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden shrink-0">
                            <Combobox
                                value={fundSourceAccountId}
                                onValueChange={(val) => val && setFundSourceAccountId(val)}
                                items={bankAccounts.map((a: any) => ({
                                    value: a.id,
                                    label: a.name,
                                    icon: a.image_url ? <img src={a.image_url} alt="" className="w-4 h-4 rounded-none object-contain" /> : <Wallet className="w-4 h-4 text-slate-400" />
                                }))}
                                triggerClassName="h-11 border-none shadow-none rounded-none focus:ring-0 min-w-[180px] text-[11px] font-bold"
                                disabled={performingAction}
                            />
                            {fundSourceAccountId && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={`/accounts/${fundSourceAccountId}`}
                                            target="_blank"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center justify-center px-2 hover:bg-slate-50 border-l border-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>Open Funding Account Detail</TooltipContent>
                                </Tooltip>
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={requestGlobalFund}
                                        disabled={performingAction || !fundSourceAccountId}
                                        className="h-11 px-4 rounded-none font-black text-[11px] uppercase tracking-widest gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-l border-slate-100"
                                    >
                                        <Wallet className="h-4 w-4" />
                                        <span>Step 1 <span className="text-[10px] opacity-60 ml-1 font-bold">Fund {phaseNameText}</span></span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Step 1: Perform Funding Transaction (Bank → Clearing)</TooltipContent>
                            </Tooltip>
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={handleGlobalToSheet}
                                    disabled={performingAction}
                                    className="h-11 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                                >
                                    {performingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                                    <span>Step 2 <span className="text-[10px] opacity-60 ml-1 font-bold">To Sheet ({phaseNameText})</span></span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Step 2: Sync list to Google Sheet for Auto-transfer</TooltipContent>
                        </Tooltip>

                        <div className="flex bg-emerald-600 rounded-xl shadow-md overflow-hidden">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={requestGlobalConfirm}
                                        disabled={performingAction}
                                        className="h-11 px-4 rounded-none font-black text-[11px] uppercase tracking-widest gap-2 bg-transparent text-white hover:bg-emerald-700 border-r border-emerald-500"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Step 3 <span className="text-[10px] opacity-80 ml-1 font-bold">Confirm ({phaseNameText})</span></span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Step 3: Bulk Confirm (Match/Verify Transfer Status)</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleGlobalUnconfirm}
                                        disabled={performingAction}
                                        className="h-11 px-3 rounded-none bg-transparent hover:bg-emerald-700 text-emerald-100"
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reset / Undo all Step 3 confirmations</TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                </div>
            </div>

            {/* Checklist View */}
            <div className="grid md:grid-cols-2 gap-8">
                {(!period || period === 'before') && (
                    <PeriodSection
                        title="Phase 1: Before Cutoff"
                        subtitle="Targets expiring 1st - 15th"
                        items={itemsByPeriod.before}
                        monthYear={selectedMonth}
                        period="before"
                        bankType={bankType}
                        onUpdate={handleFastRefresh}
                        isStandalone={!!period}
                        isSelected={selectedPhase === 'before'}
                        onToggle={() => setSelectedPhase('before')}
                        currentBatch={batches?.find((b: any) => b.id === itemsByPeriod.before.find((i: any) => i.batch_id)?.batch_id)}
                        selectedItemIds={selectedItemIds}
                        setSelectedItemIds={setSelectedItemIds}
                    />
                )}
                {(!period || period === 'after') && (
                    <PeriodSection
                        title="Phase 2: After Cutoff"
                        subtitle="Targets expiring 16th - End"
                        items={itemsByPeriod.after}
                        monthYear={selectedMonth}
                        period="after"
                        bankType={bankType}
                        onUpdate={handleFastRefresh}
                        isStandalone={!!period}
                        isSelected={selectedPhase === 'after'}
                        onToggle={() => setSelectedPhase('after')}
                        currentBatch={batches?.find((b: any) => b.id === itemsByPeriod.after.find((i: any) => i.batch_id)?.batch_id)}
                        selectedItemIds={selectedItemIds}
                        setSelectedItemIds={setSelectedItemIds}
                    />
                )}
            </div>

            <AlertDialog open={confirmFundOpen} onOpenChange={setConfirmFundOpen}>
                <AlertDialogContent className="rounded-2xl max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black text-xl flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-indigo-500" />
                            Fund {phaseNameText}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium pt-2">
                            You are about to transfer <strong>{formatShortVietnameseCurrency(currentPhaseItems.reduce((sum: number, i: any) => sum + Math.abs(i.amount || 0), 0))}</strong> from your local account to the System Batch account.
                            <br /><br />
                            This step marks the official money deduction for this phase. Next, you should send the details to the Google Sheet.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleGlobalFund} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700">
                            Yes, Fund It
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmStep3Open} onOpenChange={setConfirmStep3Open}>
                <AlertDialogContent className="rounded-2xl max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black text-xl flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                            Confirm {phaseNameText}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium pt-2">
                            This will lock <strong>{selectedItemIds.size > 0 ? selectedItemIds.size : currentPhaseItems.filter((i: any) => i.batch_item_id && i.status !== 'confirmed').length} items</strong> in this phase and mark them as CONFIRMED.
                            <br /><br />
                            Make sure all external banking transfers are successfully processed. Once confirmed, these transactions will be permanently synced.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="rounded-xl font-bold">Re-check</AlertDialogCancel>
                        <AlertDialogAction onClick={handleGlobalConfirm} className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700">
                            Confirm All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Guide Hint Area */}
            <BatchFlowGuide currentPhaseItems={currentPhaseItems} batches={batches} selectedMonth={selectedMonth} selectedPhase={selectedPhase} />
        </div>
    )
}

function PeriodSection({ title, subtitle, items, monthYear, period, bankType, onUpdate, isStandalone, isSelected, onToggle, currentBatch, selectedItemIds, setSelectedItemIds }: any) {
    const [searchQuery, setSearchQuery] = useState('')
    const totalConfirmed = items.filter((i: any) => i.status === 'confirmed').length
    const progress = items.length > 0 ? (totalConfirmed / items.length) * 100 : 0

    const totalAmount = items.reduce((sum: number, i: any) => sum + Math.abs(i.amount || 0), 0)

    return (
        <div
            onClick={onToggle}
            className={cn(
                "space-y-4 p-4 rounded-3xl transition-all cursor-pointer border-2",
                isStandalone ? "md:col-span-2" : "",
                isSelected ? "bg-white border-indigo-100 shadow-sm" : "bg-slate-50 border-transparent grayscale-[0.3]"
            )}
        >
            <div className="flex flex-col gap-1.5 px-2">
                {/* Line 1: Status Icon + Title + Amount + Progress Count */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "h-7 w-7 rounded-xl border-2 flex items-center justify-center transition-all",
                                isSelected ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100 ring-2 ring-indigo-50" : "bg-white border-slate-200"
                            )}>
                                {isSelected ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Circle className="h-3 w-3 text-slate-300" />}
                            </div>

                            {isSelected && items.length > 0 && (
                                <div
                                    className="h-7 w-px bg-slate-200 mx-1"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}

                            {isSelected && items.length > 0 && (
                                <div
                                    className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-slate-100 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Select All Pending"
                                >
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm transition-transform active:scale-90"
                                        checked={items.filter((i: any) => i.batch_item_id && i.status !== 'confirmed').length > 0 &&
                                            items.filter((i: any) => i.batch_item_id && i.status !== 'confirmed').every((i: any) => selectedItemIds.has(i.batch_item_id))}
                                        onChange={(e) => {
                                            const pendingIds = items.filter((i: any) => i.batch_item_id && i.status !== 'confirmed').map((i: any) => i.batch_item_id);
                                            const next = new Set(selectedItemIds);
                                            if (e.target.checked) {
                                                pendingIds.forEach((id: string) => next.add(id));
                                            } else {
                                                pendingIds.forEach((id: string) => next.delete(id));
                                            }
                                            setSelectedItemIds(next);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="flex items-center gap-2 font-black text-slate-900 tracking-tight text-lg leading-tight">
                                {title}
                                {items[0]?.batch_id && (
                                    <Link
                                        href={`/batch/detail/${items[0].batch_id}`}
                                        target="_blank"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                                        title="Open Phase Details"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Link>
                                )}
                                <div className="ml-2 scale-90 origin-left">
                                    <StyledVietnameseCurrency amount={totalAmount} />
                                </div>
                                {items.length > 0 && totalConfirmed < items.length && (
                                    <Badge variant="destructive" className="ml-auto h-6 px-2 rounded-full text-[10px] font-black shadow-sm bg-rose-500 hover:bg-rose-600 text-white animate-pulse">
                                        {items.length - totalConfirmed} left
                                    </Badge>
                                )}
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onUpdate}
                            className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-all hover:rotate-180 duration-500"
                            title="Force Refresh Data"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <div className="text-right">
                            <span className="text-xl font-black text-slate-900">{totalConfirmed}</span>
                            <span className="text-slate-300 font-bold mx-1">/</span>
                            <span className="text-xs font-bold text-slate-400">{items.length}</span>
                        </div>
                    </div>
                </div>

                {/* Line 2: Subtitle + Styled Text Amount */}
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
                </div>
            </div>

            {isSelected && items.length > 0 && (
                <div className="px-2 pt-2 pb-1 relative">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search in this phase..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="pl-9 pr-9 h-10 bg-slate-50 border-slate-200 rounded-xl focus:bg-white text-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                                <XCircle className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {currentBatch?.funding_transaction && isSelected && (
                <Link href={`/transactions?highlight=${currentBatch.funding_transaction.id}`} target="_blank" className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 mt-2 flex items-center gap-3 shadow-inner hover:bg-indigo-50 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <Wallet className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">
                            Funding Txn (Step 1)
                        </div>
                        <div className="text-xs font-bold text-slate-700 truncate flex items-center gap-1.5">
                            {currentBatch.funding_transaction.account?.name || 'Local Bank'}
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            {currentBatch.funding_transaction.target_account?.name || 'Clearing'}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-sm font-black text-indigo-900 leading-none">
                            {currentBatch.funding_transaction.amount?.toLocaleString()} ₫
                        </div>
                        <div className="text-[9px] font-bold text-indigo-400/80 mt-1">
                            {new Date(currentBatch.funding_transaction.occurred_at).toLocaleDateString('vi-VN')}
                        </div>
                    </div>
                </Link>
            )}

            {items.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400">
                    <ShoppingBag className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">No matching targets</p>
                </div>
            ) : (
                <div
                    onClick={(e) => e.stopPropagation()} // Prevent row click from toggling phase
                    className={cn(
                        "grid gap-3 transition-opacity duration-300",
                        isStandalone ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1",
                        !isSelected && "opacity-60 pointer-events-none"
                    )}
                >
                    {items.map((item: any) => {
                        let isHighlighted = false;
                        if (searchQuery) {
                            const query = searchQuery.toLowerCase()
                            isHighlighted = (
                                item.receiver_name?.toLowerCase().includes(query) ||
                                item.bank_name?.toLowerCase().includes(query) ||
                                item.bank_number?.toLowerCase().includes(query) ||
                                item.accounts?.name?.toLowerCase().includes(query)
                            );
                        }
                        return (
                            <ChecklistItemRow
                                key={item.id}
                                item={item}
                                monthYear={monthYear}
                                period={period}
                                bankType={bankType}
                                onUpdate={onUpdate}
                                isHighlighted={isHighlighted}
                                isSearchActive={!!searchQuery}
                                isSelected={item.batch_item_id ? selectedItemIds.has(item.batch_item_id) : false}
                                onSelect={(id: string, checked: boolean) => {
                                    const next = new Set(selectedItemIds)
                                    if (checked) next.add(id)
                                    else next.delete(id)
                                    setSelectedItemIds(next)
                                }}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function ChecklistItemRow({ item, monthYear, period, bankType, onUpdate, isHighlighted, isSearchActive, isSelected, onSelect }: any) {
    const [amount, setAmount] = useState(item.amount > 0 ? item.amount.toString() : '')
    const [saving, setSaving] = useState(false)

    // Update local state when item changes from props
    useEffect(() => {
        setAmount(item.amount > 0 ? item.amount.toString() : '')
    }, [item.amount, item.id])

    async function handleUpdate(val: string) {
        if (item.status === 'confirmed') {
            toast.error('Item is already confirmed. Please unconfirm (void) it first to change the amount.')
            setAmount(item.amount.toString()) // Reset local state
            return
        }
        const numVal = parseInt(val.replace(/\D/g, '')) || 0
        setSaving(true)
        try {
            await upsertBatchItemAmountAction({
                monthYear,
                period,
                bankType,
                masterItemId: item.id,
                amount: numVal,
                receiverName: item.receiver_name,
                bankNumber: item.bank_number,
                bankName: item.bank_name,
                targetAccountId: item.target_account_id
            })
            // Feedback
            toast.success(`Updated ${item.receiver_name}`, { duration: 1000 })
            if (onUpdate) onUpdate()
        } catch (e) {
            toast.error('Update failed')
        } finally {
            setSaving(false)
        }
    }

    async function handleToggleConfirm() {
        if (!item.batch_item_id) {
            toast.error('Sync Master first to confirm items')
            return
        }
        setSaving(true)
        try {
            const result = await toggleBatchItemConfirmAction({
                batchItemId: item.batch_item_id,
                currentStatus: item.status
            })
            if (result.success) {
                if (onUpdate) onUpdate()
            }
        } catch (e) {
            toast.error('Toggle failed')
        } finally {
            setSaving(false)
        }
    }

    const formatCurrency = (val: string) => {
        if (!val) return ''
        return parseInt(val).toLocaleString()
    }

    return (
        <div className={cn(
            "group relative flex items-center gap-3 p-3 border rounded-2xl transition-all",
            isHighlighted ? "bg-yellow-50 border-yellow-300 shadow-sm" :
                item.status === 'confirmed' ? "bg-indigo-50/10 border-indigo-200 shadow-indigo-100/20 shadow-md" : "bg-white border-slate-100 hover:border-slate-300 shadow-sm",
            isSearchActive && !isHighlighted && "opacity-30 grayscale"
        )}>
            {/* Checkbox for Bulk Actions */}
            {item.batch_item_id && item.status !== 'confirmed' && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect(item.batch_item_id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                />
            )}

            {/* Status Icon - Toggle Confirm */}
            {item.status === 'confirmed' && item.transaction_id ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link
                                href={`/transactions?highlight=${item.transaction_id}`}
                                target="_blank"
                                className="shrink-0 outline-none flex items-center justify-center p-1 rounded-full hover:bg-emerald-50 transition-colors"
                            >
                                <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 ring-2 ring-emerald-50">
                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                </div>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                            Item Confirmed. Click to view transaction detail.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleToggleConfirm}
                                disabled={saving}
                                className="shrink-0 outline-none flex items-center justify-center p-1 rounded-full hover:bg-slate-50 transition-colors"
                            >
                                {saving ? (
                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                                ) : item.status === 'confirmed' ? (
                                    <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 ring-2 ring-indigo-50">
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                ) : (
                                    <div className="h-6 w-6 rounded-full border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center transition-all bg-white group-hover:border-slate-400">
                                        <CheckCircle2 className="h-4 w-4 text-slate-200 group-hover:text-slate-300 transition-colors" />
                                    </div>
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {item.status === 'confirmed' ? "Item Confirmed. Click to Uncheck/Revert." : "Item Pending. Click to Quick Confirm (Single Mode)."}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {item.accounts?.image_url ? (
                <div className="shrink-0 h-10 w-10 overflow-hidden bg-slate-50 flex items-center justify-center">
                    <img src={item.accounts.image_url} alt="" className="w-full h-full object-contain" />
                </div>
            ) : (
                <div className="shrink-0 h-10 w-10 bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400">
                    {item.bank_name?.substring(0, 2)}
                </div>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 truncate tracking-tight uppercase text-xs">
                        {item.receiver_name}
                    </span>
                    {item.bank_code ? (
                        <Badge className="bg-indigo-600 text-white border-none rounded-none px-1 text-[8px] font-black h-3.5 uppercase tracking-tighter">
                            {item.bank_code}
                        </Badge>
                    ) : (
                        <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none rounded-sm px-1 text-[9px] font-bold h-3.5">
                            {item.bank_name}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    {item.accounts && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <ArrowRight className="h-2.5 w-2.5" />
                            <Link
                                href={`/accounts/${item.target_account_id}`}
                                target="_blank"
                                className="text-indigo-600/70 hover:underline hover:text-indigo-800 transition-colors truncate max-w-[80px]"
                            >
                                {item.accounts.name}
                            </Link>
                            {item.note && (
                                <span className="ml-1 text-slate-300 font-medium italic truncate max-w-[60px]">
                                    • {item.note}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Input Side */}
            <div className="relative shrink-0 flex flex-col items-end gap-1">
                <div className="relative w-40">
                    <Input
                        value={amount === '' ? '' : formatCurrency(amount)}
                        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                        style={{ paddingRight: '2.5rem' }}
                        disabled={item.status === 'confirmed'}
                        onBlur={() => {
                            if (item.status === 'confirmed') return
                            if (parseInt(amount || '0') !== item.amount) {
                                handleUpdate(amount)
                            }
                        }}
                        placeholder="0"
                        className={cn(
                            "w-full h-10 text-right font-black text-slate-900 border-slate-200 focus:ring-indigo-500 rounded-xl",
                            amount && parseInt(amount) > 0 ? "bg-indigo-50/30 text-indigo-700 font-black" : "",
                            item.status === 'confirmed' && "opacity-70 bg-slate-50 cursor-not-allowed border-slate-100"
                        )}
                    />
                    {saving && (
                        <div className="absolute top-1/2 right-2 -translate-y-1/2">
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                        </div>
                    )}
                </div>
                {amount && parseInt(amount) > 0 ? (
                    <div className="text-[10px] text-slate-400 font-bold pr-1 uppercase tracking-widest">
                        {formatShortVietnameseCurrency(parseInt(amount))}
                    </div>
                ) : null}
            </div>

            {/* Link to TXN (Specifically requested) */}
            {item.status === 'confirmed' && item.transaction_id && (
                <Link
                    href={`/transactions?highlight=${item.transaction_id}`}
                    target="_blank"
                    className="shrink-0 h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-white transition-all shadow-sm group/search ml-1"
                    title="View Transaction"
                >
                    <Search className="h-3.5 w-3.5 group-hover/search:scale-110 transition-transform" />
                </Link>
            )}

            {/* Float Action (Edit Master) */}
            <button className="absolute -top-1.5 -right-1.5 h-6 w-6 bg-white border border-slate-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md transition-opacity hover:bg-slate-50 z-10">
                <Edit2 className="h-3 w-3 text-slate-400" />
            </button>
        </div>
    )
}

function BatchFlowGuide({ currentPhaseItems, batches, selectedMonth, selectedPhase }: any) {
    const totalItems = currentPhaseItems?.length || 0;
    const confirmedCount = currentPhaseItems?.filter((i: any) => i.status === 'confirmed').length || 0;
    const currentBatchId = currentPhaseItems.find((i: any) => i.batch_id)?.batch_id;
    const currentBatch = batches?.find((b: any) => b.id === currentBatchId);
    const hasFunded = Boolean(currentBatch?.funding_transaction_id);

    // Determine current active step (0, 1, 2, 3, 3.1, 3.2)
    let currentStep = 0;
    if (totalItems > 0) {
        if (!hasFunded) {
            currentStep = 1;
        } else if (hasFunded && confirmedCount === 0) {
            currentStep = 2;
        } else if (hasFunded && confirmedCount < totalItems) {
            currentStep = 3.1;
        } else if (confirmedCount === totalItems) {
            currentStep = 3.2;
        }
    }

    const StepIcon = ({ step, isCurrent }: { step: number, isCurrent: boolean }) => {
        if (isCurrent) {
            return (
                <div className="relative">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-pink-500 animate-bounce">
                        👉
                    </div>
                    <div className="w-7 h-7 shrink-0 bg-pink-500 text-white font-black rounded-full flex items-center justify-center text-[11px] shadow-md ring-4 ring-pink-100">
                        {step}
                    </div>
                </div>
            )
        }
        return (
            <div className={cn(
                "w-6 h-6 shrink-0 font-bold rounded-full flex items-center justify-center text-[10px]",
                (step === 3 || step === 3.1 || step === 3.2) ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-500"
            )}>
                {step === 3.1 ? "3.1" : step === 3.2 ? "3.2" : step}
            </div>
        )
    }

    return (
        <div className="mt-8 bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 relative overflow-hidden">
            {currentStep === 3 && (
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCircle2 className="w-32 h-32 text-emerald-500" />
                </div>
            )}
            <h3 className="flex items-center gap-2 font-black text-indigo-900 mb-4 tracking-tight">
                <Info className="h-5 w-5 text-indigo-500" />
                Hướng dẫn luồng Batch (Quy trình tiêu chuẩn)
            </h3>
            <div className="space-y-4 text-sm text-indigo-900/80 leading-relaxed font-medium relative z-10">
                <div className={cn("flex gap-3 transition-opacity", currentStep === 0 ? "opacity-100" : "opacity-50")}>
                    <StepIcon step={0} isCurrent={currentStep === 0} />
                    <div>
                        <strong className="text-indigo-900">Sync Master:</strong> Khởi tạo dữ liệu. Hệ thống sẽ bốc toàn bộ các Master Items (các lệnh chuyển khoản định kỳ) đổ vào danh sách của tháng này.
                    </div>
                </div>
                <div className={cn("flex gap-3 transition-opacity", currentStep === 1 ? "opacity-100" : "opacity-50")}>
                    <StepIcon step={1} isCurrent={currentStep === 1} />
                    <div>
                        <strong className="text-indigo-900">Step 1: Fund (Bơm tiền):</strong> Hệ thống sẽ rút tiền từ tài khoản Ngân hàng tương ứng và chuyển sang tài khoản trung gian Trạm cân Batch. Lúc này Transaction Rút tiền chính thức được ghi nhận!
                    </div>
                </div>
                <div className={cn("flex gap-3 transition-opacity", currentStep === 2 ? "opacity-100" : "opacity-50")}>
                    <StepIcon step={2} isCurrent={currentStep === 2} />
                    <div>
                        <strong className="text-indigo-900">Step 2: To Sheet (Xuất Sheet):</strong> Hệ thống đẩy toàn bộ danh sách chuyển khoản lên Google Sheets. Sau đó, Google Apps Script sẽ đọc và thực hiện chuyển tiền tự động.
                    </div>
                </div>
                <div className={cn("flex gap-3 transition-opacity", currentStep === 3.1 ? "opacity-100" : "opacity-50")}>
                    <StepIcon step={3.1} isCurrent={currentStep === 3.1} />
                    <div>
                        <strong className="text-emerald-900">Step 3.1: Processing (Đang xử lý):</strong> Một vài items đã được gạch bỏ (Confirm). Hệ thống đang thực hiện chuyển đổi từng phần. Tiếp tục cho đến khi hoàn tất 100%.
                    </div>
                </div>
                <div className={cn("flex gap-3 transition-opacity", currentStep === 3.2 ? "opacity-100" : "opacity-50")}>
                    <StepIcon step={3.2} isCurrent={currentStep === 3.2} />
                    <div>
                        <strong className="text-emerald-700">Step 3.2: Done (Hoàn tất):</strong> Toàn bộ danh sách đã được đối soát và ghi nhận thành công! Kỳ Batch này coi như kết thúc mỹ mãn.
                    </div>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-100 text-xs text-indigo-600/70 font-bold relative z-10">
                * Note tự động đã được cấu hình: Tên + Before/After + Tháng/Năm + Bank (Vd: "Vcb Signature Before Feb2026 by Mbb").
            </div>
        </div>
    )
}


function StyledVietnameseCurrency({ amount }: { amount: number }) {
    if (!amount) return null
    const parts = formatVietnameseCurrencyText(amount)
    return (
        <div className="flex flex-col items-start leading-none gap-0.5">
            <div className="text-[14px] font-medium text-rose-600 tracking-tight">
                {amount.toLocaleString()} <span className="text-[11px] opacity-70">₫</span>
            </div>
            <div className="flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-tight opacity-60">
                <span className="text-slate-400 mr-0.5">(</span>
                {parts.map((p, i) => (
                    <React.Fragment key={i}>
                        <span className="text-rose-600">{p.value}</span>
                        {p.unit !== 'đồng' && (
                            <span className="text-blue-500 ml-0.5 mr-1 lowercase">{p.unit}</span>
                        )}
                        {p.unit === 'đồng' && i === parts.length - 1 && parts.length > 1 && <span className="mx-0.5"></span>}
                    </React.Fragment>
                ))}
                <span className="text-slate-400 ml-0.5">)</span>
            </div>
        </div>
    )
}
