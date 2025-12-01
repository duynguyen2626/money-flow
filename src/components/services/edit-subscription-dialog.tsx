'use client'

import { MouseEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { updateSubscriptionAction } from '@/actions/subscription-actions'
import { Account, Person, Shop, Subscription } from '@/types/moneyflow.types'

import { SubscriptionForm } from './subscription-form'

type EditSubscriptionDialogProps = {
  subscription: Subscription
  people: Person[]
  accounts: Account[]
  shops: Shop[]
  initiallyOpen?: boolean
  onClose?: () => void
}

export function EditSubscriptionDialog({
  subscription,
  people,
  accounts,
  shops,
  initiallyOpen,
  onClose,
}: EditSubscriptionDialogProps) {
  const [open, setOpen] = useState(Boolean(initiallyOpen))
  const router = useRouter()

  useEffect(() => {
    if (initiallyOpen) {
      setOpen(true)
    }
  }, [initiallyOpen])

  const closeDialog = () => {
    setOpen(false)
    onClose?.()
  }

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation()

  return (
    <>
      <button
        type="button"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        onClick={() => setOpen(true)}
      >
        Edit
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit subscription"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={stopPropagation}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Update</p>
                <h2 className="text-lg font-semibold text-gray-900">{subscription.name}</h2>
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

            <SubscriptionForm
              mode="edit"
              people={people}
              accounts={accounts}
              shops={shops}
              initialData={subscription}
              onCancel={closeDialog}
              onSubmit={async values => {
                await updateSubscriptionAction(subscription.id, values)
                setOpen(false)
                onClose?.()
                router.refresh()
              }}
              submitLabel="Save Service"
            />
          </div>
        </div>
      )}
    </>
  )
}
