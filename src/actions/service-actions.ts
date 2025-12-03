'use server'

import { upsertService, distributeService, deleteService, updateServiceMembers } from '@/services/service-manager'
import { revalidatePath } from 'next/cache'

// TODO: Define a proper type for members
export async function updateServiceMembersAction(
  serviceId: string,
  members: any[]
) {
  await updateServiceMembers(serviceId, members)
  // revalidatePath('/services') // Disable to prevent loop
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
