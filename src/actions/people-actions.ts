'use server'

import { revalidatePath } from 'next/cache'
import { createPerson, ensureDebtAccount, updatePerson } from '@/services/people.service'

export async function createPersonAction(payload: {
  name: string
  email?: string | null
  avatar_url?: string | null
  sheet_link?: string | null
  subscriptionIds?: string[]
}) {
  const result = await createPerson(
    payload.name,
    payload.email ?? undefined,
    payload.avatar_url ?? undefined,
    payload.sheet_link ?? undefined,
    payload.subscriptionIds
  )
  if (result) {
    revalidatePath('/people')
  }
  return result
}

export async function ensureDebtAccountAction(personId: string, personName?: string) {
  const accountId = await ensureDebtAccount(personId, personName)
  if (accountId) {
    revalidatePath('/people')
  }
  return accountId
}

export async function updatePersonAction(
  id: string,
  payload: {
    name?: string
    email?: string | null
    avatar_url?: string | null
    sheet_link?: string | null
    subscriptionIds?: string[]
  }
) {
  const ok = await updatePerson(id, payload)
  if (ok) {
    revalidatePath('/people')
  }
  return ok
}
