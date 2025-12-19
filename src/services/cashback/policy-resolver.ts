import { Account } from '@/types/moneyflow.types'
import { parseCashbackConfig, calculateBankCashback } from '@/lib/cashback'

export type CashbackPolicyResult = {
    rate: number
    maxReward?: number
    minSpend?: number
}

/**
 * MF5.3 PREP: Single entry point to resolve cashback policy for a transaction.
 * Currently just reads account config, but in MF5.3 this will handle
 * category-based rules, tier lookup by total spend, etc.
 */
export function resolveCashbackPolicy(params: {
    account: { cashback_config: any }
    categoryId?: string | null
    amount: number
    cycleTotals: {
        spent: number
    }
    categoryName?: string // Helper for now until we fully switch to ID
}): CashbackPolicyResult {
    const { account, amount, categoryName, cycleTotals } = params

    const config = parseCashbackConfig(account.cashback_config)

    // MF5.2 Logic: Use existing calculator which ALREADY supports basic tiers
    const { rate } = calculateBankCashback(
        config,
        amount,
        categoryName,
        cycleTotals.spent
    )

    return {
        rate,
        maxReward: undefined, // Per-transaction cap (not yet supported globally, only total cap)
        minSpend: config.minSpend ?? undefined
    }
}
