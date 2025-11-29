import { getBatchesAction } from '@/actions/batch.actions'
import { getAccounts } from '@/services/account.service'
import { getBankMappings } from '@/services/bank.service'
import { getSheetWebhookLinks } from '@/services/webhook-link.service'
import { BatchPageClient } from '@/components/batch/batch-page-client'

export default async function BatchPage() {
    const batches = await getBatchesAction()
    const accounts = await getAccounts()
    const bankMappings = await getBankMappings()
    const webhookLinks = await getSheetWebhookLinks()

    return <BatchPageClient batches={batches} accounts={accounts} bankMappings={bankMappings} webhookLinks={webhookLinks} />
}
