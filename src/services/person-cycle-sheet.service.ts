'use server'

import { createClient } from '@/lib/supabase/server'
import { PersonCycleSheet } from '@/types/moneyflow.types'

export async function getPersonCycleSheets(personId: string): Promise<PersonCycleSheet[]> {
  if (!personId) return []
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('person_cycle_sheets')
    .select('id, person_id, cycle_tag, sheet_id, sheet_url, created_at, updated_at')
    .eq('person_id', personId)

  if (error) {
    console.warn('Unable to load person cycle sheets:', error)
    return []
  }

  return (data as PersonCycleSheet[]) ?? []
}
