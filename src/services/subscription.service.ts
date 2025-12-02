'use server'

import { randomUUID } from 'crypto'
import { addMonths, format, isValid, parseISO } from 'date-fns'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { Subscription, SubscriptionMember } from '@/types/moneyflow.types'
import { ensureDebtAccount } from './people.service'
import { syncTransactionToSheet } from './sheet.service'
import { resolveMissingDebtAccountIds } from '@/lib/debt-account-links'
import { getBots } from './bot-config.service'
import { recalculateBalance } from './account.service'
import { SYSTEM_ACCOUNTS } from '@/lib/constants'

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']
type SubscriptionMemberRow = Database['public']['Tables']['subscription_members']['Row']
type SubscriptionMemberInsert = Database['public']['Tables']['subscription_members']['Insert']
type AccountRow = Database['public']['Tables']['accounts']['Row']

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

type SubscriptionPreviewItem = {
  id: string
  name: string | null
  cost: number
  members: { name: string; slots: number }[]
  next_billing_date?: string | null
  billing_label?: string
}

type SubscriptionPreviewResult = {
  success: boolean
  count: number
  totalAmount: number
  items: SubscriptionPreviewItem[]
  warnings: string[]
  message?: string
  error?: any
}

export async function previewSubscriptionRun(options?: { force?: boolean }): Promise<SubscriptionPreviewResult> {
  try {
    const bots = await getBots()
    const botConfig = bots.find(b => b.key === 'subscription_bot')
    const warnings: string[] = []

    const config = botConfig?.config as any
    if (!config?.default_category_id) {
      warnings.push('Missing default_category_id in config')
    }

    const supabase = createClient()
    const today = new Date().toISOString().slice(0, 10)

    const baseSelect = `
      *,
      subscription_members (
        profile_id,
        fixed_amount,
        slots,
        profiles ( id, name, is_owner )
      )
    `

    let primaryQuery = supabase
      .from('subscriptions')
      .select(baseSelect)
      .or('is_active.is.null,is_active.eq.true')
    if (!options?.force) {
      primaryQuery = primaryQuery.lte('next_billing_date', today)
    }

    const { data, error } = await primaryQuery
    let rows = data

    if (error?.code === '42703') {
      let fallbackQuery = supabase
        .from('subscriptions')
        .select(baseSelect)
        .or('is_active.is.null,is_active.eq.true')
      if (!options?.force) {
        fallbackQuery = fallbackQuery.lte('next_billing_date', today)
      }

      const fallback = await fallbackQuery
      rows = fallback.data
      if (fallback.error) {
        console.error('Error fetching subscriptions (preview fallback):', fallback.error)
        return { success: false, count: 0, totalAmount: 0, items: [], warnings, error: fallback.error }
      }
    } else if (error) {
      console.error('Error fetching subscriptions (preview):', error)
      return { success: false, count: 0, totalAmount: 0, items: [], warnings, error }
    }

    const safeRows = rows ?? []
    if (!safeRows.length) {
      return { success: true, count: 0, totalAmount: 0, items: [], warnings }
    }

    let totalAmount = 0
    const items: SubscriptionPreviewItem[] = []

    for (const sub of safeRows as any[]) {
      const members = Array.isArray(sub.subscription_members) ? sub.subscription_members : []
      const amount = Math.max(0, Number(sub.price ?? 0))
      totalAmount += amount
      const billingLabel = sub.next_billing_date
        ? format(parseISO(sub.next_billing_date), 'MM/yyyy')
        : 'Unknown'
      items.push({
        id: sub.id,
        name: sub.name,
        cost: amount,
        members: members.map((m: any) => ({
          name: m.profiles?.name || 'Unknown',
          slots: m.slots ?? 1,
        })),
        next_billing_date: sub.next_billing_date,
        billing_label: billingLabel,
      })
    }

    return {
      success: true,
      count: items.length,
      totalAmount,
      items,
      warnings,
    }
  } catch (err) {
    console.error('Unexpected preview error:', err)
    return { success: false, count: 0, totalAmount: 0, items: [], warnings: [], error: err }
  }
}

export async function processSubscription(opts: { force?: boolean } = {}) {
  const bots = await getBots()
  const botConfig = bots.find(b => b.key === 'subscription_bot')

  if (!botConfig?.is_enabled && !opts.force) {
    return { success: false, message: 'Bot disabled' }
  }

  if (!botConfig) {
    return { success: false, message: 'Bot config missing' }
  }

  const config = botConfig.config as any
  const defaultCategoryId = config?.default_category_id

  if (!defaultCategoryId) {
    return { success: false, message: 'Missing default_category_id' }
  }

  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  // Fetch due subscriptions (handle schemas without is_active)
  const baseSelect = `
    *,
    subscription_members (
      profile_id,
      fixed_amount,
      slots,
      profiles ( id, name, is_owner )
    )
  `

  let initialQuery = supabase
    .from('subscriptions')
    .select(baseSelect)
    .or('is_active.is.null,is_active.eq.true')
  if (!opts.force) {
    initialQuery = initialQuery.lte('next_billing_date', today)
  }

  const { data: subs, error } = await initialQuery

  let safeSubs = subs
  if (error?.code === '42703') {
    let fallbackQuery = supabase
      .from('subscriptions')
      .select(baseSelect)
      .or('is_active.is.null,is_active.eq.true')
    if (!opts.force) {
      fallbackQuery = fallbackQuery.lte('next_billing_date', today)
    }

    const fallback = await fallbackQuery
    safeSubs = fallback.data
    if (fallback.error) {
      console.error('Error fetching subscriptions (fallback):', fallback.error)
      return { success: false, error: fallback.error }
    }
  } else if (error) {
    console.error('Error fetching subscriptions:', error)
    return { success: false, error }
  }

  if (!safeSubs?.length) {
    return { success: true, count: 0 }
  }

  let processed = 0

  for (const subItem of safeSubs) {
    const sub = subItem as any
    // Calculate amounts
    const members = sub.subscription_members || []
    const totalAmount = sub.price || 0
    const totalSlots = members.reduce((sum: number, m: any) => sum + (m.slots || 1), 0)
    const billingDate = sub.next_billing_date || today

    const amountPerSlot = totalSlots > 0 ? totalAmount / totalSlots : 0

    // Create Transaction
    const note = formatNoteTemplate(sub as any, billingDate, totalSlots)
    const { data: txn, error: txnError } = await (supabase.from('transactions').insert as any)({
      occurred_at: billingDate,
      note,
      status: 'posted',
      tag: 'subscription',
      created_by: SYSTEM_ACCOUNTS.DEFAULT_USER_ID
    }).select().single()

    if (txnError || !txn) {
      console.error('Failed to create transaction for sub:', sub.id, txnError)
      continue
    }

    const lines: any[] = []

    // Credit Line (Source)
    if (sub.payment_account_id) {
      lines.push({
        transaction_id: txn.id,
        account_id: sub.payment_account_id,
        amount: -totalAmount,
        type: 'credit'
      })
    }

    // Debit Lines (Members)
    for (const member of members) {
      const memberSlots = (member as any).slots || 1
      const memberAmount = (member.fixed_amount ?? (amountPerSlot * memberSlots))
      const isOwner = (member.profiles as any)?.is_owner

      if (isOwner) {
        // Me -> Expense
        lines.push({
          transaction_id: txn.id,
          category_id: defaultCategoryId,
          amount: memberAmount,
          type: 'debit'
        })
      } else {
        // Others -> Debt
        const debtAccountId = await ensureDebtAccount(member.profile_id)

        if (debtAccountId) {
          lines.push({
            transaction_id: txn.id,
            account_id: debtAccountId,
            amount: memberAmount,
            type: 'debit',
            person_id: member.profile_id
          })
        }
      }
    }

    // Insert lines
    const { error: linesError } = await (supabase.from('transaction_lines').insert as any)(lines)
    if (linesError) {
      console.error('Failed to insert lines for sub:', sub.id, linesError)
      continue
    }

    // Update next billing date
    const nextDate = addMonths(parseISO(billingDate || today), 1).toISOString().slice(0, 10)
    await (supabase.from('subscriptions').update as any)({ next_billing_date: nextDate }).eq('id', sub.id)

    // Sync to sheet for debtors
    for (const line of lines) {
      if (line.person_id && line.amount > 0) {
        try {
          await syncTransactionToSheet(line.person_id, {
            id: txn.id,
            occurred_at: today,
            note: note,
            amount: line.amount,
            original_amount: line.amount,
            type: 'In'
          }, 'create')
        } catch (e) {
          console.error('Sheet sync failed', e)
        }
      }
    }

    // Recalculate balances
    const accountIds = new Set(lines.map(l => l.account_id).filter(Boolean))
    for (const accId of accountIds) {
      await recalculateBalance(accId as string)
    }

    processed++
  }

  return { success: true, count: processed }
}
