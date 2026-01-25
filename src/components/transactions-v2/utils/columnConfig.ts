// Transaction V2 Column Configuration
import { ColumnKey } from '@/components/app/table/transactionColumns'

export interface ColumnConfigV2 {
  key: ColumnKeyV2
  label: string
  width: number // px
  minWidth?: number
  priority: 'high' | 'medium' | 'low'
  responsive: {
    mobile: boolean   // < 768px
    tablet: boolean   // 768-1024px
    desktop: boolean  // >= 1024px
  }
}

export type ColumnKeyV2 = 
  | 'date'
  | 'description' // Merged: shop + note + category + tag
  | 'flow'        // Merged: account + person
  | 'amount'      // BASE + cashback inline
  | 'final'       // Net value
  | 'actions'

export const COLUMNS_V2: ColumnConfigV2[] = [
  {
    key: 'date',
    label: 'Date',
    width: 120,
    minWidth: 100,
    priority: 'high',
    responsive: {
      mobile: true,
      tablet: true,
      desktop: true,
    },
  },
  {
    key: 'description',
    label: 'Description',
    width: -1, // flex-1
    minWidth: 200,
    priority: 'high',
    responsive: {
      mobile: true,
      tablet: true,
      desktop: true,
    },
  },
  {
    key: 'flow',
    label: 'Flow & Entity',
    width: 200,
    minWidth: 160,
    priority: 'high',
    responsive: {
      mobile: false, // Collapse into description subtitle
      tablet: true,
      desktop: true,
    },
  },
  {
    key: 'amount',
    label: 'Amount',
    width: 140,
    minWidth: 120,
    priority: 'high',
    responsive: {
      mobile: true,
      tablet: true,
      desktop: true,
    },
  },
  {
    key: 'final',
    label: 'Final',
    width: 120,
    minWidth: 100,
    priority: 'medium',
    responsive: {
      mobile: false, // Show in description if has cashback
      tablet: false,
      desktop: true,
    },
  },
  {
    key: 'actions',
    label: '',
    width: 60,
    minWidth: 60,
    priority: 'high',
    responsive: {
      mobile: true, // Swipe or 3-dot
      tablet: true,
      desktop: true,
    },
  },
]

// Helper to get visible columns for breakpoint
export function getVisibleColumns(breakpoint: 'mobile' | 'tablet' | 'desktop'): ColumnKeyV2[] {
  return COLUMNS_V2
    .filter(col => col.responsive[breakpoint])
    .map(col => col.key)
}

// Mobile columns (3 only)
export const MOBILE_COLUMNS: ColumnKeyV2[] = ['date', 'description', 'amount']

// Tablet columns (5)
export const TABLET_COLUMNS: ColumnKeyV2[] = ['date', 'description', 'flow', 'amount', 'actions']

// Desktop columns (6 - all)
export const DESKTOP_COLUMNS: ColumnKeyV2[] = ['date', 'description', 'flow', 'amount', 'final', 'actions']
