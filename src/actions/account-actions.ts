'use server'

import { createClient } from '@/lib/supabase/server'
import { updateAccountConfig } from '@/services/account.service'
import { Database, Json } from '@/types/database.types'
import { Account } from '@/types/moneyflow.types'
import { revalidatePath } from 'next/cache'

export async function createAccount(payload: { 
  name: string; 
  balance?: number;
  type?: Account['type'];
  creditLimit?: number | null;
  cashbackConfig?: Json | null;
  securedByAccountId?: string | null;
  imgUrl?: string | null;
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Use default user ID if not authenticated
  const userId = user?.id || '917455ba-16c0-42f9-9cea-264f81a3db66'

  const insertPayload: Database['public']['Tables']['accounts']['Insert'] = {
    name: payload.name,
    current_balance: payload.balance ?? 0,
    owner_id: userId,
    type: payload.type ?? 'bank',
    currency: 'VND',
    is_active: true,
    credit_limit: payload.creditLimit,
    cashback_config: payload.cashbackConfig,
    secured_by_account_id: payload.securedByAccountId,
    img_url: payload.imgUrl,
  }

  const executeInsert = (data: typeof insertPayload) =>
    supabase
      .from('accounts')
      .insert([data] as any)
      .select()

  const { data, error } = await executeInsert(insertPayload)

  if (error) {
    const missingColumn =
      error.code === 'PGRST204' ||
      (typeof error.message === 'string' && error.message.includes('img_url'))
    if (missingColumn && insertPayload.img_url) {
      delete insertPayload.img_url
      const { data: retryData, error: retryError } = await executeInsert(insertPayload)
      if (retryError) {
        console.error('Error creating account after retry:', retryError)
        return { error: retryError }
      }
      revalidatePath('/accounts')
      return { data: retryData }
    }
    console.error('Error creating account:', error)
    return { error }
  }

  revalidatePath('/accounts')
  return { data }
}

export type UpdateAccountPayload = {
  id: string
  name?: string
  creditLimit?: number | null
  cashbackConfig?: Json | null
  type?: Account['type']
  securedByAccountId?: string | null
  isActive?: boolean | null
  imgUrl?: string | null
  logoUrl?: string | null
}

export async function updateAccountConfigAction(payload: UpdateAccountPayload) {
  const updatePayload: {
    name?: string
    credit_limit?: number | null
    cashback_config?: Json | null
    type?: Account['type']
    secured_by_account_id?: string | null
    is_active?: boolean | null
    img_url?: string | null
    logo_url?: string | null
  } = {}

  if (typeof payload.name === 'string') {
    updatePayload.name = payload.name
  }

  if (typeof payload.creditLimit !== 'undefined') {
    updatePayload.credit_limit = payload.creditLimit
  }

  if ('cashbackConfig' in payload) {
    updatePayload.cashback_config = payload.cashbackConfig ?? null
  }

  if (typeof payload.type === 'string') {
    updatePayload.type = payload.type
  }

  if ('securedByAccountId' in payload) {
    updatePayload.secured_by_account_id = payload.securedByAccountId ?? null
  }

  if (typeof payload.isActive === 'boolean') {
    updatePayload.is_active = payload.isActive
  }

  if ('imgUrl' in payload) {
    updatePayload.img_url = payload.imgUrl ?? null
    updatePayload.logo_url = payload.logoUrl ?? payload.imgUrl ?? null
  }

  if ('logoUrl' in payload) {
    updatePayload.logo_url = payload.logoUrl ?? null
  }

  return updateAccountConfig(payload.id, updatePayload)
}
