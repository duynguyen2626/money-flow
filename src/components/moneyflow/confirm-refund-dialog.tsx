"use client"

import { useState } from "react"
import { CheckCircle2, Wallet, X } from 'lucide-react'
import { toast } from "sonner"
import { Account, TransactionWithDetails } from "@/types/moneyflow.types"
import { confirmRefundAction } from "@/actions/transaction-actions"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export type ConfirmRefundDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    transaction: TransactionWithDetails | null
    accounts: Account[]
}

export function ConfirmRefundDialog({
    open,
    onOpenChange,
    transaction,
    accounts,
}: ConfirmRefundDialogProps) {
    const [selectedAccountId, setSelectedAccountId] = useState<string>("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Filter for real accounts (not credit cards unless they allow deposit, but usually bank/cash)
    // Or just allow all except system accounts.
    const validAccounts = accounts.filter(
        acc => acc.id !== '99999999-9999-9999-9999-999999999999'
    )

    const handleConfirm = async () => {
        if (!transaction || !selectedAccountId) return

        setIsSubmitting(true)
        try {
            // We assume confirmRefundAction wraps the service logic we just updated
            const result = await confirmRefundAction(transaction.id, selectedAccountId)

            if (result.success) {
                toast.success("Refund confirmed successfully!", {
                    description: "Money has been added to determining account."
                })
                onOpenChange(false)
                setSelectedAccountId("")
            } else {
                toast.error("Failed to confirm refund", {
                    description: result.error
                })
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!transaction) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        Xác nhận tiền về (Confirm Refund)
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-100">
                        <p className="text-sm text-slate-500 mb-1">Khoản tiền hoàn lại:</p>
                        <p className="text-2xl font-bold text-slate-800">
                            {new Intl.NumberFormat('en-US').format(Math.abs(transaction.amount))}
                        </p>
                        <p className="text-sm text-slate-600 mt-1 italic">
                            {transaction.note || '(No note)'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            Khoản tiền này đã về tài khoản nào?
                        </label>
                        <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-1">
                            {validAccounts.map(account => (
                                <div
                                    key={account.id}
                                    onClick={() => setSelectedAccountId(account.id)}
                                    className={`
                    flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all
                    ${selectedAccountId === account.id
                                            ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                                            : 'border-slate-200 hover:bg-slate-50'
                                        }
                  `}
                                >
                                    {account.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={account.logo_url} alt="" className="h-8 w-8 object-contain" />
                                    ) : (
                                        <div className="flex h-8 w-8 items-center justify-center bg-slate-200 rounded-full text-xs font-bold text-slate-600">
                                            {account.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-slate-900">{account.name}</p>
                                        <p className="text-xs text-slate-500">
                                            Current: {new Intl.NumberFormat('en-US').format(account.current_balance)}
                                        </p>
                                    </div>
                                    {selectedAccountId === account.id && (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedAccountId || isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isSubmitting ? 'Confirming...' : 'Confirm Received'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
