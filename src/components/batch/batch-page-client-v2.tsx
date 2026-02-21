'use client'

import { useState, useEffect, useTransition } from 'react'
import { MonthTabs } from '@/components/batch/month-tabs'
import { BatchList } from '@/components/batch/batch-list-simple'
import { BatchDetail } from '@/components/batch/batch-detail'
import { CreateMonthDialog } from '@/components/batch/create-month-dialog'
import { QuickEntryModal } from '@/components/batch/quick-entry-modal'
import { Button } from '@/components/ui/button'
import { Settings, Sparkles, Database, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BatchPageClientV2Props {
    batches: any[]
    accounts: any[]
    bankMappings: any[]
    webhookLinks: any[]
    bankType: string
    activeBatch?: any
    activeInstallmentAccounts?: string[]
    cutoffDay?: number
}

export function BatchPageClientV2({
    batches,
    accounts,
    bankMappings,
    webhookLinks,
    bankType,
    activeBatch,
    activeInstallmentAccounts,
    cutoffDay = 15
}: BatchPageClientV2Props) {
    const router = useRouter()
    const [createMonthOpen, setCreateMonthOpen] = useState(false)
    const [quickEntryOpen, setQuickEntryOpen] = useState(false)
    const [quickEntryData, setQuickEntryData] = useState<{
        sourceBatchId: string
        monthYear: string
        monthName: string
    } | null>(null)

    const [isPending, startTransition] = useTransition()

    // State for tabs
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')

    // Prepare visible batches for MonthTabs
    const visibleBatches = batches.filter(b =>
        activeTab === 'active' ? !b.is_archived : b.is_archived
    )

    const searchParams = useSearchParams()
    const selectedMonthParam = searchParams.get('month')
    const selectedPeriodParam = searchParams.get('period') || 'before'

    // Current active month is derived from activeBatch or search param
    const currentMonth = activeBatch ? activeBatch.month_year : selectedMonthParam || null
    const currentPeriod = activeBatch ? (activeBatch.period || 'before') : selectedPeriodParam

    async function handleStartBatch() {
        if (!selectedMonthParam) {
            setCreateMonthOpen(true)
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
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const monthIndex = parseInt(month, 10) - 1
        return `${monthNames[monthIndex]} ${year}`
    }

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Premium Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-6 py-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={cn(
                                    "p-1.5 rounded-md",
                                    bankType === 'MBB' ? "bg-blue-100" : "bg-purple-100"
                                )}>
                                    <Database className={cn(
                                        "h-5 w-5",
                                        bankType === 'MBB' ? "text-blue-600" : "text-purple-600"
                                    )} />
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Batch Processing</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                {bankType} <span className="text-slate-300 font-light">/</span> {currentMonth ? formatMonthTitle(currentMonth) : 'Overview'}
                            </h1>
                            <p className="text-slate-500 font-medium">
                                Managing global transfers and reconciliation for {bankType} bank.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex">
                                <Button
                                    variant={activeTab === 'active' ? 'secondary' : 'ghost'}
                                    onClick={() => setActiveTab('active')}
                                    size="sm"
                                    className={cn(
                                        "rounded-lg font-bold text-xs h-9 px-4 transition-all",
                                        activeTab === 'active' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"
                                    )}
                                >
                                    Active
                                </Button>
                                <Button
                                    variant={activeTab === 'archived' ? 'secondary' : 'ghost'}
                                    onClick={() => setActiveTab('archived')}
                                    size="sm"
                                    className={cn(
                                        "rounded-lg font-bold text-xs h-9 px-4 transition-all",
                                        activeTab === 'archived' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500"
                                    )}
                                >
                                    Archived
                                </Button>
                            </div>

                            <Link href="/batch/settings">
                                <Button variant="outline" className="h-11 rounded-xl border-slate-200 hover:bg-slate-50 font-bold gap-2">
                                    <Settings className="h-4 w-4 text-slate-400" />
                                    <span>Settings</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Month Tabs */}
            <MonthTabs
                batches={visibleBatches}
                bankType={bankType as 'MBB' | 'VIB'}
                onCreateMonth={() => setCreateMonthOpen(true)}
                value={currentMonth}
                onValueChange={handleMonthSelect}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-slate-50">
                {activeTab === 'active' ? (
                    <div className="container mx-auto px-4 py-6">
                        {currentMonth && (
                            <div className="flex justify-center mb-6">
                                <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
                                    <Button
                                        variant={currentPeriod === 'before' ? 'secondary' : 'ghost'}
                                        onClick={() => handlePeriodSelect('before')}
                                        disabled={isPending}
                                        className={cn(
                                            "rounded-lg font-bold text-sm h-10 px-6 transition-all",
                                            currentPeriod === 'before' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        Before Cutoff
                                        <span className={cn("ml-2 text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md", currentPeriod === 'before' ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400")}>
                                            {isPending && currentPeriod !== 'before' ? <Loader2 className="h-3 w-3 animate-spin" /> : `1 - ${cutoffDay}`}
                                        </span>
                                    </Button>
                                    <Button
                                        variant={currentPeriod === 'after' ? 'secondary' : 'ghost'}
                                        onClick={() => handlePeriodSelect('after')}
                                        disabled={isPending}
                                        className={cn(
                                            "rounded-lg font-bold text-sm h-10 px-6 transition-all",
                                            currentPeriod === 'after' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        After Cutoff
                                        <span className={cn("ml-2 text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md", currentPeriod === 'after' ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400")}>
                                            {isPending && currentPeriod !== 'after' ? <Loader2 className="h-3 w-3 animate-spin" /> : `${cutoffDay + 1} - END`}
                                        </span>
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

            {/* CreateMonthDialog */}
            <CreateMonthDialog
                open={createMonthOpen}
                onOpenChange={setCreateMonthOpen}
                bankType={bankType as 'MBB' | 'VIB'}
                previousMonths={batches
                    .map(b => b.month_year)
                    .filter((v, i, a) => v && a.indexOf(v) === i)
                    .sort((a, b) => b.localeCompare(a))
                }
                onCreateFresh={async (monthYear, monthName) => {
                    const { createFreshBatchAction } = await import('@/actions/batch-create.actions')
                    const result = await createFreshBatchAction({
                        monthYear,
                        monthName,
                        bankType: bankType as 'MBB' | 'VIB'
                    })

                    if (result.success) {
                        toast.success(`Batch created: ${monthName}`)
                        setCreateMonthOpen(false)
                        // Refresh to show
                        router.refresh()
                    } else {
                        toast.error(result.error || 'Failed to create batch')
                    }
                }}
                onCreateClone={(monthYear, monthName, sourceMonth) => {
                    const sourceBatch = batches.find(b => b.month_year === sourceMonth)
                    if (sourceBatch) {
                        setQuickEntryData({
                            sourceBatchId: sourceBatch.id,
                            monthYear,
                            monthName
                        })
                        setCreateMonthOpen(false)
                        setQuickEntryOpen(true)
                    } else {
                        toast.error('Source batch not found')
                    }
                }}
            />

            {/* QuickEntryModal */}
            {quickEntryData && (
                <QuickEntryModal
                    open={quickEntryOpen}
                    onOpenChange={setQuickEntryOpen}
                    sourceBatchId={quickEntryData.sourceBatchId}
                    newMonthName={quickEntryData.monthName}
                    bankType={bankType as 'MBB' | 'VIB'}
                    bankMappings={bankMappings}
                    onSubmit={async (amounts) => {
                        const { createCloneBatchAction } = await import('@/actions/batch-create.actions')
                        const result = await createCloneBatchAction({
                            monthYear: quickEntryData.monthYear,
                            monthName: quickEntryData.monthName,
                            bankType: bankType as 'MBB' | 'VIB',
                            sourceBatchId: quickEntryData.sourceBatchId,
                            amounts
                        })

                        if (result.success) {
                            toast.success('Batch created')
                            setQuickEntryOpen(false)
                            setQuickEntryData(null)
                            router.refresh()
                        } else {
                            toast.error(result.error || 'Failed to create batch')
                        }
                    }}
                />
            )}
        </div>
    )
}
