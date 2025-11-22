'use client'

import { MouseEvent, useState } from 'react'
import { TransactionForm } from './transaction-form'
import { useRouter } from 'next/navigation'
import { Account, Category, Person } from '@/types/moneyflow.types'

type AddTransactionDialogProps = {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  buttonText?: string;
  defaultTag?: string;
  defaultPersonId?: string;
  defaultType?: 'expense' | 'income' | 'debt' | 'transfer';
  buttonClassName?: string;
}

export function AddTransactionDialog({ 
  accounts, 
  categories, 
  people,
  buttonText = 'Add Transaction',
  defaultTag,
  defaultPersonId,
  defaultType,
  buttonClassName
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

  const defaultClassName = "rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"

  return (
    <>
      <button
        type="button"
        className={buttonClassName || defaultClassName}
        onClick={() => setOpen(true)}
      >
        {buttonText}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add Transaction"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
          onClick={closeDialog}
        >
          <div
            // Sửa lại class để giới hạn chiều rộng tối đa và cải thiện responsive
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={stopPropagation}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add New Transaction</h2>
              <button
                type="button"
                className="rounded p-1 text-gray-500 transition hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                aria-label="Close dialog"
                onClick={closeDialog}
              >
                X
              </button>
            </div>
            <div className="py-2">
              <TransactionForm
                accounts={accounts}
                categories={categories}
                people={people}
                onSuccess={handleSuccess}
                defaultTag={defaultTag}
                defaultPersonId={defaultPersonId}
                defaultType={defaultType}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
