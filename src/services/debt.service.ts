'use server'

import { createClient } from '@/lib/supabase/server'
import { DebtAccount } from '@/types/moneyflow.types'
import { toYYYYMMFromDate, normalizeMonthTag } from '@/lib/month-tag'
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
  remainingPrincipal: number;
  links: { repaymentId: string, amount: number }[];
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
    if (error) console.log('Error fetching person details:', error)
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
    .select('tag, occurred_at, amount, type, person_id, status, cashback_share_percent, cashback_share_fixed, final_price, id, metadata')
    .eq('person_id', personId)
    .neq('status', 'void')
    .order('occurred_at', { ascending: true }) // Oldest first for FIFO

  if (error || !data) {
    if (error) console.log('Error fetching debt by tags:', error)
    return []
  }

  // FIFO Simulation to determine "Remaining" amount for each debt
  // 1. Separate Debts and Repayments
  const debtsMap = new Map<string, { remaining: number, links: { repaymentId: string, amount: number }[] }>()
  const debtsList: any[] = []

  // Repayment objects that we will process
  type RepaymentItem = {
    id: string;
    amount: number;
    initialAmount: number;
    date: string;
    metadata: any;
    tag?: string | null;
  };
  const repaymentList: RepaymentItem[] = [];

  data.forEach((txn: any) => {
    const type = txn.type
    if (type === 'debt' || type === 'expense') {
      const amount = Math.abs(txn.amount)
      debtsList.push({ ...txn, remaining: amount })
      debtsMap.set(txn.id, { remaining: amount, links: [] }) // Init links
    } else if (type === 'repayment' || type === 'income') {
      repaymentList.push({
        id: txn.id,
        amount: calculateFinalPrice(txn as any),
        initialAmount: calculateFinalPrice(txn as any),
        date: txn.occurred_at,
        metadata: txn.metadata,
        tag: txn.tag
      });
    }
  })

  // Sort lists
  // Debts: Oldest First (FIFO targets)
  debtsList.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
  // Repayments: Oldest First
  repaymentList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // === PHASE 1: PRE-ALLOCATED (TARGETED) REPAYMENTS ===
  // If a repayment has metadata specifying which debts it covers, apply that first.
  for (const repay of repaymentList) {
    const targets = repay.metadata?.bulk_allocation?.debts;
    if (Array.isArray(targets) && targets.length > 0) {
      targets.forEach((target: any) => {
        const debtId = target.id;
        const targetAmount = Number(target.amount || 0); // The amount allocated to this debt

        if (debtId && targetAmount > 0) {
          const debtEntry = debtsMap.get(debtId);

          // Verify debt exists and repay has balance
          if (debtEntry && repay.amount > 0) {
            // Determine how much to pay: 
            // We trust the `targetAmount` from metadata, BUT we are limited by available funds 
            // and the debt's actual size (though metadata *should* be accurate).
            // Actually, if user "Overpays" in UI, targetAmount might > debt.remaining.
            // We should record the payment even if it exceeds remaining? 
            // For "remainingPrincipal" calculation, we floor at 0. 
            // But for "links", we record what was paid.

            // Let's cap at repayment balance.
            const pay = Math.min(targetAmount, repay.amount);

            // Apply
            debtEntry.remaining -= pay;
            if (debtEntry.remaining < 0) debtEntry.remaining = 0; // Cap floor

            repay.amount -= pay;

            // Link
            debtEntry.links.push({ repaymentId: repay.id, amount: pay });

            console.log(`[DebtFIFO-TARGET] Pay ${pay} to ${debtId} from ${repay.id}. RepayRem: ${repay.amount}`);
          }
        }
      });
    }
  }

  // === PHASE 1.5: TAG MATCHING ===
  // If a repayment has a tag (e.g. "2024-05"), prioritize paying debts with the SAME tag.
  for (const repay of repaymentList) {
    if (repay.amount <= 0.01) continue;

    const repayTag = normalizeMonthTag(repay.metadata?.tag || repay.tag);

    if (repayTag) {
      // Find debts with matching tag (Oldest First)
      for (const debt of debtsList) {
        const entry = debtsMap.get(debt.id)!;
        if (entry.remaining <= 0.01) continue;

        const debtTag = normalizeMonthTag(debt.tag);
        if (debtTag === repayTag) {
          const pay = Math.min(repay.amount, entry.remaining);

          entry.remaining -= pay;
          repay.amount -= pay;
          if (entry.remaining < 0) entry.remaining = 0;

          entry.links.push({ repaymentId: repay.id, amount: pay });
          console.log(`[DebtFIFO-TAGGED] Pay ${pay} to ${debt.id} from ${repay.id} (Tag: ${debtTag})`);

          if (repay.amount <= 0.01) break; // Repayment exhausted
        }
      }
    }
  }

  // === PHASE 2: GENERAL FIFO (Waterfalls) ===
  // Apply any remaining repayment balance to any remaining debt balance (Oldest First)
  // This covers:
  // 1. Repayments without metadata (legacy)
  // 2. Repayments with "Unallocated" surplus
  // 3. Debts that weren't fully covered by targets
  // FIX: Exclude tagged repayments from waterfall. If tagged, they stay in their tag bucket.

  const generalQueue = repaymentList.filter(r => {
    if (r.amount <= 0.01) return false;
    const tag = normalizeMonthTag(r.metadata?.tag || r.tag);
    return !tag; // Only include untagged repayments
  });

  for (const debt of debtsList) {
    const entry = debtsMap.get(debt.id)!

    // While debt has remaining amount AND we have general money available
    while (entry.remaining > 0.01 && generalQueue.length > 0) {
      const currentRepayment = generalQueue[0]; // Peek

      // Strict FIFO: Apply whatever is available to this debt
      const payAmount = Math.min(currentRepayment.amount, entry.remaining);

      if (payAmount <= 0) {
        generalQueue.shift();
        continue;
      }

      // Record Link
      entry.links.push({
        repaymentId: currentRepayment.id,
        amount: payAmount
      });

      // Update Balances
      entry.remaining -= payAmount;
      currentRepayment.amount -= payAmount;
      if (entry.remaining < 0) entry.remaining = 0;

      console.log(`[DebtFIFO-GENERAL] Pay ${payAmount} for ${debt.tag} (Rem: ${entry.remaining})`);

      // If Repayment exhausted, remove from queue
      if (currentRepayment.amount < 0.01) {
        generalQueue.shift();
      }
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
      remainingPrincipal: number // Sum of 'remaining' of debts in this tag
      links: { repaymentId: string, amount: number }[] // NEW: Collected links
    }
  >()

    ; (data as unknown as (DebtTransactionRow & { id: string })[]).forEach(row => {
      const normalizedTag = normalizeMonthTag(row.tag)
      const tag = normalizedTag?.trim() ? normalizedTag.trim() : (row.tag?.trim() ? row.tag.trim() : 'UNTAGGED')
      const baseType = resolveBaseType(row.type)
      const finalPrice = calculateFinalPrice(row)
      const occurredAt = row.occurred_at ?? ''

      if (!tagMap.has(tag)) {
        tagMap.set(tag, { lend: 0, lendOriginal: 0, repay: 0, cashback: 0, last_activity: occurredAt, remainingPrincipal: 0, links: [] })
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
          if (row.tag?.includes('2025-10')) {
            console.log(`[DebtAgg-DEBUG] ID: ${row.id} | Tag: ${row.tag} | MapRem: ${fifoEntry.remaining}`);
          }
          current.remainingPrincipal += fifoEntry.remaining
          // Add links (deduplicate by ID if needed, but array is fine for now)
          fifoEntry.links.forEach(link => {
            // Check if already added to tag (optional, but cleaner)
            const exists = current.links.find(l => l.repaymentId === link.repaymentId);
            if (exists) {
              exists.amount += link.amount;
            } else {
              current.links.push({ ...link });
            }
          });
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

  return Array.from(tagMap.entries()).map(([tag, { lend, lendOriginal, repay, cashback, last_activity, remainingPrincipal, links }]) => {
    const netBalance = lend - repay

    // Status Logic:
    let status = 'active'
    if (remainingPrincipal < 500) {
      status = 'settled'
    } else {
      // Debug: Why is it still active?
      // if (tag.includes('2025-10') || tag.includes('2025-11') || tag.includes('2025-12')) {
      //   console.log(`[DebtStatus-Active] Tag: ${tag} | Remaining: ${remainingPrincipal} | Net: ${netBalance}`);
      // }
    }

    return {
      tag,
      netBalance,
      originalPrincipal: lend,
      totalOriginalDebt: lendOriginal,
      totalBack: repay,
      totalCashback: cashback,
      status,
      last_activity,
      remainingPrincipal,
      links // Use destructured variable
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
