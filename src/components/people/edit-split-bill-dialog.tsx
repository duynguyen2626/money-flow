'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { updateSplitBillAction } from '@/actions/transaction-actions'
import { Person } from '@/types/moneyflow.types'

export type EditSplitBillParticipant = {
    personId: string
    name: string
    amount: number
    transactionId?: string
    isNew?: boolean
    isRemoved?: boolean
}

interface EditSplitBillDialogProps {
    isOpen: boolean
    onClose: () => void
    baseTransactionId: string | null
    initialData: {
        title: string
        note: string
        qrImageUrl: string | null
        participants: EditSplitBillParticipant[]
        baseAmount: number
    }
    allPeople: Person[]
}

export function EditSplitBillDialog({
    isOpen,
    onClose,
    baseTransactionId,
    initialData,
    allPeople,
}: EditSplitBillDialogProps) {
    const [title, setTitle] = useState(initialData.title)
    const [note, setNote] = useState(initialData.note)
    const [qrImageUrl, setQrImageUrl] = useState(initialData.qrImageUrl || '')
    const [participants, setParticipants] = useState<EditSplitBillParticipant[]>(initialData.participants)
    const [isSaving, setIsSaving] = useState(false)

    // Reset form when dialog opens
    useEffect(() => {
        if (isOpen) {
            setTitle(initialData.title)
            setNote(initialData.note)
            setQrImageUrl(initialData.qrImageUrl || '')
            setParticipants(initialData.participants)
        }
    }, [isOpen, initialData])

    const activeParticipants = participants.filter(p => !p.isRemoved)
    const total = activeParticipants.reduce((sum, p) => sum + p.amount, 0)
    const isValid = Math.abs(total - initialData.baseAmount) < 0.01

    const handleUpdateAmount = (index: number, newAmount: number) => {
        const updated = [...participants]
        updated[index].amount = newAmount
        setParticipants(updated)
    }

    const handleRemoveParticipant = (index: number) => {
        const updated = [...participants]
        if (updated[index].isNew) {
            // Remove new participants completely
            updated.splice(index, 1)
        } else {
            // Mark existing participants as removed (will be voided)
            updated[index].isRemoved = true
        }
        setParticipants(updated)
    }

    const handleRestoreParticipant = (index: number) => {
        const updated = [...participants]
        updated[index].isRemoved = false
        setParticipants(updated)
    }

    const handleAddParticipant = () => {
        // Find people not already in the list
        const existingPersonIds = new Set(participants.filter(p => !p.isRemoved).map(p => p.personId))
        const availablePeople = allPeople.filter(p => !existingPersonIds.has(p.id))

        if (availablePeople.length === 0) {
            toast.error('No more people to add')
            return
        }

        const newPerson = availablePeople[0]
        setParticipants([
            ...participants,
            {
                personId: newPerson.id,
                name: newPerson.name,
                amount: 0,
                isNew: true,
            },
        ])
    }

    const handleSave = async () => {
        if (!baseTransactionId) {
            toast.error('Missing base transaction ID')
            return
        }

        if (!isValid) {
            toast.error('Total must match base amount')
            return
        }

        setIsSaving(true)

        const result = await updateSplitBillAction(baseTransactionId, {
            title,
            note,
            qrImageUrl: qrImageUrl.trim() || null,
            participants: participants.map(p => ({
                personId: p.personId,
                amount: p.amount,
                isNew: p.isNew,
                isRemoved: p.isRemoved,
                transactionId: p.transactionId,
            })),
        })

        setIsSaving(false)

        if (result.success) {
            toast.success('Split bill updated successfully')
            onClose()
            // Refresh the page
            window.location.reload()
        } else {
            toast.error(result.error || 'Failed to update split bill')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Edit Split Bill</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Split bill title"
                        />
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Note (Optional)
                        </label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Additional notes"
                        />
                    </div>

                    {/* QR Image URL */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            QR Image URL (Optional)
                        </label>
                        <input
                            type="text"
                            value={qrImageUrl}
                            onChange={(e) => setQrImageUrl(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://..."
                        />
                    </div>

                    {/* Participants */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Participants
                            </label>
                            <button
                                type="button"
                                onClick={handleAddParticipant}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                            >
                                <Plus className="h-3 w-3" />
                                Add Participant
                            </button>
                        </div>

                        <div className="space-y-2">
                            {participants.map((participant, index) => (
                                <div
                                    key={`${participant.personId}-${index}`}
                                    className={`flex items-center gap-2 p-2 border rounded-md ${participant.isRemoved
                                            ? 'bg-red-50 border-red-200 opacity-60'
                                            : 'bg-white border-slate-200'
                                        }`}
                                >
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-slate-900">
                                            {participant.name}
                                        </span>
                                        {participant.isNew && (
                                            <span className="ml-2 text-xs text-green-600 font-semibold">NEW</span>
                                        )}
                                        {participant.isRemoved && (
                                            <span className="ml-2 text-xs text-red-600 font-semibold">WILL BE VOIDED</span>
                                        )}
                                    </div>

                                    {!participant.isRemoved && (
                                        <input
                                            type="number"
                                            value={participant.amount}
                                            onChange={(e) => handleUpdateAmount(index, parseFloat(e.target.value) || 0)}
                                            className="w-32 px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Amount"
                                        />
                                    )}

                                    {participant.isRemoved ? (
                                        <button
                                            type="button"
                                            onClick={() => handleRestoreParticipant(index)}
                                            className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
                                        >
                                            Restore
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveParticipant(index)}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded-md"
                                            title="Remove participant"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Total:</span>
                            <span className="font-semibold text-slate-900">
                                {total.toLocaleString()} VND
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Base Amount:</span>
                            <span className="font-semibold text-slate-900">
                                {initialData.baseAmount.toLocaleString()} VND
                            </span>
                        </div>
                        {!isValid && (
                            <div className="pt-2 border-t border-slate-300">
                                <p className="text-xs text-red-600 font-semibold">
                                    ⚠️ Total must match base amount
                                </p>
                            </div>
                        )}
                        {isValid && (
                            <div className="pt-2 border-t border-slate-300">
                                <p className="text-xs text-green-600 font-semibold">
                                    ✓ Amounts match
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !isValid}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}
