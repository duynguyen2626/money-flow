'use client'

import { MouseEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PersonForm } from './person-form'
import { Subscription } from '@/types/moneyflow.types'
import { createPersonAction } from '@/actions/people-actions'

type CreatePersonDialogProps = {
  subscriptions: Subscription[]
}

export function CreatePersonDialog({ subscriptions, open: controlledOpen, onOpenChange: setControlledOpen }: CreatePersonDialogProps & { open?: boolean, onOpenChange?: (open: boolean) => void }) {
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
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          onClick={() => setOpen?.(true)}
        >
          Them thanh vien
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create person"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={stopPropagation}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Tao thanh vien</p>
                <h2 className="text-lg font-semibold text-gray-900">Nguoi nhan/nguoi vay moi</h2>
              </div>
              <button
                type="button"
                className="rounded p-1 text-gray-500 transition hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                aria-label="Close dialog"
                onClick={closeDialog}
              >
                X
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
                })
                handleSuccess()
              }}
              submitLabel="Tao thanh vien"
            />
          </div>
        </div>
      )}
    </>
  )
}
