import { getShops } from '@/services/shop.service'
import { createClient } from '@/lib/supabase/server'
import { Category } from '@/types/moneyflow.types'
import { Metadata } from 'next'
import { ShopsManager } from '@/components/shops/ShopsManager'

export const metadata: Metadata = {
  title: 'Shops & Merchants | Money Flow',
}

export const dynamic = 'force-dynamic'

async function getCategories() {
  const supabase = createClient()
  const { data } = await supabase.from('categories').select('*').order('name')
  return (data ?? []) as unknown as Category[]
}

export default async function ShopsPage() {
  const [shops, categories] = await Promise.all([
    getShops(),
    getCategories()
  ])

  return (
    <ShopsManager initialShops={shops} categories={categories} />
  )
}
