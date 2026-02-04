'use server'
/* eslint-disable @typescript-eslint/no-explicit-any */


import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { MonthlyDebtSummary, Person, PersonCycleSheet } from '@/types/moneyflow.types'
import { toYYYYMMFromDate, normalizeMonthTag } from '@/lib/month-tag'

type PersonRow = Database['public']['Tables']['people']['Row']
type PersonInsert = Database['public']['Tables']['people']['Insert']
type PersonUpdate = Database['public']['Tables']['people']['Update']
type AccountRow = Database['public']['Tables']['accounts']['Row']
// TODO: The 'service_members' table is not in database.types.ts.
// This is a temporary type definition.
type ServiceMemberRow = {
  service_id: string;
  person_id: string; // Foreign key to people.id (after 2026-02-03 migration)
  slots: number;
  subscriptions?: { name: string };
};

function resolveBaseType(type: string | null | undefined): 'income' | 'expense' | 'transfer' {
  if (type === 'repayment') return 'income'
  if (type === 'debt') return 'expense'
  if (type === 'transfer') return 'transfer'
  if (type === 'income') return 'income'
  return 'expense'
}

function calculateFinalPrice(row: any): number {
  if (row.final_price !== undefined && row.final_price !== null) {
    const parsed = Number(row.final_price)
    if (!isNaN(parsed)) return Math.abs(parsed)
  }

  const rawAmount = Math.abs(Number(row.amount ?? 0))
  const percentVal = Number(row.cashback_share_percent ?? 0)
  const fixedVal = Number(row.cashback_share_fixed ?? 0)
  const normalizedPercent = percentVal > 1 ? percentVal / 100 : percentVal
  const safePercent = isNaN(normalizedPercent) ? 0 : normalizedPercent
  const cashback = (rawAmount * safePercent) + fixedVal

  return rawAmount - cashback
}

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

  return (data as unknown as Pick<AccountRow, 'id'>[] | null)?.[0]?.id ?? null
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

  return (data as unknown as Pick<AccountRow, 'id'>).id
}

export async function createPerson(
  name: string,

  image_url?: string,
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

  const personPayload: PersonInsert & { is_archived?: boolean | null } = {
    id: randomUUID(),
    name: trimmedName,

    image_url: image_url?.trim() || null,
    sheet_link: sheet_link?.trim() || null,
    is_owner: (opts?.is_owner ?? null) as any,
    is_archived: (typeof opts?.is_archived === 'boolean' ? opts.is_archived : null) as any,
    is_group: (typeof opts?.is_group === 'boolean' ? opts.is_group : null) as any,
    group_parent_id:
      typeof opts?.group_parent_id === 'string' ? opts.group_parent_id : null,
  }

  let { data: profile, error: profileError } = await (supabase
    .from('people')
    .insert as any)(personPayload)
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
    } = personPayload as any
    const fallback = await (supabase
      .from('people')
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

  const profileId = (profile as unknown as Pick<PersonRow, 'id'>).id

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
      .from('people')
      .select(
        'id, created_at, name, email, image_url, sheet_link, google_sheet_url, is_owner, is_archived, is_group, group_parent_id, sheet_full_img, sheet_show_bank_account, sheet_bank_info, sheet_linked_bank_id, sheet_show_qr_image'
      )
      .order('name', { ascending: true })
    if (attempt.error?.code === '42703' || attempt.error?.code === 'PGRST204') {
      const fallback = await supabase
        .from('people')
        .select('id, created_at, name, email, image_url, sheet_link, is_owner')
        .order('name', { ascending: true })
      return { data: fallback.data, error: fallback.error }
    }
    return attempt as any
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
          person_id, 
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
  const debtAccountIds = (debtAccounts as unknown as AccountRow[])?.map(a => a.id) ?? []
  const personIds = (profiles as unknown as PersonRow[])?.map(p => p.id) ?? []
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
      cycleSheets = data as unknown as PersonCycleSheet[]
    }
  }

  // Build mapping from debt account to person
  const debtAccountToPersonMap = new Map<string, string>()
  if (Array.isArray(debtAccounts)) {
    (debtAccounts as unknown as AccountRow[]).forEach(account => {
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
    (debtAccounts as unknown as AccountRow[]).forEach(account => {
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

  // FIFO Logic Implementation
  const monthlyDebtsByPerson = new Map<string, MonthlyDebtSummary[]>()

  let allDebtTxns: any[] = []
  let allRepayTxns: any[] = []

  // 1. Fetch Debt Transactions
  if (personIds.length > 0) {
    const { data: monthlyTxns, error: monthlyTxnsError } = await supabase
      .from('transactions')
      .select('id, metadata, person_id, target_account_id, amount, occurred_at, tag, status, cashback_share_percent, cashback_share_fixed, final_price')
      .eq('type', 'debt')
      .neq('status', 'void')
      .order('occurred_at', { ascending: false })

    if (monthlyTxnsError) {
      console.error('Error fetching monthly debt lines:', JSON.stringify(monthlyTxnsError, null, 2))
    } else {
      allDebtTxns = monthlyTxns as any[]
    }
  }

  // 2. Fetch Repayment Transactions
  if (personIds.length > 0) {
    const { data: repayTxns, error: repayError } = await supabase
      .from('transactions')
      .select('id, metadata, person_id, amount, occurred_at, tag, status')
      .eq('type', 'repayment')
      .neq('status', 'void')

    if (repayError) {
      console.error('Error fetching repayments:', repayError)
    } else {
      allRepayTxns = repayTxns as any[]
    }
  }

  // 3. Process FIFO per Person
  personIds.forEach(personId => {
    // Filter transactions for this person
    const personDebts: any[] = []
    const personRepayments: any[] = []

    allDebtTxns.forEach(txn => {
      let isForPerson = false
      if (txn.person_id === personId) isForPerson = true
      else if (txn.target_account_id && debtAccountToPersonMap.get(txn.target_account_id) === personId) isForPerson = true

      if (isForPerson) {
        personDebts.push({
          ...txn,
          // Initialize remaining debt
          // FIX: Use calculateFinalPrice (Net) so that Remaining is also Net-based.
          // Previously it used Math.abs(debt.amount) which was Original Amount, causing discrepancy with Net Lend.
          remaining: calculateFinalPrice(txn),
          links: [] as { repaymentId: string, amount: number }[]
        })
      }
    })

    allRepayTxns.forEach(txn => {
      if (txn.person_id === personId) {
        const amount = Math.abs(txn.amount)
        // Side Effect: Update Current Cycle Debt Badge
        const currentMonthTag = toYYYYMMFromDate(new Date())
        const normalizedTag = normalizeMonthTag(txn.tag) ?? txn.tag
        const occurredAt = txn.occurred_at ? new Date(txn.occurred_at) : null
        const isCurrentCycle = (occurredAt && occurredAt >= currentMonthStart) || (normalizedTag === currentMonthTag)

        if (isCurrentCycle) {
          const currentCycle = currentCycleDebtByPerson.get(personId) ?? 0
          currentCycleDebtByPerson.set(personId, currentCycle - amount)
        }

        personRepayments.push({
          id: txn.id || 'unknown',
          amount: calculateFinalPrice(txn),
          initialAmount: calculateFinalPrice(txn),
          date: txn.occurred_at,
          metadata: txn.metadata,
          tag: txn.tag
        })
      }
    })

    // Sort by Date Ascending for FIFO processing
    personDebts.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
    personRepayments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Map for Phase 1
    const debtsMap = new Map<string, any>()
    personDebts.forEach(d => debtsMap.set(d.id, d))

    // === PHASE 1: TARGETED REPAYMENTS ===
    for (const repay of personRepayments) {
      const targets = repay.metadata?.bulk_allocation?.debts;
      if (Array.isArray(targets) && targets.length > 0) {
        targets.forEach((target: any) => {
          const debtId = target.id;
          const targetAmount = Number(target.amount || 0);
          if (debtId && targetAmount > 0) {
            const debtEntry = debtsMap.get(debtId);
            if (debtEntry && repay.amount > 0) {
              const pay = Math.min(targetAmount, repay.amount);
              debtEntry.remaining -= pay;
              if (debtEntry.remaining < 0) debtEntry.remaining = 0;
              repay.amount -= pay;
              debtEntry.links.push({ repaymentId: repay.id, amount: pay });
            }
          }
        });
      }
    }

    // === PHASE 1.5: TAG MATCHING ===
    // If a repayment has a tag, prioritize paying debts with SAME tag
    for (const repay of personRepayments) {
      if (repay.amount <= 0.01) continue;
      const repayTag = normalizeMonthTag(repay.metadata?.tag || repay.tag);

      if (repayTag) {
        for (const debt of personDebts) {
          if (debt.remaining <= 0.01) continue;

          const debtTag = normalizeMonthTag(debt.tag);
          if (debtTag === repayTag) {
            const pay = Math.min(repay.amount, debt.remaining);
            debt.remaining -= pay;
            repay.amount -= pay;
            if (debt.remaining < 0) debt.remaining = 0;
            debt.links.push({ repaymentId: repay.id, amount: pay });

            if (repay.amount <= 0.01) break;
          }
        }
      }
    }

    // === PHASE 2: GENERAL FIFO ===
    // Only process repayments effectively without tags (or whose tags failed to match anything in Phase 1.5?)
    // User Request: Tagged repayments should NOT shift cycles.
    // If a repayment has a tag, it should stick to that tag. Use strict mode.
    const generalQueue = personRepayments.filter(r => {
      if (r.amount <= 0.01) return false;
      const tag = normalizeMonthTag(r.metadata?.tag || r.tag);
      return !tag; // Only include untagged repayments
    });

    for (const debt of personDebts) {
      while (debt.remaining > 0.01 && generalQueue.length > 0) {
        const currentRepayment = generalQueue[0];
        const payAmount = Math.min(currentRepayment.amount, debt.remaining);

        if (payAmount <= 0) {
          generalQueue.shift();
          continue;
        }

        debt.links.push({ repaymentId: currentRepayment.id, amount: payAmount });

        debt.remaining -= payAmount;
        currentRepayment.amount -= payAmount;
        if (debt.remaining < 0) debt.remaining = 0;

        if (currentRepayment.amount < 0.01) {
          generalQueue.shift();
        }
      }
    }

    // === AGGREGATE BY TAG ===
    const tagMap = new Map<string, MonthlyDebtSummary>()

    personDebts.forEach(debt => {
      const tagValue = normalizeMonthTag(debt.tag) ?? debt.tag ?? null
      const occurredAt = debt.occurred_at ?? null
      const validDate = occurredAt ? new Date(occurredAt) : null
      const fallbackKey = validDate ? toYYYYMMFromDate(validDate) : null
      const groupingKey = tagValue ?? fallbackKey ?? 'unknown'
      const label = groupingKey === 'unknown' ? 'Debt' : groupingKey

      const finalPrice = calculateFinalPrice(debt)
      const rawAmount = Math.abs(Number(debt.amount ?? 0))
      const cashback = rawAmount - finalPrice

      if (!tagMap.has(groupingKey)) {
        tagMap.set(groupingKey, {
          tag: tagValue ?? undefined,
          tagLabel: label,
          amount: 0,
          total_debt: 0,
          total_cashback: 0,
          total_repaid: 0,
          status: 'active',
          occurred_at: validDate ? validDate.toISOString() : occurredAt,
          last_activity: occurredAt,
          links: []
        })
      }

      const current = tagMap.get(groupingKey)!

      if (debt.links && debt.links.length > 0) {
        (current as any).links = (current as any).links || [];
        debt.links.forEach((l: any) => {
          const exist = (current as any).links.find((x: any) => x.repaymentId === l.repaymentId);
          if (exist) exist.amount += l.amount;
          else (current as any).links.push({ ...l });
        });
      }

      current.amount += debt.remaining
      current.total_debt = (current.total_debt ?? 0) + finalPrice
      current.total_cashback = (current.total_cashback ?? 0) + cashback

      if (occurredAt && (!current.last_activity || occurredAt > current.last_activity)) {
        current.last_activity = occurredAt
      }
    })

    const entries = Array.from(tagMap.values()).map(summary => {
      const inferredRepaid = (summary.total_debt ?? 0) - summary.amount
      return {
        ...summary,
        total_repaid: Math.max(0, inferredRepaid)
      }
    })

    entries.sort((a, b) => {
      const dateA = a.occurred_at ? new Date(a.occurred_at).getTime() : 0
      const dateB = b.occurred_at ? new Date(b.occurred_at).getTime() : 0
      return dateB - dateA
    })

    monthlyDebtsByPerson.set(personId, entries.slice(0, 5))
  })

  const subscriptionMap = new Map<string, Array<{ id: string; name: string; slots: number; image_url?: string | null }>>()
  if (Array.isArray(subscriptionMembers)) {
    (subscriptionMembers as any[]).forEach(row => {
      if (!row.person_id) return
      if (!subscriptionMap.has(row.person_id)) {
        subscriptionMap.set(row.person_id, [])
      }
      if (row.service_id) {
        // Extract image_url from nested shops relation
        const imageUrl = row.subscriptions?.shops?.image_url ?? null
        subscriptionMap.get(row.person_id)?.push({
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

  const mapped = (profiles as unknown as PersonRow[] | null)?.map(person => {
    const debtInfo = debtAccountMap.get(person.id)
    const subs = subscriptionMap.get(person.id) ?? []

    // OLD LOGIC (Simple Net Balance) - Keeping 'balance' for reference/Display if needed, but FIFO is source of truth for debt structure.
    // Actually, 'balance' from DB (debtInfo.balance) is the REAL physical balance (Money lent - Money returned).
    // FIFO is a simulation of "Which debt is unpaid".
    // If FIFO Remaining > Balance, it means we have "General Repayment" that is not yet applied?
    // No, FIFO Logic Phase 2 allocates general repayment.
    // So FIFO Remaining SUM should equal Balance (approx).
    // Discrepancy comes when Balance triggers "Settled" (0) but FIFO says "Remains" (Partitioning issue).
    // We want 'outstanding_debt' to reflect the FIFO "Previous Cycles Remaining".

    // Use FIFO Data for Outstanding Calculation
    const personFifoDebts = monthlyDebtsByPerson.get(person.id) ?? []
    const fifoTotalRemaining = personFifoDebts.reduce((sum, d) => sum + d.amount, 0)

    // Breakdown Stats (Lifetime)
    // We sum up the aggregates from monthly buckets to get the total history for this person
    const totalNetLend = personFifoDebts.reduce((sum, d) => sum + (d.total_debt || 0), 0)
    const totalCashback = personFifoDebts.reduce((sum, d) => sum + (d.total_cashback || 0), 0)
    // Base Lend = Net + Cashback
    const totalBaseLend = totalNetLend + totalCashback

    // Identify Current Cycle Amount in FIFO
    // We match tag or date
    const fifoCurrentCycle = personFifoDebts
      .filter(d => {
        const isTagMatch = d.tag === currentCycleLabel
        const isDateMatch = d.occurred_at && new Date(d.occurred_at) >= currentMonthStart
        return isTagMatch || (!d.tag && isDateMatch)
      })
      .reduce((sum, d) => sum + d.amount, 0)

    const outstandingDebt = Math.max(0, fifoTotalRemaining - fifoCurrentCycle)

    // We can still use debtInfo.balance for the 'balance' field if we want the "Account Balance",
    // or use fifoTotalRemaining.
    // Usually 'balance' = 'Total Debt Load'.
    // Let's use fifoTotalRemaining to be 100% consistent with the card list.
    const displayBalance = fifoTotalRemaining

    return {
      id: person.id,
      name: person.name ?? '',
      email: person.email,
      image_url: person.image_url,
      sheet_link: person.sheet_link,
      google_sheet_url: person.google_sheet_url,
      sheet_full_img: (person as any).sheet_full_img ?? null,
      sheet_show_bank_account: (person as any).sheet_show_bank_account ?? false,
      sheet_bank_info: (person as any).sheet_bank_info ?? null,
      sheet_linked_bank_id: (person as any).sheet_linked_bank_id ?? null,
      sheet_show_qr_image: (person as any).sheet_show_qr_image ?? false,
      is_owner: (person as any).is_owner ?? null,
      is_archived: (person as any).is_archived ?? null,
      is_group: (person as any).is_group ?? null,
      group_parent_id: (person as any).group_parent_id ?? null,
      debt_account_id: debtInfo?.id ?? null,
      balance: displayBalance,
      current_cycle_debt: fifoCurrentCycle,
      outstanding_debt: outstandingDebt,
      current_cycle_label: currentCycleLabel,
      total_base_debt: totalBaseLend,
      total_cashback: totalCashback,
      total_net_debt: totalNetLend,
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
    .eq('person_id', personId)

  if (!subscriptionIds.length) {
    return
  }

  const rows = subscriptionIds.map<Partial<ServiceMemberRow>>(id => ({
    service_id: id,
    person_id: personId,
  }))

  const { error } = await (supabase
    .from('service_members')
    .insert as any)(rows as unknown as ServiceMemberRow[])

  if (error) {
    console.error('Failed to sync subscription memberships:', error)
  }
}

export async function updatePerson(
  id: string,
  data: {
    name?: string

    image_url?: string | null
    sheet_link?: string | null
    google_sheet_url?: string | null
    sheet_full_img?: string | null
    sheet_show_bank_account?: boolean
    sheet_bank_info?: string | null
    sheet_linked_bank_id?: string | null
    sheet_show_qr_image?: boolean
    subscriptionIds?: string[]
    is_owner?: boolean
    is_archived?: boolean
    is_group?: boolean
    group_parent_id?: string | null
  }
): Promise<boolean> {
  const supabase = createClient()
  const payload: PersonUpdate & { is_archived?: boolean } = {}
  const normalizedSheetLink =
    typeof data.sheet_link === 'undefined' ? undefined : data.sheet_link?.trim() || null
  const normalizedGoogleSheetUrl =
    typeof data.google_sheet_url === 'undefined' ? undefined : data.google_sheet_url?.trim() || null

  if (typeof data.name === 'string') payload.name = data.name.trim()

  if (typeof data.image_url !== 'undefined') payload.image_url = data.image_url?.trim() || null
  if (normalizedSheetLink !== undefined) payload.sheet_link = normalizedSheetLink
  if (normalizedGoogleSheetUrl !== undefined) payload.google_sheet_url = normalizedGoogleSheetUrl
  if (typeof data.sheet_full_img !== 'undefined') payload.sheet_full_img = data.sheet_full_img?.trim() || null
  if (typeof data.sheet_show_bank_account === 'boolean') payload.sheet_show_bank_account = data.sheet_show_bank_account
  if (typeof data.sheet_bank_info !== 'undefined') payload.sheet_bank_info = data.sheet_bank_info?.trim() || null
  if (typeof data.sheet_linked_bank_id !== 'undefined') payload.sheet_linked_bank_id = data.sheet_linked_bank_id || null
  if (typeof data.sheet_show_qr_image === 'boolean') payload.sheet_show_qr_image = data.sheet_show_qr_image
  if (typeof data.is_owner === 'boolean') payload.is_owner = data.is_owner
  if (typeof data.is_archived === 'boolean') payload.is_archived = data.is_archived
  if (typeof data.is_group === 'boolean') payload.is_group = data.is_group
  if (typeof data.group_parent_id !== 'undefined') {
    payload.group_parent_id = data.group_parent_id ? data.group_parent_id : null
  }

  if (Object.keys(payload).length > 0) {
    let { error, data: updateData } = await (supabase.from('people').update as any)(payload).eq('id', id).select()

    if (error?.code === '42703' || error?.code === 'PGRST204') {
      const {
        is_archived: _ignoreArchived,
        is_owner: _ignoreOwner,
        is_group: _ignoreGroup,
        group_parent_id: _ignoreParent,
        google_sheet_url: _ignoreSheet,
        ...fallbackPayload
      } = payload as any
      const fallback = await (supabase.from('people').update as any)(fallbackPayload).eq('id', id).select()
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
      .from('people')
      .select(
        'id, name, email, image_url, sheet_link, google_sheet_url, is_owner, is_archived, is_group, group_parent_id, sheet_full_img, sheet_show_bank_account, sheet_bank_info, sheet_linked_bank_id, sheet_show_qr_image'
      )
      .eq('id', id)
      .maybeSingle()

    if (attempt.error?.code === '42703' || attempt.error?.code === 'PGRST204') {
      const fallback = await supabase
        .from('people')
        .select('id, name, email, image_url, sheet_link, is_owner')
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
        .eq('person_id', id),
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

  const subscription_ids = (memberships as unknown as { service_id: string }[] | null)?.map(
    row => row.service_id
  ) ?? []
  const debt_account_id = (debtAccounts as unknown as { id: string; current_balance: number }[] | null)?.[0]?.id ?? null

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
    image_url: (profile as any).image_url,
    sheet_link: (profile as any).sheet_link,
    google_sheet_url: (profile as any).google_sheet_url,
    sheet_full_img: (profile as any).sheet_full_img ?? null,
    sheet_show_bank_account: (profile as any).sheet_show_bank_account ?? false,
    sheet_bank_info: (profile as any).sheet_bank_info ?? null,
    sheet_linked_bank_id: (profile as any).sheet_linked_bank_id ?? null,
    sheet_show_qr_image: (profile as any).sheet_show_qr_image ?? false,
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
