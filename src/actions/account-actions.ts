'use server'

import { revalidatePath } from 'next/cache'
import {
  createPocketBaseAccount,
  updatePocketBaseAccountInfo,
} from '@/services/pocketbase/account-details.service'
import { pocketbaseList, toPocketBaseId } from '@/services/pocketbase/server'
// Inline mapper to avoid circular 'use server' module issues
function mapAccountRow(record: any) {
  return {
    id: record.id,
    name: record.name ?? '',
    type: record.type ?? 'bank',
    currency: record.currency ?? 'VND',
    current_balance: Number(record.current_balance ?? 0),
    credit_limit: Number(record.credit_limit ?? 0),
    parent_account_id: record.parent_account_id || null,
    account_number: record.account_number || null,
    owner_id: record.owner_id || null,
    cashback_config: record.cashback_config ?? null,
    cashback_config_version: Number(record.cashback_config_version ?? 1),
    secured_by_account_id: record.secured_by_account_id || null,
    is_active: record.is_active ?? true,
    image_url: typeof record.image_url === 'string' && record.image_url.startsWith('http') ? record.image_url : null,
    receiver_name: record.receiver_name || null,
    total_in: Number(record.total_in ?? 0),
    total_out: Number(record.total_out ?? 0),
    annual_fee: Number(record.annual_fee ?? 0),
    annual_fee_waiver_target: Number(record.annual_fee_waiver_target ?? 0),
    cb_type: record.cb_type ?? 'none',
    cb_base_rate: Number(record.cb_base_rate ?? 0),
    cb_max_budget: Number(record.cb_max_budget ?? 0),
    cb_is_unlimited: record.cb_is_unlimited ?? false,
    cb_rules_json: record.cb_rules_json ?? null,
    cb_min_spend: Number(record.cb_min_spend ?? 0),
    cb_cycle_type: record.cb_cycle_type ?? 'calendar_month',
    statement_day: Number(record.statement_day ?? 0),
    due_date: Number(record.due_date ?? 0),
    holder_type: record.holder_type ?? null,
    holder_person_id: record.holder_person_id ?? null,
    created_at: record.created ?? null,
    updated_at: record.updated ?? null,
  }
}
import { Json } from '@/types/database.types'

type CreateAccountParams = {
  name: string
  type: string
  creditLimit?: number | null
  cashbackConfig?: Json
  securedByAccountId?: string | null
  imageUrl?: string | null
  annualFee?: number | null
  annualFeeWaiverTarget?: number | null
  parentAccountId?: string | null
  accountNumber?: string | null
  receiverName?: string | null
  cb_type?: 'none' | 'simple' | 'tiered'
  cb_base_rate?: number
  cb_max_budget?: number | null
  cb_is_unlimited?: boolean
  cb_rules_json?: Json | null
  cb_min_spend?: number | null
  cb_cycle_type?: 'calendar_month' | 'statement_cycle'
  statementDay?: number | null
  dueDate?: number | null
  holder_type?: 'me' | 'relative' | 'other'
  holder_person_id?: string | null
}

export async function createAccount(params: CreateAccountParams) {
  console.log('[DB:PB] accounts.create', { name: params.name, type: params.type })

  const tempId = crypto.randomUUID()

  try {
    console.log('[DB:PB] accounts.create SENDING', { tempId, name: params.name, type: params.type, holder_person_id: params.holder_person_id })
    const success = await createPocketBaseAccount(tempId, {
      ...params,
      owner_id: 'SYSTEM_MIGRATED',
      current_balance: 0,
      is_active: true,
      statement_day: params.statementDay,
      due_date: params.dueDate,
    } as any)

    if (!success) throw new Error('Failed to create account in PocketBase')

    console.log('[DB:PB] accounts.create SUCCESS', { name: params.name })
    revalidatePath('/accounts')
    return { success: true }
  } catch (error) {
    console.error('[DB:PB] accounts.create FAILED', { error: String(error) })
    return { success: false, error: (error as Error).message }
  }
}

export async function updateAccountInfo(accountId: string, data: { account_number?: string, receiver_name?: string }) {
  console.log('[DB:PB] accounts.updateInfo', { accountId })

  try {
    const success = await updatePocketBaseAccountInfo(accountId, {
      account_number: data.account_number ?? null,
      receiver_name: data.receiver_name ?? null,
    })

    if (!success) throw new Error('Failed to update account info in PocketBase')

    revalidatePath(`/accounts/${accountId}`)
    return { success: true }
  } catch (error) {
    console.error('[DB:PB] accounts.updateInfo failed:', error)
    return { success: false, error: (error as any).message }
  }
}

export async function getAccountsAction() {
  console.log('[DB:PB] accounts.getBatch')
  try {
    const response = await pocketbaseList<any>('accounts', {
      perPage: 200,
      sort: 'name'
    })
    return response.items.map(mapAccountRow)
  } catch (error) {
    console.error('[DB:PB] getAccountsAction failed:', error)
    return []
  }
}

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
  cb_type?: 'none' | 'simple' | 'tiered'
  cb_base_rate?: number
  cb_max_budget?: number | null
  cb_is_unlimited?: boolean
  cb_rules_json?: Json | null
  cb_min_spend?: number | null
  cb_cycle_type?: 'calendar_month' | 'statement_cycle'
  statementDay?: number | null
  dueDate?: number | null
  holder_type?: 'me' | 'relative' | 'other'
  holder_person_id?: string | null
}) {
  console.log('[DB:PB] accounts.updateConfig START', {
    id: params.id,
    name: params.name,
    type: params.type,
    holder_type: params.holder_type,
    holder_person_id: params.holder_person_id,
    cb_type: params.cb_type,
    has_cashback_config: !!params.cashbackConfig,
    has_cb_rules_json: !!params.cb_rules_json,
  })

  try {
    const success = await updatePocketBaseAccountInfo(params.id, {
      name: params.name,
      credit_limit: params.creditLimit,
      annual_fee: params.annualFee,
      annual_fee_waiver_target: params.annualFeeWaiverTarget,
      type: params.type,
      secured_by_account_id: params.securedByAccountId,
      is_active: params.isActive ?? undefined,
      image_url: params.imageUrl,
      parent_account_id: params.parentAccountId,
      account_number: params.accountNumber,
      receiver_name: params.receiverName,
      statement_day: params.statementDay,
      due_date: params.dueDate,
      holder_type: params.holder_type,
      holder_person_id: params.holder_person_id,
      // cb_* columns + cashback_config JSON
      ...({
        cb_type: params.cb_type,
        cb_base_rate: params.cb_base_rate,
        cb_max_budget: params.cb_max_budget,
        cb_is_unlimited: params.cb_is_unlimited,
        cb_rules_json: params.cb_rules_json,
        cb_min_spend: params.cb_min_spend,
        cb_cycle_type: params.cb_cycle_type,
        cashback_config: params.cashbackConfig,   // FIX: was missing — cashback_config JSON never updated before
      } as any)
    })

    if (!success) throw new Error('Failed to update account config in PocketBase')

    console.log('[DB:PB] accounts.updateConfig SUCCESS', { id: params.id })
    revalidatePath('/accounts')
    revalidatePath(`/accounts/${params.id}`)
    return { success: true }
  } catch (error) {
    console.error('[DB:PB] accounts.updateConfig FAILED', { id: params.id, error: String(error) })
    return { success: false, error: (error as Error).message }
  }
}

export async function getLastTransactionPersonId(): Promise<string | null> {
  try {
    const response = await pocketbaseList<any>('transactions', {
      filter: 'person_id != ""',
      sort: '-occurred_at',
      perPage: 1,
      fields: 'person_id'
    })
    return response.items[0]?.person_id ?? null
  } catch (error) {
    console.error('[DB:PB] getLastTransactionPersonId failed:', error)
    return null
  }
}

export async function getLastTransactionAccountId(): Promise<string | null> {
  try {
    const response = await pocketbaseList<any>('transactions', {
      filter: 'account_id != ""',
      sort: '-occurred_at',
      perPage: 1,
      fields: 'account_id'
    })
    return response.items[0]?.account_id ?? null
  } catch (error) {
    console.error('[DB:PB] getLastTransactionAccountId failed:', error)
    return null
  }
}
