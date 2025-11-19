import { NextRequest, NextResponse } from 'next/server'

import { getCashbackProgress } from '@/services/cashback.service'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const offsetParam = url.searchParams.get('monthOffset')
  const accountId = url.searchParams.get('accountId')
  const parsedOffset = Number(offsetParam ?? '0')
  const monthOffset = Number.isFinite(parsedOffset) ? Math.trunc(parsedOffset) : 0
  const filter = accountId ? [accountId] : undefined

  const cards = await getCashbackProgress(monthOffset, filter)

  return NextResponse.json(cards)
}
