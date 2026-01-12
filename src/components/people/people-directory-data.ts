import { MonthlyDebtSummary, Person, PersonCycleSheet } from '@/types/moneyflow.types'
import { isYYYYMM, normalizeMonthTag } from '@/lib/month-tag'

export type PeopleDirectoryItem = {
  id: string
  name: string
  image_url: string | null
  person: Person
  isOwner?: boolean | null
  subscriptions: Array<{ id: string; name: string; slots: number; image_url?: string | null }>
  cycleTag: string
  remains: number
  paid: number
  isSettled: boolean
  additionalActiveCycles: number
  sheetUrl: string | null
  hasScriptLink: boolean
}

const FALLBACK_TAG = 'Untagged'

function isValidLink(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed)
}

function toCycleTag(value: string | null | undefined): string {
  if (!value) return FALLBACK_TAG
  const normalized = normalizeMonthTag(value) ?? value
  return isYYYYMM(normalized) ? normalized : FALLBACK_TAG
}

function normalizeDebts(monthlyDebts: MonthlyDebtSummary[] | undefined) {
  return (monthlyDebts ?? []).map((debt) => {
    const rawTag = debt.tagLabel || debt.tag || ''
    return {
      ...debt,
      cycleTag: toCycleTag(rawTag),
      amount: Number(debt.amount ?? 0),
      total_repaid: Number(debt.total_repaid ?? 0),
    }
  })
}

function findPrimaryDebt(
  monthlyDebts: MonthlyDebtSummary[] | undefined,
  currentCycleLabel: string | null | undefined
) {
  const debts = normalizeDebts(monthlyDebts)
  if (debts.length === 0) return null

  const activeDebts = debts.filter((debt) => debt.amount > 0)
  if (activeDebts.length > 0) {
    return { primary: activeDebts[0], activeCount: activeDebts.length }
  }

  const normalizedCurrent = toCycleTag(currentCycleLabel ?? '')
  const currentMatch = debts.find((debt) => debt.cycleTag === normalizedCurrent)
  return { primary: currentMatch ?? debts[0], activeCount: 0 }
}

function findCycleSheet(
  cycleSheets: PersonCycleSheet[] | undefined,
  cycleTag: string
): PersonCycleSheet | null {
  if (!cycleSheets?.length) return null
  const normalizedTag = toCycleTag(cycleTag)
  return (
    cycleSheets.find((sheet) => toCycleTag(sheet.cycle_tag) === normalizedTag) ?? null
  )
}

export function buildPeopleDirectoryItems(people: Person[]): PeopleDirectoryItem[] {
  return people.map((person) => {
    const result = findPrimaryDebt(person.monthly_debts, person.current_cycle_label)
    const primary = result?.primary
    const cycleTag = primary ? primary.cycleTag : toCycleTag(person.current_cycle_label ?? '')
    const remains = Math.max(0, primary?.amount ?? 0)
    const paid = Math.max(0, primary?.total_repaid ?? 0)
    const isSettled = Math.abs(primary?.amount ?? 0) < 1
    const additionalActiveCycles = Math.max(0, (result?.activeCount ?? 0) - 1)
    const cycleSheet = findCycleSheet(person.cycle_sheets, cycleTag)
    const hasScriptLink = isValidLink(person.sheet_link ?? null)

    return {
      id: person.id,
      name: person.name,
      image_url: person.image_url ?? null,
      person,
      isOwner: person.is_owner ?? null,
      subscriptions: person.subscription_details ?? [],
      cycleTag,
      remains,
      paid,
      isSettled,
      additionalActiveCycles,
      sheetUrl: cycleSheet?.sheet_url ?? null,
      hasScriptLink,
    }
  })
}
