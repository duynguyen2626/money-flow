import { CashbackPolicyMetadata, CashbackPolicySource } from '@/types/cashback.types'

export function formatPercent(rate: number | null | undefined, fallback = '--') {
  if (typeof rate !== 'number' || Number.isNaN(rate)) return fallback
  return `${(rate * 100).toFixed(1)}%`
}

export function normalizePolicyMetadata(metadata: unknown): CashbackPolicyMetadata | null {
  if (!metadata) return null

  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata)
      return normalizePolicyMetadata(parsed)
    } catch {
      return null
    }
  }

  if (typeof metadata !== 'object' || metadata === null) {
    return null
  }

  const meta = metadata as Record<string, unknown>
  const source = meta['policySource'] ?? meta['policy_source']
  if (typeof source !== 'string') return null

  // Validate literal type
  const validSources: CashbackPolicySource[] = ['program_default', 'level_default', 'category_rule', 'legacy']
  if (!validSources.includes(source as any)) return null

  const ruleMaxRewardRaw = meta['ruleMaxReward'] ?? meta['rule_max_reward']
  const levelMinSpendRaw = meta['levelMinSpend'] ?? meta['level_min_spend']

  const normalized: CashbackPolicyMetadata = {
    policySource: source as CashbackPolicySource,
    reason: typeof meta['reason'] === 'string' ? meta['reason'] as string : '',
    rate: typeof meta['rate'] === 'number' && !Number.isNaN(meta['rate'] as number) ? meta['rate'] as number : 0,
    levelId: typeof meta['levelId'] === 'string' ? meta['levelId'] as string : undefined,
    levelName: typeof meta['levelName'] === 'string' ? meta['levelName'] as string : undefined,
    levelMinSpend: typeof levelMinSpendRaw === 'number' && !Number.isNaN(levelMinSpendRaw) ? levelMinSpendRaw : undefined,
    ruleId: typeof meta['ruleId'] === 'string' ? meta['ruleId'] as string : undefined,
    categoryId: typeof meta['categoryId'] === 'string' ? meta['categoryId'] as string : undefined,
    ruleMaxReward: typeof ruleMaxRewardRaw === 'number' && !Number.isNaN(ruleMaxRewardRaw)
      ? ruleMaxRewardRaw
      : ruleMaxRewardRaw === null
        ? null
        : undefined,
  }

  return normalized
}

export function formatPolicyLabel(
  metadata: CashbackPolicyMetadata | null | undefined,
  currencyFormatter: Intl.NumberFormat,
  fallback: string | null = null
) {
  if (!metadata) return fallback

  const rateText = formatPercent(metadata.rate)
  const maxRewardText = typeof metadata.ruleMaxReward === 'number'
    ? `max ${currencyFormatter.format(metadata.ruleMaxReward)}`
    : null
  const levelText = metadata.levelName
    ? `${metadata.levelName}${metadata.levelMinSpend ? ` (>= ${currencyFormatter.format(metadata.levelMinSpend)})` : ''}`
    : null

  const parts: string[] = []

  switch (metadata.policySource) {
    case 'category_rule':
      parts.push(metadata.reason || 'Category rule')
      if (levelText) parts.push(levelText)
      parts.push(rateText)
      if (maxRewardText) parts.push(maxRewardText)
      break
    case 'level_default':
      parts.push(levelText || 'Level default')
      parts.push(rateText)
      break
    case 'program_default':
      parts.push(`Default ${rateText}`)
      if (levelText) parts.push(levelText)
      break
    case 'legacy':
    default:
      parts.push(metadata.reason || 'Default policy')
      parts.push(rateText)
      break
  }

  return parts.filter(Boolean).join(' • ')
}
