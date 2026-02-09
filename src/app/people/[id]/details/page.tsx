import { notFound } from 'next/navigation'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getDebtByTags } from '@/services/debt.service'
import { getUnifiedTransactions, getTransactionsByPeople } from '@/services/transaction.service'
import { getPersonCycleSheets } from '@/services/person-cycle-sheet.service'
import { getPersonWithSubs } from '@/services/people.service'
import { MemberDetailView } from './member-detail-view'
import { TagFilterProvider } from '@/context/tag-filter-context'

export const dynamic = 'force-dynamic'

export default async function MemberDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: personId } = await params

    console.log('[MemberDetailsPage] personId:', personId)

    // Fetch person details
    const person = await getPersonWithSubs(personId)

    console.log('[MemberDetailsPage] person:', person ? 'found' : 'NOT FOUND')

    if (!person) {
        console.log('[MemberDetailsPage] notFound() triggered for:', personId)
        notFound()
    }

    const actualAccountId = person.id
    const sheetProfileId = person.id

    // Fetch all required data in parallel
    const [accounts, categories, people, shops, debtTags, cycleSheets] = await Promise.all([
        getAccounts(),
        getCategories(),
        getPeople(),
        getShops(),
        getDebtByTags(personId),
        getPersonCycleSheets(sheetProfileId),
    ]) as any

    // Handle group profiles
    const profileRecord = people.find((item: any) => item.id === sheetProfileId)
    const isGroupProfile = Boolean(profileRecord?.is_group)
    const groupMemberIds = isGroupProfile
        ? people
            .filter((member: any) => member.group_parent_id === sheetProfileId)
            .map((member: any) => member.id)
        : []

    const groupPersonIds = isGroupProfile
        ? Array.from(new Set([sheetProfileId, ...groupMemberIds]))
        : []

    // Fetch transactions
    const transactions = isGroupProfile
        ? await getTransactionsByPeople(groupPersonIds, 1000)
        : await getUnifiedTransactions({
            accountId: actualAccountId,
            personId: person.id,
            context: 'person',
            includeVoided: true,
        })

    const balance = person.balance ?? 0
    const balanceLabel = balance > 0 ? 'They owe you' : balance < 0 ? 'You owe them' : 'Settled'

    return (
        <TagFilterProvider>
            <MemberDetailView
                person={person}
                balance={balance}
                balanceLabel={balanceLabel}
                transactions={transactions}
                debtTags={debtTags}
                cycleSheets={cycleSheets}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
            />
        </TagFilterProvider>
    )
}
