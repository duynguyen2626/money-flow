'use server'

import { updateAccountConfig } from '@/services/account.service'
import { Json } from '@/types/database.types'

export type UpdateAccountPayload = {
  id: string
  name: string
  creditLimit: number | null
  cashbackConfig?: Json | null
}

export async function updateAccountConfigAction(payload: UpdateAccountPayload) {
  return updateAccountConfig(payload.id, {
    name: payload.name,
    credit_limit: payload.creditLimit,
    cashback_config: payload.cashbackConfig,
  })
}
