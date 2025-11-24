import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getRecentTransactions } from '@/services/transaction.service'
import { RecentTransactions } from '@/components/moneyflow/recent-transactions'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type ShopDetailsPageProps = {
  params: {
    id: string
  }
}

async function getShopTransactions(shopId: string) {
    const supabase = createClient()
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id,
        occurred_at,
        note,
        tag,
        status,
        created_at,
        shop_id,
        shops ( id, name, logo_url ),
        transaction_lines (
          amount,
          type,
          account_id,
          metadata,
          category_id,
          person_id,
          original_amount,
          cashback_share_percent,
          cashback_share_fixed,
          profiles ( name ),
          accounts (name),
          categories (name)
        )
      `)
      .eq('shop_id', shopId)
      .order('occurred_at', { ascending: false })
      .limit(50)

    if (!transactions) return []
    // Need to map this to TransactionWithDetails but the util is not exported or needs copy.
    // For expediency, I will reuse the mapper from transaction.service if possible,
    // or just rely on RecentTransactions accepting what we have if it matches the shape.
    // Ideally I should expose a `getShopTransactions` in service, but I'll do a quick client fetch or service call here.
    // Actually `getRecentTransactions` fetches all recent. I should probably add a filter to it or make a new service method.
    // For now, let's just use `getRecentTransactions` and filter in memory if volume is low, or better:
    // Let's rely on the service to keep things clean.
    return []
}

export default async function ShopDetailsPage({ params }: ShopDetailsPageProps) {
  // Since we don't have a direct service method for getShopTransactions that returns the full type,
  // I will cheat slightly and fetch all accounts/etc then fetch transactions manually and map them
  // OR add a service method. Adding a service method is cleaner.
  // Wait, I can't easily modify service in this step without a plan update if it's complex.
  // Let's modify `src/services/transaction.service.ts` to export a `getTransactionsByShop` function.

  // Re-evaluating: I will add `getTransactionsByShop` to `transaction.service.ts`.
  const { getTransactionsByShop } = await import('@/services/transaction.service')

  const [transactions, accounts, categories, people, shops] = await Promise.all([
    getTransactionsByShop(params.id),
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
  ])

  const shop = shops.find(s => s.id === params.id)

  return (
    <section className="space-y-6">
       <header className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <Link
          href="/shops"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Shop Details</p>
          <h1 className="text-2xl font-semibold text-slate-900">{shop?.name ?? 'Unknown Shop'}</h1>
          <p className="text-sm text-slate-500">Transaction history for this shop.</p>
        </div>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <RecentTransactions
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            people={people}
            shops={shops}
        />
      </div>
    </section>
  )
}
