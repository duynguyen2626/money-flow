'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { TransactionWithDetails } from '@/types/moneyflow.types'
import { TransactionDateCell, TransactionDetailsCell, AccountPersonFlow, PerformanceBaseAmount, FinalSettlement, TransactionActions } from '.'
import { parseMetadata } from '@/lib/transaction-mapper'
import { cn } from '@/lib/utils'

interface TransactionCardProps {
    transaction: TransactionWithDetails
    isSelected: boolean
    isVoided: boolean
    onSelect: (checked: boolean) => void
    onEdit: () => void
    onClone: () => void
    onVoid: () => void
    onRestore: () => void
    onRefund?: () => void
    onConfirmRefund?: () => void
    onConvertToInstallment?: () => void
    onHistory?: () => void
    contextAccountId?: string | null
    contextPersonId?: string | null
}

export function TransactionCard({
    transaction: txn,
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
    onHistory,
    contextAccountId,
    contextPersonId,
}: TransactionCardProps) {
    const metadata = parseMetadata(txn.metadata)
    const refundStatus = metadata?.refund_status as string | undefined

    // Calculate amounts
    const originalAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount ?? 0
    const percentValue = typeof txn.cashback_share_percent === 'number' ? txn.cashback_share_percent : 0
    const fixedValue = typeof txn.cashback_share_fixed === 'number' ? txn.cashback_share_fixed : 0
    const finalPrice = Math.abs(txn.final_price ?? txn.amount ?? 0)

    // Determine type
    const txnType = (txn.type || 'expense') as 'income' | 'expense' | 'transfer' | 'debt' | 'repayment'

    // Get account and person images
    const accountImageUrl = txn.account_image_url || null
    // Use person_image_url if available (New Standard)
    const personImageUrl = txn.person_image_url || null

    return (
        <div
            className={cn(
                'group relative bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition-all',
                isSelected && 'ring-2 ring-blue-500 border-blue-500',
                isVoided && 'opacity-60 bg-slate-50'
            )}
        >
            {/* Grid Layout matching Header: 40px 80px minmax(200px,1fr) minmax(350px,400px) 140px 140px 100px */}
            <div className="grid grid-cols-[40px_80px_minmax(200px,1fr)_minmax(300px,400px)_140px_140px_100px] gap-4 items-center">
                {/* 1. Checkbox */}
                <div className="flex items-center justify-center">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onSelect}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                {/* 2. Timeline (Date) */}
                <div>
                    <TransactionDateCell date={txn.occurred_at} />
                </div>

                {/* 3. Transaction Details (Notes) */}
                <div className="min-w-0">
                    <TransactionDetailsCell
                        note={txn.note}
                        shopName={txn.shop_name}
                        shopImageUrl={txn.shop_image_url}
                        categoryName={txn.category_name}
                        transactionId={txn.id}
                        date={txn.occurred_at}
                        isInstallment={txn.is_installment}
                        installmentsPaid={(metadata as any)?.installments_paid}
                        installmentsTotal={(metadata as any)?.installments_total}
                        refundStatus={refundStatus}
                        isSplit={Boolean((metadata as any)?.is_split)}
                        categoryIcon={(txn as any).category_icon} // Pass category icon from transaction data
                    />
                </div>

                {/* 4. Flow */}
                <div className="flex justify-center w-full px-2">
                    <AccountPersonFlow
                        accountId={txn.account_id}
                        accountName={txn.account_name}
                        accountImageUrl={accountImageUrl}
                        personId={txn.person_id}
                        personName={(txn as any).person_name}
                        personImageUrl={personImageUrl}
                        type={txnType}
                        contextAccountId={contextAccountId}
                        contextPersonId={contextPersonId}
                        transactionAccountId={txn.account_id}
                        transactionPersonId={txn.person_id}
                        cycleTag={txn.tag}
                        isSplit={metadata?.is_split as boolean}
                        refundStatus={refundStatus}
                        installmentsPaid={metadata?.installments_paid as number}
                        installmentsTotal={metadata?.installments_total as number}
                    />
                </div>

                {/* 5. Base Amount */}
                <div className="flex justify-end">
                    <PerformanceBaseAmount
                        amount={originalAmount}
                        cashbackPercent={percentValue}
                        cashbackFixed={fixedValue}
                        type={txnType}
                    />
                </div>

                {/* 6. Final */}
                <div className="flex justify-end">
                    <FinalSettlement
                        finalPrice={finalPrice}
                        type={txnType}
                        baseAmount={originalAmount}
                        cashbackPercent={percentValue}
                        cashbackFixed={fixedValue}
                    />
                </div>

                {/* 7. Actions */}
                <div className="flex justify-center">
                    <TransactionActions
                        isVoided={isVoided}
                        canRequestRefund={txn.type === 'expense'}
                        isPendingRefund={refundStatus === 'requested'}
                        onEdit={onEdit}
                        onClone={onClone}
                        onVoid={onVoid}
                        onRestore={onRestore}
                        onRefund={onRefund}
                        onConfirmRefund={onConfirmRefund}
                        onConvertToInstallment={onConvertToInstallment}
                        onHistory={onHistory}
                    />
                </div>
            </div>
        </div>
    )
}
