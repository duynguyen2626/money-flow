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
    account: {
        id?: string;
        cashback_config: any;
        cb_type?: string;
        cb_base_rate?: number;
        cb_max_budget?: number | null;
        cb_is_unlimited?: boolean;
        cb_rules_json?: any;
    }
    categoryId?: string | null
    amount: number
    cycleTotals: {
        spent: number
    }
    categoryName?: string // Helper for legacy matching
}): CashbackPolicyResult {
    const { account, amount, categoryId, categoryName, cycleTotals } = params

    // PRIORITY 1: New Column-based Config
    if (account.cb_type && account.cb_type !== 'none') {
        const baseRate = Number(account.cb_base_rate ?? 0) / 100;
        const maxBudget = account.cb_is_unlimited ? undefined : (account.cb_max_budget ?? undefined);

        let finalRate = baseRate;
        let finalMaxReward: number | undefined = undefined;
        let source: CashbackPolicyResult['metadata'] = {
            policySource: 'program_default',
            reason: 'Card base rate',
            rate: finalRate,
            ruleType: 'program_default',
            priority: 0
        };

        if (account.cb_type === 'tiered' && Array.isArray(account.cb_rules_json)) {
            const levels = (account.cb_rules_json as any[]).sort((a, b) => b.minTotalSpend - a.minTotalSpend);
            const qualifiedLevels = levels.filter(lvl => cycleTotals.spent >= (lvl.minTotalSpend ?? 0));

            let matchedRule: any = null;
            if (categoryId && qualifiedLevels.length > 0) {
                for (const lvl of qualifiedLevels) {
                    const rules = Array.isArray(lvl.rules) ? lvl.rules : [];
                    const found = rules.find((r: any) => r.categoryIds?.includes(categoryId) || r.cat_ids?.includes(categoryId));
                    if (found) {
                        matchedRule = { ...found, level: lvl };
                        break;
                    }
                }
            }

            if (matchedRule) {
                finalRate = Number(matchedRule.rate ?? 0) / 100;
                finalMaxReward = matchedRule.maxReward ?? matchedRule.max ?? undefined;
                source = {
                    policySource: 'category_rule',
                    reason: categoryName ? `${categoryName} rule` : 'Category rule matched',
                    rate: finalRate,
                    levelId: matchedRule.level.id,
                    levelName: matchedRule.level.name,
                    levelMinSpend: matchedRule.level.minTotalSpend,
                    categoryId: categoryId || undefined,
                    ruleId: matchedRule.id,
                    ruleMaxReward: finalMaxReward,
                    ruleType: 'category',
                    priority: 20
                };
            } else if (qualifiedLevels.length > 0) {
                const topLevel = qualifiedLevels[0];
                finalRate = topLevel.defaultRate !== undefined && topLevel.defaultRate !== null ? Number(topLevel.defaultRate) / 100 : baseRate;
                source = {
                    policySource: 'level_default',
                    reason: `Level matched: ${topLevel.name}`,
                    rate: finalRate,
                    levelId: topLevel.id,
                    levelName: topLevel.name,
                    levelMinSpend: topLevel.minTotalSpend,
                    ruleType: 'level_default',
                    priority: 10
                };
            }
        } else if (account.cb_type === 'simple' && Array.isArray(account.cb_rules_json)) {
            const rules = account.cb_rules_json as any[];
            const matchedRule = categoryId ? rules.find((r: any) => r.categoryIds?.includes(categoryId) || r.cat_ids?.includes(categoryId)) : null;

            if (matchedRule) {
                finalRate = Number(matchedRule.rate ?? 0) / 100;
                finalMaxReward = matchedRule.maxReward ?? matchedRule.max ?? undefined;
                source = {
                    policySource: 'category_rule',
                    reason: categoryName ? `${categoryName} rule` : 'Category rule matched',
                    rate: finalRate,
                    categoryId: categoryId || undefined,
                    ruleId: matchedRule.id,
                    ruleMaxReward: finalMaxReward,
                    ruleType: 'category',
                    priority: 20
                };
            }
        }

        return {
            rate: finalRate,
            maxReward: finalMaxReward,
            metadata: source
        };
    }

    // PRIORITY 2: Old JSON-based Config (Fallback for compatibility)
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
        // MF5.4.4: Support inheriting level default rate if rule rate is 0/null
        const ruleRate = matchedRule.rate > 0 ? matchedRule.rate : (matchedRule.level.defaultRate ?? program.defaultRate);
        finalRate = ruleRate
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
