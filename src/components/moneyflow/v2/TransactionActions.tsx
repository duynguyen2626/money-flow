import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Pencil, Copy, Ban, RotateCcw, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TransactionActionsProps {
    isVoided: boolean
    canRequestRefund: boolean
    isPendingRefund: boolean
    onEdit: () => void
    onClone?: () => void
    onVoid: () => void
    onRestore: () => void
    onRefund?: () => void
    onConfirmRefund?: () => void
    onConvertToInstallment?: () => void
}

/**
 * Action buttons for transaction row
 * Edit, Clone, and More menu with additional actions
 */
export function TransactionActions({
    isVoided,
    canRequestRefund,
    isPendingRefund,
    onEdit,
    onClone,
    onVoid,
    onRestore,
    onRefund,
    onConfirmRefund,
    onConvertToInstallment,
}: TransactionActionsProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    return (
        <div className="flex items-center gap-2">
            {/* Edit Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                }}
                disabled={isVoided}
                className="h-8 w-8 p-0"
                title="Edit"
            >
                <Pencil className="h-4 w-4" />
            </Button>

            {/* Clone Button */}
            {onClone && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        onClone()
                    }}
                    className="h-8 w-8 p-0"
                    title="Clone"
                >
                    <Copy className="h-4 w-4" />
                </Button>
            )}

            {/* More Menu */}
            <div className="relative" ref={dropdownRef}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsOpen(!isOpen)
                    }}
                    className="h-8 w-8 p-0"
                    title="More actions"
                >
                    <MoreHorizontal className="h-4 w-4" />
                </Button>

                {isOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border border-slate-200 bg-white shadow-lg">
                        <div className="p-1">
                            {/* Refund Actions */}
                            {canRequestRefund && !isPendingRefund && onRefund && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRefund()
                                            setIsOpen(false)
                                        }}
                                        disabled={isVoided}
                                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Request Refund
                                    </button>
                                    <div className="my-1 h-px bg-slate-200" />
                                </>
                            )}

                            {isPendingRefund && onConfirmRefund && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onConfirmRefund()
                                            setIsOpen(false)
                                        }}
                                        disabled={isVoided}
                                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Confirm Refund
                                    </button>
                                    <div className="my-1 h-px bg-slate-200" />
                                </>
                            )}

                            {/* Convert to Installment */}
                            {!isVoided && !isPendingRefund && onConvertToInstallment && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onConvertToInstallment()
                                            setIsOpen(false)
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 flex items-center gap-2"
                                    >
                                        <CreditCard className="h-4 w-4" />
                                        Convert to Installment
                                    </button>
                                    <div className="my-1 h-px bg-slate-200" />
                                </>
                            )}

                            {/* Restore */}
                            {isVoided && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onRestore()
                                        setIsOpen(false)
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-green-50 text-green-600 flex items-center gap-2"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Restore
                                </button>
                            )}

                            {/* Void */}
                            {!isVoided && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onVoid()
                                        setIsOpen(false)
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >
                                    <Ban className="h-4 w-4" />
                                    Void Transaction
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
