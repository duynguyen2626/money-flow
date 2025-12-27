export type ManageCycleSheetRequest = {
  personId: string
  cycleTag: string
}

export type ManageCycleSheetResponse = {
  status: 'created' | 'synced'
  sheetUrl?: string | null
  sheetId?: string | null
  error?: string
}
