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

    // 2. Select Level by spent_amount (Highest qualifying level wins)
    // Sort levels by minTotalSpend DESC
    if (program.levels && program.levels.length > 0) {
        // Create a copy to sort without mutating original
        const sortedLevels = [...program.levels].sort((a, b) => b.minTotalSpend - a.minTotalSpend)
        const applicableLevel = sortedLevels.find(lvl => cycleTotals.spent >= lvl.minTotalSpend)

        if (applicableLevel) {
            // Found a level. Set it as the new baseline (Level Default).
            // Level default overrides Program default.
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
                priority: 10 // Higher than program default (0)
            }

            // 3. Match Category Rule within the Active Level
            // Rules are specific to the ACTIVE level only.
            if (categoryId && applicableLevel.rules && applicableLevel.rules.length > 0) {
                // Find all rules that match this category
                const matchingRules = applicableLevel.rules.filter(rule =>
                    rule.categoryIds.includes(categoryId)
                )

                if (matchingRules.length > 0) {
                    // Sort matching rules for determinism:
                    // 1. Specificity (Ascending size of categoryIds) -> Fewer categories = More specific rule = Higher Win
                    // 2. Priority/Index (Ascending original index) -> Earlier rule = Higher Win (Implicit priority)

                    // We need original index. `applicableLevel.rules` is the source of truth for order.
                    const rulesWithIndex = matchingRules.map(r => ({
                        ...r,
                        originalIndex: applicableLevel.rules!.indexOf(r)
                    }))

                    rulesWithIndex.sort((a, b) => {
                        // 1. Specificity: Smaller count first
                        const specDiff = a.categoryIds.length - b.categoryIds.length
                        if (specDiff !== 0) return specDiff

                        // 2. Priority: Lower index first
                        return a.originalIndex - b.originalIndex
                    })

                    const matchedRule = rulesWithIndex[0] // Best match wins

                    finalRate = matchedRule.rate
                    finalMaxReward = matchedRule.maxReward ?? undefined
                    const reasonLabel = categoryName
                        ? `${categoryName} rule (${applicableLevel.name})`
                        : `Category rule matched for level ${applicableLevel.name}`

                    source = {
                        policySource: 'category_rule',
                        reason: reasonLabel,
                        rate: finalRate,
                        levelId: applicableLevel.id,
                        levelName: applicableLevel.name,
                        levelMinSpend: applicableLevel.minTotalSpend,
                        categoryId: categoryId,
                        ruleId: matchedRule.id,
                        ruleMaxReward: matchedRule.maxReward,
                        ruleType: 'category',
                        // Priority Calculation:
                        // Base 20 (Category Rule) + (1000 - Index) to ensure earlier rules are "higher" value if we visualized value?
                        // Wait, implicit priority means EARLIER index is BETTER.
                        // Let's just store a number that represents "winningness" is hard.
                        // Let's store 20. The Determinism is in the LOGIC above, not just this number.
                        // But to be helpful, let's distinguish them.
                        priority: 20
                    }
                } else {
                    // No rule matched within the level -> fall back to program default (not level default)
                    finalRate = program.defaultRate
                    finalMaxReward = undefined
                    source = {
                        policySource: 'program_default',
                        reason: categoryName
                            ? `No rule for ${categoryName}, use program default`
                            : 'No rule matched, use program default',
                        rate: finalRate,
                        ruleType: 'program_default',
                        priority: 0
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
