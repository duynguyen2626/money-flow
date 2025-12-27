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

    console.info('[ManageSheet API] request', { personId, cycleTag: normalizedCycle })

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
    const existingRowId = existing?.id ?? null
    const hasSheetInfo = Boolean(existing?.sheet_id || existing?.sheet_url)
    let sheetUrl =
      existing?.sheet_url ??
      (existing?.sheet_id ? `https://docs.google.com/spreadsheets/d/${existing.sheet_id}` : null)
    let sheetId = existing?.sheet_id ?? null
    console.info('[ManageSheet API] existing', { found: !!existing, sheetId, sheetUrl, hasSheetInfo })

    if (!hasSheetInfo) {
      const createResult = await createCycleSheet(personId, normalizedCycle)
      console.info('[ManageSheet API] create result', createResult)
      if (!createResult.success) {
        return NextResponse.json({ error: createResult.message ?? 'Create failed' }, { status: 400 })
      }

      status = 'created'
      sheetUrl = createResult.sheetUrl ?? sheetUrl ?? null
      sheetId = createResult.sheetId ?? sheetId ?? null

      if (tableAvailable) {
        const payload = {
          person_id: personId,
          cycle_tag: normalizedCycle,
          sheet_id: sheetId,
          sheet_url: sheetUrl,
        }
        if (existingRowId) {
          await (supabase as any)
            .from('person_cycle_sheets')
            .update(payload)
            .eq('id', existingRowId)
        } else {
          await (supabase as any)
            .from('person_cycle_sheets')
            .insert(payload)
        }
      }

      if (sheetUrl) {
        try {
          await (supabase as any)
            .from('profiles')
            .update({ google_sheet_url: sheetUrl })
            .eq('id', personId)
        } catch (profileError) {
          console.warn('Unable to update profile sheet url:', profileError)
        }
      }
    } else if (tableAvailable && existingRowId) {
      await (supabase as any)
        .from('person_cycle_sheets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existingRowId)
    }

    const syncResult = await syncCycleTransactions(personId, normalizedCycle, sheetId)
    console.info('[ManageSheet API] sync result', syncResult)
    if (!syncResult.success) {
      return NextResponse.json({ error: syncResult.message ?? 'Sync failed' }, { status: 400 })
    }

    return NextResponse.json({ status, sheetUrl, sheetId })
  } catch (error: any) {
    console.error('Manage sheet endpoint failed:', error)
    return NextResponse.json({ error: error?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
