"use client"

import { useState, useEffect } from "react"
import { Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TransactionWithDetails, Account } from "@/types/moneyflow.types"
import { confirmRefundAction, getOriginalAccount } from "@/actions/transaction-actions"
import { useRouter } from "next/navigation"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
// import { AccountCard } from "./account-card" // Assuming we can simple row render
import Image from "next/image"

interface ConfirmRefundDialogV2Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    transaction: TransactionWithDetails
    accounts: Account[]
}

export function ConfirmRefundDialogV2({
    open,
    onOpenChange,
    transaction,
    accounts,
}: ConfirmRefundDialogV2Props) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingOriginal, setIsLoadingOriginal] = useState(false)

    // State for selection
    const [selectedAccountId, setSelectedAccountId] = useState<string>("")
    const [recommendedAccount, setRecommendedAccount] = useState<{
        id: string;
        name: string;
        type: string;
        image_url: string | null;
        current_balance: number
    } | null>(null)
    const [openCombobox, setOpenCombobox] = useState(false)

    // Load recommended account on open
    useEffect(() => {
        if (open && transaction?.id) {
            setIsLoadingOriginal(true)
            setRecommendedAccount(null)
            setSelectedAccountId("")

            getOriginalAccount(transaction.id)
                .then(result => {
                    if (result) {
                        setRecommendedAccount(result)
                        setSelectedAccountId(result.id)
                    }
                })
                .catch(err => console.error("Failed to get original account", err))
                .finally(() => setIsLoadingOriginal(false))
        }
    }, [open, transaction?.id])

    const handleConfirm = async () => {
        if (!selectedAccountId) {
            toast.error("Please select an account to receive the refund")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await confirmRefundAction(transaction.id, selectedAccountId)
            if (result.success) {
                toast.success("Refund confirmed successfully")
                onOpenChange(false)
                router.refresh()
            } else {
                toast.error("Failed to confirm refund", {
                    description: result.error
                })
            }
        } catch (error: any) {
            toast.error("Error", {
                description: error.message
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Helper to get selected account object (either recommended or from list)
    const selectedAccountObj = recommendedAccount?.id === selectedAccountId
        ? recommendedAccount
        : accounts.find(a => a.id === selectedAccountId)

    const validAccounts = accounts.filter(a => a.id !== '99999999-9999-9999-9999-999999999999')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-green-700 flex items-center gap-2">
                        Confirm Refund Received
                    </DialogTitle>
                    <DialogDescription>
                        Confirm that the money has returned to your account.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Summary Card */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-sm text-slate-500 mb-1">Refund Amount:</div>
                        <div className="text-3xl font-bold text-slate-900">
                            {Math.abs(transaction.amount).toLocaleString('vi-VN')}
                        </div>
                        <div className="text-slate-500 text-sm mt-1 italic">
                            {transaction.note || "Refund Transaction"}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700 block">
                            Where was this refund received?
                        </label>

                        {/* 1. RECOMMENDED SECTION */}
                        {isLoadingOriginal ? (
                            <div className="p-3 border rounded-lg bg-white flex items-center gap-3 animate-pulse">
                                <div className="w-10 h-6 bg-slate-200 rounded"></div>
                                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                            </div>
                        ) : recommendedAccount ? (
                            <div
                                onClick={() => setSelectedAccountId(recommendedAccount.id)}
                                className={cn(
                                    "cursor-pointer p-3 border rounded-lg flex items-center justify-between transition-all",
                                    selectedAccountId === recommendedAccount.id
                                        ? "border-green-500 bg-green-50 ring-1 ring-green-500"
                                        : "border-slate-200 bg-white hover:border-green-200"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-8 rounded overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                                        {recommendedAccount.image_url ? (
                                            <Image
                                                src={recommendedAccount.image_url}
                                                alt={recommendedAccount.name}
                                                fill
                                                className="object-contain"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">N/A</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-slate-900">{recommendedAccount.name}</div>
                                        <div className="text-xs text-green-600 font-medium">Recommended (Original Source)</div>
                                    </div>
                                </div>
                                {selectedAccountId === recommendedAccount.id && (
                                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                        <div className="w-2 h-1 border-b-2 border-l-2 border-white -rotate-45 mb-[1px]"></div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 italic">
                                Original account could not be detected automatically. Please select manually below.
                            </div>
                        )}

                        {/* 2. MANUAL SELECTION (Combobox) */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-100" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-400">Or select another</span>
                            </div>
                        </div>

                        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCombobox}
                                    className={cn(
                                        "w-full justify-between h-auto py-3",
                                        selectedAccountId && selectedAccountId !== recommendedAccount?.id
                                            ? "border-green-500 bg-green-50"
                                            : ""
                                    )}
                                >
                                    {selectedAccountObj && selectedAccountId !== recommendedAccount?.id ? (
                                        <div className="flex items-center gap-2">
                                            {selectedAccountObj.image_url && (
                                                <div className="w-6 h-4 relative">
                                                    <Image src={selectedAccountObj.image_url} alt="" fill className="object-contain" />
                                                </div>
                                            )}
                                            <span>{selectedAccountObj.name}</span>
                                        </div>
                                    ) : "Select from all accounts..."}
                                    {/* <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" /> */}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search account..." className="h-9" />
                                    <CommandList>
                                        <CommandEmpty>No account found.</CommandEmpty>
                                        <CommandGroup>
                                            {validAccounts.map((account) => (
                                                <CommandItem
                                                    key={account.id}
                                                    value={account.name}
                                                    onSelect={() => {
                                                        setSelectedAccountId(account.id)
                                                        setOpenCombobox(false)
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 w-full">
                                                        <div className="w-8 h-5 relative bg-slate-100 rounded overflow-hidden shrink-0">
                                                            {account.image_url && (
                                                                <Image src={account.image_url} alt="" fill className="object-contain" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{account.name}</span>
                                                            <span className="text-xs text-slate-500">
                                                                {account.current_balance?.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleConfirm}
                        disabled={!selectedAccountId || isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Received
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
