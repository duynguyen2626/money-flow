'use server'

import { createClient } from '@/lib/supabase/server'
import { DebtAccount } from '@/types/moneyflow.types'
import { CreateTransactionInput, createTransaction } from './transaction.service'

type TransactionType = 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'

type DebtTransactionRow = {
  amount: number | null
  type: TransactionType | null
  person_id: string | null
  tag?: string | null
  occurred_at?: string | null
  status?: string | null
  // Cashback fields for final price calculation
  cashback_share_percent?: string | number | null
  cashback_share_fixed?: string | number | null
  final_price?: number | null
}

export type DebtByTagAggregatedResult = {
  tag: string;
  netBalance: number;
  originalPrincipal: number;
  totalOriginalDebt: number; // New field for raw aggregated debt (before cashback)
  totalBack: number;
  totalCashback: number;
  status: string;
  last_activity: string;
  manual_allocations?: Record<string, number>;
}

type SettleDebtResult = {
  transactionId: string
  direction: 'collect' | 'repay'
  amount: number
}

function resolveBaseType(type: TransactionType | null | undefined): 'income' | 'expense' | 'transfer' {
  if (type === 'repayment') return 'income'
  if (type === 'debt') return 'expense'
  if (type === 'transfer') return 'transfer'
  if (type === 'income') return 'income'
  return 'expense'
}

/**
 * Calculate final price (amount after cashback deduction)
 * Final Price = Amount - Cashback
 * Cashback = (amount * percent/100) + fixed
 */
function calculateFinalPrice(row: DebtTransactionRow): number {
  // Safe parsing for final_price
  if (row.final_price !== undefined && row.final_price !== null) {
    const parsed = Number(row.final_price)
    if (!isNaN(parsed)) {
      return Math.abs(parsed)
    }
  }

  const rawAmount = Math.abs(Number(row.amount ?? 0))

  // Parse cashback values
  const percentVal = Number(row.cashback_share_percent ?? 0)
  const fixedVal = Number(row.cashback_share_fixed ?? 0)

  // Normalize percent (could be stored as 2 for 2% or 0.02 for 2%)
  const normalizedPercent = (percentVal > 1 ? percentVal / 100 : percentVal)

  // Safe cashback calc
  const safePercent = isNaN(normalizedPercent) ? 0 : normalizedPercent
  const cashbackFromPercent = rawAmount * safePercent
  const totalCashback = cashbackFromPercent + fixedVal

  // Final price = amount - cashback
  return rawAmount - totalCashback
}

export async function computeDebtFromTransactions(rows: DebtTransactionRow[], personId: string): Promise<number> {
  return rows
    .filter(row => row?.person_id === personId && row.status !== 'void')
    .reduce((sum, row) => {
      const finalPrice = calculateFinalPrice(row)
      const baseType = resolveBaseType(row.type)
      if (baseType === 'income') {
        return sum - finalPrice
      }
      if (baseType === 'expense') {
        return sum + finalPrice
      }
      return sum
    }, 0)
}

export async function getPersonDebt(personId: string): Promise<number> {
  if (!personId) return 0
  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type, person_id, status, cashback_share_percent, cashback_share_fixed, final_price')
    .eq('person_id', personId)

  if (error || !data) {
    if (error) console.error('Error fetching person debt:', error)
    return 0
  }

  return await computeDebtFromTransactions(data as unknown as DebtTransactionRow[], personId)
}

export async function getDebtAccounts(): Promise<DebtAccount[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('person_id')
    .not('person_id', 'is', null)

  if (error) {
    console.error('Error fetching debt accounts:', error)
    return []
  }

  const personIds = Array.from(
    new Set(
      ((data ?? []) as unknown as Array<{ person_id: string | null }>).map(row => row.person_id).filter(Boolean) as string[]
    )
  )

  if (personIds.length === 0) return []

  const [profilesRes, debtValues] = await Promise.all([
    supabase.from('profiles').select('id, name, avatar_url, sheet_link').in('id', personIds),
    Promise.all(personIds.map(id => getPersonDebt(id))),
  ])

  const profileMap = new Map<string, { name: string; avatar_url: string | null; sheet_link: string | null }>()
    ; (profilesRes.data ?? []).forEach((row: any) => {
      if (!row?.id) return
      profileMap.set(row.id, {
        name: row.name,
        avatar_url: row.avatar_url ?? null,
        sheet_link: row.sheet_link ?? null,
      })
    })

  return personIds.map((id, index) => {
    const profile = profileMap.get(id)
    return {
      id,
      name: profile?.name ?? 'Unknown',
      current_balance: debtValues[index] ?? 0,
      owner_id: id,
      avatar_url: profile?.avatar_url ?? null,
      sheet_link: profile?.sheet_link ?? null,
    }
  })
}

export async function getPersonDetails(id: string): Promise<{
  id: string
  name: string
  current_balance: number
  owner_id: string
  avatar_url: string | null
  sheet_link: string | null
  google_sheet_url: string | null
  sheet_full_img: string | null
  sheet_show_bank_account: boolean
  sheet_show_qr_image: boolean
} | null> {
  const supabase = createClient()

  // Add new columns to SELECT
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, sheet_link, google_sheet_url, sheet_full_img, sheet_show_bank_account, sheet_show_qr_image')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[getPersonDetails] Main query error:', error)
  }

  if (error?.code === '42703' || error?.code === 'PGRST204') {
    console.warn('[getPersonDetails] Column missing, using fallback (settings will be lost)')
    // Fallback if google_sheet_url column doesn't exist
    const fallback = await supabase
      .from('profiles')
      .select('id, name, avatar_url, sheet_link')
      .eq('id', id)
      .maybeSingle()
    return fallback.data ? {
      ...(fallback.data as any),
      name: (fallback.data as any).name ?? 'Unknown',
      owner_id: (fallback.data as any).id,
      current_balance: await getPersonDebt(id), // Recalculate or reuse logic below
      google_sheet_url: null,
      sheet_full_img: null,
      sheet_show_bank_account: false,
      sheet_show_qr_image: false
    } : null
  }

  if (error || !data) {
    if (error) console.error('Error fetching person details:', error)
    return null
  }

  const profile = data as any // simpler casting since we added fields

  const currentBalance = await getPersonDebt(id)
  return {
    id: profile.id,
    name: profile.name,
    current_balance: currentBalance,
    owner_id: profile.id,
    avatar_url: profile.avatar_url ?? null,
    sheet_link: profile.sheet_link ?? null,
    google_sheet_url: profile.google_sheet_url ?? null,
    sheet_full_img: profile.sheet_full_img ?? null,
    sheet_show_bank_account: profile.sheet_show_bank_account ?? false,
    sheet_show_qr_image: profile.sheet_show_qr_image ?? false
  }
}

export async function getDebtByTags(personId: string): Promise<DebtByTagAggregatedResult[]> {
  if (!personId) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('tag, occurred_at, amount, type, person_id, status, cashback_share_percent, cashback_share_fixed, final_price, id')
    .eq('person_id', personId)
    .neq('status', 'void')
    .order('occurred_at', { ascending: true }) // Oldest first for FIFO

  if (error || !data) {
    if (error) console.error('Error fetching debt by tags:', error)
    return []
  }

  // FIFO Simulation to determine "Remaining" amount for each debt
  // 1. Separate Debts and Repayments
  const debtsMap = new Map<string, { remaining: number }>()
  const debtsList: any[] = []
  const repaymentPool: number[] = []

  data.forEach((txn: any) => {
    const type = txn.type
    if (type === 'debt' || type === 'expense') {
      const amount = Math.abs(txn.amount)
      debtsList.push({ ...txn, remaining: amount })
      debtsMap.set(txn.id, { remaining: amount })
    } else if (type === 'repayment' || type === 'income') {
      repaymentPool.push(Math.abs(txn.amount))
      // console.error(`[DebtService] Found Repayment: ${txn.amount} (${txn.occurred_at})`);
    }
  })

  // 2. Apply Repayments
  let totalRepayment = repaymentPool.reduce((a, b) => a + b, 0)

  console.error(`[DebtService] Person: ${personId} | Total Debt Items: ${debtsList.length} | Total Repayment Pool: ${totalRepayment}`);

  // Apply to debts OLDER to NEWER
  for (const debt of debtsList) {
    if (totalRepayment <= 0) break

    const entry = debtsMap.get(debt.id)!
    const amountToPay = Math.min(totalRepayment, entry.remaining);

    // Debug Log
    console.error(`[DebtDebug] Processing ${debt.tag} (${debt.occurred_at}). Rem: ${entry.remaining}. Pool: ${totalRepayment}. Paying: ${amountToPay}`);

    if (totalRepayment >= entry.remaining) {
      totalRepayment -= entry.remaining
      entry.remaining = 0
    } else {
      entry.remaining -= totalRepayment
      totalRepayment = 0
    }
  }

  // 3. Aggregate by Tag
  const tagMap = new Map<
    string,
    {
      lend: number
      lendOriginal: number
      repay: number
      cashback: number
      last_activity: string
      remainingPrincipal: number // NEW: Sum of 'remaining' of debts in this tag
    }
  >()

    ; (data as unknown as (DebtTransactionRow & { id: string })[]).forEach(row => {
      const tag = row.tag ?? 'UNTAGGED'
      const baseType = resolveBaseType(row.type)
      const finalPrice = calculateFinalPrice(row)
      const occurredAt = row.occurred_at ?? ''

      if (!tagMap.has(tag)) {
        tagMap.set(tag, { lend: 0, lendOriginal: 0, repay: 0, cashback: 0, last_activity: occurredAt, remainingPrincipal: 0 })
      }

      const current = tagMap.get(tag)!

      const rawAmount = Math.abs(Number(row.amount ?? 0))
      const percentVal = Number(row.cashback_share_percent ?? 0)
      const fixedVal = Number(row.cashback_share_fixed ?? 0)
      const normalizedPercent = percentVal > 1 ? percentVal / 100 : percentVal
      const cashback = (rawAmount * normalizedPercent) + fixedVal

      if (baseType === 'expense') {
        if (!isNaN(finalPrice)) {
          current.lend += finalPrice
        }
        if (!isNaN(rawAmount)) {
          current.lendOriginal += rawAmount
        }
        // Add remaining principal from our FIFO simulation
        const fifoEntry = debtsMap.get(row.id)
        if (fifoEntry) {
          current.remainingPrincipal += fifoEntry.remaining
        }
      } else if (baseType === 'income') {
        if (!isNaN(finalPrice)) {
          current.repay += finalPrice
        }
      }

      if (!isNaN(cashback)) {
        current.cashback += cashback
      }

      if (occurredAt && occurredAt > current.last_activity) {
        current.last_activity = occurredAt
      }
    })

  return Array.from(tagMap.entries()).map(([tag, { lend, lendOriginal, repay, cashback, last_activity, remainingPrincipal }]) => {
    const netBalance = lend - repay

    // Status Logic:
    // If remainingPrincipal is roughly 0, checks are cleared.
    // However, we must also consider if the tag itself has a net balance?
    // Actually, user wants "Settled" if debts are paid.
    // If remainingPrincipal < 0.01, it means all debts in this tag are covered (by ANY repayment, anywhere).
    // So status is Settled.

    // BUT: What if there is excess repayment in this tag?
    // e.g. Lend 100, Repay 150 (Advance).
    // RemainingPrincipal = 0.
    // Net Balance = -50.
    // Should be "Active" (You owe them)?
    // Or "Settled"? Usually "Settled" implies "Debt is cleared". "Credit" is different.
    // If netBalance < 0, it means "Overpaid".
    // Let's stick to: "Settled" if remainingPrincipal == 0 AND netBalance >= 0.
    // If netBalance < 0, it's "Active" (Credit).

    // Wait, simple view:
    // If remainingPrincipal > 0 -> Active (You are owed).
    // If remainingPrincipal == 0:
    //    If netBalance < 0 -> Active (You owe them). 
    //    Else -> Settled.

    // DEBUG: Log status determination
    // console.log(`[DebtStatus] Tag: ${tag} | Rem: ${remainingPrincipal} | Net: ${netBalance}`);

    let status = 'active'
    if (remainingPrincipal < 500) {
      status = 'settled'
      // Was checking netBalance < -500 for Credit, but removed to ensure "Settled" visual.
    } else {
      // Debug: Why is it still active?
      if (tag.includes('2025-10') || tag.includes('2025-11') || tag.includes('2025-12')) {
        console.error(`[DebtStatus-Active] Tag: ${tag} | Remaining: ${remainingPrincipal} | Net: ${netBalance}`);
      }
    }

    // console.log(`[DebtResult] Tag: ${tag} computed status: ${status}. Active Condition: Rem ${remainingPrincipal} >= 500`);

    return {
      tag,
      netBalance,
      originalPrincipal: lend,
      totalOriginalDebt: lendOriginal,
      totalBack: repay,
      totalCashback: cashback,
      status,
      last_activity,
    }
  })
}

export async function settleDebt(
  personId: string,
  amount: number,
  targetBankAccountId: string,
  note: string,
  date: Date,
  tag: string
): Promise<SettleDebtResult | null> {
  const net = await getPersonDebt(personId)
  const direction: SettleDebtResult['direction'] = net >= 0 ? 'collect' : 'repay'
  const txnType: TransactionType = direction === 'collect' ? 'repayment' : 'debt'

  const payload: CreateTransactionInput = {
    occurred_at: date.toISOString(),
    note,
    tag,
    type: txnType,
    amount: Math.abs(amount),
    source_account_id: targetBankAccountId,
    person_id: personId,
  }

  const transactionId = await createTransaction(payload)

  if (!transactionId) return null

  return {
    transactionId,
    direction,
    amount: Math.abs(amount),
  }
}

export async function getOutstandingDebts(personId: string, excludeTransactionId?: string): Promise<any[]> {
  if (!personId) return []
  const supabase = createClient()

  // Fetch transactions that are debts (expense) or repayments (income)
  // We want individual debt transactions (expenses with person_id)
  // And maybe calculate their remaining amount? 
  // FIFO usually applies to Debts (Lending).
  // We strictly look for type='debt' (Lending) or 'expense' (Legacy Lending?)
  // And we ignore 'repayment' here because we want to allocate AGAINST debts.
  // Although repayments REDUCE the pool.
  // The FIFO logic needs "Active Debts".
  // A debt is active if it hasn't been fully paid.
  // But our system aggregates.
  // If we want to simulate FIFO, we fetch ALL debt transactions, sorted by date.
  // And we fetch ALL repayment transactions.
  // Then we apply repayments to debts in order.
  // And return which debts are still unpaid.
  // This is complex for a simple "Preview".
  // Simplified approach: Return ALL 'debt' transactions.
  // The Preview Logic will handle the "Remaining Check" locally?
  // No, `allocateDebtRepayment` takes `debts` and `repaymentAmount`.
  // It assumes `debts` are what needs to be paid.
  // But if some are already paid, we shouldn't show them?
  // Correct.
  // So we need to apply PAST repayments first to find "Current Open Debts".

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('person_id', personId)
    .neq('status', 'void')
    .order('occurred_at', { ascending: true }) // Oldest first

  if (error || !data) return []

  // In-memory simulation of current state
  // 1. Separate Debts and Repayments
  const debts: any[] = []
  const repayments: any[] = []

  // Legacy support: type='expense' is debt, type='income' is repayment
  // Modern support: type='debt' is debt, type='repayment' is repayment
  data.forEach((txn: any) => {
    // If we are editing a transaction, we must exclude it from the history calculation
    // so that we can "re-apply" its effect.
    if (excludeTransactionId && txn.id === excludeTransactionId) return

    const type = txn.type
    if (type === 'debt' || type === 'expense') {
      debts.push({ ...txn, remaining: Math.abs(txn.amount) }) // Initialize remaining
    } else if (type === 'repayment' || type === 'income') {
      repayments.push(Math.abs(txn.amount))
    }
  })

  // 2. Apply historic repayments FIFO to debts
  let repaymentPool = repayments.reduce((sum, val) => sum + val, 0)

  const activeDebts: any[] = []

  for (const debt of debts) {
    if (repaymentPool <= 0) {
      activeDebts.push(debt)
      continue
    }

    const amount = debt.remaining
    if (repaymentPool >= amount) {
      repaymentPool -= amount
      debt.remaining = 0
      // Fully paid, don't include in active list?
      // Or include with 0? 
      // Usually we want OUTSTANDING debts.
      // So ignore.
    } else {
      debt.remaining -= repaymentPool
      repaymentPool = 0
      activeDebts.push(debt)
    }
  }

  // Return only debts that have remaining amount > 0
  return activeDebts.map(d => ({
    ...d,
    amount: d.remaining // Update amount to be the 'Remaining Principal'
  }))
}
