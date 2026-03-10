import { NextResponse } from 'next/server'
import { getLastTransactionAccountId } from '@/actions/account-actions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const accountId = await getLastTransactionAccountId()
    return NextResponse.json({ accountId: accountId ?? null })
  } catch (error) {
    console.error('[api/accounts/last-transaction-account] failed', error)
    return NextResponse.json({ accountId: null }, { status: 200 })
  }
}
