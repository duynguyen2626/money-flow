import { getAccounts } from '@/services/account.service'
import { getBankMappings } from '@/services/bank.service'
import { getSheetWebhookLinks } from '@/services/webhook-link.service'
import { BatchPageClientV2 } from '@/components/batch/batch-page-client-v2'

import type { Metadata } from 'next'
import { Suspense } from 'react'

export async function generateMetadata(): Promise<Metadata> {
    const { getAccounts } = await import('@/services/account.service')
    const accounts = await getAccounts()
    const matched = accounts.find((a: any) => a.name.toLowerCase().includes('mbb'))
    return {
        title: 'MBB Batch',
        icons: matched?.image_url ? { icon: matched.image_url } : undefined
    }
}

/**
 * MBB Batch page
 */
export default async function MBBBatchPage(props: {
    searchParams: Promise<{ month?: string, period?: string }>
}) {
    const searchParams = await props.searchParams
    const month = searchParams.month
    const bankType = 'MBB'

    const { getBatchesByType, getBatchById, getBatchSettings } = await import('@/services/batch.service')
    const batches = await getBatchesByType(bankType)
    const settings = await getBatchSettings(bankType)
    const cutoffDay = settings?.cutoff_day || 15

    const period = searchParams.period || 'before'

    let activeBatch = null
    const visibleBatches = batches.filter((b: any) => !b.is_archived)

    let targetBatchId = null
    if (month) {
        // Try to find batch for the selected month AND period
        const found = batches.find((b: any) => b.month_year === month && (b.period === period || (!b.period && period === 'before')))
        if (found) {
            targetBatchId = found.id
        }
    } else if (visibleBatches.length > 0) {
        const sorted = [...visibleBatches].sort((a: any, b: any) => {
            const tagA = a.month_year || ''
            const tagB = b.month_year || ''
            return tagB.localeCompare(tagA)
        })
        targetBatchId = sorted[0].id
    }

    if (targetBatchId) {
        activeBatch = await getBatchById(targetBatchId)
    }

    const accounts = await getAccounts()
    const bankMappings = await getBankMappings(bankType)
    const webhookLinks = await getSheetWebhookLinks()
    const { getAccountsWithActiveInstallments } = await import('@/services/installment.service')
    const activeInstallmentAccounts = await getAccountsWithActiveInstallments()

    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500 animate-pulse">Loading MBB Batch...</div>}>
            <BatchPageClientV2
                batches={batches}
                accounts={accounts}
                bankMappings={bankMappings}
                webhookLinks={webhookLinks}
                bankType={bankType}
                activeBatch={activeBatch}
                activeInstallmentAccounts={activeInstallmentAccounts}
                cutoffDay={cutoffDay}
                globalSheetUrl={settings?.display_sheet_url}
                globalSheetName={settings?.display_sheet_name}
            />
        </Suspense>
    )
}
