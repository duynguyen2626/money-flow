'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { EditPersonDialog } from './edit-person-dialog'
import { Person, Subscription } from '@/types/moneyflow.types'

interface EditPersonButtonProps {
    person: Person
    subscriptions: Subscription[]
}

export function EditPersonButton({ person, subscriptions }: EditPersonButtonProps) {
    const [showDialog, setShowDialog] = useState(false)

    return (
        <>
            <button
                type="button"
                onClick={() => setShowDialog(true)}
                className="flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-200 md:px-3 md:py-2 md:text-sm"
            >
                <Pencil className="h-4 w-4" />
                <span>Edit</span>
            </button>

            {showDialog && (
                <EditPersonDialog
                    person={person}
                    subscriptions={subscriptions}
                    initiallyOpen={true}
                    showTrigger={false}
                    onClose={() => setShowDialog(false)}
                />
            )}
        </>
    )
}
