import { getBatchByIdAction } from '@/actions/batch.actions'
import { getAccounts } from '@/services/account.service'
import { BatchDetail } from '@/components/batch/batch-detail'

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const batch = await getBatchByIdAction(id)
    const accounts = await getAccounts()

    if (!batch) {
        return <div>Batch not found</div>
    }

    return (
        <div className="container mx-auto py-10">
            <BatchDetail batch={batch} accounts={accounts} />
        </div>
    )
}
