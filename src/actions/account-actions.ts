'use server'

import { createClient } from '@/lib/supabase/server'
import { updateAccountConfig } from '@/services/account.service'
import { Json } from '@/types/database.types'
import { Account } from '@/types/moneyflow.types'
import { revalidatePath } from 'next/cache'

export async function createAccount(payload: { name: string; balance?: number }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('User is not authenticated')
    return { error: 'User is not authenticated' }
  }

  const { data, error } = await supabase.from('accounts').insert([
    {
      name: payload.name,
      current_balance: payload.balance ?? 0,
      owner_id: user.id,
      type: 'bank', 
      currency: 'VND',
      is_active: true,
    },
  ]).select()

  if (error) {
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
