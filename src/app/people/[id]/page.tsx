import { notFound, redirect } from 'next/navigation'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getDebtByTags } from '@/services/debt.service'
import { getUnifiedTransactions, getTransactionsByPeople } from '@/services/transaction.service'
import { getPersonCycleSheets } from '@/services/person-cycle-sheet.service'
import { getPersonWithSubs } from '@/services/people.service'
import { getServices } from '@/services/service-manager'
import { MemberDetailView } from '@/components/people/v2/MemberDetailView'
import { TagFilterProvider } from '@/context/tag-filter-context'
import { Metadata } from 'next'

import { Suspense } from 'react'
import Loading from './loading'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ tab?: string; tag?: string; id?: string }>
}): Promise<Metadata> {
  const { id } = await params
  if (id === 'details') return { title: 'Redirecting...' }
  const { tab } = await searchParams
  const person = await getPersonWithSubs(id)

  if (!person) return { title: 'Person Not Found' }

  let tabName = 'Transactions'
  if (tab === 'history') tabName = 'History'
  if (tab === 'split-bill') tabName = 'Split Bill'

  return {
    title: `${person.name} ${tabName} | Money Flow`,
  }
}

export default async function PeopleDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ tab?: string; tag?: string; id?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  if (resolvedParams.id === 'details') {
    const legacyId = resolvedSearchParams.id
    if (!legacyId) {
      redirect('/people')
    }

    // Build redirect target
    let target = `/people/${legacyId}`
    const query = new URLSearchParams()
    if (resolvedSearchParams.tag) query.set('tag', resolvedSearchParams.tag)
    if (resolvedSearchParams.tab) query.set('tab', resolvedSearchParams.tab)

    const queryString = query.toString()
    if (queryString) target += `?${queryString}`

    redirect(target)
  }

  if (!resolvedParams.id) {
    notFound()
  }

  const key = resolvedParams.id

  return (
    <Suspense key={key} fallback={<Loading />}>
      <PeopleDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function PeopleDetailContent({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{ tab?: string; tag?: string; id?: string }>
}) {
  const resolvedParams = await params
  const personId = resolvedParams.id

  // Fetch person details
  const person = await getPersonWithSubs(personId)

  if (!person) {
    notFound()
  }

  const actualAccountId = person.id
  const sheetProfileId = person.id

  // Fetch all required data in parallel
  const [accounts, categories, people, shops, debtTags, cycleSheets, subscriptions] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getDebtByTags(personId),
    getPersonCycleSheets(sheetProfileId),
    getServices(),
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
    ? await getTransactionsByPeople(groupPersonIds, 2000)
    : await getUnifiedTransactions({
      accountId: actualAccountId,
      personId: person.id,
      limit: 2000,
      context: 'person',
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
        subscriptions={subscriptions}
      />
    </TagFilterProvider>
  )
}
