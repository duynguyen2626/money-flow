import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { AccountDirectoryV2 } from '@/components/accounts/v2/AccountDirectoryV2'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Accounts',
}

export default async function AccountsPage() {
  const [accounts, categories, people, shops] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
  ])

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 bg-slate-50/50">
        <AccountDirectoryV2
          accounts={accounts}
          categories={categories}
          people={people}
          shops={shops}
        />
      </div>
    </div>
  )
}
