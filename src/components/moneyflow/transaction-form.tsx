'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useMemo, useState } from 'react'
import { z } from 'zod'
import { createTransaction } from '@/services/transaction.service'
import { Account, Category } from '@/types/moneyflow.types'

const formSchema = z.object({
  occurred_at: z.date(),
  type: z.enum(['expense', 'income', 'debt', 'transfer']),
  amount: z.coerce.number().positive(),
  note: z.string().optional(),
  source_account_id: z.string({ required_error: 'Please select an account.' }),
  category_id: z.string().optional(),
  debt_account_id: z.string().optional(),
}).refine(data => {
  if ((data.type === 'expense' || data.type === 'income') && !data.category_id) {
    return false
  }
  return true;
}, {
  message: 'Category is required for expenses and incomes.',
  path: ['category_id'],
}).refine(data => {
  if (data.type === 'debt' && !data.debt_account_id) {
    return false
  }
  return true
}, {
  message: 'Person is required for debts.',
  path: ['debt_account_id'],
});

type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  onSuccess?: () => void;
}

type StatusMessage = {
  type: 'success' | 'error';
  text: string;
} | null

export function TransactionForm({ accounts: allAccounts, categories, onSuccess }: TransactionFormProps) {
  const {
    sourceAccounts,
    debtAccounts,
  } = useMemo(() => {
    const sourceAccounts = allAccounts.filter(a => a.type !== 'debt');
    const debtAccounts = allAccounts.filter(a => a.type === 'debt');
    return { sourceAccounts, debtAccounts };
  }, [allAccounts]);

  const [status, setStatus] = useState<StatusMessage>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      occurred_at: new Date(),
      type: 'expense',
      amount: 0,
      note: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setStatus(null)

    const result = await createTransaction({
      ...values,
      occurred_at: values.occurred_at.toISOString(),
    })

    if (result) {
      setStatus({
        type: 'success',
        text: 'Transaction created successfully.',
      })
      form.reset({
        occurred_at: new Date(),
        type: 'expense',
        amount: 0,
        note: '',
        source_account_id: undefined,
        category_id: undefined,
        debt_account_id: undefined,
      })
      onSuccess?.()
    } else {
      setStatus({
        type: 'error',
        text: 'Failed to create transaction.',
      })
    }
  }

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    register,
  } = form

  const transactionType = useWatch({
    control,
    name: 'type',
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Type</label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <select
              {...field}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="debt">Debt</option>
              <option value="transfer">Transfer</option>
            </select>
          )}
        />
        {errors.type && (
          <p className="text-sm text-red-600">{errors.type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Date</label>
        <Controller
          control={control}
          name="occurred_at"
          render={({ field }) => (
            <input
              type="date"
              value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
              onChange={event => {
                const nextValue = event.target.value
                field.onChange(nextValue ? new Date(nextValue) : undefined)
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          )}
        />
        {errors.occurred_at && (
          <p className="text-sm text-red-600">{errors.occurred_at.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          {transactionType === 'income' ? 'To Account' : 'From Account'}
        </label>
        <Controller
          control={control}
          name="source_account_id"
          render={({ field }) => (
            <select
              value={field.value ?? ''}
              onChange={event => field.onChange(event.target.value || undefined)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="" disabled>
                Select an account
              </option>
              {sourceAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          )}
        />
        {errors.source_account_id && (
          <p className="text-sm text-red-600">{errors.source_account_id.message}</p>
        )}
      </div>

      {(transactionType === 'expense' || transactionType === 'income') && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <select
                value={field.value ?? ''}
                onChange={event => field.onChange(event.target.value || undefined)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories
                  .filter(cat => cat.type === transactionType)
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            )}
          />
          {errors.category_id && (
            <p className="text-sm text-red-600">{errors.category_id.message}</p>
          )}
        </div>
      )}

      {transactionType === 'debt' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Person</label>
          <Controller
            control={control}
            name="debt_account_id"
            render={({ field }) => (
              <select
                value={field.value ?? ''}
                onChange={event => field.onChange(event.target.value || undefined)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="" disabled>
                  Select a person
                </option>
                {debtAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.debt_account_id && (
            <p className="text-sm text-red-600">{errors.debt_account_id.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Amount</label>
        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <input
              type="number"
              step="0.01"
              value={field.value ?? ''}
              onChange={event => {
                const nextValue = event.target.value
                field.onChange(nextValue === '' ? undefined : Number(nextValue))
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="0.00"
            />
          )}
        />
        {errors.amount && (
          <p className="text-sm text-red-600">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Note</label>
        <textarea
          {...register('note')}
          placeholder="Add a note..."
          className="min-h-[60px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {errors.note && (
          <p className="text-sm text-red-600">{errors.note.message}</p>
        )}
      </div>

      {status && (
        <p
          className={`text-sm ${
            status.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {status.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Saving...' : 'Add Transaction'}
      </button>
    </form>
  )
}
