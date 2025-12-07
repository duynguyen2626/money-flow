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
            onClick={closeDialog}
          >
            <div
              className="flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden"
              style={{ maxHeight: '90vh' }}
              onClick={stopPropagation}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="text-xl font-semibold text-slate-900">Add New Transaction</h2>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  aria-label="Close dialog"
                  onClick={closeDialog}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <TransactionForm
                  accounts={accounts}
                  categories={categories}
                  people={people}
                  shops={shops}
                  onSuccess={handleSuccess}
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
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
