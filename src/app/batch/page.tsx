import { BankSelectionLanding } from '@/components/batch/bank-selection-landing'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '📤 Batch Import',
}

/**
 * Batch landing page - Select bank type (MBB or VIB)
 */
export default function BatchIndexPage() {
    return <BankSelectionLanding />
}
