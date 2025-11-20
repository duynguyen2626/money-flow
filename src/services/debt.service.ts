'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'

type DebtAccount = {
  id: string
  name: string
  current_balance: number | null
  owner_id: string | null
}

type Profile = {
  id: string
  name: string
  avatar_url: string | null
}

type DebtAccountWithProfile = DebtAccount & {
  profiles: Profile | null
}

type DebtByTagResult = {
  tag: string;
  balance: number | string; // Có thể là string hoặc number tùy theo dữ liệu trả về
  status: string;
  last_activity: string;
}

type Account = Database['public']['Tables']['accounts']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']

export async function getDebtAccounts(): Promise<DebtAccount[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, current_balance, owner_id')
    .eq('type', 'debt')
    .order('current_balance', { ascending: false })

  if (error) {
    console.error('Error fetching debt accounts:', error)
    return []
  }

  return (data as DebtAccount[]).map(item => ({
    id: item.id,
    name: item.name,
    current_balance: item.current_balance ?? 0,
    owner_id: item.owner_id,
  }))
}

// New function to get person details
export async function getPersonDetails(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id, 
      name, 
      current_balance, 
      owner_id,
      profiles (id, name, avatar_url)
    `)
    .eq('id', id)
    .eq('type', 'debt')
    .single()

  if (error) {
    console.error('Error fetching person details:', error)
    return null
  }

  const accountData = data as unknown as DebtAccountWithProfile

  // Trả về đối tượng với đầy đủ thông tin
  return {
    id: accountData.id,
    name: accountData.profiles?.name || accountData.name, // Ưu tiên tên từ profile nếu có
    current_balance: accountData.current_balance ?? 0,
    owner_id: accountData.owner_id,
    avatar_url: accountData.profiles?.avatar_url || null
  }
}

// New function to get debt grouped by tags
export async function getDebtByTags(personId: string) {
  const supabase = createClient()

  console.log('Fetching debt by tags with personId:', personId);

  // Thay thế RPC function bằng truy vấn trực tiếp
  const { data, error } = await supabase
    .from('transaction_lines')
    .select(`
      transactions(tag, occurred_at, id),
      amount
    `)
    .eq('account_id', personId)
    // Sửa lại cú pháp sắp xếp
    .order('occurred_at', { foreignTable: 'transactions', ascending: false });

  console.log('Query result:', { data, error });
  console.log('Query error details:', JSON.stringify(error, null, 2));

  if (error) {
    console.error('Error fetching debt by tags:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    return []
  }

  // Kiểm tra dữ liệu trả về
  if (!data) {
    console.warn('No data returned from debt query')
    return []
  }

  console.log('Raw data from query:', data);

  // Xử lý dữ liệu để nhóm theo tag
  const tagMap: { [key: string]: { balance: number, last_activity: string } } = {};
  
  data.forEach(item => {
    const tag = item.transactions?.tag || 'UNTAGGED';
    const amount = item.amount || 0;
    const occurredAt = item.transactions?.occurred_at || '';
    
    if (!tagMap[tag]) {
      tagMap[tag] = { balance: 0, last_activity: occurredAt };
    }
    
    tagMap[tag].balance += amount;
    if (occurredAt > tagMap[tag].last_activity) {
      tagMap[tag].last_activity = occurredAt;
    }
  });

  // Chuyển đổi sang mảng
  const result = Object.entries(tagMap).map(([tag, { balance, last_activity }]) => ({
    tag,
    balance,
    status: Math.abs(balance) < 0.01 ? 'settled' : 'active',
    last_activity
  }));

  console.log('Processed debt cycles:', JSON.stringify(result, null, 2));
  return result;
}

type SettleDebtResult = {
  transactionId: string
  direction: 'collect' | 'repay'
  amount: number
}

export async function settleDebt(
  debtAccountId: string,
  amount: number,
  targetBankAccountId: string,
  note: string,
  date: Date
): Promise<SettleDebtResult | null> {
  const supabase = createClient()

  const { data: debtAccount, error: debtError } = await supabase
    .from('accounts')
    .select('id, name, current_balance')
    .eq('id', debtAccountId)
    .eq('type', 'debt')
    .single()

  if (debtError || !debtAccount) {
    console.error('Debt account not found for settlement:', debtError)
    return null
  }

  const currentBalance = (debtAccount.current_balance as number) ?? 0
  if (currentBalance === 0) {
    console.warn('Attempt to settle an already balanced debt account.')
    return null
  }

  const settlementDirection: SettleDebtResult['direction'] =
    currentBalance > 0 ? 'collect' : 'repay'
  const sanitizedAmount = Math.min(Math.abs(amount), Math.abs(currentBalance))

  if (!sanitizedAmount || Number.isNaN(sanitizedAmount)) {
    console.error('Invalid settlement amount calculated:', sanitizedAmount)
    return null
  }

  const transactionNote = `Settlement with ${(debtAccount as Account).name}${
    note ? ` - ${note}` : ''
  }`

  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      occurred_at: date.toISOString(),
      note: transactionNote,
      status: 'posted',
    } as Partial<Transaction>)
    .select()
    .single()

  if (transactionError || !transaction) {
    console.error('Failed to create settlement transaction header:', transactionError)
    return null
  }

  const absoluteAmount = Math.abs(sanitizedAmount)
  const lines =
    settlementDirection === 'collect'
      ? [
          {
            account_id: targetBankAccountId,
            amount: absoluteAmount,
            type: 'debit' as const,
          },
          {
            account_id: debtAccountId,
            amount: -absoluteAmount,
            type: 'credit' as const,
          },
        ]
      : [
          {
            account_id: targetBankAccountId,
            amount: -absoluteAmount,
            type: 'credit' as const,
          },
          {
            account_id: debtAccountId,
            amount: absoluteAmount,
            type: 'debit' as const,
          },
        ]

  const { error: linesError } = await supabase.from('transaction_lines').insert(
    lines.map(line => ({
      ...line,
      transaction_id: (transaction as Transaction).id,
    }))
  )

  if (linesError) {
    console.error('Failed to create settlement transaction lines:', linesError)
    return null
  }

  return {
    transactionId: (transaction as Transaction).id,
    direction: settlementDirection,
    amount: absoluteAmount,
  }
}