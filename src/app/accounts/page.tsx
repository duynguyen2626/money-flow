import { AccountDirectoryV2 } from '@/components/accounts/v2/AccountDirectoryV2'
import {
  getPocketBaseAccounts,
  getPocketBaseCategories,
  getPocketBasePeople,
  getPocketBaseShops,
} from '@/services/pocketbase/account-details.service'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accounts & Cards | Money Flow',
  icons: {
    icon: '/favicon.svg?v=6',
    apple: '/icon.svg?v=6',
  },
}

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const [accounts, categories, people, shops] = await Promise.all([
    getPocketBaseAccounts(),
    getPocketBaseCategories(),
    getPocketBasePeople(),
    getPocketBaseShops(),
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
