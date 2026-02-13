'use server'

import { createClient } from '@/lib/supabase/server'
import { Category } from '@/types/moneyflow.types'
import { revalidatePath } from 'next/cache'

type CategoryRow = {
  id: string
  name: string
  type: Category['type']
  parent_id: string | null
  icon: string | null
  image_url: string | null
  kind: Category['kind']
  mcc_codes?: string[] | null
  is_archived?: boolean | null
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: error
    })
    return []
  }

  const rows = (data ?? []) as unknown as CategoryRow[]

  return rows.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    parent_id: item.parent_id ?? undefined,
    icon: item.icon,
    image_url: item.image_url,
    kind: item.kind,
    mcc_codes: item.mcc_codes,
    is_archived: item.is_archived,
  }))
}

export async function createCategory(category: Omit<Category, 'id'>): Promise<Category | null> {
  const supabase = createClient()

  console.log('🔵 [SERVICE] createCategory called with:', category)

  const { data, error } = await (supabase
    .from('categories') as any)
    .insert({
      name: category.name,
      type: category.type,
      icon: category.icon ?? null,
      image_url: category.image_url ?? null,
      kind: category.kind ?? null,
      mcc_codes: (category as any).mcc_codes ?? null,
    } as any)
    .select()
    .single()

  console.log('🟡 [SERVICE] Supabase response - data:', data, 'error:', error)

  if (error) {
    console.error('🔴 [SERVICE] Error creating category:', error)
    return null
  }

  console.log('🟢 [SERVICE] Returning category:', data)
  return data as Category
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
  const supabase = createClient()

  const { data, error } = await (supabase
    .from('categories') as any)
    .update({
      name: updates.name,
      type: updates.type,
      icon: updates.icon,
      image_url: updates.image_url,
      kind: updates.kind,
      mcc_codes: (updates as any).mcc_codes,
    } as any)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating category:', error)
    return null
  }

  return data as Category
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') { // not found
      console.error('Error fetching category:', error)
    }
    return null
  }

  const item = data as any

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    parent_id: item.parent_id ?? undefined,
    icon: item.icon,
    image_url: item.image_url,
    kind: item.kind,
    mcc_codes: item.mcc_codes,
  }
}

export async function getCategoryStats(year: number) {
  const supabase = createClient()
  const startDate = `${year}-01-01T00:00:00.000Z`
  const endDate = `${year}-12-31T23:59:59.999Z`

  const { data, error } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .neq('status', 'void')
    .gte('occurred_at', startDate)
    .lte('occurred_at', endDate)

  if (error) {
    console.error('Error fetching category stats:', error)
    return {}
  }

  const stats: Record<string, { total: number; count: number }> = {}


  data.forEach((txn: any) => {
    if (!txn.category_id) return
    if (!stats[txn.category_id]) {
      stats[txn.category_id] = { total: 0, count: 0 }
    }
    stats[txn.category_id].total += txn.amount || 0
    stats[txn.category_id].count += 1
  })

  return stats
}

export async function toggleCategoryArchive(id: string, isArchived: boolean): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('categories')
    .update({ is_archived: isArchived } as any)
    .eq('id', id)

  if (error) {
    console.error('Error toggling category archive:', error)
    return false
  }
  return true
}

export async function deleteCategory(id: string, targetId?: string): Promise<{ success: boolean; error?: string; hasTransactions?: boolean }> {
  const supabase = createClient()

  // 1. Check for existing transactions
  const { count, error: countError } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)

  if (countError) {
    console.error('Error checking category transactions:', countError)
    return { success: false, error: 'Failed to check transactions' }
  }

  const hasTransactions = (count || 0) > 0

  if (hasTransactions) {
    if (!targetId) {
      return { success: false, hasTransactions: true, error: 'Category has associated transactions' }
    }

    // 2. Handover transactions to target category
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ category_id: targetId } as any)
      .eq('category_id', id)

    if (updateError) {
      console.error('Error moving transactions to new category:', updateError)
      return { success: false, error: 'Failed to move transactions' }
    }
  }

  // 3. Delete the category
  const { error: deleteError } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('Error deleting category:', deleteError)
    return { success: false, error: 'Failed to delete category' }
  }

  revalidatePath('/categories')
  return { success: true }
}


export async function toggleCategoriesArchiveBulk(ids: string[], isArchived: boolean): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('categories')
    .update({ is_archived: isArchived } as any)
    .in('id', ids)

  if (error) {
    console.error('Error toggling categories archive bulk:', error)
    return false
  }
  return true
}

export async function deleteCategoriesBulk(ids: string[], targetId?: string): Promise<{ success: boolean; error?: string; hasTransactionsIds?: string[] }> {
  const supabase = createClient()

  // 1. Check for transactions across all categories
  const { data: txns, error: countError } = await supabase
    .from('transactions')
    .select('category_id')
    .in('category_id', ids)

  if (countError) {
    console.error('Error checking transactions bulk:', countError)
    return { success: false, error: 'Failed to check transactions' }
  }

  const idsWithTransactions = Array.from(new Set((txns as any[]).map(t => t.category_id)))

  if (idsWithTransactions.length > 0 && !targetId) {
    return { success: false, hasTransactionsIds: idsWithTransactions, error: 'Some categories have associated transactions' }
  }

  // 2. Handover if targetId provided
  if (targetId && idsWithTransactions.length > 0) {
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ category_id: targetId } as any)
      .in('category_id', idsWithTransactions)

    if (updateError) {
      console.error('Error moving transactions bulk:', updateError)
      return { success: false, error: 'Failed to move transactions' }
    }
  }

  // 3. Delete categories
  const { error: deleteError } = await supabase
    .from('categories')
    .delete()
    .in('id', ids)

  if (deleteError) {
    console.error('Error deleting categories bulk:', deleteError)
    return { success: false, error: 'Failed to delete categories bulk' }
  }

  revalidatePath('/categories')
  return { success: true }
}

export async function archiveCategory(id: string, targetId?: string): Promise<{ success: boolean; error?: string; hasTransactions?: boolean }> {
  const supabase = createClient()

  // 1. If targetId provided, handover transactions first
  if (targetId) {
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ category_id: targetId } as any)
      .eq('category_id', id)

    if (updateError) {
      console.error('Error moving transactions for archive:', updateError)
      return { success: false, error: 'Failed to move transactions' }
    }
  } else {
    // Check if it has transactions if no targetId provided
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .neq('status', 'void')

    if (!countError && (count || 0) > 0) {
      return { success: false, hasTransactions: true, error: 'Category has transactions' }
    }
  }

  // 2. Archive the category
  const { error: archiveError } = await supabase
    .from('categories')
    .update({ is_archived: true } as any)
    .eq('id', id)

  if (archiveError) {
    console.error('Error archiving category:', archiveError)
    return { success: false, error: 'Failed to archive' }
  }

  revalidatePath('/categories')
  return { success: true }
}
