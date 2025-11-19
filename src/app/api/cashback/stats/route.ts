import { NextRequest, NextResponse } from 'next/server'

import { getAccountSpendingStats } from '@/services/cashback.service'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)

  const accountId = url.searchParams.get('accountId')
  if (!accountId) {
    return NextResponse.json(
      { error: 'accountId is required for cashback stats' },
      { status: 400 }
    )
  }

  const dateParam = url.searchParams.get('date')
  const parsedDate = dateParam ? new Date(dateParam) : new Date()
  const referenceDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate

  const stats = await getAccountSpendingStats(accountId, referenceDate)

  return NextResponse.json(stats)
}
