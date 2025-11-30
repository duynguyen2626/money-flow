'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { Person } from '@/types/moneyflow.types'

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
        .select('id, owner_id, current_balance')
        .eq('type', 'debt'),
      supabase.from('subscription_members').select('profile_id, subscription_id'),
    ])

  if (profileError) {
    console.error('Error fetching people profiles:', {
      message: profileError.message,
      code: profileError.code,
      details: profileError.details,
    })
    return []
  }

  if (debtError) {
    console.error('Error fetching debt accounts for people:', {
      message: debtError.message,
      code: debtError.code,
      details: debtError.details,
    })
  }

  if (subError) {
    console.error('Error fetching subscription memberships for people:', {
      message: subError.message,
      code: subError.code,
      details: subError.details,
    })
  }

  const debtAccountMap = new Map<string, { id: string; balance: number }>()
  if (Array.isArray(debtAccounts)) {
    (debtAccounts as AccountRow[]).forEach(account => {
      if (account.owner_id) {
        debtAccountMap.set(account.owner_id, {
          id: account.id,
          balance: account.current_balance ?? 0,
        })
      }
    })
  }

  const subscriptionCountMap = new Map<string, number>()
  const subscriptionIdsMap = new Map<string, Set<string>>()
  if (Array.isArray(subscriptionMembers)) {
    ; (subscriptionMembers as { profile_id: string; subscription_id?: string }[]).forEach(row => {
      if (!row.profile_id) return
      subscriptionCountMap.set(row.profile_id, (subscriptionCountMap.get(row.profile_id) ?? 0) + 1)
      if (row.subscription_id) {
        if (!subscriptionIdsMap.has(row.profile_id)) {
          subscriptionIdsMap.set(row.profile_id, new Set<string>())
        }
        subscriptionIdsMap.get(row.profile_id)?.add(row.subscription_id)
      }
    })
  }

  return (profiles as ProfileRow[] | null)?.map(person => {
    const debtInfo = debtAccountMap.get(person.id)
    return {
      id: person.id,
      name: person.name,
      email: person.email,
      avatar_url: person.avatar_url,
      sheet_link: person.sheet_link,
      debt_account_id: debtInfo?.id ?? null,
      balance: debtInfo?.balance ?? null,
      subscription_count: subscriptionCountMap.get(person.id) ?? 0,
      subscription_ids: Array.from(subscriptionIdsMap.get(person.id) ?? []),
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
