'use client'

import { TransactionWithDetails, Account, Person, Shop } from '@/types/moneyflow.types'
import { TransactionDateCell } from './TransactionDateCell'
import { ShopIconCell } from './ShopIconCell'
import { AccountPersonFlow } from './AccountPersonFlow'
import { TransactionBadges } from './TransactionBadges'
import { TransactionAmounts } from './TransactionAmounts'
import { TransactionActions } from './TransactionActions'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface TransactionRowCardProps {
    transaction: TransactionWithDetails
    isSelected: boolean
    isVoided: boolean
    onSelect: (checked: boolean) => void
    onEdit: () => void
    onClone?: () => void
    onVoid: () => void
    onRestore: () => void
    onRefund?: () => void
    onConfirmRefund?: () => void
    onConvertToInstallment?: () => void
    accounts?: Account[]
    people?: Person[]
    shops?: Shop[]
    contextAccountId?: string | null
    contextPersonId?: string | null
}

function parseMetadata(value: TransactionWithDetails['metadata']) {
    if (!value) return null
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as Record<string, unknown>
        } catch {
            return null
        }
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>
    }
    return null
}

/**
 * Main transaction row card component
 * Displays transaction in modern card-based layout
 */
export function TransactionRowCard({
    transaction,
    isSelected,
    isVoided,
    onSelect,
    onEdit,
    onClone,
    onVoid,
    onRestore,
    onRefund,
    onConfirmRefund,
    onConvertToInstallment,
    accounts = [],
    people = [],
    shops = [],
    contextAccountId,
    contextPersonId,
}: TransactionRowCardProps) {
    const txn = transaction
    const metadata = parseMetadata(txn.metadata)
    const refundStatus = metadata?.refund_status as string | undefined
    const isPendingRefund = refundStatus === 'requested'

    // Calculate amounts
    const originalAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount ?? 0
    const percentValue = typeof txn.cashback_share_percent === 'number' ? txn.cashback_share_percent : 0
    const fixedValue = typeof txn.cashback_share_fixed === 'number' ? txn.cashback_share_fixed : 0
    const derivedCashback = Math.abs(originalAmount) * percentValue + fixedValue
    const cashbackAmount =
        typeof txn.cashback_share_amount === 'number' && txn.cashback_share_amount > 0
            ? txn.cashback_share_amount
            : derivedCashback
    const finalPrice = Math.abs(txn.amount ?? 0)

    // Determine if can request refund
    const categoryLabel = txn.category_name ?? ''
    const hasShoppingCategory = categoryLabel.toLowerCase().includes('shopping')
    const canRequestRefund = txn.type === 'expense' && (Boolean(txn.shop_id) || hasShoppingCategory)

    // Get person name
    const personName = (txn as any).person_name ?? txn.person_name ?? null

    return (
        <div
            className={cn(
                'flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow',
                isSelected && 'ring-2 ring-blue-500 ring-offset-2',
                isVoided && 'opacity-60'
            )}
        >
            {/* Checkbox */}
            <div className="flex-shrink-0">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={onSelect}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            {/* Date */}
            <div className="flex-shrink-0">
                <TransactionDateCell date={txn.occurred_at} />
            </div>

            {/* Shop/Transaction Info */}
            <div className="flex-1 min-w-0">
                <ShopIconCell
                    shopName={txn.shop_name}
                    shopImageUrl={txn.shop_image_url}
                    note={txn.note}
                    categoryName={txn.category_name}
                    type={txn.type as any}
                />
            </div>

            {/* Account → Person Flow */}
            <div className="flex-shrink-0">
                <AccountPersonFlow
                    accountName={txn.account_name}
                    accountImageUrl={null} // TODO: Add account image support
                    personName={personName}
                    personImageUrl={null} // TODO: Add person image support
                    type={txn.type as any}
                    contextAccountId={contextAccountId}
                    contextPersonId={contextPersonId}
                    transactionAccountId={txn.account_id}
                    transactionPersonId={txn.person_id}
                />
            </div>

            {/* Badges */}
            <div className="flex-shrink-0">
                <TransactionBadges
                    tag={txn.tag}
                    isInstallment={txn.is_installment}
                    metadata={metadata}
                    status={txn.status}
                />
            </div>

            {/* Amounts */}
            <div className="flex-shrink-0">
                <TransactionAmounts
                    amount={originalAmount}
                    finalPrice={finalPrice}
                    cashbackAmount={cashbackAmount}
                    type={txn.type as any}
                />
            </div>

            {/* Actions */}
            <div className="flex-shrink-0">
                <TransactionActions
                    isVoided={isVoided}
                    canRequestRefund={canRequestRefund}
                    isPendingRefund={isPendingRefund}
                    onEdit={onEdit}
                    onClone={onClone}
                    onVoid={onVoid}
                    onRestore={onRestore}
                    onRefund={onRefund}
                    onConfirmRefund={onConfirmRefund}
                    onConvertToInstallment={onConvertToInstallment}
                />
            </div>
        </div>
    )
}
