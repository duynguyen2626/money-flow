'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Json } from '@/types/database.types'

export async function updateAccountInfo(accountId: string, data: { account_number?: string, receiver_name?: string }) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('accounts')
      .update(data)
      .eq('id', accountId)

    if (error) throw error

    revalidatePath(`/accounts/${accountId}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to update account info', error)
    return { success: false, error }
  }
}

type CreateAccountParams = {
  name: string
  type: string
  creditLimit?: number | null
  cashbackConfig?: Json
  securedByAccountId?: string | null
  imageUrl?: string | null
  annualFee?: number | null
  parentAccountId?: string | null
  accountNumber?: string | null
  receiverName?: string | null
}

export async function createAccount(params: CreateAccountParams) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: { message: 'User not authenticated' } }
  }

  const {
    name,
    type,
    creditLimit,
    cashbackConfig,
    securedByAccountId,
    imageUrl,
    annualFee,
    parentAccountId,
    accountNumber,
    receiverName
  } = params

  // Insert into DB
  const { error } = await supabase
    .from('accounts')
    .insert({
      owner_id: user.id,
      name,
      type,
      credit_limit: creditLimit,
      cashback_config: cashbackConfig,
      secured_by_account_id: securedByAccountId,
      image_url: imageUrl,
      annual_fee: annualFee,
      parent_account_id: parentAccountId,
      account_number: accountNumber,
      receiver_name: receiverName,
      current_balance: 0 // Default starting balance
    })

  if (error) {
    console.error('Error creating account:', error)
    return { error }
  }

  revalidatePath('/accounts')
  return { error: null }
}

export async function getAccountsAction() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('name')

  if (error) {
    console.error('Failed to fetch accounts:', error)
    return []
  }

  return data
}

/**
 * Action wrapper for updating account configuration
 * Matches the interface expected by EditAccountDialog
 */
export async function updateAccountConfigAction(params: {
  id: string
  name?: string
  creditLimit?: number | null
  annualFee?: number | null
  annualFeeWaiverTarget?: number | null
  cashbackConfig?: Json | null
  type?: string
  securedByAccountId?: string | null
  isActive?: boolean | null
  imageUrl?: string | null
  parentAccountId?: string | null
  accountNumber?: string | null
  receiverName?: string | null
}) {
  const { updateAccountConfig } = await import('@/services/account.service')

  const success = await updateAccountConfig(params.id, {
    name: params.name,
    credit_limit: params.creditLimit,
    annual_fee: params.annualFee,
    annual_fee_waiver_target: params.annualFeeWaiverTarget,
    cashback_config: params.cashbackConfig,
    type: params.type as any,
    secured_by_account_id: params.securedByAccountId,
    is_active: params.isActive,
    image_url: params.imageUrl,
    parent_account_id: params.parentAccountId,
    account_number: params.accountNumber,
    receiver_name: params.receiverName
  })

  if (success) {
    revalidatePath('/accounts')
    revalidatePath(`/accounts/${params.id}`)
  }

  return success
}
