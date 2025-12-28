export type ManageCycleSheetRequest = {
  personId: string
  cycleTag?: string
  action?: 'sync' | 'test_create'
}

export type ManageCycleSheetResponse = {
  status: 'created' | 'synced' | 'test_created'
  sheetUrl?: string | null
  sheetId?: string | null
  error?: string
}
