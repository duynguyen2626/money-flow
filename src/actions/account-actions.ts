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
  parentAccountId?: string | null;
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Require authenticated user
  if (!user) {
    return { error: { message: 'User must be authenticated to create an account' } }
  }

  // Ensure profile exists
  const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', user.id).single()

  if (!existingProfile) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null
      })

    if (insertError) {
      console.error('Warning: Profile creation failed:', insertError)
    }
  }

  // Double check existence to be sure for FK
  const { data: profileExists } = await supabase.from('profiles').select('id').eq('id', user.id).single()

  if (!profileExists) {
    return { error: { message: `User profile missing and could not be created for ID: ${user.id}` } }
  }

  const insertPayload: Database['public']['Tables']['accounts']['Insert'] = {
    name: payload.name,
    current_balance: payload.balance ?? 0,
    owner_id: user.id,
    type: payload.type ?? 'bank',
    is_active: true,
    credit_limit: payload.creditLimit,
    cashback_config: payload.cashbackConfig,
    secured_by_account_id: payload.securedByAccountId,
    logo_url: payload.logoUrl,
    annual_fee: payload.annualFee ?? 0,
    parent_account_id: payload.parentAccountId ?? null,
  } as any // Cast to any since parent_account_id may not be in generated types yet

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
  parentAccountId?: string | null
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
    parent_account_id?: string | null
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

  if ('parentAccountId' in payload) {
    updatePayload.parent_account_id = payload.parentAccountId ?? null
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
    .order('name')

  if (error) {
    console.error('Error fetching accounts:', error)
    return []
  }
  console.log('getAccountsAction: returning', data?.length, 'accounts')
  return data
}
