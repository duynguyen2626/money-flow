'use server'

import { createClient } from '@/lib/supabase/server'
import { DebtAccount } from '@/types/moneyflow.types'

type DebtRow = {
  id: string
  name: string
  current_balance: number | null
  owner_id: string | null
}

export async function getDebtAccounts(): Promise<DebtAccount[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, current_balance, owner_id')
    .eq('type', 'debt')
    .order('current_balance', { ascending: false })

  if (error) {
    console.error('Error fetching debt accounts:', error)
    return []
  }

  return (data as DebtRow[]).map(item => ({
    id: item.id,
    name: item.name,
    current_balance: item.current_balance ?? 0,
    owner_id: item.owner_id,
  }))
}
