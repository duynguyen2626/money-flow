'use client'

import { MouseEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { PersonForm } from './person-form'
import { Subscription, Person } from '@/types/moneyflow.types'
import { updatePersonAction } from '@/actions/people-actions'

import { Slot } from '@radix-ui/react-slot'

type EditPersonDialogProps = {
  person: Person
  subscriptions: Subscription[]
  initiallyOpen?: boolean
  onClose?: () => void
  trigger?: React.ReactNode
  showTrigger?: boolean
}

export function EditPersonDialog({
  person,
  subscriptions,
  initiallyOpen,
  onClose,
  trigger,
  showTrigger = true,
}: EditPersonDialogProps) {
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
      {showTrigger &&
        (trigger ? (
          <Slot onClick={() => setOpen(true)}>{trigger}</Slot>
        ) : (
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            onClick={() => setOpen(true)}
          >
            Edit details
          </button>
        ))}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit member"
          className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-6 md:items-center md:py-10"
          onClick={closeDialog}
        >
          <div
            className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl max-h-[90vh]"
            onClick={stopPropagation}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">People</p>
                <h2 className="text-xl font-semibold text-slate-900">Edit member</h2>
                <p className="text-sm text-slate-500">Update profile details for {person.name}.</p>
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
              mode="edit"
              subscriptions={subscriptions}
              initialValues={{
                name: person.name,
                image_url: person.image_url ?? '',
                sheet_link: person.sheet_link ?? '',
                subscriptionIds: person.subscription_ids ?? [],
                is_owner: person.is_owner ?? false,
                is_archived: person.is_archived ?? false,
                is_group: person.is_group ?? false,
              }}
              onCancel={closeDialog}
              onSubmit={async values => {
                await updatePersonAction(person.id, {
                  name: values.name,
                  image_url: values.image_url,
                  sheet_link: values.sheet_link,
                  subscriptionIds: values.subscriptionIds,
                  is_archived: values.is_archived,
                  is_group: values.is_group,
                })
                setOpen(false)
                onClose?.()
                router.refresh()
              }}
              submitLabel="Save changes"
            />
          </div>
        </div>
      )}
    </>
  )
}
