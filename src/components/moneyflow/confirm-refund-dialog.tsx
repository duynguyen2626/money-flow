"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Search, Wallet, X, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { Account, TransactionWithDetails } from "@/types/moneyflow.types"
import { confirmRefundAction, getOriginalAccount } from "@/actions/transaction-actions"
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
    const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingDefault, setIsLoadingDefault] = useState(false)
    const [showOtherAccounts, setShowOtherAccounts] = useState(false)

    // Fetch original account when transaction opens
    useEffect(() => {
        if (transaction && open) {
            setIsLoadingDefault(true);
            setShowOtherAccounts(false);
            getOriginalAccount(transaction.id)
                .then((id) => {
                    if (id) {
                        setDefaultAccountId(id);
                        setSelectedAccountId(id);
                    } else {
                        setDefaultAccountId(null);
                        setSelectedAccountId("");
                        setShowOtherAccounts(true); // Auto-show if no default
                    }
                })
                .finally(() => setIsLoadingDefault(false));
            setSearchTerm("");
        }
    }, [transaction, open]);

    const validAccounts = accounts.filter(
        acc => acc.id !== '99999999-9999-9999-9999-999999999999'
    )

    const defaultAccount = validAccounts.find(a => a.id === defaultAccountId)
    const otherAccounts = validAccounts.filter(a => a.id !== defaultAccountId && (
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    ))

    const handleConfirm = async () => {
        if (!transaction || !selectedAccountId) return

        setIsSubmitting(true)
        try {
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

    const renderAccountCard = (account: Account) => (
        <div
            key={account.id}
            onClick={() => setSelectedAccountId(account.id)}
            className={`
        flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all
        ${selectedAccountId === account.id
                    ? 'border-green-500 bg-green-50 ring-1 ring-green-500 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }
      `}
        >
            {account.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.image_url} alt="" className="h-8 w-8 object-contain" />
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
    )

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

                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-slate-700">Khoản tiền này đã về tài khoản nào?</h3>

                        {/* Default Account Section */}
                        {isLoadingDefault ? (
                            <div className="h-14 bg-slate-100 animate-pulse rounded-lg"></div>
                        ) : defaultAccount ? (
                            <div className="mb-2">
                                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Tài khoản gốc (Recommended)</p>
                                {renderAccountCard(defaultAccount)}
                            </div>
                        ) : null}

                        {/* Other Accounts Toggle */}
                        {defaultAccount && !showOtherAccounts && (
                            <button
                                onClick={() => setShowOtherAccounts(true)}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                Change account target?
                            </button>
                        )}

                        {/* Other Accounts Section */}
                        {showOtherAccounts && (
                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tài khoản khác</p>
                                    {defaultAccount && (
                                        <button
                                            onClick={() => {
                                                setShowOtherAccounts(false);
                                                setSelectedAccountId(defaultAccountId!);
                                            }}
                                            className="text-xs text-slate-400 hover:text-slate-600"
                                        >
                                            Cancel change
                                        </button>
                                    )}
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search accounts..."
                                        className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="grid gap-2 max-h-[160px] overflow-y-auto pr-1">
                                    {otherAccounts.length > 0 ? (
                                        otherAccounts.map(renderAccountCard)
                                    ) : (
                                        <p className="text-sm text-slate-400 text-center py-2">No accounts found</p>
                                    )}
                                </div>
                            </div>
                        )}
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
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Confirming...' : 'Confirm Received'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
