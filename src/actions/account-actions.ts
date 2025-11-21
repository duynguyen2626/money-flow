'use server'

import { updateAccountConfig } from '@/services/account.service'
import { Json } from '@/types/database.types'
import { Account } from '@/types/moneyflow.types'

export type UpdateAccountPayload = {
  id: string
  name: string
  creditLimit: number | null
  cashbackConfig?: Json | null
  type?: Account['type']
  securedByAccountId?: string | null
}

export async function updateAccountConfigAction(payload: UpdateAccountPayload) {
  return updateAccountConfig(payload.id, {
    name: payload.name,
    credit_limit: payload.creditLimit,
    cashback_config: payload.cashbackConfig,
    type: payload.type,
    secured_by_account_id: payload.securedByAccountId,
  })
}
