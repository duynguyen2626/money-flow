import { Suspense } from 'react'
import { getAccountDetails, getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getAccountSpendingStats } from '@/services/cashback.service'
import { loadTransactions } from '@/services/transaction.service'
import { TagFilterProvider } from '@/context/tag-filter-context'
import { AccountDetailViewV2 } from '@/components/accounts/v2/AccountDetailViewV2'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    tab?: string
  }>
}

export async function generateMetadata({
  params,
  searchParams
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const { tab } = await searchParams
  const account = await getAccountDetails(id)

  if (!account) return { title: 'Account Not Found' }

  const tabName = tab === 'cashback' ? 'Cashback' : 'Transactions'
  return {
    title: `${account.name} ${tabName}`,
  }
}

export default async function AccountPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab = tab === 'cashback' ? 'cashback' : 'transactions'

  if (!id || id === 'undefined') {
    notFound()
  }

  const account = await getAccountDetails(id)

  if (!account) {
    notFound()
  }

  // Pre-fetch everything needed for V2 view
  const [allAccounts, categories, people, shops, cashbackStats, transactions] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
    getAccountSpendingStats(id, new Date()),
    loadTransactions({ accountId: id, context: 'account', limit: 2000 }), // Increased limit for V2
  ])

  return (
    <TagFilterProvider>
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-400">Loading Account Details...</div>}>
        <AccountDetailViewV2
          account={account}
          allAccounts={allAccounts}
          categories={categories}
          people={people}
          shops={shops}
          initialTransactions={transactions}
          initialCashbackStats={cashbackStats ?? null}
        />
      </Suspense>
    </TagFilterProvider>
  )
}

