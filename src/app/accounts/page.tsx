import { AccountDirectoryV2 } from '@/components/accounts/v2/AccountDirectoryV2'
import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '💳 Accounts & Cards',
}

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const [accounts, categories, people, shops] = await Promise.all([
    getAccounts(),
    getCategories(),
    getPeople(),
    getShops(),
  ])

  return (
    <div className="h-full overflow-hidden">
      <AccountDirectoryV2
        accounts={accounts}
        categories={categories}
        people={people}
        shops={shops}
      />
    </div>
  )
}
