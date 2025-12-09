'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { recalculateBalance, updateAccountConfig } from '@/services/account.service'

import { Database, Json } from '@/types/database.types'
import { Account } from '@/types/moneyflow.types'

export async function createAccount(payload: {
  name: string;
  balance?: number;
  type?: Account['type'];
  creditLimit?: number | null;
  cashbackConfig?: Json | null;
  securedByAccountId?: string | null;
  logoUrl?: string | null;
  annualFee?: number | null;
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
    is_active: true,
    credit_limit: payload.creditLimit,
    cashback_config: payload.cashbackConfig,
    secured_by_account_id: payload.securedByAccountId,
    logo_url: payload.logoUrl,
    annual_fee: payload.annualFee ?? 0,
  }

  const executeInsert = (data: typeof insertPayload) =>
    supabase
      .from('accounts')
      .insert([data] as any)
      .select()

  const { data, error } = await executeInsert(insertPayload)

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
  logoUrl?: string | null
  annualFee?: number | null
}

export async function updateAccountConfigAction(payload: UpdateAccountPayload) {
  const updatePayload: {
    name?: string
    credit_limit?: number | null
    cashback_config?: Json | null
    type?: Account['type']
    secured_by_account_id?: string | null
    is_active?: boolean | null
    logo_url?: string | null
    annual_fee?: number | null
  } = {}

  if (typeof payload.name === 'string') {
    updatePayload.name = payload.name
  }
  if (typeof payload.annualFee !== 'undefined') {
    updatePayload.annual_fee = payload.annualFee
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

  if ('logoUrl' in payload) {
    updatePayload.logo_url = payload.logoUrl ?? null
  }

  return updateAccountConfig(payload.id, updatePayload)
}

export async function recalculateAccountBalanceAction(accountId: string) {
  try {
    const success = await recalculateBalance(accountId)
    if (success) {
      revalidatePath(`/accounts/${accountId}`)
      return { success: true }
    }
    return { success: false, error: 'Failed to recalculate balance' }
  } catch (error) {
    console.error('Error in recalculateAccountBalanceAction:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getAccountsAction() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, type, logo_url')
    .eq('is_active', true)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching accounts:', error)
    return []
  }
  console.log('getAccountsAction: returning', data?.length, 'accounts')
  return data
}
