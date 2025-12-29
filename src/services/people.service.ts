'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { MonthlyDebtSummary, Person, PersonCycleSheet } from '@/types/moneyflow.types'
import { normalizeMonthTag, toYYYYMMFromDate } from '@/lib/month-tag'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
type AccountRow = Database['public']['Tables']['accounts']['Row']
// TODO: The 'service_members' table is not in database.types.ts.
// This is a temporary type definition.
// The database schema needs to be updated.
type ServiceMemberRow = {
  service_id: string;
  profile_id: string;
  slots: number;
  subscriptions?: { name: string };
};

function buildDebtAccountName(personName: string) {
  const safeName = personName?.trim() || 'Nguoi moi'
  return `No phai thu - ${safeName}`
}

async function findExistingDebtAccountId(
  supabase: ReturnType<typeof createClient>,
  personId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('owner_id', personId)
    .eq('type', 'debt')
    .limit(1)

  if (error) {
    console.error('Error checking existing debt account:', error)
    return null
  }

  return (data as Pick<AccountRow, 'id'>[] | null)?.[0]?.id ?? null
}

async function createDebtAccountForPerson(
  supabase: ReturnType<typeof createClient>,
  personId: string,
  personName: string
): Promise<string | null> {
  const { data, error } = await (supabase
    .from('accounts')
    .insert as any)({
      name: buildDebtAccountName(personName),
      type: 'debt',
      owner_id: personId,
      current_balance: 0,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Failed to create debt account for person:', {
      personId,
      message: error?.message ?? 'unknown error',
      code: error?.code,
    })
    return null
  }

  return (data as Pick<AccountRow, 'id'>).id
}

export async function createPerson(
  name: string,
  email?: string,
  avatar_url?: string,
  sheet_link?: string,
  subscriptionIds?: string[],
  opts?: {
    is_owner?: boolean;
    is_archived?: boolean;
    is_group?: boolean;
    group_parent_id?: string | null;
  }
): Promise<{ profileId: string; debtAccountId: string | null } | null> {
  const supabase = createClient()
  const trimmedName = name?.trim()

  if (!trimmedName) {
    console.error('createPerson called with empty name')
    return null
  }

  const profilePayload: ProfileInsert & { is_archived?: boolean | null } = {
    id: randomUUID(),
    name: trimmedName,
    email: email?.trim() || null,
    avatar_url: avatar_url?.trim() || null,
    sheet_link: sheet_link?.trim() || null,
    is_owner: opts?.is_owner ?? null,
    is_archived: typeof opts?.is_archived === 'boolean' ? opts.is_archived : null,
    is_group: typeof opts?.is_group === 'boolean' ? opts.is_group : null,
    group_parent_id:
      typeof opts?.group_parent_id === 'string' ? opts.group_parent_id : null,
  }

  let { data: profile, error: profileError } = await (supabase
    .from('profiles')
    .insert as any)(profilePayload)
    .select('id, name')
    .single()

  if (profileError?.code === '42703' || profileError?.code === 'PGRST204') {
    const {
      is_archived: _ignoreArchived,
      is_owner: _ignoreOwner,
      is_group: _ignoreGroup,
      group_parent_id: _ignoreParent,
      google_sheet_url: _ignoreSheet,
      ...fallbackPayload
    } = profilePayload as any
    const fallback = await (supabase
      .from('profiles')
      .insert as any)(fallbackPayload)
      .select('id, name')
      .single()
    profile = fallback.data
    profileError = fallback.error as any
  }

  if (profileError || !profile) {
    console.error('Failed to create profile:', profileError)
    return null
  }

  const profileId = (profile as Pick<ProfileRow, 'id'>).id

  const debtAccountId = await createDebtAccountForPerson(supabase, profileId, trimmedName)

  if (Array.isArray(subscriptionIds)) {
    await syncSubscriptionMemberships(supabase, profileId, subscriptionIds)
  }

  return {
    profileId,
    debtAccountId,
  }
}

export async function getPeople(options?: { includeArchived?: boolean }): Promise<Person[]> {
  const supabase = createClient()
  const includeArchived = options?.includeArchived ?? false

  // Calculate current month boundaries for cycle debt
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentCycleLabel = toYYYYMMFromDate(now)

  const profileSelect = async () => {
    const attempt = await supabase
      .from('profiles')
      .select(
        'id, created_at, name, email, avatar_url, sheet_link, google_sheet_url, is_owner, is_archived, is_group, group_parent_id'
      )
      .order('name', { ascending: true })
    if (attempt.error?.code === '42703' || attempt.error?.code === 'PGRST204') {
      const fallback = await supabase
        .from('profiles')
        .select('id, created_at, name, email, avatar_url, sheet_link, is_owner')
        .order('name', { ascending: true })
      return { data: fallback.data, error: fallback.error }
    }
    return attempt
  }

  const [
    { data: profiles, error: profileError },
    { data: debtAccounts, error: debtError },
    { data: subscriptionMembers, error: subError },
  ] =
    await Promise.all([
      profileSelect(),
      supabase
        .from('accounts')
        .select('id, owner_id')
        .eq('type', 'debt'),
      supabase
        .from('service_members')
        .select(`
          profile_id, 
          service_id, 
          slots,
          subscriptions ( name, shop_id, shops ( image_url ) )
        `),
    ])

  if (profileError) {
    console.error('Error fetching people profiles:', profileError)
    return []
  }

  if (debtError) {
    console.error('Error fetching debt accounts for people:', JSON.stringify(debtError, null, 2))
  }

  if (subError) {
    console.error('Error fetching subscription memberships for people:', JSON.stringify(subError, null, 2))
  }

  // Calculate balances from transactions
  // Note: Some debt transactions use person_id instead of target_account_id
  const debtAccountIds = (debtAccounts as AccountRow[])?.map(a => a.id) ?? []
  const personIds = (profiles as ProfileRow[])?.map(p => p.id) ?? []
  const debtBalanceByPerson = new Map<string, number>()
  const currentCycleDebtByPerson = new Map<string, number>()

  let cycleSheets: PersonCycleSheet[] = []
  if (personIds.length > 0) {
    const { data, error } = await (supabase as any)
      .from('person_cycle_sheets')
      .select('id, person_id, cycle_tag, sheet_id, sheet_url, created_at, updated_at')
      .in('person_id', personIds)

    if (error) {
      console.warn('Unable to load person cycle sheets:', error)
    } else if (Array.isArray(data)) {
      cycleSheets = data as PersonCycleSheet[]
    }
  }

  // Build mapping from debt account to person
  const debtAccountToPersonMap = new Map<string, string>()
  if (Array.isArray(debtAccounts)) {
    (debtAccounts as AccountRow[]).forEach(account => {
      if (account.owner_id) {
        debtAccountToPersonMap.set(account.id, account.owner_id)
      }
    })
  }

  // Query debt transactions - include both target_account_id and person_id queries
  if (personIds.length > 0) {
    const { data: txns, error: txnsError } = await supabase
      .from('transactions')
      .select('account_id, target_account_id, person_id, amount, status, occurred_at, type, tag, cashback_share_percent, cashback_share_fixed, final_price')
      .eq('type', 'debt')
      .neq('status', 'void')

    if (txnsError) {
      console.error('Error fetching debt transactions:', JSON.stringify(txnsError, null, 2))
      console.error('Error Details:', (txnsError as any)?.message, (txnsError as any)?.details)
    } else {
      (txns as any[])?.forEach(txn => {
        const txnDate = txn.occurred_at ? new Date(txn.occurred_at) : null
        const currentMonthTag = toYYYYMMFromDate(new Date())
        const normalizedTag = normalizeMonthTag(txn.tag) ?? txn.tag
        const isCurrentCycle = (txnDate && txnDate >= currentMonthStart) || (normalizedTag === currentMonthTag)

        // Determine which person this debt belongs to
        let personId: string | null = null

        // Check if person_id is set directly on transaction
        if (txn.person_id && personIds.includes(txn.person_id)) {
          personId = txn.person_id
        }
        // Or check if target_account_id is a debt account
        else if (txn.target_account_id && debtAccountToPersonMap.has(txn.target_account_id)) {
          personId = debtAccountToPersonMap.get(txn.target_account_id) ?? null
        }

        if (personId) {
          // Debugging Cycle Logic
          // if (personId === '1f4f286e-d24f-47f3-ab04-14bce424f89a') { // Optional: Filter by specific person if known
          // console.log(`[DebLogic] Txn Date: ${txnDate}, CurrentStart: ${currentMonthStart}, Tag: ${txn.tag}, CurrentTag: ${currentMonthTag}, IsCurrent: ${isCurrentCycle}, Amount: ${txn.amount}`)
          // }

          // Calculate final price (Prefer DB final_price > Calc)
          let finalPrice = 0
          if (typeof (txn as any).final_price === 'number') {
            finalPrice = Math.abs((txn as any).final_price)
          } else {
            const rawAmount = Math.abs(txn.amount)
            const percentVal = Number(txn.cashback_share_percent ?? 0)
            const fixedVal = Number(txn.cashback_share_fixed ?? 0)
            const normalizedPercent = percentVal > 1 ? percentVal / 100 : percentVal
            const cashback = (rawAmount * normalizedPercent) + fixedVal
            finalPrice = rawAmount - cashback
          }

          const current = debtBalanceByPerson.get(personId) ?? 0
          debtBalanceByPerson.set(personId, current + finalPrice)

          // Track current cycle debt separately
          // STRICTER LOGIC: If tag exists, it MUST match. If no tag, check date.
          const isStrictlyCurrentCycle = txn.tag
            ? normalizedTag === currentMonthTag
            : (txnDate && txnDate >= currentMonthStart)

          if (isStrictlyCurrentCycle) {
            const currentCycle = currentCycleDebtByPerson.get(personId) ?? 0
            currentCycleDebtByPerson.set(personId, currentCycle + finalPrice)
          }
        }
      })
    }
  }

  // Also query repayment transactions to subtract from debt
  if (personIds.length > 0) {
    const { data: repayTxns, error: repayError } = await supabase
      .from('transactions')
      .select('person_id, amount, status, cashback_share_percent, cashback_share_fixed, final_price')
      .eq('type', 'repayment')
      .neq('status', 'void')

    if (!repayError && repayTxns) {
      (repayTxns as any[]).forEach(txn => {
        if (txn.person_id && personIds.includes(txn.person_id)) {
          // Calculate final price (Prefer DB final_price > Calc)
          let finalPrice = 0
          if (typeof (txn as any).final_price === 'number') {
            finalPrice = Math.abs((txn as any).final_price)
          } else {
            const rawAmount = Math.abs(txn.amount)
            const percentVal = Number(txn.cashback_share_percent ?? 0)
            const fixedVal = Number(txn.cashback_share_fixed ?? 0)
            const normalizedPercent = percentVal > 1 ? percentVal / 100 : percentVal
            const cashback = (rawAmount * normalizedPercent) + fixedVal
            finalPrice = rawAmount - cashback
          }

          const current = debtBalanceByPerson.get(txn.person_id) ?? 0
          debtBalanceByPerson.set(txn.person_id, current - finalPrice)
        }
      })
    }
  }

  const debtAccountMap = new Map<string, { id: string; balance: number; currentCycleDebt: number }>()
  const accountOwnerByAccountId = new Map<string, string>()
  if (Array.isArray(debtAccounts)) {
    (debtAccounts as AccountRow[]).forEach(account => {
      if (account.owner_id) {
        const balance = debtBalanceByPerson.get(account.owner_id) ?? 0
        const currentCycleDebt = currentCycleDebtByPerson.get(account.owner_id) ?? 0
        debtAccountMap.set(account.owner_id, {
          id: account.id,
          balance,
          currentCycleDebt,
        })
        accountOwnerByAccountId.set(account.id, account.owner_id)
      }
    })
  }

  const monthlyDebtMap = new Map<string, Map<string, MonthlyDebtSummary>>()

  // Fetch debt transactions for monthly breakdown
  if (personIds.length > 0) {
    const { data: monthlyTxns, error: monthlyTxnsError } = await supabase
      .from('transactions')
      .select('person_id, target_account_id, amount, occurred_at, tag, status, cashback_share_percent, cashback_share_fixed, final_price')
      .eq('type', 'debt')
      .neq('status', 'void')
      .order('occurred_at', { ascending: false })

    if (monthlyTxnsError) {
      console.error('Error fetching monthly debt lines:', JSON.stringify(monthlyTxnsError, null, 2))
    } else {
      (monthlyTxns as any[])?.forEach(txn => {
        // Determine which person this belongs to
        let ownerId: string | null = null

        if (txn.person_id && personIds.includes(txn.person_id)) {
          ownerId = txn.person_id
        } else if (txn.target_account_id && debtAccountToPersonMap.has(txn.target_account_id)) {
          ownerId = debtAccountToPersonMap.get(txn.target_account_id) ?? null
        }

        if (!ownerId) return

        const tagValue = normalizeMonthTag(txn.tag) ?? txn.tag ?? null
        const occurredAt = txn.occurred_at ?? null
        const parsedDate = occurredAt ? new Date(occurredAt) : null
        const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null
        const fallbackKey = validDate ? toYYYYMMFromDate(validDate) : null
        const groupingKey = tagValue ?? fallbackKey ?? 'unknown'
        const label = groupingKey === 'unknown' ? 'Debt' : groupingKey

        // Calculate final price using DB column if available
        let finalPrice = 0
        const rawAmount = Math.abs(txn.amount)
        const percentVal = Number(txn.cashback_share_percent ?? 0)
        const fixedVal = Number(txn.cashback_share_fixed ?? 0)
        const normalizedPercent = percentVal > 1 ? percentVal / 100 : percentVal
        const cashback = (rawAmount * normalizedPercent) + fixedVal

        if (typeof (txn as any).final_price === 'number') {
          finalPrice = Math.abs((txn as any).final_price)
        } else {
          finalPrice = rawAmount - cashback
        }

        const personMap = monthlyDebtMap.get(ownerId) ?? new Map<string, MonthlyDebtSummary>()
        const existing = personMap.get(groupingKey)

        const updated: MonthlyDebtSummary = existing
          ? {
            ...existing,
            amount: existing.amount + finalPrice, // Keep Net Debt Balance
            total_debt: (existing.total_debt ?? 0) + rawAmount,
            total_cashback: (existing.total_cashback ?? 0) + cashback,
            occurred_at: existing.occurred_at ?? (validDate ? validDate.toISOString() : occurredAt),
            last_activity: !existing.last_activity || (occurredAt && occurredAt > existing.last_activity) ? (occurredAt || undefined) : existing.last_activity,
          }
          : {
            tag: tagValue ?? undefined,
            tagLabel: label,
            amount: finalPrice,
            total_debt: rawAmount,
            total_cashback: cashback,
            total_repaid: 0,
            status: 'active',
            occurred_at: validDate ? validDate.toISOString() : occurredAt ?? undefined,
            last_activity: occurredAt ?? undefined,
          }

        personMap.set(groupingKey, updated)
        monthlyDebtMap.set(ownerId, personMap)
      })
    }
  }

  // 2. Fetch Repayments (to update balance & total_repaid)
  if (personIds.length > 0) {
    const { data: repayTxns, error: repayError } = await supabase
      .from('transactions')
      .select('person_id, amount, occurred_at, tag, status')
      .eq('type', 'repayment')
      .neq('status', 'void')

    if (!repayError && repayTxns) {
      (repayTxns as any[]).forEach(txn => {
        if (!txn.person_id || !personIds.includes(txn.person_id)) return

        const ownerId = txn.person_id
        const amount = Math.abs(txn.amount)
        const tagValue = normalizeMonthTag(txn.tag) ?? txn.tag ?? null
        const occurredAt = txn.occurred_at ?? null
        const parsedDate = occurredAt ? new Date(occurredAt) : null
        const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null
        const fallbackKey = validDate ? toYYYYMMFromDate(validDate) : null
        // Repayments should match the tag of the debt if possible, or fallback to date
        // Ideally repayments have the SAME TAG as the debt they are repaying.
        const groupingKey = tagValue ?? fallbackKey ?? 'unknown'
        const label = groupingKey === 'unknown' ? 'Repayment' : groupingKey

        // Update current cycle debt if repayment is in current cycle
        const currentMonthTag = toYYYYMMFromDate(new Date())
        const normalizedTag = normalizeMonthTag(txn.tag) ?? txn.tag
        const isCurrentCycle = (validDate && validDate >= currentMonthStart) || (normalizedTag === currentMonthTag)

        if (isCurrentCycle) {
          const currentCycle = currentCycleDebtByPerson.get(ownerId) ?? 0
          currentCycleDebtByPerson.set(ownerId, currentCycle - amount)
        }

        const personMap = monthlyDebtMap.get(ownerId) ?? new Map<string, MonthlyDebtSummary>()
        const existing = personMap.get(groupingKey)

        // For repayments, we subtract from balance (amount) and add to total_repaid
        const updated: MonthlyDebtSummary = existing
          ? {
            ...existing,
            amount: existing.amount - amount,
            total_repaid: (existing.total_repaid ?? 0) + amount,
            last_activity: !existing.last_activity || (occurredAt && occurredAt > existing.last_activity) ? (occurredAt || undefined) : existing.last_activity,
          }
          : {
            tag: tagValue ?? undefined,
            tagLabel: label,
            amount: -amount, // Negative balance if no debt yet (overpaid?)
            total_debt: 0,
            total_cashback: 0,
            total_repaid: amount,
            status: 'active',
            occurred_at: validDate ? validDate.toISOString() : occurredAt ?? undefined,
            last_activity: occurredAt ?? undefined,
          }

        personMap.set(groupingKey, updated)
        monthlyDebtMap.set(ownerId, personMap)
      })
    }
  }

  const monthlyDebtsByPerson = new Map<string, MonthlyDebtSummary[]>()
  monthlyDebtMap.forEach((tagMap, personId) => {
    const entries = Array.from(tagMap.values())
      .sort((a, b) => {
        const dateA = a.occurred_at ? new Date(a.occurred_at).getTime() : 0
        const dateB = b.occurred_at ? new Date(b.occurred_at).getTime() : 0
        return dateB - dateA
      })
      .slice(0, 5) // Keep more for expandable list

    monthlyDebtsByPerson.set(personId, entries)
  })

  const subscriptionMap = new Map<string, Array<{ id: string; name: string; slots: number; image_url?: string | null }>>()
  if (Array.isArray(subscriptionMembers)) {
    (subscriptionMembers as any[]).forEach(row => {
      if (!row.profile_id) return
      if (!subscriptionMap.has(row.profile_id)) {
        subscriptionMap.set(row.profile_id, [])
      }
      if (row.service_id) {
        // Extract image_url from nested shops relation
        const imageUrl = row.subscriptions?.shops?.image_url ?? null
        subscriptionMap.get(row.profile_id)?.push({
          id: row.service_id,
          name: row.subscriptions?.name ?? 'Unknown',
          slots: row.slots ?? 1,
          image_url: imageUrl,
        })
      }
    })
  }

  const cycleSheetMap = new Map<string, PersonCycleSheet[]>()
  if (cycleSheets.length > 0) {
    cycleSheets.forEach((sheet) => {
      const existing = cycleSheetMap.get(sheet.person_id) ?? []
      existing.push(sheet)
      cycleSheetMap.set(sheet.person_id, existing)
    })
  }

  const mapped = (profiles as ProfileRow[] | null)?.map(person => {
    const debtInfo = debtAccountMap.get(person.id)
    const subs = subscriptionMap.get(person.id) ?? []
    const balance = debtInfo?.balance ?? 0
    const currentCycleDebt = debtInfo?.currentCycleDebt ?? 0
    const outstandingDebt = Math.max(0, balance - currentCycleDebt)

    return {
      id: person.id,
      name: person.name ?? '',
      email: person.email,
      avatar_url: person.avatar_url,
      sheet_link: person.sheet_link,
      google_sheet_url: person.google_sheet_url,
      is_owner: (person as any).is_owner ?? null,
      is_archived: (person as any).is_archived ?? null,
      is_group: (person as any).is_group ?? null,
      group_parent_id: (person as any).group_parent_id ?? null,
      debt_account_id: debtInfo?.id ?? null,
      balance: balance,
      current_cycle_debt: currentCycleDebt,
      outstanding_debt: outstandingDebt,
      current_cycle_label: currentCycleLabel,
      subscription_count: subs.length,
      subscription_ids: subs.map(s => s.id), // Keep for backward compatibility if needed
      subscription_details: subs, // Now includes image_url
      monthly_debts: monthlyDebtsByPerson.get(person.id) ?? [],
      cycle_sheets: cycleSheetMap.get(person.id) ?? [],
    }
  }) ?? []

  if (includeArchived) return mapped.sort(sortPeopleByDebtAmount)
  return mapped.filter(person => !person.is_archived).sort(sortPeopleByDebtAmount)
}

function sortPeopleByDebtAmount(a: Person, b: Person): number {
  // Sort by Current Cycle Debt (Desc)
  // "biggest Tab debt remains" -> The Badge Value
  const debtA = a.current_cycle_debt ?? 0
  const debtB = b.current_cycle_debt ?? 0

  if (debtB !== debtA) {
    return debtB - debtA
  }

  // Fallback: Last Activity
  const getLastActivity = (p: Person) => {
    if (!p.monthly_debts || p.monthly_debts.length === 0) return 0
    const latest = p.monthly_debts[0]
    return latest.occurred_at ? new Date(latest.occurred_at).getTime() : 0
  }
  return getLastActivity(b) - getLastActivity(a)
}


export async function ensureDebtAccount(
  personId: string,
  personName?: string
): Promise<string | null> {
  const supabase = createClient()

  const existingId = await findExistingDebtAccountId(supabase, personId)
  if (existingId) {
    return existingId
  }

  return createDebtAccountForPerson(supabase, personId, personName ?? 'Nguoi dung')
}

async function syncSubscriptionMemberships(
  supabase: ReturnType<typeof createClient>,
  personId: string,
  subscriptionIds: string[]
) {
  await supabase
    .from('service_members')
    .delete()
    .eq('profile_id', personId)

  if (!subscriptionIds.length) {
    return
  }

  const rows = subscriptionIds.map<Partial<ServiceMemberRow>>(id => ({
    service_id: id,
    profile_id: personId,
  }))

  const { error } = await (supabase
    .from('service_members')
    .insert as any)(rows as ServiceMemberRow[])

  if (error) {
    console.error('Failed to sync subscription memberships:', error)
  }
}

export async function updatePerson(
  id: string,
  data: {
    name?: string
    email?: string | null
    avatar_url?: string | null
    sheet_link?: string | null
    google_sheet_url?: string | null
    subscriptionIds?: string[]
    is_owner?: boolean
    is_archived?: boolean
    is_group?: boolean
    group_parent_id?: string | null
  }
): Promise<boolean> {
  const supabase = createClient()
  const payload: ProfileUpdate & { is_archived?: boolean } = {}
  const normalizedSheetLink =
    typeof data.sheet_link === 'undefined' ? undefined : data.sheet_link?.trim() || null
  const normalizedGoogleSheetUrl =
    typeof data.google_sheet_url === 'undefined' ? undefined : data.google_sheet_url?.trim() || null

  if (typeof data.name === 'string') payload.name = data.name.trim()
  if (typeof data.email !== 'undefined') payload.email = data.email?.trim() || null
  if (typeof data.avatar_url !== 'undefined') payload.avatar_url = data.avatar_url?.trim() || null
  if (normalizedSheetLink !== undefined) payload.sheet_link = normalizedSheetLink
  if (normalizedGoogleSheetUrl !== undefined) payload.google_sheet_url = normalizedGoogleSheetUrl
  if (typeof data.is_owner === 'boolean') payload.is_owner = data.is_owner
  if (typeof data.is_archived === 'boolean') payload.is_archived = data.is_archived
  if (typeof data.is_group === 'boolean') payload.is_group = data.is_group
  if (typeof data.group_parent_id !== 'undefined') {
    payload.group_parent_id = data.group_parent_id ? data.group_parent_id : null
  }

  console.log('updatePerson payload:', { id, payload })

  if (Object.keys(payload).length > 0) {
    let { error } = await (supabase.from('profiles').update as any)(payload).eq('id', id)
    if (error?.code === '42703' || error?.code === 'PGRST204') {
      const {
        is_archived: _ignoreArchived,
        is_owner: _ignoreOwner,
        is_group: _ignoreGroup,
        group_parent_id: _ignoreParent,
        google_sheet_url: _ignoreSheet,
        ...fallbackPayload
      } = payload as any
      const fallback = await (supabase.from('profiles').update as any)(fallbackPayload).eq('id', id)
      error = fallback.error
    }
    if (error) {
      console.error('Failed to update profile:', error)
      return false
    }
  }

  if (Array.isArray(data.subscriptionIds)) {
    await syncSubscriptionMemberships(supabase, id, data.subscriptionIds)
  }

  return true
}

export async function getPersonWithSubs(id: string): Promise<Person | null> {
  const supabase = createClient()

  const profileSelect = async () => {
    const attempt = await supabase
      .from('profiles')
      .select(
        'id, name, email, avatar_url, sheet_link, google_sheet_url, is_owner, is_archived, is_group, group_parent_id'
      )
      .eq('id', id)
      .maybeSingle()

    if (attempt.error?.code === '42703' || attempt.error?.code === 'PGRST204') {
      const fallback = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, sheet_link, is_owner')
        .eq('id', id)
        .maybeSingle()
      return { data: fallback.data, error: fallback.error }
    }
    return attempt
  }

  const [
    { data: profile, error: profileError },
    { data: memberships, error: memberError },
    { data: debtAccounts, error: debtError },
  ] =
    await Promise.all([
      profileSelect(),
      supabase
        .from('service_members')
        .select('service_id')
        .eq('profile_id', id),
      supabase
        .from('accounts')
        .select('id, current_balance')
        .eq('owner_id', id)
        .eq('type', 'debt')
        .limit(1),
    ])

  if (profileError) {
    console.error('Failed to load profile:', profileError)
    return null
  }

  if (!profile) {
    return null
  }

  if (memberError) {
    console.error('Failed to load subscription memberships for person:', memberError)
  }
  if (debtError) {
    console.error('Failed to load debt account for person:', debtError)
  }

  const subscription_ids = (memberships as { service_id: string }[] | null)?.map(
    row => row.service_id
  ) ?? []
  const debt_account_id = (debtAccounts as { id: string; current_balance: number }[] | null)?.[0]?.id ?? null

  // [M2-SP1] Fix: Calculate balance dynamically to exclude void transactions (Phantom Debt Fix)
  let balance = 0;
  if (debt_account_id) {
    const { data: txns } = await supabase
      .from('transactions')
      .select('account_id, target_account_id, amount, status, final_price')
      .or(`account_id.eq.${debt_account_id},target_account_id.eq.${debt_account_id}`)
      .neq('status', 'void');

    if (txns) {
      (txns as any[]).forEach((txn: any) => {
        const amount = typeof txn.final_price === 'number' ? txn.final_price : txn.amount;
        if (txn.account_id === debt_account_id) {
          balance += amount; // Outflow decreases balance
        }
        if (txn.target_account_id === debt_account_id) {
          balance += Math.abs(amount); // Inflow increases balance
        }
      });
    }
  } else {
    balance = (debtAccounts as { id: string; current_balance: number }[] | null)?.[0]?.current_balance ?? 0;
  }

  return {
    id: (profile as any).id,
    name: (profile as any).name,
    email: (profile as any).email,
    avatar_url: (profile as any).avatar_url,
    sheet_link: (profile as any).sheet_link,
    google_sheet_url: (profile as any).google_sheet_url,
    is_owner: (profile as any).is_owner ?? null,
    is_archived: (profile as any).is_archived ?? null,
    is_group: (profile as any).is_group ?? null,
    group_parent_id: (profile as any).group_parent_id ?? null,
    subscription_ids,
    subscription_count: subscription_ids.length,
    debt_account_id,
    balance,
  }
}
