module.exports = [
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
"[project]/src/lib/cashback-policy.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatPercent",
    ()=>formatPercent,
    "formatPolicyLabel",
    ()=>formatPolicyLabel,
    "normalizePolicyMetadata",
    ()=>normalizePolicyMetadata
]);
function formatPercent(rate, fallback = '--') {
    if (typeof rate !== 'number' || Number.isNaN(rate)) return fallback;
    return `${(rate * 100).toFixed(1)}%`;
}
function normalizePolicyMetadata(metadata) {
    if (!metadata) return null;
    if (typeof metadata === 'string') {
        try {
            const parsed = JSON.parse(metadata);
            return normalizePolicyMetadata(parsed);
        } catch  {
            return null;
        }
    }
    if (typeof metadata !== 'object' || metadata === null) {
        return null;
    }
    const meta = metadata;
    const source = meta['policySource'] ?? meta['policy_source'];
    if (typeof source !== 'string') return null;
    // Validate literal type
    const validSources = [
        'program_default',
        'level_default',
        'category_rule',
        'legacy'
    ];
    if (!validSources.includes(source)) return null;
    const ruleMaxRewardRaw = meta['ruleMaxReward'] ?? meta['rule_max_reward'];
    const levelMinSpendRaw = meta['levelMinSpend'] ?? meta['level_min_spend'];
    const normalized = {
        policySource: source,
        reason: typeof meta['reason'] === 'string' ? meta['reason'] : '',
        rate: typeof meta['rate'] === 'number' && !Number.isNaN(meta['rate']) ? meta['rate'] : 0,
        levelId: typeof meta['levelId'] === 'string' ? meta['levelId'] : undefined,
        levelName: typeof meta['levelName'] === 'string' ? meta['levelName'] : undefined,
        levelMinSpend: typeof levelMinSpendRaw === 'number' && !Number.isNaN(levelMinSpendRaw) ? levelMinSpendRaw : undefined,
        ruleId: typeof meta['ruleId'] === 'string' ? meta['ruleId'] : undefined,
        categoryId: typeof meta['categoryId'] === 'string' ? meta['categoryId'] : undefined,
        ruleMaxReward: typeof ruleMaxRewardRaw === 'number' && !Number.isNaN(ruleMaxRewardRaw) ? ruleMaxRewardRaw : ruleMaxRewardRaw === null ? null : undefined
    };
    return normalized;
}
function formatPolicyLabel(metadata, currencyFormatter, fallback = null) {
    if (!metadata) return fallback;
    const rateText = formatPercent(metadata.rate);
    const maxRewardText = typeof metadata.ruleMaxReward === 'number' ? `max ${currencyFormatter.format(metadata.ruleMaxReward)}` : null;
    const levelText = metadata.levelName ? `${metadata.levelName}${metadata.levelMinSpend ? ` (>= ${currencyFormatter.format(metadata.levelMinSpend)})` : ''}` : null;
    const parts = [];
    switch(metadata.policySource){
        case 'category_rule':
            parts.push(metadata.reason || 'Category rule');
            if (levelText) parts.push(levelText);
            parts.push(rateText);
            if (maxRewardText) parts.push(maxRewardText);
            break;
        case 'level_default':
            parts.push(levelText || 'Level default');
            parts.push(rateText);
            break;
        case 'program_default':
            parts.push(`Default ${rateText}`);
            if (levelText) parts.push(levelText);
            break;
        case 'legacy':
        default:
            parts.push(metadata.reason || 'Default policy');
            parts.push(rateText);
            break;
    }
    return parts.filter(Boolean).join(' • ');
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
"[project]/src/services/cashback/policy-resolver.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "resolveCashbackPolicy",
    ()=>resolveCashbackPolicy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/cashback.ts [app-route] (ecmascript)");
;
function resolveCashbackPolicy(params) {
    const { account, amount, categoryId, categoryName, cycleTotals } = params;
    // PRIORITY 1: New Column-based Config
    if (account.cb_type && account.cb_type !== 'none') {
        const baseRate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeRate"])(account.cb_base_rate ?? 0);
        let finalRate = baseRate;
        let finalMaxReward = undefined;
        let source = {
            policySource: 'program_default',
            reason: 'Card base rate',
            rate: finalRate,
            ruleType: 'program_default',
            priority: 0
        };
        if (account.cb_type === 'tiered' && account.cb_rules_json) {
            // Support both object { tiers, base_rate } and legacy array
            const rawRules = account.cb_rules_json;
            const tiers = Array.isArray(rawRules) ? rawRules : rawRules.tiers || [];
            const tieredBaseRate = !Array.isArray(rawRules) && rawRules.base_rate !== undefined ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeRate"])(rawRules.base_rate) : baseRate;
            const sortedTiers = [
                ...tiers
            ].sort((a, b)=>b.min_spend - a.min_spend);
            const qualifiedTiers = sortedTiers.filter((t)=>cycleTotals.spent >= (t.min_spend ?? 0));
            let matchedPolicy = null;
            if (categoryId && qualifiedTiers.length > 0) {
                for (const tier of qualifiedTiers){
                    const policies = Array.isArray(tier.policies) ? tier.policies : tier.rules || [];
                    const found = policies.find((p)=>p.categoryIds?.includes(categoryId) || p.cat_ids?.includes(categoryId));
                    if (found) {
                        matchedPolicy = {
                            ...found,
                            tier
                        };
                        break;
                    }
                }
            }
            if (matchedPolicy) {
                finalRate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeRate"])(matchedPolicy.rate ?? 0);
                finalMaxReward = matchedPolicy.max ?? matchedPolicy.maxReward ?? undefined;
                source = {
                    policySource: 'category_rule',
                    reason: categoryName ? `${categoryName} rule` : 'Category rule matched',
                    rate: finalRate,
                    levelId: matchedPolicy.tier.id || `tier-${matchedPolicy.tier.min_spend}`,
                    levelName: matchedPolicy.tier.name || `Tier ≥${matchedPolicy.tier.min_spend}`,
                    levelMinSpend: matchedPolicy.tier.min_spend,
                    categoryId: categoryId || undefined,
                    ruleId: matchedPolicy.id,
                    ruleMaxReward: finalMaxReward,
                    ruleType: 'category',
                    priority: 20
                };
            } else if (qualifiedTiers.length > 0) {
                const topTier = qualifiedTiers[0];
                finalRate = topTier.base_rate !== undefined && topTier.base_rate !== null ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeRate"])(topTier.base_rate) : tieredBaseRate;
                source = {
                    policySource: 'level_default',
                    reason: topTier.name ? `Level matched: ${topTier.name}` : `Tier matched: ≥${topTier.min_spend}`,
                    rate: finalRate,
                    levelId: topTier.id || `tier-${topTier.min_spend}`,
                    levelName: topTier.name || `Tier ≥${topTier.min_spend}`,
                    levelMinSpend: topTier.min_spend,
                    ruleType: 'level_default',
                    priority: 10
                };
            } else {
                finalRate = tieredBaseRate;
            }
        } else if (account.cb_type === 'simple' && Array.isArray(account.cb_rules_json)) {
            const rules = account.cb_rules_json;
            const matchedRule = categoryId ? rules.find((r)=>r.categoryIds?.includes(categoryId) || r.cat_ids?.includes(categoryId)) : null;
            if (matchedRule) {
                finalRate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeRate"])(matchedRule.rate ?? 0);
                finalMaxReward = matchedRule.max ?? matchedRule.maxReward ?? undefined;
                source = {
                    policySource: 'category_rule',
                    reason: categoryName ? `${categoryName} rule` : 'Category rule matched',
                    rate: finalRate,
                    levelId: matchedRule.id,
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
            minSpend: account.cb_min_spend ?? undefined,
            metadata: source
        };
    }
    // PRIORITY 2: Old JSON-based Config (Fallback for compatibility)
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(account.cashback_config, account.id || 'unknown');
    // 1. If no MF5.3 program exists, fallback to Legacy Logic (MF5.2)
    if (!config.program) {
        const { rate } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["calculateBankCashback"])(config, amount, categoryName, cycleTotals.spent);
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
        };
    }
    const { program } = config;
    // Default: Program fallback
    let finalRate = program.defaultRate;
    let finalMaxReward = undefined;
    // Base metadata: Program Default
    let source = {
        policySource: 'program_default',
        reason: 'Program default rate',
        rate: finalRate,
        ruleType: 'program_default',
        priority: 0
    };
    // Gate: if program has minSpendTarget and current spend is below it, skip levels and stay at program default
    const requiresMinSpend = typeof program.minSpendTarget === 'number' && program.minSpendTarget > 0;
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
        };
    }
    // 2. Aggregate all qualified levels based on spend (highest first)
    const sortedLevels = program.levels ? [
        ...program.levels
    ].sort((a, b)=>b.minTotalSpend - a.minTotalSpend) : [];
    const qualifiedLevels = sortedLevels.filter((lvl)=>cycleTotals.spent >= lvl.minTotalSpend);
    let matchedRule = undefined;
    // 3. Find the best matching Category Rule across ALL qualified levels
    // We prioritize rules in HIGHER levels, but search them all.
    if (categoryId && qualifiedLevels.length > 0) {
        for (const lvl of qualifiedLevels){
            if (lvl.rules && lvl.rules.length > 0) {
                const matchingRules = lvl.rules.filter((rule)=>rule.categoryIds.includes(categoryId));
                if (matchingRules.length > 0) {
                    // Sort matching rules within THIS level by specificity
                    const rulesWithIndex = matchingRules.map((r)=>({
                            ...r,
                            originalIndex: lvl.rules.indexOf(r)
                        }));
                    rulesWithIndex.sort((a, b)=>{
                        const specDiff = a.categoryIds.length - b.categoryIds.length;
                        if (specDiff !== 0) return specDiff;
                        return a.originalIndex - b.originalIndex;
                    });
                    // We found our candidate in the highest qualifying level that actually has a rule
                    matchedRule = {
                        ...rulesWithIndex[0],
                        level: lvl
                    };
                    break; // Stop searching lower levels as we found a match in high tier
                }
            }
        }
    }
    // 4. Determine final policy
    const applicableLevel = qualifiedLevels[0] // The actual tier user is in based on spend
    ;
    if (matchedRule) {
        // High Tier found a rule (either directly or inherited)
        // MF5.4.4: Support inheriting level default rate if rule rate is 0/null
        const ruleRate = matchedRule.rate > 0 ? matchedRule.rate : matchedRule.level.defaultRate ?? program.defaultRate;
        finalRate = ruleRate;
        finalMaxReward = matchedRule.maxReward ?? undefined;
        const reasonLabel = categoryName ? `${categoryName} rule (${matchedRule.level.name})` : `Category rule matched for level ${matchedRule.level.name}`;
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
        };
    } else if (applicableLevel) {
        // No category rule found anywhere -> Tier Default
        const levelDefaultRate = applicableLevel.defaultRate ?? program.defaultRate;
        finalRate = levelDefaultRate;
        source = {
            policySource: 'level_default',
            reason: `Level matched: ${applicableLevel.name}`,
            rate: finalRate,
            levelId: applicableLevel.id,
            levelName: applicableLevel.name,
            levelMinSpend: applicableLevel.minTotalSpend,
            ruleType: 'level_default',
            priority: 10
        };
    }
    return {
        rate: finalRate,
        maxReward: finalMaxReward,
        minSpend: program.minSpendTarget ?? undefined,
        metadata: source
    };
}
}),
"[project]/src/services/cashback.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"40047007613fa429b6ba135d87d91a0813ee731a10":"getTransactionsForCycle","402626fe641b4ec99576710a307d1281d2b0a783f5":"getTransactionCashbackPolicyExplanation","406c85174d9c5b491948f26d9774379eaf122e16cc":"getAccountCycles","406ea6945ec88656b651adf5773ed63d2e8864da0d":"getAllCashbackHistory","4094f5f65c4acf761b03da43f81626d6b09eba060a":"upsertTransactionCashback","40bbb8506a8d5b1bc176ebbb762b2b32fad8940429":"getCashbackYearAnalytics","40c5672320ad800e56bf9bf98241e772e98a1a4381":"removeTransactionCashback","40fe076bfa2e09bd8028a2184353cd4565c02a6dc6":"simulateCashback","604cdc836046747645919a841360f8b910f2ad3225":"recomputeAccountCashback","608a169e59ba824b727000825d1b82a2669853c6af":"recomputeCashbackCycle","60d01b2eb160b2bd2140cf9dd716d15aa93cac495c":"getCashbackCycleOptions","7001e29dd6019991352280661f171e3da0a4d56e25":"getMonthlyCashbackTransactions","7828ec98ab7c583284f4b4d11d5fab7d577f391dc7":"getCashbackProgress","783a70cf44ae00c310f54d9b3e449da12e45eb45ee":"getAccountSpendingStats"},"",""] */ __turbopack_context__.s([
    "getAccountCycles",
    ()=>getAccountCycles,
    "getAccountSpendingStats",
    ()=>getAccountSpendingStats,
    "getAllCashbackHistory",
    ()=>getAllCashbackHistory,
    "getCashbackCycleOptions",
    ()=>getCashbackCycleOptions,
    "getCashbackProgress",
    ()=>getCashbackProgress,
    "getCashbackYearAnalytics",
    ()=>getCashbackYearAnalytics,
    "getMonthlyCashbackTransactions",
    ()=>getMonthlyCashbackTransactions,
    "getTransactionCashbackPolicyExplanation",
    ()=>getTransactionCashbackPolicyExplanation,
    "getTransactionsForCycle",
    ()=>getTransactionsForCycle,
    "recomputeAccountCashback",
    ()=>recomputeAccountCashback,
    "recomputeCashbackCycle",
    ()=>recomputeCashbackCycle,
    "removeTransactionCashback",
    ()=>removeTransactionCashback,
    "simulateCashback",
    ()=>simulateCashback,
    "upsertTransactionCashback",
    ()=>upsertTransactionCashback
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/cashback.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2d$policy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/cashback-policy.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transaction$2d$mapper$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/transaction-mapper.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/date-fns@4.1.0/node_modules/date-fns/format.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$cashback$2f$policy$2d$resolver$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/cashback/policy-resolver.ts [app-route] (ecmascript)");
/**
 * Ensures a cashback cycle exists for the given account and tag.
 * Returns the cycle ID.
 */ // DEBUG: Admin client creation
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$89$2e$0$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+supabase-js@2.89.0/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
function createAdminClient() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$supabase$2d$js$40$2$2e$89$2e$0$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://puzvrlojtgneihgvevcx.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY);
}
/**
 * Ensures a cashback cycle exists for the given account and tag.
 * Returns the cycle ID.
 */ const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const getCashbackClient = ()=>hasServiceRole ? createAdminClient() : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
async function ensureCycle(accountId, cycleTag, accountConfig, fallbackTag, client = getCashbackClient()) {
    const supabase = client;
    // 1. Try to fetch existing
    const { data: existing } = await supabase.from('cashback_cycles').select('id').eq('account_id', accountId).eq('cycle_tag', cycleTag).maybeSingle();
    if (existing) return {
        id: existing.id,
        tag: cycleTag
    };
    if (fallbackTag && fallbackTag !== cycleTag) {
        const { data: fallback } = await supabase.from('cashback_cycles').select('id').eq('account_id', accountId).eq('cycle_tag', fallbackTag).maybeSingle();
        if (fallback) return {
            id: fallback.id,
            tag: fallbackTag
        };
    }
    // 2. Create if not exists
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(accountConfig, accountId);
    // Default to null if not defined, allowing DB to store NULL.
    // When doing math later, we treat NULL as 0.
    const maxBudget = config.maxAmount ?? null;
    const minSpend = config.minSpend ?? null;
    const { data: newCycle, error } = await supabase.from('cashback_cycles').insert({
        account_id: accountId,
        cycle_tag: cycleTag,
        max_budget: maxBudget,
        min_spend_target: minSpend,
        spent_amount: 0
    }).select('id').single();
    if (error) {
        // Handle race condition
        const { data: retry } = await supabase.from('cashback_cycles').select('id').eq('account_id', accountId).eq('cycle_tag', cycleTag)// eslint-disable-next-line @typescript-eslint/no-explicit-any
        .maybeSingle();
        if (retry) return {
            id: retry.id,
            tag: cycleTag
        };
        throw error;
    }
    return {
        id: newCycle.id,
        tag: cycleTag
    };
}
async function upsertTransactionCashback(transaction) {
    const supabase = getCashbackClient();
    const { data: existingEntries } = await supabase.from('cashback_entries').select('cycle_id, account_id').eq('transaction_id', transaction.id);
    const existingCycleIds = Array.from(new Set((existingEntries ?? []).map((entry)=>entry.cycle_id).filter(Boolean)));
    if (![
        'expense',
        'debt'
    ].includes(transaction.type ?? '')) {
        if (existingEntries && existingEntries.length > 0) {
            await supabase.from('cashback_entries').delete().eq('transaction_id', transaction.id);
            for (const cycleId of existingCycleIds){
                await recomputeCashbackCycle(cycleId);
            }
        }
        return;
    }
    // MF16: Strict Note-based Exclusion for Cashback
    const note = String(transaction.note || '').toLowerCase();
    const isExcluded = note.includes('create initial') || note.includes('số dư đầu') || note.includes('opening balance') || note.includes('rollover') || String(transaction.status).toLowerCase() === 'void';
    if (isExcluded) {
        if (existingEntries && existingEntries.length > 0) {
            await supabase.from('cashback_entries').delete().eq('transaction_id', transaction.id);
            for (const cycleId of existingCycleIds){
                await recomputeCashbackCycle(cycleId);
            }
        }
        return;
    }
    const { data: account } = await supabase.from('accounts').select('id, type, cashback_config').eq('id', transaction.account_id).single();
    if (!account || account.type !== 'credit_card') {
        if (existingEntries && existingEntries.length > 0) {
            await supabase.from('cashback_entries').delete().eq('transaction_id', transaction.id);
            for (const cycleId of existingCycleIds){
                await recomputeCashbackCycle(cycleId);
            }
        }
        return;
    }
    const modePreference = transaction.cashback_mode || 'none_back';
    let mode = 'virtual';
    let amount = 0;
    let countsToBudget = false;
    const fixedInput = transaction.cashback_share_fixed ?? 0;
    // const percentInput = transaction.cashback_share_percent ?? 0; // Unused in favor of Resolver logic unless overridden?
    // User Rule: "real_percent" transaction calculates from input OR policy?
    // Current logic used input. Let's see...
    // "real_percent creates entry with amount = computed real cashback or stored fixed equivalent"
    // If mode is real_percent, we usually trust the policy? 
    // No, if it's "real_percent", it implies we are using the % stored in the transaction?
    // Actually, MF5.2.2 requirements say: "Load: decimal -> percent, Save: percent -> decimal".
    // transaction.cashback_share_percent IS already the source of truth if set.
    // But wait, "resolveCashbackPolicy" is the new way.
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(account.cashback_config, account.id);
    const date = new Date(transaction.occurred_at);
    const cycleRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleRange"])(config, date);
    const tagDate = cycleRange?.end ?? date;
    const cycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatIsoCycleTag"])(tagDate);
    const legacyCycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatLegacyCycleTag"])(tagDate);
    const { id: cycleId, tag: resolvedTag } = await ensureCycle(account.id, cycleTag, account.cashback_config, legacyCycleTag, supabase);
    // Persist the resolved tag to the transaction so recompute (summing logic) works.
    if (transaction.persisted_cycle_tag !== resolvedTag) {
        await supabase.from('transactions').update({
            persisted_cycle_tag: resolvedTag
        }).eq('id', transaction.id);
    }
    // Get Cycle Totals for Policy Resolution (MF5.3 preparation)
    // We need spent_amount so far.
    const { data: cycle } = await supabase.from('cashback_cycles').select('spent_amount').eq('id', cycleId).single();
    const cycleTotals = {
        spent: cycle?.spent_amount ?? 0
    };
    const policy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$cashback$2f$policy$2d$resolver$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["resolveCashbackPolicy"])({
        account,
        categoryId: transaction.category_id,
        amount: Math.abs(transaction.amount),
        cycleTotals,
        categoryName: transaction.category_name ?? undefined
    });
    let effectiveRate = policy.rate;
    switch(modePreference){
        case 'real_fixed':
            mode = 'real';
            amount = fixedInput;
            countsToBudget = true;
            break;
        case 'real_percent':
            mode = 'real';
            effectiveRate = transaction.cashback_share_percent !== undefined && transaction.cashback_share_percent !== null ? transaction.cashback_share_percent : policy.rate;
            amount = Math.abs(transaction.amount) * effectiveRate + fixedInput;
            countsToBudget = true;
            break;
        case 'percent':
            mode = 'virtual';
            effectiveRate = transaction.cashback_share_percent !== undefined && transaction.cashback_share_percent !== null ? transaction.cashback_share_percent : policy.rate;
            amount = Math.abs(transaction.amount) * effectiveRate + fixedInput;
            countsToBudget = true;
            break;
        case 'fixed':
            mode = 'virtual';
            amount = fixedInput;
            countsToBudget = true;
            break;
        case 'voluntary':
            mode = 'voluntary';
            amount = fixedInput;
            countsToBudget = false;
            break;
        case 'none_back':
        default:
            mode = 'virtual';
            amount = Math.abs(transaction.amount) * policy.rate;
            countsToBudget = true;
            break;
    }
    if (!policy.metadata) {
        throw new Error(`Critical: Cashback policy resolution failed to return metadata for transaction ${transaction.id}`);
    }
    const entryData = {
        cycle_id: cycleId,
        account_id: account.id,
        transaction_id: transaction.id,
        mode,
        amount,
        counts_to_budget: countsToBudget,
        metadata: {
            ...policy.metadata,
            rate: effectiveRate
        },
        note: mode === 'virtual' ? `Projected: ${policy.metadata.reason}` : transaction.note || `Manual: ${policy.metadata.reason}`
    };
    // Safe Upsert with Strict Constraint Handling
    // We used to do check-then-update/insert.
    // Now we have a unique index. Upsert is safer.
    const { error: upsertError } = await supabase.from('cashback_entries').upsert(entryData, {
        onConflict: 'account_id, transaction_id'
    });
    if (upsertError) {
        console.error('Cashback Upsert Error:', upsertError);
        // Fallback? No, this is critical.
        throw upsertError;
    }
    const previousCycleId = (existingEntries ?? []).find((entry)=>entry.account_id === account.id)?.cycle_id ?? null;
    const staleEntries = (existingEntries ?? []).filter((entry)=>entry.account_id !== account.id);
    const staleCycleIds = Array.from(new Set(staleEntries.map((entry)=>entry.cycle_id).filter(Boolean)));
    if (staleEntries.length > 0) {
        await supabase.from('cashback_entries').delete().eq('transaction_id', transaction.id).neq('account_id', account.id);
        for (const oldCycleId of staleCycleIds){
            await recomputeCashbackCycle(oldCycleId);
        }
    }
    if (previousCycleId && previousCycleId !== cycleId) {
        await recomputeCashbackCycle(previousCycleId);
    }
    // Trigger recompute for the current cycle.
    await recomputeCashbackCycle(cycleId);
}
async function recomputeCashbackCycle(cycleId, supabaseClient) {
    const supabase = supabaseClient ?? getCashbackClient();
    // 1. Fetch Cycle & Parent Account Info
    const { data: cycle } = await supabase.from('cashback_cycles').select('account_id, cycle_tag, max_budget, min_spend_target').eq('id', cycleId).single();
    if (!cycle) return;
    const { data: account } = await supabase.from('accounts').select('cashback_config').eq('id', cycle.account_id).single();
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(account?.cashback_config, cycle.account_id);
    const maxBudget = config.maxAmount ?? null;
    const minSpendTarget = config.minSpend ?? null;
    // 2. Aggregate Spent Amount from Transactions
    // MF5.3.3 FIX: Include ONLY expense and debt (abs). Exclude transfer, repayment, lending.
    const { data: rawTxns } = await supabase.from('transactions').select('id, amount, type, note, category_id, categories(name)').eq('account_id', cycle.account_id).eq('persisted_cycle_tag', cycle.cycle_tag).neq('status', 'void').in('type', [
        'expense',
        'debt'
    ]);
    // MF16: Filter out Initial/Rollover transactions in recompute
    const txns = (rawTxns ?? []).filter((t)=>{
        const note = String(t.note || '').toLowerCase();
        return !(note.includes('create initial') || note.includes('số dư đầu') || note.includes('opening balance') || note.includes('rollover'));
    });
    const spentAmount = txns.reduce((sum, t)=>sum + Math.abs(t.amount || 0), 0);
    const isMinSpendMet = minSpendTarget !== null ? spentAmount >= minSpendTarget : true;
    // 3. Re-resolve all entries for this cycle to handle tier jumps and ensure consistency
    // This is the "Deterministic" part: we recalculate based on the final spentAmount.
    const { resolveCashbackPolicy } = await __turbopack_context__.A("[project]/src/services/cashback/policy-resolver.ts [app-route] (ecmascript, async loader)");
    const entriesToUpsert = [];
    for (const txn of txns){
        const policy = resolveCashbackPolicy({
            account,
            categoryId: txn.category_id,
            amount: Math.abs(txn.amount),
            cycleTotals: {
                spent: spentAmount
            },
            categoryName: txn.categories?.name
        });
        // Determine mode and countsToBudget based on standard resolver logic
        // We assume 'virtual' for recompute unless specifically overridden in future.
        // However, if we want to preserve 'real' status of existing entries, we'd need to fetch them.
        // For simplicity and deterministic truth, we use 'virtual' as the baseline for recomputed projections.
        // Wait, if we overwrite 'real' entries with 'virtual', that's bad.
        // Let's fetch existing entry modes first.
        entriesToUpsert.push({
            cycle_id: cycleId,
            account_id: cycle.account_id,
            transaction_id: txn.id,
            amount: Math.abs(txn.amount) * policy.rate,
            mode: 'virtual',
            counts_to_budget: true,
            metadata: {
                ...policy.metadata,
                rate: policy.rate
            },
            note: `Recomputed: ${policy.metadata.reason}`
        });
    }
    // Bulk upsert entries (only metadata and amount update if txn exists)
    if (entriesToUpsert.length > 0) {
        await supabase.from('cashback_entries').upsert(entriesToUpsert, {
            onConflict: 'account_id, transaction_id'
        });
    }
    // 4. Aggregate and apply Caps (Tier Cap and Rule Cap)
    const { data: updatedEntries } = await supabase.from('cashback_entries').select('mode, amount, counts_to_budget, metadata').eq('cycle_id', cycleId);
    let realTotal = 0;
    let virtualTotalRaw = 0;
    let voluntaryTotal = 0;
    // Group by Rule for Rule-level capping
    const ruleGroupSums = {};
    // Group by Tier for Tier-level capping
    const tierGroupSums = {};
    (updatedEntries ?? []).forEach((e)=>{
        const meta = e.metadata || {};
        const amount = Number(e.amount || 0);
        if (e.mode === 'real' && e.counts_to_budget) {
            realTotal += amount;
        } else if (e.mode === 'virtual') {
            // Rule Capping logic
            if (meta.ruleId) {
                if (!ruleGroupSums[meta.ruleId]) {
                    ruleGroupSums[meta.ruleId] = {
                        total: 0,
                        max: meta.ruleMaxReward ?? null
                    };
                }
                ruleGroupSums[meta.ruleId].total += amount;
            } else {
                virtualTotalRaw += amount;
            }
            // Tier Capping logic (MF16)
            if (meta.levelId) {
            // Try to find if the tier itself has a cap (max_reward at tier level)
            // We'd need to know the tier config here. 
            // For now, rule caps are most important.
            }
        } else if (e.mode === 'voluntary' || !e.counts_to_budget) {
            voluntaryTotal += amount;
        }
    });
    // Apply Rule Caps
    for(const ruleId in ruleGroupSums){
        const group = ruleGroupSums[ruleId];
        if (group.max !== null && group.max > 0) {
            const capped = Math.min(group.total, group.max);
            virtualTotalRaw += capped;
            voluntaryTotal += group.total - capped; // The part that hit the cap is "loss"
        } else {
            virtualTotalRaw += group.total;
        }
    }
    // 5. Final Logic Application (Overall Budget)
    const capAfterReal = maxBudget !== null ? Math.max(0, maxBudget - realTotal) : Infinity;
    const virtualEffective = Math.min(virtualTotalRaw, capAfterReal);
    const virtualOverflow = Math.max(0, virtualTotalRaw - virtualEffective);
    const realOverflow = maxBudget !== null ? Math.max(0, realTotal - maxBudget) : 0;
    const totalOverflowLoss = voluntaryTotal + virtualOverflow + realOverflow;
    const realEffective = maxBudget !== null ? Math.min(realTotal, maxBudget) : realTotal;
    const isExhausted = maxBudget !== null && (realTotal >= maxBudget || realTotal + virtualEffective >= maxBudget);
    // 6. Update Cycle Record
    await supabase.from('cashback_cycles').update({
        max_budget: maxBudget,
        min_spend_target: minSpendTarget,
        spent_amount: spentAmount,
        met_min_spend: isMinSpendMet,
        real_awarded: realEffective,
        virtual_profit: virtualEffective,
        overflow_loss: totalOverflowLoss,
        is_exhausted: isExhausted,
        updated_at: new Date().toISOString()
    }).eq('id', cycleId);
}
async function removeTransactionCashback(transactionId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // Get all cashback entries for this transaction (not just one)
    const { data: entries, error: selectError } = await supabase.from('cashback_entries').select('cycle_id').eq('transaction_id', transactionId);
    if (selectError) {
        console.error('Error fetching cashback entries for deletion:', selectError);
        throw selectError;
    }
    if (entries && entries.length > 0) {
        // Delete all cashback entries for this transaction
        const { error: deleteError } = await supabase.from('cashback_entries').delete().eq('transaction_id', transactionId);
        if (deleteError) {
            console.error('Error deleting cashback entries:', deleteError);
            throw deleteError;
        }
        // Recompute affected cycles
        const uniqueCycleIds = new Set(entries.map((e)=>e.cycle_id).filter(Boolean));
        for (const cycleId of uniqueCycleIds){
            try {
                await recomputeCashbackCycle(cycleId);
            } catch (err) {
                console.error(`Failed to recompute cashback cycle ${cycleId}:`, err);
            }
        }
    }
}
async function getAccountSpendingStats(accountId, date, categoryId, cycleTag) {
    const supabase = getCashbackClient();
    const { data: account } = await supabase.from('accounts').select('cashback_config, type, cb_type, cb_base_rate, cb_max_budget, cb_is_unlimited, cb_rules_json').eq('id', accountId).single();
    if (!account || account.type !== 'credit_card') return null;
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(account.cashback_config, accountId);
    // If cycleTag is provided explicitly, use it directly; otherwise derive from date
    let resolvedCycleTag;
    let cycleRange;
    if (cycleTag) {
        // Use the provided cycleTag directly
        resolvedCycleTag = cycleTag;
        // Try to derive cycleRange from the cycleTag for display purposes
        // For statement cycles like "2026-01", we can reconstruct the range
        try {
            const [yearStr, monthStr] = cycleTag.split('-');
            if (yearStr && monthStr) {
                const year = parseInt(yearStr, 10);
                const month = parseInt(monthStr, 10);
                if (!isNaN(year) && !isNaN(month)) {
                    // Use first day of tag month as reference to consistently resolve statement cycle tag
                    const refDate = new Date(year, month - 1, 1);
                    cycleRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleRange"])(config, refDate);
                } else {
                    cycleRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleRange"])(config, date);
                }
            } else {
                cycleRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleRange"])(config, date);
            }
        } catch (e) {
            cycleRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleRange"])(config, date);
        }
    } else {
        // Derive from date (original behavior)
        cycleRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleRange"])(config, date);
        const tagDate = cycleRange?.end ?? date;
        resolvedCycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatIsoCycleTag"])(tagDate);
    }
    const legacyTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatLegacyCycleTag"])(cycleRange?.end ?? date);
    let cycle = (await supabase.from('cashback_cycles').select('*').eq('account_id', accountId).eq('cycle_tag', resolvedCycleTag).maybeSingle()).data ?? null;
    if (!cycle && legacyTag !== resolvedCycleTag) {
        cycle = (await supabase.from('cashback_cycles').select('*').eq('account_id', accountId).eq('cycle_tag', legacyTag).maybeSingle()).data ?? null;
    }
    console.log(`[getAccountSpendingStats] ========== START ==========`);
    console.log(`[getAccountSpendingStats] Account ID: ${accountId}`);
    console.log(`[getAccountSpendingStats] Input cycleTag: ${cycleTag}`);
    console.log(`[getAccountSpendingStats] Resolved cycleTag: ${resolvedCycleTag}`);
    console.log(`[getAccountSpendingStats] Legacy tag: ${legacyTag}`);
    console.log(`[getAccountSpendingStats] Cycle found in DB: ${!!cycle}`);
    console.log(`[getAccountSpendingStats] Cycle data:`, cycle ? {
        cycle_tag: cycle.cycle_tag,
        spent_amount: cycle.spent_amount,
        real_awarded: cycle.real_awarded,
        min_spend_target: cycle.min_spend_target,
        max_budget: cycle.max_budget
    } : 'NULL');
    let categoryName = undefined;
    if (categoryId) {
        const { data: cat } = await supabase.from('categories').select('name').eq('id', categoryId).single();
        categoryName = cat?.name;
    }
    const { resolveCashbackPolicy } = await __turbopack_context__.A("[project]/src/services/cashback/policy-resolver.ts [app-route] (ecmascript, async loader)");
    const policy = resolveCashbackPolicy({
        account,
        categoryId,
        amount: 1000000,
        cycleTotals: {
            spent: cycle?.spent_amount ?? 0
        },
        categoryName
    });
    // MF6.1 FIX: Helper to aggregate cycle stats in real-time for accuracy
    // 1. Calculate Spent Amount & Eligible Transactions
    let txnsQuery = supabase.from('transactions').select(`
      id, amount, type, occurred_at, note,
      cashback_share_percent, cashback_share_fixed,
      est_cashback, cashback_shared_amount,
      category:categories(id, name, icon, kind),
      shop:shops(name, image_url)
    `).eq('account_id', accountId).neq('status', 'void').in('type', [
        'expense',
        'debt',
        'service'
    ]);
    // MF17: Robust cycle matching - try persisted_cycle_tag first, then 'tag' column, then date range
    const { data: tagTxns } = await txnsQuery.eq('persisted_cycle_tag', resolvedCycleTag);
    // Also try matching by 'tag' column (some transactions use this legacy approach)
    const { data: legacyTagTxns } = await supabase.from('transactions').select(`
      id, amount, type, occurred_at, note,
      cashback_share_percent, cashback_share_fixed,
      est_cashback, cashback_shared_amount,
      category:categories(id, name, icon, kind),
      shop:shops(name, image_url)
    `).eq('account_id', accountId).neq('status', 'void').in('type', [
        'expense',
        'debt',
        'service'
    ]).eq('tag', resolvedCycleTag);
    // Merge both result sets, deduplicating by ID
    const mergedMap = new Map();
    (tagTxns || []).forEach((t)=>mergedMap.set(t.id, t));
    (legacyTagTxns || []).forEach((t)=>mergedMap.set(t.id, t));
    let rawTxns = Array.from(mergedMap.values());
    console.log(`[getAccountSpendingStats] Transactions found by persisted_cycle_tag: ${(tagTxns || []).length}`);
    console.log(`[getAccountSpendingStats] Transactions found by tag column: ${(legacyTagTxns || []).length}`);
    console.log(`[getAccountSpendingStats] Merged transactions (after dedup): ${rawTxns.length}`);
    if (rawTxns.length === 0 && cycleRange) {
        console.log(`[getAccountSpendingStats] No transactions found by tag, trying date range:`, {
            start: cycleRange.start.toISOString(),
            end: cycleRange.end.toISOString()
        });
        const { data: dateTxns } = await supabase.from('transactions').select(`
            id, amount, type, occurred_at, note,
            cashback_share_percent, cashback_share_fixed,
            est_cashback, cashback_shared_amount,
            category:categories(id, name, icon, kind),
            shop:shops(name, image_url)
        `).eq('account_id', accountId).neq('status', 'void').in('type', [
            'expense',
            'debt',
            'service'
        ]).gte('occurred_at', cycleRange.start.toISOString()).lte('occurred_at', cycleRange.end.toISOString());
        rawTxns = dateTxns || [];
        console.log(`[getAccountSpendingStats] Transactions found by date range: ${rawTxns.length}`);
    }
    // MF16: Aggregate only non-initial/rollover/internal transactions
    const txns = (rawTxns ?? []).filter((t)=>{
        const note = String(t.note || '').toLowerCase();
        const isInitial = note.includes('create initial') || note.includes('số dư đầu') || note.includes('opening balance') || note.includes('rollover');
        const categoryKind = t.category?.kind;
        const isInternal = categoryKind === 'internal';
        return !isInitial && !isInternal;
    });
    const currentSpend = txns.reduce((sum, t)=>sum + Math.abs(t.amount || 0), 0);
    const minSpendTarget = cycle?.min_spend_target ?? config.minSpend ?? null;
    const cycleMaxBudget = cycle?.max_budget ?? config.maxAmount ?? null;
    console.log(`[getAccountSpendingStats] Eligible transactions (after filtering): ${txns.length}`);
    console.log(`[getAccountSpendingStats] Current spend total: ${currentSpend.toLocaleString()}`);
    console.log(`[getAccountSpendingStats] Min spend target: ${minSpendTarget}`);
    console.log(`[getAccountSpendingStats] Max cashback budget: ${cycleMaxBudget}`);
    // 2. Aggregate Cashback Values (transaction-first with persisted entry fallback)
    // Prefer transaction-level computed fields when present so selected-cycle metrics
    // stay aligned with table values; fallback to persisted entries and then policy-based
    // estimation if needed.
    const txnIds = txns.map((t)=>t.id);
    let earnedSoFarFromTxns = 0;
    let sharedSoFarFromTxns = 0;
    if (txnIds.length > 0) {
        const { data: entries } = await supabase.from('cashback_entries').select('amount, mode, transaction_id').in('transaction_id', txnIds).eq('account_id', accountId);
        const entryMap = new Map();
        (entries || []).forEach((entry)=>{
            if (entry.transaction_id && (entry.mode === 'virtual' || entry.mode === 'real')) {
                entryMap.set(entry.transaction_id, (entryMap.get(entry.transaction_id) || 0) + (entry.amount || 0));
            }
        });
        for (const t of txns){
            const category = t.category;
            const txnAmount = Math.abs(t.amount || 0);
            let txnEarned = 0;
            if (typeof t.est_cashback === 'number' && t.est_cashback > 0) {
                txnEarned = t.est_cashback;
            } else {
                const entryEarned = entryMap.get(t.id) || 0;
                if (entryEarned > 0) {
                    txnEarned = entryEarned;
                } else {
                    const resolvedPolicy = resolveCashbackPolicy({
                        account,
                        categoryId: category?.id,
                        amount: txnAmount,
                        cycleTotals: {
                            spent: currentSpend
                        },
                        categoryName: category?.name
                    });
                    const policyRate = resolvedPolicy.rate ?? 0;
                    txnEarned = txnAmount * policyRate;
                    if (resolvedPolicy.maxReward && resolvedPolicy.maxReward > 0) {
                        txnEarned = Math.min(txnEarned, resolvedPolicy.maxReward);
                    }
                }
            }
            const sharePercent = t.cashback_share_percent ?? 0;
            const shareFixed = t.cashback_share_fixed ?? 0;
            const sharedFromTxn = typeof t.cashback_shared_amount === 'number' ? t.cashback_shared_amount : shareFixed > 0 ? shareFixed : txnAmount * sharePercent;
            earnedSoFarFromTxns += txnEarned;
            sharedSoFarFromTxns += sharedFromTxn;
        }
    }
    // MF16: Rule Performance Breakdown
    const activeRules = [];
    const rules = account.cb_type === 'tiered' ? account.cb_rules_json?.tiers || account.cb_rules_json || [] : account.cb_rules_json || [];
    // Identify tiers vs rules
    const allSubRules = [];
    if (account.cb_type === 'tiered' && account.cb_rules_json?.tiers) {
        // Show next tier or current tier?
        // User expects to see the premium rules even if not qualified yet.
        account.cb_rules_json.tiers.forEach((tier)=>{
            tier.policies?.forEach((p)=>{
                allSubRules.push({
                    name: `${tier.name}: ${p.rate}% Bonus`,
                    rate: p.rate,
                    max: p.max,
                    cat_ids: p.cat_ids || p.categoryIds || [],
                    ruleId: `tier-${tier.min_spend}-${p.rate}`
                });
            });
        });
    } else if (Array.isArray(rules)) {
        rules.forEach((r, idx)=>{
            allSubRules.push({
                name: r.name || `Rule ${idx + 1}`,
                rate: r.rate,
                max: r.max || r.maxReward,
                cat_ids: r.cat_ids || r.categoryIds || [],
                ruleId: r.id || `rule-${idx}`
            });
        });
    }
    // MF16 FIX: Fetch category names for rule labels
    const allCatIds = Array.from(new Set(allSubRules.flatMap((r)=>r.cat_ids)));
    const { data: catNames } = allCatIds.length > 0 ? await supabase.from('categories').select('id, name').in('id', allCatIds) : {
        data: []
    };
    const catMap = Object.fromEntries((catNames || []).map((c)=>[
            c.id,
            c.name
        ]));
    // Calculate execution for each subRule
    allSubRules.forEach((rule)=>{
        const matchingTxns = txns.filter((t)=>rule.cat_ids.includes(t.category?.id));
        const spent = matchingTxns.reduce((sum, t)=>sum + Math.abs(t.amount), 0);
        // MF16.2: Normalize rate. If rate is 0.2 but logic uses /100, it becomes 0.002 (0.2%).
        // If user provided 0.2, it likely means 20% (0.2).
        const normalizedRate = rule.rate > 0 && rule.rate < 1 ? rule.rate * 100 : rule.rate;
        let earned = matchingTxns.reduce((sum, t)=>{
            const bankBack = Math.abs(t.amount) * (normalizedRate / 100);
            return sum + (rule.max ? Math.min(bankBack, rule.max) : bankBack);
        }, 0);
        // Apply rule cap if exists (though usually it's per transaction or per cycle)
        if (rule.max) earned = Math.min(earned, rule.max);
        // Build descriptive name if generic
        let displayName = rule.name;
        if (displayName.startsWith('Rule') || displayName.includes('% Bonus')) {
            const catLabels = rule.cat_ids.map((id)=>catMap[id]).filter(Boolean);
            if (catLabels.length > 0) {
                displayName = `${normalizedRate}% ${catLabels.slice(0, 2).join('/')}${catLabels.length > 2 ? '...' : ''}`;
            }
        }
        activeRules.push({
            ruleId: rule.ruleId || 'unknown',
            name: displayName,
            rate: normalizedRate,
            spent,
            earned,
            max: rule.max,
            isMain: normalizedRate > (account.cb_base_rate || 0)
        });
    });
    // Sort: Main (higher rate) first
    activeRules.sort((a, b)=>(b.isMain ? 1 : 0) - (a.isMain ? 1 : 0) || b.rate - a.rate);
    // Handle Cap Capping
    const isUnlimited = account.cb_is_unlimited === true || account.cb_type === 'none';
    if (!isUnlimited && cycleMaxBudget !== null && cycleMaxBudget > 0) {
        // If we exceed max budget, the overflow is loss
        const rawTotal = earnedSoFarFromTxns;
        earnedSoFarFromTxns = Math.min(rawTotal, cycleMaxBudget);
    }
    // Values for UI
    const earnedSoFar = earnedSoFarFromTxns;
    const sharedAmount = sharedSoFarFromTxns;
    const netProfit = earnedSoFar - sharedAmount;
    const isUnlimitedBudget = account.cb_is_unlimited === true;
    const remainingBudget = isUnlimitedBudget || cycleMaxBudget === null ? null : Math.max(0, cycleMaxBudget - earnedSoFar);
    const isMinSpendMet = currentSpend >= (minSpendTarget ?? 0);
    console.log(`[getAccountSpendingStats] ========== RESULTS ==========`);
    console.log(`[getAccountSpendingStats] Earned so far: ${earnedSoFar.toLocaleString()}`);
    console.log(`[getAccountSpendingStats] Shared amount: ${sharedAmount.toLocaleString()}`);
    console.log(`[getAccountSpendingStats] Net profit: ${netProfit.toLocaleString()}`);
    console.log(`[getAccountSpendingStats] estYearlyTotal: ${(earnedSoFar * 12).toLocaleString()}`);
    console.log(`[getAccountSpendingStats] Is min spend met: ${isMinSpendMet}`);
    console.log(`[getAccountSpendingStats] Remaining budget: ${remainingBudget}`);
    console.log(`[getAccountSpendingStats] ========== END ==========`);
    // Calculate Est Yearly Total (earnedSoFar scaled to year, simplified for now)
    // or use a more sophisticated projection if needed.
    // For now, let's at least sum what we have.
    const estYearlyTotal = earnedSoFar * 12; // Simplified projection
    return {
        currentSpend,
        minSpend: minSpendTarget,
        maxCashback: cycleMaxBudget,
        rate: policy.rate,
        maxReward: policy.maxReward,
        earnedSoFar,
        sharedAmount,
        potentialProfit: netProfit,
        netProfit,
        remainingBudget,
        potentialRate: policy.rate,
        matchReason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2d$policy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePolicyMetadata"])(policy.metadata)?.policySource,
        policyMetadata: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2d$policy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePolicyMetadata"])(policy.metadata) ?? undefined,
        is_min_spend_met: isMinSpendMet,
        activeRules,
        estYearlyTotal,
        cycle: cycleRange ? {
            tag: resolvedCycleTag,
            label: config.cycleType === 'statement_cycle' ? `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(cycleRange.start, 'dd.MM')} - ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(cycleRange.end, 'dd.MM')}` : resolvedCycleTag,
            start: cycleRange.start.toISOString(),
            end: cycleRange.end.toISOString()
        } : null
    };
}
async function getCashbackProgress(monthOffset = 0, accountIds, referenceDate, includeTransactions = false) {
    // DEBUG: Use Admin Client
    const supabase = createAdminClient();
    const date = referenceDate ? new Date(referenceDate) : new Date();
    if (!referenceDate) {
        date.setMonth(date.getMonth() + monthOffset);
    }
    let query = supabase.from('accounts').select('id, name, type, cashback_config, image_url, cb_type, cb_base_rate, cb_max_budget, cb_is_unlimited, cb_rules_json').in('type', [
        'credit_card',
        'debt'
    ]);
    if (accountIds && accountIds.length > 0) {
        query = query.in('id', accountIds);
    }
    const { data: accounts } = await query;
    if (!accounts) return [];
    const results = [];
    for (const acc of accounts){
        if (!acc.cashback_config) {
            // Return basic info for accounts without cashback config (e.g. Volunteer/Debt)
            results.push({
                accountId: acc.id,
                accountName: acc.name,
                accountLogoUrl: acc.image_url,
                currentSpend: 0,
                totalEarned: 0,
                sharedAmount: 0,
                netProfit: 0,
                maxCashback: null,
                progress: 0,
                rate: 0,
                spendTarget: null,
                cycleStart: null,
                cycleEnd: null,
                cycleLabel: 'N/A',
                cycleType: 'calendar_month',
                transactions: [],
                minSpend: null,
                minSpendMet: true,
                minSpendRemaining: null,
                remainingBudget: null,
                cycleOffset: 0,
                min_spend_required: null,
                total_spend_eligible: 0,
                is_min_spend_met: true,
                missing_min_spend: null,
                potential_earned: 0,
                totalGivenAway: 0
            });
            continue;
        }
        const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(acc.cashback_config, acc.id);
        const cycleRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleRange"])(config, date);
        const tagDate = cycleRange?.end ?? date;
        const cycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatIsoCycleTag"])(tagDate);
        const legacyTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatLegacyCycleTag"])(tagDate);
        let cycle = (await supabase.from('cashback_cycles').select('*').eq('account_id', acc.id).eq('cycle_tag', cycleTag).maybeSingle()).data ?? null;
        if (!cycle && legacyTag !== cycleTag) {
            cycle = (await supabase.from('cashback_cycles').select('*').eq('account_id', acc.id).eq('cycle_tag', legacyTag).maybeSingle()).data ?? null;
        }
        const currentSpend = cycle?.spent_amount ?? 0;
        const realAwarded = cycle?.real_awarded ?? 0;
        const virtualProfit = cycle?.virtual_profit ?? 0;
        const earnedSoFar = realAwarded + virtualProfit;
        const minSpend = cycle?.min_spend_target ?? config.minSpend ?? null;
        const maxCashback = cycle?.max_budget ?? config.maxAmount ?? null;
        const overflowLoss = cycle?.overflow_loss ?? 0;
        // MF5.3.3 FIX: Budget Left must come from cycle if exists, else fallback to config.maxAmount
        const remainingBudget = maxCashback !== null ? Math.max(0, maxCashback - earnedSoFar) : null;
        // Fix: Progress should track Budget Usage (Cap), not Min Spend
        const progress = maxCashback !== null && maxCashback > 0 ? Math.min(100, earnedSoFar / maxCashback * 100) : 0;
        const metMinSpend = cycle?.met_min_spend ?? (typeof minSpend === 'number' ? currentSpend >= minSpend : true);
        const missingMinSpend = typeof minSpend === 'number' && minSpend > currentSpend ? minSpend - currentSpend : null;
        const { resolveCashbackPolicy } = await __turbopack_context__.A("[project]/src/services/cashback/policy-resolver.ts [app-route] (ecmascript, async loader)");
        const policy = resolveCashbackPolicy({
            account: acc,
            amount: 1000000,
            cycleTotals: {
                spent: currentSpend
            }
        });
        let transactions = [];
        if (includeTransactions && cycle) {
            // Use direct relations instead of legacy line items to fix missing relation error
            const { data: entries, error: entriesError } = await supabase.from('cashback_entries').select(`
          mode, amount, metadata, transaction_id,
          transaction:transactions!inner (
            id, occurred_at, note, amount, account_id,
            cashback_share_percent, cashback_share_fixed,
            category:categories(id, name, icon),
            shop:shops(name, image_url),
            person:people!transactions_person_id_fkey(name)
          )
        `).eq('cycle_id', cycle.id).eq('transaction.account_id', acc.id).neq('transaction.status', 'void');
            if (entriesError) {
                console.error('[getCashbackProgress] Failed to load entries:', entriesError);
            }
            if (entries && entries.length > 0) {
                transactions = entries.map((e)=>{
                    const t = e.transaction;
                    if (!t) return null;
                    const category = t.category;
                    const shop = t.shop;
                    const person = t.person;
                    const txnAmount = Math.abs(t.amount);
                    // Use the spent amount from THIS cycle being viewed, not current cycle
                    const cycleSpentForPolicy = cycle?.spent_amount ?? 0;
                    const resolvedPolicy = resolveCashbackPolicy({
                        account: acc,
                        categoryId: category?.id,
                        amount: txnAmount,
                        cycleTotals: {
                            spent: cycleSpentForPolicy
                        },
                        categoryName: category?.name
                    });
                    const resolvedMetadata = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2d$policy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePolicyMetadata"])(resolvedPolicy.metadata);
                    // Always prefer fresh resolved metadata for display to fix stale policySource/rate issues
                    const policyMetadata = resolvedMetadata ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2d$policy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePolicyMetadata"])(e.metadata);
                    const policyRate = policyMetadata?.rate ?? 0; // Default rate from policy (e.g., 10%)
                    const sharePercent = t.cashback_share_percent ?? policyRate; // User's customized share (e.g., 8%)
                    const shareFixed = t.cashback_share_fixed ?? 0;
                    // Bank Back: What the bank gives back (policy rate), capped by rule maxReward or cycle maxBudget
                    let bankBack = txnAmount * policyRate;
                    const ruleMaxReward = policyMetadata?.ruleMaxReward ?? resolvedPolicy.maxReward ?? null;
                    const cycleMaxBudget = cycle?.max_budget ?? null;
                    // Apply cap from rule first, then from cycle budget
                    if (ruleMaxReward !== null && ruleMaxReward > 0) {
                        bankBack = Math.min(bankBack, ruleMaxReward);
                    }
                    if (cycleMaxBudget !== null && cycleMaxBudget > 0) {
                        // Note: In a multi-transaction scenario, this would need cumulative tracking.
                        // For now, we cap individual transaction to avoid exceeding cycle budget per transaction.
                        bankBack = Math.min(bankBack, cycleMaxBudget);
                    }
                    // People CB: What was shared with others
                    // If shareFixed is set, use it; otherwise calculate from sharePercent
                    const peopleBack = shareFixed > 0 ? shareFixed : txnAmount * sharePercent;
                    // Profit: Your profit (capped bank back minus share)
                    const profit = bankBack - peopleBack;
                    return {
                        id: t.id,
                        occurred_at: t.occurred_at,
                        note: t.note,
                        amount: t.amount,
                        earned: bankBack,
                        bankBack,
                        peopleBack,
                        profit,
                        effectiveRate: policyRate,
                        sharePercent: t.cashback_share_percent,
                        shareFixed: t.cashback_share_fixed,
                        shopName: shop?.name,
                        shopLogoUrl: shop?.image_url,
                        categoryName: category?.name,
                        categoryIcon: category?.icon,
                        categoryLogoUrl: category?.image_url,
                        personName: person?.name,
                        policyMetadata
                    };
                }).filter((t)=>t !== null).sort((a, b)=>new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
            }
        }
        // fallback logic for stats if cycle value is 0 but transactions exist
        let finalEarned = earnedSoFar;
        let finalShared = realAwarded;
        let finalNetProfit = virtualProfit - overflowLoss;
        if (transactions.length > 0 && finalEarned === 0 && finalNetProfit === 0) {
            // Aggregation seems to be missing, sum from transactions
            // Note: transactions array items have: earned, peopleBack, profit
            const sumEarned = transactions.reduce((acc, t)=>acc + (t.earned || 0), 0);
            const sumProfit = transactions.reduce((acc, t)=>acc + (t.profit || 0), 0);
            const sumShared = transactions.reduce((acc, t)=>acc + (t.peopleBack || 0), 0);
            if (sumEarned > 0) {
                finalEarned = sumEarned;
                finalShared = sumShared;
                finalNetProfit = sumProfit - overflowLoss;
            }
        }
        // Calculate totalGivenAway (Sum of (percent * amount) + fixed)
        const totalGivenAway = transactions.reduce((sum, t)=>{
            const sharePercent = parseFloat(t.sharePercent || '0'); // sharePercent in CashbackTransaction might be number | string? defined as number but data might be string from DB
            const shareFixed = parseFloat(t.shareFixed || '0');
            const txnAmount = Math.abs(t.amount);
            return sum + sharePercent * txnAmount + shareFixed;
        }, 0);
        results.push({
            accountId: acc.id,
            accountName: acc.name,
            accountLogoUrl: acc.image_url,
            cycleLabel: cycleTag,
            cycleStart: cycleRange?.start.toISOString() ?? null,
            cycleEnd: cycleRange?.end.toISOString() ?? null,
            cycleType: config.cycleType,
            progress,
            currentSpend,
            minSpend,
            maxCashback,
            totalEarned: finalEarned,
            sharedAmount: finalShared,
            netProfit: finalNetProfit,
            spendTarget: minSpend,
            minSpendMet: metMinSpend,
            minSpendRemaining: missingMinSpend,
            cycleOffset: monthOffset,
            min_spend_required: minSpend,
            total_spend_eligible: currentSpend,
            is_min_spend_met: metMinSpend,
            missing_min_spend: missingMinSpend,
            potential_earned: finalNetProfit,
            transactions,
            remainingBudget: remainingBudget,
            rate: policy.rate,
            totalGivenAway
        });
    }
    return results;
}
async function getTransactionCashbackPolicyExplanation(transactionId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('cashback_entries').select('metadata').eq('transaction_id', transactionId).maybeSingle();
    if (error) {
        console.error('Error fetching cashback policy explanation:', error);
        return null;
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2d$policy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePolicyMetadata"])(data?.metadata) ?? null;
}
async function simulateCashback(params) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { accountId, amount, categoryId, occurredAt } = params;
    const date = occurredAt ? new Date(occurredAt) : new Date();
    // 1. Get Account Config
    const { data: account } = await supabase.from('accounts').select('id, name, cashback_config, type').eq('id', accountId).eq('id', accountId).single();
    if (!account || account.type !== 'credit_card') {
        return {
            rate: 0,
            estimatedReward: 0,
            metadata: null
        };
    }
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(account.cashback_config, accountId);
    const cycleRange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleRange"])(config, date);
    const tagDate = cycleRange?.end ?? date;
    const cycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatIsoCycleTag"])(tagDate);
    const legacyCycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["formatLegacyCycleTag"])(tagDate);
    // 2. Get Current Cycle Totals (Read-Only)
    // We need to find the correct cycle to know the 'spent_amount' so far.
    let spentSoFar = 0;
    if (cycleTag) {
        let cycle = (await supabase.from('cashback_cycles').select('spent_amount').eq('account_id', accountId).eq('cycle_tag', cycleTag).maybeSingle()).data ?? null;
        if (!cycle && legacyCycleTag !== cycleTag) {
            cycle = (await supabase.from('cashback_cycles').select('spent_amount').eq('account_id', accountId).eq('cycle_tag', legacyCycleTag).maybeSingle()).data ?? null;
        }
        spentSoFar = cycle?.spent_amount ?? 0;
    }
    // 3. Resolve Policy
    const { resolveCashbackPolicy } = await __turbopack_context__.A("[project]/src/services/cashback/policy-resolver.ts [app-route] (ecmascript, async loader)");
    // Fetch Category Name if ID provided (for pretty reason text)
    let categoryName = undefined;
    if (categoryId) {
        const { data: cat } = await supabase.from('categories').select('name').eq('id', categoryId).single();
        categoryName = cat?.name;
    }
    const policy = resolveCashbackPolicy({
        account,
        categoryId,
        amount,
        cycleTotals: {
            spent: spentSoFar
        },
        categoryName
    });
    const estimatedReward = amount * policy.rate;
    // Apply Rule Max Reward Cap if exists
    const finalReward = policy.maxReward !== undefined && policy.maxReward !== null ? Math.min(estimatedReward, policy.maxReward) : estimatedReward;
    return {
        rate: policy.rate,
        estimatedReward: finalReward,
        metadata: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2d$policy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePolicyMetadata"])(policy.metadata),
        maxReward: policy.maxReward,
        isCapped: finalReward < estimatedReward
    };
}
async function getAllCashbackHistory(accountId) {
    const supabase = createAdminClient();
    const { data: account } = await supabase.from('accounts').select('id, name, image_url, cashback_config').eq('id', accountId).single();
    if (!account) return null;
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(account.cashback_config, accountId);
    const { data: cycles } = await supabase.from('cashback_cycles').select('*').eq('account_id', accountId);
    const totalEarned = (cycles ?? []).reduce((sum, c)=>sum + (c.real_awarded ?? 0) + (c.virtual_profit ?? 0), 0);
    const totalShared = (cycles ?? []).reduce((sum, c)=>sum + (c.real_awarded ?? 0), 0);
    const totalNet = (cycles ?? []).reduce((sum, c)=>sum + (c.virtual_profit ?? 0) - (c.overflow_loss ?? 0), 0);
    const sumMaxBudget = (cycles ?? []).reduce((sum, c)=>sum + (c.max_budget ?? 0), 0);
    let transactions = [];
    const { data: entries, error: entriesError } = await supabase.from('cashback_entries').select('mode, amount, metadata, transaction_id, cycle_id, cycle:cashback_cycles(cycle_tag), transaction:transactions!inner(id, occurred_at, note, amount, account_id, cashback_share_percent, cashback_share_fixed, category:categories(name, icon), shop:shops(name, image_url), person:people!transactions_person_id_fkey(name))').eq('transaction.account_id', accountId).neq('transaction.status', 'void');
    if (!entriesError && entries && entries.length > 0) {
        transactions = entries.map((e)=>{
            const t = e.transaction;
            if (!t) return null;
            return {
                id: t.id,
                occurred_at: t.occurred_at,
                note: t.note,
                amount: t.amount,
                earned: e.amount,
                bankBack: e.amount,
                peopleBack: e.mode === 'real' ? e.amount : 0,
                profit: e.mode === 'virtual' ? e.amount : 0,
                effectiveRate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2d$policy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePolicyMetadata"])(e.metadata)?.rate ?? 0,
                sharePercent: t.cashback_share_percent,
                shareFixed: t.cashback_share_fixed,
                shopName: t.shop?.name,
                shopLogoUrl: t.shop?.image_url,
                categoryName: t.category?.name,
                categoryIcon: t.category?.icon,
                categoryLogoUrl: t.category?.image_url,
                personName: t.person?.name,
                policyMetadata: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2d$policy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePolicyMetadata"])(e.metadata),
                cycleTag: e.cycle?.cycle_tag
            };
        }).filter((t)=>t !== null).sort((a, b)=>new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    }
    // Calculate totalGivenAway (Sum of (percent * amount) + fixed)
    const totalGivenAway = transactions.reduce((sum, t)=>{
        const sharePercent = parseFloat(t.sharePercent || '0');
        const shareFixed = parseFloat(t.shareFixed || '0');
        const txnAmount = Math.abs(t.amount);
        return sum + sharePercent * txnAmount + shareFixed;
    }, 0);
    return {
        accountId: account.id,
        accountName: account.name,
        accountLogoUrl: account.image_url,
        cycleLabel: 'ALL TIME',
        cycleStart: null,
        cycleEnd: null,
        cycleType: null,
        progress: sumMaxBudget > 0 ? totalEarned / sumMaxBudget * 100 : 0,
        currentSpend: 0,
        minSpend: 0,
        maxCashback: sumMaxBudget > 0 ? sumMaxBudget : null,
        totalEarned,
        sharedAmount: totalShared,
        netProfit: totalNet,
        spendTarget: 0,
        minSpendMet: true,
        minSpendRemaining: 0,
        cycleOffset: 0,
        min_spend_required: 0,
        total_spend_eligible: 0,
        is_min_spend_met: true,
        missing_min_spend: 0,
        potential_earned: totalNet,
        transactions,
        remainingBudget: sumMaxBudget > 0 ? Math.max(0, sumMaxBudget - totalEarned) : null,
        rate: 0,
        totalGivenAway
    };
}
async function recomputeAccountCashback(accountId, monthsBack) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Fetch posted expense/debt transactions for this account
    let query = supabase.from('transactions').select('*').eq('account_id', accountId).neq('status', 'void').in('type', [
        'expense',
        'debt'
    ]);
    if (typeof monthsBack === 'number') {
        const cutOff = new Date();
        cutOff.setMonth(cutOff.getMonth() - monthsBack);
        cutOff.setDate(1);
        cutOff.setHours(0, 0, 0, 0);
        query = query.gte('occurred_at', cutOff.toISOString());
    }
    const { data: txns } = await query;
    if (!txns) {
        return;
    }
    // 2. Re-process each transaction
    // Sequential processing to ensure cycle totals are updated correctly
    for (const rawTxn of txns){
        const txn = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$transaction$2d$mapper$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapUnifiedTransaction"])(rawTxn, accountId);
        // Force clear the tag to trigger recalculation in upsertTransactionCashback
        const cleanTxn = {
            ...txn,
            persisted_cycle_tag: null
        };
        await upsertTransactionCashback(cleanTxn);
    }
}
async function getCashbackCycleOptions(accountId, limit = 12) {
    const supabase = createAdminClient();
    // PHASE 3: Detect PB vs SB account ID
    const isPBAccountId = accountId && accountId.length === 15;
    // Try to fetch from Supabase first
    const { data: cycles, error: cyclesError } = await supabase.from('cashback_cycles').select('cycle_tag').eq('account_id', accountId).limit(48);
    let account = null;
    let cashbackConfig = null;
    if (isPBAccountId) {
        // PHASE 3: Query PocketBase for account config
        console.log('[getCashbackCycleOptions] Detected PB account, fetching from PB API');
        const PB_API_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://api-db.reiwarden.io.vn';
        try {
            const response = await fetch(`${PB_API_URL}/api/collections/pvl_acc_001/records/${accountId}`, {
                cache: 'no-store'
            });
            if (response.ok) {
                const pbAccount = await response.json();
                cashbackConfig = pbAccount.cashback_config;
                account = {
                    cashback_config: cashbackConfig
                };
                console.log('[getCashbackCycleOptions] PB account config loaded:', {
                    accountId,
                    hasConfig: !!cashbackConfig,
                    statementDay: cashbackConfig?.program?.statementDay
                });
            }
        } catch (error) {
            console.error('[getCashbackCycleOptions] Failed to fetch PB account:', error);
        }
    } else {
        // Query Supabase for SB accounts
        const { data: sbAccount } = await supabase.from('accounts').select('cashback_config').eq('id', accountId).single();
        account = sbAccount;
        cashbackConfig = sbAccount?.cashback_config;
    }
    const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(cashbackConfig, accountId);
    const currentCycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleTag"])(new Date(), {
        statementDay: config.statementDay,
        cycleType: config.cycleType
    });
    const existingTags = new Set((cycles ?? []).map((c)=>c.cycle_tag));
    const options = [
        ...cycles ?? []
    ];
    // FALLBACK: If no cycles found and account has cashback config, generate fallback cycles
    // This handles new PocketBase accounts that may not have cashback_cycles entry yet
    if ((!cycles || cycles.length === 0) && cashbackConfig) {
        console.warn(`[getCashbackCycleOptions] No cycles in DB for ${accountId}, generating fallback cycles`);
        // Inject current cycle at minimum
        if (currentCycleTag && !existingTags.has(currentCycleTag)) {
            options.unshift({
                cycle_tag: currentCycleTag
            });
            // Also add a few past cycles for reference
            const pastCycleTags = [];
            for(let i = 1; i <= 3; i++){
                const pastDate = new Date();
                pastDate.setMonth(pastDate.getMonth() - i);
                const pastTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleTag"])(pastDate, {
                    statementDay: config.statementDay,
                    cycleType: config.cycleType
                });
                if (pastTag && !existingTags.has(pastTag)) {
                    pastCycleTags.push({
                        cycle_tag: pastTag
                    });
                }
            }
            options.push(...pastCycleTags);
        }
    } else if (currentCycleTag && !existingTags.has(currentCycleTag)) {
        // Original behavior: Inject current cycle if missing
        options.unshift({
            cycle_tag: currentCycleTag
        });
    }
    // Helper to get sortable value from tag
    const getSortValue = (tag)=>{
        const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCycleTag"])(tag);
        return parsed ? parsed.year * 100 + parsed.month : 0;
    };
    // Sort chronologically (descending)
    options.sort((a, b)=>getSortValue(b.cycle_tag) - getSortValue(a.cycle_tag));
    return options.map((c)=>{
        const tag = c.cycle_tag;
        let label = tag;
        // Reverse engineer date from tag to build label
        const parsed = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCycleTag"])(tag);
        if (parsed) {
            const monthIdx = parsed.month - 1;
            const year = parsed.year;
            if (config.cycleType === 'statement_cycle' && config.statementDay) {
                const end = new Date(year, monthIdx, config.statementDay - 1);
                const start = new Date(year, monthIdx - 1, config.statementDay);
                const fmt = (val)=>`${String(val.getDate()).padStart(2, '0')}.${String(val.getMonth() + 1).padStart(2, '0')}`;
                label = `${fmt(start)} - ${fmt(end)}`;
            } else {
                label = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    year: 'numeric'
                }).format(new Date(year, monthIdx, 1));
            }
        }
        // Add (Current) label for current cycle
        if (tag === currentCycleTag) {
            label += ' (Current)';
        }
        return {
            tag,
            label,
            cycleType: config.cycleType,
            statementDay: config.statementDay
        };
    });
}
async function getCashbackYearAnalytics(year) {
    const supabase = createAdminClient();
    // 1. Get credit cards and debt accounts (for volunteer/loans)
    const { data: cards, error: cardError } = await supabase.from('accounts').select('id, name, annual_fee, type').eq('type', 'credit_card').eq('is_active', true);
    if (cardError || !cards) {
        console.error('[getCashbackYearAnalytics] Failed to fetch cards:', cardError);
        return [];
    }
    const cardIds = cards.map((c)=>c.id);
    console.log(`[getCashbackYearAnalytics] Found ${cardIds.length} cards/debt-accounts:`, cards.map((c)=>`${c.name} (${c.type})`).join(', '));
    if (cardIds.length === 0) return [];
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31T23:59:59`;
    // 2. Batch Fetch Transactions (Single Query)
    const { data: allTxns } = await supabase.from('transactions').select(`
        id, amount, occurred_at, type, category_id, account_id, cashback_mode,
        cashback_entries ( amount )
      `).in('account_id', cardIds).gte('occurred_at', startDate).lte('occurred_at', endDate).neq('status', 'void');
    // 3. Batch Fetch Redeemed (Income 'Hoàn tiền (Cashback)')
    const { data: allRedeemed } = await supabase.from('transactions').select('amount, account_id').in('account_id', cardIds).gte('occurred_at', startDate).lte('occurred_at', endDate).neq('status', 'void').eq('type', 'income').eq('category_id', 'e0000000-0000-0000-0000-000000000092');
    const results = [];
    const { computeCardCashbackProfit } = await __turbopack_context__.A("[project]/src/lib/analytics-utils.ts [app-route] (ecmascript, async loader)");
    for (const card of cards){
        // A. Filter Data in Memory
        const cardTxns = (allTxns || []).filter((t)=>t.account_id === card.id);
        const cardRedeemedTxns = (allRedeemed || []).filter((t)=>t.account_id === card.id);
        const monthsData = {};
        for(let m = 1; m <= 12; m++)monthsData[m] = {
            spend: 0,
            given: 0
        };
        cardTxns.forEach((t)=>{
            const date = new Date(t.occurred_at);
            const month = date.getMonth() + 1;
            // DEBUG: Log transaction processing
            // if (t.type === 'debt') console.log(`[CashbackAnalytics] Processing DEBT txn: ${t.id} Amount: ${t.amount} Account: ${t.account_id}`);
            // Track cashback GIVEN AWAY to people (not the lent amount itself)
            // Calculate: (cashback_share_percent * amount) + cashback_share_fixed
            if (t.type === 'debt') {
                const sharePercent = parseFloat(t.cashback_share_percent || '0');
                const shareFixed = parseFloat(t.cashback_share_fixed || '0');
                const txnAmount = Math.abs(t.amount);
                const cashbackGivenAway = sharePercent * txnAmount + shareFixed;
                monthsData[month].spend += cashbackGivenAway;
            }
            // Sum cashback entries for this transaction
            if (t.cashback_entries && t.cashback_entries.length > 0) {
                // Fix: Shared Return should ONLY count Voluntary (Shared) cashback.
                // Previously it summed ALL cashback (including real/bank).
                const given = t.cashback_entries.filter((e)=>e.mode === 'voluntary').reduce((sum, e)=>sum + (e.amount || 0), 0);
                monthsData[month].given += given;
            }
        });
        const monthsArray = Object.entries(monthsData).map(([m, val])=>({
                month: Number(m),
                totalGivenAway: val.spend,
                cashbackGiven: val.given
            }));
        const cashbackGivenYearTotal = monthsArray.reduce((sum, m)=>sum + m.cashbackGiven, 0);
        const cashbackRedeemedYearTotal = cardRedeemedTxns.reduce((sum, t)=>sum + Math.abs(t.amount || 0), 0);
        const annualFeeYearTotal = card.annual_fee || 0;
        const interestYearTotal = 0;
        const netProfit = computeCardCashbackProfit({
            cashbackRedeemed: cashbackRedeemedYearTotal,
            cashbackGiven: cashbackGivenYearTotal,
            annualFee: annualFeeYearTotal,
            interest: interestYearTotal
        });
        results.push({
            cardId: card.id,
            cardType: card.type,
            year,
            months: monthsArray,
            cashbackRedeemedYearTotal,
            annualFeeYearTotal,
            interestYearTotal,
            cashbackGivenYearTotal,
            netProfit
        });
    }
    return results.sort((a, b)=>b.netProfit - a.netProfit);
}
async function getMonthlyCashbackTransactions(cardId, month, year) {
    const supabase = createAdminClient();
    // Construct start/end dates for the month
    const startDate = new Date(year, month - 1, 1).toISOString();
    // End date is start of next month (handling Dec rollover)
    const endDate = new Date(year, month, 1).toISOString();
    // Fetch transactions with cashback entries
    const { data: txns, error } = await supabase.from('transactions').select(`
      id, occurred_at, note, amount, type, 
      cashback_share_percent, cashback_share_fixed,
      category:categories(name, icon),
      cashback_entries ( amount, mode, metadata )
    `).eq('account_id', cardId).gte('occurred_at', startDate).lt('occurred_at', endDate).neq('status', 'void') // Exclude void
    .in('type', [
        'debt'
    ]) // Track money given to people (debt), not personal expenses
    .order('occurred_at', {
        ascending: false
    });
    if (error) {
        console.error('getMonthlyCashbackTransactions error:', error);
        return [];
    }
    return (txns || []).map((t)=>{
        const given = (t.cashback_entries || []).reduce((sum, e)=>sum + (e.amount || 0), 0);
        return {
            ...t,
            cashbackGiven: given
        };
    });
}
async function getAccountCycles(accountId) {
    // Check if accountId is a valid UUID before querying Supabase
    // PocketBase IDs are base32 (15 chars alphanumeric), Supabase are UUIDs (36 chars with dashes)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId);
    if (!isUuid) {
        // For PocketBase accounts, cycles will be empty until Phase 3-4 migration
        console.warn(`[getAccountCycles] Skipping Supabase query for non-UUID account: ${accountId} (likely PocketBase ID)`);
        return [];
    }
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('cashback_cycles').select('id, cycle_tag, spent_amount, real_awarded, virtual_profit, min_spend_target, max_budget, is_exhausted, met_min_spend').eq('account_id', accountId).order('cycle_tag', {
        ascending: false
    });
    if (error) {
        console.error('[getAccountCycles] Error fetching account cycles:', {
            accountId,
            message: error.message,
            code: error.code
        });
    }
    return data || [];
}
async function getTransactionsForCycle(cycleId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // Use direct relations instead of legacy line items to fix missing relation error
    // Explicitly select person name
    const { data: entries, error: entriesError } = await supabase.from('cashback_entries').select(`
      mode, amount, metadata, transaction_id,
      transaction:transactions!inner (
        id, occurred_at, note, amount, account_id,
        cashback_share_percent, cashback_share_fixed,
        category:categories(name, icon),
        shop:shops(name, image_url),
        person:people!transactions_person_id_fkey(name)
      )
    `).eq('cycle_id', cycleId).neq('transaction.status', 'void');
    if (entriesError || !entries) {
        console.error('[getTransactionsForCycle] Failed to load entries:', entriesError);
        return [];
    }
    const { resolveCashbackPolicy } = await __turbopack_context__.A("[project]/src/services/cashback/policy-resolver.ts [app-route] (ecmascript, async loader)");
    return entries.map((e)=>{
        const t = e.transaction;
        if (!t) return null;
        const category = t.category;
        const shop = t.shop;
        const person = t.person;
        const bankBack = e.amount;
        const peopleBack = e.mode === 'real' ? e.amount : 0;
        const profit = e.mode === 'virtual' ? e.amount : 0;
        const policyMetadata = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2d$policy$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizePolicyMetadata"])(e.metadata);
        const effectiveRate = policyMetadata?.rate ?? 0;
        return {
            id: t.id,
            occurred_at: t.occurred_at,
            note: t.note,
            amount: t.amount,
            earned: bankBack,
            bankBack,
            peopleBack,
            profit,
            effectiveRate,
            sharePercent: t.cashback_share_percent,
            shareFixed: t.cashback_share_fixed,
            shopName: shop?.name,
            shopLogoUrl: shop?.image_url,
            categoryName: category?.name,
            categoryIcon: category?.icon,
            categoryLogoUrl: category?.image_url,
            personName: person?.name,
            policyMetadata
        };
    }).filter((t)=>t !== null);
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    upsertTransactionCashback,
    recomputeCashbackCycle,
    removeTransactionCashback,
    getAccountSpendingStats,
    getCashbackProgress,
    getTransactionCashbackPolicyExplanation,
    simulateCashback,
    getAllCashbackHistory,
    recomputeAccountCashback,
    getCashbackCycleOptions,
    getCashbackYearAnalytics,
    getMonthlyCashbackTransactions,
    getAccountCycles,
    getTransactionsForCycle
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(upsertTransactionCashback, "4094f5f65c4acf761b03da43f81626d6b09eba060a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(recomputeCashbackCycle, "608a169e59ba824b727000825d1b82a2669853c6af", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(removeTransactionCashback, "40c5672320ad800e56bf9bf98241e772e98a1a4381", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getAccountSpendingStats, "783a70cf44ae00c310f54d9b3e449da12e45eb45ee", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getCashbackProgress, "7828ec98ab7c583284f4b4d11d5fab7d577f391dc7", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getTransactionCashbackPolicyExplanation, "402626fe641b4ec99576710a307d1281d2b0a783f5", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(simulateCashback, "40fe076bfa2e09bd8028a2184353cd4565c02a6dc6", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getAllCashbackHistory, "406ea6945ec88656b651adf5773ed63d2e8864da0d", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(recomputeAccountCashback, "604cdc836046747645919a841360f8b910f2ad3225", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getCashbackCycleOptions, "60d01b2eb160b2bd2140cf9dd716d15aa93cac495c", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getCashbackYearAnalytics, "40bbb8506a8d5b1bc176ebbb762b2b32fad8940429", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getMonthlyCashbackTransactions, "7001e29dd6019991352280661f171e3da0a4d56e25", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getAccountCycles, "406c85174d9c5b491948f26d9774379eaf122e16cc", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getTransactionsForCycle, "40047007613fa429b6ba135d87d91a0813ee731a10", null);
}),
"[project]/src/services/pocketbase/transaction.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * PocketBase Transaction Service
 * Phase 3: Transaction read migration to PB-first pattern
 * 
 * Key Features:
 * - Maps PB transaction schema to TransactionWithDetails
 * - Handles dual-ID bridge for account linking (PB base32 ↔ SB UUID)
 * - Preserves all business logic (void, refund, split bills)
 * - Compatible with existing transaction service layer
 * 
 * Note: This is a utility module, not a Server Actions module.
 * Functions here are called from other server-side code.
 */ __turbopack_context__.s([
    "buildAccountIdBridge",
    ()=>buildAccountIdBridge,
    "createPocketBaseTransaction",
    ()=>createPocketBaseTransaction,
    "deletePocketBaseTransaction",
    ()=>deletePocketBaseTransaction,
    "loadPocketBaseTransactions",
    ()=>loadPocketBaseTransactions,
    "mapPocketBaseTransactionRow",
    ()=>mapPocketBaseTransactionRow,
    "resolveAccountIdToPB",
    ()=>resolveAccountIdToPB,
    "updatePocketBaseTransaction",
    ()=>updatePocketBaseTransaction,
    "voidPocketBaseTransaction",
    ()=>voidPocketBaseTransaction
]);
const PB_API_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://api-db.reiwarden.io.vn';
const PB_TXN_COLLECTION = 'pvl_txn_001';
function buildPocketBaseMutationPayload(input) {
    const baseMetadata = input.metadata && typeof input.metadata === 'object' ? {
        ...input.metadata
    } : {};
    const metadata = {
        ...baseMetadata,
        persisted_cycle_tag: input.persisted_cycle_tag ?? null,
        cashback_mode: input.cashback_mode ?? null,
        cashback_share_percent: input.cashback_share_percent ?? null,
        cashback_share_fixed: input.cashback_share_fixed ?? null
    };
    return {
        date: input.occurred_at,
        description: input.note ?? '',
        amount: input.amount,
        final_price: input.final_price ?? input.amount,
        type: input.type,
        account_id: input.account_id,
        to_account_id: input.target_account_id ?? '',
        category_id: input.category_id ?? '',
        person_id: input.person_id ?? '',
        shop_id: input.shop_id ?? '',
        cashback_amount: 0,
        is_installment: Boolean(input.is_installment),
        parent_transaction_id: input.linked_transaction_id ?? '',
        metadata
    };
}
function mapPocketBaseTransactionRow(record) {
    // Extract metadata fields
    const metadata = record.metadata || {};
    const persistedCycleTag = metadata.persisted_cycle_tag || null;
    const cashbackMode = metadata.cashback_mode || null;
    const cashbackSharePercent = metadata.cashback_share_percent || null;
    const cashbackShareFixed = metadata.cashback_share_fixed || null;
    // Map PB fields to SB schema
    return {
        id: record.id,
        occurred_at: record.date,
        note: record.description || null,
        status: 'posted',
        tag: null,
        created_at: record.date,
        created_by: null,
        amount: record.amount,
        type: record.type,
        account_id: record.account_id || '',
        target_account_id: record.to_account_id || null,
        category_id: record.category_id || null,
        person_id: record.person_id || null,
        metadata: record.metadata,
        shop_id: record.shop_id || null,
        persisted_cycle_tag: persistedCycleTag,
        is_installment: record.is_installment || null,
        installment_plan_id: null,
        cashback_share_percent: cashbackSharePercent,
        cashback_share_fixed: cashbackShareFixed,
        cashback_share_amount: null,
        cashback_mode: cashbackMode,
        currency: 'VND',
        linked_transaction_id: record.parent_transaction_id || null,
        final_price: record.final_price || null,
        transaction_history: [],
        cashback_entries: record.cashback_amount > 0 ? [
            {
                amount: record.cashback_amount,
                mode: cashbackMode || 'unknown',
                metadata: null
            }
        ] : []
    };
}
async function loadPocketBaseTransactions(options) {
    // Build filter string
    const filters = [];
    if (options.transactionId) {
        filters.push(`id='${options.transactionId}'`);
    }
    if (options.accountId) {
        // Handle both direct match and transfer target
        filters.push(`(account_id='${options.accountId}' || to_account_id='${options.accountId}')`);
    }
    if (options.personId) {
        filters.push(`person_id='${options.personId}'`);
    }
    if (options.personIds && options.personIds.length > 0) {
        const personFilter = options.personIds.map((id)=>`person_id='${id}'`).join(' || ');
        filters.push(`(${personFilter})`);
    }
    if (options.categoryId) {
        filters.push(`category_id='${options.categoryId}'`);
    }
    if (options.shopId) {
        filters.push(`shop_id='${options.shopId}'`);
    }
    const filterParam = filters.length > 0 ? `&filter=${encodeURIComponent(filters.join(' && '))}` : '';
    const limitParam = options.limit ? `&perPage=${options.limit}` : '&perPage=500';
    const sortParam = '&sort=-date'; // Most recent first
    const url = `${PB_API_URL}/api/collections/${PB_TXN_COLLECTION}/records?${filterParam}${limitParam}${sortParam}`;
    console.log('[loadPocketBaseTransactions] Query start:', {
        accountId: options.accountId,
        transactionId: options.transactionId,
        personId: options.personId,
        categoryId: options.categoryId,
        shopId: options.shopId,
        includeVoided: options.includeVoided,
        filters,
        url
    });
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });
        if (!response.ok) {
            console.error('[loadPocketBaseTransactions] API error:', {
                status: response.status,
                statusText: response.statusText,
                url
            });
            return [];
        }
        const data = await response.json();
        const items = data.items || [];
        const filteredItems = options.includeVoided ? items : items.filter((item)=>item?.metadata?.status !== 'void');
        const sample = filteredItems.slice(0, 5).map((item)=>({
                id: item.id,
                account_id: item.account_id,
                to_account_id: item.to_account_id,
                type: item.type,
                date: item.date,
                metadata_status: item?.metadata?.status ?? null
            }));
        const directMatchCount = options.accountId ? filteredItems.filter((item)=>item.account_id === options.accountId || item.to_account_id === options.accountId).length : filteredItems.length;
        console.log('[loadPocketBaseTransactions] Fetched from PB:', {
            count: filteredItems.length,
            accountId: options.accountId,
            filters: filters.join(' && '),
            directMatchCount,
            sample
        });
        // Map PB records to FlatTransactionRow format
        return filteredItems.map(mapPocketBaseTransactionRow);
    } catch (error) {
        console.error('[loadPocketBaseTransactions] Fetch error:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            accountId: options.accountId
        });
        return [];
    }
}
async function buildAccountIdBridge() {
    const PB_API_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://api-db.reiwarden.io.vn';
    try {
        const response = await fetch(`${PB_API_URL}/api/collections/pvl_acc_001/records?perPage=500&fields=id,name,sb_account_id`, {
            cache: 'no-store'
        });
        if (!response.ok) {
            console.warn('[buildAccountIdBridge] Failed to fetch accounts from PB');
            return {
                pbToSb: new Map(),
                sbToPb: new Map(),
                bridges: []
            };
        }
        const data = await response.json();
        const items = data.items || [];
        const pbToSb = new Map();
        const sbToPb = new Map();
        const bridges = [];
        for (const item of items){
            if (item.sb_account_id && item.id) {
                pbToSb.set(item.id, item.sb_account_id);
                sbToPb.set(item.sb_account_id, item.id);
                bridges.push({
                    pb_id: item.id,
                    sb_id: item.sb_account_id,
                    name: item.name || 'Unknown'
                });
            }
        }
        console.log('[buildAccountIdBridge] Built bridge:', {
            totalAccounts: items.length,
            bridgedAccounts: bridges.length
        });
        return {
            pbToSb,
            sbToPb,
            bridges
        };
    } catch (error) {
        console.error('[buildAccountIdBridge] Error:', error);
        return {
            pbToSb: new Map(),
            sbToPb: new Map(),
            bridges: []
        };
    }
}
function resolveAccountIdToPB(accountId, bridge) {
    // Check if it's a UUID (SB ID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId);
    if (isUuid) {
        // Look up PB ID from SB ID
        const pbId = bridge.sbToPb.get(accountId);
        if (pbId) {
            console.log('[resolveAccountIdToPB] Resolved SB→PB:', {
                sbId: accountId,
                pbId
            });
            return pbId;
        }
    }
    // Already PB ID or not in bridge
    return accountId;
}
async function createPocketBaseTransaction(input) {
    try {
        const response = await fetch(`${PB_API_URL}/api/collections/${PB_TXN_COLLECTION}/records`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(buildPocketBaseMutationPayload(input)),
            cache: 'no-store'
        });
        if (!response.ok) {
            const body = await response.text();
            console.error('[createPocketBaseTransaction] API error:', {
                status: response.status,
                body
            });
            return null;
        }
        const created = await response.json();
        return created?.id ?? null;
    } catch (error) {
        console.error('[createPocketBaseTransaction] Failed:', error);
        return null;
    }
}
async function updatePocketBaseTransaction(id, input) {
    try {
        const response = await fetch(`${PB_API_URL}/api/collections/${PB_TXN_COLLECTION}/records/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(buildPocketBaseMutationPayload(input)),
            cache: 'no-store'
        });
        if (!response.ok) {
            const body = await response.text();
            console.error('[updatePocketBaseTransaction] API error:', {
                id,
                status: response.status,
                body
            });
            return false;
        }
        return true;
    } catch (error) {
        console.error('[updatePocketBaseTransaction] Failed:', {
            id,
            error
        });
        return false;
    }
}
async function deletePocketBaseTransaction(id) {
    try {
        const response = await fetch(`${PB_API_URL}/api/collections/${PB_TXN_COLLECTION}/records/${id}`, {
            method: 'DELETE',
            cache: 'no-store'
        });
        if (!response.ok) {
            const body = await response.text();
            console.error('[deletePocketBaseTransaction] API error:', {
                id,
                status: response.status,
                body
            });
            return false;
        }
        return true;
    } catch (error) {
        console.error('[deletePocketBaseTransaction] Failed:', {
            id,
            error
        });
        return false;
    }
}
async function voidPocketBaseTransaction(id) {
    try {
        const getResponse = await fetch(`${PB_API_URL}/api/collections/${PB_TXN_COLLECTION}/records/${id}`, {
            cache: 'no-store'
        });
        if (!getResponse.ok) {
            const body = await getResponse.text();
            console.error('[voidPocketBaseTransaction] Failed to fetch record:', {
                id,
                status: getResponse.status,
                body
            });
            return false;
        }
        const current = await getResponse.json();
        const metadata = {
            ...current?.metadata ?? {},
            status: 'void'
        };
        const patchResponse = await fetch(`${PB_API_URL}/api/collections/${PB_TXN_COLLECTION}/records/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                metadata
            }),
            cache: 'no-store'
        });
        if (!patchResponse.ok) {
            const body = await patchResponse.text();
            console.error('[voidPocketBaseTransaction] API error:', {
                id,
                status: patchResponse.status,
                body
            });
            return false;
        }
        return true;
    } catch (error) {
        console.error('[voidPocketBaseTransaction] Failed:', {
            id,
            error
        });
        return false;
    }
}
}),
"[project]/src/services/pocketbase/server.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generatePocketBaseId",
    ()=>generatePocketBaseId,
    "pocketbaseGetById",
    ()=>pocketbaseGetById,
    "pocketbaseList",
    ()=>pocketbaseList,
    "pocketbaseRequest",
    ()=>pocketbaseRequest,
    "toPocketBaseId",
    ()=>toPocketBaseId
]);
const PB_URL = 'https://api-db.reiwarden.io.vn';
let cachedPocketBaseToken = null;
async function getPocketBaseAuthHeaders() {
    const explicitToken = process.env.POCKETBASE_ADMIN_TOKEN || process.env.POCKETBASE_SERVICE_TOKEN || process.env.POCKETBASE_TOKEN || process.env.PB_ADMIN_TOKEN || process.env.PB_SERVICE_TOKEN || '';
    if (explicitToken) {
        return {
            Authorization: `Bearer ${explicitToken}`
        };
    }
    if (cachedPocketBaseToken) {
        return {
            Authorization: `Bearer ${cachedPocketBaseToken}`
        };
    }
    const identity = process.env.POCKETBASE_DB_EMAIL || '';
    const password = process.env.POCKETBASE_DB_PASSWORD || '';
    if (!identity || !password) {
        return {};
    }
    const authEndpoints = [
        '/api/admins/auth-with-password',
        '/api/collections/_superusers/auth-with-password'
    ];
    for (const endpoint of authEndpoints){
        try {
            const response = await fetch(`${PB_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identity,
                    password
                })
            });
            if (!response.ok) continue;
            const payload = await response.json();
            if (payload?.token) {
                cachedPocketBaseToken = payload.token;
                return {
                    Authorization: `Bearer ${payload.token}`
                };
            }
        } catch  {
        // try next endpoint
        }
    }
    return {};
}
function toQueryString(params) {
    if (!params) return '';
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)){
        if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
        }
    }
    const query = searchParams.toString();
    return query ? `?${query}` : '';
}
function normalizeBody(body) {
    if (body === undefined || body === null) return undefined;
    if (typeof body === 'string' || body instanceof URLSearchParams || body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
        return body;
    }
    return JSON.stringify(body);
}
async function pocketbaseRequest(endpoint, options) {
    const url = `${PB_URL}${endpoint}`;
    const authHeaders = await getPocketBaseAuthHeaders();
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...options?.headers ?? {}
        },
        body: normalizeBody(options?.body)
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`PB request failed [${response.status}]: ${text}`);
    }
    if (response.status === 204) {
        return undefined;
    }
    return await response.json();
}
async function pocketbaseList(collection, params) {
    const query = toQueryString(params);
    return pocketbaseRequest(`/api/collections/${collection}/records${query}`);
}
async function pocketbaseGetById(collection, id) {
    return pocketbaseRequest(`/api/collections/${collection}/records/${id}`);
}
function toPocketBaseId(supabaseId, _collection) {
    if (!supabaseId) return generatePocketBaseId();
    const hash = Array.from(supabaseId).reduce((acc, ch)=>(acc << 5) - acc + ch.charCodeAt(0), 0).toString(36).replace('-', 'n').slice(0, 15).padEnd(15, '0');
    return hash;
}
function generatePocketBaseId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for(let i = 0; i < 15; i++){
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}
}),
"[project]/src/services/transaction.service.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"4004b3d771cd928c5b516eb7aff4c95083b43c333c":"createTransaction","400a88f20bf30f6f06c315cf94022cc6e946fae46f":"calculateAccountImpacts","403a51a2485e8de416e2cb4ed86c1b2f2d98ea53f8":"getPendingRefunds","40422e5a7aadb88f96acb2962d4662de09aa8f21fe":"getSplitBillTransactions","405d1f12108736faa37f259b1e7e55874654e018b3":"voidTransaction","408068f59844d0c04f4faebd977ba62792477d4fad":"restoreTransaction","409dfc5c43b022b059ad20901bfc294512de41dd1e":"deleteTransaction","40b61f0b5e776d85f4f5e2b7a3d1d39a57c3a01bb9":"loadTransactions","40b845745cfbc65553cc4f76ed95503bc7b89cab41":"getRecentTransactions","40beacff9eff057aa473ae8f122926adf3b0903538":"deleteSplitBill","600ad868633e31a993c2212dd4047d1c8ea20dafa3":"mapTransactionRow","602b29b477e2d42c4cff9cb0098db2adec1affa574":"getTransactionsByPeople","602e497fd35dc62fb504e810a75e46d121d4be5326":"loadAccountTransactionsV2","603237b3166f006c9c1012fd8fdb8224d64dde780a":"confirmRefund","60585ef913515a77b6f813980e83a92edb2146182b":"normalizeAmountForType","607bf4394cf3d790ef12056caf03e6d568be4f1f46":"updateTransaction","60b725fee768334d86dd8a20cebb39cbd2ffdbf399":"updateSplitBillAmounts","60d38fc9c5aa0a5e5e36234e44cdef7f10e34441dd":"getTransactionsByShop","60d964676f3a7ae383b9892c4574877bf03d1d33da":"getUnifiedTransactions","60e1678baef340c2aa981daee046a0d20d28448ffb":"getTransactionById","60fa7a47b5026659905e6e82eccbd7779d83ca34d0":"bulkMoveToCategory","707c02904251b2edb8c31b1804e704b2ac8461ef6c":"requestRefund"},"",""] */ __turbopack_context__.s([
    "bulkMoveToCategory",
    ()=>bulkMoveToCategory,
    "calculateAccountImpacts",
    ()=>calculateAccountImpacts,
    "confirmRefund",
    ()=>confirmRefund,
    "createTransaction",
    ()=>createTransaction,
    "deleteSplitBill",
    ()=>deleteSplitBill,
    "deleteTransaction",
    ()=>deleteTransaction,
    "getPendingRefunds",
    ()=>getPendingRefunds,
    "getRecentTransactions",
    ()=>getRecentTransactions,
    "getSplitBillTransactions",
    ()=>getSplitBillTransactions,
    "getTransactionById",
    ()=>getTransactionById,
    "getTransactionsByPeople",
    ()=>getTransactionsByPeople,
    "getTransactionsByShop",
    ()=>getTransactionsByShop,
    "getUnifiedTransactions",
    ()=>getUnifiedTransactions,
    "loadAccountTransactionsV2",
    ()=>loadAccountTransactionsV2,
    "loadTransactions",
    ()=>loadTransactions,
    "mapTransactionRow",
    ()=>mapTransactionRow,
    "normalizeAmountForType",
    ()=>normalizeAmountForType,
    "requestRefund",
    ()=>requestRefund,
    "restoreTransaction",
    ()=>restoreTransaction,
    "updateSplitBillAmounts",
    ()=>updateSplitBillAmounts,
    "updateTransaction",
    ()=>updateTransaction,
    "voidTransaction",
    ()=>voidTransaction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/cache.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/month-tag.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$cashback$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/cashback.service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/cashback.ts [app-route] (ecmascript)");
// Phase 3: PocketBase transaction service
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$pocketbase$2f$transaction$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/pocketbase/transaction.service.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$pocketbase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/pocketbase/server.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
function isPocketBaseId(value) {
    return Boolean(value && value.length === 15);
}
async function resolveLegacySupabaseAccountId(pbAccountId) {
    try {
        const pbBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://api-db.reiwarden.io.vn';
        const pbResponse = await fetch(`${pbBaseUrl}/api/collections/pvl_acc_001/records/${pbAccountId}?fields=id,name,account_number,slug`, {
            cache: 'no-store'
        });
        if (!pbResponse.ok) {
            return null;
        }
        const pbAccount = await pbResponse.json();
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        const { data: candidates, error } = await supabase.from('accounts').select('id, name, account_number').limit(1000);
        if (error || !candidates || candidates.length === 0) {
            return null;
        }
        const accountNumber = String(pbAccount.account_number || '').trim();
        const slugPrefix = String(pbAccount.slug || '').trim().toLowerCase();
        const accountName = String(pbAccount.name || '').trim().toLowerCase();
        if (accountNumber) {
            const numberMatches = candidates.filter((row)=>String(row.account_number || '').trim() === accountNumber);
            if (numberMatches.length === 1) {
                return numberMatches[0].id;
            }
            const namedNumberMatch = numberMatches.find((row)=>String(row.name || '').trim().toLowerCase() === accountName);
            if (namedNumberMatch?.id) {
                return namedNumberMatch.id;
            }
        }
        if (slugPrefix) {
            const slugMatches = candidates.filter((row)=>String(row.id || '').toLowerCase().startsWith(slugPrefix));
            if (slugMatches.length === 1) {
                return slugMatches[0].id;
            }
            const namedSlugMatch = slugMatches.find((row)=>String(row.name || '').trim().toLowerCase() === accountName);
            if (namedSlugMatch?.id) {
                return namedSlugMatch.id;
            }
        }
        return null;
    } catch (error) {
        console.warn('[resolveLegacySupabaseAccountId] Failed:', {
            pbAccountId,
            error: error instanceof Error ? error.message : String(error)
        });
        return null;
    }
}
function normalizeTransactionText(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function buildTransactionFingerprint(input) {
    const timestamp = input.occurred_at ? new Date(input.occurred_at).getTime() : Number.NaN;
    const safeTimestamp = Number.isFinite(timestamp) ? timestamp : -1;
    const safeAmount = Math.round(Number(input.amount || 0));
    const safeType = String(input.type || '').toLowerCase();
    const safeNote = normalizeTransactionText(input.note);
    const safeCycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeMonthTag"])(input.persisted_cycle_tag || '') || String(input.persisted_cycle_tag || '');
    return `${safeTimestamp}|${safeAmount}|${safeType}|${safeNote}|${safeCycleTag}`;
}
function indexPocketBaseTransactionIds(rows) {
    const index = new Map();
    for (const row of rows){
        const key = buildTransactionFingerprint({
            occurred_at: row.occurred_at,
            amount: row.amount,
            type: row.type,
            note: row.note,
            persisted_cycle_tag: row.persisted_cycle_tag
        });
        const current = index.get(key) || [];
        current.push(row.id);
        index.set(key, current);
    }
    return index;
}
function resolveBaseType(type) {
    if (type === "repayment") return "income";
    if (type === "debt") return "expense";
    if (type === "credit_pay") return "transfer";
    if (type === "invest") return "transfer";
    if (type === "transfer") return "transfer";
    return type;
}
async function normalizeAmountForType(type, amount) {
    const baseType = resolveBaseType(type);
    const absolute = Math.round(Math.abs(amount));
    if (baseType === "income") return absolute;
    if (baseType === "transfer") return -absolute;
    return -absolute;
}
async function normalizeInput(input) {
    const baseType = resolveBaseType(input.type);
    const targetAccountId = input.target_account_id ?? input.destination_account_id ?? input.debt_account_id ?? null;
    if (input.type === "transfer" && !targetAccountId) {
        throw new Error("Transfer requires targetAccountId");
    }
    const normalizedAmount = await normalizeAmountForType(input.type, input.amount);
    const isInvest = input.type === "invest";
    const dbType = isInvest ? "transfer" : input.type;
    const modifiedMetadata = input.metadata ? {
        ...input.metadata
    } : {};
    if (isInvest) {
        modifiedMetadata.is_invest = true;
    } else if (modifiedMetadata && modifiedMetadata.is_invest) {
        // If we changed from invest to something else, remove the flag
        delete modifiedMetadata.is_invest;
    }
    return {
        occurred_at: input.occurred_at,
        note: input.note ?? null,
        status: "posted",
        tag: input.tag ?? null,
        created_by: null,
        amount: normalizedAmount,
        type: dbType,
        account_id: input.source_account_id,
        target_account_id: baseType === "transfer" ? targetAccountId : null,
        category_id: input.category_id ?? null,
        person_id: input.person_id ?? null,
        metadata: Object.keys(modifiedMetadata).length > 0 ? modifiedMetadata : null,
        shop_id: input.shop_id ?? null,
        persisted_cycle_tag: null,
        is_installment: Boolean(input.is_installment),
        installment_plan_id: input.installment_plan_id ?? null,
        cashback_share_percent: input.cashback_share_percent ?? null,
        cashback_share_fixed: input.cashback_share_fixed ?? null,
        cashback_mode: input.cashback_mode ?? null,
        linked_transaction_id: input.linked_transaction_id ?? null
    };
}
async function logHistory(transactionId, changeType, snapshot) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { error } = await supabase.from("transaction_history").insert({
        transaction_id: transactionId,
        change_type: changeType,
        snapshot_before: snapshot
    });
    if (error) {
        console.error("Failed to log transaction history:", error);
    }
}
async function calculateAccountImpacts(txn) {
    if (txn.status === "void") return {};
    const baseType = resolveBaseType(txn.type);
    const impacts = {};
    impacts[txn.account_id] = (impacts[txn.account_id] ?? 0) + txn.amount;
    if (baseType === "transfer" && txn.target_account_id) {
        impacts[txn.target_account_id] = (impacts[txn.target_account_id] ?? 0) + Math.abs(txn.amount);
    }
    return impacts;
}
async function recalcForAccounts(accountIds) {
    if (accountIds.size === 0) return;
    const { recalculateBalance } = await __turbopack_context__.A("[project]/src/services/account.service.ts [app-route] (ecmascript, async loader)");
    await Promise.all(Array.from(accountIds).map((id)=>recalculateBalance(id)));
}
async function fetchLookups(rows) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const accountIds = new Set();
    const categoryIds = new Set();
    const personIds = new Set();
    const shopIds = new Set();
    rows.forEach((row)=>{
        accountIds.add(row.account_id);
        if (row.target_account_id) accountIds.add(row.target_account_id);
        if (row.category_id) categoryIds.add(row.category_id);
        if (row.person_id) personIds.add(row.person_id);
        if (row.shop_id) shopIds.add(row.shop_id);
    });
    const [accountsRes, categoriesRes, peopleRes, shopsRes] = await Promise.all([
        accountIds.size ? supabase.from("accounts").select("id, name, image_url, type, owner_id, cashback_config").in("id", Array.from(accountIds)) : Promise.resolve({
            data: [],
            error: null
        }),
        categoryIds.size ? supabase.from("categories").select("id, name, type, image_url, icon").in("id", Array.from(categoryIds)) : Promise.resolve({
            data: [],
            error: null
        }),
        personIds.size ? supabase.from("people").select("id, name, image_url").in("id", Array.from(personIds)) : Promise.resolve({
            data: [],
            error: null
        }),
        shopIds.size ? supabase.from("shops").select("id, name, image_url").in("id", Array.from(shopIds)) : Promise.resolve({
            data: [],
            error: null
        })
    ]);
    const accounts = new Map();
    const categories = new Map();
    const people = new Map();
    const shops = new Map();
    (accountsRes.data ?? []).forEach((row)=>{
        if (!row?.id) return;
        accounts.set(row.id, {
            id: row.id,
            name: row.name,
            image_url: row.image_url ?? null,
            type: row.type ?? null,
            owner_id: row.owner_id ?? null,
            cashback_config: row.cashback_config ?? null
        });
    });
    (categoriesRes.data ?? []).forEach((row)=>{
        if (!row?.id) return;
        categories.set(row.id, {
            id: row.id,
            name: row.name,
            type: row.type,
            image_url: row.image_url ?? null,
            icon: row.icon ?? null
        });
    });
    (peopleRes.data ?? []).forEach((row)=>{
        if (!row?.id) return;
        people.set(row.id, {
            id: row.id,
            name: row.name,
            image_url: row.image_url ?? null
        });
    });
    (shopsRes.data ?? []).forEach((row)=>{
        if (!row?.id) return;
        shops.set(row.id, {
            id: row.id,
            name: row.name,
            image_url: row.image_url ?? null
        });
    });
    return {
        accounts,
        categories,
        people,
        shops
    };
}
async function mapTransactionRow(row, options) {
    const { lookups, contextAccountId } = options;
    const baseType = resolveBaseType(row.type);
    const account = lookups.accounts.get(row.account_id) ?? null;
    const target = row.target_account_id ? lookups.accounts.get(row.target_account_id) ?? null : null;
    const category = row.category_id ? lookups.categories.get(row.category_id) ?? null : null;
    const person = row.person_id ? lookups.people.get(row.person_id) ?? null : null;
    const shop = row.shop_id ? lookups.shops.get(row.shop_id) ?? null : null;
    // Fix Unknown: If transfer-like but NO destination (no target account AND no person),
    // force it to act like a simple income/expense so we don't show "Account -> Unknown"
    let effectiveBaseType = baseType;
    if (baseType === "transfer" && !row.target_account_id && !row.person_id) {
        effectiveBaseType = row.amount >= 0 ? "income" : "expense";
    }
    let displayAmount = row.amount;
    if (contextAccountId && effectiveBaseType === "transfer" && row.target_account_id === contextAccountId && row.account_id !== contextAccountId) {
        displayAmount = Math.abs(row.amount);
    }
    const displayType = effectiveBaseType === "transfer" ? row.target_account_id && contextAccountId === row.target_account_id ? "income" : "expense" : effectiveBaseType === "income" ? "income" : "expense";
    // Calculate Account Billing Cycle & Derived Tag
    let account_billing_cycle = null;
    let derived_cycle_tag = row.persisted_cycle_tag;
    if (account && account.cashback_config) {
        try {
            const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(account.cashback_config, account.id);
            // Calculate derived tag if missing
            if (!derived_cycle_tag) {
                derived_cycle_tag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleTag"])(new Date(row.occurred_at), {
                    statementDay: config.statementDay,
                    cycleType: config.cycleType
                });
            }
            const range = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleRange"])(config, new Date(row.occurred_at));
            if (range) {
                const startDay = String(range.start.getDate()).padStart(2, '0');
                const startMonth = String(range.start.getMonth() + 1).padStart(2, '0');
                const endDay = String(range.end.getDate()).padStart(2, '0');
                const endMonth = String(range.end.getMonth() + 1).padStart(2, '0');
                account_billing_cycle = `${startDay}-${startMonth} to ${endDay}-${endMonth}`;
            }
        } catch (e) {
        // ignore
        }
    }
    let effectiveRowType = row.type;
    if (row.type === "transfer" && row.metadata?.is_invest) {
        effectiveRowType = "invest";
    }
    return {
        ...row,
        type: effectiveRowType,
        tag: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeMonthTag"])(row.tag) ?? row.tag ?? null,
        amount: displayAmount,
        original_amount: Math.abs(row.amount),
        displayType,
        display_type: displayType === "income" ? "IN" : displayType === "expense" ? "OUT" : "TRANSFER",
        category_name: category?.name,
        category_icon: category?.icon ?? null,
        category_image_url: category?.image_url ?? null,
        account_name: account?.name,
        account_image_url: account?.image_url ?? null,
        source_name: account?.name ?? null,
        destination_name: target?.name ?? (person ? person.name : null),
        source_image: account?.image_url ?? null,
        destination_image: target?.image_url ?? null,
        person_name: person?.name ?? null,
        person_image_url: person?.image_url ?? null,
        shop_name: shop?.name ?? null,
        shop_image_url: shop?.image_url ?? null,
        persisted_cycle_tag: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["normalizeMonthTag"])(row.persisted_cycle_tag) ?? row.persisted_cycle_tag ?? null,
        installment_plan_id: row.installment_plan_id ?? null,
        is_installment: row.is_installment ?? null,
        created_by: row.created_by ?? null,
        cashback_share_percent: row.cashback_share_percent ?? null,
        cashback_share_fixed: row.cashback_share_fixed ?? null,
        cashback_mode: row.cashback_mode ?? null,
        currency: row.currency ?? null,
        final_price: row.final_price ?? null,
        history_count: row.transaction_history?.[0]?.count ?? 0,
        account_billing_cycle,
        derived_cycle_tag,
        // Cashback Analysis Fields
        bank_back: row.cashback_entries?.reduce((sum, entry)=>sum + (entry.amount || 0), 0) ?? 0,
        cashback_share_amount: (row.cashback_share_fixed ?? 0) + Math.abs(row.amount) * (row.cashback_share_percent ?? 0),
        profit: (row.cashback_entries?.reduce((sum, entry)=>sum + (entry.amount || 0), 0) ?? 0) - ((row.cashback_share_fixed ?? 0) + Math.abs(row.amount) * (row.cashback_share_percent ?? 0))
    };
}
async function loadTransactions(options) {
    // PHASE 3: Smart routing based on account ID format
    // - PB account ID (15 chars base32) → Query PB only
    // - SB account ID (36 chars UUID) → Query SB only
    // - No account ID → Query both and merge
    const isPBAccountId = options.accountId && options.accountId.length === 15;
    const isSBAccountId = options.accountId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.accountId);
    console.log('[loadTransactions] Phase 3 routing:', {
        accountId: options.accountId,
        isPBAccountId,
        isSBAccountId,
        context: options.context
    });
    // If PB account ID, try PB first
    if (isPBAccountId) {
        console.log('[loadTransactions] Routing to PB (PB account ID detected)');
        const pbRows = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$pocketbase$2f$transaction$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loadPocketBaseTransactions"])(options);
        console.log('[loadTransactions] PB raw rows result:', {
            accountId: options.accountId,
            rowCount: pbRows.length,
            sample: pbRows.slice(0, 5).map((row)=>({
                    id: row.id,
                    account_id: row.account_id,
                    target_account_id: row.target_account_id,
                    type: row.type,
                    occurred_at: row.occurred_at
                }))
        });
        if (pbRows.length > 0) {
            const lookups = await fetchLookups(pbRows);
            const mapped = await Promise.all(pbRows.map((row)=>mapTransactionRow(row, {
                    lookups,
                    contextAccountId: options.accountId,
                    contextMode: options.context ?? "general"
                })));
            console.log('[loadTransactions] PB results:', {
                count: mapped.length
            });
            return mapped;
        }
        const legacySupabaseId = await resolveLegacySupabaseAccountId(options.accountId);
        if (legacySupabaseId) {
            console.warn('[loadTransactions] PB returned empty, falling back via legacy SB mapping:', {
                pbAccountId: options.accountId,
                legacySupabaseId
            });
            const fallbackMapped = await loadTransactions({
                ...options,
                accountId: legacySupabaseId
            });
            if (fallbackMapped.length > 0) {
                let pbIdIndex = new Map();
                let pbRowsById = new Map();
                try {
                    const allPbRows = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$pocketbase$2f$transaction$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["loadPocketBaseTransactions"])({
                        includeVoided: options.includeVoided,
                        limit: options.limit ?? 2000
                    });
                    pbIdIndex = indexPocketBaseTransactionIds(allPbRows);
                    pbRowsById = new Map(allPbRows.map((row)=>[
                            row.id,
                            row
                        ]));
                } catch (error) {
                    console.warn('[loadTransactions] Failed to build PB ID index for fallback remap:', {
                        pbAccountId: options.accountId,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
                let matchedPbIdCount = 0;
                const pbFieldBackfills = [];
                const remapped = fallbackMapped.map((tx)=>{
                    const fingerprint = buildTransactionFingerprint({
                        occurred_at: tx.occurred_at,
                        amount: tx.amount,
                        type: tx.type,
                        note: tx.note,
                        persisted_cycle_tag: tx.persisted_cycle_tag
                    });
                    const pbCandidates = pbIdIndex.get(fingerprint) || [];
                    const resolvedPbId = pbCandidates.length === 1 ? pbCandidates[0] : null;
                    if (resolvedPbId) {
                        matchedPbIdCount += 1;
                    }
                    const mappedAccountId = tx.account_id === legacySupabaseId ? options.accountId : tx.account_id;
                    const mappedTargetAccountId = tx.target_account_id === legacySupabaseId ? options.accountId : tx.target_account_id;
                    const nextMetadata = tx.metadata && typeof tx.metadata === 'object' ? {
                        ...tx.metadata
                    } : {};
                    if (resolvedPbId) {
                        const pbRow = pbRowsById.get(resolvedPbId);
                        if (pbRow) {
                            const payload = {};
                            if (!pbRow.account_id && mappedAccountId) payload.account_id = mappedAccountId;
                            if (!pbRow.target_account_id && mappedTargetAccountId) payload.to_account_id = mappedTargetAccountId;
                            if (!pbRow.category_id && tx.category_id) payload.category_id = tx.category_id;
                            if (!pbRow.shop_id && tx.shop_id) payload.shop_id = tx.shop_id;
                            if (!pbRow.person_id && tx.person_id) payload.person_id = tx.person_id;
                            if (Object.keys(payload).length > 0) {
                                pbFieldBackfills.push({
                                    id: resolvedPbId,
                                    payload
                                });
                            }
                        }
                    }
                    return {
                        ...tx,
                        id: resolvedPbId || tx.id,
                        metadata: resolvedPbId ? {
                            ...nextMetadata,
                            legacy_supabase_id: tx.id
                        } : tx.metadata,
                        account_id: mappedAccountId,
                        target_account_id: mappedTargetAccountId
                    };
                });
                if (pbFieldBackfills.length > 0) {
                    const pbBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://api-db.reiwarden.io.vn';
                    const uniqueBackfills = Array.from(new Map(pbFieldBackfills.map((item)=>[
                            item.id,
                            item
                        ])).values());
                    const results = await Promise.allSettled(uniqueBackfills.map(async (item)=>{
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$pocketbase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pocketbaseRequest"])(`/api/collections/pvl_txn_001/records/${item.id}`, {
                            method: 'PATCH',
                            body: item.payload,
                            cache: 'no-store'
                        });
                        return {
                            ok: true
                        };
                    }));
                    const successCount = results.filter((result)=>result.status === 'fulfilled').length;
                    const failureDetails = results.filter((result)=>result.status === 'rejected').slice(0, 3).map((result)=>{
                        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
                        return {
                            message
                        };
                    });
                    console.log('[loadTransactions] PB field backfill from legacy mapping:', {
                        requested: uniqueBackfills.length,
                        successCount,
                        pbAccountId: options.accountId,
                        failureDetails
                    });
                }
                console.log('[loadTransactions] Legacy SB fallback returned rows:', {
                    count: remapped.length,
                    matchedPbIdCount,
                    pbAccountId: options.accountId,
                    legacySupabaseId
                });
                return remapped;
            }
        }
        console.log('[loadTransactions] PB returned empty and legacy fallback not found');
        return [];
    }
    // If SB account ID or no specific account, query Supabase
    console.log('[loadTransactions] Routing to SB (UUID detected or general query)');
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    let query = supabase.from("transactions").select("id, occurred_at, note, status, tag, created_at, created_by, amount, type, account_id, target_account_id, category_id, person_id, metadata, shop_id, persisted_cycle_tag, is_installment, installment_plan_id, cashback_share_percent, cashback_share_fixed, cashback_mode, final_price, transaction_history(count), cashback_entries(amount, mode, metadata)").order("occurred_at", {
        ascending: false
    });
    if (!options.includeVoided) {
        query = query.neq("status", "void");
    }
    if (options.transactionId) {
        query = query.eq("id", options.transactionId);
    } else {
        if (options.personIds && options.personIds.length > 0) {
            query = query.in("person_id", options.personIds);
        } else if (options.personId) {
            query = query.eq("person_id", options.personId);
        } else if (options.accountId) {
            query = query.or(`account_id.eq.${options.accountId},target_account_id.eq.${options.accountId}`);
        }
    }
    if (options.shopId) {
        query = query.eq("shop_id", options.shopId);
    }
    if (options.categoryId) {
        query = query.eq("category_id", options.categoryId);
    }
    if (options.installmentPlanId) {
        query = query.eq("installment_plan_id", options.installmentPlanId);
    }
    if (options.limit) {
        query = query.limit(options.limit);
    }
    const { data, error } = await query;
    if (error) {
        console.error("[loadTransactions] SB Query error:", {
            message: error?.message || 'Unknown error',
            code: error?.code || 'UNKNOWN',
            details: error?.details,
            hint: error?.hint,
            accountId: options.accountId,
            context: options.context
        });
        return [];
    }
    if (!data) {
        console.warn("[loadTransactions] SB: No data returned (empty result set)", {
            accountId: options.accountId,
            context: options.context,
            limit: options.limit
        });
        return [];
    }
    const rows = data;
    const lookups = await fetchLookups(rows);
    const mapped = await Promise.all(rows.map((row)=>mapTransactionRow(row, {
            lookups,
            contextAccountId: options.accountId,
            contextMode: options.context ?? "general"
        })));
    console.log('[loadTransactions] SB results:', {
        count: mapped.length
    });
    return mapped;
}
async function createTransaction(input) {
    try {
        const normalized = await normalizeInput(input);
        if (isPocketBaseId(normalized.account_id)) {
            let pbConfig = null;
            const pbBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'https://api-db.reiwarden.io.vn';
            try {
                const response = await fetch(`${pbBaseUrl}/api/collections/pvl_acc_001/records/${normalized.account_id}`, {
                    cache: 'no-store'
                });
                if (response.ok) {
                    const pbAccount = await response.json();
                    pbConfig = pbAccount?.cashback_config ?? null;
                }
            } catch (pbConfigError) {
                console.warn('[createTransaction] Failed to fetch PB account config:', pbConfigError);
            }
            if (pbConfig) {
                const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(pbConfig, normalized.account_id);
                const cycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleTag"])(new Date(normalized.occurred_at), config);
                if (cycleTag) {
                    normalized.persisted_cycle_tag = cycleTag;
                }
            }
            const pbType = normalized.type === 'credit_pay' || normalized.type === 'invest' ? 'transfer' : normalized.type;
            const pbTransactionId = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$pocketbase$2f$transaction$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createPocketBaseTransaction"])({
                occurred_at: normalized.occurred_at,
                note: normalized.note,
                amount: normalized.amount,
                type: pbType,
                account_id: normalized.account_id,
                target_account_id: normalized.target_account_id,
                category_id: normalized.category_id,
                person_id: normalized.person_id,
                shop_id: normalized.shop_id,
                metadata: normalized.metadata,
                is_installment: Boolean(normalized.is_installment),
                linked_transaction_id: normalized.linked_transaction_id,
                persisted_cycle_tag: normalized.persisted_cycle_tag,
                cashback_mode: normalized.cashback_mode,
                cashback_share_percent: normalized.cashback_share_percent,
                cashback_share_fixed: normalized.cashback_share_fixed,
                final_price: normalized.final_price
            });
            if (!pbTransactionId) {
                return null;
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/accounts");
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/people");
            if (input.person_id) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${input.person_id}`);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${input.person_id}/details`);
            }
            return pbTransactionId;
        }
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        // Auto-calculate cycle tag
        const { data: accConfig } = await supabase.from('accounts').select('cashback_config').eq('id', normalized.account_id).single();
        if (accConfig?.cashback_config) {
            const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(accConfig.cashback_config);
            const cycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleTag"])(new Date(normalized.occurred_at), config);
            if (cycleTag) {
                normalized.persisted_cycle_tag = cycleTag;
            }
        }
        const { data, error } = await supabase.from("transactions").insert(normalized).select().single();
        if (error || !data) {
            console.error("Error creating transaction:", error);
            return null;
        }
        const transactionId = data.id ?? null;
        const affectedAccounts = new Set();
        affectedAccounts.add(normalized.account_id);
        if (normalized.target_account_id) affectedAccounts.add(normalized.target_account_id);
        await recalcForAccounts(affectedAccounts);
        // SHEET SYNC: Auto-sync to Google Sheets when person_id exists
        if (transactionId && input.person_id) {
            try {
                const { syncTransactionToSheet } = await __turbopack_context__.A("[project]/src/services/sheet.service.ts [app-route] (ecmascript, async loader)");
                // Fetch shop name for payload
                let shopName = null;
                if (input.shop_id) {
                    const { data: shop } = await supabase.from("shops").select("name").eq("id", input.shop_id).single();
                    shopName = shop?.name ?? null;
                }
                // Fallback for Repayment/Income/Transfer if shop is empty -> Use Account Name
                if (!shopName) {
                    if (input.note?.toLowerCase().startsWith('rollover') || input.category_id === '71e71711-83e5-47ba-8ff5-85590f45a70c') {
                        shopName = 'Rollover';
                    } else {
                        const { data: acc } = await supabase.from("accounts").select("name").eq("id", input.source_account_id).single();
                        shopName = acc?.name ?? 'Bank';
                    }
                }
                // Calculate final amount (for debt: amount - cashback)
                const originalAmount = Math.abs(input.amount);
                // DB stores decimal (0.05). Input to this func came from Form which ALREADY divided by 100.
                // Wait, looking at Form:
                // form.onSubmit: payload.cashback_share_percent = rawPercent / 100;
                // So 'input.cashback_share_percent' IS ALREADY DECIMAL (e.g. 0.05).
                const decimalRate = Number(input.cashback_share_percent ?? 0);
                const fixedAmount = Math.max(0, Number(input.cashback_share_fixed ?? 0));
                const cashback = originalAmount * decimalRate + fixedAmount;
                const finalAmount = input.type === "debt" ? originalAmount - cashback : originalAmount;
                const syncPayload = {
                    id: transactionId,
                    occurred_at: input.occurred_at,
                    note: input.note,
                    tag: input.tag,
                    shop_name: shopName,
                    amount: finalAmount,
                    original_amount: originalAmount,
                    cashback_share_percent: decimalRate,
                    cashback_share_fixed: fixedAmount,
                    type: [
                        'repayment',
                        'income'
                    ].includes(input.type) ? "In" : "Debt"
                };
                void syncTransactionToSheet(input.person_id, syncPayload, "create").catch((err)=>{
                    console.error("[Sheet Sync] Create entry failed:", err);
                });
            } catch (syncError) {
                console.error("[Sheet Sync] Import or sync failed:", syncError);
            }
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/accounts");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/people");
        if (input.person_id) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${input.person_id}`);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${input.person_id}/details`);
        }
        // CASHBACK INTEGRATION
        if (transactionId) {
            // Re-fetch the transaction with category details for cashback logic
            // Using direct re-fetch instead of loadTransactions to avoid recursion/overhead
            try {
                const [txn] = await loadTransactions({
                    transactionId: transactionId
                });
                if (txn) {
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$cashback$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["upsertTransactionCashback"])(txn);
                }
            } catch (cbError) {
                console.error("Failed to upsert cashback entry:", cbError);
            }
        }
        // INSTALLMENT INTEGRATION: Process Monthly Payment
        const meta = normalized.metadata;
        if (meta && meta.installment_id) {
            try {
                const { processMonthlyPayment } = await __turbopack_context__.A("[project]/src/services/installment.service.ts [app-route] (ecmascript, async loader)");
                await processMonthlyPayment(meta.installment_id, Math.abs(normalized.amount));
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/installments");
            } catch (instError) {
                console.error("Failed to process installment payment:", instError);
            }
        }
        // Phase 7X: Auto-Settle Installment
        if (normalized.installment_plan_id) {
            __turbopack_context__.A("[project]/src/services/installment.service.ts [app-route] (ecmascript, async loader)").then(({ checkAndAutoSettleInstallment })=>{
                checkAndAutoSettleInstallment(normalized.installment_plan_id);
            });
        }
        return transactionId;
    } catch (error) {
        console.error("Unhandled error in createTransaction:", error);
        return null;
    }
}
async function updateTransaction(id, input) {
    if (isPocketBaseId(id)) {
        let normalizedPb;
        try {
            normalizedPb = await normalizeInput(input);
        } catch (err) {
            console.error("Invalid PB transaction input:", err);
            return false;
        }
        const pbType = normalizedPb.type === 'credit_pay' || normalizedPb.type === 'invest' ? 'transfer' : normalizedPb.type;
        const updated = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$pocketbase$2f$transaction$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["updatePocketBaseTransaction"])(id, {
            occurred_at: normalizedPb.occurred_at,
            note: normalizedPb.note,
            amount: normalizedPb.amount,
            type: pbType,
            account_id: normalizedPb.account_id,
            target_account_id: normalizedPb.target_account_id,
            category_id: normalizedPb.category_id,
            person_id: normalizedPb.person_id,
            shop_id: normalizedPb.shop_id,
            metadata: normalizedPb.metadata,
            is_installment: Boolean(normalizedPb.is_installment),
            linked_transaction_id: normalizedPb.linked_transaction_id,
            persisted_cycle_tag: normalizedPb.persisted_cycle_tag,
            cashback_mode: normalizedPb.cashback_mode,
            cashback_share_percent: normalizedPb.cashback_share_percent,
            cashback_share_fixed: normalizedPb.cashback_share_fixed,
            final_price: normalizedPb.final_price
        });
        if (!updated) {
            return false;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/accounts");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/people");
        if (input.person_id) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${input.person_id}`);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${input.person_id}/details`);
        }
        return true;
    }
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // Fetch existing transaction INCLUDING person_id for sheet sync
    const { data: existing, error: fetchError } = await supabase.from("transactions").select("id, occurred_at, note, tag, account_id, target_account_id, person_id, amount, type, shop_id, cashback_share_percent, cashback_share_fixed, metadata, status").eq("id", id).maybeSingle();
    if (fetchError || !existing) {
        console.error("Failed to load transaction before update:", fetchError);
        return false;
    }
    // 1. GUARD: Check for dependent transactions (Refund Chain)
    // Prevent editing if this transaction is a parent
    // Check linked_transaction_id column
    const { data: linkedChildren } = await supabase.from("transactions").select("id").neq("status", "void").eq("linked_transaction_id", id).limit(1);
    if (linkedChildren && linkedChildren.length > 0) {
        console.warn("Blocking update: Has linked dependent transactions.");
        return false;
    }
    // Check metadata references
    const meta = existing?.metadata || {};
    if (meta.has_refund_request) {
        console.warn("Blocking update: Transaction has a refund request.");
        return false;
    }
    // Phase 75: Batch constraints
    if (meta.type === 'batch_funding' || meta.type === 'batch_funding_additional') {
        throw new Error(`BATCH_LOCKED:${meta.batch_id}`);
    }
    let normalized;
    try {
        normalized = await normalizeInput(input);
    } catch (err) {
        console.error("Invalid transaction input:", err);
        return false;
    }
    if (!normalized) {
        console.error("Invalid input for transaction update");
        return false;
    }
    // Auto-calculate cycle tag
    const { data: accConfig } = await supabase.from('accounts').select('cashback_config').eq('id', normalized.account_id).single();
    if (accConfig?.cashback_config) {
        const config = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCashbackConfig"])(accConfig.cashback_config);
        const cycleTag = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$cashback$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getCashbackCycleTag"])(new Date(normalized.occurred_at), config);
        if (cycleTag) {
            normalized.persisted_cycle_tag = cycleTag;
        }
    }
    // LOG HISTORY BEFORE UPDATE
    await logHistory(id, "edit", existing);
    console.log(`[Service] Updating transaction ${id}...`);
    const { error } = await supabase.from("transactions").update(normalized).eq("id", id);
    if (error) {
        console.error(`[Service] Failed to update transaction ${id}:`, error);
        return false;
    }
    console.log(`[Service] Transaction ${id} updated successfully in DB.`);
    const affectedAccounts = new Set();
    if (existing.account_id) affectedAccounts.add(existing.account_id);
    if (existing.target_account_id) affectedAccounts.add(existing.target_account_id);
    affectedAccounts.add(normalized.account_id);
    if (normalized.target_account_id) affectedAccounts.add(normalized.target_account_id);
    await recalcForAccounts(affectedAccounts);
    const oldPersonId = existing.person_id;
    const newPersonId = input.person_id;
    // SHEET SYNC: Auto-sync to Google Sheets when person_id exists
    try {
        const { syncTransactionToSheet } = await __turbopack_context__.A("[project]/src/services/sheet.service.ts [app-route] (ecmascript, async loader)");
        console.log("[Sheet Sync] updateTransaction sync triggered", {
            id,
            oldPersonId,
            newPersonId,
            samePerson: oldPersonId === newPersonId
        });
        // SHEET SYNC: Smart cycle-aware sync
        // - If cycle changed: Full sync both old and new cycles
        // - If same cycle: Fast single-row update
        if (oldPersonId && newPersonId && oldPersonId === newPersonId) {
            console.log("[Sheet Sync] Updating existing entry for person:", newPersonId);
            // Fetch shop name for payload
            let shopName = null;
            if (input.shop_id) {
                const { data: shop } = await supabase.from("shops").select("name").eq("id", input.shop_id).single();
                shopName = shop?.name ?? null;
            }
            // Fallback for Repayment/Income/Transfer if shop is empty -> Use Account Name
            if (!shopName) {
                if (input.note?.toLowerCase().startsWith('rollover') || input.category_id === '71e71711-83e5-47ba-8ff5-85590f45a70c') {
                    shopName = 'Rollover';
                } else {
                    const { data: acc } = await supabase.from("accounts").select("name").eq("id", input.source_account_id).single();
                    shopName = acc?.name ?? 'Bank';
                }
            }
            // Calculate final amount
            const originalAmount = Math.abs(input.amount);
            const decimalRate = Number(input.cashback_share_percent ?? 0);
            const fixedAmount = Math.max(0, Number(input.cashback_share_fixed ?? 0));
            const cashback = originalAmount * decimalRate + fixedAmount;
            const finalAmount = input.type === "debt" ? originalAmount - cashback : originalAmount;
            // Extract cycle tags from dates
            const oldDate = new Date(existing.occurred_at);
            const newDate = new Date(input.occurred_at);
            const oldCycle = `${oldDate.getFullYear()}-${String(oldDate.getMonth() + 1).padStart(2, '0')}`;
            const newCycle = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
            const cycleChanged = oldCycle !== newCycle;
            console.log("[Sheet Sync] Cycle check:", {
                oldCycle,
                newCycle,
                cycleChanged
            });
            if (cycleChanged) {
                // CYCLE CHANGED: Full sync both cycles
                console.log("[Sheet Sync] Cycle changed - triggering full sync for both cycles");
                const { syncCycleTransactions } = await __turbopack_context__.A("[project]/src/services/sheet.service.ts [app-route] (ecmascript, async loader)");
                // Sync old cycle (remove this transaction)
                try {
                    await syncCycleTransactions(newPersonId, oldCycle);
                    console.log(`[Sheet Sync] Synced old cycle: ${oldCycle}`);
                } catch (err) {
                    console.error(`[Sheet Sync] Failed to sync old cycle ${oldCycle}:`, err);
                }
                // Sync new cycle (add this transaction)
                try {
                    await syncCycleTransactions(newPersonId, newCycle);
                    console.log(`[Sheet Sync] Synced new cycle: ${newCycle}`);
                } catch (err) {
                    console.error(`[Sheet Sync] Failed to sync new cycle ${newCycle}:`, err);
                }
            } else {
                // SAME CYCLE: Fast single-row update
                console.log("[Sheet Sync] Same cycle - using fast single-row update");
                const updatePayload = {
                    id,
                    occurred_at: input.occurred_at,
                    note: input.note,
                    tag: input.tag,
                    shop_name: shopName,
                    amount: finalAmount,
                    original_amount: originalAmount,
                    cashback_share_percent: decimalRate,
                    cashback_share_fixed: fixedAmount,
                    type: [
                        'repayment',
                        'income'
                    ].includes(input.type) ? "In" : "Debt"
                };
                try {
                    await syncTransactionToSheet(newPersonId, updatePayload, "update");
                    console.log("[Sheet Sync] Single-row update completed");
                } catch (err) {
                    console.error("[Sheet Sync] Update entry failed:", err);
                }
            }
        } else {
            // Logic for DIFFERENT person (or one added/removed): Delete Old -> Create New
            // 1. Delete old entry if existed
            if (oldPersonId) {
                console.log("[Sheet Sync] Deleting old entry for person:", oldPersonId);
                const deletePayload = {
                    id: existing.id,
                    occurred_at: existing.occurred_at,
                    note: existing.note,
                    tag: existing.tag,
                    amount: existing.amount ?? 0
                };
                try {
                    await syncTransactionToSheet(oldPersonId, deletePayload, "delete");
                    console.log("[Sheet Sync] Delete completed");
                } catch (err) {
                    console.error("[Sheet Sync] Delete old entry failed:", err);
                }
            }
            // 2. Create new entry if exists (AFTER delete)
            if (newPersonId) {
                console.log("[Sheet Sync] Creating new entry for person:", newPersonId);
                let shopName = null;
                if (input.shop_id) {
                    const { data: shop } = await supabase.from("shops").select("name").eq("id", input.shop_id).single();
                    shopName = shop?.name ?? null;
                }
                const originalAmount = Math.abs(input.amount);
                const decimalRate = Number(input.cashback_share_percent ?? 0);
                const fixedAmount = Math.max(0, Number(input.cashback_share_fixed ?? 0));
                const cashback = originalAmount * decimalRate + fixedAmount;
                const finalAmount = input.type === "debt" ? originalAmount - cashback : originalAmount;
                const createPayload = {
                    id,
                    occurred_at: input.occurred_at,
                    note: input.note,
                    tag: input.tag,
                    shop_name: shopName,
                    amount: finalAmount,
                    original_amount: originalAmount,
                    cashback_share_percent: decimalRate,
                    cashback_share_fixed: fixedAmount,
                    type: input.type === "repayment" ? "In" : "Debt"
                };
                try {
                    await syncTransactionToSheet(newPersonId, createPayload, "create");
                    console.log("[Sheet Sync] Create new entry completed");
                } catch (err) {
                    console.error("[Sheet Sync] Create new entry failed:", err);
                }
            }
        }
    } catch (sheetError) {
        console.error("[Sheet Sync] Overall error:", sheetError);
    }
    // CASHBACK INTEGRATION (Update)
    try {
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        const { data: rawTxn } = await supabase.from("transactions").select("*, categories(name)").eq("id", id).single();
        if (rawTxn) {
            const txnShape = {
                ...rawTxn,
                category_name: rawTxn.categories?.name
            };
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$cashback$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["upsertTransactionCashback"])(txnShape);
        }
    } catch (cbError) {
        console.error("Failed to update cashback entry:", cbError);
    }
    // Phase 7X: Auto-Settle Installment (Update)
    if (normalized.installment_plan_id) {
        // We should also check the OLD plan if changed? 
        // For now just check current.
        __turbopack_context__.A("[project]/src/services/installment.service.ts [app-route] (ecmascript, async loader)").then(({ checkAndAutoSettleInstallment })=>{
            checkAndAutoSettleInstallment(normalized.installment_plan_id);
        });
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/accounts");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/people");
    if (input.person_id) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${input.person_id}`);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${input.person_id}/details`);
    }
    return true;
}
async function deleteTransaction(id) {
    if (isPocketBaseId(id)) {
        const deleted = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$pocketbase$2f$transaction$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deletePocketBaseTransaction"])(id);
        if (!deleted) {
            return false;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/accounts");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/people");
        return true;
    }
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // Fetch existing transaction INCLUDING person_id for sheet sync and installment_plan_id for auto-settle
    const { data: existing, error: fetchError } = await supabase.from("transactions").select("account_id, target_account_id, person_id, installment_plan_id, metadata, status").eq("id", id).maybeSingle();
    if (fetchError || !existing) return false;
    // 1. GUARD: Check for dependent transactions (Refund Chain)
    // Prevent deleting if this transaction is a parent (e.g. Original of a Request, or Request of a Confirmation)
    // Check linked_transaction_id column (used by Confirmation -> Request)
    const { data: linkedChildren } = await supabase.from("transactions").select("id").neq("status", "void").eq("linked_transaction_id", id).limit(1);
    if (linkedChildren && linkedChildren.length > 0) {
        // If we are deleting a Request (Tx 2), and a Confirmation (Tx 3) exists (linked by ID), block it.
        console.warn("Blocking delete: Has linked dependent transactions.");
        return false;
    // Ideally we throw error, but function returns boolean. 
    // UI `handleSingleDeleteConfirm` checks return value. 
    // To show error message, we might need to change signature or handle upstream.
    // For now, returning false triggers "Failed to delete transaction" message.
    }
    // Check metadata references (Original -> Request)
    const meta = existing?.metadata || {};
    if (meta.has_refund_request) {
        // This is Tx 1, and Tx 2 exists.
        // We should really check if Tx 2 is still valid (not void/deleted), but assuming flag is accurate:
        console.warn("Blocking delete: Transaction has a refund request.");
        return false;
    }
    // 2. ROLLBACK LOGIC (Maintain Consistency when deleting Leaf Nodes)
    // Case A: Deleting Confirmation (GD3) -> Revert Pending Refund (GD2) to 'waiting_refund' (or 'pending')
    if (meta.is_refund_confirmation && meta.pending_refund_id) {
        console.log(`[deleteTransaction] Deleting Confirmation ${id}. Reverting Pending ${meta.pending_refund_id} status.`);
        await supabase.from("transactions").update({
            status: "waiting_refund"
        }).eq("id", meta.pending_refund_id);
        // Also revert Original Transaction (GD1) if it was marked as 'refunded'
        if (meta.original_transaction_id) {
            await supabase.from("transactions").update({
                status: "waiting_refund"
            }).eq("id", meta.original_transaction_id).eq("status", "refunded");
        }
    }
    // Case B: Deleting Refund Request (GD2) -> Revert Original (GD1) to 'posted' & Clear Metadata
    // Only if NOT a confirmation (which also has original_id)
    if (meta.original_transaction_id && !meta.is_refund_confirmation) {
        const { data: linkedReview } = await supabase.from('transactions').select('id, status').eq('linked_transaction_id', id).maybeSingle();
        if (linkedReview && linkedReview.status !== 'void') {
            // This should be caught by GUARD above, but double check.
            return false;
        }
        console.log(`[deleteTransaction] Deleting Request ${id}. Cleaning Original ${meta.original_transaction_id}.`);
        const { data: gd1 } = await supabase.from("transactions").select("metadata").eq("id", meta.original_transaction_id).single();
        if (gd1) {
            const newMeta = {
                ...gd1.metadata || {}
            };
            delete newMeta.refund_status;
            delete newMeta.refunded_amount;
            delete newMeta.has_refund_request;
            delete newMeta.refund_request_id;
            await supabase.from("transactions").update({
                status: "posted",
                metadata: newMeta
            }).eq("id", meta.original_transaction_id);
        }
    }
    // CASHBACK INTEGRATION: Remove BEFORE deleting transaction to avoid FK constraint violations
    // If removal fails, this will throw and prevent the transaction deletion
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$cashback$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["removeTransactionCashback"])(id);
    } catch (cbError) {
        console.error("Failed to remove cashback entries - blocking delete to prevent FK violation:", cbError);
        // Return false instead of throwing - UI expects boolean return
        return false;
    }
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
        console.error("Error deleting transaction:", error);
        return false;
    }
    const affected = new Set();
    if (existing?.account_id) affected.add(existing.account_id);
    if (existing?.target_account_id) affected.add(existing.target_account_id);
    await recalcForAccounts(affected);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/accounts");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/people");
    if (existing?.person_id) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${existing.person_id}`);
    }
    // Phase 7X: Auto-Settle Installment (Delete)
    if (existing?.installment_plan_id) {
        __turbopack_context__.A("[project]/src/services/installment.service.ts [app-route] (ecmascript, async loader)").then(({ checkAndAutoSettleInstallment })=>{
            checkAndAutoSettleInstallment(existing.installment_plan_id);
        });
    }
    return true;
}
async function voidTransaction(id) {
    if (isPocketBaseId(id)) {
        const voided = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$pocketbase$2f$transaction$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["voidPocketBaseTransaction"])(id);
        if (!voided) {
            return false;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/accounts");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/people");
        return true;
    }
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: existing } = await supabase.from("transactions").select("account_id, target_account_id, metadata, status, person_id").eq("id", id).maybeSingle();
    // 1. Guard: Check for children (linked transactions) - STRICT CHECK
    // We must prevent voiding if this transaction is a parent of another active transaction.
    // This includes:
    // - linked_transaction_id column pointing to this ID (used by some refund flows)
    // - Being 'original_transaction_id' of a Refund Request (GD2) in metadata
    // - Being 'pending_refund_id' of a Refund Confirmation (GD3) in metadata
    // First check linked_transaction_id column directly
    const { data: linkedChildren } = await supabase.from("transactions").select("id, status").neq("status", "void").eq("linked_transaction_id", id).limit(1);
    if (linkedChildren && linkedChildren.length > 0) {
        throw new Error("Không thể hủy giao dịch này vì đã có giao dịch liên quan (VD: Đã xác nhận tiền về). Vui lòng hủy giao dịch nối tiếp trước.");
    }
    // Also check metadata fields using contains filter (for JSONB)
    const { data: metaChildren } = await supabase.from("transactions").select("id, status, metadata").neq("status", "void").or(`metadata.cs.{"original_transaction_id":"${id}"},metadata.cs.{"pending_refund_id":"${id}"}`).limit(1);
    if (metaChildren && metaChildren.length > 0) {
        throw new Error("Không thể hủy giao dịch này vì đã có giao dịch liên quan (VD: Đã xác nhận tiền về). Vui lòng hủy giao dịch nối tiếp trước.");
    }
    // Phase 75: Batch constraints
    const batchMeta = existing?.metadata || {};
    if (batchMeta.type === 'batch_funding' || batchMeta.type === 'batch_funding_additional') {
        throw new Error(`BATCH_LOCKED:${batchMeta.batch_id}`);
    }
    // 2. Log History
    await logHistory(id, "void", existing);
    // 3. Rollback Logic (Refund Chain)
    const meta = existing?.metadata || {};
    // Case A: Voiding Confirmation (GD3) -> Revert Pending Refund (GD2) to 'pending'
    if (meta.is_refund_confirmation && meta.pending_refund_id) {
        await supabase.from("transactions").update({
            status: "pending"
        }).eq("id", meta.pending_refund_id);
    }
    // Case B: Voiding Refund Request (GD2) -> Revert Original (GD1) to 'posted' & Clear Metadata
    // Only if NOT a confirmation (which also has original_id)
    if (meta.original_transaction_id && !meta.is_refund_confirmation) {
        const { data: gd1 } = await supabase.from("transactions").select("metadata").eq("id", meta.original_transaction_id).single();
        if (gd1) {
            const newMeta = {
                ...gd1.metadata || {}
            };
            delete newMeta.refund_status;
            delete newMeta.refunded_amount;
            delete newMeta.has_refund_request;
            delete newMeta.refund_request_id;
            await supabase.from("transactions").update({
                status: "posted",
                metadata: newMeta
            }).eq("id", meta.original_transaction_id);
        }
    }
    // Simplified Void: Just update status. No need to join lines which might be complex or deleted.
    const { error } = await supabase.from("transactions").update({
        status: "void"
    }).eq("id", id);
    if (error) {
        console.error("Failed to void transaction:", error);
        return false;
    }
    const affected = new Set();
    if (existing?.account_id) affected.add(existing.account_id);
    if (existing?.target_account_id) affected.add(existing.target_account_id);
    // Also try to trigger sync delete to sheet if possible, but service method might not have full context.
    // The ACTION layer handles sheet sync better. Service is low-level.
    await recalcForAccounts(affected);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/accounts");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/people");
    if (existing?.person_id) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${existing.person_id}`);
    }
    // CASHBACK INTEGRATION
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$cashback$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["removeTransactionCashback"])(id);
    } catch (cbError) {
        console.error("Failed to remove cashback entry (void):", cbError);
    }
    // BATCH INTEGRATION: Revert batch item if exists
    try {
        // Dynamic import to avoid circular dependency if any
        const { revertBatchItem } = await __turbopack_context__.A("[project]/src/services/batch.service.ts [app-route] (ecmascript, async loader)");
        await revertBatchItem(id);
    } catch (batchError) {
        console.error("Failed to revert batch item (void):", batchError);
    }
    return true;
}
async function restoreTransaction(id) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: existing } = await supabase.from("transactions").select("account_id, target_account_id, person_id").eq("id", id).maybeSingle();
    const { error } = await supabase.from("transactions").update({
        status: "posted"
    }).eq("id", id);
    if (error) {
        console.error("Failed to restore transaction:", error);
        return false;
    }
    const affected = new Set();
    if (existing?.account_id) affected.add(existing.account_id);
    if (existing?.target_account_id) affected.add(existing.target_account_id);
    await recalcForAccounts(affected);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/accounts");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/people");
    if (existing?.person_id) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])(`/people/${existing.person_id}`);
    }
    // CASHBACK INTEGRATION (Restore)
    try {
        const { data: rawTxn } = await supabase.from("transactions").select("*, categories(name)").eq("id", id).single();
        if (rawTxn) {
            const txnShape = {
                ...rawTxn,
                category_name: rawTxn.categories?.name
            };
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$cashback$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["upsertTransactionCashback"])(txnShape);
        }
    } catch (cbError) {
        console.error("Failed to restore cashback entry:", cbError);
    }
    return true;
}
async function getRecentTransactions(limit = 10) {
    return loadTransactions({
        limit
    });
}
async function getTransactionById(transactionId, includeVoided = true) {
    if (!transactionId) return null;
    const rows = await loadTransactions({
        transactionId,
        includeVoided,
        limit: 1
    });
    return rows[0] ?? null;
}
async function getTransactionsByShop(shopId, limit = 50) {
    return loadTransactions({
        shopId,
        limit
    });
}
async function getTransactionsByPeople(personIds, limit = 1000) {
    if (!personIds.length) return [];
    return loadTransactions({
        personIds,
        limit,
        context: "person"
    });
}
async function getUnifiedTransactions(accountOrOptions, limitArg = 50) {
    const parsed = typeof accountOrOptions === "object" && accountOrOptions !== null ? accountOrOptions : {
        accountId: accountOrOptions,
        limit: limitArg
    };
    return loadTransactions({
        accountId: parsed.accountId,
        personId: parsed.personId,
        limit: parsed.limit ?? limitArg,
        context: parsed.context,
        includeVoided: parsed.includeVoided
    });
}
async function requestRefund(transactionId, amount, isPartial) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Fetch original transaction to get metadata
    const { data: originalTxn, error: fetchError } = await supabase.from("transactions").select("*").eq("id", transactionId).single();
    if (fetchError || !originalTxn) {
        return {
            success: false,
            error: "Original transaction not found"
        };
    }
    const originalRow = originalTxn;
    const originalMeta = originalRow.metadata || {};
    // 1a. Format Note (GD2) - No prefix ID, badges show ID separately
    const shortId = originalRow.id.split("-")[0].toUpperCase();
    let formattedNote = `Refund Request: ${originalRow.note ?? ""}`;
    // If original was debt (had person_id), append Cancel Debt info
    if (originalRow.person_id) {
        // Fetch person name if possible, or just append generic.
        // We can try to fetch, or just accept that we might not have name handy here without extra query.
        // But wait, we can do a quick lookup if we want, or just "Cancel Debt".
        // "Cancel Debt: ${PersonName}" was requested.
        const { data: person } = await supabase.from("profiles").select("name").eq("id", originalRow.person_id).single();
        if (person) {
            formattedNote += ` - Cancel Debt: ${person.name}`;
        }
    }
    // 2. Create Refund Transaction (Income)
    // Park in PENDING_REFUNDS account initially
    // GD2: Pending Refund
    const refundTransaction = {
        occurred_at: new Date().toISOString(),
        amount: Math.abs(amount),
        type: "income",
        account_id: "99999999-9999-9999-9999-999999999999",
        category_id: "e0000000-0000-0000-0000-000000000095",
        note: formattedNote,
        status: "pending",
        metadata: {
            original_transaction_id: transactionId,
            original_account_id: originalRow.account_id,
            refund_type: isPartial ? "partial" : "full",
            original_note: originalRow.note
        },
        created_by: null
    };
    const { data: newRefund, error } = await supabase.from("transactions").insert(refundTransaction).select().single();
    if (error || !newRefund) {
        console.error("Failed to create refund transaction:", error);
        return {
            success: false,
            error: error?.message
        };
    }
    // Update original transaction metadata to indicate refund requested
    const isFullRefund = Math.abs(amount) >= Math.abs(originalRow.amount);
    const updatePayload = {
        metadata: {
            ...originalMeta,
            refund_status: isFullRefund ? "refunded" : "requested",
            refunded_amount: originalMeta.refunded_amount ? originalMeta.refunded_amount + amount : amount,
            has_refund_request: true,
            refund_request_id: newRefund.id
        }
    };
    // UNLINK PERSON IF FULL REFUND
    if (isFullRefund) {
        updatePayload.person_id = null; // Unlink person to clear debt
        // Preserve Person Name in Note if unlinking
        if (originalRow.person_id) {
            // SHEET SYNC: Trigger DELETE from sheet because we are unlinking the person
            try {
                const { syncTransactionToSheet } = await __turbopack_context__.A("[project]/src/services/sheet.service.ts [app-route] (ecmascript, async loader)");
                console.log("[Sheet Sync] Full Refund - Deleting entry for person:", originalRow.person_id);
                // We need to delete the ORIGINAL transaction from the sheet
                const deletePayload = {
                    id: transactionId,
                    occurred_at: originalRow.occurred_at,
                    note: originalRow.note,
                    tag: originalRow.tag,
                    amount: originalRow.amount ?? 0
                };
                // We use void to not block the main transaction update, but we log errors
                void syncTransactionToSheet(originalRow.person_id, deletePayload, "delete").catch((err)=>{
                    console.error("[Sheet Sync] Refund delete failed:", err);
                });
            } catch (syncErr) {
                console.error("[Sheet Sync] Failed to import sync service:", syncErr);
            }
            // "Cancel Debt: {Name}" logic was used for GD2 note. We can reuse 'person' data.
            const { data: personP } = await supabase.from("profiles").select("name").eq("id", originalRow.person_id).single();
            const personName = personP?.name;
            if (personName) {
                const currentNote = originalRow.note || "";
                if (!currentNote.includes(`(Debtor: ${personName})`)) {
                    updatePayload.note = `${currentNote} - (Debtor: ${personName})`;
                }
            }
        }
    }
    if (isFullRefund) {
        updatePayload.status = "waiting_refund"; // Orange/Amber badge
    }
    await supabase.from("transactions").update(updatePayload).eq("id", transactionId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
    return {
        success: true,
        refundTransactionId: newRefund.id
    };
}
async function confirmRefund(pendingTransactionId, targetAccountId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Fetch the Pending Transaction (GD2)
    const { data: pendingTxn, error: fetchError } = await supabase.from("transactions").select("*").eq("id", pendingTransactionId).single();
    if (fetchError || !pendingTxn) {
        return {
            success: false,
            error: "Pending refund transaction not found"
        };
    }
    const pendingRow = pendingTxn;
    const pendingMeta = pendingRow.metadata || {};
    // Extract Short ID from Original Transaction ID (if available)
    const originalTxnId = pendingMeta.original_transaction_id;
    const shortId = originalTxnId ? originalTxnId.substring(0, 4).toUpperCase() : "????";
    // 2. Update GD2 -> Completed
    const { error: updateError } = await supabase.from("transactions").update({
        status: "completed"
    }).eq("id", pendingTransactionId);
    if (updateError) {
        console.error("Confirm refund failed (update pending):", updateError);
        return {
            success: false,
            error: updateError.message
        };
    }
    // 3. Create GD3: Real Money In Transaction
    const confirmationTransaction = {
        occurred_at: new Date().toISOString(),
        amount: Math.abs(pendingRow.amount),
        type: "income",
        account_id: targetAccountId,
        category_id: "e0000000-0000-0000-0000-000000000095",
        note: `Refund Received`,
        status: "posted",
        created_by: null,
        // linked_transaction_id column = GD2's ID so void guard can detect it
        linked_transaction_id: pendingTransactionId,
        metadata: {
            original_transaction_id: pendingMeta.original_transaction_id,
            pending_refund_id: pendingTransactionId,
            is_refund_confirmation: true
        }
    };
    const { error: createError } = await supabase.from("transactions").insert(confirmationTransaction);
    if (createError) {
        console.error("Confirm refund failed (create confirmation):", createError);
        // Rollback GD2 update theoretically, but let's just return error for now
        return {
            success: false,
            error: createError.message
        };
    }
    await recalcForAccounts(new Set([
        targetAccountId,
        "99999999-9999-9999-9999-999999999999"
    ]));
    // Also finalize the original transaction if it was full refund?
    if (pendingMeta.original_transaction_id) {
        const { data: original } = await supabase.from("transactions").select("status, metadata").eq("id", pendingMeta.original_transaction_id).single();
        if (original) {
            const originalMeta = original.metadata || {};
            const newMeta = {
                ...originalMeta,
                refund_status: 'completed'
            };
            const updatePayload = {
                metadata: newMeta
            };
            // Also update status if currently waiting
            if (original.status === "waiting_refund") {
                updatePayload.status = "refunded";
            }
            await supabase.from("transactions").update(updatePayload).eq("id", pendingMeta.original_transaction_id);
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/transactions");
    return {
        success: true
    };
}
async function getPendingRefunds(accountId) {
    // Guard: PB accounts don't have pending refunds (Supabase-only feature)
    if (accountId && accountId.length === 15) {
        return [];
    }
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // Logic: status='waiting_refund' OR metadata->has_refund_request=true
    // Single query with OR logic
    let query = supabase.from('transactions').select(`
      id,
      occurred_at,
      amount,
      note,
      status,
      tag,
      metadata,
      account_id,
      category:categories(name)
    `).or('status.eq.waiting_refund,metadata->>has_refund_request.eq.true').neq('status', 'void').order('occurred_at', {
        ascending: false
    });
    if (accountId) {
        query = query.eq('account_id', accountId);
    }
    const { data, error } = await query;
    if (error) {
        console.error('Failed to fetch pending refunds:', error);
        return [];
    }
    return (data || []).map((txn)=>{
        // We need parseMetadata here. Ensure it is imported.
        const meta = txn.metadata // parseMetadata(txn.metadata) - simplified access since we just need fields
        ;
        // Actually better to use helper if available. 
        // I will assume I fix import next.
        return {
            id: txn.id,
            occurred_at: txn.occurred_at,
            amount: Math.abs(txn.amount),
            status: txn.status,
            note: txn.note,
            tag: txn.tag,
            original_category: txn.category?.name ?? null,
            original_note: meta?.original_note ?? txn.note
        };
    });
}
async function getSplitBillTransactions(baseTransactionId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // Get base transaction
    const { data: baseTransaction, error: baseError } = await supabase.from("transactions").select("*").eq("id", baseTransactionId).maybeSingle();
    if (baseError) {
        console.error("Error fetching base transaction:", baseError);
        return {
            base: null,
            children: []
        };
    }
    // Get all child transactions using JSONB query
    const { data: childTransactions, error: childError } = await supabase.from("transactions").select("*").contains("metadata", {
        split_parent_id: baseTransactionId
    });
    if (childError) {
        console.error("Error fetching child transactions:", childError);
        return {
            base: baseTransaction,
            children: []
        };
    }
    return {
        base: baseTransaction,
        children: childTransactions || []
    };
}
async function deleteSplitBill(baseTransactionId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    try {
        // First, get all transactions to know which accounts to recalculate
        const { base, children } = await getSplitBillTransactions(baseTransactionId);
        if (!base) {
            return {
                success: false,
                error: "Base transaction not found"
            };
        }
        // Collect all affected accounts
        const affectedAccounts = new Set();
        affectedAccounts.add(base.account_id);
        if (base.target_account_id) {
            affectedAccounts.add(base.target_account_id);
        }
        children.forEach((child)=>{
            affectedAccounts.add(child.account_id);
            if (child.target_account_id) {
                affectedAccounts.add(child.target_account_id);
            }
        });
        // Delete cashback_entries first (foreign key constraint)
        const allTransactionIds = [
            baseTransactionId,
            ...children.map((c)=>c.id)
        ];
        const { error: cashbackDeleteError } = await supabase.from("cashback_entries").delete().in("transaction_id", allTransactionIds);
        if (cashbackDeleteError) {
            console.error("Error deleting cashback entries:", cashbackDeleteError);
        // Continue anyway, cashback entries might not exist
        }
        // Delete child transactions
        const { error: childDeleteError } = await supabase.from("transactions").delete().contains("metadata", {
            split_parent_id: baseTransactionId
        });
        if (childDeleteError) {
            console.error("Error deleting child transactions:", childDeleteError);
            return {
                success: false,
                error: `Failed to delete child transactions: ${childDeleteError.message}`
            };
        }
        // Delete base transaction
        const { error: baseDeleteError } = await supabase.from("transactions").delete().eq("id", baseTransactionId);
        if (baseDeleteError) {
            console.error("Error deleting base transaction:", baseDeleteError);
            return {
                success: false,
                error: `Failed to delete base transaction: ${baseDeleteError.message}`
            };
        }
        // Recalculate balances for all affected accounts
        await recalcForAccounts(affectedAccounts);
        const deletedCount = 1 + children.length; // base + children
        return {
            success: true,
            deletedCount
        };
    } catch (error) {
        console.error("Unhandled error in deleteSplitBill:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
async function updateSplitBillAmounts(baseTransactionId, updates) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    try {
        // Get base transaction
        const { data: baseTransaction, error: baseError } = await supabase.from("transactions").select("*").eq("id", baseTransactionId).maybeSingle();
        if (baseError || !baseTransaction) {
            return {
                success: false,
                error: "Base transaction not found"
            };
        }
        const baseMeta = baseTransaction.metadata || {};
        // Calculate new total from non-removed participants
        const newTotal = updates.participants.filter((p)=>!p.isRemoved).reduce((sum, p)=>sum + p.amount, 0);
        // Collect affected accounts
        const affectedAccounts = new Set();
        affectedAccounts.add(baseTransaction.account_id);
        if (baseTransaction.target_account_id) {
            affectedAccounts.add(baseTransaction.target_account_id);
        }
        // Update base transaction
        const { error: baseUpdateError } = await supabase.from("transactions").update({
            amount: -Math.abs(newTotal),
            note: updates.note || baseTransaction.note,
            metadata: {
                ...baseMeta,
                split_qr_image_url: updates.qrImageUrl ?? baseMeta.split_qr_image_url,
                split_group_name: updates.title || baseMeta.split_group_name
            }
        }).eq("id", baseTransactionId);
        if (baseUpdateError) {
            console.error("Error updating base transaction:", baseUpdateError);
            return {
                success: false,
                error: `Failed to update base transaction: ${baseUpdateError.message}`
            };
        }
        // Update existing participants
        for (const p of updates.participants.filter((p)=>!p.isNew && !p.isRemoved)){
            if (!p.transactionId) continue;
            const { error: updateError } = await supabase.from("transactions").update({
                amount: -Math.abs(p.amount)
            }) // Negative for debt
            .eq("id", p.transactionId);
            if (updateError) {
                console.error(`Error updating participant ${p.personId}:`, updateError);
            }
            // Track affected account
            const { data: txn } = await supabase.from("transactions").select("account_id").eq("id", p.transactionId).single();
            if (txn) affectedAccounts.add(txn.account_id);
        }
        // Void removed participants
        for (const p of updates.participants.filter((p)=>p.isRemoved)){
            if (!p.transactionId) continue;
            const { error: voidError } = await supabase.from("transactions").update({
                status: "void"
            }).eq("id", p.transactionId);
            if (voidError) {
                console.error(`Error voiding participant ${p.personId}:`, voidError);
            }
        }
        // Create new participants
        for (const p of updates.participants.filter((p)=>p.isNew)){
            const newChildPayload = {
                occurred_at: baseTransaction.occurred_at,
                note: updates.note || baseTransaction.note,
                status: "posted",
                tag: baseTransaction.tag,
                created_by: baseTransaction.created_by,
                type: "debt",
                amount: -Math.abs(p.amount),
                account_id: baseTransaction.account_id,
                target_account_id: null,
                category_id: baseTransaction.category_id,
                person_id: p.personId,
                metadata: {
                    split_parent_id: baseTransactionId,
                    split_group_name: updates.title || baseMeta.split_group_name
                }
            };
            const { error: createError } = await supabase.from("transactions").insert(newChildPayload);
            if (createError) {
                console.error(`Error creating new participant ${p.personId}:`, createError);
            }
        }
        // Recalculate balances
        await recalcForAccounts(affectedAccounts);
        return {
            success: true
        };
    } catch (error) {
        console.error("Unhandled error in updateSplitBillAmounts:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
async function loadAccountTransactionsV2(accountId, limit = 5) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    const { data, error } = await supabase.from('transactions').select(`
      id, occurred_at, note, amount, type, status,
      category:categories(name, icon),
      person:people(name)
    `).eq('account_id', accountId).neq('status', 'void').order('occurred_at', {
        ascending: false
    }).limit(limit);
    if (error) {
        console.error('Error loading account transactions:', error);
        return [];
    }
    return data.map((t)=>({
            id: t.id,
            occurred_at: t.occurred_at,
            note: t.note,
            amount: t.amount,
            type: t.type,
            status: t.status,
            category_name: t.category?.name,
            category_icon: t.category?.icon,
            person_name: t.person?.name,
            displayType: t.type // Map if needed, but UI uses explicit check
        }));
}
async function bulkMoveToCategory(transactionIds, targetCategoryId) {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
    // 1. Update transactions
    const { data: updatedTxns, error } = await supabase.from("transactions").update({
        category_id: targetCategoryId
    }).in("id", transactionIds).select(`
      id, occurred_at, note, status, tag, created_at, created_by, amount, type, account_id,
      target_account_id, category_id, person_id, metadata, shop_id, persisted_cycle_tag,
      is_installment, installment_plan_id, cashback_share_percent, cashback_share_fixed,
      cashback_share_amount, cashback_mode, currency, final_price
      `);
    if (error) {
        console.error("Failed to bulk move transactions:", error);
        return {
            success: false,
            error: "Failed to update transactions"
        };
    }
    // 2. Trigger cashback recalculation for each transaction
    // import { upsertTransactionCashback } from "./cashback.service";
    // We need to fetch full details including category names for policy resolution if needed, 
    // but upsertTransactionCashback fetches its own data from DB usually.
    // However, the mapping might be needed.
    if (updatedTxns) {
        for (const txn of updatedTxns){
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$cashback$2e$service$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["upsertTransactionCashback"])(txn);
            } catch (err) {
                console.error(`Failed to trigger cashback upsert for ${txn.id}:`, err);
            }
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["revalidatePath"])("/");
    return {
        success: true
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    normalizeAmountForType,
    calculateAccountImpacts,
    mapTransactionRow,
    loadTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    voidTransaction,
    restoreTransaction,
    getRecentTransactions,
    getTransactionById,
    getTransactionsByShop,
    getTransactionsByPeople,
    getUnifiedTransactions,
    requestRefund,
    confirmRefund,
    getPendingRefunds,
    getSplitBillTransactions,
    deleteSplitBill,
    updateSplitBillAmounts,
    loadAccountTransactionsV2,
    bulkMoveToCategory
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(normalizeAmountForType, "60585ef913515a77b6f813980e83a92edb2146182b", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(calculateAccountImpacts, "400a88f20bf30f6f06c315cf94022cc6e946fae46f", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(mapTransactionRow, "600ad868633e31a993c2212dd4047d1c8ea20dafa3", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(loadTransactions, "40b61f0b5e776d85f4f5e2b7a3d1d39a57c3a01bb9", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(createTransaction, "4004b3d771cd928c5b516eb7aff4c95083b43c333c", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(updateTransaction, "607bf4394cf3d790ef12056caf03e6d568be4f1f46", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteTransaction, "409dfc5c43b022b059ad20901bfc294512de41dd1e", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(voidTransaction, "405d1f12108736faa37f259b1e7e55874654e018b3", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(restoreTransaction, "408068f59844d0c04f4faebd977ba62792477d4fad", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getRecentTransactions, "40b845745cfbc65553cc4f76ed95503bc7b89cab41", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getTransactionById, "60e1678baef340c2aa981daee046a0d20d28448ffb", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getTransactionsByShop, "60d38fc9c5aa0a5e5e36234e44cdef7f10e34441dd", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getTransactionsByPeople, "602b29b477e2d42c4cff9cb0098db2adec1affa574", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getUnifiedTransactions, "60d964676f3a7ae383b9892c4574877bf03d1d33da", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(requestRefund, "707c02904251b2edb8c31b1804e704b2ac8461ef6c", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(confirmRefund, "603237b3166f006c9c1012fd8fdb8224d64dde780a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getPendingRefunds, "403a51a2485e8de416e2cb4ed86c1b2f2d98ea53f8", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(getSplitBillTransactions, "40422e5a7aadb88f96acb2962d4662de09aa8f21fe", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteSplitBill, "40beacff9eff057aa473ae8f122926adf3b0903538", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(updateSplitBillAmounts, "60b725fee768334d86dd8a20cebb39cbd2ffdbf399", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(loadAccountTransactionsV2, "602e497fd35dc62fb504e810a75e46d121d4be5326", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["registerServerReference"])(bulkMoveToCategory, "60fa7a47b5026659905e6e82eccbd7779d83ca34d0", null);
}),
];

//# sourceMappingURL=src_ac4ce114._.js.map