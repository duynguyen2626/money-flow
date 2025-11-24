'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type ShopRow = Database['public']['Tables']['shops']['Row']
type ShopInsert = Database['public']['Tables']['shops']['Insert']
type ShopUpdate = Database['public']['Tables']['shops']['Update']

export async function getShops(): Promise<ShopRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, logo_url')
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch shops:', error)
    return []
  }

  return (data ?? []) as ShopRow[]
}

export async function createShop(input: { name: string; logo_url?: string | null }): Promise<ShopRow | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? '917455ba-16c0-42f9-9cea-264f81a3db66'

  const payload: ShopInsert = {
    name: input.name.trim(),
    logo_url: input.logo_url ?? null,
    created_by: userId,
  }

  const { data, error } = await (supabase.from('shops').insert as any)(payload).select().single()
  if (error || !data) {
    console.error('Failed to create shop:', error)
    return null
  }
  return data as ShopRow
}

export async function updateShop(id: string, input: { name?: string; logo_url?: string | null }): Promise<boolean> {
  const supabase = createClient()
  const payload: ShopUpdate = {}

  if (input.name) {
    payload.name = input.name.trim()
  }
  if (typeof input.logo_url !== 'undefined') {
    payload.logo_url = input.logo_url
  }

  if (!Object.keys(payload).length) {
    return true
  }

  const { error } = await supabase.from('shops').update(payload).eq('id', id)
  if (error) {
    console.error('Failed to update shop:', error)
    return false
  }
  return true
}
