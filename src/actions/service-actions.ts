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
    .select('*')
    .contains('metadata', metadata)
    .single()

  let transactionId = (existingTx as any)?.id

  if (existingTx) {
    // Update existing transaction
    await (supabase
      .from('transactions') as any)
      .update({
        occurred_at: new Date(date).toISOString(),
        note: `Payment for Service ${monthTag}`,
        tag: monthTag
        // metadata is already there
      })
      .eq('id', transactionId)

    // Delete existing lines
    await supabase
      .from('transaction_lines')
      .delete()
      .eq('transaction_id', transactionId)
  } else {
    // Create new transaction
    const { data: transaction, error: txError } = await (supabase
      .from('transactions') as any)
      .insert([{
        occurred_at: new Date(date).toISOString(),
        note: `Payment for Service ${monthTag}`,
        metadata: metadata,
        tag: monthTag
      }])
      .select()
      .single()

    if (txError) throw new Error(txError.message)
    transactionId = (transaction as any).id
  }

  const lines = [
    {
      transaction_id: transactionId,
      account_id: accountId, // Real Bank
      amount: -amount,
      type: 'credit',
      category_id: SYSTEM_CATEGORIES.ONLINE_SERVICES // Add category to credit line to ensure UI sees it as Expense
    },
    {
      transaction_id: transactionId,
      account_id: SYSTEM_ACCOUNTS.DRAFT_FUND, // Draft Fund
      amount: amount,
      type: 'debit',
      category_id: SYSTEM_CATEGORIES.ONLINE_SERVICES // Expense Category
    }
  ]

  const { error: linesError } = await supabase
    .from('transaction_lines')
    .insert(lines as any)

  if (linesError) throw new Error(linesError.message)

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
    .select(`
      *,
      transaction_lines!inner (
        amount,
        account_id
      )
    `)
    .contains('metadata', metadata)
    .single()

  if (error || !transaction) {
    return { confirmed: false, amount: 0 }
  }

  // Find the debit line (payment to Draft Fund) to get the positive amount
  // Or credit line (payment from Bank) which is negative
  // Let's take the absolute value of the first line for simplicity, or specifically look for the credit line.
  // The credit line amount is negative.
  const amount = Math.abs((transaction as any).transaction_lines[0].amount)

  return { confirmed: true, amount: amount, transactionId: (transaction as any).id }
}


export async function runAllServiceDistributionsAction(date?: string) {
  try {
    const result = await distributeAllServices(date)

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
