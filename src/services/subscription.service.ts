'use server'

import { randomUUID } from 'crypto'
import { addMonths, format, isValid, parseISO } from 'date-fns'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { Subscription, SubscriptionMember } from '@/types/moneyflow.types'
import { ensureDebtAccount } from './people.service'

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
}

function formatNoteTemplate(row: SubscriptionWithMembersRow, billingDate: string, memberCount: number) {
  const base = row.note_template?.trim() || 'Auto: {name} {date}'
  const safePrice = Math.max(0, Number(row.price ?? 0))
  return base
    .replace('{name}', row.name ?? '')
    .replace('{date}', format(parseISO(billingDate), 'MM-yyyy'))
    .replace('{price}', String(safePrice))
    .replace('{members}', String(memberCount))
}

export type SubscriptionPayload = {
  name: string
  price?: number | null
  next_billing_date?: string | null
  is_active?: boolean | null
  payment_account_id?: string | null
  note_template?: string | null
  members?: { profile_id: string; fixed_amount?: number | null }[]
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

function parseBillingDate(value?: string | null): string {
  if (!value) {
    return dateOnly(new Date())
  }
  const parsed = parseISO(value)
  return isValid(parsed) ? dateOnly(parsed) : dateOnly(new Date())
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

async function ensureDebtAccounts(profileIds: string[], debtMap: Map<string, string>) {
  for (const profileId of profileIds) {
    if (debtMap.has(profileId)) continue
    const createdId = await ensureDebtAccount(profileId)
    if (createdId) {
      debtMap.set(profileId, createdId)
    }
  }
}

function mapSubscriptionRow(
  row: SubscriptionWithMembersRow,
  debtMap: Map<string, string>
): Subscription {
  const members: SubscriptionMember[] =
    row.subscription_members?.map(member => ({
      profile_id: member.profile_id,
      fixed_amount: member.fixed_amount,
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
    members,
  }
}

export async function getSubscriptions(): Promise<Subscription[]> {
  try {
    const supabase = createClient()

    const baseSelect = `
      id, name, price, next_billing_date, is_active, payment_account_id, note_template,
      subscription_members (
        profile_id,
        fixed_amount,
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
            id, name, price, next_billing_date,
            subscription_members (
              profile_id,
              fixed_amount,
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
      })) ?? []

  if (payload.length === 0) {
    return
  }

  const { error } = await supabase.from('subscription_members').insert(payload)
  if (error) {
    console.error('Failed to sync subscription members:', error)
  }
}

export async function createSubscription(payload: SubscriptionPayload): Promise<Subscription | null> {
  try {
    const supabase = createClient()
    const body: SubscriptionInsert = {
      id: randomUUID(),
      name: payload.name?.trim(),
      price: typeof payload.price === 'number' ? payload.price : null,
      next_billing_date: payload.next_billing_date || null,
      is_active: typeof payload.is_active === 'boolean' ? payload.is_active : undefined,
      payment_account_id: payload.payment_account_id ?? null,
      note_template: payload.note_template ?? null,
    }

    const performInsert = async (fields: SubscriptionInsert, select: string) =>
      supabase.from('subscriptions').insert(fields).select(select).single()

    let { data, error } = await performInsert(body, 'id, name, price, next_billing_date, is_active, payment_account_id, note_template')

    if (error?.code === '42703') {
      // Schema missing new columns
      const { is_active: _ignored, payment_account_id: _ignoredPay, note_template: _ignoredTemplate, ...rest } = body
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
  const updatePayload: SubscriptionUpdate = {}

  if (typeof payload.name === 'string') updatePayload.name = payload.name.trim()
  if (typeof payload.price !== 'undefined') updatePayload.price = payload.price ?? null
  if (typeof payload.next_billing_date !== 'undefined')
    updatePayload.next_billing_date = payload.next_billing_date ?? null
  if (typeof payload.is_active !== 'undefined') updatePayload.is_active = payload.is_active
  if (typeof payload.payment_account_id !== 'undefined')
    updatePayload.payment_account_id = payload.payment_account_id ?? null
  if (typeof payload.note_template !== 'undefined')
    updatePayload.note_template = payload.note_template ?? null

  if (Object.keys(updatePayload).length > 0) {
    const attemptUpdate = async (data: SubscriptionUpdate) =>
      supabase.from('subscriptions').update(data).eq('id', id)

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

  if (Array.isArray(payload.members)) {
    await syncSubscriptionMembers(supabase, id, payload.members)
  }

  return true
}

async function resolveExpenseCategoryId(supabase: ReturnType<typeof createClient>) {
  const targetNames = ['My Expense', 'Subscriptions', 'Dich vu dinh ky']
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('type', 'expense')
    .in('name', targetNames)
    .limit(1)

  if (!error && (data?.length ?? 0) > 0) {
    const row = (data as Pick<CategoryRow, 'id'>[])[0]
    return row.id
  }

  const { data: created, error: createError } = await supabase
    .from('categories')
    .insert({ name: 'Subscriptions', type: 'expense' })
    .select('id')
    .single()

  if (createError || !created) {
    console.error('Failed to resolve expense category for subscriptions:', createError ?? error)
    return null
  }

  return (created as Pick<CategoryRow, 'id'>).id
}

async function resolvePaymentAccountId(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, type')
    .neq('type', 'debt')
    .order('current_balance', { ascending: false, nullsLast: true })
    .limit(1)

  if (error || !data?.length) {
    console.error('Failed to find payment account for subscriptions:', error)
    return null
  }

  return (data as Pick<AccountRow, 'id'>[])[0].id
}

type DueSubscription = SubscriptionWithMembersRow & {
  members_with_debt?: (SubscriptionMember & { profile_name?: string | null })[]
}

function buildMemberShareList(
  subscription: DueSubscription,
  debtMap: Map<string, string>
) {
  const members = subscription.subscription_members ?? []
  return members.map(member => {
    const personName = member.profiles?.name ?? 'Thanh vien'
    const debtAccountId = debtMap.get(member.profile_id) ?? null

    return {
      profile_id: member.profile_id,
      profile_name: personName,
      fixed_amount: typeof member.fixed_amount === 'number' ? member.fixed_amount : 0,
      debt_account_id: debtAccountId,
    }
  })
}

export async function checkAndProcessSubscriptions(): Promise<{
  processedCount: number
  names: string[]
}> {
  const supabase = createClient()
  const today = parseBillingDate()

  const query = supabase
    .from('subscriptions')
    .select(
      `
      id, name, price, next_billing_date, is_active, payment_account_id,
      subscription_members (
        profile_id,
        fixed_amount,
        profiles ( name )
      )
    `
    )
    .lte('next_billing_date', today)
    .or('is_active.is.null,is_active.eq.true')

  let { data, error } = await query

  if (error) {
    if (error.code === '42703') {
      const fallback = await supabase
        .from('subscriptions')
        .select(
          `
          id, name, price, next_billing_date, payment_account_id,
          subscription_members (
            profile_id,
            fixed_amount,
            profiles ( name )
          )
        `
        )
        .lte('next_billing_date', today)
      data = fallback.data
      error = fallback.error as typeof error
    }
    if (error) {
      console.error('Failed to scan due subscriptions:', error)
      return { processedCount: 0, names: [] }
    }
  }

  const dueRows = (data ?? []) as DueSubscription[]
  if (dueRows.length === 0) {
    return { processedCount: 0, names: [] }
  }

  const memberIds = new Set<string>()
  dueRows.forEach(row =>
    row.subscription_members?.forEach(member => memberIds.add(member.profile_id))
  )
  const debtMap = await fetchDebtAccountsMap(supabase, Array.from(memberIds))
  await ensureDebtAccounts(Array.from(memberIds), debtMap)

  const paymentAccountId = await resolvePaymentAccountId(supabase)
  const expenseCategoryId = await resolveExpenseCategoryId(supabase)
  if (!paymentAccountId || !expenseCategoryId) {
    return { processedCount: 0, names: [] }
  }

  const processedNames: string[] = []

  for (const row of dueRows) {
    const price = Math.max(0, Number(row.price ?? 0))
    if (!price) {
      continue
    }

    const billingDate = parseBillingDate(row.next_billing_date ?? today)
    const members = buildMemberShareList(row, debtMap)
    const memberTotal = members.reduce(
      (sum, member) => sum + Math.max(0, Number(member.fixed_amount ?? 0)),
      0
    )
    const myShare = Math.max(0, price - memberTotal)

    const paymentSource = row.payment_account_id ?? paymentAccountId
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        occurred_at: `${billingDate}T00:00:00.000Z`,
        note: formatNoteTemplate(row, billingDate, members.length),
        status: 'posted',
        tag: format(parseISO(billingDate), 'MMMyy').toUpperCase(),
      } as TransactionInsert)
      .select('id')
      .single()

    if (txnError || !txn) {
      console.error('Failed to create auto transaction for subscription:', {
        subscriptionId: row.id,
        message: txnError?.message ?? 'unknown error',
      })
      continue
    }

    const lines: TransactionLineInsert[] = [
      {
        id: randomUUID(),
        transaction_id: txn.id,
        account_id: paymentSource,
        amount: -price,
        type: 'credit',
        metadata: { subscription_id: row.id },
      },
    ]

    if (myShare > 0) {
      lines.push({
        id: randomUUID(),
        transaction_id: txn.id,
        category_id: expenseCategoryId,
        amount: myShare,
        type: 'debit',
        metadata: { subscription_id: row.id, role: 'owner_share' },
      })
    }

    members.forEach(member => {
      const share = Math.max(0, Number(member.fixed_amount ?? 0))
      if (share <= 0 || !member.debt_account_id) {
        return
      }
      lines.push({
        id: randomUUID(),
        transaction_id: txn.id,
        account_id: member.debt_account_id,
        amount: share,
        type: 'debit',
        person_id: member.profile_id,
        metadata: {
          subscription_id: row.id,
          member_profile_id: member.profile_id,
          member_name: member.profile_name,
        },
      })
    })

    const debitSum = lines
      .filter(line => line.type === 'debit')
      .reduce((sum, line) => sum + Math.abs(line.amount), 0)
    if (Math.abs(debitSum - price) > 0.01) {
      const adjustment = price - debitSum
      if (lines.find(line => line.category_id === expenseCategoryId)) {
        const extraLine = lines.find(line => line.category_id === expenseCategoryId)
        if (extraLine) {
          extraLine.amount = Math.max(0, Math.round((extraLine.amount + adjustment) * 100) / 100)
        }
      } else {
        lines.push({
          id: randomUUID(),
          transaction_id: txn.id,
          category_id: expenseCategoryId,
          amount: adjustment,
          type: 'debit',
          metadata: { subscription_id: row.id, role: 'adjustment' },
        })
      }
    }

    const { error: lineError } = await supabase.from('transaction_lines').insert(lines)
    if (lineError) {
      console.error('Failed to create transaction lines for subscription:', {
        subscriptionId: row.id,
        message: lineError?.message ?? 'unknown error',
      })
      continue
    }

    const nextCycleDate = addMonths(parseISO(billingDate), 1)
    await supabase
      .from('subscriptions')
      .update({ next_billing_date: dateOnly(nextCycleDate) })
      .eq('id', row.id)

    processedNames.push(row.name)
  }

  return {
    processedCount: processedNames.length,
    names: processedNames,
  }
}
