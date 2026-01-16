import { getAccounts } from '@/services/account.service'
import { getBankMappings } from '@/services/bank.service'
import { getSheetWebhookLinks } from '@/services/webhook-link.service'
import { BatchPageClientV2 } from '@/components/batch/batch-page-client-v2'

/**
 * VIB Batch page
 */
export default async function VIBBatchPage({
    searchParams
}: {
    searchParams: Promise<{ month?: string }>
}) {
    const { month } = await searchParams
    const bankType = 'VIB'

    const { getBatchesByType, getBatchById } = await import('@/services/batch.service')
    const batches = await getBatchesByType(bankType)

    let activeBatch = null
    const visibleBatches = batches.filter((b: any) => !b.is_archived)

    let targetBatchId = null
    if (month) {
        const found = batches.find((b: any) => b.month_year === month)
        if (found) targetBatchId = found.id
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
    const bankMappings = await getBankMappings()
    const webhookLinks = await getSheetWebhookLinks()
    const { getAccountsWithActiveInstallments } = await import('@/services/installment.service')
    const activeInstallmentAccounts = await getAccountsWithActiveInstallments()

    return (
        <BatchPageClientV2
            batches={batches}
            accounts={accounts}
            bankMappings={bankMappings}
            webhookLinks={webhookLinks}
            bankType={bankType}
            activeBatch={activeBatch}
            activeInstallmentAccounts={activeInstallmentAccounts}
        />
    )
}
