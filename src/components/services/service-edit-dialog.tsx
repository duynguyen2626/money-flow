'use client'

import { MouseEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ServiceForm, ServiceFormValues } from './service-form'
import { upsertService } from '@/services/service-manager'

type ServiceEditDialogProps = {
  service: {
    id: string;
    name: string;
    price: number | null;
    shop_id?: string | null;
    shop?: { id: string; name: string; logo_url: string | null } | null;
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ServiceEditDialog({
  service,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ServiceEditDialogProps) {
  // ... (keep existing state logic)
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

  const handleSubmit = async (values: ServiceFormValues) => {
    await upsertService({ id: service.id, ...values });
    handleSuccess()
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit service"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={stopPropagation}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Edit service</p>
                <h2 className="text-lg font-semibold text-gray-900">Service Details</h2>
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

            <ServiceForm
              mode="edit"
              initialValues={{
                ...service,
                price: service.price ?? 0,
                shop_id: service.shop_id || service.shop?.id || null
              }}
              onCancel={closeDialog}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      )}
    </>
  )
}
