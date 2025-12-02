'use server'

import { randomUUID } from 'crypto'
import { addMonths, format, isValid, parseISO } from 'date-fns'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { Subscription, SubscriptionMember } from '@/types/moneyflow.types'
import { ensureDebtAccount } from './people.service'
import { syncTransactionToSheet } from './sheet.service'
import { resolveMissingDebtAccountIds } from '@/lib/debt-account-links'

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']
type SubscriptionMemberRow = Database['public']['Tables']['subscription_members']['Row']
type SubscriptionMemberInsert = Database['public']['Tables']['subscription_members']['Insert']
// Extension to include 'slots' which is missing from generated types but present in DB
type SubscriptionMemberInsertWithSlots = SubscriptionMemberInsert & { slots?: number }

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
  members?: { profile_id: string; fixed_amount?: number | null; slots?: number | null }[]
  shop_id?: string | null
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

  // "If multiple debt accounts exist, pick the one created most recently"
  const { data, error } = await supabase
    .from('accounts')
    .select('id, owner_id, created_at')
    .eq('type', 'debt')
    .in('owner_id', profileIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch debt accounts for members:', error)
    return debtMap
  }

  // Since we ordered by created_at desc, the first one we encounter for each owner_id is the latest.
  // We can just iterate and set if not exists.
  (data as Pick<AccountRow, 'id' | 'owner_id'>[] | null)?.forEach(row => {
    if (row.owner_id && !debtMap.has(row.owner_id)) {
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
            id, name, price, next_billing_date, shop_id,
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
            id, name, price, next_billing_date, shop_id,
            subscription_members (
              profile_id,
              fixed_amount,
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
      .map<SubscriptionMemberInsertWithSlots>(member => ({
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
      (supabase.from('subscriptions').update as any)(data).eq('id', id) // TODO: Fix strict types later

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
  // Ordered by preference: Utilities -> Shopping -> Subscriptions -> others
  const targetNames = ['Utilities', 'Shopping', 'My Expense', 'Subscriptions', 'Dich vu dinh ky']
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('type', 'expense')
    .in('name', targetNames)

  if (!error && (data?.length ?? 0) > 0) {
    const rows = (data as Pick<CategoryRow, 'id' | 'name'>[])
    // Sort based on targetNames index to ensure preference order
    rows.sort((a, b) => targetNames.indexOf(a.name) - targetNames.indexOf(b.name))
    return rows[0].id
  }

  const { data: created, error: createError } = await (supabase
    .from('categories')
    .insert as any)({ name: 'Subscriptions', type: 'expense' })
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
    .order('current_balance', { ascending: false } as any)
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
      slots: (member as any).slots ?? 1,
      debt_account_id: debtAccountId,
    }
  })
}

export async function checkAndProcessSubscriptions(isManualForce: boolean = false): Promise<{
  processedCount: number
  names: string[]
  skippedCount: number
  skippedNames: string[]
}> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id || '917455ba-16c0-42f9-9cea-264f81a3db66'
  const today = new Date()
  const todayStr = dateOnly(today)
  const currentMonthTag = format(today, 'MMMyy').toUpperCase()

  let query = supabase
    .from('subscriptions')
    .select(
      `
      id, name, price, next_billing_date, payment_account_id, shop_id,
      subscription_members (
        profile_id,
        fixed_amount,
        slots,
        profiles ( name )
      )
    `
    )

  if (!isManualForce) {
    query = query.lte('next_billing_date', todayStr)
  }

  let { data, error } = await query

  if (error) {
    console.error('Failed to scan due subscriptions:', error)
    return { processedCount: 0, names: [], skippedCount: 0, skippedNames: [] }
  }

  const dueRows = (data ?? []) as DueSubscription[]
  if (dueRows.length === 0) {
    return { processedCount: 0, names: [], skippedCount: 0, skippedNames: [] }
  }

  let existingTxnsSet = new Set<string>()
  if (isManualForce) {
    const { data: existingTxns, error: existingTxnsError } = await supabase
      .from('transactions')
      .select('shop_id, tag')
      .in(
        'shop_id',
        dueRows.map(s => s.shop_id).filter(Boolean) as string[]
      )
      .eq('tag', currentMonthTag)
      .eq('status', 'posted')

    if (existingTxnsError) {
      console.error('Failed to check for existing transactions:', existingTxnsError)
    } else if (existingTxns && existingTxns.length > 0) {
      existingTxnsSet = new Set(
        (existingTxns as { shop_id: string; tag: string }[]).map(t => `${t.shop_id}-${t.tag}`)
      )
    }
  }

  const memberIds = new Set<string>()
  dueRows.forEach(row =>
    row.subscription_members?.forEach(member => memberIds.add(member.profile_id))
  )
  const debtMap = await fetchDebtAccountsMap(supabase, Array.from(memberIds))
  await ensureDebtAccounts(Array.from(memberIds), debtMap)

  const paymentAccountId = await resolvePaymentAccountId(supabase)
  // Hardcoded Category: "Online Services"
  const expenseCategoryId = 'e0000000-0000-0000-0000-000000000088'

  if (!paymentAccountId) {
    return {
      processedCount: 0,
      names: [],
      skippedCount: 0,
      skippedNames: [],
    }
  }

  const processedNames: string[] = []
  const skippedNames: string[] = []

  for (const row of dueRows) {
    if (isManualForce && existingTxnsSet.has(`${row.shop_id}-${currentMonthTag}`)) {
      skippedNames.push(row.name)
      continue
    }
    const price = Math.max(0, Number(row.price ?? 0))
    if (!price) {
      continue
    }

    const billingDate = isManualForce
      ? todayStr
      : parseBillingDate(row.next_billing_date ?? todayStr)
    const txnNote = formatNoteTemplate(row, billingDate, row.subscription_members?.length ?? 0)
    const txnTag = format(parseISO(billingDate), 'MMMyy').toUpperCase()

    const members = buildMemberShareList(row, debtMap)

    // Calculate shares based on slots
    // TotalSlots = Sum(member.slots) + 1 (Owner/Me gets 1 slot implicitly)
    const totalSlots = members.reduce((sum, m) => sum + (m.slots ?? 1), 0) + 1
    const unitCost = totalSlots > 0 ? price / totalSlots : 0

    const paymentSource = row.payment_account_id ?? paymentAccountId
    const { data: txn, error: txnError } = await (supabase
      .from('transactions')
      .insert as any)({
        occurred_at: `${billingDate}T00:00:00.000Z`,
        note: txnNote,
        status: 'posted',
        tag: txnTag,
        created_by: userId,
        shop_id: row.shop_id,
      })
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

    members.forEach(member => {
      const slots = member.slots ?? 1
      const share = unitCost * slots

      if (share <= 0 || !member.debt_account_id) {
        return
      }

      if (member.profile_id === userId) {
        return
      }

      lines.push({
        id: randomUUID(),
        transaction_id: txn.id,
        account_id: member.debt_account_id,
        amount: share,
        type: 'debit',
        // @ts-ignore: person_id exists in DB though generated types may lag
        person_id: member.profile_id,
        metadata: {
          subscription_id: row.id,
          member_profile_id: member.profile_id,
          member_name: member.profile_name,
          slots: slots,
          // LineNote: txnNote + (x${member.slots})
          note: `${txnNote} (x${slots})`
        },
      })
    })

    const debtSum = lines
      .filter(line => line.type === 'debit' && line.account_id)
      .reduce((sum, line) => sum + line.amount, 0)

    const myShare = Math.max(0, price - debtSum)

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

    await resolveMissingDebtAccountIds(supabase, lines)
    const { error: lineError } = await (supabase.from('transaction_lines').insert as any)(lines)
    if (lineError) {
      console.error('Failed to create transaction lines for subscription:', {
        subscriptionId: row.id,
        message: lineError?.message ?? 'unknown error',
      })
      continue
    }

    const syncBase = {
      id: txn.id,
      occurred_at: `${billingDate}T00:00:00.000Z`,
      note: txnNote,
      tag: txnTag,
    }

    for (const line of lines) {
      const personId = (line as { person_id?: string | null }).person_id
      if (!personId) continue
      const originalAmount =
        typeof line.original_amount === 'number' ? line.original_amount : line.amount

      void syncTransactionToSheet(
        personId,
        {
          ...syncBase,
          original_amount: originalAmount,
          cashback_share_percent: line.cashback_share_percent ?? undefined,
          cashback_share_fixed: line.cashback_share_fixed ?? undefined,
          amount: line.amount,
        },
        'create'
      )
        .then(() => {
          console.log(`[Sheet Sync] Triggered for Person ${personId} (subscription bot)`)
        })
        .catch(err => {
          console.error('Sheet Sync Error (Bot Background):', err)
        })
    }

    const nextCycleDate = addMonths(parseISO(billingDate), 1)
    await (supabase
      .from('subscriptions')
      .update as any)({ next_billing_date: dateOnly(nextCycleDate) })
      .eq('id', row.id)

    processedNames.push(row.name)
  }

  return {
    processedCount: processedNames.length,
    names: processedNames,
    skippedCount: skippedNames.length,
    skippedNames: skippedNames,
  }
}
