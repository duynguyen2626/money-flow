import { parseCashbackConfig, calculateBankCashback, CashbackLevel, CashbackCategoryRule } from '@/lib/cashback'
import { CashbackPolicyMetadata } from '@/types/cashback.types'

export type CashbackPolicyResult = {
    rate: number
    maxReward?: number
    minSpend?: number
    metadata: CashbackPolicyMetadata
}

/**
 * MF5.3: Single entry point to resolve cashback policy for a transaction.
 * Handles:
 * 1. Spend-based levels (tiers)
 * 2. Category-based rules
 * 3. Fallbacks to program defaults
 */
export function resolveCashbackPolicy(params: {
    account: { id?: string; cashback_config: any }
    categoryId?: string | null
    amount: number
    cycleTotals: {
        spent: number
    }
    categoryName?: string // Helper for legacy matching
}): CashbackPolicyResult {
    const { account, amount, categoryId, categoryName, cycleTotals } = params
    const config = parseCashbackConfig(account.cashback_config, account.id || 'unknown')

    // 1. If no MF5.3 program exists, fallback to Legacy Logic (MF5.2)
    if (!config.program) {
        const { rate } = calculateBankCashback(
            config,
            amount,
            categoryName,
            cycleTotals.spent
        )
        return {
            rate,
            minSpend: config.minSpend ?? undefined,
            metadata: {
                policySource: 'legacy',
                reason: `Legacy rule matched for ${categoryName || 'generic spend'}`,
                rate
            }
        }
    }

    const { program } = config
    let finalRate = program.defaultRate
    let finalMaxReward: number | undefined = undefined
    let source: CashbackPolicyResult['metadata'] = {
        policySource: 'program_default',
        reason: 'Program default rate',
        rate: finalRate
    }

    // 2. Select Level by spent_amount
    let applicableLevel: CashbackLevel | undefined = undefined
    if (program.levels && program.levels.length > 0) {
        const sortedLevels = [...program.levels].sort((a, b) => b.minTotalSpend - a.minTotalSpend)
        applicableLevel = sortedLevels.find(lvl => cycleTotals.spent >= lvl.minTotalSpend)

        if (applicableLevel) {
            finalRate = applicableLevel.defaultRate ?? program.defaultRate
            source = {
                policySource: 'level_default',
                reason: `Level matched: ${applicableLevel.name}`,
                rate: finalRate,
                levelId: applicableLevel.id,
                levelName: applicableLevel.name,
                levelMinSpend: applicableLevel.minTotalSpend
            }

            // 3. Match Category Rule within Level
            if (categoryId && applicableLevel.rules) {
                const matchedRule = applicableLevel.rules.find(rule =>
                    rule.categoryIds.includes(categoryId)
                )

                if (matchedRule) {
                    finalRate = matchedRule.rate
                    finalMaxReward = matchedRule.maxReward ?? undefined
                    const reasonLabel = categoryName ? `${categoryName} rule` : `Category rule matched for level ${applicableLevel.name}`
                    source = {
                        policySource: 'category_rule',
                        reason: reasonLabel,
                        rate: finalRate,
                        levelId: applicableLevel.id,
                        levelName: applicableLevel.name,
                        levelMinSpend: applicableLevel.minTotalSpend,
                        categoryId: categoryId,
                        ruleMaxReward: matchedRule.maxReward
                    }
                }
            }
        }
    }

    return {
        rate: finalRate,
        maxReward: finalMaxReward,
        minSpend: program.minSpendTarget ?? undefined,
        metadata: source
    }
}
