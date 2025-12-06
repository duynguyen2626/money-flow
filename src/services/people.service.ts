'use server'

import { randomUUID } from 'crypto'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { MonthlyDebtSummary, Person } from '@/types/moneyflow.types'

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
  opts?: { is_owner?: boolean; is_archived?: boolean }
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
  }

  let { data: profile, error: profileError } = await (supabase
    .from('profiles')
    .insert as any)(profilePayload)
    .select('id, name')
    .single()

  if (profileError?.code === '42703') {
    const { is_archived: _ignoreArchived, is_owner: _ignoreOwner, ...fallbackPayload } = profilePayload
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

  const profileSelect = async () => {
    const attempt = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, sheet_link, is_owner, is_archived')
      .order('name', { ascending: true })
    if (attempt.error?.code === '42703') {
      const fallback = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, sheet_link, is_owner')
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
          subscriptions ( name )
        `),
    ])

  if (profileError) {
    console.error('Error fetching people profiles:', profileError)
    return []
  }

  if (debtError) {
    console.error('Error fetching debt accounts for people:', debtError)
  }

  if (subError) {
    console.error('Error fetching subscription memberships for people:', subError)
  }

  // Calculate balances from transaction lines
  const debtAccountIds = (debtAccounts as AccountRow[])?.map(a => a.id) ?? []
  const debtBalanceMap = new Map<string, number>()

  if (debtAccountIds.length > 0) {
    const { data: txns, error: txnsError } = await supabase
      .from('transactions')
      .select('account_id, target_account_id, amount, status')
      .or(`account_id.in.(${debtAccountIds.join(',')}),target_account_id.in.(${debtAccountIds.join(',')})`)
      // [M2-SP1] Fix: Exclude void transactions
      .neq('status', 'void')

    if (txnsError) {
      console.error('Error fetching debt transactions:', txnsError)
    } else {
      (txns as any[])?.forEach(txn => {
        // If account_id is debt account: Money leaving it (usually repayment/outflow) -> Balance decreases (amount is usually negative)
        // If target_account_id is debt account: Money entering it (usually lending/inflow) -> Balance increases (add abs amount)

        // Check if account_id is one of our debt accounts
        if (txn.account_id && debtAccountIds.includes(txn.account_id)) {
          const current = debtBalanceMap.get(txn.account_id) ?? 0
          // amount is negative for outflow. So adding it decreases balance.
          // However, if we lend money, account_id is BANK. target is DEBT.
          // If we repay money, account_id is DEBT?? No, typically Repayment is Expense for Person.
          // Let's stick to standard flow:
          // Lent: Bank -> Debt (Target). Target Balance increases.
          // Repaid: Debt (Source) -> Bank. Source Balance decreases.

          debtBalanceMap.set(txn.account_id, current + txn.amount)
        }

        // Check if target_account_id is one of our debt accounts
        if (txn.target_account_id && debtAccountIds.includes(txn.target_account_id)) {
          const current = debtBalanceMap.get(txn.target_account_id) ?? 0
          debtBalanceMap.set(txn.target_account_id, current + Math.abs(txn.amount))
        }
      })
    }
  }

  const debtAccountMap = new Map<string, { id: string; balance: number }>()
  const accountOwnerByAccountId = new Map<string, string>()
  if (Array.isArray(debtAccounts)) {
    (debtAccounts as AccountRow[]).forEach(account => {
      if (account.owner_id) {
        debtAccountMap.set(account.owner_id, {
          id: account.id,
          balance: debtBalanceMap.get(account.id) ?? 0,
        })
        accountOwnerByAccountId.set(account.id, account.owner_id)
      }
    })
  }

  const monthlyDebtMap = new Map<string, Map<string, MonthlyDebtSummary>>()

  if (debtAccountIds.length > 0) {
    // Fetch Lending transactions (where debt account is the target)
    const { data: monthlyTxns, error: monthlyTxnsError } = await supabase
      .from('transactions')
      .select('target_account_id, amount, occurred_at, tag, status')
      .in('target_account_id', debtAccountIds)
      .neq('status', 'void')
      .order('occurred_at', { ascending: false })

    if (monthlyTxnsError) {
      console.error('Error fetching monthly debt lines:', JSON.stringify(monthlyTxnsError, null, 2))
    } else {
      (monthlyTxns as any[])?.forEach(txn => {
        const accountId = txn.target_account_id
        if (!accountId) return

        const ownerId = accountOwnerByAccountId.get(accountId)
        if (!ownerId) return

        const tagValue = txn.tag ?? null
        const occurredAt = txn.occurred_at ?? null
        const parsedDate = occurredAt ? new Date(occurredAt) : null
        const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null
        const fallbackKey = validDate ? format(validDate, 'yyyy-MM') : 'unknown'
        const groupingKey = tagValue ?? fallbackKey
        const label =
          tagValue ?? (validDate ? format(validDate, 'MMM yy', { locale: enUS }).toUpperCase() : 'Debt')

        // Amount is inflow to debt account (Lending), so it's positive debt.
        // Usually amount from source is negative, but we want the magnitude added to debt.
        const amountValue = Math.abs(txn.amount)

        const personMap = monthlyDebtMap.get(ownerId) ?? new Map<string, MonthlyDebtSummary>()
        const existing = personMap.get(groupingKey)

        const updated: MonthlyDebtSummary = existing
          ? {
            ...existing,
            amount: existing.amount + amountValue,
            occurred_at: existing.occurred_at ?? (validDate ? validDate.toISOString() : occurredAt),
          }
          : {
            tag: tagValue ?? undefined,
            tagLabel: label,
            amount: amountValue,
            occurred_at: validDate ? validDate.toISOString() : occurredAt ?? undefined,
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
      .slice(0, 3)

    monthlyDebtsByPerson.set(personId, entries)
  })

  const subscriptionMap = new Map<string, Array<{ id: string; name: string; slots: number }>>()
  if (Array.isArray(subscriptionMembers)) {
    (subscriptionMembers as any[]).forEach(row => {
      if (!row.profile_id) return
      if (!subscriptionMap.has(row.profile_id)) {
        subscriptionMap.set(row.profile_id, [])
      }
      if (row.service_id) {
        subscriptionMap.get(row.profile_id)?.push({
          id: row.service_id,
          name: row.subscriptions?.name ?? 'Unknown',
          slots: row.slots ?? 1
        })
      }
    })
  }

  const mapped = (profiles as ProfileRow[] | null)?.map(person => {
    const debtInfo = debtAccountMap.get(person.id)
    const subs = subscriptionMap.get(person.id) ?? []

    return {
      id: person.id,
      name: person.name,
      email: person.email,
      avatar_url: person.avatar_url,
      sheet_link: person.sheet_link,
      is_owner: (person as any).is_owner ?? null,
      is_archived: (person as any).is_archived ?? null,
      debt_account_id: debtInfo?.id ?? null,
      balance: debtInfo?.balance ?? null,
      subscription_count: subs.length,
      subscription_ids: subs.map(s => s.id), // Keep for backward compatibility if needed
      subscription_details: subs, // New field
      monthly_debts: monthlyDebtsByPerson.get(person.id) ?? [],
    }
  }) ?? []

  if (includeArchived) return mapped
  return mapped.filter(person => !person.is_archived)
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
    subscriptionIds?: string[]
    is_owner?: boolean
    is_archived?: boolean
  }
): Promise<boolean> {
  const supabase = createClient()
  const payload: ProfileUpdate & { is_archived?: boolean } = {}
  const normalizedSheetLink =
    typeof data.sheet_link === 'undefined' ? undefined : data.sheet_link?.trim() || null

  if (typeof data.name === 'string') payload.name = data.name.trim()
  if (typeof data.email !== 'undefined') payload.email = data.email?.trim() || null
  if (typeof data.avatar_url !== 'undefined') payload.avatar_url = data.avatar_url?.trim() || null
  if (normalizedSheetLink !== undefined) payload.sheet_link = normalizedSheetLink
  if (typeof data.is_owner === 'boolean') payload.is_owner = data.is_owner
  if (typeof data.is_archived === 'boolean') payload.is_archived = data.is_archived

  if (Object.keys(payload).length > 0) {
    let { error } = await (supabase.from('profiles').update as any)(payload).eq('id', id)
    if (error?.code === '42703') {
      const { is_archived: _ignoreArchived, is_owner: _ignoreOwner, ...fallbackPayload } = payload
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
      .select('id, name, email, avatar_url, sheet_link, is_owner, is_archived')
      .eq('id', id)
      .maybeSingle()

    if (attempt.error?.code === '42703') {
      const fallback = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, sheet_link, is_owner')
        .eq('id', id)
        .maybeSingle()
      return fallback
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
      .select('account_id, target_account_id, amount, status')
      .or(`account_id.eq.${debt_account_id},target_account_id.eq.${debt_account_id}`)
      .neq('status', 'void');

    if (txns) {
      (txns as any[]).forEach((txn: any) => {
        if (txn.account_id === debt_account_id) {
          balance += txn.amount; // Outflow decreases balance
        }
        if (txn.target_account_id === debt_account_id) {
          balance += Math.abs(txn.amount); // Inflow increases balance
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
    is_owner: (profile as any).is_owner ?? null,
    is_archived: (profile as any).is_archived ?? null,
    subscription_ids,
    subscription_count: subscription_ids.length,
    debt_account_id,
    balance,
  }
}
