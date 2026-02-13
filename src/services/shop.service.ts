'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { revalidatePath } from 'next/cache'

type ShopRow = Database['public']['Tables']['shops']['Row']
type ShopInsert = Database['public']['Tables']['shops']['Insert']
type ShopUpdate = Database['public']['Tables']['shops']['Update']

export async function getShops(): Promise<ShopRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, image_url, default_category_id, is_archived')
    .order('name', { ascending: true })

  if (error) {
    console.error('Failed to fetch shops:', error)
    return []
  }

  return (data ?? []) as ShopRow[]
}

export async function getShopById(id: string): Promise<ShopRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, image_url, default_category_id')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Failed to fetch shop by id:', error)
    return null
  }

  return data as ShopRow
}

export async function createShop(input: {
  name: string;
  image_url?: string | null;
  default_category_id?: string | null
}): Promise<ShopRow | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? '917455ba-16c0-42f9-9cea-264f81a3db66'

  const payload: ShopInsert = {
    name: input.name.trim(),
    image_url: input.image_url ?? null,
    default_category_id: input.default_category_id ?? null,
  }

  const { data, error } = await (supabase.from('shops').insert as any)(payload).select().single()
  if (error || !data) {
    console.error('Failed to create shop:', error)
    return null
  }
  return data as ShopRow
}

export async function updateShop(id: string, input: { name?: string; image_url?: string | null; default_category_id?: string | null }): Promise<boolean> {
  const supabase = createClient()
  const payload: Partial<ShopUpdate> = {}

  if (input.name) {
    payload.name = input.name.trim()
  }
  if (typeof input.image_url !== 'undefined') {
    payload.image_url = input.image_url
  }
  if (typeof input.default_category_id !== 'undefined') {
    payload.default_category_id = input.default_category_id
  }

  if (!Object.keys(payload).length) {
    return true
  }

  const { error } = await (supabase.from('shops').update as any)(payload).eq('id', id)
  if (error) {
    console.error('Failed to update shop:', error)
    return false
  }
  return true
}

export async function toggleShopArchive(id: string, isArchived: boolean): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('shops')
    .update({ is_archived: isArchived } as any)
    .eq('id', id)

  if (error) {
    console.error('Error toggling shop archive:', error)
    return false
  }
  return true
}

export async function deleteShop(id: string, targetId?: string): Promise<{ success: boolean; error?: string; hasTransactions?: boolean }> {
  const supabase = createClient()

  // 1. Check for existing transactions
  const { count, error: countError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', id)

  if (countError) {
    console.error('Error checking shop transactions:', countError)
    return { success: false, error: 'Failed to check transactions' }
  }

  const hasTransactions = (count || 0) > 0

  if (hasTransactions) {
    if (!targetId) {
      return { success: false, hasTransactions: true, error: 'Shop has associated transactions' }
    }

    // 2. Handover transactions to target shop
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ shop_id: targetId } as any)
      .eq('shop_id', id)

    if (updateError) {
      console.error('Error moving transactions to new shop:', updateError)
      return { success: false, error: 'Failed to move transactions' }
    }
  }

  // 3. Delete the shop
  const { error: deleteError } = await supabase
    .from('shops')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('Error deleting shop:', deleteError)
    return { success: false, error: 'Failed to delete shop' }
  }

  revalidatePath('/categories')
  return { success: true }
}

export async function toggleShopsArchiveBulk(ids: string[], isArchived: boolean): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('shops')
    .update({ is_archived: isArchived } as any)
    .in('id', ids)

  if (error) {
    console.error('Error toggling shops archive bulk:', error)
    return false
  }
  return true
}

export async function deleteShopsBulk(ids: string[], targetId?: string): Promise<{ success: boolean; error?: string; hasTransactionsIds?: string[] }> {
  const supabase = createClient()

  // 1. Check for transactions across all shops
  const { data: txns, error: countError } = await supabase
    .from('transactions')
    .select('shop_id')
    .in('shop_id', ids)

  if (countError) {
    console.error('Error checking shop transactions bulk:', countError)
    return { success: false, error: 'Failed to check transactions' }
  }

  const idsWithTransactions = Array.from(new Set((txns as any[]).map(t => t.shop_id).filter(Boolean))) as string[]

  if (idsWithTransactions.length > 0 && !targetId) {
    return { success: false, hasTransactionsIds: idsWithTransactions, error: 'Some shops have associated transactions' }
  }

  // 2. Handover if targetId provided
  if (targetId && idsWithTransactions.length > 0) {
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ shop_id: targetId } as any)
      .in('shop_id', idsWithTransactions)

    if (updateError) {
      console.error('Error moving transactions bulk:', updateError)
      return { success: false, error: 'Failed to move transactions' }
    }
  }

  // 3. Delete shops
  const { error: deleteError } = await supabase
    .from('shops')
    .delete()
    .in('id', ids)

  if (deleteError) {
    console.error('Error deleting shops bulk:', deleteError)
    return { success: false, error: 'Failed to delete shops' }
  }

  revalidatePath('/categories')
  return { success: true }
}

export async function archiveShop(id: string, targetId?: string): Promise<{ success: boolean; error?: string; hasTransactions?: boolean }> {
  const supabase = createClient()

  // 1. If targetId provided, handover transactions first
  if (targetId) {
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ shop_id: targetId } as any)
      .eq('shop_id', id)

    if (updateError) {
      console.error('Error moving transactions for archive:', updateError)
      return { success: false, error: 'Failed to move transactions' }
    }
  } else {
    // Check if it has transactions if no targetId provided
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', id)
      .neq('status', 'void')

    if (!countError && (count || 0) > 0) {
      return { success: false, hasTransactions: true, error: 'Shop has transactions' }
    }
  }

  // 2. Archive the shop
  const { error: archiveError } = await supabase
    .from('shops')
    .update({ is_archived: true } as any)
    .eq('id', id)

  if (archiveError) {
    console.error('Error archiving shop:', archiveError)
    return { success: false, error: 'Failed to archive' }
  }

  revalidatePath('/categories')
  return { success: true }
}
