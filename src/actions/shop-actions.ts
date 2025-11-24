'use server'

import { revalidatePath } from 'next/cache'
import { createShop, updateShop } from '@/services/shop.service'

export async function createShopAction(payload: {
  name: string
  logo_url?: string | null
  default_category_id?: string | null
}) {
  const result = await createShop(payload)
  if (result) {
    revalidatePath('/shops')
    revalidatePath('/transactions')
    revalidatePath('/accounts')
    revalidatePath('/people')
  }
  return result
}

export async function updateShopAction(
  id: string,
  payload: { name?: string; logo_url?: string | null; default_category_id?: string | null }
) {
  const ok = await updateShop(id, payload)
  if (ok) {
    revalidatePath('/shops')
    revalidatePath('/transactions')
    revalidatePath('/accounts')
    revalidatePath('/people')
  }
  return ok
}
