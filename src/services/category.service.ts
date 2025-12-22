'use server'

import { createClient } from '@/lib/supabase/server'
import { Category } from '@/types/moneyflow.types'

type CategoryRow = {
  id: string
  name: string
  type: Category['type']
  parent_id: string | null
  icon: string | null
  logo_url: string | null
  kind: Category['kind']
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  const rows = (data ?? []) as CategoryRow[]

  return rows.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    parent_id: item.parent_id ?? undefined,
    icon: item.icon,
    logo_url: item.logo_url,
    kind: item.kind,
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
      logo_url: category.logo_url ?? null,
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
      logo_url: updates.logo_url,
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
