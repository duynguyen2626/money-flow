'use client'

import { MouseEvent, ReactNode, useState } from 'react'
import { createPortal } from 'react-dom'
import { TransactionForm } from './transaction-form'
import { useRouter } from 'next/navigation'
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
}: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    setOpen(false)
    router.refresh()
  }

  const closeDialog = () => setOpen(false)

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const defaultClassName =
    triggerContent
      ? 'inline-flex items-center justify-center rounded-md p-0 bg-transparent text-inherit focus:outline-none focus-visible:ring-0'
      : 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'

  return (
    <>
      <button
        type="button"
        className={buttonClassName || defaultClassName}
        onMouseDown={onOpen}
        onClick={event => {
          event.stopPropagation()
          onOpen?.()
          setOpen(true)
        }}
        aria-label={typeof buttonText === 'string' ? buttonText : 'Add transaction'}
      >
        {triggerContent ?? buttonText}
      </button>

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
              className="flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
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
                  defaultPersonId={defaultPersonId}
                  defaultType={defaultType}
                  defaultSourceAccountId={defaultSourceAccountId}
                  defaultDebtAccountId={defaultDebtAccountId}
                  initialValues={defaultAmount ? { amount: defaultAmount } : undefined}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
