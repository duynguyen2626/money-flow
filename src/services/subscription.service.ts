'use server'

import { randomUUID } from 'crypto'


import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { Subscription, SubscriptionMember } from '@/types/moneyflow.types'


type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']
type SubscriptionMemberRow = Database['public']['Tables']['subscription_members']['Row']
type SubscriptionMemberInsert = Database['public']['Tables']['subscription_members']['Insert']
type AccountRow = Database['public']['Tables']['accounts']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionLineInsert = Database['public']['Tables']['transaction_lines']['Insert']

type SubscriptionWithMembersRow = SubscriptionRow & {
  subscription_members?: (SubscriptionMemberRow & {
    profiles?: { id: string; name: string; avatar_url: string | null } | null
  })[] | null
  shop_id?: string | null
}



export type SubscriptionPayload = {
  name: string
  price?: number | null
  next_billing_date?: string | null
  is_active?: boolean | null
  payment_account_id?: string | null
  note_template?: string | null
  members?: { profile_id: string; fixed_amount?: number | null; slots?: number | null }[]
  shop_id?: string | null
}



async function fetchDebtAccountsMap(
  supabase: ReturnType<typeof createClient>,
  profileIds: string[]
) {
  const debtMap = new Map<string, string>()
  if (!profileIds.length) return debtMap

  const { data, error } = await supabase
    .from('accounts')
    .select('id, owner_id')
    .eq('type', 'debt')
    .in('owner_id', profileIds)

  if (error) {
    console.error('Failed to fetch debt accounts for members:', error)
    return debtMap
  }

  (data as Pick<AccountRow, 'id' | 'owner_id'>[] | null)?.forEach(row => {
    if (row.owner_id) {
      debtMap.set(row.owner_id, row.id)
    }
  })

  return debtMap
}



function mapSubscriptionRow(
  row: SubscriptionWithMembersRow,
  debtMap: Map<string, string>
): Subscription {
  const members: SubscriptionMember[] =
    row.subscription_members?.map(member => ({
      profile_id: member.profile_id,
      fixed_amount: member.fixed_amount,
      slots: (member as any).slots ?? 1,
      profile_name: member.profiles?.name ?? null,
      avatar_url: member.profiles?.avatar_url ?? null,
      debt_account_id: debtMap.get(member.profile_id) ?? null,
    })) ?? []

  return {
    id: row.id,
    name: row.name,
    price: row.price,
    next_billing_date: row.next_billing_date ?? undefined,
    is_active: row.is_active ?? undefined,
    payment_account_id: row.payment_account_id ?? undefined,
    note_template: row.note_template ?? undefined,
    shop_id: row.shop_id ?? undefined,
    members,
  }
}

export async function getSubscriptions(): Promise<Subscription[]> {
  try {
    const supabase = createClient()

    const baseSelect = `
      id, name, price, next_billing_date, is_active, payment_account_id, note_template, shop_id,
      subscription_members (
        profile_id,
        fixed_amount,
        slots,
        profiles ( id, name, avatar_url )
      )
    `

    const { data, error } = await supabase
      .from('subscriptions')
      .select(baseSelect)
      .order('next_billing_date', { ascending: true })
      .order('name', { ascending: true })

    let rows: SubscriptionWithMembersRow[] | null = data as SubscriptionWithMembersRow[] | null

    if (error) {
      // Fallback for schemas without is_active column
      if (error.code === '42703') {
        const fallback = await supabase
          .from('subscriptions')
          .select(
            `
            id, name, price, next_billing_date, shop_id, payment_account_id, note_template,
            subscription_members (
              profile_id,
              fixed_amount,
              slots,
              profiles ( id, name, avatar_url )
            )
          `
          )
          .order('next_billing_date', { ascending: true })
          .order('name', { ascending: true })
        if (fallback.error) {
          console.error('Failed to load subscriptions:', fallback.error)
          return []
        }
        rows = (fallback.data ?? []) as SubscriptionWithMembersRow[]
      } else {
        console.error('Failed to load subscriptions:', error)
        return []
      }
    }

    const safeRows = rows ?? []
    const profileIds = new Set<string>()
    safeRows.forEach(row =>
      row.subscription_members?.forEach(member => profileIds.add(member.profile_id))
    )

    const debtMap = await fetchDebtAccountsMap(supabase, Array.from(profileIds))
    return safeRows.map(row => mapSubscriptionRow(row, debtMap))
  } catch (err) {
    console.error('Error fetching subscriptions:', err)
    return []
  }
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  try {
    const supabase = createClient()

    const baseSelect = `
      id, name, price, next_billing_date, is_active, payment_account_id, note_template, shop_id,
      subscription_members (
        profile_id,
        fixed_amount,
        slots,
        profiles ( id, name, avatar_url )
      )
    `

    const { data, error } = await supabase
      .from('subscriptions')
      .select(baseSelect)
      .eq('id', id)
      .single()

    let row: SubscriptionWithMembersRow | null = data as SubscriptionWithMembersRow | null

    if (error) {
      // Fallback logic similar to getSubscriptions if needed, but for single row
      if (error.code === '42703') {
        const fallback = await supabase
          .from('subscriptions')
          .select(
            `
            id, name, price, next_billing_date, shop_id, payment_account_id, note_template,
            subscription_members (
              profile_id,
              fixed_amount,
              slots,
              profiles ( id, name, avatar_url )
            )
          `
          )
          .eq('id', id)
          .single()

        if (fallback.error) {
          console.error('Failed to load subscription:', fallback.error)
          return null
        }
        row = fallback.data as SubscriptionWithMembersRow
      } else {
        console.error('Failed to load subscription:', error)
        return null
      }
    }

    if (!row) return null

    const profileIds = new Set<string>()
    row.subscription_members?.forEach(member => profileIds.add(member.profile_id))

    const debtMap = await fetchDebtAccountsMap(supabase, Array.from(profileIds))
    return mapSubscriptionRow(row, debtMap)
  } catch (err) {
    console.error('Error fetching subscription:', err)
    return null
  }
}

async function syncSubscriptionMembers(
  supabase: ReturnType<typeof createClient>,
  subscriptionId: string,
  members: SubscriptionPayload['members']
) {
  await supabase.from('subscription_members').delete().eq('subscription_id', subscriptionId)

  const payload =
    members
      ?.filter(member => member?.profile_id)
      .map<SubscriptionMemberInsert>(member => ({
        id: randomUUID(),
        subscription_id: subscriptionId,
        profile_id: member.profile_id,
        fixed_amount:
          typeof member.fixed_amount === 'number' && !Number.isNaN(member.fixed_amount)
            ? member.fixed_amount
            : null,
        slots: typeof member.slots === 'number' ? member.slots : 1,
      })) ?? []

  if (payload.length === 0) {
    return
  }

  const { error } = await (supabase.from('subscription_members').insert as any)(payload)
  if (error) {
    console.error('Failed to sync subscription members:', error)
  }
}

export async function createSubscription(payload: SubscriptionPayload): Promise<Subscription | null> {
  try {
    const supabase = createClient()
    const body: SubscriptionInsert & { shop_id?: string | null } = {
      id: randomUUID(),
      name: payload.name?.trim(),
      price: typeof payload.price === 'number' ? payload.price : null,
      next_billing_date: payload.next_billing_date || null,
      is_active: typeof payload.is_active === 'boolean' ? payload.is_active : undefined,
      payment_account_id: payload.payment_account_id ?? null,
      note_template: payload.note_template ?? null,
      shop_id: payload.shop_id ?? null,
    }

    const performInsert = async (fields: any, select: string) =>
      (supabase.from('subscriptions').insert as any)(fields).select(select).single()

    let { data, error } = await performInsert(body, 'id, name, price, next_billing_date, is_active, payment_account_id, note_template, shop_id')

    if (error?.code === '42703') {
      // Schema missing new columns
      const { is_active: _ignored, payment_account_id: _ignoredPay, note_template: _ignoredTemplate, shop_id: _ignoredShop, ...rest } = body
      const fallback = await performInsert(rest, 'id, name, price, next_billing_date')
      data = fallback.data
      error = fallback.error as typeof error
    }

    if (error || !data) {
      console.error('Failed to create subscription:', error)
      return null
    }

    await syncSubscriptionMembers(supabase, data.id, payload.members)

    return {
      id: data.id,
      name: data.name,
      price: data.price,
      next_billing_date: data.next_billing_date ?? undefined,
      is_active: data.is_active ?? undefined,
      payment_account_id: data.payment_account_id ?? undefined,
      note_template: data.note_template ?? undefined,
      shop_id: data.shop_id ?? undefined,
      members: payload.members?.map(member => ({
        profile_id: member.profile_id,
        fixed_amount: member.fixed_amount,
      })),
    }
  } catch (err) {
    console.error('Unexpected error creating subscription:', err)
    return null
  }
}

export async function updateSubscription(id: string, payload: SubscriptionPayload): Promise<boolean> {
  const supabase = createClient()
  const updatePayload: SubscriptionUpdate & { shop_id?: string | null } = {}

  if (typeof payload.name === 'string') updatePayload.name = payload.name.trim()
  if (typeof payload.price !== 'undefined') updatePayload.price = payload.price ?? null
  if (typeof payload.next_billing_date !== 'undefined')
    updatePayload.next_billing_date = payload.next_billing_date ?? null
  if (typeof payload.is_active !== 'undefined') updatePayload.is_active = payload.is_active
  if (typeof payload.payment_account_id !== 'undefined')
    updatePayload.payment_account_id = payload.payment_account_id ?? null
  if (typeof payload.note_template !== 'undefined')
    updatePayload.note_template = payload.note_template ?? null
  if (typeof payload.shop_id !== 'undefined')
    updatePayload.shop_id = payload.shop_id ?? null

  if (Object.keys(updatePayload).length > 0) {
    const attemptUpdate = async (data: any) =>
      (supabase.from('subscriptions').update as any)(data).eq('id', id)

    let { error } = await attemptUpdate(updatePayload)

    const missingColumnCodes = ['42703', 'PGRST204']
    if (error && missingColumnCodes.includes(error.code ?? '') && 'is_active' in updatePayload) {
      const { is_active: _ignored, ...rest } = updatePayload
      const fallback = await attemptUpdate(rest)
      error = fallback.error
    }

    if (error) {
      console.error('Failed to update subscription:', error)
      return false
    }
  }

  // Always sync members if provided, using Delete-then-Insert strategy
  if (Array.isArray(payload.members)) {
    // 1. Delete all existing members for this subscription
    const { error: deleteError } = await supabase
      .from('subscription_members')
      .delete()
      .eq('subscription_id', id)

    if (deleteError) {
      console.error('Failed to delete existing subscription members:', deleteError)
      return false
    }

    // 2. Insert new members
    const membersToInsert = payload.members
      .filter(m => m.profile_id)
      .map(m => ({
        id: randomUUID(),
        subscription_id: id,
        profile_id: m.profile_id,
        fixed_amount: typeof m.fixed_amount === 'number' ? m.fixed_amount : null,
        slots: typeof m.slots === 'number' ? m.slots : 1,
      }))

    if (membersToInsert.length > 0) {
      const { error: insertError } = await (supabase.from('subscription_members').insert as any)(
        membersToInsert
      )
      if (insertError) {
        console.error('Failed to insert new subscription members:', insertError)
        return false
      }
    }
  }

  return true
}


