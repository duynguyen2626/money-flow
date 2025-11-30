'use server'

import { createClient } from '@/lib/supabase/server'
import { Category } from '@/types/moneyflow.types'

type CategoryRow = {
  id: string
  name: string
  type: Category['type']
  parent_id: string | null
  icon: string | null
  image_url: string | null
  mcc_codes: string[] | null
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
    image_url: item.image_url,
    mcc_codes: item.mcc_codes ?? undefined,
  }))
}

export async function createCategory(category: Omit<Category, 'id'>): Promise<Category | null> {
  const supabase = createClient()

  const { data, error } = await (supabase
    .from('categories') as any)
    .insert({
      name: category.name,
      type: category.type,
      parent_id: category.parent_id ?? null,
      icon: category.icon ?? null,
      image_url: category.image_url ?? null,
      mcc_codes: category.mcc_codes ?? null,
    } as any)
    .select()
    .single()

  if (error) {
    console.error('Error creating category:', error)
    return null
  }

  return data as Category
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
  const supabase = createClient()

  const { data, error } = await (supabase
    .from('categories') as any)
    .update({
      name: updates.name,
      type: updates.type,
      parent_id: updates.parent_id,
      icon: updates.icon,
      image_url: updates.image_url,
      mcc_codes: updates.mcc_codes ?? null,
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
