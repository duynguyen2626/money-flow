import { createClient } from '@/lib/supabase/server'
import { Account } from '@/types/moneyflow.types'

export async function getAccounts(): Promise<Account[]> {
  const supabase = createClient()
    
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching accounts:', error)
    return []
  }

  // Cast the raw DB response to our App Type
  return (data as any[]).map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    currency: item.currency || 'VND',
    current_balance: item.current_balance || 0,
    credit_limit: item.credit_limit || 0,
    owner_id: item.owner_id || '',
  }))
}
