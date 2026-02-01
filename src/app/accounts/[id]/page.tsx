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

  // Calculate annual fee waiver stats manually for header display
  let accountWithStats = account
  if (account.type === 'credit_card' && account.annual_fee && account.annual_fee > 0) {
    const waiver_target = account.annual_fee_waiver_target ?? null
    if (waiver_target && waiver_target > 0) {
      // Calculate total expense spend from ALL transactions (not just cashback)
      // Include: expense, transfer, debt types; exclude: income, repayment
      const spent = transactions
        .filter(t => {
          const type = t.type?.toLowerCase()
          return type === 'expense' || type === 'transfer' || type === 'debt'
        })
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)
      
      const progress = Math.min(100, (spent / waiver_target) * 100)
      const met = spent >= waiver_target
      
      accountWithStats = {
        ...account,
        stats: {
          spent_this_cycle: spent,
          annual_fee_waiver_target: waiver_target,
          annual_fee_waiver_progress: progress,
          annual_fee_waiver_met: met,
        }
      }
    }
  }

  return (
    <TagFilterProvider>
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-400">Loading Account Details...</div>}>
        <AccountDetailViewV2
          account={accountWithStats}
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

