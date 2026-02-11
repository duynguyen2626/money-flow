import { NextResponse } from 'next/server'

import { getPendingRefunds } from '@/services/transaction.service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const items = await getPendingRefunds(accountId || undefined)
    const total = items.reduce((sum, item) => sum + Math.abs(item.amount || 0), 0)
    return NextResponse.json({ total, items })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Failed to load pending refunds' }, { status: 500 })
  }
}
