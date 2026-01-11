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
    const accountImageUrl = (txn as any).account_image_url || null
    const personImageUrl = (txn as any).person_avatar_url || null

    return (
        <div
            className={cn(
                'group relative bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all',
                isSelected && 'ring-2 ring-blue-500 border-blue-500',
                isVoided && 'opacity-60 bg-slate-50'
            )}
        >
            {/* Grid Layout */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center">
                {/* Checkbox */}
                <div className="flex items-center">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onSelect}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>

                {/* Date + Details */}
                <div className="flex items-center gap-4 min-w-0">
                    <TransactionDateCell date={txn.occurred_at} />
                    <div className="flex-1 min-w-0">
                        <TransactionDetailsCell
                            note={txn.note}
                            shopName={txn.shop_name}
                            shopImageUrl={txn.shop_image_url}
                            categoryName={txn.category_name}
                            transactionId={txn.id}
                            date={txn.occurred_at}
                            isInstallment={txn.is_installment}
                            refundStatus={refundStatus}
                        />
                    </div>
                </div>

                {/* Flow */}
                <div className="flex justify-center min-w-[280px]">
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

                {/* Base Amount */}
                <div className="min-w-[120px]">
                    <PerformanceBaseAmount
                        amount={originalAmount}
                        cashbackPercent={percentValue}
                        cashbackFixed={fixedValue}
                        type={txnType}
                    />
                </div>

                {/* Final */}
                <div className="min-w-[120px]">
                    <FinalSettlement
                        finalPrice={finalPrice}
                        type={txnType}
                        baseAmount={originalAmount}
                        cashbackPercent={percentValue}
                        cashbackFixed={fixedValue}
                    />
                </div>

                {/* Actions */}
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
