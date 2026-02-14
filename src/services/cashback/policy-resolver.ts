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
        // Fix: Ensure we return metadata even for legacy fallback, but strictly typed
        // The previous code returned rate/minSpend but the return type requires metadata.
        return {
            rate,
            minSpend: config.minSpend ?? undefined,
            metadata: {
                policySource: 'legacy',
                reason: `Legacy rule matched for ${categoryName || 'generic spend'}`,
                rate,
                ruleType: 'legacy',
                priority: 0
            }
        }
    }

    const { program } = config

    // Default: Program fallback
    let finalRate = program.defaultRate
    let finalMaxReward: number | undefined = undefined

    // Base metadata: Program Default
    let source: CashbackPolicyResult['metadata'] = {
        policySource: 'program_default',
        reason: 'Program default rate',
        rate: finalRate,
        ruleType: 'program_default',
        priority: 0
    }

    // Gate: if program has minSpendTarget and current spend is below it, skip levels and stay at program default
    const requiresMinSpend = typeof program.minSpendTarget === 'number' && program.minSpendTarget > 0
    if (requiresMinSpend && program.minSpendTarget && cycleTotals.spent < program.minSpendTarget) {
        return {
            rate: program.defaultRate,
            maxReward: undefined,
            minSpend: program.minSpendTarget ?? undefined,
            metadata: {
                policySource: 'program_default',
                reason: `Below min spend target (${program.minSpendTarget})`,
                rate: program.defaultRate,
                ruleType: 'program_default',
                priority: 0
            }
        }
    }

    // 2. Aggregate all qualified levels based on spend (highest first)
    const sortedLevels = program.levels ? [...program.levels].sort((a, b) => b.minTotalSpend - a.minTotalSpend) : []
    const qualifiedLevels = sortedLevels.filter(lvl => cycleTotals.spent >= lvl.minTotalSpend)

    let matchedRule: (CashbackCategoryRule & { level: CashbackLevel }) | undefined = undefined

    // 3. Find the best matching Category Rule across ALL qualified levels
    // We prioritize rules in HIGHER levels, but search them all.
    if (categoryId && qualifiedLevels.length > 0) {
        for (const lvl of qualifiedLevels) {
            if (lvl.rules && lvl.rules.length > 0) {
                const matchingRules = lvl.rules.filter(rule =>
                    rule.categoryIds.includes(categoryId)
                )

                if (matchingRules.length > 0) {
                    // Sort matching rules within THIS level by specificity
                    const rulesWithIndex = matchingRules.map(r => ({
                        ...r,
                        originalIndex: lvl.rules!.indexOf(r)
                    }))

                    rulesWithIndex.sort((a, b) => {
                        const specDiff = a.categoryIds.length - b.categoryIds.length
                        if (specDiff !== 0) return specDiff
                        return a.originalIndex - b.originalIndex
                    })

                    // We found our candidate in the highest qualifying level that actually has a rule
                    matchedRule = { ...rulesWithIndex[0], level: lvl }
                    break // Stop searching lower levels as we found a match in high tier
                }
            }
        }
    }

    // 4. Determine final policy
    const applicableLevel = qualifiedLevels[0] // The actual tier user is in based on spend

    if (matchedRule) {
        // High Tier found a rule (either directly or inherited)
        finalRate = matchedRule.rate
        finalMaxReward = matchedRule.maxReward ?? undefined

        const reasonLabel = categoryName
            ? `${categoryName} rule (${matchedRule.level.name})`
            : `Category rule matched for level ${matchedRule.level.name}`

        source = {
            policySource: 'category_rule',
            reason: reasonLabel,
            rate: finalRate,
            levelId: matchedRule.level.id,
            levelName: matchedRule.level.name,
            levelMinSpend: matchedRule.level.minTotalSpend,
            categoryId: categoryId || undefined,
            ruleId: matchedRule.id,
            ruleMaxReward: matchedRule.maxReward,
            ruleType: 'category',
            priority: 20
        }
    } else if (applicableLevel) {
        // No category rule found anywhere -> Tier Default
        const levelDefaultRate = applicableLevel.defaultRate ?? program.defaultRate
        finalRate = levelDefaultRate

        source = {
            policySource: 'level_default',
            reason: `Level matched: ${applicableLevel.name}`,
            rate: finalRate,
            levelId: applicableLevel.id,
            levelName: applicableLevel.name,
            levelMinSpend: applicableLevel.minTotalSpend,
            ruleType: 'level_default',
            priority: 10
        }
    }

    return {
        rate: finalRate,
        maxReward: finalMaxReward,
        minSpend: program.minSpendTarget ?? undefined,
        metadata: source
    }
}
