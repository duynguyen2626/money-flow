'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RotateCcw, CheckCircle2, Circle, Loader2, Calendar, ArrowRight, Wallet, ShoppingBag, Edit2, XCircle, Info, ExternalLink, ThumbsUp, MapPin, RefreshCw, FileSpreadsheet, Search, ChevronDown, ChevronRight, Check, AlertCircle, Settings, Plus } from 'lucide-react'
import { getChecklistDataAction } from '@/actions/batch-checklist.actions'
import { upsertBatchItemAmountAction, bulkInitializeFromMasterAction, toggleBatchItemConfirmAction, bulkConfirmBatchItemsAction, bulkUnconfirmBatchItemsAction } from '@/actions/batch-speed.actions'
import { fundBatchAction, sendBatchToSheetAction } from '@/actions/batch.actions'
import { listAllBatchPhasesAction, createBatchPhaseAction, deleteBatchPhaseAction } from '@/actions/batch-phases.actions'
import { Select } from '@/components/ui/select'
import { DayOfMonthPicker } from '@/components/ui/day-of-month-picker'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { formatShortVietnameseCurrency, formatVietnameseCurrencyText } from '@/lib/number-to-text'
import { Combobox } from '@/components/ui/combobox'
import Link from 'next/link'
import { differenceInDays, format, startOfDay } from 'date-fns'

interface BatchMasterChecklistProps {
    bankType: 'MBB' | 'VIB'
    accounts: any[]
    period?: 'before' | 'after'
    monthYear?: string
}

export function BatchMasterChecklist({ bankType, accounts, period, monthYear }: BatchMasterChecklistProps) {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1 // 1-12
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

    const [selectedMonth, setSelectedMonth] = useState(monthYear || currentMonthStr)
    const [masterItems, setMasterItems] = useState<any[]>([])
    const [batches, setBatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [phases, setPhases] = useState<any[]>([])
    const [showPhaseSetup, setShowPhaseSetup] = useState(false)
    const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
    const [openPhaseId, setOpenPhaseId] = useState<string | null>(null)
    const [performingAction, setPerformingAction] = useState(false)
    const [confirmFundOpen, setConfirmFundOpen] = useState(false)
    const [confirmStep3Open, setConfirmStep3Open] = useState(false)
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())

    // Guard: skip focus-refresh during initial load
    const loadedOnce = React.useRef(false)

    // Auto-refresh when tab gains focus (e.g. after voiding txn in another tab)
    useEffect(() => {
        const handleFocus = () => {
            if (!loadedOnce.current) return
            getChecklistDataAction(bankType, currentYear).then(result => {
                if (result.success && result.data) {
                    setMasterItems(result.data.masterItems || [])
                    setBatches(result.data.batches || [])
                    setPhases(result.data.phases || [])
                }
            }).catch(() => {})
        }
        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [bankType, currentYear])

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
    const [itemsByPhase, setItemsByPhase] = useState<Record<string, any[]>>({})

    // Effective phases: use phases from DB, or fall back to 2 synthetic phases if none configured
    const effectivePhases = phases.length > 0 ? phases : [
        { id: 'before', bank_type: bankType, label: 'Phase 1: Before', period_type: 'before', cutoff_day: 15, sort_order: 0, is_active: true },
        { id: 'after', bank_type: bankType, label: 'Phase 2: After', period_type: 'after', cutoff_day: 15, sort_order: 1, is_active: true }
    ]
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
    }, [selectedMonth, masterItems, batches, phases])

    async function loadData() {
        setLoading(true)
        try {
            const result = await getChecklistDataAction(bankType, currentYear)
            if (result.success && result.data) {
                setMasterItems(result.data.masterItems || [])
                setBatches(result.data.batches || [])
                const loadedPhases = result.data.phases || []
                setPhases(loadedPhases)
                if (!selectedPhaseId) {
                    const firstId = loadedPhases.length > 0 ? loadedPhases[0].id : 'before'
                    setSelectedPhaseId(firstId)
                    setOpenPhaseId(firstId)
                }
            }
        } catch (error) {
            console.error('Failed to load checklist data', error)
        } finally {
            loadedOnce.current = true
            setLoading(false)
        }
    }

    async function handleFastRefresh() {
        try {
            const result = await getChecklistDataAction(bankType, currentYear)
            if (result.success && result.data) {
                setMasterItems(result.data.masterItems || [])
                setBatches(result.data.batches || [])
                setPhases(result.data.phases || [])
            }
        } catch (error) {
            console.error('Fast refresh failed', error)
        }
    }

    function refreshChecklist() {
        if (!masterItems.length) return

        // Use DB phases or fall back to synthetic Phase 1/2
        const activePhases = phases.length > 0 ? phases : [
            { id: 'before', bank_type: bankType, label: 'Phase 1: Before', period_type: 'before', cutoff_day: 15, sort_order: 0 },
            { id: 'after', bank_type: bankType, label: 'Phase 2: After', period_type: 'after', cutoff_day: 15, sort_order: 1 }
        ]

        const byPhase: Record<string, any[]> = {}

        // Initialize empty arrays for each phase
        activePhases.forEach((phase: any) => {
            byPhase[phase.id] = []
        })

        masterItems.forEach(master => {
            // Determine which phase this master item belongs to
            let phaseId = master.phase_id

            // Fallback: match by cutoff_period → phase.period_type
            if (!phaseId) {
                const matchedPhase = activePhases.find((p: any) => p.period_type === master.cutoff_period && p.bank_type === bankType)
                if (matchedPhase) phaseId = matchedPhase.id
            }

            if (!phaseId || !byPhase[phaseId]) return

            // Find matching batch for this phase + month
            const phase = activePhases.find((p: any) => p.id === phaseId)
            const periodBatches = batches.filter(b =>
                b.month_year === selectedMonth &&
                b.bank_type === bankType &&
                (b.phase_id === phaseId || b.period === phase?.period_type ||
                    b.name?.toLowerCase().includes(phase?.period_type === 'before' ? 'early' : 'late'))
            )

            const targetBatch = periodBatches[0]
            const existingItem = targetBatch?.batch_items?.find((bi: any) => bi.master_item_id === master.id)

            byPhase[phaseId].push({
                ...master,
                amount: existingItem?.amount || 0,
                status: existingItem?.status || 'none',
                batch_item_id: existingItem?.id,
                batch_id: targetBatch?.id,
                transaction_id: existingItem?.transaction_id
            })
        })

        setItemsByPhase(byPhase)
    }

    async function handleGlobalSync() {
        setPerformingAction(true)
        try {
            const currentPhase = effectivePhases.find((p: any) => p.id === selectedPhaseId)
            const result = await bulkInitializeFromMasterAction({
                monthYear: selectedMonth,
                period: currentPhase?.period_type || 'before',
                bankType,
                phaseId: selectedPhaseId || undefined
            })
            if (result.success) toast.success(`${currentPhase?.label || 'Phase'} synced: ${result.initializedCount} items`)
            handleFastRefresh()
        } catch (e) {
            toast.error('Sync failed')
        } finally {
            setPerformingAction(false)
        }
    }

    function requestGlobalFund() {
        const items = selectedPhaseId ? (itemsByPhase[selectedPhaseId] || []) : []
        const bId = items.find((i: any) => i.batch_id)?.batch_id
        const totalAmount = items.reduce((sum: number, i: any) => sum + Math.abs(i.amount || 0), 0)
        const currentPhase = effectivePhases.find((p: any) => p.id === selectedPhaseId)

        if (!bId) {
            toast.error(`Sync Master for ${currentPhase?.label || 'this phase'} first`)
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
        const currentPhase = effectivePhases.find((p: any) => p.id === selectedPhaseId)
        toast.info(`Process: Starting Fund Allocation...`, { id: 'fund-process' })
        try {
            const items = selectedPhaseId ? (itemsByPhase[selectedPhaseId] || []) : []
            const bId = items.find((i: any) => i.batch_id)?.batch_id

            const result = await fundBatchAction(bId, fundSourceAccountId)
            if (result.transactionId) {
                toast.success(`${currentPhase?.label || 'Phase'} funded successfully`, { id: 'fund-process', duration: 4000 })
                toast.message('Next recommended step:', {
                    description: 'Wait a moment, then click Step 2: To Sheet.'
                })
            } else if (result.status === 'already_funded') {
                toast.success(`${currentPhase?.label || 'Phase'} is already fully funded. Txn ID: ${result.transactionId || 'Found'}`, { id: 'fund-process', duration: 4000 })
            } else {
                toast.info(`${currentPhase?.label || 'Phase'} fund status: ${result.status}`, { id: 'fund-process' })
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
            const items = selectedPhaseId ? (itemsByPhase[selectedPhaseId] || []) : []
            const currentPhase = effectivePhases.find((p: any) => p.id === selectedPhaseId)
            const bId = items.find((i: any) => i.batch_id)?.batch_id
            const totalAmount = items.reduce((sum: number, i: any) => sum + Math.abs(i.amount || 0), 0)

            if (!bId) {
                toast.error(`Sync Master for ${currentPhase?.label || 'this phase'} first`)
                setPerformingAction(false)
                return
            }
            if (totalAmount === 0) {
                toast.error('Cannot send Phase with 0 amount to sheet')
                setPerformingAction(false)
                return
            }

            toast.promise(sendBatchToSheetAction(bId), {
                loading: `Sending ${currentPhase?.label || 'phase'} to Google Sheets...`,
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
            const items = selectedPhaseId ? (itemsByPhase[selectedPhaseId] || []) : []
            const currentPhase = effectivePhases.find((p: any) => p.id === selectedPhaseId)
            const confirmedItems = items.filter((i: any) => i.status === 'confirmed')
            const itemIds = confirmedItems.map((i: any) => i.batch_item_id).filter(Boolean)

            if (itemIds.length === 0) {
                toast.info(`No confirmed items to uncheck in ${currentPhase?.label || 'this phase'}`)
                setPerformingAction(false)
                return
            }

            const bId = items.find((i: any) => i.batch_id)?.batch_id
            if (bId) {
                const result = await bulkUnconfirmBatchItemsAction(bId, itemIds)
                if (result.success) toast.success(`Unchecked ${result.count} items in ${currentPhase?.label || 'phase'}`)
                handleFastRefresh()
            }
        } catch (e) {
            toast.error('Unconfirm error')
        } finally {
            setPerformingAction(false)
        }
    }

    function requestGlobalConfirm() {
        const items = selectedPhaseId ? (itemsByPhase[selectedPhaseId] || []) : []
        const currentPhase = effectivePhases.find((p: any) => p.id === selectedPhaseId)

        if (selectedItemIds.size > 0) {
            const selectedItems = items.filter((i: any) => i.batch_item_id && selectedItemIds.has(i.batch_item_id))
            const alreadyConfirmed = selectedItems.filter((i: any) => i.status === 'confirmed')
            const pendingSelected = selectedItems.filter((i: any) => i.status !== 'confirmed')

            if (alreadyConfirmed.length > 0 && pendingSelected.length === 0) {
                toast.info(`${alreadyConfirmed.length} item(s) already confirmed — nothing to do`, { duration: 3000 })
                setSelectedItemIds(new Set())
                return
            }
            if (alreadyConfirmed.length > 0) {
                toast.info(`Skipping ${alreadyConfirmed.length} already-confirmed item(s)`, { duration: 2500 })
            }
            if (pendingSelected.length === 0) {
                toast.info('No valid selected items to confirm')
                return
            }
        } else {
            const pendingItems = items.filter((i: any) => i.batch_item_id && i.status !== 'confirmed')
            if (pendingItems.length === 0) {
                toast.info(`No pending items to confirm in ${currentPhase?.label || 'this phase'}`)
                return
            }
        }

        const bId = items.find((i: any) => i.batch_id)?.batch_id
        if (!bId) {
            toast.error(`Sync Master for ${currentPhase?.label || 'this phase'} first`)
        } else {
            setConfirmStep3Open(true)
        }
    }

    async function handleGlobalConfirm() {
        setConfirmStep3Open(false)
        setPerformingAction(true)
        try {
            const items = selectedPhaseId ? (itemsByPhase[selectedPhaseId] || []) : []
            const currentPhase = effectivePhases.find((p: any) => p.id === selectedPhaseId)

            // If items are selected via checkboxes, use only pending ones. Otherwise all pending.
            const itemsToProcess = selectedItemIds.size > 0
                ? items.filter((i: any) => i.batch_item_id && selectedItemIds.has(i.batch_item_id) && i.status !== 'confirmed')
                : items.filter((i: any) => i.batch_item_id && i.status !== 'confirmed')

            const itemIds = itemsToProcess.map((i: any) => i.batch_item_id).filter(Boolean)
            const bId = items.find((i: any) => i.batch_id)?.batch_id

            const result = await bulkConfirmBatchItemsAction(bId, itemIds)
            if (result.success) {
                toast.success(`Confirmed ${result.count} items in ${currentPhase?.label || 'phase'}`)
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

    const selectedPhase = effectivePhases.find((p: any) => p.id === selectedPhaseId)
    const phaseNameText = selectedPhase?.label || 'Phase'

    const currentPhaseItems = selectedPhaseId ? (itemsByPhase[selectedPhaseId] || []) : []
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
                        {phaseNameText}
                    </div>
                    <div className={cn("px-3 h-10 flex items-center gap-2 rounded-xl font-black uppercase tracking-tighter text-[10px] shadow-sm border border-black/5", phaseStatusColor)}>
                        <PhaseStatusIcon className="h-3.5 w-3.5" />
                        Status: {phaseStatusLabel}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPhaseSetup(v => !v)}
                        className={cn(
                            "h-8 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest gap-1.5 transition-colors",
                            showPhaseSetup
                                ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                                : phases.length === 0
                                    ? "bg-amber-50 text-amber-500 hover:bg-amber-100 border border-amber-200"
                                    : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Settings className="h-3.5 w-3.5" />
                        {showPhaseSetup ? 'Close' : 'Phases'}
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
            {/* Inline Phase Setup Panel */}
            {showPhaseSetup && (
                <PhaseSetupPanel
                    bankType={bankType}
                    onSaved={() => { setShowPhaseSetup(false); loadData() }}
                />
            )}

            {/* Summary Overview Strip */}
            {!period && (
                <PhaseSummaryStrip
                    phases={effectivePhases}
                    itemsByPhase={itemsByPhase}
                    batches={batches}
                    openPhaseId={openPhaseId}
                    selectedPhaseId={selectedPhaseId}
                    onToggle={(phaseId: string) => {
                        setOpenPhaseId(prev => prev === phaseId ? null : phaseId)
                        setSelectedPhaseId(phaseId)
                    }}
                />
            )}

            {/* Accordion Sections */}
            <div className="space-y-4">
                {effectivePhases.map((phase: any) => (
                    <PeriodSection
                        key={phase.id}
                        title={phase.label}
                        subtitle={phase.period_type === 'before' ? `Targets due 1st - ${phase.cutoff_day}` : `Targets due ${phase.cutoff_day + 1} - End`}
                        phase={phase}
                        items={itemsByPhase[phase.id] || []}
                        monthYear={selectedMonth}
                        period={phase.period_type}
                        bankType={bankType}
                        onUpdate={handleFastRefresh}
                        isStandalone={!!period}
                        isSelected={selectedPhaseId === phase.id}
                        isOpen={openPhaseId === phase.id}
                        onToggleOpen={() => {
                            setOpenPhaseId(prev => prev === phase.id ? null : phase.id)
                            setSelectedPhaseId(phase.id)
                        }}
                        currentBatch={batches?.find((b: any) => b.id === (itemsByPhase[phase.id] || []).find((i: any) => i.batch_id)?.batch_id)}
                        selectedItemIds={selectedItemIds}
                        setSelectedItemIds={setSelectedItemIds}
                    />
                ))}
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
            <BatchFlowGuide currentPhaseItems={currentPhaseItems} batches={batches} selectedMonth={selectedMonth} selectedPhase={selectedPhase?.period_type || 'before'} />
        </div>
    )
}

function PhaseSummaryStrip({ phases, itemsByPhase, batches, openPhaseId, selectedPhaseId, onToggle }: any) {
    function PhaseCard({ phase, items, batch, isOpen, isSelected, onToggle: onCardToggle }: any) {
        const totalConfirmed = items.filter((i: any) => i.status === 'confirmed').length
        const totalAmount = items.reduce((sum: number, i: any) => sum + Math.abs(i.amount || 0), 0)
        const progress = items.length > 0 ? (totalConfirmed / items.length) * 100 : 0
        const allDone = items.length > 0 && totalConfirmed === items.length
        const remaining = items.length - totalConfirmed
        const isFunded = !!batch?.funding_transaction

        return (
            <button
                type="button"
                onClick={onCardToggle}
                className={cn(
                    "flex flex-col gap-3 p-4 rounded-2xl border-2 text-left w-full transition-all",
                    isSelected
                        ? "bg-white border-indigo-200 shadow-sm shadow-indigo-100/60"
                        : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                )}
            >
                {/* Top row: label + chevron */}
                <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm tracking-tight">{phase.label}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {phase.period_type === 'before' ? `Due 1st - ${phase.cutoff_day}` : `Due ${phase.cutoff_day + 1} - End`}
                        </span>
                    </div>
                    <div className={cn(
                        "h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ml-auto",
                        isSelected ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                    )}>
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-500", allDone ? "bg-emerald-500" : "bg-indigo-500")}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {totalAmount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] font-black text-indigo-700 tracking-tight shrink-0">
                            {totalAmount.toLocaleString()}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-widest shrink-0">
                        {totalConfirmed}/{items.length}
                    </span>
                    {items.length > 0 && (
                        allDone ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-black text-emerald-600 uppercase tracking-widest shrink-0">
                                <CheckCircle2 className="h-3 w-3" /> Done
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-[10px] font-black text-rose-500 uppercase tracking-widest shrink-0 animate-pulse">
                                {remaining} left
                            </span>
                        )
                    )}
                    {isFunded && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-600 uppercase tracking-widest shrink-0">
                            <Wallet className="h-3 w-3" /> Funded
                        </span>
                    )}
                </div>
            </button>
        )
    }

    const gridCols = phases.length <= 2 ? 'grid-cols-2' : phases.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'

    return (
        <div className={cn("grid gap-4", gridCols)}>
            {phases.map((phase: any) => {
                const items = itemsByPhase[phase.id] || []
                const batch = batches?.find((b: any) => b.id === items.find((i: any) => i.batch_id)?.batch_id)
                return (
                    <PhaseCard
                        key={phase.id}
                        phase={phase}
                        items={items}
                        batch={batch}
                        isOpen={openPhaseId === phase.id}
                        isSelected={selectedPhaseId === phase.id}
                        onToggle={() => onToggle(phase.id)}
                    />
                )
            })}
        </div>
    )
}

function PeriodSection({ title, subtitle, phase, items, monthYear, period, bankType, onUpdate, isStandalone, isSelected, isOpen, onToggleOpen, currentBatch, selectedItemIds, setSelectedItemIds }: any) {
    const [searchQuery, setSearchQuery] = useState('')
    const totalConfirmed = items.filter((i: any) => i.status === 'confirmed').length
    const progress = items.length > 0 ? (totalConfirmed / items.length) * 100 : 0
    const totalAmount = items.reduce((sum: number, i: any) => sum + Math.abs(i.amount || 0), 0)
    const allDone = items.length > 0 && totalConfirmed === items.length
    const remaining = items.length - totalConfirmed

    return (
        <div className={cn(
            "border rounded-2xl bg-white overflow-hidden shadow-sm transition-all",
            isSelected ? "border-indigo-300 shadow-indigo-100/60" : "border-slate-200"
        )}>
            {/* Accordion Header — always visible */}
            <div
                role="button"
                tabIndex={0}
                onClick={onToggleOpen}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleOpen(); } }}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
            >
                {/* Chevron indicator */}
                <div className={cn(
                    "shrink-0 h-6 w-6 rounded-lg flex items-center justify-center transition-colors",
                    isSelected ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                )}>
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>

                {/* Title + subtitle */}
                <div className="flex flex-col min-w-0 shrink-0">
                    <span className="font-black text-slate-900 tracking-tight text-sm leading-tight flex items-center gap-1.5">
                        {title}
                        {items[0]?.batch_id && (
                            <Link
                                href={`/batch/detail/${items[0].batch_id}`}
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                                className="p-0.5 hover:bg-slate-100 rounded text-slate-300 hover:text-indigo-500 transition-colors"
                            >
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        )}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</span>
                </div>

                {/* Amount pill — center of bar */}
                {totalAmount > 0 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 shrink-0 ml-1">
                        <span className="text-sm font-black text-indigo-700 tracking-tight">
                            {totalAmount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-0.5 text-[9px] font-bold tracking-tight">
                            {formatVietnameseCurrencyText(totalAmount).filter(p => p.unit !== 'đồng').map((p, i) => (
                                <React.Fragment key={i}>
                                    <span className="text-rose-500 font-black">{p.value}</span>
                                    <span className="text-blue-500 lowercase ml-0.5 mr-1">{p.unit}</span>
                                </React.Fragment>
                            ))}
                        </span>
                    </div>
                )}

                {/* Funding compact pill */}
                {currentBatch?.funding_transaction && (
                    <Link
                        href={`/transactions?highlight=${currentBatch.funding_transaction.id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl shrink-0 hover:bg-indigo-100 transition-colors"
                    >
                        <Wallet className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span className="text-[11px] font-black text-indigo-700 tracking-tight">Funded</span>
                    </Link>
                )}

                <div className="flex-1" />

                {/* Right badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Progress badge */}
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-widest">
                        {totalConfirmed}/{items.length}
                    </span>
                    {/* Status badge */}
                    {items.length > 0 && (
                        allDone ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-600 uppercase tracking-widest">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Done
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-black text-rose-500 uppercase tracking-widest animate-pulse">
                                {remaining} left
                            </span>
                        )
                    )}
                </div>

                {/* Refresh button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onUpdate(); }}
                    className="h-8 w-8 p-0 rounded-full hover:bg-slate-200 text-slate-300 hover:text-indigo-600 transition-all hover:rotate-180 duration-500 shrink-0"
                    title="Force Refresh"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Collapsible Body */}
            {isOpen && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
                    {/* Controls row: select-all + search */}
                    {items.length > 0 && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 shrink-0" title="Select All Pending">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={
                                        items.filter((i: any) => i.batch_item_id && i.status !== 'confirmed').length > 0 &&
                                        items.filter((i: any) => i.batch_item_id && i.status !== 'confirmed').every((i: any) => selectedItemIds.has(i.batch_item_id))
                                    }
                                    onChange={(e) => {
                                        const pendingIds = items.filter((i: any) => i.batch_item_id && i.status !== 'confirmed').map((i: any) => i.batch_item_id)
                                        const next = new Set(selectedItemIds)
                                        if (e.target.checked) pendingIds.forEach((id: string) => next.add(id))
                                        else pendingIds.forEach((id: string) => next.delete(id))
                                        setSelectedItemIds(next)
                                    }}
                                />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">All</span>
                            </div>
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    placeholder="Search in this phase..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-9 h-9 bg-slate-50 border-slate-200 rounded-xl text-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        <XCircle className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Progress bar */}
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full transition-all duration-500", allDone ? "bg-emerald-500" : "bg-indigo-500")}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Funding transaction full detail card */}
                    {currentBatch?.funding_transaction && (
                        <Link
                            href={`/transactions?highlight=${currentBatch.funding_transaction.id}`}
                            target="_blank"
                            className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3 hover:bg-indigo-50 transition-colors"
                        >
                            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                <Wallet className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Funding Txn (Step 1)</div>
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

                    {/* Items list */}
                    {items.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl text-slate-400">
                            <ShoppingBag className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">No matching targets</p>
                        </div>
                    ) : (
                        <div className={cn(
                            "grid gap-3",
                            isStandalone ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
                        )}>
                            {[...items].sort((a: any, b: any) => {
                                const getDaysLeft = (item: any) => {
                                    const dueDay = item.accounts?.due_date as number | undefined
                                    if (!dueDay) return Infinity
                                    const now = new Date()
                                    const d = new Date()
                                    d.setDate(dueDay)
                                    d.setHours(0, 0, 0, 0)
                                    if (d < startOfDay(now)) d.setMonth(d.getMonth() + 1)
                                    return differenceInDays(d, startOfDay(now))
                                }
                                return getDaysLeft(a) - getDaysLeft(b)
                            }).map((item: any) => {
                                let isHighlighted = false
                                if (searchQuery) {
                                    const query = searchQuery.toLowerCase()
                                    isHighlighted = (
                                        item.receiver_name?.toLowerCase().includes(query) ||
                                        item.bank_name?.toLowerCase().includes(query) ||
                                        item.bank_number?.toLowerCase().includes(query) ||
                                        item.accounts?.name?.toLowerCase().includes(query)
                                    )
                                }
                                return (
                                    <ChecklistItemRow
                                        key={item.id}
                                        item={item}
                                        phase={phase}
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
            )}
        </div>
    )
}

function ChecklistItemRow({ item, phase, monthYear, period, bankType, onUpdate, isHighlighted, isSearchActive, isSelected, onSelect }: any) {
    const [amount, setAmount] = useState(item.amount > 0 ? item.amount.toString() : '')
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    // Update local state when item changes from props
    useEffect(() => {
        setAmount(item.amount > 0 ? item.amount.toString() : '')
    }, [item.amount, item.id])

    async function handleUpdate(val: string) {
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
            toast.success(`Updated ${item.receiver_name}`, { duration: 1000 })

            // Nếu item đã confirmed → re-fund để cập nhật funding transaction
            if (item.status === 'confirmed' && item.batch_id) {
                try {
                    await fundBatchAction(item.batch_id)
                    toast.info('Funding đã được cập nhật. Nhớ re-send lên Sheet nhé!', { duration: 5000 })
                } catch {
                    toast.warning('Amount đã lưu. Vui lòng bấm Re-Fund và Re-Send Sheet.', { duration: 5000 })
                }
            }

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

    const dueDay = item.accounts?.due_date as number | undefined
    let dueBadge: { label: string; daysLeft: number } | null = null
    let isDueMismatch = false
    if (dueDay) {
        const now = new Date()
        const d = new Date()
        d.setDate(dueDay)
        d.setHours(0, 0, 0, 0)
        if (d < startOfDay(now)) d.setMonth(d.getMonth() + 1)
        const daysLeft = differenceInDays(d, startOfDay(now))
        dueBadge = { label: format(d, 'dd MMM').toUpperCase(), daysLeft }

        // Phase-aware mismatch check
        if (phase) {
            isDueMismatch = phase.period_type === 'before'
                ? dueDay > phase.cutoff_day
                : dueDay <= phase.cutoff_day
        }
    }

    return (
        <div className={cn(
            "group relative flex items-center gap-3 p-3 border rounded-2xl transition-all",
            isHighlighted ? "bg-yellow-50 border-yellow-300 shadow-sm" :
                item.status === 'confirmed' ? "bg-indigo-50/10 border-indigo-200 shadow-indigo-100/20 shadow-md" :
                dueBadge && dueBadge.daysLeft <= 3 ? "bg-white border-rose-200 shadow-rose-100/40 shadow-md ring-1 ring-rose-100" :
                dueBadge && dueBadge.daysLeft <= 7 ? "bg-white border-amber-200 shadow-amber-50/30 shadow-sm" :
                "bg-white border-slate-100 hover:border-slate-300 shadow-sm",
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
                <div className="flex items-center gap-2 flex-wrap">
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
                    {dueBadge && (
                        <span className={cn(
                            "inline-flex items-center gap-1 text-[9px] font-black rounded-md px-1.5 py-0.5 uppercase tracking-widest shrink-0",
                            isDueMismatch
                                ? "bg-amber-50 text-amber-500 border border-amber-200"
                                : dueBadge.daysLeft <= 3
                                ? "bg-rose-50 text-rose-500 border border-rose-200 animate-pulse"
                                : dueBadge.daysLeft <= 7
                                ? "bg-amber-50 text-amber-600 border border-amber-200"
                                : "bg-slate-50 text-slate-400 border border-slate-100"
                        )}>
                            <Calendar className="h-2.5 w-2.5" />
                            {dueBadge.label} · {dueBadge.daysLeft}d
                        </span>
                    )}
                    {isDueMismatch && (
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-500 uppercase tracking-wider">
                            <AlertCircle className="h-2.5 w-2.5" /> Wrong phase
                        </span>
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
                <div className="flex items-center gap-1.5">
                    <div className="relative w-36">
                        {isEditing ? (
                            <Input
                                autoFocus
                                value={amount === '' ? '' : formatCurrency(amount)}
                                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                                onBlur={() => {
                                    if (parseInt(amount || '0') !== item.amount) {
                                        handleUpdate(amount)
                                    }
                                    setIsEditing(false)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (parseInt(amount || '0') !== item.amount) handleUpdate(amount)
                                        setIsEditing(false)
                                    }
                                    if (e.key === 'Escape') {
                                        setAmount(item.amount > 0 ? item.amount.toString() : '')
                                        setIsEditing(false)
                                    }
                                }}
                                placeholder="0"
                                className={cn(
                                    "w-full h-10 text-right font-black text-slate-900 border-slate-200 focus:ring-indigo-500 rounded-xl",
                                    amount && parseInt(amount) > 0 ? "bg-indigo-50/30 text-indigo-700" : "",
                                    item.status === 'confirmed' ? "border-amber-300 focus:ring-amber-400" : ""
                                )}
                            />
                        ) : (
                            <div className={cn(
                                "w-full h-10 flex items-center justify-end pr-3 rounded-xl font-black border",
                                amount && parseInt(amount) > 0
                                    ? "text-indigo-700 border-indigo-100 bg-indigo-50/20"
                                    : "text-slate-300 border-slate-100 bg-slate-50/30",
                                item.status === 'confirmed' && "opacity-70"
                            )}>
                                {amount && parseInt(amount) > 0 ? formatCurrency(amount) : <span className="text-slate-300 font-medium text-sm">—</span>}
                            </div>
                        )}
                        {saving && (
                            <div className="absolute top-1/2 right-2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                            </div>
                        )}
                    </div>
                    {/* Search icon — always visible, active only when confirmed + has txn */}
                    {item.status === 'confirmed' && item.transaction_id ? (
                        <Link
                            href={`/transactions?highlight=${item.transaction_id}`}
                            target="_blank"
                            className="shrink-0 h-8 w-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-white transition-all shadow-sm group/search"
                            title="View Transaction"
                        >
                            <Search className="h-3.5 w-3.5 group-hover/search:scale-110 transition-transform" />
                        </Link>
                    ) : (
                        <div className="shrink-0 h-8 w-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200 cursor-not-allowed">
                            <Search className="h-3.5 w-3.5" />
                        </div>
                    )}
                    {/* Edit icon */}
                    {!saving && (
                        <button
                            onClick={() => {
                                if (isEditing && parseInt(amount || '0') !== item.amount) {
                                    handleUpdate(amount)
                                }
                                setIsEditing(v => !v)
                            }}
                            className={cn(
                                "h-8 w-8 rounded-xl flex items-center justify-center transition-all border border-transparent",
                                item.status === 'confirmed'
                                    ? "text-amber-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200"
                                    : "text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100"
                            )}
                            title={isEditing ? 'Save amount' : item.status === 'confirmed' ? 'Sửa amount (đã confirm — fund & sheet sẽ được cập nhật)' : 'Edit amount'}
                        >
                            {isEditing ? <Check className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
                        </button>
                    )}
                </div>
                {amount && parseInt(amount) > 0 ? (
                    <div className="text-[10px] text-slate-400 font-bold pr-1 uppercase tracking-widest">
                        {formatShortVietnameseCurrency(parseInt(amount))}
                    </div>
                ) : null}
            </div>
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

function PhaseSetupPanel({ bankType, onSaved }: {
    bankType: 'MBB' | 'VIB'
    onSaved: () => void
}) {
    const [dlPhases, setDlPhases] = useState<any[]>([])
    const [dlLoading, setDlLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [newLabel, setNewLabel] = useState('')
    const [newPeriodType, setNewPeriodType] = useState<string | undefined>('before')
    const [newCutoffDay, setNewCutoffDay] = useState<number | null>(15)

    useEffect(() => { loadPhases() }, [])

    async function loadPhases() {
        setDlLoading(true)
        const result = await listAllBatchPhasesAction(bankType)
        if (result.success) setDlPhases((result as any).data || [])
        setDlLoading(false)
    }

    async function handleAddPhase() {
        if (!newLabel.trim()) { toast.error('Nhập tên phase'); return }
        if (!newPeriodType) { toast.error('Chọn loại Before / After'); return }
        if (!newCutoffDay) { toast.error('Chọn ngày cutoff'); return }
        setAdding(true)
        const result = await createBatchPhaseAction({
            bankType,
            label: newLabel.trim(),
            periodType: newPeriodType as 'before' | 'after',
            cutoffDay: newCutoffDay
        })
        if (result.success) {
            toast.success(`Phase "${newLabel.trim()}" đã tạo`)
            setNewLabel('')
            setNewPeriodType('before')
            setNewCutoffDay(15)
            await loadPhases()
        } else {
            toast.error('Tạo phase thất bại — kiểm tra migration đã được apply chưa')
        }
        setAdding(false)
    }

    async function handleDelete(id: string, label: string) {
        if (!window.confirm(`Xoá phase "${label}"?`)) return
        const result = await deleteBatchPhaseAction(id)
        if (result.success) {
            toast.success(`Đã xoá "${label}"`)
            await loadPhases()
        } else {
            toast.error('Xoá thất bại')
        }
    }

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-indigo-500" />
                        Phase Setup — {bankType}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Items tự phân vào phase dựa trên due date</p>
                </div>
                {dlPhases.length > 0 && (
                    <Button
                        onClick={onSaved}
                        size="sm"
                        className="h-8 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                        <Check className="h-3.5 w-3.5" /> Apply
                    </Button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Current Phases */}
                {dlLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                    </div>
                ) : dlPhases.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {dlPhases.map((p: any) => (
                            <div key={p.id} className={cn(
                                "inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl border",
                                p.is_active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-50"
                            )}>
                                <span className={cn(
                                    "h-2 w-2 rounded-full shrink-0",
                                    p.period_type === 'before' ? "bg-blue-500" : "bg-orange-500"
                                )} />
                                <span className="font-black text-xs text-slate-800">{p.label}</span>
                                <span className="text-[9px] font-bold text-slate-400">Day {p.cutoff_day}</span>
                                <button
                                    onClick={() => handleDelete(p.id, p.label)}
                                    className="h-5 w-5 rounded-md flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                >
                                    <XCircle className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 font-medium text-center py-2">Chưa có phase nào. Thêm ít nhất 2 phase (Before + After).</p>
                )}

                {/* Add New Phase — compact row */}
                <div className="flex items-end gap-2 flex-wrap">
                    <div className="flex-1 min-w-[140px]">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tên Phase</label>
                        <Input
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddPhase()}
                            placeholder="VD: Phase 1: Before 15"
                            className="h-9 rounded-xl text-sm font-medium"
                        />
                    </div>
                    <div className="w-[130px]">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Loại</label>
                        <Select
                            value={newPeriodType}
                            onValueChange={(val) => val && setNewPeriodType(val)}
                            items={[
                                { value: 'before', label: 'Before (trước)' },
                                { value: 'after', label: 'After (sau)' }
                            ]}
                            placeholder="Chọn..."
                            className="h-9 rounded-xl text-xs font-bold"
                        />
                    </div>
                    <div className="w-[100px]">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ngày Cutoff</label>
                        <DayOfMonthPicker
                            value={newCutoffDay}
                            onChange={(day) => setNewCutoffDay(day)}
                            className="h-9 rounded-xl text-xs font-bold"
                        />
                    </div>
                    <Button
                        onClick={handleAddPhase}
                        disabled={adding || !newLabel.trim()}
                        className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shrink-0"
                    >
                        {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Add
                    </Button>
                </div>
            </div>
        </div>
    )
}
