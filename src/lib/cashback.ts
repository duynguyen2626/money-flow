export type CashbackCycleType = 'calendar_month' | 'statement_cycle' | null

type CycleRange = {
  start: Date
  end: Date
}

// MF5.3 Types
export type CashbackProgram = {
  defaultRate: number;                // decimal
  maxBudget: number | null;           // cycle cap
  cycleType: CashbackCycleType;
  statementDay: number | null;
  minSpendTarget: number | null;
  dueDate: number | null;
  levels?: CashbackLevel[];
};

export type CashbackCategoryRule = {
  id: string;
  categoryIds: string[];
  rate: number;
  maxReward: number | null;
  description?: string;
};

export type CashbackLevel = {
  id: string;
  name: string;
  minTotalSpend: number;
  defaultRate: number | null;
  maxReward: number | null; // Shared cap for all rules in this level
  rules?: CashbackCategoryRule[];
};

// Tiered cashback tier definition (Legacy support)
export type LegacyCashbackTier = {
  name?: string // Optional name for the tier (e.g., "Premium", "Gold")
  minSpend: number // Minimum spend to qualify for this tier
  categories: Record<string, {
    rate: number
    maxAmount?: number
    mcc_codes?: string
    max_reward?: number
  }> // category_key -> { rate, cap, mcc, max_reward }
  defaultRate?: number // Default rate for categories not specified
}

export type ParsedCashbackConfig = {
  rate: number
  maxAmount: number | null
  cycleType: CashbackCycleType
  statementDay: number | null
  dueDate: number | null
  minSpend: number | null
  // Tiered cashback support (Legacy)
  hasTiers?: boolean
  tiers?: LegacyCashbackTier[]
  // MF5.3 Support
  program?: CashbackProgram
}

function parseConfigCandidate(raw: Record<string, unknown> | null, source: string): ParsedCashbackConfig {
  if (!raw) {
    console.warn(`[parseCashbackConfig] Received null raw config from ${source}`);
    return {
      rate: 0,
      maxAmount: null,
      cycleType: 'calendar_month',
      statementDay: null,
      dueDate: null,
      minSpend: null,
    };
  }

  // 1. Parse Program (MF5.3)
  let program: CashbackProgram | undefined = undefined;
  if (raw.program && typeof raw.program === 'object') {
    const p = raw.program as any;
    program = {
      defaultRate: Number(p.defaultRate ?? p.rate ?? raw.rate ?? 0),
      maxBudget: Number(p.maxBudget ?? p.maxAmount ?? 0) || null,
      cycleType: (p.cycleType === 'statement_cycle' ? 'statement_cycle' : 'calendar_month') as CashbackCycleType,
      statementDay: Number(p.statementDay) || null,
      minSpendTarget: Number(p.minSpendTarget ?? p.minSpend) || null,
      dueDate: Number(p.dueDate) || null,
      levels: Array.isArray(p.levels) ? p.levels.map((lvl: any) => ({
        id: String(lvl.id),
        name: String(lvl.name),
        minTotalSpend: Number(lvl.minTotalSpend ?? 0),
        defaultRate: lvl.defaultRate !== undefined && lvl.defaultRate !== null ? Number(lvl.defaultRate) : null,
        rules: Array.isArray(lvl.rules ?? lvl.categoryRules) ? (lvl.rules ?? lvl.categoryRules).map((rule: any) => ({
          id: String(rule.id || Math.random().toString(36).substr(2, 9)),
          categoryIds: Array.isArray(rule.categoryIds) ? rule.categoryIds.map(String) : [],
          rate: Number(rule.rate ?? 0),
          maxReward: rule.maxReward !== undefined && rule.maxReward !== null ? Number(rule.maxReward) : null,
        })) : [],
      })) : undefined,
    };
  }

  // 2. Fallback / Legacy Parsing
  // Check for keys in a more robust way
  const getVal = (keys: string[]) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null) return raw[k];
    }
    return undefined;
  };

  const rateValue = program ? program.defaultRate : Number(getVal(['rate']) ?? 0);
  const parsedRate = Number.isFinite(rateValue) ? rateValue : 0;

  const rawMax = program ? program.maxBudget : getVal(['max_amt', 'maxAmount', 'max_amount']);
  const maxAmount = (rawMax !== undefined && rawMax !== null) ? Number(rawMax) : null;

  // IMPORTANT: Fix for "cycleType=statement_cycle and statementDay=15 never default to calendar-month"
  const rawCycle = program ? program.cycleType : getVal(['cycle_type', 'cycle', 'cycleType']);
  let cycleType: CashbackCycleType = (rawCycle === 'statement_cycle') ? 'statement_cycle' : (rawCycle === 'calendar_month' ? 'calendar_month' : null);

  const rawStatementDay = program ? program.statementDay : getVal(['statement_day', 'statementDay', 'statement_date']);
  let statementDay: number | null = null;
  if (rawStatementDay !== undefined && rawStatementDay !== null) {
    const num = Number(rawStatementDay);
    if (Number.isFinite(num)) {
      statementDay = Math.min(Math.max(Math.floor(num), 1), 31);
    }
  }

  const rawDueDate = program ? program.dueDate : getVal(['due_date', 'dueDate', 'due_day']);
  let dueDate: number | null = null;
  if (rawDueDate !== undefined && rawDueDate !== null) {
    const num = Number(rawDueDate);
    if (Number.isFinite(num)) {
      dueDate = Math.min(Math.max(Math.floor(num), 1), 31);
    }
  }

  const rawMinSpend = program ? program.minSpendTarget : getVal(['min_spend', 'minSpend']);
  const minSpend = (rawMinSpend !== undefined && rawMinSpend !== null) ? Number(rawMinSpend) : null;

  // Parse legacy tiered cashback
  const hasTiers = Boolean(getVal(['has_tiers', 'hasTiers']));
  let tiers: LegacyCashbackTier[] | undefined = undefined;

  if (hasTiers && Array.isArray(raw.tiers)) {
    tiers = (raw.tiers as any[]).map((tier: any) => ({
      minSpend: Number(tier.minSpend ?? tier.min_spend ?? 0),
      categories: tier.categories ?? {},
      defaultRate: typeof tier.defaultRate === 'number' ? tier.defaultRate : undefined,
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
    program,
  };
}

export const normalizeRate = (val: any): number => {
  const r = Number(val ?? 0);
  // Smart heuristic: In this project, rates >= 0.3 are almost certainly percentages (0.5 for 0.5%, 5 for 5%)
  // while rates < 0.3 are almost certainly decimals (0.003 for 0.3%, 0.15 for 15%)
  // We choose 0.3 because 30% is a common max for high-cat cashback (0.3), 
  // and 0.5 is a common base rate (0.5).
  if (r >= 0.3) return r / 100;
  return r;
};

export function normalizeCashbackConfig(raw: any, account?: any): CashbackProgram {
  const parsed = parseCashbackConfig(raw);
  const program = parsed.program;

  // If account is provided with new cb_ columns, use them first
  if (account && account.cb_type && account.cb_type !== 'none') {
    return {
      defaultRate: normalizeRate(account.cb_base_rate ?? program?.defaultRate ?? 0),
      maxBudget: account.cb_is_unlimited ? null : Number(account.cb_max_budget ?? program?.maxBudget ?? 0),
      // Cycle info prioritization
      cycleType: account.cb_cycle_type || program?.cycleType || 'calendar_month',
      statementDay: (account.statement_day ?? program?.statementDay) ?? null,
      minSpendTarget: (account.cb_min_spend ?? program?.minSpendTarget) ?? null,
      dueDate: (account.due_date ?? program?.dueDate) ?? null,
      levels: (() => {
        if (account.cb_type === 'tiered') {
          const rawRules = account.cb_rules_json;
          const tiers = Array.isArray(rawRules) ? rawRules : (rawRules?.tiers || []);

          return tiers.map((lvl: any) => ({
            id: lvl.id || Math.random().toString(36).substr(2, 9),
            name: lvl.name || "",
            minTotalSpend: Number(lvl.minTotalSpend ?? lvl.min_spend ?? 0),
            defaultRate: normalizeRate(lvl.defaultRate ?? lvl.base_rate),
            maxReward: Number(lvl.maxReward ?? lvl.max_reward ?? 0) || null,
            rules: (lvl.rules || lvl.policies || []).map((r: any) => ({
              id: r.id || Math.random().toString(36).substr(2, 9),
              categoryIds: r.categoryIds || r.cat_ids || [],
              rate: normalizeRate(r.rate),
              maxReward: (r.maxReward !== undefined ? r.maxReward : (r.max !== undefined ? r.max : null)),
              description: r.description
            }))
          }));
        } else if (account.cb_type === 'simple' && Array.isArray(account.cb_rules_json)) {
          return [{
            id: 'simple_level',
            name: 'General',
            minTotalSpend: 0,
            defaultRate: normalizeRate(account.cb_base_rate),
            maxReward: null,
            rules: (account.cb_rules_json as any[]).map((r: any) => ({
              id: r.id || Math.random().toString(36).substr(2, 9),
              categoryIds: r.categoryIds || r.cat_ids || [],
              rate: normalizeRate(r.rate),
              maxReward: (r.maxReward !== undefined ? r.maxReward : (r.max !== undefined ? r.max : null)),
              description: r.description
            }))
          }];
        }
        return program?.levels?.map(lvl => ({
          ...lvl,
          defaultRate: normalizeRate(lvl.defaultRate),
          rules: lvl.rules?.map(r => ({ ...r, rate: normalizeRate(r.rate) }))
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
      levels: parsed.program.levels?.map(lvl => ({
        id: lvl.id,
        name: lvl.name,
        minTotalSpend: Number(lvl.minTotalSpend ?? 0),
        defaultRate: normalizeRate(lvl.defaultRate),
        maxReward: lvl.maxReward !== undefined ? lvl.maxReward : null,
        rules: lvl.rules?.map(rule => ({
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
    levels: parsed.hasTiers && parsed.tiers ? parsed.tiers.map((tier, idx) => ({
      id: `lvl_${idx + 1}`,
      name: tier.name || `Level ${idx + 1}`,
      minTotalSpend: tier.minSpend,
      defaultRate: tier.defaultRate !== undefined ? tier.defaultRate : null,
      maxReward: null,
      rules: Object.entries(tier.categories || {}).map(([catKey, catData], rIdx) => ({
        id: `rule_${idx + 1}_${rIdx + 1}`,
        categoryIds: [catKey], // Note: legacy used string keys, might need mapping
        rate: (catData as any).rate ?? 0,
        maxReward: (catData as any).max_reward ?? (catData as any).maxAmount ?? null,
      }))
    })) : []
  };
}

export function parseCashbackConfig(raw: unknown, accountId: string = 'unknown'): ParsedCashbackConfig {
  if (!raw) {
    return {
      rate: 0,
      maxAmount: null,
      cycleType: null,
      statementDay: null,
      dueDate: null,
      minSpend: null,
      hasTiers: false,
      tiers: undefined,
    };
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        return parseCashbackConfig(parsed, accountId);
      }
      return parseConfigCandidate(parsed as Record<string, unknown>, accountId);
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
        tiers: undefined,
      };
    }
  }

  if (typeof raw === 'object') {
    return parseConfigCandidate(raw as Record<string, unknown>, accountId);
  }

  return {
    rate: 0,
    maxAmount: null,
    cycleType: null,
    statementDay: null,
    dueDate: null,
    minSpend: null,
    hasTiers: false,
    tiers: undefined,
  };
}

export function getCashbackCycleRange(
  config: { cycleType: CashbackCycleType; statementDay: number | null },
  referenceDate = new Date()
): CycleRange | null {
  if (!config.cycleType) {
    return null
  }

  const startOfCalendar = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const calendarEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)

  if (config.cycleType === 'calendar_month') {
    startOfCalendar.setHours(0, 0, 0, 0)
    calendarEnd.setHours(23, 59, 59, 999)
    return {
      start: startOfCalendar,
      end: calendarEnd,
    }
  }

  if (config.cycleType === 'statement_cycle' && !config.statementDay) {
    return null;
  }

  const day = config.statementDay!

  const referenceDay = referenceDate.getDate()
  const startOffset = referenceDay >= day ? 0 : -1
  const endOffset = referenceDay >= day ? 1 : 0

  const startBase = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + startOffset, 1)
  const start = clampToDay(startBase, day)

  // End date is 1 day BEFORE the next statement day
  // Example: statement_day = 25 → cycle is Nov 25 - Dec 24
  const endBase = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + endOffset, 1)
  const nextStatementDay = clampToDay(endBase, day)
  const end = new Date(nextStatementDay.getTime() - 24 * 60 * 60 * 1000) // Subtract 1 day

  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}


function clampToDay(base: Date, day: number | null) {
  if (!day) {
    return base
  }
  const candidate = new Date(base.getFullYear(), base.getMonth(), 1)
  const monthEnd = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0)
  const safeDay = Math.min(day, monthEnd.getDate())
  return new Date(candidate.getFullYear(), candidate.getMonth(), safeDay)
}

/**
 * Calculate the bank's cashback amount for a transaction.
 * @param config Parsed cashback configuration
 * @param amount Transaction amount (absolute value)
 * @param categoryName Category name for tier matching
 * @param totalSpend Current total spend in cycle (for tier determination). Defaults to 0.
 */
export function calculateBankCashback(
  config: ParsedCashbackConfig,
  amount: number,
  categoryName?: string,
  totalSpend: number = 0
): { amount: number; rate: number } {
  let earnedRate = config.rate

  if (config.hasTiers && config.tiers && config.tiers.length > 0) {
    // Find the applicable tier based on total spend
    const applicableTier = config.tiers
      .filter(tier => totalSpend >= tier.minSpend)
      .sort((a, b) => b.minSpend - a.minSpend)[0]

    if (applicableTier) {
      if (categoryName) {
        const lowerCat = categoryName.toLowerCase()
        let categoryKey: string | null = null
        for (const key of Object.keys(applicableTier.categories)) {
          if (lowerCat.includes(key.toLowerCase())) {
            categoryKey = key
            break
          }
        }

        if (categoryKey && applicableTier.categories[categoryKey]) {
          earnedRate = applicableTier.categories[categoryKey].rate
        } else if (applicableTier.defaultRate !== undefined) {
          earnedRate = applicableTier.defaultRate
        }
      } else if (applicableTier.defaultRate !== undefined) {
        earnedRate = applicableTier.defaultRate
      }
    }
  }

  return { amount: amount * earnedRate, rate: earnedRate }
}

export function getMinSpendStatus(currentSpend: number, minSpendTarget: number | null) {
  const target = minSpendTarget || 0
  const remaining = Math.max(0, target - currentSpend)
  const isTargetMet = currentSpend >= target
  return {
    spent: currentSpend,
    remaining,
    isTargetMet
  }
}

export function getCashbackCycleTag(
  referenceDate: Date,
  config: { statementDay: number | null; cycleType: CashbackCycleType }
): string | null {
  const minimalConfig: ParsedCashbackConfig = {
    rate: 0,
    maxAmount: null,
    cycleType: config.cycleType,
    statementDay: config.statementDay,
    dueDate: null,
    minSpend: null,
  };

  const range = getCashbackCycleRange(minimalConfig, referenceDate);
  if (!range) return null;

  const end = range.end;
  return formatIsoCycleTag(end);
}

const CYCLE_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function formatIsoCycleTag(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function formatLegacyCycleTag(date: Date) {
  const month = CYCLE_MONTHS[date.getMonth()]
  const year = String(date.getFullYear()).slice(2)
  return `${month}${year}`
}

export function parseCycleTag(tag: string): { year: number; month: number } | null {
  if (!tag) return null

  const isoMatch = tag.match(/^(\d{4})-(\d{2})$/)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    if (Number.isFinite(year) && month >= 1 && month <= 12) {
      return { year, month }
    }
  }

  const dashedLegacyMatch = tag.match(/^([A-Z]{3})-(\d{4})$/)
  if (dashedLegacyMatch) {
    const monthIdx = CYCLE_MONTHS.indexOf(dashedLegacyMatch[1])
    const year = Number(dashedLegacyMatch[2])
    if (monthIdx >= 0 && Number.isFinite(year)) {
      return { year, month: monthIdx + 1 }
    }
  }

  const legacyMatch = tag.match(/^([A-Z]{3})(\d{2})$/)
  if (legacyMatch) {
    const monthIdx = CYCLE_MONTHS.indexOf(legacyMatch[1])
    const year = 2000 + Number(legacyMatch[2])
    if (monthIdx >= 0 && Number.isFinite(year)) {
      return { year, month: monthIdx + 1 }
    }
  }

  return null
}
