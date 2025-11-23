'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format, subMonths } from 'date-fns'
import { Controller, Resolver, useForm, useWatch } from 'react-hook-form'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { z } from 'zod'
import { ensureDebtAccountAction } from '@/actions/people-actions'
import { createTransaction } from '@/services/transaction.service'
import { Account, Category, Person } from '@/types/moneyflow.types'
import { parseCashbackConfig, getCashbackCycleRange, ParsedCashbackConfig } from '@/lib/cashback'
import { CashbackCard, AccountSpendingStats } from '@/types/cashback.types'
import { Combobox } from '@/components/ui/combobox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { generateTag } from '@/lib/tag'

const formSchema = z.object({
  occurred_at: z.date(),
  type: z.enum(['expense', 'income', 'debt', 'transfer']),
  amount: z.coerce.number().positive(),
  note: z.string().optional(),
  tag: z.string().min(1, 'Tag is required'),
  source_account_id: z.string().min(1, { message: 'Please select an account.' }),
  category_id: z.string().optional(),
  person_id: z.string().optional(),
  debt_account_id: z.string().optional(),
  cashback_share_percent: z.coerce.number().min(0).optional(),
  cashback_share_fixed: z.coerce.number().min(0).optional(),
}).refine(data => {
  if ((data.type === 'expense' || data.type === 'income') && !data.category_id) {
    return false
  }
  return true;
}, {
  message: 'Category is required for expenses and incomes.',
  path: ['category_id'],
}).refine(data => {
  if (data.type === 'debt' && !data.person_id) {
    return false
  }
  return true
}, {
  message: 'Please choose a person for this transaction.',
  path: ['person_id'],
}).refine(data => {
  if ((data.type === 'debt' || data.type === 'transfer') && !data.debt_account_id) {
    return false
  }
  return true
}, {
  message: 'Destination account is required for this transaction.',
  path: ['debt_account_id'],
}).refine(data => {
  if (
    (data.type === 'transfer' || data.type === 'debt') &&
    data.debt_account_id &&
    data.debt_account_id === data.source_account_id
  ) {
    return false
  }
  return true
}, {
  message: 'Source and destination must be different.',
  path: ['debt_account_id'],
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

const cycleDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: '2-digit',
})

function formatRangeLabel(range: { start: Date; end: Date }) {
  const fmt = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(
    date.getMonth() + 1
  ).padStart(2, '0')}`
  return `${fmt(range.start)} - ${fmt(range.end)}`
}

function getCycleLabelForDate(
  targetDate: Date | undefined,
  config: ParsedCashbackConfig | null
): string {
  if (!config) {
    return ''
  }

  const referenceDate = targetDate ?? new Date()
  const range = getCashbackCycleRange(config, referenceDate)
  return formatRangeLabel(range)
}

function getAccountInitial(name: string) {
  const firstLetter = name?.trim().charAt(0)
  return firstLetter ? firstLetter.toUpperCase() : '?'
}

type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  onSuccess?: () => void;
  defaultTag?: string;
  defaultPersonId?: string;
  defaultType?: 'expense' | 'income' | 'debt' | 'transfer';
  defaultSourceAccountId?: string;
  defaultDebtAccountId?: string;
}

type StatusMessage = {
  type: 'success' | 'error';
  text: string;
} | null

export function TransactionForm({
  accounts: allAccounts,
  categories,
  people,
  onSuccess,
  defaultTag,
  defaultPersonId,
  defaultType,
  defaultSourceAccountId,
  defaultDebtAccountId,
}: TransactionFormProps) {
  const sourceAccounts = useMemo(
    () => allAccounts.filter(a => a.type !== 'debt'),
    [allAccounts]
  )

  const [peopleState, setPeopleState] = useState<Person[]>(people)

  useEffect(() => {
    setPeopleState(people)
  }, [people])

  const [manualTagMode, setManualTagMode] = useState(Boolean(defaultTag));
  
  const suggestedTags = useMemo(() => {
    const tags = [];
    const today = new Date();
    for (let i = 2; i >= 0; i--) {
      const date = subMonths(today, i);
      tags.push(generateTag(date));
    }
    return [...new Set(tags)];
  }, []);

const accountOptions = useMemo(
  () =>
    sourceAccounts.map(acc => ({
      value: acc.id,
      label: acc.name,
      description: `${acc.type.replace('_', ' ')} - ${numberFormatter.format(acc.current_balance)}`,
      searchValue: `${acc.name} ${acc.type.replace('_', ' ')} ${acc.current_balance}`,
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
          {getAccountInitial(acc.name)}
          </span>
        ),
      })),
    [sourceAccounts]
  )

const destinationAccountOptions = useMemo(
  () =>
    allAccounts.map(acc => ({
      value: acc.id,
      label: acc.name,
      description: `${acc.type.replace('_', ' ')} - ${numberFormatter.format(acc.current_balance)}`,
      searchValue: `${acc.name} ${acc.type.replace('_', ' ')} ${acc.current_balance}`,
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
          {getAccountInitial(acc.name)}
        </span>
      ),
    })),
  [allAccounts]
)

const personOptions = useMemo(
  () =>
    peopleState.map(person => ({
      value: person.id,
      label: person.name,
      description: person.email || 'No email',
      searchValue: `${person.name} ${person.email ?? ''}`.trim(),
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
          {getAccountInitial(person.name)}
        </span>
      ),
    })),
  [peopleState]
)

const personMap = useMemo(() => {
  const map = new Map<string, Person>()
  peopleState.forEach(person => map.set(person.id, person))
  return map
}, [peopleState])

const debtAccountByPerson = useMemo(() => {
  const map = new Map<string, string>()
  peopleState.forEach(person => {
    if (person.debt_account_id) {
      map.set(person.id, person.debt_account_id)
    }
  })
  return map
}, [peopleState])

  const [status, setStatus] = useState<StatusMessage>(null)
  const [cashbackProgress, setCashbackProgress] = useState<CashbackCard | null>(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [spendingStats, setSpendingStats] = useState<AccountSpendingStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [debtEnsureError, setDebtEnsureError] = useState<string | null>(null)
  const [isEnsuringDebt, startEnsuringDebt] = useTransition()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<z.infer<typeof formSchema>>,
    defaultValues: {
      occurred_at: new Date(),
      type: defaultType ?? 'expense',
      amount: 0,
      note: '',
      tag: defaultTag ?? generateTag(new Date()),
      source_account_id: defaultSourceAccountId ?? undefined,
      person_id: undefined,
      debt_account_id: defaultDebtAccountId ?? undefined,
      cashback_share_percent: undefined,
      cashback_share_fixed: undefined,
    },
  })

  const applyDefaultPersonSelection = useCallback(() => {
    if (!defaultPersonId) {
      return
    }
    const direct = personMap.get(defaultPersonId)
    if (direct) {
      form.setValue('person_id', direct.id)
      form.setValue('debt_account_id', direct.debt_account_id ?? undefined)
      return
    }
    const fromDebt = peopleState.find(person => person.debt_account_id === defaultPersonId)
    if (fromDebt) {
      form.setValue('person_id', fromDebt.id)
      form.setValue('debt_account_id', fromDebt.debt_account_id ?? undefined)
      return
    }
    form.setValue('debt_account_id', defaultPersonId)
  }, [defaultPersonId, form, peopleState, personMap])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setStatus(null)

    const percentLimit = cashbackProgress ? cashbackProgress.rate * 100 : null
    const rawPercent = Number(values.cashback_share_percent ?? 0)
    const rawFixed = Number(values.cashback_share_fixed ?? 0)
    const sanitizedPercent =
      percentLimit !== null
        ? Math.min(percentLimit, Math.max(0, rawPercent))
        : Math.max(0, rawPercent)
    const sanitizedFixed = Math.max(0, rawFixed)

    const payload: Parameters<typeof createTransaction>[0] = {
      ...values,
      occurred_at: values.occurred_at.toISOString(),
      cashback_share_percent: sanitizedPercent > 0 ? sanitizedPercent : undefined,
      cashback_share_fixed: sanitizedFixed > 0 ? sanitizedFixed : undefined,
      note: values.note ?? '',
    }

    const result = await createTransaction(payload)

    if (result) {
      setStatus({
        type: 'success',
        text: 'Transaction created successfully.',
      })
      form.reset({
        occurred_at: new Date(),
        type: defaultType ?? 'expense',
        amount: 0,
      note: '',
      tag: defaultTag ?? generateTag(new Date()),
      source_account_id: defaultSourceAccountId ?? undefined,
      category_id: undefined,
      person_id: undefined,
      debt_account_id: defaultDebtAccountId ?? undefined,
      cashback_share_percent: undefined,
      cashback_share_fixed: undefined,
    })
      setManualTagMode(Boolean(defaultTag))
      applyDefaultPersonSelection()
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
    watch, 
  } = form

  const transactionType = useWatch({
    control,
    name: 'type',
  })

  const categoryOptions = useMemo(() => {
    if (transactionType !== 'expense' && transactionType !== 'income') {
      return []
    }
    return categories
      .filter(cat => cat.type === transactionType)
      .map(cat => ({
        value: cat.id,
        label: cat.name,
        description: cat.type === 'expense' ? 'Expense' : 'Income',
        searchValue: `${cat.name} ${cat.type}`,
      }))
  }, [categories, transactionType])

  const watchedAccountId = useWatch({
    control,
    name: 'source_account_id',
  })

  const watchedAmount = useWatch({
    control,
    name: 'amount',
  })

  const watchedDate = useWatch({
    control,
    name: 'occurred_at',
  })

  const watchedPersonId = useWatch({
    control,
    name: 'person_id',
  })

  const watchedDebtAccountId = useWatch({
    control,
    name: 'debt_account_id',
  })

  const watchedCashbackPercent = useWatch({
    control,
    name: 'cashback_share_percent',
  })

  const watchedCashbackFixed = useWatch({
    control,
    name: 'cashback_share_fixed',
  })

  const selectedAccount = useMemo(
    () => sourceAccounts.find(acc => acc.id === watchedAccountId),
    [sourceAccounts, watchedAccountId]
  )

  const cashbackMeta = useMemo(
    () =>
      selectedAccount ? parseCashbackConfig(selectedAccount.cashback_config) : null,
    [selectedAccount]
  )

  const selectedCycleLabel = useMemo(
    () => getCycleLabelForDate(watchedDate, cashbackMeta),
    [watchedDate, cashbackMeta]
  )

  useEffect(() => {
    if (!defaultPersonId) {
      return
    }
    const currentPerson = form.getValues('person_id')
    const currentDebt = form.getValues('debt_account_id')
    if (currentPerson || currentDebt) {
      return
    }
    applyDefaultPersonSelection()
  }, [applyDefaultPersonSelection, defaultPersonId, form])

  useEffect(() => {
    if (!watchedPersonId) {
      form.setValue('debt_account_id', undefined)
      setDebtEnsureError(null)
      return
    }
    setDebtEnsureError(null)
    const linkedAccountId = debtAccountByPerson.get(watchedPersonId)
    form.setValue('debt_account_id', linkedAccountId ?? undefined)
  }, [watchedPersonId, debtAccountByPerson, form])

  useEffect(() => {
    if (!watchedAccountId) {
      setSpendingStats(null)
      setStatsError(null)
      setStatsLoading(false)
      return
    }

    const controller = new AbortController()
    setStatsLoading(true)
    setStatsError(null)

    const params = new URLSearchParams()
    params.set('accountId', watchedAccountId)
    if (watchedDate) {
      params.set('date', watchedDate.toISOString())
    }

    fetch(`/api/cashback/stats?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error('Failed to load spending stats')
        }
        const payload = await response.json()
        setSpendingStats(payload ?? null)
      })
      .catch(error => {
        if ((error as { name?: string }).name === 'AbortError') {
          return
        }
        console.error(error)
        setSpendingStats(null)
        setStatsError('Could not load Min Spend info')
      })
      .finally(() => {
        setStatsLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [watchedAccountId, watchedDate])

  useEffect(() => {
    if (!selectedAccount?.id) {
      setCashbackProgress(null)
      setProgressError(null)
      return undefined
    }

    const controller = new AbortController()
    setProgressLoading(true)
    setProgressError(null)

    fetch(`/api/cashback/progress?accountId=${selectedAccount.id}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error('Failed to load cashback progress')
        }
        const payload = (await response.json()) as CashbackCard[]
        if (!payload.length) {
        setCashbackProgress(null)
        setProgressError('Could not find cashback cycle data')
          return
        }
        setCashbackProgress(payload[0])
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') {
          return
        }
        console.error(error)
        setCashbackProgress(null)
        setProgressError('Could not load cashback info')
      })
      .finally(() => {
        setProgressLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [selectedAccount?.id])

  const potentialCashback = useMemo(() => {
    if (!cashbackMeta || cashbackMeta.rate === 0) {
      return 0
    }
    if (typeof watchedAmount !== 'number' || Number.isNaN(watchedAmount)) {
      return 0
    }
    return Math.abs(watchedAmount) * cashbackMeta.rate
  }, [cashbackMeta, watchedAmount])

  const amountValue = typeof watchedAmount === 'number' ? Math.abs(watchedAmount) : 0
  const projectedSpend = (spendingStats?.currentSpend ?? 0) + amountValue
  const minSpendHint = useMemo(() => {
    if (!spendingStats?.minSpend || spendingStats.minSpend <= 0) {
      return null
    }

    const formattedTarget = numberFormatter.format(spendingStats.minSpend)
    const ratePercent = Math.round(spendingStats.rate * 100)

    if (projectedSpend < spendingStats.minSpend) {
      const remaining = Math.max(0, spendingStats.minSpend - projectedSpend)
      return {
        text: `Spend ${numberFormatter.format(remaining)} more to reach min spend of ${formattedTarget} (${ratePercent}% cashback).`,
        className: 'text-amber-600',
      }
    }

    if (spendingStats.currentSpend < spendingStats.minSpend) {
      return {
        text: `Great! This transaction helps you meet the minimum spend requirement (${formattedTarget}).`,
        className: 'text-emerald-600',
      }
    }

    return {
      text: `Min spend target met (${formattedTarget}). Accumulating ${ratePercent}% cashback.`,
      className: 'text-blue-600',
    }
  }, [projectedSpend, spendingStats])
  const limitWarning = useMemo(() => {
    if (
      !spendingStats ||
      spendingStats.maxCashback === null ||
      spendingStats.rate <= 0
    ) {
      return null
    }

    const minSpendSatisfied =
      spendingStats.minSpend === null ||
      spendingStats.currentSpend >= spendingStats.minSpend

    if (!minSpendSatisfied) {
      return null
    }

    const potentialNewEarn = amountValue * spendingStats.rate
    const remaining =
      spendingStats.maxCashback - spendingStats.earnedSoFar

    if (remaining <= 0) {
      return {
        text: 'Cashback budget exhausted. This transaction will not earn further cashback.',
        className: 'text-amber-600',
      }
    }

    if (potentialNewEarn > remaining) {
      return {
        text: `Cashback budget has only ${numberFormatter.format(
          Math.max(0, remaining)
        )} left. You should only claim a maximum of ${numberFormatter.format(
          Math.max(0, remaining)
        )} for this transaction.`,
        className: 'text-amber-600',
      }
    }

    return null
  }, [amountValue, spendingStats])
  const rateLimitPercent =
    typeof cashbackProgress?.rate === 'number'
      ? cashbackProgress.rate * 100
      : null
  const percentEntry = Number.isFinite(Number(watchedCashbackPercent ?? 0))
    ? Number(watchedCashbackPercent ?? 0)
    : 0
  const appliedPercent =
    rateLimitPercent !== null
      ? Math.min(rateLimitPercent, Math.max(0, percentEntry))
      : Math.max(0, percentEntry)
  const fixedEntry = Math.max(0, Number(watchedCashbackFixed ?? 0))
  const percentBackValue = (appliedPercent / 100) * amountValue
  const rawShareTotal = percentBackValue + fixedEntry
  const remainingBudget =
    typeof cashbackProgress?.remainingBudget === 'number'
      ? Math.max(0, cashbackProgress.remainingBudget)
      : null
  const budgetLimitedShare =
    typeof remainingBudget === 'number'
      ? Math.min(rawShareTotal, remainingBudget)
      : rawShareTotal
  const totalBackGiven = Math.min(amountValue, budgetLimitedShare)
  const budgetExceeded =
    typeof remainingBudget === 'number' && rawShareTotal > remainingBudget
  const budgetMaxed =
    typeof remainingBudget === 'number' && remainingBudget <= 0
  const suggestedPercent =
    typeof remainingBudget === 'number' && amountValue > 0
      ? Math.max(
          0,
          Math.min(
            rateLimitPercent ?? Infinity,
            ((remainingBudget - fixedEntry) / amountValue) * 100
          )
        )
      : null
  const showCashbackInputs =
    transactionType !== 'income' &&
    selectedAccount?.type === 'credit_card' &&
    (transactionType !== 'transfer' || Boolean(watchedDebtAccountId))

  const handleEnsureDebtAccount = () => {
    if (!watchedPersonId) {
      return
    }
    const person = personMap.get(watchedPersonId)
    startEnsuringDebt(async () => {
      setDebtEnsureError(null)
      const accountId = await ensureDebtAccountAction(watchedPersonId, person?.name)
      if (!accountId) {
        setDebtEnsureError('Could not create debt account. Please try again.')
        return
      }
      setPeopleState(prev => prev.map(p => p.id === watchedPersonId ? { ...p, debt_account_id: accountId } : p))
      form.setValue('debt_account_id', accountId, { shouldValidate: true })
    })
  }

  useEffect(() => {
    if (!manualTagMode && watchedDate) {
      form.setValue('tag', generateTag(watchedDate));
    }
  }, [watchedDate, manualTagMode, form]);

  useEffect(() => {
    if (typeof defaultTag === 'string') {
      form.setValue('tag', defaultTag);
      setManualTagMode(true);
    }
  }, [defaultTag, form]);

  useEffect(() => {
    if (defaultType) {
      form.setValue('type', defaultType);
    }
  }, [defaultType, form]);

  useEffect(() => {
    if (defaultSourceAccountId) {
      form.setValue('source_account_id', defaultSourceAccountId)
    }
  }, [defaultSourceAccountId, form])

  useEffect(() => {
    if (defaultDebtAccountId) {
      form.setValue('debt_account_id', defaultDebtAccountId)
    }
  }, [defaultDebtAccountId, form])

  const debtAccountName = useMemo(() => {
    if (!watchedDebtAccountId) return null
    const account = allAccounts.find(acc => acc.id === watchedDebtAccountId)
    return account?.name ?? null
  }, [watchedDebtAccountId, allAccounts])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Type</label>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
              <TabsList className="grid w-full grid-cols-4 gap-1">
                <TabsTrigger value="expense">Expense</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
                <TabsTrigger value="debt">Debt</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        />
        {errors.type && (
          <p className="text-sm text-red-600">{errors.type.message}</p>
        )}
      </div>

      {transactionType === 'debt' && (
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Person
          </label>
          <Controller
            control={control}
            name="person_id"
            render={({ field }) => (
              <Combobox
                value={field.value}
                onValueChange={value => {
                  field.onChange(value)
                  const linkedAccount = value ? debtAccountByPerson.get(value) : undefined
                  form.setValue('debt_account_id', linkedAccount ?? undefined, { shouldValidate: true })
                }}
                items={personOptions}
                placeholder="Select person"
                inputPlaceholder="Search person..."
                emptyState="No person found"
              />
            )}
          />
          {errors.person_id && (
            <p className="text-sm text-red-600">{errors.person_id.message}</p>
          )}
           {debtAccountName && (
            <p className="text-xs text-slate-500 mt-1">
                Debt Account: <span className="font-semibold text-slate-700">{debtAccountName}</span>
            </p>
           )}
        </div>

        {watchedPersonId && !debtAccountByPerson.get(watchedPersonId) && (
          <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <div className="space-y-1">
              <p className="font-semibold">This person does not have a debt account.</p>
              <p>A debt account will be created automatically when you click the button.</p>
              {debtEnsureError && (
                <p className="text-rose-600">{debtEnsureError}</p>
              )}
            </div>
            <button
              type="button"
              className="rounded-md bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={handleEnsureDebtAccount}
              disabled={isEnsuringDebt}
            >
              {isEnsuringDebt ? 'Creating...' : 'Create & Link Now'}
            </button>
          </div>
        )}
        {errors.debt_account_id && (
          <p className="text-sm text-red-600">{errors.debt_account_id.message}</p>
        )}
      </div>
    )}

      {transactionType === 'transfer' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Destination account</label>
            <Controller
              control={control}
              name="debt_account_id"
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onValueChange={field.onChange}
                  items={destinationAccountOptions}
                  placeholder="Select destination"
                  inputPlaceholder="Search account..."
                  emptyState="No account found"
                />
              )}
            />
            {errors.debt_account_id && (
              <p className="text-sm text-red-600">{errors.debt_account_id.message}</p>
            )}
          </div>
        </div>
      )}

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
        {transactionType !== 'debt' && <p className="text-xs text-gray-500 pt-1">Cycle Tag: <span className="font-semibold">{watch('tag')}</span></p>}
      </div>

      {transactionType === 'debt' && (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Debt Cycle (Tag)</label>
        <Controller
          control={control}
          name="tag"
          render={({ field }) => (
            <div className="space-y-2">
              <input
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (!manualTagMode) {
                    setManualTagMode(true);
                  }
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Enter tag (e.g., NOV25)"
              />
            </div>
          )}
        />
        {errors.tag && (
          <p className="text-sm text-red-600">{errors.tag.message}</p>
        )}
        
        <div className="mt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 mr-1">Recent:</span>
            <button
              type="button"
              onClick={() => {
                form.setValue('tag', generateTag(new Date()), { shouldValidate: true });
                setManualTagMode(true);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 p-1 text-xs text-gray-700 transition-colors hover:bg-gray-200"
              aria-label="Reset to current month"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/></svg>
            </button>
            <button
              type="button"
              onClick={() => {
                const currentDate = watchedDate || new Date();
                const previousMonth = subMonths(currentDate, 1);
                const previousTag = generateTag(previousMonth);
                form.setValue('tag', previousTag, { shouldValidate: true });
                setManualTagMode(true);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100 p-1 text-xs text-gray-700 transition-colors hover:bg-gray-200"
              aria-label="Previous month"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  form.setValue('tag', tag, { shouldValidate: true });
                  setManualTagMode(true);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  watch('tag') === tag 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            {transactionType === 'income'
              ? 'To Account'
              : transactionType === 'transfer'
                ? 'Source of Funds'
                : 'From Account'}
          </label>
          <Controller
            control={control}
            name="source_account_id"
            render={({ field }) => (
              <Combobox
                value={field.value}
                onValueChange={field.onChange}
                items={accountOptions}
                placeholder="Select account"
                inputPlaceholder="Search account..."
                emptyState="No account found"
              />
            )}
          />
          {errors.source_account_id && (
            <p className="text-sm text-red-600">{errors.source_account_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Amount</label>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <input
                type="text"
                inputMode="decimal"
                value={field.value ? new Intl.NumberFormat('en-US').format(field.value) : ''}
                onFocus={() => {
                  if (field.value === 0) {
                    field.onChange(undefined);
                  }
                }}
                onChange={event => {
                  const rawValue = event.target.value;
                  const numericValue = rawValue.replace(/[^0-9]/g, '');
                  
                  if (numericValue === '') {
                    field.onChange(undefined);
                    return;
                  }

                  const number = parseInt(numericValue, 10);
                  if (!isNaN(number)) {
                    field.onChange(number);
                  }
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="0"
              />
            )}
          />
          {errors.amount && (
            <p className="text-sm text-red-600">{errors.amount.message}</p>
          )}
        </div>

        {progressLoading && (
          <p className="text-xs text-slate-400">Loading cashback history...</p>
        )}
        {progressError && (
          <p className="text-xs text-rose-600">{progressError}</p>
        )}
      </div>

      {(transactionType === 'expense' || transactionType === 'income') && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Combobox
                value={field.value}
                onValueChange={field.onChange}
                items={categoryOptions}
                placeholder="Select category"
                inputPlaceholder="Search category..."
                emptyState="No matching category"
              />
            )}
          />
          {errors.category_id && (
            <p className="text-sm text-red-600">{errors.category_id.message}</p>
          )}
        </div>
      )}

    {showCashbackInputs && (
      <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 text-sm text-slate-600 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs font-semibold uppercase text-indigo-700">
          <div className="space-y-0.5">
            <div className="text-[11px] text-slate-500">Statement Cycle</div>
            <div className="text-sm font-semibold text-slate-900">
              {selectedCycleLabel ?? 'No cycle info'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-indigo-800">Rate: {(cashbackMeta?.rate ?? 0) * 100}%</span>
            <span>
              Budget:{' '}
              {remainingBudget === null
                ? 'Unlimited'
                : numberFormatter.format(remainingBudget)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">% Back</label>
            <Controller
              control={control}
              name="cashback_share_percent"
              render={({ field }) => (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={rateLimitPercent ?? undefined}
                  value={field.value ?? ''}
                  onChange={event => {
                    const nextValue = event.target.value
                    field.onChange(nextValue === '' ? undefined : Number(nextValue))
                  }}
                  disabled={budgetMaxed}
                  className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter percentage"
                />
              )}
            />
            {rateLimitPercent !== null && (
              <p className="text-xs text-slate-500">
                Up to {Math.min(50, rateLimitPercent).toFixed(2)}%
              </p>
            )}
            {rateLimitPercent !== null && percentEntry > rateLimitPercent && (
              <p className="text-xs text-amber-600">
                Max {Math.min(50, rateLimitPercent).toFixed(2)}% according to card policy
              </p>
            )}

          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Fixed Back</label>
            <Controller
              control={control}
              name="cashback_share_fixed"
              render={({ field }) => (
                <input
                  type="text"
                  inputMode="decimal"
                  value={field.value ? new Intl.NumberFormat('en-US').format(field.value) : ''}
                  onChange={event => {
                    const rawValue = event.target.value
                    const numericValue = rawValue.replace(/[^0-9]/g, '')
                    if (numericValue === '') {
                      field.onChange(undefined)
                      return
                    }
                    const number = parseInt(numericValue, 10)
                    if (!Number.isNaN(number)) {
                      field.onChange(number)
                    }
                  }}
                  disabled={budgetMaxed}
                  className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter fixed amount"
                />
              )}
            />
            {budgetMaxed && (
            <p className="text-xs text-rose-600">Budget exhausted, cannot add fixed amount.</p>
            )}
          </div>
        </div>
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total shared with person</span>
          <span className="font-semibold text-slate-900">
            {numberFormatter.format(totalBackGiven)}
          </span>
        </div>
        {budgetExceeded && remainingBudget !== null && (
          <p className="text-xs text-amber-600">
            Cashback budget only has {numberFormatter.format(remainingBudget)} remaining.
          </p>
        )}
        {suggestedPercent !== null && budgetExceeded && (
          <p className="text-xs text-amber-600">
            Suggest lowering percentage to {suggestedPercent.toFixed(2)}% to not exceed budget.
          </p>
        )}
      </div>
    )}

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
