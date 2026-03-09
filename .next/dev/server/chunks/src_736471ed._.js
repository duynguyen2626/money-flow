module.exports = [
"[project]/src/lib/pocketbase/fallback-helpers.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * PocketBase Fallback Helpers
 * Provides resilient query retry and fallback logic
 */ /**
 * Check if error is PB 400 or 404 (recoverable for fallback)
 */ __turbopack_context__.s([
    "executeWithAttempts",
    ()=>executeWithAttempts,
    "executeWithFallback",
    ()=>executeWithFallback,
    "isPocketBase400Or404",
    ()=>isPocketBase400Or404,
    "isPocketBaseAuthError",
    ()=>isPocketBaseAuthError,
    "logSource",
    ()=>logSource
]);
function isPocketBase400Or404(error) {
    const err = error;
    return err?.status === 400 || err?.status === 404 || err?.message?.includes('400') || err?.message?.includes('404');
}
function isPocketBaseAuthError(error) {
    const err = error;
    return err?.status === 401 || err?.status === 403;
}
async function executeWithFallback(pbQuery, sbQuery, context) {
    try {
        console.log(`[source:PB] ${context}`);
        const result = await pbQuery();
        console.log(`[source:PB] ${context} - success`);
        return result;
    } catch (error) {
        if (isPocketBase400Or404(error)) {
            console.warn(`[source:PB] ${context} failed (${error?.status || '?'})`, error);
            console.log(`[source:SB] ${context} - falling back to Supabase`);
            try {
                const result = await sbQuery();
                console.log(`[source:SB] ${context} - success (fallback)`);
                return result;
            } catch (sbError) {
                console.error(`[source:SB] ${context} - fallback also failed`, sbError);
                throw sbError;
            }
        }
        // Rethrow auth errors and other non-recoverable errors
        console.error(`[source:PB] ${context} - non-recoverable error`, error);
        throw error;
    }
}
async function executeWithAttempts(attempts, context, sbQuery) {
    let lastError;
    for(let i = 0; i < attempts.length; i++){
        try {
            console.log(`[source:PB] ${context} - attempt ${i + 1}/${attempts.length}`);
            const result = await attempts[i]();
            console.log(`[source:PB] ${context} - success on attempt ${i + 1}`);
            return result;
        } catch (error) {
            lastError = error;
            if (!isPocketBase400Or404(error)) {
                // Rethrow non-recoverable errors immediately
                console.error(`[source:PB] ${context} - non-recoverable error on attempt ${i + 1}`, error);
                throw error;
            }
            console.warn(`[source:PB] ${context} - attempt ${i + 1} failed (${error?.status || '?'}), trying next...`);
        }
    }
    // All PB attempts failed, try Supabase
    if (sbQuery) {
        console.log(`[source:SB] ${context} - all PB attempts failed, falling back to Supabase`);
        try {
            const result = await sbQuery();
            console.log(`[source:SB] ${context} - success (fallback)`);
            return result;
        } catch (sbError) {
            console.error(`[source:SB] ${context} - fallback also failed`, sbError);
            throw sbError;
        }
    }
    // No fallback provided, rethrow last error
    console.error(`[source:PB] ${context} - all attempts exhausted, no fallback available`);
    throw lastError;
}
function logSource(source, action, details) {
    const prefix = `[source:${source}]`;
    if (details) {
        console.log(`${prefix} ${action}`, details);
    } else {
        console.log(`${prefix} ${action}`);
    }
}
}),
"[project]/src/lib/cashback.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateBankCashback",
    ()=>calculateBankCashback,
    "formatIsoCycleTag",
    ()=>formatIsoCycleTag,
    "formatLegacyCycleTag",
    ()=>formatLegacyCycleTag,
    "getCashbackCycleRange",
    ()=>getCashbackCycleRange,
    "getCashbackCycleTag",
    ()=>getCashbackCycleTag,
    "getMinSpendStatus",
    ()=>getMinSpendStatus,
    "normalizeCashbackConfig",
    ()=>normalizeCashbackConfig,
    "normalizeRate",
    ()=>normalizeRate,
    "parseCashbackConfig",
    ()=>parseCashbackConfig,
    "parseCycleTag",
    ()=>parseCycleTag
]);
function parseConfigCandidate(raw, source) {
    if (!raw) {
        console.warn(`[parseCashbackConfig] Received null raw config from ${source}`);
        return {
            rate: 0,
            maxAmount: null,
            cycleType: 'calendar_month',
            statementDay: null,
            dueDate: null,
            minSpend: null
        };
    }
    // 1. Parse Program (MF5.3)
    let program = undefined;
    if (raw.program && typeof raw.program === 'object') {
        const p = raw.program;
        program = {
            defaultRate: Number(p.defaultRate ?? p.rate ?? raw.rate ?? 0),
            maxBudget: Number(p.maxBudget ?? p.maxAmount ?? 0) || null,
            cycleType: p.cycleType === 'statement_cycle' ? 'statement_cycle' : 'calendar_month',
            statementDay: Number(p.statementDay) || null,
            minSpendTarget: Number(p.minSpendTarget ?? p.minSpend) || null,
            dueDate: Number(p.dueDate) || null,
            levels: Array.isArray(p.levels) ? p.levels.map((lvl)=>({
                    id: String(lvl.id),
                    name: String(lvl.name),
                    minTotalSpend: Number(lvl.minTotalSpend ?? 0),
                    defaultRate: lvl.defaultRate !== undefined && lvl.defaultRate !== null ? Number(lvl.defaultRate) : null,
                    rules: Array.isArray(lvl.rules ?? lvl.categoryRules) ? (lvl.rules ?? lvl.categoryRules).map((rule)=>({
                            id: String(rule.id || Math.random().toString(36).substr(2, 9)),
                            categoryIds: Array.isArray(rule.categoryIds) ? rule.categoryIds.map(String) : [],
                            rate: Number(rule.rate ?? 0),
                            maxReward: rule.maxReward !== undefined && rule.maxReward !== null ? Number(rule.maxReward) : null
                        })) : []
                })) : undefined
        };
    }
    // 2. Fallback / Legacy Parsing
    // Check for keys in a more robust way
    const getVal = (keys)=>{
        for (const k of keys){
            if (raw[k] !== undefined && raw[k] !== null) return raw[k];
        }
        return undefined;
    };
    const rateValue = program ? program.defaultRate : Number(getVal([
        'rate'
    ]) ?? 0);
    const parsedRate = Number.isFinite(rateValue) ? rateValue : 0;
    const rawMax = program ? program.maxBudget : getVal([
        'max_amt',
        'maxAmount',
        'max_amount'
    ]);
    const maxAmount = rawMax !== undefined && rawMax !== null ? Number(rawMax) : null;
    // IMPORTANT: Fix for "cycleType=statement_cycle and statementDay=15 never default to calendar-month"
    const rawCycle = program ? program.cycleType : getVal([
        'cycle_type',
        'cycle',
        'cycleType'
    ]);
    let cycleType = rawCycle === 'statement_cycle' ? 'statement_cycle' : rawCycle === 'calendar_month' ? 'calendar_month' : null;
    const rawStatementDay = program ? program.statementDay : getVal([
        'statement_day',
        'statementDay',
        'statement_date'
    ]);
    let statementDay = null;
    if (rawStatementDay !== undefined && rawStatementDay !== null) {
        const num = Number(rawStatementDay);
        if (Number.isFinite(num)) {
            statementDay = Math.min(Math.max(Math.floor(num), 1), 31);
        }
    }
    const rawDueDate = program ? program.dueDate : getVal([
        'due_date',
        'dueDate',
        'due_day'
    ]);
    let dueDate = null;
    if (rawDueDate !== undefined && rawDueDate !== null) {
        const num = Number(rawDueDate);
        if (Number.isFinite(num)) {
            dueDate = Math.min(Math.max(Math.floor(num), 1), 31);
        }
    }
    const rawMinSpend = program ? program.minSpendTarget : getVal([
        'min_spend',
        'minSpend'
    ]);
    const minSpend = rawMinSpend !== undefined && rawMinSpend !== null ? Number(rawMinSpend) : null;
    // Parse legacy tiered cashback
    const hasTiers = Boolean(getVal([
        'has_tiers',
        'hasTiers'
    ]));
    let tiers = undefined;
    if (hasTiers && Array.isArray(raw.tiers)) {
        tiers = raw.tiers.map((tier)=>({
                minSpend: Number(tier.minSpend ?? tier.min_spend ?? 0),
                categories: tier.categories ?? {},
                defaultRate: typeof tier.defaultRate === 'number' ? tier.defaultRate : undefined
            }));
    }
    // Graceful fallback: if statement_cycle is configured but statementDay is missing, use calendar_month
    if (cycleType === 'statement_cycle' && !statementDay) {
        cycleType = 'calendar_month';
    }
    return {
        rate: parsedRate,
        maxAmount,
        cycleType,
        statementDay,
        dueDate,
        minSpend,
        hasTiers,
        tiers,
        program
    };
}
const normalizeRate = (val)=>{
    const r = Number(val ?? 0);
    // Smart heuristic: In this project, rates >= 0.3 are almost certainly percentages (0.5 for 0.5%, 5 for 5%)
    // while rates < 0.3 are almost certainly decimals (0.003 for 0.3%, 0.15 for 15%)
    // We choose 0.3 because 30% is a common max for high-cat cashback (0.3), 
    // and 0.5 is a common base rate (0.5).
    if (r >= 0.3) return r / 100;
    return r;
};
function normalizeCashbackConfig(raw, account) {
    const parsed = parseCashbackConfig(raw);
    const program = parsed.program;
    // If account is provided with new cb_ columns, use them first
    if (account && account.cb_type && account.cb_type !== 'none') {
        return {
            defaultRate: normalizeRate(account.cb_base_rate ?? program?.defaultRate ?? 0),
            maxBudget: account.cb_is_unlimited ? null : Number(account.cb_max_budget ?? program?.maxBudget ?? 0),
            // Cycle info prioritization
            cycleType: account.cb_cycle_type || program?.cycleType || 'calendar_month',
            statementDay: account.statement_day ?? program?.statementDay ?? null,
            minSpendTarget: account.cb_min_spend ?? program?.minSpendTarget ?? null,
            dueDate: account.due_date ?? program?.dueDate ?? null,
            levels: (()=>{
                if (account.cb_type === 'tiered') {
                    const rawRules = account.cb_rules_json;
                    const tiers = Array.isArray(rawRules) ? rawRules : rawRules?.tiers || [];
                    return tiers.map((lvl)=>({
                            id: lvl.id || Math.random().toString(36).substr(2, 9),
                            name: lvl.name || "",
                            minTotalSpend: Number(lvl.minTotalSpend ?? lvl.min_spend ?? 0),
                            defaultRate: normalizeRate(lvl.defaultRate ?? lvl.base_rate),
                            maxReward: Number(lvl.maxReward ?? lvl.max_reward ?? 0) || null,
                            rules: (lvl.rules || lvl.policies || []).map((r)=>({
                                    id: r.id || Math.random().toString(36).substr(2, 9),
                                    categoryIds: r.categoryIds || r.cat_ids || [],
                                    rate: normalizeRate(r.rate),
                                    maxReward: r.maxReward !== undefined ? r.maxReward : r.max !== undefined ? r.max : null,
                                    description: r.description
                                }))
                        }));
                } else if (account.cb_type === 'simple' && Array.isArray(account.cb_rules_json)) {
                    return [
                        {
                            id: 'simple_level',
                            name: 'General',
                            minTotalSpend: 0,
                            defaultRate: normalizeRate(account.cb_base_rate),
                            maxReward: null,
                            rules: account.cb_rules_json.map((r)=>({
                                    id: r.id || Math.random().toString(36).substr(2, 9),
                                    categoryIds: r.categoryIds || r.cat_ids || [],
                                    rate: normalizeRate(r.rate),
                                    maxReward: r.maxReward !== undefined ? r.maxReward : r.max !== undefined ? r.max : null,
                                    description: r.description
                                }))
                        }
                    ];
                }
                return program?.levels?.map((lvl)=>({
                        ...lvl,
                        defaultRate: normalizeRate(lvl.defaultRate),
                        rules: lvl.rules?.map((r)=>({
                                ...r,
                                rate: normalizeRate(r.rate)
                            }))
                    })) || [];
            })()
        };
    }
    // If already in new format, just clean up and return
    if (parsed.program) {
        return {
            defaultRate: normalizeRate(parsed.program.defaultRate),
            maxBudget: parsed.program.maxBudget !== undefined ? parsed.program.maxBudget : null,
            cycleType: parsed.program.cycleType || 'calendar_month',
            statementDay: parsed.program.statementDay !== undefined ? parsed.program.statementDay : null,
            minSpendTarget: parsed.program.minSpendTarget !== undefined ? parsed.program.minSpendTarget : null,
            dueDate: parsed.program.dueDate !== undefined ? parsed.program.dueDate : null,
            levels: parsed.program.levels?.map((lvl)=>({
                    id: lvl.id,
                    name: lvl.name,
                    minTotalSpend: Number(lvl.minTotalSpend ?? 0),
                    defaultRate: normalizeRate(lvl.defaultRate),
                    maxReward: lvl.maxReward !== undefined ? lvl.maxReward : null,
                    rules: lvl.rules?.map((rule)=>({
                            id: rule.id,
                            categoryIds: rule.categoryIds || [],
                            rate: normalizeRate(rule.rate),
                            maxReward: rule.maxReward !== undefined ? rule.maxReward : null,
                            description: rule.description
                        })) || []
                })) || []
        };
    }
    // Fallback to legacy conversion
    return {
        defaultRate: parsed.rate,
        maxBudget: parsed.maxAmount,
        cycleType: parsed.cycleType || 'calendar_month',
        statementDay: parsed.statementDay,
        minSpendTarget: parsed.minSpend,
        dueDate: parsed.dueDate,
        levels: parsed.hasTiers && parsed.tiers ? parsed.tiers.map((tier, idx)=>({
                id: `lvl_${idx + 1}`,
                name: tier.name || `Level ${idx + 1}`,
                minTotalSpend: tier.minSpend,
                defaultRate: tier.defaultRate !== undefined ? tier.defaultRate : null,
                maxReward: null,
                rules: Object.entries(tier.categories || {}).map(([catKey, catData], rIdx)=>({
                        id: `rule_${idx + 1}_${rIdx + 1}`,
                        categoryIds: [
                            catKey
                        ],
                        rate: catData.rate ?? 0,
                        maxReward: catData.max_reward ?? catData.maxAmount ?? null
                    }))
            })) : []
    };
}
function parseCashbackConfig(raw, accountId = 'unknown') {
    if (!raw) {
        return {
            rate: 0,
            maxAmount: null,
            cycleType: null,
            statementDay: null,
            dueDate: null,
            minSpend: null,
            hasTiers: false,
            tiers: undefined
        };
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'string') {
                return parseCashbackConfig(parsed, accountId);
            }
            return parseConfigCandidate(parsed, accountId);
        } catch (e) {
            console.error(`[parseCashbackConfig] Failed to parse JSON string for account ${accountId}:`, e);
            return {
                rate: 0,
                maxAmount: null,
                cycleType: null,
                statementDay: null,
                dueDate: null,
                minSpend: null,
                hasTiers: false,
                tiers: undefined
            };
        }
    }
    if (typeof raw === 'object') {
        return parseConfigCandidate(raw, accountId);
    }
    return {
        rate: 0,
        maxAmount: null,
        cycleType: null,
        statementDay: null,
        dueDate: null,
        minSpend: null,
        hasTiers: false,
        tiers: undefined
    };
}
function getCashbackCycleRange(config, referenceDate = new Date()) {
    if (!config.cycleType) {
        return null;
    }
    const startOfCalendar = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const calendarEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
    if (config.cycleType === 'calendar_month') {
        startOfCalendar.setHours(0, 0, 0, 0);
        calendarEnd.setHours(23, 59, 59, 999);
        return {
            start: startOfCalendar,
            end: calendarEnd
        };
    }
    if (config.cycleType === 'statement_cycle' && !config.statementDay) {
        return null;
    }
    const day = config.statementDay;
    const referenceDay = referenceDate.getDate();
    const startOffset = referenceDay >= day ? 0 : -1;
    const endOffset = referenceDay >= day ? 1 : 0;
    const startBase = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + startOffset, 1);
    const start = clampToDay(startBase, day);
    // End date is 1 day BEFORE the next statement day
    // Example: statement_day = 25 → cycle is Nov 25 - Dec 24
    const endBase = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + endOffset, 1);
    const nextStatementDay = clampToDay(endBase, day);
    const end = new Date(nextStatementDay.getTime() - 24 * 60 * 60 * 1000) // Subtract 1 day
    ;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return {
        start,
        end
    };
}
function clampToDay(base, day) {
    if (!day) {
        return base;
    }
    const candidate = new Date(base.getFullYear(), base.getMonth(), 1);
    const monthEnd = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0);
    const safeDay = Math.min(day, monthEnd.getDate());
    return new Date(candidate.getFullYear(), candidate.getMonth(), safeDay);
}
function calculateBankCashback(config, amount, categoryName, totalSpend = 0) {
    let earnedRate = config.rate;
    if (config.hasTiers && config.tiers && config.tiers.length > 0) {
        // Find the applicable tier based on total spend
        const applicableTier = config.tiers.filter((tier)=>totalSpend >= tier.minSpend).sort((a, b)=>b.minSpend - a.minSpend)[0];
        if (applicableTier) {
            if (categoryName) {
                const lowerCat = categoryName.toLowerCase();
                let categoryKey = null;
                for (const key of Object.keys(applicableTier.categories)){
                    if (lowerCat.includes(key.toLowerCase())) {
                        categoryKey = key;
                        break;
                    }
                }
                if (categoryKey && applicableTier.categories[categoryKey]) {
                    earnedRate = applicableTier.categories[categoryKey].rate;
                } else if (applicableTier.defaultRate !== undefined) {
                    earnedRate = applicableTier.defaultRate;
                }
            } else if (applicableTier.defaultRate !== undefined) {
                earnedRate = applicableTier.defaultRate;
            }
        }
    }
    return {
        amount: amount * earnedRate,
        rate: earnedRate
    };
}
function getMinSpendStatus(currentSpend, minSpendTarget) {
    const target = minSpendTarget || 0;
    const remaining = Math.max(0, target - currentSpend);
    const isTargetMet = currentSpend >= target;
    return {
        spent: currentSpend,
        remaining,
        isTargetMet
    };
}
function getCashbackCycleTag(referenceDate, config) {
    const minimalConfig = {
        rate: 0,
        maxAmount: null,
        cycleType: config.cycleType,
        statementDay: config.statementDay,
        dueDate: null,
        minSpend: null
    };
    const range = getCashbackCycleRange(minimalConfig, referenceDate);
    if (!range) return null;
    const end = range.end;
    return formatIsoCycleTag(end);
}
const CYCLE_MONTHS = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC'
];
function formatIsoCycleTag(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
function formatLegacyCycleTag(date) {
    const month = CYCLE_MONTHS[date.getMonth()];
    const year = String(date.getFullYear()).slice(2);
    return `${month}${year}`;
}
function parseCycleTag(tag) {
    if (!tag) return null;
    const isoMatch = tag.match(/^(\d{4})-(\d{2})$/);
    if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]);
        if (Number.isFinite(year) && month >= 1 && month <= 12) {
            return {
                year,
                month
            };
        }
    }
    const dashedLegacyMatch = tag.match(/^([A-Z]{3})-(\d{4})$/);
    if (dashedLegacyMatch) {
        const monthIdx = CYCLE_MONTHS.indexOf(dashedLegacyMatch[1]);
        const year = Number(dashedLegacyMatch[2]);
        if (monthIdx >= 0 && Number.isFinite(year)) {
            return {
                year,
                month: monthIdx + 1
            };
        }
    }
    const legacyMatch = tag.match(/^([A-Z]{3})(\d{2})$/);
    if (legacyMatch) {
        const monthIdx = CYCLE_MONTHS.indexOf(legacyMatch[1]);
        const year = 2000 + Number(legacyMatch[2]);
        if (monthIdx >= 0 && Number.isFinite(year)) {
            return {
                year,
                month: monthIdx + 1
            };
        }
    }
    return null;
}
}),
"[project]/src/lib/account-balance.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "computeAccountTotals",
    ()=>computeAccountTotals,
    "getCreditCardAvailableBalance",
    ()=>getCreditCardAvailableBalance,
    "getCreditCardDebt",
    ()=>getCreditCardDebt,
    "getCreditCardUsage",
    ()=>getCreditCardUsage
]);
const isIncomingType = (type)=>type === 'income' || type === 'repayment';
function computeAccountTotals(params) {
    const { accountId, accountType, transactions } = params;
    let totalIn = 0;
    let totalOut = 0;
    for (const txn of transactions){
        if (!txn) continue;
        if (txn.status === 'void') continue;
        const amountAbs = Math.abs(Number(txn.amount) || 0);
        if (!amountAbs) continue;
        if (txn.account_id === accountId) {
            if (isIncomingType(txn.type)) {
                totalIn += amountAbs;
            } else {
                totalOut -= amountAbs;
            }
            continue;
        }
        if (txn.target_account_id === accountId) {
            totalIn += amountAbs;
        }
    }
    const netFlow = totalIn + totalOut;
    const currentBalance = accountType === 'credit_card' ? Math.abs(totalOut) - totalIn : netFlow;
    return {
        totalIn,
        totalOut,
        currentBalance
    };
}
function getCreditCardDebt(balance) {
    return balance ?? 0;
}
function getCreditCardAvailableBalance(account) {
    if (account.type !== 'credit_card') {
        return account.current_balance ?? 0;
    }
    const limit = account.credit_limit ?? 0;
    const debt = getCreditCardDebt(account.current_balance);
    return limit - debt;
}
function getCreditCardUsage(account) {
    const limit = account.credit_limit ?? 0;
    if (account.type !== 'credit_card' || limit <= 0) {
        return {
            limit,
            used: Math.abs(account.current_balance ?? 0),
            percent: 0
        };
    }
    const debt = getCreditCardDebt(account.current_balance);
    const used = Math.max(0, debt);
    const percent = limit > 0 ? used / limit * 100 : 0;
    return {
        limit,
        used,
        percent
    };
}
}),
"[project]/src/lib/tag.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateTag",
    ()=>generateTag
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/month-tag.ts [app-route] (ecmascript)");
;
function generateTag(date) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["toYYYYMMFromDate"])(date);
}
}),
"[project]/src/lib/transaction-mapper.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildEditInitialValues",
    ()=>buildEditInitialValues,
    "loadShopInfo",
    ()=>loadShopInfo,
    "mapUnifiedTransaction",
    ()=>mapUnifiedTransaction,
    "parseMetadata",
    ()=>parseMetadata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/tag.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/month-tag.ts [app-route] (ecmascript)");
;
;
async function loadShopInfo(supabase, shopId) {
    if (!shopId) return null;
    const { data: shop } = await supabase.from('shops').select('name, image_url').eq('id', shopId).single();
    const typedShop = shop;
    return typedShop ? {
        name: typedShop.name,
        image_url: typedShop.image_url
    } : null;
}
function mapUnifiedTransaction(rawTxn, contextAccountId) {
    // Defensive mapping to handle various join structures
    const baseTag = rawTxn.tag;
    const tag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeMonthTag"])(baseTag) ?? baseTag ?? null;
    const originalAmount = Math.abs(rawTxn.amount ?? 0);
    // Attempt to extract joined data if available
    const categoryName = rawTxn.categories?.name || rawTxn.category?.name || rawTxn.category_name;
    const categoryIcon = rawTxn.categories?.icon || rawTxn.category?.icon;
    const shopName = rawTxn.shops?.name || rawTxn.shop?.name || rawTxn.shop_name;
    const shopImage = rawTxn.shops?.image_url || rawTxn.shop?.image_url;
    const personName = rawTxn.profiles?.name || rawTxn.person?.name || rawTxn.person_name;
    const personAvatar = rawTxn.profiles?.image_url || rawTxn.person?.image_url || rawTxn.person_image_url;
    // Determine Display Type
    let displayType = 'expense';
    if (rawTxn.type === 'income') displayType = 'income';
    else if (rawTxn.type === 'repayment') displayType = 'income'; // Usually Repayment In
    else if (rawTxn.type === 'transfer') {
        // If context is target, it's income-like
        if (contextAccountId && rawTxn.target_account_id === contextAccountId) {
            displayType = 'income';
        } else {
            displayType = 'expense';
        }
    }
    return {
        ...rawTxn,
        tag,
        original_amount: originalAmount,
        amount: rawTxn.amount ?? 0,
        displayType,
        display_type: displayType === 'income' ? 'IN' : displayType === 'expense' ? 'OUT' : 'TRANSFER',
        category_name: categoryName,
        category_icon: categoryIcon,
        shop_name: shopName,
        shop_image_url: shopImage,
        person_name: personName,
        person_image_url: personAvatar,
        history_count: rawTxn.transaction_history?.[0]?.count ?? 0,
        // Ensure critical fields are present
        cashback_share_percent: rawTxn.cashback_share_percent ?? null,
        cashback_share_fixed: rawTxn.cashback_share_fixed ?? null
    };
}
function parseMetadata(value) {
    if (!value) return null;
    let parsed = null;
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value);
        } catch (e) {
            console.warn("[parseMetadata] JSON Parse Error:", e);
            parsed = null;
        }
    } else if (typeof value === 'object' && !Array.isArray(value)) {
        parsed = value;
    }
    // Additional logging to help verify if parent_transaction_id is being seen
    if (parsed) {
        if ('parent_transaction_id' in parsed) {
            console.log("[parseMetadata] Found parent_transaction_id:", parsed.parent_transaction_id);
        } else {
        // console.log("[parseMetadata] No parent_transaction_id in:", parsed);
        }
    }
    return parsed;
}
function buildEditInitialValues(txn) {
    const baseAmount = typeof txn.original_amount === "number" ? txn.original_amount : txn.amount ?? 0;
    const percentValue = typeof txn.cashback_share_percent === "number" ? txn.cashback_share_percent : undefined;
    let derivedType = txn.type === 'repayment' ? 'repayment' : txn.type || "expense";
    const categoryName = txn.category_name?.toLowerCase() ?? '';
    const meta = parseMetadata(txn.metadata);
    if (meta && meta.is_debt_repayment_parent) {
        derivedType = 'repayment';
    } else if (txn.person_id) {
        if (categoryName.includes('thu nợ') || categoryName.includes('repayment')) {
            derivedType = 'repayment';
        } else {
            derivedType = 'debt';
        }
    } else if (categoryName.includes('cashback') || categoryName.includes('income') || categoryName.includes('refund')) {
        derivedType = 'income';
    } else if (categoryName.includes('money transfer') || categoryName.includes('chuyển tiền')) {
        derivedType = 'transfer';
    } else if (!txn.category_id && !txn.category_name) {
        derivedType = 'transfer';
    } else if (txn.type === 'income') {
        derivedType = 'income';
    } else if (txn.type === 'expense') {
        derivedType = 'expense';
    }
    let sourceAccountId = txn.account_id ?? undefined;
    let destinationAccountId = derivedType === "transfer" || derivedType === "debt" ? txn.target_account_id ?? undefined : undefined;
    if (derivedType === 'repayment') {
        // For repayment: source is bank, destination is debt
        sourceAccountId = txn.account_id ?? undefined;
        destinationAccountId = txn.target_account_id ?? undefined;
    }
    const result = {
        occurred_at: txn.occurred_at ? new Date(txn.occurred_at) : new Date(),
        type: derivedType,
        amount: Math.abs(baseAmount ?? 0),
        note: txn.note ?? "",
        tag: txn.tag ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateTag"])(new Date()),
        source_account_id: sourceAccountId,
        category_id: txn.category_id ?? undefined,
        person_id: (txn.person_id ?? meta?.original_person_id) || undefined,
        debt_account_id: destinationAccountId,
        shop_id: txn.shop_id ?? undefined,
        // Pass raw names for duplicate/edit scenarios where IDs might be missing but we want to preserve visual info or allow fuzzy match
        shop_name: txn.shop_name,
        shop_image_url: txn.shop_image_url,
        category_name: txn.category_name,
        cashback_share_percent: percentValue !== undefined && percentValue !== null ? percentValue * 100 : undefined,
        cashback_share_fixed: txn.cashback_share_fixed !== null && txn.cashback_share_fixed !== undefined ? Number(txn.cashback_share_fixed) : undefined,
        is_installment: txn.is_installment ?? false,
        // CRITICAL: Preserve cashback_mode from database (especially 'voluntary'), don't auto-infer
        cashback_mode: txn.cashback_mode || (percentValue !== undefined && percentValue !== null && Number(percentValue) > 0 ? 'real_percent' : txn.cashback_share_fixed !== null && txn.cashback_share_fixed !== undefined && Number(txn.cashback_share_fixed) > 0 ? 'real_fixed' : 'none_back'),
        metadata: meta
    };
    // Diagnostic logging for duplicate form issue
    console.log('[buildEditInitialValues] Transaction:', {
        id: txn.id,
        shop_id: txn.shop_id,
        shop_name: txn.shop_name,
        account_id: txn.account_id,
        source_name: txn.source_name,
        result_shop_id: result.shop_id,
        result_source_account_id: result.source_account_id
    });
    return result;
}
}),
"[project]/src/services/account.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"4025535a7c56682fe772921004acf31ea7b1cf9ce6":"getAccounts","402dddb5a10d05bd4a280044d24cd558fc16188c7d":"getAccountDetails","40351a12d441631565f334ea63b8710f0399d6aa58":"deleteAccount","404c23911a3a9f04f106fbe9b35d1fafa5f8d773e2":"recalculateBalance","405e5a752edac0289b1fe964299b2a0735bd287654":"getRecentAccountsByTransactions","4079ee79cba88f111b39c21d7d7bda03e04ddd942c":"getAccountStats","6007791fa7861b8c2494d335b6be50659e1704a14d":"getAccountTransactions","60bfcf3387d48e8a6f7c8270f7526c1553de520048":"updateAccountStatus","60c754f2f36bb4d91cf6e56f4a0bd0de5b89680bcd":"recalculateBalanceWithClient","60d2aaf7eb98d4312336246c01230655e9eb4f53d2":"updateAccountConfig"},"",""] */ __turbopack_context__.s([
    "deleteAccount",
    ()=>deleteAccount,
    "getAccountDetails",
    ()=>getAccountDetails,
    "getAccountStats",
    ()=>getAccountStats,
    "getAccountTransactions",
    ()=>getAccountTransactions,
    "getAccounts",
    ()=>getAccounts,
    "getRecentAccountsByTransactions",
    ()=>getRecentAccountsByTransactions,
    "recalculateBalance",
    ()=>recalculateBalance,
    "recalculateBalanceWithClient",
    ()=>recalculateBalanceWithClient,
    "updateAccountConfig",
    ()=>updateAccountConfig,
    "updateAccountStatus",
    ()=>updateAccountStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/cache.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$pocketbase$2f$fallback$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/pocketbase/fallback-helpers.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/cashback.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$account$2d$balance$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/account-balance.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transaction$2d$mapper$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/transaction-mapper.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-route] (ecmascript)");
;
;
;
;
;
;
;
function parseJsonSafe(value) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (parseError) {
            console.error('Failed to parse JSON string:', parseError);
            return null;
        }
    }
    return value;
}
const fmtDate = (d)=>{
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit'
    }).format(d);
};
async function getSupabaseAccountRows(supabase) {
    const { data, error } = await supabase.from('accounts').select('id, name, type, currency, current_balance, credit_limit, parent_account_id, account_number, owner_id, cashback_config, cashback_config_version, secured_by_account_id, is_active, image_url, receiver_name, total_in, total_out, annual_fee, annual_fee_waiver_target, cb_type, cb_base_rate, cb_max_budget, cb_is_unlimited, cb_rules_json, cb_min_spend, cb_cycle_type, statement_day, due_date, holder_type, holder_person_id');
    if (error) {
        console.error('Error fetching accounts:', error);
        if (error.message) console.error('Error message:', error.message);
        if (error.code) console.error('Error code:', error.code);
        return [];
    }
    return data ?? [];
}
function mapPocketBaseAccountRow(record) {
    return {
        id: record.id,
        name: record.name ?? '',
        type: record.type ?? 'bank',
        currency: record.currency ?? 'VND',
        current_balance: Number(record.current_balance ?? 0),
        credit_limit: Number(record.credit_limit ?? 0),
        parent_account_id: record.parent_account_id || null,
        account_number: record.account_number || null,
        owner_id: record.owner_id || null,
        cashback_config: record.cashback_config ?? null,
        cashback_config_version: Number(record.cashback_config_version ?? 1),
        secured_by_account_id: record.secured_by_account_id || null,
        is_active: record.is_active ?? true,
        image_url: typeof record.image_url === 'string' && record.image_url.startsWith('http') ? record.image_url : null,
        receiver_name: record.receiver_name || null,
        total_in: Number(record.total_in ?? 0),
        total_out: Number(record.total_out ?? 0),
        annual_fee: Number(record.annual_fee ?? 0),
        annual_fee_waiver_target: Number(record.annual_fee_waiver_target ?? 0),
        cb_type: record.cb_type ?? 'none',
        cb_base_rate: Number(record.cb_base_rate ?? 0),
        cb_max_budget: Number(record.cb_max_budget ?? 0),
        cb_is_unlimited: record.cb_is_unlimited ?? false,
        cb_rules_json: record.cb_rules_json ?? null,
        cb_min_spend: Number(record.cb_min_spend ?? 0),
        cb_cycle_type: record.cb_cycle_type ?? 'calendar_month',
        statement_day: Number(record.statement_day ?? 0),
        due_date: Number(record.due_date ?? 0),
        holder_type: record.holder_type ?? null,
        holder_person_id: record.holder_person_id ?? null,
        created_at: record.created ?? null,
        updated_at: record.updated ?? null
    };
}
async function getPocketBaseAccountRows() {
    const candidateUrls = [
        'https://api-db.reiwarden.io.vn/api/collections/pvl_acc_001/records?perPage=200',
        'https://api-db.reiwarden.io.vn/api/collections/accounts/records?perPage=200'
    ];
    let lastErrorText = '';
    for (const url of candidateUrls){
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            const data = await response.json();
            const records = Array.isArray(data.items) ? data.items : [];
            return records.map(mapPocketBaseAccountRow);
        }
        lastErrorText = await response.text();
    }
    throw new Error(`PB accounts.list failed after retries: ${lastErrorText}`);
}
async function getStatsForAccount(supabase, account) {
    const creditLimit = account.credit_limit ?? 0;
    const currentBalance = account.current_balance ?? 0;
    // 0. Base Stats (Usage)
    const usage_percent = account.type === 'credit_card' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$account$2d$balance$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCreditCardUsage"])({
        type: account.type,
        credit_limit: creditLimit,
        current_balance: currentBalance
    }).percent : 0;
    const remaining_limit = account.type === 'credit_card' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$account$2d$balance$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCreditCardAvailableBalance"])({
        type: account.type,
        credit_limit: creditLimit,
        current_balance: currentBalance
    }) : currentBalance;
    // Default values
    const baseStats = {
        usage_percent,
        remaining_limit,
        spent_this_cycle: 0,
        min_spend: null,
        missing_for_min: null,
        is_qualified: false,
        cycle_range: "",
        due_date_display: null,
        due_date: null,
        remains_cap: null,
        shared_cashback: null
    };
    // Only calculate full stats for accounts with cashback config or type
    const hasConfig = account.cashback_config || account.cb_type !== 'none';
    if (!hasConfig) return baseStats;
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeCashbackConfig"])(account.cashback_config, account);
    if (!config) return baseStats;
    const now = new Date();
    const explicitCycleType = account.cb_cycle_type || config.cycleType;
    const cycleRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleRange"])({
        ...config,
        cycleType: explicitCycleType
    }, now);
    if (!cycleRange) return baseStats;
    const { start, end } = cycleRange;
    // MF5.2.2B FIX: Read from cashback_cycles for consistency
    // Determine cycle tag using statement day logic.
    const tagDate = cycleRange.end;
    const cycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatIsoCycleTag"])(tagDate);
    const legacyCycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatLegacyCycleTag"])(tagDate);
    const cycleTags = legacyCycleTag !== cycleTag ? [
        cycleTag,
        legacyCycleTag
    ] : [
        cycleTag
    ];
    let cycle = (await supabase.from('cashback_cycles').select('*').eq('account_id', account.id).eq('cycle_tag', cycleTag).maybeSingle()).data ?? null;
    if (!cycle && legacyCycleTag !== cycleTag) {
        cycle = (await supabase.from('cashback_cycles').select('*').eq('account_id', account.id).eq('cycle_tag', legacyCycleTag).maybeSingle()).data ?? null;
    }
    // 1. Stats from Cycle (Primary Source)
    let spent_this_cycle = cycle?.spent_amount ?? 0;
    let real_awarded = cycle?.real_awarded ?? 0;
    const virtual_profit = cycle?.virtual_profit ?? 0;
    // 1.1 Fallback/Live fetch for real_awarded (Income from Bank)
    if (real_awarded === 0) {
        const { data: incomeTxns } = await supabase.from('transactions').select('amount').eq('account_id', account.id).eq('type', 'income').eq('status', 'posted').or('category_id.eq.e0000000-0000-0000-0000-000000000092,category_id.is.null') // Include Cashback category or null
        .in('persisted_cycle_tag', cycleTags);
        if (incomeTxns && incomeTxns.length > 0) {
            real_awarded = incomeTxns.reduce((sum, txn)=>sum + Math.abs(txn.amount ?? 0), 0);
        }
    }
    // MF5.3.3 FIX: Fallback for spent_this_cycle if snapshot is lagging
    if (!cycle || spent_this_cycle === 0) {
        const { data: taggedTxns, error: taggedError } = await supabase.from('transactions').select('amount').eq('account_id', account.id).neq('status', 'void').in('type', [
            'expense',
            'debt'
        ]).in('persisted_cycle_tag', cycleTags);
        if (!taggedError && taggedTxns && taggedTxns.length > 0) {
            const taggedSum = taggedTxns.reduce((sum, txn)=>sum + Math.abs(txn.amount ?? 0), 0);
            if (taggedSum > 0) {
                spent_this_cycle = taggedSum;
            }
        } else if (!taggedError && start && end) {
            const { data: rangeTxns } = await supabase.from('transactions').select('amount, type').eq('account_id', account.id).neq('status', 'void').in('type', [
                'expense',
                'debt',
                'income'
            ]).gte('occurred_at', start.toISOString()).lte('occurred_at', end.toISOString());
            if (rangeTxns && rangeTxns.length > 0) {
                const rangeSpent = rangeTxns.filter((t)=>t.type === 'expense' || t.type === 'debt').reduce((sum, txn)=>sum + Math.abs(txn.amount ?? 0), 0);
                const rangeAwarded = rangeTxns.filter((t)=>t.type === 'income').reduce((sum, txn)=>sum + Math.abs(txn.amount ?? 0), 0);
                if (rangeSpent > 0 && spent_this_cycle === 0) spent_this_cycle = rangeSpent;
                if (rangeAwarded > 0 && real_awarded === 0) real_awarded = rangeAwarded;
            }
        }
    }
    // 2. Budget Left Calculation
    // MF5.3.3 FIX: Budget Left must come from cycle. If no cycle, show null (--) instead of fallback to full budget.
    let remains_cap = null;
    if (cycle) {
        const maxBudget = cycle.max_budget ?? null;
        if (maxBudget !== null) {
            const consumed = real_awarded + virtual_profit;
            remains_cap = Math.max(0, maxBudget - consumed);
        }
    } else if (config.maxBudget) {
        const consumed = real_awarded + virtual_profit;
        remains_cap = Math.max(0, config.maxBudget - consumed);
    }
    // 3. Fallback / Validation if cycle missing (e.g. no txns yet)
    // If no cycle, spent is 0, real is 0, virtual is 0 -> correct.
    const min_spend = cycle ? cycle.min_spend_target ?? null : config.minSpendTarget;
    const missing_for_min = min_spend !== null ? Math.max(0, min_spend - spent_this_cycle) : null;
    const is_qualified = cycle?.met_min_spend ?? (min_spend !== null && spent_this_cycle >= min_spend);
    let cycle_range = start && end ? `${fmtDate(start)} - ${fmtDate(end)}` : null;
    // Smart Cycle Detection - Format as DD-MM to DD-MM
    const isFullMonth = start.getDate() === 1 && new Date(end.getTime() + 86400000).getDate() === 1;
    if (config.cycleType === 'calendar_month' || isFullMonth) {
        // Full month: show first day to last day of month
        const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        cycle_range = `01-${String(start.getMonth() + 1).padStart(2, '0')} to ${String(lastDay).padStart(2, '0')}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    } else {
        // Custom cycle: DD-MM to DD-MM
        const startDay = String(start.getDate()).padStart(2, '0');
        const startMonth = String(start.getMonth() + 1).padStart(2, '0');
        const endDay = String(end.getDate()).padStart(2, '0');
        const endMonth = String(end.getMonth() + 1).padStart(2, '0');
        cycle_range = `${startDay}-${startMonth} to ${endDay}-${endMonth}`;
    }
    // 4. Due Date Display
    let due_date_display = null;
    let due_date = null;
    if (config.dueDate) {
        const currentDay = now.getDate();
        let targetMonth = now.getMonth();
        const targetYear = now.getFullYear();
        if (currentDay > config.dueDate) {
            targetMonth += 1;
        }
        const targetDate = new Date(targetYear, targetMonth, config.dueDate);
        due_date_display = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric'
        }).format(targetDate);
        due_date = targetDate.toISOString();
    }
    // 5. Annual Fee Waiver Calculation
    let annual_fee_waiver_target = null;
    let annual_fee_waiver_progress = 0;
    let annual_fee_waiver_met = false;
    if (account.type === 'credit_card' && account.annual_fee && account.annual_fee > 0) {
        // Get waiver target from account config, or use minSpendTarget as fallback
        annual_fee_waiver_target = account.annual_fee_waiver_target ?? config.minSpendTarget ?? null;
        if (annual_fee_waiver_target && annual_fee_waiver_target > 0) {
            // Calculate annual spend (not just current cycle)
            // For now, use spent_this_cycle as proxy; in production, aggregate full year
            const annualSpend = spent_this_cycle // TODO: Implement full year aggregation
            ;
            annual_fee_waiver_progress = Math.min(100, annualSpend / annual_fee_waiver_target * 100);
            annual_fee_waiver_met = annualSpend >= annual_fee_waiver_target;
        }
    }
    return {
        ...baseStats,
        spent_this_cycle,
        min_spend,
        missing_for_min,
        is_qualified,
        cycle_range,
        due_date_display,
        due_date,
        remains_cap,
        shared_cashback: real_awarded,
        real_awarded,
        virtual_profit,
        annual_fee_waiver_target,
        annual_fee_waiver_progress,
        annual_fee_waiver_met,
        max_budget: cycle?.max_budget ?? config.maxBudget ?? null
    };
}
async function getAccounts(supabaseClient) {
    const supabase = supabaseClient ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const rows = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$pocketbase$2f$fallback$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["executeWithFallback"])(()=>getPocketBaseAccountRows(), ()=>getSupabaseAccountRows(supabase), 'accounts.list');
    // 1. Pre-process Relationships
    const childrenMap = new Map();
    const accountMap = new Map();
    // First: Build Account Map
    rows.forEach((row)=>{
        accountMap.set(row.id, row);
    });
    // Second: Build Children Map
    rows.forEach((row)=>{
        if (row.parent_account_id) {
            if (!childrenMap.has(row.parent_account_id)) {
                childrenMap.set(row.parent_account_id, []);
            }
            // Only add if parent actually exists in current dataset to avoid orphans
            if (accountMap.has(row.parent_account_id)) {
                childrenMap.get(row.parent_account_id).push(row);
            }
        }
    });
    // 2. Parallel fetch stats and build Account objects
    // 2. Linear fetch stats to avoid connection reset (ECONNRESET)
    const accounts = [];
    // Single-thread execution (or small batch) to be safe
    for (const item of rows){
        const stats = await getStatsForAccount(supabase, item);
        // Relationship Logic (Shared Limit Family)
        const childRows = childrenMap.get(item.id) || [];
        const parentRow = item.parent_account_id ? accountMap.get(item.parent_account_id) : null;
        const relationships = {
            is_parent: childRows.length > 0,
            child_count: childRows.length,
            child_accounts: childRows.map((c)=>({
                    id: c.id,
                    name: c.name,
                    image_url: c.image_url
                })),
            parent_info: parentRow ? {
                id: parentRow.id,
                name: parentRow.name,
                type: parentRow.type,
                image_url: parentRow.image_url
            } : null
        };
        accounts.push({
            id: item.id,
            name: item.name,
            type: item.type,
            currency: item.currency ?? 'VND',
            current_balance: item.current_balance ?? 0,
            credit_limit: item.credit_limit ?? 0,
            owner_id: item.owner_id ?? '',
            account_number: item.account_number ?? null,
            receiver_name: item.receiver_name ?? null,
            parent_account_id: item.parent_account_id ?? null,
            secured_by_account_id: item.secured_by_account_id ?? null,
            cb_type: item.cb_type ?? 'none',
            cb_base_rate: item.cb_base_rate ?? 0,
            cb_max_budget: item.cb_max_budget ?? null,
            cb_is_unlimited: item.cb_is_unlimited ?? false,
            cb_rules_json: parseJsonSafe(item.cb_rules_json),
            cb_min_spend: item.cb_min_spend ?? null,
            cb_cycle_type: item.cb_cycle_type ?? 'calendar_month',
            statement_day: item.statement_day ?? null,
            due_date: item.due_date ?? null,
            holder_type: item.holder_type ?? 'me',
            holder_person_id: item.holder_person_id ?? null,
            cashback_config: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeCashbackConfig"])(item.cashback_config),
            is_active: typeof item.is_active === 'boolean' ? item.is_active : null,
            image_url: typeof item.image_url === 'string' ? item.image_url : null,
            total_in: item.total_in ?? 0,
            total_out: item.total_out ?? 0,
            stats,
            relationships,
            credit_card_info: (()=>{
                const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeCashbackConfig"])(item.cashback_config);
                if (!config) return undefined;
                return {
                    statement_day: item.statement_day ?? config.statementDay ?? config.statement_day,
                    payment_due_day: item.due_date ?? config.paymentDueDay ?? config.payment_due_day ?? config.dueDate
                };
            })()
        });
    }
    // 3. Sorting Logic
    // Priority: 
    // 1. Due Date (ASC) - Nearest first
    // 2. Cashback Need (DESC) - Highest missing_for_min first
    // 3. Name (ASC)
    return accounts.sort((a, b)=>{
        // Helper to get sortable date timestamp
        const getDueDateTs = (acc)=>{
            if (!acc.stats?.due_date_display) return 9999999999999 // Far future
            ;
            const [day, month] = acc.stats.due_date_display.split('/').map(Number);
            const now = new Date();
            const currentYear = now.getFullYear();
            const date = new Date(currentYear, month - 1, day);
            // If date is in the past (e.g. today is Dec 15, due date Dec 10), assume next year?
            // Actually due date usually means upcoming due date. 
            // If getStats calculated it, it's relative to current cycle end.
            // Let's assume the year is current year, or next year if month < current month?
            // Simple heuristic: if month < now.month - 1, it's next year.
            if (date.getTime() < now.getTime() - 30 * 24 * 60 * 60 * 1000) {
                date.setFullYear(currentYear + 1);
            }
            return date.getTime();
        };
        const dueA = getDueDateTs(a);
        const dueB = getDueDateTs(b);
        if (dueA !== dueB) return dueA - dueB;
        // Cashback Need (DESC)
        const missA = a.stats?.missing_for_min ?? 0;
        const missB = b.stats?.missing_for_min ?? 0;
        if (missA !== missB) return missB - missA // Highest missing first
        ;
        // Name (ASC)
        return a.name.localeCompare(b.name);
    });
}
async function getAccountDetails(id) {
    if (!id || id === 'add' || id === 'new' || id === 'undefined') {
        return null;
    }
    const mapAccountRowToDetails = (row)=>({
            id: row.id,
            name: row.name,
            type: row.type,
            currency: row.currency ?? 'VND',
            current_balance: row.current_balance ?? 0,
            credit_limit: row.credit_limit ?? 0,
            owner_id: row.owner_id ?? '',
            account_number: row.account_number ?? null,
            receiver_name: row.receiver_name ?? null,
            secured_by_account_id: row.secured_by_account_id ?? null,
            parent_account_id: row.parent_account_id ?? null,
            cashback_config: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeCashbackConfig"])(row.cashback_config),
            cashback_config_version: row.cashback_config_version ?? 1,
            is_active: typeof row.is_active === 'boolean' ? row.is_active : null,
            image_url: typeof row.image_url === 'string' ? row.image_url : null,
            total_in: row.total_in ?? 0,
            total_out: row.total_out ?? 0,
            annual_fee: row.annual_fee ?? null,
            annual_fee_waiver_target: row.annual_fee_waiver_target ?? null,
            cb_type: row.cb_type ?? 'none',
            cb_base_rate: row.cb_base_rate ?? 0,
            cb_max_budget: row.cb_max_budget ?? null,
            cb_is_unlimited: row.cb_is_unlimited ?? false,
            cb_rules_json: parseJsonSafe(row.cb_rules_json),
            cb_min_spend: row.cb_min_spend ?? null,
            cb_cycle_type: row.cb_cycle_type ?? 'calendar_month',
            statement_day: row.statement_day ?? null,
            due_date: row.due_date ?? null,
            holder_type: row.holder_type ?? 'me',
            holder_person_id: row.holder_person_id ?? null
        });
    const getSupabaseAccountDetailsById = async ()=>{
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (!isUuid) {
            return null;
        }
        const { data, error } = await supabase.from('accounts').select('*').eq('id', id).maybeSingle();
        if (error || !data) {
            if (error?.code && error.code === 'PGRST116') {
                return null;
            }
            console.error('Error fetching account details from SB:', {
                accountId: id,
                message: error?.message ?? 'unknown error',
                code: error?.code
            });
            return null;
        }
        return mapAccountRowToDetails(data);
    };
    const getPocketBaseAccountDetailsById = async ()=>{
        const candidateUrls = [
            `https://api-db.reiwarden.io.vn/api/collections/pvl_acc_001/records/${id}`,
            `https://api-db.reiwarden.io.vn/api/collections/accounts/records/${id}`
        ];
        let lastErrorText = '';
        for (const url of candidateUrls){
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                lastErrorText = await response.text();
                continue;
            }
            const record = await response.json();
            return mapAccountRowToDetails(mapPocketBaseAccountRow(record));
        }
        throw new Error(`PB account.details failed: ${lastErrorText}`);
    };
    try {
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$pocketbase$2f$fallback$2d$helpers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["executeWithFallback"])(()=>getPocketBaseAccountDetailsById(), ()=>getSupabaseAccountDetailsById(), `accounts.detail(${id})`);
    } catch (error) {
        console.error('accounts.detail exhausted PB/SB sources', {
            accountId: id,
            error
        });
        return null;
    }
}
// GroupedTransactionLines removed as lines are deprecated
async function fetchTransactions(accountId, limit) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('transactions').select(`
      id,
      occurred_at,
      note,
      tag,
      status,
      created_at,
      shop_id,
      shops ( id, name, image_url ),
      amount,
      type,
      account_id,
      target_account_id,
      category_id,
      person_id,
      metadata,
      cashback_share_percent,
      cashback_share_fixed,
      cashback_mode,
      created_by,
      currency,
      accounts (name, type, image_url),
      categories (name, image_url, icon)
    `).eq('account_id', accountId).order('occurred_at', {
        ascending: false
    }).limit(limit);
    if (error) {
        console.error('Error fetching transactions for account:', {
            accountId,
            message: error?.message ?? 'unknown error',
            code: error?.code
        });
        return [];
    }
    return (data || []).map((txn)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transaction$2d$mapper$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapUnifiedTransaction"])(txn, accountId));
}
async function getAccountTransactions(accountId, limit = 20) {
    return fetchTransactions(accountId, limit);
}
async function updateAccountConfig(accountId, data) {
    // Guard clause to prevent 22P02 error (invalid input syntax for type uuid)
    if (accountId === 'new') return false;
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const payload = {};
    // 1. Basic Fields
    if (typeof data.name === 'string') payload.name = data.name;
    if (typeof data.credit_limit !== 'undefined') payload.credit_limit = data.credit_limit;
    if (typeof data.type === 'string') payload.type = data.type;
    if ('secured_by_account_id' in data) payload.secured_by_account_id = data.secured_by_account_id ?? null;
    if (typeof data.is_active === 'boolean') payload.is_active = data.is_active;
    if ('annual_fee' in data) payload.annual_fee = data.annual_fee ?? null;
    if ('annual_fee_waiver_target' in data) payload.annual_fee_waiver_target = data.annual_fee_waiver_target ?? null;
    if ('parent_account_id' in data) payload.parent_account_id = data.parent_account_id ?? null;
    if (typeof data.image_url === 'string') payload.image_url = data.image_url;
    if ('account_number' in data) payload.account_number = data.account_number ?? null;
    if ('receiver_name' in data) payload.receiver_name = data.receiver_name ?? null;
    if ('cb_cycle_type' in data) payload.cb_cycle_type = data.cb_cycle_type ?? 'calendar_month';
    if ('statement_day' in data) payload.statement_day = data.statement_day ?? null;
    if ('due_date' in data) payload.due_date = data.due_date ?? null;
    if ('holder_type' in data) payload.holder_type = data.holder_type ?? 'me';
    if ('holder_person_id' in data) payload.holder_person_id = data.holder_person_id ?? null;
    // 2. New Cashback Columns
    if (data.cb_type) payload.cb_type = data.cb_type;
    if (typeof data.cb_base_rate === 'number') payload.cb_base_rate = data.cb_base_rate;
    if ('cb_max_budget' in data) payload.cb_max_budget = data.cb_max_budget;
    if (typeof data.cb_is_unlimited === 'boolean') payload.cb_is_unlimited = data.cb_is_unlimited;
    if ('cb_rules_json' in data) payload.cb_rules_json = data.cb_rules_json;
    if ('cb_min_spend' in data) payload.cb_min_spend = data.cb_min_spend ?? null;
    // 3. MF5.4.2: Detect changes to cashback_config or new columns to increment version
    const hasCashbackData = typeof data.cashback_config !== 'undefined' || data.cb_type || typeof data.cb_base_rate === 'number' || 'cb_rules_json' in data;
    if (hasCashbackData) {
        const { data: oldAccount } = await supabase.from('accounts').select('cashback_config, cashback_config_version, cb_type, cb_base_rate, cb_rules_json').eq('id', accountId).single();
        const oldConfigStr = JSON.stringify({
            c: oldAccount?.cashback_config,
            t: oldAccount?.cb_type,
            r: oldAccount?.cb_base_rate,
            j: oldAccount?.cb_rules_json
        });
        const newConfigStr = JSON.stringify({
            c: data.cashback_config ?? oldAccount?.cashback_config,
            t: data.cb_type ?? oldAccount?.cb_type,
            r: data.cb_base_rate ?? oldAccount?.cb_base_rate,
            j: data.cb_rules_json ?? oldAccount?.cb_rules_json
        });
        if (oldConfigStr !== newConfigStr) {
            const nextVersion = (Number(oldAccount?.cashback_config_version) || 1) + 1;
            payload.cashback_config_version = nextVersion;
            if (typeof data.cashback_config !== 'undefined') {
                payload.cashback_config = data.cashback_config;
            }
            console.log(`[updateAccountConfig] Cashback config changed for ${accountId}. Incrementing version to ${nextVersion}`);
            // Trigger recompute if version changed (async)
            __turbopack_context__.A("[project]/src/services/cashback.service.ts [app-route] (ecmascript, async loader)").then((m)=>m.recomputeAccountCashback(accountId, 3));
        }
    }
    if (Object.keys(payload).length === 0) {
        return true;
    }
    const { error } = await supabase.from('accounts').update(payload).eq('id', accountId);
    if (error) {
        console.error('Error updating account configuration:', error);
        return false;
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])('/accounts');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/accounts/${accountId}`);
    return true;
}
async function getAccountStats(accountId) {
    const { getAccountSpendingStats } = await __turbopack_context__.A("[project]/src/services/cashback.service.ts [app-route] (ecmascript, async loader)");
    const stats = await getAccountSpendingStats(accountId, new Date());
    if (!stats) {
        return null;
    }
    const rawPotential = stats.currentSpend * stats.rate;
    const cappedPotential = typeof stats.maxCashback === 'number' ? Math.min(rawPotential, stats.maxCashback) : rawPotential;
    const potentialProfit = typeof stats.potentialProfit === 'number' && Number.isFinite(stats.potentialProfit) ? stats.potentialProfit : cappedPotential - stats.sharedAmount;
    return {
        ...stats,
        potentialProfit
    };
}
async function recalculateBalance(accountId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Get current balance from transactions
    // Get account type first
    const { data: account, error: accError } = await supabase.from('accounts').select('type').eq('id', accountId).single();
    if (accError || !account) {
        console.error('Account not found for balance calc:', accountId);
        return false;
    }
    // Fetch all transactions involving this account
    const { data: txns, error: txnError } = await supabase.from('transactions').select('amount, type, category_id, account_id, target_account_id, status').eq('status', 'posted').is('parent_transaction_id', null).or(`account_id.eq.${accountId},target_account_id.eq.${accountId}`);
    if (txnError) {
        console.error('Error fetching transactions for balance:', txnError);
        return false;
    }
    const { totalIn, totalOut, currentBalance } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$account$2d$balance$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["computeAccountTotals"])({
        accountId,
        accountType: account.type,
        transactions: txns || []
    });
    const { error: updateError } = await supabase.from('accounts').update({
        current_balance: currentBalance,
        total_in: totalIn,
        total_out: totalOut
    }).eq('id', accountId);
    if (updateError) {
        console.error('Error updating account balance:', updateError);
        return false;
    }
    return true;
}
async function recalculateBalanceWithClient(supabase, accountId) {
    const { data: account, error: accError } = await supabase.from('accounts').select('type').eq('id', accountId).single();
    if (accError || !account) {
        console.error('Account not found for balance calc:', accountId);
        return false;
    }
    const { data: txns, error: txnError } = await supabase.from('transactions').select('amount, type, category_id, account_id, target_account_id, status').eq('status', 'posted').is('parent_transaction_id', null).or(`account_id.eq.${accountId},target_account_id.eq.${accountId}`);
    if (txnError) {
        console.error('Error fetching transactions for balance:', txnError);
        return false;
    }
    const { totalIn, totalOut, currentBalance } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$account$2d$balance$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["computeAccountTotals"])({
        accountId,
        accountType: account.type,
        transactions: txns || []
    });
    const { error: updateError } = await supabase.from('accounts').update({
        current_balance: currentBalance,
        total_in: totalIn,
        total_out: totalOut
    }).eq('id', accountId);
    if (updateError) {
        console.error('Error updating account balance:', updateError);
        return false;
    }
    return true;
}
async function deleteAccount(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // Potential restriction: don't delete if it has transactions?
    // Or just void it?
    // Schema usually allows deletion if no foreign keys block it.
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) {
        console.error('Error deleting account:', error);
        return false;
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])('/accounts');
    return true;
}
async function updateAccountStatus(id, isActive) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from('accounts').update({
        is_active: isActive
    }).eq('id', id);
    if (error) {
        console.error('Error updating account status:', error);
        return false;
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])('/accounts');
    return true;
}
async function getRecentAccountsByTransactions(limit = 5) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // Query transactions, ordered by occurred_at
    const { data: txns, error } = await supabase.from('transactions').select('account_id').not('account_id', 'is', null).order('occurred_at', {
        ascending: false
    }).limit(50);
    if (error || !txns) return [];
    // Get unique account IDs in order of last transaction
    const accountIds = Array.from(new Set(txns.map((t)=>t.account_id).filter((id)=>!!id))).slice(0, limit);
    if (accountIds.length === 0) return [];
    // Fetch account details
    const { data: accounts, error: aError } = await supabase.from('accounts').select('id, name, type, image_url').in('id', accountIds);
    if (aError || !accounts) return [];
    // Return matched accounts in correct order
    return accountIds.map((id)=>accounts.find((a)=>a.id === id)).filter(Boolean);
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getAccounts,
    getAccountDetails,
    getAccountTransactions,
    updateAccountConfig,
    getAccountStats,
    recalculateBalance,
    recalculateBalanceWithClient,
    deleteAccount,
    updateAccountStatus,
    getRecentAccountsByTransactions
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getAccounts, "4025535a7c56682fe772921004acf31ea7b1cf9ce6", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getAccountDetails, "402dddb5a10d05bd4a280044d24cd558fc16188c7d", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getAccountTransactions, "6007791fa7861b8c2494d335b6be50659e1704a14d", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(updateAccountConfig, "60d2aaf7eb98d4312336246c01230655e9eb4f53d2", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getAccountStats, "4079ee79cba88f111b39c21d7d7bda03e04ddd942c", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(recalculateBalance, "404c23911a3a9f04f106fbe9b35d1fafa5f8d773e2", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(recalculateBalanceWithClient, "60c754f2f36bb4d91cf6e56f4a0bd0de5b89680bcd", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteAccount, "40351a12d441631565f334ea63b8710f0399d6aa58", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(updateAccountStatus, "60bfcf3387d48e8a6f7c8270f7526c1553de520048", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getRecentAccountsByTransactions, "405e5a752edac0289b1fe964299b2a0735bd287654", null);
}),
];

//# sourceMappingURL=src_736471ed._.js.map