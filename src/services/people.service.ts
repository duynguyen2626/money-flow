'use server'

import { randomUUID } from 'crypto'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { MonthlyDebtSummary, Person } from '@/types/moneyflow.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
type AccountRow = Database['public']['Tables']['accounts']['Row']
type SubscriptionMemberRow = Database['public']['Tables']['subscription_members']['Row']

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
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || '917455ba-16c0-42f9-9cea-264f81a3db66'

  const { data, error } = await (supabase
    .from('accounts')
    .insert as any)({
      name: buildDebtAccountName(personName),
      type: 'debt',
      owner_id: userId,
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
  subscriptionIds?: string[]
): Promise<{ profileId: string; debtAccountId: string | null } | null> {
  const supabase = createClient()
  const trimmedName = name?.trim()

  if (!trimmedName) {
    console.error('createPerson called with empty name')
    return null
  }

  const profilePayload: ProfileInsert = {
    id: randomUUID(),
    name: trimmedName,
    email: email?.trim() || null,
    avatar_url: avatar_url?.trim() || null,
    sheet_link: sheet_link?.trim() || null,
  }

  const { data: profile, error: profileError } = await (supabase
    .from('profiles')
    .insert as any)(profilePayload)
    .select('id, name')
    .single()

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

export async function getPeople(): Promise<Person[]> {
  const supabase = createClient()

  const [
    { data: profiles, error: profileError },
    { data: debtAccounts, error: debtError },
    { data: subscriptionMembers, error: subError },
  ] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, avatar_url, sheet_link')
        .order('name', { ascending: true }),
      supabase
        .from('accounts')
        .select('id, owner_id')
        .eq('type', 'debt'),
      supabase
        .from('subscription_members')
        .select(`
          profile_id, 
          subscription_id, 
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
    const { data: lines, error: linesError } = await supabase
      .from('transaction_lines')
      .select('account_id, amount, type')
      .in('account_id', debtAccountIds)

    if (linesError) {
      console.error('Error fetching debt transaction lines:', linesError)
    } else {
      (lines as any[])?.forEach(line => {
        const current = debtBalanceMap.get(line.account_id) ?? 0
        // Debit = Asset Increases (They owe more)
        // Credit = Asset Decreases (They paid back)
        const change = line.type === 'debit' ? Math.abs(line.amount) : -Math.abs(line.amount)
        debtBalanceMap.set(line.account_id, current + change)
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
    const { data: monthlyLines, error: monthlyLinesError } = await supabase
      .from('transaction_lines')
      .select('account_id, amount, type, transactions!inner(tag, occurred_at, status)')
      .eq('type', 'debit')
      .in('account_id', debtAccountIds)
      .neq('transactions.status', 'void')
      .order('occurred_at', { ascending: false, foreignTable: 'transactions' })

    if (monthlyLinesError) {
      console.error('Error fetching monthly debt lines:', monthlyLinesError)
    } else {
      ;(monthlyLines as any[] | null)?.forEach(line => {
        const accountId = line.account_id
        if (!accountId) return

        const ownerId = accountOwnerByAccountId.get(accountId)
        if (!ownerId) return

        const tagValue = line.transactions?.tag ?? null
        const occurredAt = line.transactions?.occurred_at ?? null
        const parsedDate = occurredAt ? new Date(occurredAt) : null
        const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null
        const fallbackKey = validDate ? format(validDate, 'yyyy-MM') : 'unknown'
        const groupingKey = tagValue ?? fallbackKey
        const label =
          tagValue ?? (validDate ? format(validDate, 'MMM yy').toUpperCase() : 'Debt')

        const parsedAmount =
          typeof line.amount === 'string' ? Number.parseFloat(line.amount) : line.amount ?? 0
        const amountValue = Math.abs(Number.isFinite(parsedAmount) ? parsedAmount : 0)

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
      if (row.subscription_id) {
        subscriptionMap.get(row.profile_id)?.push({
          id: row.subscription_id,
          name: row.subscriptions?.name ?? 'Unknown',
          slots: row.slots ?? 1
        })
      }
    })
  }

  return (profiles as ProfileRow[] | null)?.map(person => {
    const debtInfo = debtAccountMap.get(person.id)
    const subs = subscriptionMap.get(person.id) ?? []

    return {
      id: person.id,
      name: person.name,
      email: person.email,
      avatar_url: person.avatar_url,
      sheet_link: person.sheet_link,
      debt_account_id: debtInfo?.id ?? null,
      balance: debtInfo?.balance ?? null,
      subscription_count: subs.length,
      subscription_ids: subs.map(s => s.id), // Keep for backward compatibility if needed
      subscription_details: subs, // New field
      monthly_debts: monthlyDebtsByPerson.get(person.id) ?? [],
    }
  }) ?? []
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
    .from('subscription_members')
    .delete()
    .eq('profile_id', personId)

  if (!subscriptionIds.length) {
    return
  }

  const rows = subscriptionIds.map<Partial<SubscriptionMemberRow>>(id => ({
    subscription_id: id,
    profile_id: personId,
  }))

  const { error } = await (supabase
    .from('subscription_members')
    .insert as any)(rows as SubscriptionMemberRow[])

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
  }
): Promise<boolean> {
  const supabase = createClient()
  const payload: ProfileUpdate = {}
  const normalizedSheetLink =
    typeof data.sheet_link === 'undefined' ? undefined : data.sheet_link?.trim() || null

  if (typeof data.name === 'string') payload.name = data.name.trim()
  if (typeof data.email !== 'undefined') payload.email = data.email?.trim() || null
  if (typeof data.avatar_url !== 'undefined') payload.avatar_url = data.avatar_url?.trim() || null
  if (normalizedSheetLink !== undefined) payload.sheet_link = normalizedSheetLink

  if (Object.keys(payload).length > 0) {
    const { error } = await (supabase.from('profiles').update as any)(payload).eq('id', id)
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

  const [
    { data: profile, error: profileError },
    { data: memberships, error: memberError },
    { data: debtAccounts, error: debtError },
  ] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, avatar_url, sheet_link')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('subscription_members')
        .select('subscription_id')
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

  const subscription_ids = (memberships as { subscription_id: string }[] | null)?.map(
    row => row.subscription_id
  ) ?? []
  const debt_account_id = (debtAccounts as { id: string; current_balance: number }[] | null)?.[0]?.id ?? null
  const balance = (debtAccounts as { id: string; current_balance: number }[] | null)?.[0]?.current_balance ?? null

  return {
    id: (profile as any).id,
    name: (profile as any).name,
    email: (profile as any).email,
    avatar_url: (profile as any).avatar_url,
    sheet_link: (profile as any).sheet_link,
    subscription_ids,
    subscription_count: subscription_ids.length,
    debt_account_id,
    balance,
  }
}
