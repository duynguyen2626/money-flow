import { getShops } from '@/services/shop.service'
import { AddShopButton } from '@/components/shops/add-shop-button'
import { EditShopButton } from '@/components/shops/edit-shop-button'
import { ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Category } from '@/types/moneyflow.types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getCategories() {
  const supabase = createClient()
  const { data } = await supabase.from('categories').select('*').order('name')
  return (data as unknown) as Category[]
}

export default async function ShopsPage() {
  const [shops, categories] = await Promise.all([
    getShops(),
    getCategories()
  ])

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Shop Control</p>
          <h1 className="text-2xl font-semibold text-slate-900">Shops</h1>
          <p className="text-sm text-slate-500">List the marketplaces you use most often. Link them to expenses for more context.</p>
        </div>
        <AddShopButton categories={categories} />
      </header>

      {shops.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <p className="mt-3">No shops yet. Use the button above to add the marketplaces you frequently shop at.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shops.map(shop => (
            <Link
              key={shop.id}
              href={`/shops/${shop.id}`}
              className="relative flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  {shop.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shop.logo_url}
                      alt={shop.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                      {shop.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="text-lg font-semibold text-slate-900">{shop.name}</p>
                </div>
                <EditShopButton shop={shop} categories={categories} />
              </div>
              <div className="w-full">
                <p className="text-xs uppercase tracking-wide text-slate-400">Default Category</p>
                <p className="text-sm text-slate-500">
                  {categories.find(c => c.id === shop.default_category_id)?.name ?? 'None'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
