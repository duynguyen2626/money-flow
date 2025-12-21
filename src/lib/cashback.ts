export type CashbackCycleType = 'calendar_month' | 'statement_cycle' | null

type CycleRange = {
  start: Date
  end: Date
}

// MF5.3 Types
export type CashbackCategoryRule = {
  categoryIds: string[];
  rate: number;
  maxReward: number | null;
};

export type CashbackLevel = {
  id: string;
  name: string;
  minTotalSpend: number;
  defaultRate: number;
  categoryRules?: CashbackCategoryRule[];
};

export type CashbackProgram = {
  rate: number;                    // decimal
  maxAmount: number | null;        // cycle cap
  cycleType: CashbackCycleType;
  statementDay: number | null;
  minSpend: number | null;
  levels?: CashbackLevel[];
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
      rate: Number(p.rate ?? 0),
      maxAmount: p.maxAmount !== undefined && p.maxAmount !== null ? Number(p.maxAmount) : null,
      cycleType: (p.cycleType === 'statement_cycle' ? 'statement_cycle' : 'calendar_month') as CashbackCycleType,
      statementDay: p.statementDay !== undefined && p.statementDay !== null ? Number(p.statementDay) : null,
      minSpend: p.minSpend !== undefined && p.minSpend !== null ? Number(p.minSpend) : null,
      levels: Array.isArray(p.levels) ? p.levels.map((lvl: any) => ({
        id: String(lvl.id),
        name: String(lvl.name),
        minTotalSpend: Number(lvl.minTotalSpend ?? 0),
        defaultRate: Number(lvl.defaultRate ?? 0),
        categoryRules: Array.isArray(lvl.categoryRules) ? lvl.categoryRules.map((rule: any) => ({
          categoryIds: Array.isArray(rule.categoryIds) ? rule.categoryIds.map(String) : [],
          rate: Number(rule.rate ?? 0),
          maxReward: rule.maxReward !== undefined && rule.maxReward !== null ? Number(rule.maxReward) : null,
        })) : undefined,
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

  const rateValue = program ? program.rate : Number(getVal(['rate']) ?? 0);
  const parsedRate = Number.isFinite(rateValue) ? rateValue : 0;

  const rawMax = program ? program.maxAmount : getVal(['max_amt', 'maxAmount', 'max_amount']);
  const maxAmount = (rawMax !== undefined && rawMax !== null) ? Number(rawMax) : null;

  // IMPORTANT: Fix for "cycleType=statement_cycle and statementDay=15 never default to calendar-month"
  const rawCycle = program ? program.cycleType : getVal(['cycle_type', 'cycle', 'cycleType']);
  const cycleType: CashbackCycleType = (rawCycle === 'statement_cycle') ? 'statement_cycle' : (rawCycle === 'calendar_month' ? 'calendar_month' : null);

  const rawStatementDay = program ? program.statementDay : getVal(['statement_day', 'statementDay', 'statement_date']);
  let statementDay: number | null = null;
  if (rawStatementDay !== undefined && rawStatementDay !== null) {
    const num = Number(rawStatementDay);
    if (Number.isFinite(num)) {
      statementDay = Math.min(Math.max(Math.floor(num), 1), 31);
    }
  }

  const rawDueDate = getVal(['due_date', 'dueDate', 'due_day']);
  let dueDate: number | null = null;
  if (rawDueDate !== undefined && rawDueDate !== null) {
    const num = Number(rawDueDate);
    if (Number.isFinite(num)) {
      dueDate = Math.min(Math.max(Math.floor(num), 1), 31);
    }
  }

  const rawMinSpend = program ? program.minSpend : getVal(['min_spend', 'minSpend']);
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
    program,
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
      // Handle potential double-escaped strings or standard JSON strings
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        // Recurse once if it's a double-encoded string
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
  config: ParsedCashbackConfig,
  referenceDate = new Date()
): CycleRange | null {
  if (!config.cycleType) {
    return null;
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
  const month = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][end.getMonth()];
  const year = String(end.getFullYear()).slice(2);

  return `${month}${year}`;
}
