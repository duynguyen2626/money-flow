import { createClient } from '@/lib/supabase/server'
import { Category } from '@/types/moneyflow.types'

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

  // Cast the raw DB response to our App Type
  return (data as any[]).map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    parent_id: item.parent_id || undefined,
  }))
}
