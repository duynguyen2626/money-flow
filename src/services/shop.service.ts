'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { revalidatePath } from 'next/cache'
import {
  createPocketBaseShop,
  updatePocketBaseShop,
  togglePocketBaseShopArchive,
  deletePocketBaseShop,
  togglePocketBaseShopsArchiveBulk,
  deletePocketBaseShopsBulk,
} from '@/services/pocketbase/account-details.service'

type ShopRow = Database['public']['Tables']['shops']['Row']
type ShopInsert = Database['public']['Tables']['shops']['Insert']
type ShopUpdate = Database['public']['Tables']['shops']['Update']

import { getPocketBaseShops } from './pocketbase/account-details.service'

export async function getShops(): Promise<ShopRow[]> {
  console.log('[DB:PB] shops.list')
  try {
    const shops = await getPocketBaseShops()
    return shops.map(s => ({
      id: s.id,
      name: s.name,
      image_url: s.image_url,
      default_category_id: s.default_category_id,
      is_archived: s.is_archived
    } as ShopRow))
  } catch (err) {
    console.error('[DB:PB] shops.list failed, falling back to Supabase:', err)

    console.log('[DB:SB] shops.select')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('shops')
      .select('id, name, image_url, default_category_id, is_archived')
      .order('name', { ascending: true })

    if (error) {
      console.error('[DB:SB] shops.select failed:', error)
      return []
    }

    return (data ?? []) as ShopRow[]
  }
}

export async function getShopById(id: string): Promise<ShopRow | null> {
  console.log('[DB:SB] shops.getById', { id })
  const supabase = createClient()
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, image_url, default_category_id')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[DB:SB] shops.getById failed:', error)
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
  console.log('[DB:SB] shops.create', { name: input.name })

  const payload: ShopInsert = {
    name: input.name.trim(),
    image_url: input.image_url ?? null,
    default_category_id: input.default_category_id ?? null,
  }

  const { data, error } = await (supabase.from('shops').insert as any)(payload).select().single()
  if (error || !data) {
    console.error('[DB:SB] shops.create failed:', error)
    return null
  }

  const result = data as ShopRow
  void createPocketBaseShop(result.id, {
    name: result.name,
    image_url: result.image_url ?? null,
    default_category_id: result.default_category_id ?? null,
  }).catch((err) => console.error('[DB:PB] shops.create secondary failed:', err))

  return result
}

export async function updateShop(id: string, input: { name?: string; image_url?: string | null; default_category_id?: string | null }): Promise<boolean> {
  const supabase = createClient()
  console.log('[DB:SB] shops.update', { id })
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
    console.error('[DB:SB] shops.update failed:', error)
    return false
  }

  void updatePocketBaseShop(id, {
    name: payload.name,
    image_url: payload.image_url !== undefined ? (payload.image_url ?? null) : undefined,
    default_category_id: payload.default_category_id !== undefined ? (payload.default_category_id ?? null) : undefined,
  }).catch((err) => console.error('[DB:PB] shops.update secondary failed:', err))

  return true
}

export async function toggleShopArchive(id: string, isArchived: boolean): Promise<boolean> {
  const supabase = createClient()
  console.log('[DB:SB] shops.toggleArchive', { id, isArchived })
  const { error } = await supabase
    .from('shops')
    .update({ is_archived: isArchived } as any)
    .eq('id', id)

  if (error) {
    console.error('[DB:SB] shops.toggleArchive failed:', error)
    return false
  }

  void togglePocketBaseShopArchive(id, isArchived)
    .catch((err) => console.error('[DB:PB] shops.toggleArchive secondary failed:', err))

  revalidatePath('/categories')
  return true
}

export async function deleteShop(id: string, targetId?: string): Promise<{ success: boolean; error?: string; hasTransactions?: boolean }> {
  const supabase = createClient()

  console.log('[DB:SB] shops.delete', { id, targetId })

  // 1. Check for existing transactions
  const { count, error: countError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', id)

  if (countError) {
    console.error('[DB:SB] shops.delete count check failed:', countError)
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
      console.error('[DB:SB] shops.delete handover failed:', updateError)
      return { success: false, error: 'Failed to move transactions' }
    }
  }

  // 3. Delete the shop
  const { error: deleteError } = await supabase
    .from('shops')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('[DB:SB] shops.delete failed:', deleteError)
    return { success: false, error: 'Failed to delete shop' }
  }

  void deletePocketBaseShop(id)
    .catch((err) => console.error('[DB:PB] shops.delete secondary failed:', err))

  revalidatePath('/categories')
  return { success: true }
}

export async function toggleShopsArchiveBulk(ids: string[], isArchived: boolean): Promise<boolean> {
  const supabase = createClient()
  console.log('[DB:SB] shops.toggleArchiveBulk', { count: ids.length, isArchived })
  const { error } = await supabase
    .from('shops')
    .update({ is_archived: isArchived } as any)
    .in('id', ids)

  if (error) {
    console.error('[DB:SB] shops.toggleArchiveBulk failed:', error)
    return false
  }

  void togglePocketBaseShopsArchiveBulk(ids, isArchived)
    .catch((err) => console.error('[DB:PB] shops.toggleArchiveBulk secondary failed:', err))

  revalidatePath('/categories')
  return true
}

export async function deleteShopsBulk(ids: string[], targetId?: string): Promise<{ success: boolean; error?: string; hasTransactionsIds?: string[] }> {
  const supabase = createClient()

  console.log('[DB:SB] shops.deleteBulk', { count: ids.length, targetId })

  // 1. Check for transactions across all shops
  const { data: txns, error: countError } = await supabase
    .from('transactions')
    .select('shop_id')
    .in('shop_id', ids)

  if (countError) {
    console.error('[DB:SB] shops.deleteBulk count check failed:', countError)
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
      console.error('[DB:SB] shops.deleteBulk handover failed:', updateError)
      return { success: false, error: 'Failed to move transactions' }
    }
  }

  // 3. Delete shops
  const { error: deleteError } = await supabase
    .from('shops')
    .delete()
    .in('id', ids)

  if (deleteError) {
    console.error('[DB:SB] shops.deleteBulk failed:', deleteError)
    return { success: false, error: 'Failed to delete shops' }
  }

  void deletePocketBaseShopsBulk(ids)
    .catch((err) => console.error('[DB:PB] shops.deleteBulk secondary failed:', err))

  revalidatePath('/categories')
  return { success: true }
}

export async function archiveShop(id: string, targetId?: string): Promise<{ success: boolean; error?: string; hasTransactions?: boolean }> {
  const supabase = createClient()

  console.log('[DB:SB] shops.archive', { id, targetId })

  // 1. If targetId provided, handover transactions first
  if (targetId) {
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ shop_id: targetId } as any)
      .eq('shop_id', id)

    if (updateError) {
      console.error('[DB:SB] shops.archive handover failed:', updateError)
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
    console.error('[DB:SB] shops.archive failed:', archiveError)
    return { success: false, error: 'Failed to archive' }
  }

  void togglePocketBaseShopArchive(id, true)
    .catch((err) => console.error('[DB:PB] shops.archive secondary failed:', err))

  revalidatePath('/categories')
  return { success: true }
}

export async function getShopStats(year: number) {
  console.log('[DB:SB] shops.getStats', { year })
  const supabase = createClient()
  const startDate = `${year}-01-01T00:00:00.000Z`
  const endDate = `${year}-12-31T23:59:59.999Z`

  const { data, error } = await supabase
    .from('transactions')
    .select('shop_id, amount')
    .neq('status', 'void')
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate)

  if (error) {
    console.error('[DB:SB] shops.getStats failed:', error)
    return {}
  }

  const stats: Record<string, { total: number; count: number }> = {}

  data.forEach((txn: any) => {
    if (!txn.shop_id) return
    if (!stats[txn.shop_id]) {
      stats[txn.shop_id] = { total: 0, count: 0 }
    }
    stats[txn.shop_id].total += txn.amount || 0
    stats[txn.shop_id].count += 1
  })

  return stats
}
