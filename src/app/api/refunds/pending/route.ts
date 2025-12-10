import { NextResponse } from 'next/server'

import { getPendingRefunds } from '@/services/transaction.service'

export async function GET() {
  try {
    const items = await getPendingRefunds()
    const total = items.reduce((sum, item) => sum + Math.abs(item.amount || 0), 0)
    return NextResponse.json({ total, items })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Failed to load pending refunds' }, { status: 500 })
  }
}
