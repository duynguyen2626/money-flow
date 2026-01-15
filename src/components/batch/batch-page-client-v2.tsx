'use client'

import { useState, useEffect } from 'react'
import { MonthTabs } from '@/components/batch/month-tabs'
import { BatchList } from '@/components/batch/batch-list-simple'
import { BatchDetail } from '@/components/batch/batch-detail'
import { CreateMonthDialog } from '@/components/batch/create-month-dialog'
import { QuickEntryModal } from '@/components/batch/quick-entry-modal'
import { Button } from '@/components/ui/button'
import { Settings, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

interface BatchPageClientV2Props {
    batches: any[]
    accounts: any[]
    bankMappings: any[]
    webhookLinks: any[]
    bankType: string
    activeBatch?: any
    activeInstallmentAccounts?: string[]
}

export function BatchPageClientV2({
    batches,
    accounts,
    bankMappings,
    webhookLinks,
    bankType,
    activeBatch,
    activeInstallmentAccounts
}: BatchPageClientV2Props) {
    const router = useRouter()
    const [createMonthOpen, setCreateMonthOpen] = useState(false)
    const [quickEntryOpen, setQuickEntryOpen] = useState(false)
    const [quickEntryData, setQuickEntryData] = useState<{
        sourceBatchId: string
        monthYear: string
        monthName: string
    } | null>(null)

    // State for tabs
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')

    // Prepare visible batches for MonthTabs
    const visibleBatches = batches.filter(b =>
        activeTab === 'active' ? !b.is_archived : b.is_archived
    )

    const searchParams = useSearchParams()
    const selectedMonthParam = searchParams.get('month')

    // Current active month is derived from activeBatch or search param
    const currentMonth = activeBatch ? activeBatch.month_year : selectedMonthParam || null

    async function handleStartBatch() {
        if (!selectedMonthParam) {
            setCreateMonthOpen(true)
            return
        }

        // Implicitly create batch for the selected month
        const date = new Date(selectedMonthParam + '-01')
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

        try {
            const { createFreshBatchAction } = await import('@/actions/batch-create.actions')
            const result = await createFreshBatchAction({
                monthYear: selectedMonthParam,
                monthName,
                bankType
            })

            if (result.success) {
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
        // Just navigate to the month
        router.push(`/batch/${bankType.toLowerCase()}?month=${month}`)
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                {bankType} Batch Transfers
                            </h1>
                            <p className="text-slate-600 mt-1">
                                Manage your {bankType} batch transfers by month
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {/* Maybe separate Admin/Settings? */}
                            <Link href="/batch/settings">
                                <Button variant="outline" size="lg">
                                    <Settings className="mr-2 h-5 w-5" />
                                    Settings
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Archive Toggle */}
                    <div className="flex gap-2 mt-4">
                        <Button
                            variant={activeTab === 'active' ? 'default' : 'ghost'}
                            onClick={() => setActiveTab('active')}
                            size="sm"
                        >
                            Active
                        </Button>
                        <Button
                            variant={activeTab === 'archived' ? 'default' : 'ghost'}
                            onClick={() => {
                                setActiveTab('archived')
                                // When switching to archive, ensure we don't show active batch details if they are not archived?
                                // Actually, simplest is: Archive tab -> List view. Active tab -> One Sheet view.
                            }}
                            size="sm"
                        >
                            Archived
                        </Button>
                    </div>
                </div>
            </div>

            {/* Month Tabs */}
            <MonthTabs
                batches={visibleBatches}
                bankType={bankType}
                onCreateMonth={() => setCreateMonthOpen(true)}
                value={currentMonth}
                onValueChange={handleMonthSelect}
            />

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-slate-50">
                {activeTab === 'active' ? (
                    <div className="container mx-auto px-4 py-6">
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
                bankType={bankType}
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
                        bankType
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
                    bankType={bankType}
                    bankMappings={bankMappings}
                    onSubmit={async (amounts) => {
                        const { createCloneBatchAction } = await import('@/actions/batch-create.actions')
                        const result = await createCloneBatchAction({
                            monthYear: quickEntryData.monthYear,
                            monthName: quickEntryData.monthName,
                            bankType,
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
