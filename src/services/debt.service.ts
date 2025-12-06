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
}

export type DebtByTagAggregatedResult = {
  tag: string;
  netBalance: number;
  originalPrincipal: number;
  totalBack: number;
  status: string;
  last_activity: string;
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

export async function computeDebtFromTransactions(rows: DebtTransactionRow[], personId: string): Promise<number> {
  return rows
    .filter(row => row?.person_id === personId && row.status !== 'void')
    .reduce((sum, row) => {
      const amount = Math.abs(Number(row.amount ?? 0))
      const baseType = resolveBaseType(row.type)
      if (baseType === 'income') {
        return sum - amount
      }
      if (baseType === 'expense') {
        return sum + amount
      }
      return sum
    }, 0)
}

export async function getPersonDebt(personId: string): Promise<number> {
  if (!personId) return 0
  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type, person_id, status')
    .eq('person_id', personId)

  if (error || !data) {
    if (error) console.error('Error fetching person debt:', error)
    return 0
  }

  return await computeDebtFromTransactions(data as DebtTransactionRow[], personId)
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
      ((data ?? []) as Array<{ person_id: string | null }>).map(row => row.person_id).filter(Boolean) as string[]
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

export async function getPersonDetails(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, sheet_link')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('Error fetching person details:', error)
    return null
  }

  const profile = data as { id: string; name: string; avatar_url: string | null; sheet_link: string | null }
  const currentBalance = await getPersonDebt(id)
  return {
    id: profile.id,
    name: profile.name,
    current_balance: currentBalance,
    owner_id: profile.id,
    avatar_url: profile.avatar_url ?? null,
    sheet_link: profile.sheet_link ?? null,
  }
}

export async function getDebtByTags(personId: string): Promise<DebtByTagAggregatedResult[]> {
  if (!personId) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('tag, occurred_at, amount, type, person_id, status')
    .eq('person_id', personId)
    .neq('status', 'void')
    .order('occurred_at', { ascending: false })

  if (error || !data) {
    if (error) console.error('Error fetching debt by tags:', error)
    return []
  }

  const tagMap = new Map<
    string,
    {
      lend: number
      repay: number
      last_activity: string
    }
  >()

    ; (data as DebtTransactionRow[]).forEach(row => {
      const tag = row.tag ?? 'UNTAGGED'
      const baseType = resolveBaseType(row.type)
      const amount = Math.abs(Number(row.amount ?? 0))
      const occurredAt = row.occurred_at ?? ''

      if (!tagMap.has(tag)) {
        tagMap.set(tag, { lend: 0, repay: 0, last_activity: occurredAt })
      }

      const current = tagMap.get(tag)!
      if (baseType === 'expense') {
        current.lend += amount
      } else if (baseType === 'income') {
        current.repay += amount
      }

      if (occurredAt && occurredAt > current.last_activity) {
        current.last_activity = occurredAt
      }
    })

  return Array.from(tagMap.entries()).map(([tag, { lend, repay, last_activity }]) => {
    const netBalance = lend - repay
    return {
      tag,
      netBalance,
      originalPrincipal: lend,
      totalBack: repay,
      status: Math.abs(netBalance) < 0.01 ? 'settled' : 'active',
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
