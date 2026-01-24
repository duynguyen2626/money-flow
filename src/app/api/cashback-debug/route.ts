import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCashbackProgress } from '@/services/cashback.service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const name = searchParams.get('name') || ''

    const supabase = await createClient()
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('type', 'credit_card') as any

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const target = (accounts || []).find((a: any) => a.name.toLowerCase().includes(name.toLowerCase()))
    if (!target) {
      return NextResponse.json({ error: 'Account not found', name }, { status: 404 })
    }

    const perYear = await getCashbackProgress(0, [target.id], new Date(year, 0, 15), false)
    const perMonth: any[] = []
    for (let m = 1; m <= 12; m++) {
      const monthCards = await getCashbackProgress(0, [target.id], new Date(year, m - 1, 15), true)
      const monthCard = monthCards[0]
      perMonth.push({
        month: m,
        totalGivenAway: monthCard?.totalGivenAway || 0,
        netProfit: monthCard?.netProfit || 0,
        sharedAmount: monthCard?.sharedAmount || 0,
        totalEarned: monthCard?.totalEarned || 0,
        txCount: monthCard?.transactions?.length || 0,
      })
    }

    return NextResponse.json({
      account: target,
      year,
      summary: perYear[0] || null,
      months: perMonth
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
