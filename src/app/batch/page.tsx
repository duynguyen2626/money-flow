import { getBatchesAction } from '@/actions/batch.actions'
import { BatchList } from '@/components/batch/batch-list'
import { CreateBatchDialog } from '@/components/batch/create-batch-dialog'
import { getAccounts } from '@/services/account.service'

export default async function BatchPage() {
    const batches = await getBatchesAction()
    const accounts = await getAccounts()

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Batch Transfers</h1>
                <CreateBatchDialog accounts={accounts} />
            </div>
            <BatchList batches={batches} />
        </div>
    )
}
