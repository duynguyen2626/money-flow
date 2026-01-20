import { getAccounts } from '@/services/account.service'
import { getCategories } from '@/services/category.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { AccountDirectoryV2 } from '@/components/accounts/v2/AccountDirectoryV2'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Accounts',
}

export default async function AccountsV2Page() {
    const [accounts, categories, people, shops] = await Promise.all([
        getAccounts(),
        getCategories(),
        getPeople(),
        getShops(),
    ])

    return (
        <div className="h-full overflow-hidden flex flex-col">
            <header className="px-6 py-4 bg-white border-b flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Accounts V2</h1>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Phase 3C: Polish & Quick Actions</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                        {accounts.length} Total Accounts
                    </div>
                </div>
            </header>

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
