'use client'

import { MouseEvent, ReactNode, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Slot } from '@radix-ui/react-slot'
import { TransactionForm, TransactionFormValues } from './transaction-form'
import { useRouter, useSearchParams } from 'next/navigation'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'

type AddTransactionDialogProps = {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  shops?: Shop[];
  buttonText?: string;
  defaultTag?: string;
  defaultPersonId?: string;
  defaultType?: 'expense' | 'income' | 'debt' | 'transfer' | 'repayment';
  buttonClassName?: string;
  defaultSourceAccountId?: string;
  defaultDebtAccountId?: string;
  defaultAmount?: number;
  triggerContent?: ReactNode;
  onOpen?: () => void;
  listenToUrlParams?: boolean;
  asChild?: boolean;
  cloneInitialValues?: Partial<TransactionFormValues>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddTransactionDialog({
  accounts,
  categories,
  people,
  shops = [],
  buttonText = 'Add Transaction',
  defaultTag,
  defaultPersonId,
  defaultType,
  buttonClassName,
  defaultSourceAccountId,
  defaultDebtAccountId,
  defaultAmount,
  triggerContent,
  onOpen,
  listenToUrlParams,
  asChild = false,
  cloneInitialValues,
  isOpen,
  onOpenChange,
}: AddTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isOpen ?? internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (isOpen === undefined) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  const router = useRouter()

  const searchParams = useSearchParams()
  const [urlValues, setUrlValues] = useState<any>(null)

  useEffect(() => {
    if (listenToUrlParams && searchParams.get('action') === 'new') {
      handleOpenChange(true)

      const amountParam = searchParams.get('amount')
      const noteParam = searchParams.get('note')
      const shopParam = searchParams.get('shop')
      const personParam = searchParams.get('for')

      const amount = amountParam ? parseFloat(amountParam) : undefined

      let shopId = undefined
      if (shopParam) {
        const found = shops.find(s => s.name.toLowerCase() === shopParam.toLowerCase())
        shopId = found?.id

        if (!shopId && shopParam.toLowerCase() === 'shopee') {
          const shopee = shops.find(s => s.name.toLowerCase().includes('shopee'))
          shopId = shopee?.id
        }
      }

      setUrlValues({
        amount,
        note: noteParam || undefined,
        shop_id: shopId,
        person_id: personParam || undefined,
      })
    }
  }, [listenToUrlParams, searchParams, shops])

  const handleSuccess = () => {
    handleOpenChange(false)
    setUrlValues(null) // Reset
    router.refresh()
  }

  const closeDialog = () => {
    handleOpenChange(false)
    setUrlValues(null)
  }

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCloseWarning, setShowCloseWarning] = useState(false)

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on overlay, not on content
    if (event.target === event.currentTarget) {
      if (hasUnsavedChanges) {
        setShowCloseWarning(true)
      } else {
        closeDialog()
      }
    }
  }

  const confirmClose = () => {
    setShowCloseWarning(false)
    setHasUnsavedChanges(false)
    closeDialog()
  }

  const defaultClassName =
    triggerContent && !asChild
      ? 'inline-flex items-center justify-center rounded-md p-0 bg-transparent text-inherit focus:outline-none focus-visible:ring-0'
      : 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'

  const Comp = asChild ? Slot : 'button'

  return (
    <>
      <Comp
        type={asChild ? undefined : "button"}
        className={buttonClassName || defaultClassName}
        onMouseDown={onOpen}
        onClick={event => {
          event.stopPropagation()
          onOpen?.()
          handleOpenChange(true)
        }}
        aria-label={typeof buttonText === 'string' ? buttonText : 'Add transaction'}
      >
        {triggerContent ?? buttonText}
      </Comp>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Add Transaction"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4 backdrop-blur-sm"
            onClick={handleOverlayClick}
          >
            <div
              className="flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden"
              style={{ maxHeight: '90vh' }}
              onClick={stopPropagation}
            >
              <TransactionForm
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSuccess={handleSuccess}
                onCancel={() => {
                  if (hasUnsavedChanges) {
                    setShowCloseWarning(true)
                  } else {
                    closeDialog()
                  }
                }}
                onFormChange={setHasUnsavedChanges}
                defaultTag={defaultTag}
                defaultPersonId={urlValues?.person_id ?? defaultPersonId}
                defaultType={defaultType}
                defaultSourceAccountId={defaultSourceAccountId}
                defaultDebtAccountId={defaultDebtAccountId}
                initialValues={{
                  ...urlValues,
                  ...(defaultAmount ? { amount: defaultAmount } : {}),
                  ...(cloneInitialValues || {})
                }}
              />
            </div>

            {/* Unsaved Changes Warning Dialog */}
            {showCloseWarning && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4">
                <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl" onClick={stopPropagation}>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Unsaved Changes</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    You have unsaved changes. Are you sure you want to close without saving?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowCloseWarning(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Continue Editing
                    </button>
                    <button
                      onClick={confirmClose}
                      className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                    >
                      Discard Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  )
}
