'use server'

import { deleteBankMappings } from '@/services/bank.service'
import { revalidatePath } from 'next/cache'

export async function deleteBankMappingsAction(ids: string[]) {
    await deleteBankMappings(ids)
    revalidatePath('/batch')
}
