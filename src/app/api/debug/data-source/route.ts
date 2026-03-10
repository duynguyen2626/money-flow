import { NextResponse } from 'next/server'
import { getCategories } from '@/services/category.service'
import { getShops } from '@/services/shop.service'
import { getPocketBaseCategories, getPocketBaseShops } from '@/services/pocketbase/account-details.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [supabaseCategories, supabaseShops, pbCategories, pbShops] = await Promise.all([
      getCategories(),
      getShops(),
      getPocketBaseCategories(),
      getPocketBaseShops(),
    ])

    const categories = { source: 'Supabase', data: supabaseCategories }
    const shops = { source: 'Supabase', data: supabaseShops }

    return NextResponse.json({
      ok: true,
      supabase: {
        categories: { count: supabaseCategories.length },
        shops: { count: supabaseShops.length },
      },
      pocketbase: {
        categories: { count: pbCategories.length },
        shops: { count: pbShops.length },
      },
      _legacy_categories: {
        source: categories.source,
        count: categories.data.length,
      },
      _legacy_shops: {
        source: shops.source,
        count: shops.data.length,
      },
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
