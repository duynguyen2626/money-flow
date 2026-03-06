import { redirect } from 'next/navigation'
import { getDashboardStats } from '@/services/dashboard.service'
import { createClient } from '@/lib/supabase/server'
import {
  getPocketBaseAccounts,
  getPocketBaseCategories,
  getPocketBasePeople,
  getPocketBaseShops,
} from '@/services/pocketbase/account-details.service'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Await searchParams as it's a Promise in Next.js 15+
  const params = await searchParams

  // Parse month/year from query params
  const now = new Date()
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1
  const year = params.year ? parseInt(params.year) : now.getFullYear()

  const [stats, accounts, categories, people, shops] = await Promise.all([
    getDashboardStats(month, year),
    getPocketBaseAccounts(),
    getPocketBaseCategories(),
    getPocketBasePeople(),
    getPocketBaseShops(),
  ])

  return (
    <DashboardContent
      stats={stats}
      accounts={accounts}
      categories={categories}
      people={people}
      shops={shops}
      selectedMonth={month}
      selectedYear={year}
    />
  )
}
