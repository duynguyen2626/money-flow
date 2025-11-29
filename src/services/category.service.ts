'use server'

import { createClient } from '@/lib/supabase/server'
import { Category } from '@/types/moneyflow.types'

type CategoryRow = {
  id: string
  name: string
  type: Category['type']
  parent_id: string | null
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
  }))
}
