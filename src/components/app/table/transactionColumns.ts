
export type ColumnKey =
  | "date"
  | "shop" // Merged Shop/Note
  | "category"
  | "tag"
  | "note" // Added Note Column
  | "account" // Merged Flow & Entity
  | "amount"
  | "back_info"
  | "final_price"
  | "id"
  | "people"
  | "actions"

export interface ColumnConfig {
  key: ColumnKey
  label: string
  defaultWidth: number
  minWidth?: number
}

export const defaultColumns: ColumnConfig[] = [
  { key: "date", label: "Date", defaultWidth: 120, minWidth: 100 },
  { key: "shop", label: "Note", defaultWidth: 200, minWidth: 150 },
  { key: "account", label: "Flow & Entity", defaultWidth: 280, minWidth: 200 },
  { key: "amount", label: "Value", defaultWidth: 140, minWidth: 120 }, // Merged column
  { key: "category", label: "Category", defaultWidth: 180 },
  { key: "people", label: "People", defaultWidth: 150 },
  { key: "id", label: "ID", defaultWidth: 100 },
  { key: "actions", label: "Actions", defaultWidth: 80 },
]

export const mobileColumnOrder: ColumnKey[] = ["date", "shop", "category", "account", "amount"]
