'use server'

import { createClient } from '@/lib/supabase/server'
import { recalculateBalance } from '@/services/account.service'
import { revalidatePath } from 'next/cache'

export async function fixAllAccountBalances() {
    const supabase = createClient()

    try {
        // 1. Get all accounts
        const { data: accounts, error } = await supabase
            .from('accounts')
            .select('id, name')

        if (error) throw error

        if (!accounts || accounts.length === 0) {
            return { success: true, message: 'No accounts found' }
        }

        // 2. Recalculate each account
        let successCount = 0
        let failCount = 0

        // Cast accounts to any[] or specific type to avoid 'never' error
        const accountList = accounts as unknown as { id: string; name: string }[]

        for (const account of accountList) {
            try {
                const result = await recalculateBalance(account.id)
                if (result) successCount++
                else failCount++
            } catch (e) {
                console.error(`Failed to recalculate account ${account.name} (${account.id})`, e)
                failCount++
            }
        }

        revalidatePath('/accounts')

        return {
            success: true,
            message: `Recalculated ${successCount} accounts. Failed: ${failCount}`
        }
    } catch (error: any) {
        console.error('Error in fixAllAccountBalances:', error)
        return { success: false, error: error.message }
    }
}
