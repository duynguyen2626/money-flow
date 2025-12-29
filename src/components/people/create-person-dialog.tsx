'use client'

import { MouseEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { PersonForm } from './person-form'
import { Subscription } from '@/types/moneyflow.types'
import { createPersonAction } from '@/actions/people-actions'

type CreatePersonDialogProps = {
  subscriptions: Subscription[]
  trigger?: React.ReactNode
}

export function CreatePersonDialog({ subscriptions, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: CreatePersonDialogProps & { open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? setControlledOpen : setInternalOpen

  const router = useRouter()

  const handleSuccess = () => {
    setOpen?.(false)
    router.refresh()
  }

  const closeDialog = () => setOpen?.(false)

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  return (
    <>
      {!isControlled && (
        trigger ? (
          <div onClick={() => setOpen?.(true)}>{trigger}</div>
        ) : (
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            onClick={() => setOpen?.(true)}
          >
            Add member
          </button>
        )
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add member"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
          onClick={closeDialog}
        >
          <div
            className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl max-h-[90vh]"
            onClick={stopPropagation}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">People</p>
                <h2 className="text-xl font-semibold text-slate-900">Add member</h2>
                <p className="text-sm text-slate-500">Create a profile to track lending and repayments.</p>
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                aria-label="Close dialog"
                onClick={closeDialog}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <PersonForm
              mode="create"
              subscriptions={subscriptions}
              onCancel={closeDialog}
              onSubmit={async values => {
                await createPersonAction({
                  name: values.name,
                  email: values.email,
                  avatar_url: values.avatar_url,
                  sheet_link: values.sheet_link,
                  subscriptionIds: values.subscriptionIds,
                  is_owner: values.is_owner,
                  is_archived: values.is_archived,
                  is_group: values.is_group,
                })
                handleSuccess()
              }}
              submitLabel="Create member"
            />
          </div>
        </div>
      )}
    </>
  )
}
