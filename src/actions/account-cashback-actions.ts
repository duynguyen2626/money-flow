'use server'

import { getPocketBaseAccountSpendingStatsSnapshot } from '@/services/pocketbase/account-details.service'
import { AccountSpendingStats } from '@/types/cashback.types'

export async function getAccountCashbackStatsAction(
  sourceAccountId: string,
  cycleTag?: string
): Promise<{ success: boolean; data?: AccountSpendingStats | null; error?: string }> {
  try {
    const stats = await getPocketBaseAccountSpendingStatsSnapshot(sourceAccountId, cycleTag)
    return { success: true, data: stats }
  } catch (err) {
    console.error('[action] getAccountCashbackStats failed:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch cashback stats',
    }
  }
}
