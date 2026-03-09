module.exports = [
"[project]/src/lib/utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn,
    "formatCompactMoney",
    ()=>formatCompactMoney,
    "formatCurrency",
    ()=>formatCurrency,
    "formatMoneyVND",
    ()=>formatMoneyVND,
    "formatVNLongAmount",
    ()=>formatVNLongAmount,
    "getAccountInitial",
    ()=>getAccountInitial
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/tailwind-merge@3.4.0/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-ssr] (ecmascript)");
function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND"
    }).format(amount);
}
function formatMoneyVND(amount) {
    return new Intl.NumberFormat("vi-VN").format(amount);
}
function getAccountInitial(name) {
    return name.split(" ").map((word)=>word[0]).join("").toUpperCase().slice(0, 2);
}
function formatCompactMoney(amount) {
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000000) {
        return (amount / 1000000).toFixed(1) + "M";
    }
    if (absAmount >= 1000) {
        return (amount / 1000).toFixed(0) + "k";
    }
    return amount.toString();
}
function formatVNLongAmount(amount) {
    const absAmount = Math.round(Math.abs(amount));
    if (absAmount === 0) return '0';
    const b = Math.floor(absAmount / 1_000_000_000);
    let remainder = absAmount % 1_000_000_000;
    const m = Math.floor(remainder / 1_000_000);
    remainder %= 1_000_000;
    const k = Math.floor(remainder / 1_000);
    const d = remainder % 1_000;
    const parts = [];
    const formatWithHundreds = (val, unit)=>{
        if (val <= 0) return;
        if (val >= 100) {
            const h = Math.floor(val / 100);
            const rem = val % 100;
            if (rem > 0) {
                parts.push(`${h} Trăm ${rem} ${unit}`);
            } else {
                parts.push(`${h} Trăm ${unit}`);
            }
        } else {
            parts.push(`${val} ${unit}`);
        }
    };
    formatWithHundreds(b, 'Tỷ');
    formatWithHundreds(m, 'Triệu');
    formatWithHundreds(k, 'Ngàn');
    if (d > 0) {
        if (d >= 100) {
            const h = Math.floor(d / 100);
            const rem = d % 100;
            if (rem > 0) {
                parts.push(`${h} Trăm ${rem}`);
            } else {
                parts.push(`${h} Trăm`);
            }
        } else {
            parts.push(`${d}`);
        }
    }
    return parts.join(' ').trim();
}
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
}),
"[project]/src/lib/number-to-text.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatShortVietnameseCurrency",
    ()=>formatShortVietnameseCurrency,
    "formatVietnameseCurrencyText",
    ()=>formatVietnameseCurrencyText,
    "readMoney",
    ()=>readMoney
]);
function readMoney(amount) {
    if (amount === 0) return 'không đồng';
    const units = [
        '',
        'ngàn',
        'triệu',
        'tỷ',
        'ngàn tỷ',
        'triệu tỷ'
    ];
    const digits = [
        'không',
        'một',
        'hai',
        'ba',
        'bốn',
        'năm',
        'sáu',
        'bảy',
        'tám',
        'chín'
    ];
    let s = Math.abs(amount).toString();
    const groups = [];
    while(s.length > 0){
        groups.push(s.slice(-3));
        s = s.slice(0, -3);
    }
    let result = '';
    for(let i = 0; i < groups.length; i++){
        const group = parseInt(groups[i]);
        if (group === 0 && i < groups.length - 1) continue; // Skip empty groups unless it's the last one (handled by amount===0 check)
        // Simple reading for now, can be enhanced for "lẻ", "mốt", "lăm"
        // For the UI requirement "22 ngàn 3 trăm...", we want a concise format.
        // Let's try to format it nicely.
        if (group > 0) {
            result = `${group} ${units[i]} ` + result;
        }
    }
    return result.trim();
}
function formatVietnameseCurrencyText(amount) {
    if (!amount || isNaN(amount)) return [];
    const str = Math.round(Math.abs(amount)).toString();
    const len = str.length;
    const parts = [];
    // Basic logic to split into billions, millions, thousands
    // 123456789 -> 123 triệu 456 ngàn 789
    let remaining = Math.abs(amount);
    const billions = Math.floor(remaining / 1_000_000_000);
    remaining %= 1_000_000_000;
    const millions = Math.floor(remaining / 1_000_000);
    remaining %= 1_000_000;
    const thousands = Math.floor(remaining / 1_000);
    remaining %= 1_000;
    const units = remaining;
    if (billions > 0) parts.push({
        value: billions.toString(),
        unit: 'tỷ'
    });
    if (millions > 0) parts.push({
        value: millions.toString(),
        unit: 'triệu'
    });
    if (thousands > 0) parts.push({
        value: thousands.toString(),
        unit: 'ngàn'
    });
    if (units > 0) parts.push({
        value: units.toString(),
        unit: 'đồng'
    });
    return parts;
}
function formatShortVietnameseCurrency(amount) {
    if (!amount) return '';
    const absAmount = Math.abs(amount);
    if (absAmount >= 1_000_000_000) {
        const billion = Math.floor(absAmount / 1_000_000_000);
        const remainder = absAmount % 1_000_000_000;
        const million = Math.floor(remainder / 1_000_000);
        return `${billion} tỷ${million > 0 ? ` ${million} triệu` : ''}`;
    }
    if (absAmount >= 1_000_000) {
        const million = Math.floor(absAmount / 1_000_000);
        const remainder = absAmount % 1_000_000;
        const thousand = Math.floor(remainder / 1_000);
        return `${million} triệu${thousand > 0 ? ` ${thousand} ngàn` : ''}`;
    }
    if (absAmount >= 1_000) {
        const thousand = Math.floor(absAmount / 1_000);
        const remainder = absAmount % 1_000;
        return `${thousand} ngàn${remainder > 0 ? ` ${remainder}` : ''}`;
    }
    return absAmount.toString();
}
}),
"[project]/src/lib/cashback.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
    const cycleType = rawCycle === 'statement_cycle' ? 'statement_cycle' : rawCycle === 'calendar_month' ? 'calendar_month' : null;
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
    // DIAGNOSTIC LOG: If it's supposed to be statement cycle but statementDay is missing
    if (cycleType === 'statement_cycle' && !statementDay) {
        console.error(`[parseCashbackConfig] Account ${source} configured as statement_cycle but statementDay is missing/null.`);
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
"[project]/src/lib/month-tag.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isLegacyMMMYY",
    ()=>isLegacyMMMYY,
    "isYYYYMM",
    ()=>isYYYYMM,
    "legacyToYYYYMM",
    ()=>legacyToYYYYMM,
    "normalizeMonthTag",
    ()=>normalizeMonthTag,
    "toLegacyMMMYYFromDate",
    ()=>toLegacyMMMYYFromDate,
    "toYYYYMMFromDate",
    ()=>toYYYYMMFromDate,
    "yyyyMMToLegacyMMMYY",
    ()=>yyyyMMToLegacyMMMYY
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/date-fns@4.1.0/node_modules/date-fns/format.js [app-ssr] (ecmascript) <locals>");
;
const legacyMonthMap = {
    JAN: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AUG: '08',
    SEP: '09',
    OCT: '10',
    NOV: '11',
    DEC: '12'
};
const reverseLegacyMonthMap = Object.fromEntries(Object.entries(legacyMonthMap).map(([month, num])=>[
        num,
        month
    ]));
function isYYYYMM(value) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
function isLegacyMMMYY(value) {
    if (!/^[A-Za-z]{3}\d{2}$/.test(value)) return false;
    return value.slice(0, 3).toUpperCase() in legacyMonthMap;
}
function legacyToYYYYMM(value) {
    if (!isLegacyMMMYY(value)) return null;
    const monthAbbrev = value.slice(0, 3).toUpperCase();
    const month = legacyMonthMap[monthAbbrev];
    if (!month) return null;
    const yearSuffix = value.slice(-2);
    const yearNum = Number.parseInt(yearSuffix, 10);
    if (Number.isNaN(yearNum)) return null;
    const year = 2000 + yearNum;
    return `${year}-${month}`;
}
function normalizeMonthTag(value) {
    if (value == null) return value;
    const trimmed = value.trim();
    if (trimmed === '') return trimmed;
    if (isYYYYMM(trimmed)) return trimmed;
    const converted = legacyToYYYYMM(trimmed);
    return converted ?? trimmed;
}
function toYYYYMMFromDate(date) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$format$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(date, 'yyyy-MM');
}
function yyyyMMToLegacyMMMYY(value) {
    if (!isYYYYMM(value)) return null;
    const [year, month] = value.split('-');
    if (!year || !month) return null;
    const monthAbbrev = reverseLegacyMonthMap[month];
    if (!monthAbbrev) return null;
    return `${monthAbbrev}${year.slice(2)}`;
}
function toLegacyMMMYYFromDate(date) {
    return yyyyMMToLegacyMMMYY(toYYYYMMFromDate(date)) ?? '';
}
}),
"[project]/src/lib/cycle-utils.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculateStatementCycle",
    ()=>calculateStatementCycle,
    "formatCycleTag",
    ()=>formatCycleTag,
    "formatCycleTagWithYear",
    ()=>formatCycleTagWithYear
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/month-tag.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/date-fns@4.1.0/node_modules/date-fns/addMonths.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$startOfDay$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/date-fns@4.1.0/node_modules/date-fns/startOfDay.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$setDate$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/date-fns@4.1.0/node_modules/date-fns/setDate.js [app-ssr] (ecmascript)");
;
;
function formatCycleTag(tag) {
    const normalized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeMonthTag"])(tag);
    if (!normalized || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isYYYYMM"])(normalized)) return tag;
    const [yearStr, monthStr] = normalized.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) // 1..12
    ;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return tag;
    const cycleStartDay = 25;
    const cycleEndDay = 24;
    const startMonth = month === 1 ? 12 : month - 1;
    const endMonth = month;
    const formatDay = (day)=>String(day).padStart(2, '0');
    const formatMonth = (m)=>String(m).padStart(2, '0');
    return `${formatDay(cycleStartDay)}.${formatMonth(startMonth)} - ${formatDay(cycleEndDay)}.${formatMonth(endMonth)}`;
}
function formatCycleTagWithYear(tag) {
    const normalized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["normalizeMonthTag"])(tag);
    if (!normalized || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$month$2d$tag$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isYYYYMM"])(normalized)) return tag;
    const [yearStr, monthStr] = normalized.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) // 1..12
    ;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return tag;
    const cycleStartDay = 25;
    const cycleEndDay = 24;
    const startMonth = month === 1 ? 12 : month - 1;
    const startYear = month === 1 ? year - 1 : year;
    const endMonth = month;
    const endYear = year;
    const formatDay = (day)=>String(day).padStart(2, '0');
    const formatMonth = (m)=>String(m).padStart(2, '0');
    return `${formatDay(cycleStartDay)}.${formatMonth(startMonth)}.${startYear} - ${formatDay(cycleEndDay)}.${formatMonth(endMonth)}.${endYear}`;
}
function calculateStatementCycle(date, statementDay) {
    if (!statementDay || statementDay > 31) {
        // Fallback or handle invalid statement day
        return null;
    }
    const targetDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$startOfDay$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["startOfDay"])(date);
    const day = targetDate.getDate();
    // Cycle ends on statementDay.
    // Start depends on month.
    let cycleEndDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$startOfDay$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["startOfDay"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$setDate$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setDate"])(targetDate, statementDay));
    // If current day > statementDay, we are in NEXT cycle (which ends next month)
    // If current day <= statementDay, we are in CURRENT cycle (which ends this month)
    if (day > statementDay) {
        cycleEndDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addMonths"])(cycleEndDate, 1);
    }
    // Cycle Start is (Cycle End - 1 month) + 1 day
    const cycleStartDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$date$2d$fns$40$4$2e$1$2e$0$2f$node_modules$2f$date$2d$fns$2f$addMonths$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addMonths"])(cycleEndDate, -1);
    cycleStartDate.setDate(cycleStartDate.getDate() + 1);
    return {
        start: cycleStartDate,
        end: cycleEndDate
    };
}
}),
"[project]/src/lib/supabase/client.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$7$2e$0_$40$supabase$2b$supabase$2d$js$40$2$2e$89$2e$0$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.89.0/node_modules/@supabase/ssr/dist/module/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$7$2e$0_$40$supabase$2b$supabase$2d$js$40$2$2e$89$2e$0$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createBrowserClient$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@supabase+ssr@0.7.0_@supabase+supabase-js@2.89.0/node_modules/@supabase/ssr/dist/module/createBrowserClient.js [app-ssr] (ecmascript)");
;
function createClient() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$supabase$2b$ssr$40$0$2e$7$2e$0_$40$supabase$2b$supabase$2d$js$40$2$2e$89$2e$0$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createBrowserClient$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createBrowserClient"])(("TURBOPACK compile-time value", "https://puzvrlojtgneihgvevcx.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1enZybG9qdGduZWloZ3ZldmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NDI5NTksImV4cCI6MjA3OTExODk1OX0.fAVI34PhJBDxN8iZU6Eb_EPfE5YKJ9sg-oDI0LzlU4w"));
}
}),
"[project]/src/context/breadcrumb-context.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BreadcrumbProvider",
    ()=>BreadcrumbProvider,
    "useBreadcrumbs",
    ()=>useBreadcrumbs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
;
const BreadcrumbContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function BreadcrumbProvider({ children }) {
    const [customNames, setCustomNames] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const setCustomName = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((path, name)=>{
        setCustomNames((prev)=>{
            if (prev[path] === name) return prev;
            return {
                ...prev,
                [path]: name
            };
        });
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(BreadcrumbContext.Provider, {
        value: {
            customNames,
            setCustomName
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/context/breadcrumb-context.tsx",
        lineNumber: 23,
        columnNumber: 9
    }, this);
}
function useBreadcrumbs() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(BreadcrumbContext);
    if (!context) {
        throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
    }
    return context;
}
}),
"[project]/src/types/settings.types.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_QUICK_PEOPLE_CONFIG",
    ()=>DEFAULT_QUICK_PEOPLE_CONFIG,
    "SETTINGS_KEY_QUICK_PEOPLE",
    ()=>SETTINGS_KEY_QUICK_PEOPLE,
    "SETTINGS_KEY_USAGE_STATS",
    ()=>SETTINGS_KEY_USAGE_STATS
]);
const DEFAULT_QUICK_PEOPLE_CONFIG = {
    mode: 'smart',
    pinned_ids: [],
    blacklist_ids: []
};
const SETTINGS_KEY_QUICK_PEOPLE = 'quick_people_config';
const SETTINGS_KEY_USAGE_STATS = 'usage_stats';
}),
"[project]/src/hooks/use-app-favicon.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAppFavicon",
    ()=>useAppFavicon
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7.28.5_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/next/navigation.js [app-ssr] (ecmascript)");
'use client';
;
;
// Color theme: Premium Gold #f59e0b, Blue #3b82f6
const THEME = {
    gold: '#f59e0b',
    goldDark: '#92400e',
    blue: '#3b82f6',
    slate: '#1e293b'
};
const ICONS = {
    dashboard: `<path d="M5 5 H45 V45 H5 Z M55 5 H95 V45 H55 Z M5 55 H45 V95 H5 Z M55 55 H95 V95 H55 Z" fill="currentColor"/>`,
    accounts: `<path d="M5 90 H95" stroke="currentColor" stroke-width="8"/><path d="M10 90 V45 L50 10 L90 45 V90" stroke="currentColor" stroke-width="8" fill="none"/><path d="M35 90 V60 M50 90 V60 M65 90 V60" stroke="currentColor" stroke-width="8"/>`,
    transactions: `<path d="M5 35 H55 V15 L95 50 L55 85 V65 H5 Z" fill="currentColor" opacity="0.9"/><path d="M95 35 H45 V15 L5 50 L45 85 V65 H95 Z" fill="currentColor" opacity="0.5"/>`,
    installments: `<rect x="15" y="5" width="70" height="90" rx="10" stroke="currentColor" stroke-width="8" fill="none"/><path d="M15 35 H85 M15 65 H85" stroke="currentColor" stroke-width="8"/>`,
    categories: `<path d="M10 10 H60 L90 40 L40 90 L10 60 Z" fill="currentColor"/><circle cx="45" cy="35" r="10" fill="white"/>`,
    shops: `<path d="M5 40 L95 40 L95 90 L5 90 Z" fill="currentColor"/><path d="M25 40 Q 50 5 75 40" stroke="currentColor" stroke-width="10" fill="none"/>`,
    people: `<circle cx="50" cy="35" r="25" fill="currentColor"/><path d="M10 95 C10 65 90 65 90 95 Z" fill="currentColor" opacity="0.8"/>`,
    cashback: `<rect x="5" y="20" width="90" height="60" rx="10" stroke="currentColor" stroke-width="8" fill="none"/><circle cx="50" cy="50" r="15" fill="currentColor"/>`,
    batch: `<path d="M10 20 C10 10 90 10 90 20 V80 C90 90 10 90 10 80 Z" fill="currentColor" opacity="0.8"/><ellipse cx="50" cy="20" rx="40" ry="10" fill="currentColor"/><path d="M10 45 Q 50 55 90 45" stroke="white" stroke-width="4" fill="none"/>`,
    services: `<path d="M25 85 C5 85 0 70 0 55 C0 35 25 25 40 25 C50 5 75 5 85 20 C100 20 100 45 100 60 C100 85 80 90 75 90 Z" fill="currentColor"/>`,
    refunds: `<path d="M90 50 Q 90 95 50 95 Q 10 95 10 50 Q 10 5 50 5 L 50 30 L 95 0 L 50 -30 V 0 Q 0 0 0 50 Q 0 115 50 115 Q 100 115 100 50 Z" fill="currentColor" transform="scale(0.85) translate(10, 5)"/>`,
    ai: `<path d="M50 0 L65 35 L100 50 L65 65 L50 100 L35 65 L0 50 L35 35 Z" fill="currentColor"/>`
};
function useAppFavicon(isLoading, customIcon) {
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$28$2e$5_react$2d$dom$40$19$2e$2$2e$3_react$40$19$2e$2$2e$3_$5f$react$40$19$2e$2$2e$3$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // Prepare target URL and isUrl flag
        let targetUrl = '';
        let isCustomUrl = false;
        let svgContent = '';
        if (isLoading) {
            svgContent = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="${THEME.blue}" stroke-width="10" fill="none" stroke-dasharray="160 100" opacity="0.8">
                    <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="50" cy="50" r="28" fill="${THEME.gold}" stroke="${THEME.goldDark}" stroke-width="2" />
                  <text x="50" y="60" font-size="32" font-weight="950" fill="white" text-anchor="middle" font-family="Arial">$</text>
                </svg>
            `;
        } else if (customIcon) {
            targetUrl = customIcon;
            isCustomUrl = true;
        } else {
            // Page specific icon
            let pageKey = 'dashboard';
            if (pathname) {
                if (pathname === '/accounts') pageKey = 'accounts';
                else if (pathname.includes('/accounts/')) pageKey = 'accounts_detail'; // Detail pages don't auto-override to bag if no customIcon
                else if (pathname.includes('/transactions')) pageKey = 'transactions';
                else if (pathname.includes('/installments')) pageKey = 'installments';
                else if (pathname.includes('/categories')) pageKey = 'categories';
                else if (pathname.includes('/shops')) pageKey = 'shops';
                else if (pathname.includes('/people')) pageKey = 'people';
                else if (pathname.includes('/cashback')) pageKey = 'cashback';
                else if (pathname.includes('/batch')) pageKey = 'batch';
                else if (pathname.includes('/services')) pageKey = 'services';
                else if (pathname.includes('/refunds')) pageKey = 'refunds';
                else if (pathname.includes('/settings/ai')) pageKey = 'ai';
            }
            if (pageKey === 'accounts') {
                targetUrl = '/favicon.svg?v=6';
                isCustomUrl = true;
            } else {
                const iconContent = ICONS[pageKey === 'accounts_detail' ? 'accounts' : pageKey] || ICONS.dashboard;
                svgContent = `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${THEME.blue}">
                    <g transform="translate(5, 5) scale(0.9)">
                      ${iconContent}
                    </g>
                  </svg>
                `;
            }
        }
        const { cleanup } = updateFavicon(isCustomUrl ? targetUrl : svgContent, isCustomUrl);
        return ()=>cleanup();
    }, [
        isLoading,
        pathname,
        customIcon
    ]);
}
function updateFavicon(content, isUrl = false) {
    let url = content;
    let isBlob = false;
    if (!isUrl) {
        const blob = new Blob([
            content
        ], {
            type: 'image/svg+xml'
        });
        url = URL.createObjectURL(blob);
        isBlob = true;
    }
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = url;
    link.id = 'dynamic-favicon';
    // Apple Touch Icon support
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = url;
    appleLink.id = 'dynamic-apple-icon';
    // Remove existing favicons SAFELY
    const existingIcons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    existingIcons.forEach((icon)=>{
        if (icon.parentNode) {
            icon.parentNode.removeChild(icon);
        }
    });
    document.head.appendChild(link);
    document.head.appendChild(appleLink);
    return {
        cleanup: ()=>{
            if (isBlob) URL.revokeObjectURL(url);
            if (link.parentNode) link.parentNode.removeChild(link);
            if (appleLink.parentNode) appleLink.parentNode.removeChild(appleLink);
        }
    };
}
}),
];

//# sourceMappingURL=src_b110cc13._.js.map