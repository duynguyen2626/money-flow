'use server'

import { upsertService, distributeService, deleteService, updateServiceMembers, getServiceBotConfig, saveServiceBotConfig, distributeAllServices } from '@/services/service-manager'
import { processBatchInstallments } from '@/services/installment.service'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_ACCOUNTS, SYSTEM_CATEGORIES } from '@/lib/constants'

// TODO: Define a proper type for members
export async function updateServiceMembersAction(
  serviceId: string,
  members: any[]
) {
  await updateServiceMembers(serviceId, members)
  // revalidatePath('/services') // Disable to prevent loop
}

export async function upsertServiceAction(serviceData: any) {
  try {
    const result = await upsertService(serviceData)
    revalidatePath('/services')
    revalidatePath(`/services/${(result as any).id}`)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function distributeServiceAction(serviceId: string, customDate?: string, customNoteFormat?: string) {
  try {
    const transactions = await distributeService(serviceId, customDate, customNoteFormat)

    // Recalculate balance for DRAFT_FUND as it's the account used
    const { recalculateBalance } = await import('@/services/account.service')
    await recalculateBalance(SYSTEM_ACCOUNTS.DRAFT_FUND)

    revalidatePath('/services')
    revalidatePath('/')
    revalidatePath('/transactions')
    return { success: true, transactions }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteServiceAction(serviceId: string) {
  try {
    await deleteService(serviceId)
    revalidatePath('/services')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getServiceBotConfigAction(serviceId: string) {
  return await getServiceBotConfig(serviceId)
}

export async function saveServiceBotConfigAction(serviceId: string, config: any) {
  const result = await saveServiceBotConfig(serviceId, config)
  revalidatePath(`/services/${serviceId}`)
  return result
}

export async function confirmServicePaymentAction(serviceId: string, accountId: string, amount: number, date: string, monthTag: string) {
  const supabase = createClient()

  const metadata = {
    service_id: serviceId,
    month_tag: monthTag,
    type: 'service_payment'
  }

  // Check for existing payment
  const { data: existingTx } = await supabase
    .from('transactions')
    .select('id')
    .contains('metadata', metadata)
    .maybeSingle()

  let transactionId = (existingTx as any)?.id

  // Single Table Architecture: Transfer from Bank (accountId) to Draft Fund
  const payload = {
    occurred_at: new Date(date).toISOString(),
    note: `Payment for Service ${monthTag}`,
    tag: monthTag,
    type: 'transfer',
    status: 'posted',
    account_id: accountId,               // Source: Real Bank
    target_account_id: SYSTEM_ACCOUNTS.DRAFT_FUND, // Target: Draft Fund
    amount: -Math.abs(amount),           // Outflow from source
    category_id: SYSTEM_CATEGORIES.ONLINE_SERVICES,
    metadata: metadata, // metadata is merged on update, or set on insert
    person_id: null,
    shop_id: null
  }

  if (existingTx) {
    // Update existing transaction
    const { error } = await (supabase
      .from('transactions') as any)
      .update(payload)
      .eq('id', transactionId)

    if (error) throw new Error(error.message)
  } else {
    // Create new transaction
    const { data: transaction, error: txError } = await (supabase
      .from('transactions') as any)
      .insert([payload])
      .select()
      .single()

    if (txError) throw new Error(txError.message)
    transactionId = (transaction as any).id
  }

  // Recalculate balances for both accounts
  const { recalculateBalance } = await import('@/services/account.service')
  await Promise.all([
    recalculateBalance(accountId),
    recalculateBalance(SYSTEM_ACCOUNTS.DRAFT_FUND)
  ])

  revalidatePath(`/services/${serviceId}`)
  revalidatePath('/accounts')
  return { success: true }
}

export async function getServicePaymentStatusAction(serviceId: string, monthTag: string) {
  const supabase = createClient()

  const metadata = {
    service_id: serviceId,
    month_tag: monthTag,
    type: 'service_payment'
  }

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select('id, amount, account_id, target_account_id, type')
    .contains('metadata', metadata)
    .maybeSingle()

  if (error || !transaction) {
    return { confirmed: false, amount: 0 }
  }

  // In single table, amount is negative for transfer source.
  // We want to return positive amount paid.
  const amount = Math.abs((transaction as any).amount)

  return { confirmed: true, amount: amount, transactionId: (transaction as any).id }
}


export async function runAllServiceDistributionsAction(date?: string) {
  try {
    const result = await distributeAllServices(date)

    // Recalculate DRAFT_FUND balance after mass distribution
    const { recalculateBalance } = await import('@/services/account.service')
    await recalculateBalance(SYSTEM_ACCOUNTS.DRAFT_FUND)

    // Also run Installment Batch Processing
    try {
      await processBatchInstallments(date)
    } catch (e) {
      console.error('Error processing installments:', e)
    }

    revalidatePath('/services')
    revalidatePath('/')
    revalidatePath('/transactions')
    return result
  } catch (error: any) {
    console.error('Error running all distributions:', error)
    return { success: 0, failed: 0, total: 0, error: error.message }
  }
}
