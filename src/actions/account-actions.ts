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
  imageUrl?: string | null;
  annualFee?: number | null;
  parentAccountId?: string | null;
  accountNumber?: string | null;
  receiverName?: string | null;
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Require authenticated user
  if (!user) {
    return { error: { message: 'User must be authenticated to create an account' } }
  }

  // Ensure profile exists
  const { data: existingProfile, error: profileCheckError } = await supabase.from('profiles').select('id').eq('id', user.id).single()

  if (profileCheckError || !existingProfile) {
    console.error('[createAccount] Profile missing or check failed:', profileCheckError)
    return { error: { message: `User profile missing. Please sign out and sign in again.` } }
  }

  try {
    const insertPayload: Database['public']['Tables']['accounts']['Insert'] = {
      name: payload.name,
      current_balance: payload.balance ?? 0,
      owner_id: user.id,
      type: payload.type ?? 'bank',
      is_active: true,
      credit_limit: payload.creditLimit,
      cashback_config: payload.cashbackConfig,
      secured_by_account_id: payload.securedByAccountId,
      image_url: payload.imageUrl,
      annual_fee: payload.annualFee ?? 0,
      parent_account_id: payload.parentAccountId ?? null,
      account_number: payload.accountNumber ?? null,
      receiver_name: payload.receiverName ?? null,
    } as any

    const { data, error } = await supabase
      .from('accounts')
      .insert([insertPayload])
      .select()

    if (error) {
      console.error('[createAccount] Supabase Insert Error:', error)
      return { error: { message: error.message || 'Database error during account creation.' } }
    }

    revalidatePath('/accounts')
    return { data }

  } catch (err: any) {
    console.error('[createAccount] Unexpected Exception:', err)
    return { error: { message: err.message || 'An unexpected error occurred.' } }
  }
}

export type UpdateAccountPayload = {
  id: string
  name?: string
  creditLimit?: number | null
  cashbackConfig?: Json | null
  type?: Account['type']
  securedByAccountId?: string | null
  isActive?: boolean | null
  imageUrl?: string | null
  annualFee?: number | null
  parentAccountId?: string | null
  accountNumber?: string | null
  receiverName?: string | null
}

export async function updateAccountConfigAction(payload: UpdateAccountPayload) {
  const updatePayload: {
    name?: string
    credit_limit?: number | null
    cashback_config?: Json | null
    type?: Account['type']
    secured_by_account_id?: string | null
    is_active?: boolean | null
    image_url?: string | null
    annual_fee?: number | null
    parent_account_id?: string | null
    account_number?: string | null
    receiver_name?: string | null
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

  if ('imageUrl' in payload) {
    updatePayload.image_url = payload.imageUrl ?? null
  }

  if ('parentAccountId' in payload) {
    updatePayload.parent_account_id = payload.parentAccountId ?? null
  }

  if ('accountNumber' in payload) {
    updatePayload.account_number = payload.accountNumber ?? null
  }

  if ('receiverName' in payload) {
    updatePayload.receiver_name = payload.receiverName ?? null
  }

  const result = await updateAccountConfig(payload.id, updatePayload)

  if (result) {
    revalidatePath('/accounts')
    revalidatePath(`/accounts/${payload.id}`)
  }

  return result
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
    .select('id, name, type, image_url')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching accounts:', error)
    return []
  }
  console.log('getAccountsAction: returning', data?.length, 'accounts')
  return data
}
