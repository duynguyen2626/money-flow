import { getBatchesAction } from '@/actions/batch.actions'
import { getAccounts } from '@/services/account.service'
import { getBankMappings } from '@/services/bank.service'
import { BatchPageClient } from '@/components/batch/batch-page-client'

export default async function BatchPage() {
    const batches = await getBatchesAction()
    const accounts = await getAccounts()
    const bankMappings = await getBankMappings()
    console.log('BatchPage: bankMappings count:', bankMappings.length)

    return <BatchPageClient batches={batches} accounts={accounts} bankMappings={bankMappings} />
}
