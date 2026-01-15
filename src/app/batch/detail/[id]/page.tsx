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
        return <div className="p-10 text-center">Batch not found</div>
    }

    // Format month for display
    const formatMonth = (monthYear: string) => {
        if (!monthYear) return 'Unknown'
        const [year, month] = monthYear.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthIndex = parseInt(month, 10) - 1
        return `${monthNames[monthIndex]} ${year}`
    }

    const bankType = batch.bank_type || 'MBB'
    const monthDisplay = batch.month_year ? formatMonth(batch.month_year) : batch.name

    return (
        <div className="container mx-auto py-10 space-y-4">
            {/* Context Navigation back to Unified View */}
            <div className="flex items-center gap-2 text-sm px-4">
                <a
                    href={`/batch/${bankType.toLowerCase()}?month=${batch.month_year}`}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-700 transition-colors"
                >
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
                    Back to {bankType} Batches
                </a>
                <span className="text-slate-400">/</span>
                <span className="font-medium text-slate-900">{monthDisplay}</span>
            </div>

            <div className="px-4">
                <BatchDetail
                    batch={batch}
                    accounts={accounts}
                    bankMappings={bankMappings}
                    webhookLinks={webhookLinks}
                    activeInstallmentAccounts={activeInstallmentAccounts}
                />
            </div>
        </div>
    )
}
