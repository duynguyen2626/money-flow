'use server'

import { createClient } from '@/lib/supabase/server'

type DebtLookupLine = {
  account_id?: string | null
  person_id?: string | null
}

export async function resolveMissingDebtAccountIds(
  supabase: ReturnType<typeof createClient>,
  lines: DebtLookupLine[]
) {
  const personIds = Array.from(
    new Set(
      lines
        .filter(line => line.person_id && !line.account_id)
        .map(line => line.person_id!)
    )
  )

  if (personIds.length === 0) {
    return
  }

  const { data, error } = await supabase
    .from('accounts')
    .select('id, owner_id')
    .eq('type', 'debt')
    .in('owner_id', personIds)

  if (error) {
    console.error('Failed to resolve debt accounts for transaction lines:', error)
    return
  }

  const accountMap = new Map<string, string>()
  ;(data as unknown as Array<{ id: string; owner_id?: string | null }> | null)?.forEach(row => {
    if (row.owner_id) {
      accountMap.set(row.owner_id, row.id)
    }
  })

  for (const line of lines) {
    if (line.person_id && !line.account_id) {
      const resolvedId = accountMap.get(line.person_id)
      if (resolvedId) {
        line.account_id = resolvedId
      }
    }
  }
}
