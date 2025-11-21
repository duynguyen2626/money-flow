'use client'

import { MouseEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PersonForm } from './person-form'
import { Subscription, Person } from '@/types/moneyflow.types'
import { updatePersonAction } from '@/actions/people-actions'

type EditPersonDialogProps = {
  person: Person
  subscriptions: Subscription[]
  initiallyOpen?: boolean
  onClose?: () => void
}

export function EditPersonDialog({ person, subscriptions, initiallyOpen, onClose }: EditPersonDialogProps) {
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

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  return (
    <>
      <button
        type="button"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        onClick={() => setOpen(true)}
      >
        Sua thong tin
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit person"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={stopPropagation}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Chinh sua</p>
                <h2 className="text-lg font-semibold text-gray-900">{person.name}</h2>
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
              mode="edit"
              subscriptions={subscriptions}
              initialValues={{
                name: person.name,
                email: person.email ?? '',
                avatar_url: person.avatar_url ?? '',
                sheet_link: person.sheet_link ?? '',
                subscriptionIds: person.subscription_ids ?? [],
              }}
              onCancel={closeDialog}
              onSubmit={async values => {
                await updatePersonAction(person.id, {
                  name: values.name,
                  email: values.email,
                  avatar_url: values.avatar_url,
                  sheet_link: values.sheet_link,
                  subscriptionIds: values.subscriptionIds,
                })
                setOpen(false)
                onClose?.()
                router.refresh()
              }}
              submitLabel="Luu thay doi"
            />
          </div>
        </div>
      )}
    </>
  )
}
