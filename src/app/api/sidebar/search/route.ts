import { NextResponse } from 'next/server'
import {
  getPocketBaseAccounts,
} from '@/services/pocketbase/account-details.service'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()

    const [accounts, peopleRes, shopsRes, categoriesRes] = await Promise.all([
      getPocketBaseAccounts(),
      supabase.from('people').select('id,name,image_url').order('name', { ascending: true }),
      supabase.from('shops').select('id,name,image_url').order('name', { ascending: true }),
      supabase.from('categories').select('id,name,image_url').order('name', { ascending: true }),
    ])

    const people = peopleRes.data || []
    const shops = shopsRes.data || []
    const categories = categoriesRes.data || []

    return NextResponse.json({
      accounts: accounts.map((item) => ({ id: item.id, name: item.name, image_url: item.image_url ?? null })),
      people: people.map((item) => ({ id: item.id, name: item.name, image_url: item.image_url ?? null })),
      shops: shops.map((item) => ({ id: item.id, name: item.name, image_url: item.image_url ?? null })),
      categories: categories.map((item) => ({ id: item.id, name: item.name, image_url: item.image_url ?? null })),
    })
  } catch (error) {
    console.error('[api/sidebar/search] failed', error)
    return NextResponse.json(
      { accounts: [], people: [], shops: [], categories: [] },
      { status: 200 }
    )
  }
}
