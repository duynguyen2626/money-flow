import { getBatchByIdAction } from '@/actions/batch.actions'
import { getAccounts } from '@/services/account.service'
import { BatchDetail } from '@/components/batch/batch-detail'
import { getBankMappings } from '@/services/bank.service'
import { getSheetWebhookLinks } from '@/services/webhook-link.service'

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const batch = await getBatchByIdAction(id)
    const accounts = await getAccounts()
    const bankMappings = await getBankMappings()
    const webhookLinks = await getSheetWebhookLinks()
    const { getAccountsWithActiveInstallments } = await import('@/services/installment.service')
    const activeInstallmentAccounts = await getAccountsWithActiveInstallments()

    if (!batch) {
        return <div>Batch not found</div>
    }

    return (
        <div className="container mx-auto py-10 space-y-4">
            <div className="flex items-center gap-2">
                <a href="/batch" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="m12 19-7-7 7-7" />
                        <path d="M19 12H5" />
                    </svg>
                    Back to Batches
                </a>
            </div>
            <BatchDetail
                batch={batch}
                accounts={accounts}
                bankMappings={bankMappings}
                webhookLinks={webhookLinks}
                activeInstallmentAccounts={activeInstallmentAccounts}
            />
        </div>
    )
}
