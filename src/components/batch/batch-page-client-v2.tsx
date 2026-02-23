'use client'

import { useState, useEffect, useTransition } from 'react'
import { MonthTabs } from '@/components/batch/month-tabs'
import { BatchList } from '@/components/batch/batch-list-simple'
import { BatchDetail } from '@/components/batch/batch-detail'
import { BatchSettingsSlide } from '@/components/batch/batch-settings-slide'
import { BatchMasterChecklist } from '@/components/batch/BatchMasterChecklist'
import { BatchMasterSlide } from '@/components/batch/BatchMasterSlide'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Settings, Sparkles, Database, Loader2, RefreshCw, ExternalLink } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { syncMasterOldBatchesAction } from '@/actions/batch.actions'

interface BatchPageClientV2Props {
    batches: any[]
    accounts: any[]
    bankMappings: any[]
    webhookLinks: any[]
    bankType: string
    activeBatch?: any
    activeInstallmentAccounts?: string[]
    cutoffDay?: number
    globalSheetUrl?: string | null
    globalSheetName?: string | null
}

export function BatchPageClientV2({
    batches,
    accounts,
    bankMappings,
    webhookLinks,
    bankType,
    activeBatch,
    activeInstallmentAccounts,
    cutoffDay = 15,
    globalSheetUrl,
    globalSheetName
}: BatchPageClientV2Props) {
    const router = useRouter()
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [templateOpen, setTemplateOpen] = useState(false)

    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
    const [isSyncingMaster, setIsSyncingMaster] = useState(false)
    const [loadingMonth, setLoadingMonth] = useState<string | null>(null)

    const searchParams = useSearchParams()
    const selectedMonthParam = searchParams.get('month')
    const selectedPeriodParam = searchParams.get('period') || 'before'

    // Current active month is derived from activeBatch or search param
    const currentMonth = activeBatch ? activeBatch.month_year : selectedMonthParam || null
    const currentPeriod = activeBatch ? (activeBatch.period || 'before') : selectedPeriodParam

    const [optimisticMonth, setOptimisticMonth] = useState<string | null>(currentMonth)

    useEffect(() => {
        setOptimisticMonth(currentMonth)
    }, [currentMonth])

    useEffect(() => {
        if (!isPending) {
            setLoadingMonth(null)
            setOptimisticMonth(currentMonth)
        }
    }, [isPending, currentMonth])

    const monthBatches = batches.filter(b => b.month_year === currentMonth)
    const beforeBatchSummary = monthBatches.find(b => b.period === 'before' || !b.period)
    const afterBatchSummary = monthBatches.find(b => b.period === 'after')

    const visibleBatches = batches.filter(b => b.is_archived)

    const statsBefore = {
        total: beforeBatchSummary?.total_items || 0,
        confirmed: beforeBatchSummary?.confirmed_items || 0
    }
    const statsAfter = {
        total: afterBatchSummary?.total_items || 0,
        confirmed: afterBatchSummary?.confirmed_items || 0
    }

    async function handleStartBatch() {
        if (!selectedMonthParam) {
            toast.error('Please select a month first')
            return
        }

        // Implicitly create batch for the selected month
        const date = new Date(selectedMonthParam + '-01')
        const monthBaseName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        const monthName = `${monthBaseName} (${currentPeriod === 'before' ? `Before ${cutoffDay}` : `After ${cutoffDay}`})`

        try {
            const { createFreshBatchAction } = await import('@/actions/batch-create.actions')
            const result = await createFreshBatchAction({
                monthYear: selectedMonthParam,
                monthName,
                bankType: bankType as 'MBB' | 'VIB'
            })

            if (result.success) {
                // Update the batch to have the corresponding period
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                await supabase.from('batches').update({ period: currentPeriod }).eq('id', result.data.id)

                toast.success(`Started batch for ${monthName}`)
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to start batch')
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to create batch')
        }
    }

    function handleMonthSelect(month: string) {
        if (month === currentMonth) return;
        setLoadingMonth(month)
        setOptimisticMonth(month)
        startTransition(() => {
            router.push(`/batch/${bankType.toLowerCase()}?month=${month}&period=${currentPeriod}`)
        })
    }

    function handlePeriodSelect(period: string) {
        if (currentMonth) {
            startTransition(() => {
                router.push(`/batch/${bankType.toLowerCase()}?month=${currentMonth}&period=${period}`)
            })
        }
    }

    function formatMonthTitle(monthYear: string) {
        if (!monthYear) return ''
        const [year, month] = monthYear.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthIndex = parseInt(month, 10) - 1
        return `${monthNames[monthIndex]} ${year}`
    }

    async function handleSyncMasterOldBatches() {
        setIsSyncingMaster(true)
        try {
            const res = await syncMasterOldBatchesAction()
            if (res?.success) {
                toast.success(`Synched! P: ${res.processedFunds}, I: ${res.processedItems}`)
                router.refresh()
            } else {
                toast.error('Failed to sync master')
            }
        } catch (e: any) {
            toast.error(e.message || 'Error syncing')
        } finally {
            setIsSyncingMaster(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Premium Header - Non-sticky as requested */}
            <div className="bg-white border-b border-slate-200 z-50 shadow-sm">
                <div className="w-full px-6 py-3">
                    <div className="flex items-center justify-between gap-4">
                        {/* LEFT: LOGO, BANK TYPE & PROGRESS */}
                        <div className="flex items-center gap-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-xl shadow-sm border",
                                    bankType === 'MBB' ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-purple-50 border-purple-100 text-purple-600"
                                )}>
                                    <Database className="h-5 w-5" />
                                </div>
                                <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">
                                    {bankType} Batch
                                </h1>
                            </div>

                            <div className="h-8 w-px bg-slate-100 mx-2 hidden md:block" />

                            <div className="bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 flex items-center gap-3">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Total Progress</span>
                                <span className="text-sm font-black text-indigo-700 leading-none">
                                    {batches.reduce((acc, b) => acc + (b.confirmed_items || 0), 0)}/{batches.reduce((acc, b) => acc + (b.total_items || 0), 0)}
                                </span>
                            </div>
                        </div>

                        {/* RIGHT: MONTH TABS & ACTIONS */}
                        <div className="flex items-center gap-4 flex-1 justify-end min-w-0">
                            <div className="flex gap-1 py-1 pr-4 border-r border-slate-100 overflow-x-auto no-scrollbar">
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const monthNum = i + 1
                                    const year = new Date().getFullYear()
                                    const mStr = `${year}-${String(monthNum).padStart(2, '0')}`
                                    const isActive = optimisticMonth === mStr
                                    const isCurrent = new Date().getMonth() + 1 === monthNum

                                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                                    const isLoading = loadingMonth === mStr

                                    const monthBatchesStats = batches.filter(b => b.month_year === mStr)
                                    const mTotal = monthBatchesStats.reduce((acc, b) => acc + (b.total_items || 0), 0)
                                    const mConfirmed = monthBatchesStats.reduce((acc, b) => acc + (b.confirmed_items || 0), 0)

                                    return (
                                        <button
                                            key={mStr}
                                            onClick={() => handleMonthSelect(mStr)}
                                            className={cn(
                                                "flex flex-col items-center justify-center min-w-[48px] h-11 rounded-lg transition-all border shrink-0",
                                                isActive
                                                    ? "bg-slate-900 border-slate-900 text-white shadow-md"
                                                    : isCurrent
                                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                                        : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-[7px] font-black tracking-widest uppercase mb-0.5",
                                                isActive ? "text-slate-400" : "text-blue-500/80"
                                            )}>
                                                {year}
                                            </span>
                                            <span className="text-[11px] font-black tracking-tight leading-none flex items-center gap-1">
                                                {isLoading && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                                                {monthNames[monthNum - 1]}
                                            </span>
                                            {mTotal > 0 && (
                                                <div className={cn(
                                                    "text-[6px] font-black mt-1 px-1 rounded-sm",
                                                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {mConfirmed}/{mTotal}
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="flex items-center gap-2">
                                {globalSheetUrl && (
                                    <a
                                        href={globalSheetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-10 px-3 flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all font-black text-[9px] uppercase tracking-widest shadow-sm shrink-0"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        <span>Sheet</span>
                                    </a>
                                )}
                                <Button
                                    onClick={() => setTemplateOpen(true)}
                                    variant="outline"
                                    className="h-10 px-3 rounded-xl border-slate-200 hover:bg-slate-50 font-black text-[9px] uppercase tracking-widest gap-2 text-indigo-600 bg-indigo-50/10 border-indigo-100 shrink-0"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    <span>Masters</span>
                                </Button>
                                <Button
                                    onClick={() => setSettingsOpen(true)}
                                    variant="outline"
                                    className="h-10 px-3 rounded-xl border-slate-200 hover:bg-slate-50 font-black text-[9px] uppercase tracking-widest gap-2 shrink-0"
                                >
                                    <Settings className="h-4 w-4 text-slate-400" />
                                    <span>Config</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-slate-50">
                {activeTab === 'active' ? (
                    <div className="mx-auto px-6 py-6 max-w-[1600px] w-full">
                        {(bankType === 'MBB' || bankType === 'VIB') ? (
                            <div className="space-y-6">
                                {isPending ? (
                                    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                                        <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                        <p className="font-medium text-sm">Loading data for {optimisticMonth}...</p>
                                    </div>
                                ) : (
                                    <BatchMasterChecklist
                                        bankType={bankType as 'MBB' | 'VIB'}
                                        accounts={accounts}
                                        monthYear={currentMonth || ''}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {currentMonth && (
                                    <div className="flex justify-center mb-6">
                                        <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
                                            <Button
                                                variant={currentPeriod === 'before' ? 'secondary' : 'ghost'}
                                                onClick={() => handlePeriodSelect('before')}
                                                disabled={isPending}
                                                className={cn(
                                                    "rounded-lg transition-all h-12 px-6",
                                                    currentPeriod === 'before' ? "bg-indigo-50 shadow-sm border border-indigo-100" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                                )}
                                            >
                                                <div className="flex flex-col items-start justify-center gap-0.5">
                                                    <span className={cn("text-sm font-bold", currentPeriod === 'before' ? "text-indigo-700" : "text-slate-600")}>Before Cutoff</span>
                                                    <span className={cn(
                                                        "text-[10px] uppercase font-black tracking-wider",
                                                        currentPeriod === 'before' ? "text-indigo-500/80" : "text-slate-400"
                                                    )}>
                                                        {isPending && currentPeriod !== 'before' ? <Loader2 className="h-3 w-3 animate-spin py-0.5" /> : `1 - ${cutoffDay} • ${statsBefore.confirmed}/${statsBefore.total} Items`}
                                                    </span>
                                                </div>
                                            </Button>
                                            <Button
                                                variant={currentPeriod === 'after' ? 'secondary' : 'ghost'}
                                                onClick={() => handlePeriodSelect('after')}
                                                disabled={isPending}
                                                className={cn(
                                                    "rounded-lg transition-all h-12 px-6",
                                                    currentPeriod === 'after' ? "bg-indigo-50 shadow-sm border border-indigo-100" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                                )}
                                            >
                                                <div className="flex flex-col items-start justify-center gap-0.5">
                                                    <span className={cn("text-sm font-bold", currentPeriod === 'after' ? "text-indigo-700" : "text-slate-600")}>After Cutoff</span>
                                                    <span className={cn(
                                                        "text-[10px] uppercase font-black tracking-wider",
                                                        currentPeriod === 'after' ? "text-indigo-500/80" : "text-slate-400"
                                                    )}>
                                                        {isPending && currentPeriod !== 'after' ? <Loader2 className="h-3 w-3 animate-spin py-0.5" /> : `${cutoffDay + 1} - END • ${statsAfter.confirmed}/${statsAfter.total} Items`}
                                                    </span>
                                                </div>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {activeBatch ? (
                                    <BatchDetail
                                        batch={activeBatch}
                                        accounts={accounts}
                                        bankMappings={bankMappings}
                                        webhookLinks={webhookLinks}
                                        activeInstallmentAccounts={activeInstallmentAccounts}
                                        cutoffDay={cutoffDay}
                                        globalSheetUrl={globalSheetUrl}
                                        globalSheetName={globalSheetName}
                                    />
                                ) : (
                                    // Empty State
                                    <div className="text-center py-20">
                                        <h3 className="text-lg font-medium text-slate-900">
                                            {selectedMonthParam ? `Empty Month: ${selectedMonthParam}` : 'No active batch selected'}
                                        </h3>
                                        <p className="text-slate-500 mb-6">
                                            {selectedMonthParam
                                                ? 'No items in this month yet. Start adding items to create the batch.'
                                                : 'Select a month or start a new one.'}
                                        </p>
                                        <Button onClick={handleStartBatch} size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            {selectedMonthParam ? 'Start Adding Items' : 'Start New Month'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    // Archive View - List
                    <div className="container mx-auto px-4 py-6">
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Archived Batches</h2>
                            <BatchList
                                batches={visibleBatches}
                                mode="done"
                                accounts={accounts}
                                webhookLinks={webhookLinks}
                            />
                        </div>
                    </div>
                )}
            </div>

            <BatchSettingsSlide
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
            />

            <BatchMasterSlide
                open={templateOpen}
                onOpenChange={setTemplateOpen}
                bankType={bankType as any}
                accounts={accounts}
                bankMappings={bankMappings}
            />
        </div >
    )
}
