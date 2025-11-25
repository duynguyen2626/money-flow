'use server'

import { revalidatePath } from 'next/cache'

import {
  SubscriptionPayload,
  checkAndProcessSubscriptions,
  createSubscription,
  updateSubscription,
} from '@/services/subscription.service'

export async function createSubscriptionAction(payload: SubscriptionPayload) {
  const created = await createSubscription(payload)
  if (created) {
    revalidatePath('/services')
    revalidatePath('/people')
  }
  return created
}

export async function updateSubscriptionAction(id: string, payload: SubscriptionPayload) {
  const ok = await updateSubscription(id, payload)
  if (ok) {
    revalidatePath('/services')
    revalidatePath('/people')
  }
  return ok
}

export async function runSubscriptionBotAction(isManualForce: boolean = false) {
  return checkAndProcessSubscriptions(isManualForce)
}
