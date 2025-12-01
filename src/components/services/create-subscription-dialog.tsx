'use client'

import { MouseEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createSubscriptionAction } from '@/actions/subscription-actions'
import { Account, Person, Shop } from '@/types/moneyflow.types'

import { SubscriptionForm } from './subscription-form'

type CreateSubscriptionDialogProps = {
  people: Person[]
  accounts: Account[]
  shops: Shop[]
}

export function CreateSubscriptionDialog({ people, accounts, shops }: CreateSubscriptionDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const closeDialog = () => setOpen(false)
  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation()

  return (
    <>
      <button
        type="button"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        onClick={() => setOpen(true)}
      >
        Them dich vu
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create subscription"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={stopPropagation}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Dich vu dinh ky</p>
                <h2 className="text-lg font-semibold text-gray-900">Them dich vu moi</h2>
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
              mode="create"
              people={people}
              accounts={accounts}
              shops={shops}
              onCancel={closeDialog}
              onSubmit={async (values: import('@/services/subscription.service').SubscriptionPayload) => {
                await createSubscriptionAction(values)
                setOpen(false)
                router.refresh()
              }}
              submitLabel="Luu dich vu"
            />
          </div>
        </div>
      )}
    </>
  )
}
