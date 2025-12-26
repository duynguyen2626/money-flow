import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isYYYYMM, normalizeMonthTag } from '@/lib/month-tag'
import { createCycleSheet, syncCycleTransactions } from '@/services/sheet.service'
import type { ManageCycleSheetRequest, ManageCycleSheetResponse } from '@/types/sheet.types'

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ManageCycleSheetRequest
    const personId = payload?.personId?.trim()
    const rawCycle = payload?.cycleTag?.trim()

    if (!personId || !rawCycle) {
      return NextResponse.json({ error: 'Missing personId or cycleTag' }, { status: 400 })
    }

    const normalizedCycle = normalizeMonthTag(rawCycle)
    if (!normalizedCycle || !isYYYYMM(normalizedCycle)) {
      return NextResponse.json({ error: 'Invalid cycleTag format' }, { status: 400 })
    }

    const supabase = createClient()
    type CycleSheetRow = { id: string; sheet_id?: string | null; sheet_url?: string | null }
    let existing: CycleSheetRow | null = null
    let tableAvailable = true

    const existingResult = await (supabase as any)
      .from('person_cycle_sheets')
      .select('id, sheet_id, sheet_url')
      .eq('person_id', personId)
      .eq('cycle_tag', normalizedCycle)
      .maybeSingle()

    if (existingResult.error) {
      tableAvailable = false
      console.warn('person_cycle_sheets lookup failed:', existingResult.error)
    } else {
      existing = existingResult.data as CycleSheetRow | null
    }

    let status: ManageCycleSheetResponse['status'] = 'synced'
    let sheetUrl = existing?.sheet_url ?? null
    let sheetId = existing?.sheet_id ?? null

    if (!existing) {
      const createResult = await createCycleSheet(personId, normalizedCycle)
      if (!createResult.success) {
        return NextResponse.json({ error: createResult.message ?? 'Create failed' }, { status: 400 })
      }

      status = 'created'
      sheetUrl = createResult.sheetUrl ?? null
      sheetId = createResult.sheetId ?? null

      if (tableAvailable) {
        await (supabase as any)
          .from('person_cycle_sheets')
          .insert({
            person_id: personId,
            cycle_tag: normalizedCycle,
            sheet_id: sheetId,
            sheet_url: sheetUrl,
          })
      }
    } else if (tableAvailable) {
      await (supabase as any)
        .from('person_cycle_sheets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }

    const syncResult = await syncCycleTransactions(personId, normalizedCycle, sheetId)
    if (!syncResult.success) {
      return NextResponse.json({ error: syncResult.message ?? 'Sync failed' }, { status: 400 })
    }

    return NextResponse.json({ status, sheetUrl, sheetId })
  } catch (error: any) {
    console.error('Manage sheet endpoint failed:', error)
    return NextResponse.json({ error: error?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
