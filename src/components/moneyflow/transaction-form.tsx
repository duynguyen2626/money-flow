'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format, subMonths } from 'date-fns' // Thêm subMonths để hỗ trợ tính năng lùi tháng
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { createTransaction } from '@/services/transaction.service'
import { Account, Category } from '@/types/moneyflow.types'
import { parseCashbackConfig, getCashbackCycleRange, ParsedCashbackConfig } from '@/lib/cashback'
import { CashbackCard, AccountSpendingStats } from '@/types/cashback.types'
import { Combobox } from '@/components/ui/combobox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Helper function để tạo tag từ ngày
export const generateTag = (date: Date) => format(date, 'MMMyy').toUpperCase();

// Cập nhật schema để thêm trường tag
const formSchema = z.object({
  occurred_at: z.date(),
  type: z.enum(['expense', 'income', 'debt', 'transfer']),
  amount: z.coerce.number().positive(),
  note: z.string().optional(),
  tag: z.string().min(1, 'Tag là bắt buộc'), // Thêm trường tag
  source_account_id: z.string({ required_error: 'Please select an account.' }),
  category_id: z.string().optional(),
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
  if (data.type === 'debt' && !data.debt_account_id) {
    return false
  }
  return true
}, {
  message: 'Person is required for debts.',
  path: ['debt_account_id'],
});

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const cycleDateFormatter = new Intl.DateTimeFormat('vi-VN', {
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

  // Thêm state để quản lý chế độ tag thủ công
  const [manualTagMode, setManualTagMode] = useState(false);
  
  // Tạo danh sách tag gợi ý (6 tháng gần nhất)
  const suggestedTags = useMemo(() => {
    const tags = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      tags.push(generateTag(date));
    }
    return tags;
  }, []);

const accountOptions = useMemo(
  () =>
    sourceAccounts.map(acc => ({
      value: acc.id,
      label: acc.name,
      description: `${acc.type.replace('_', ' ')} - ${currencyFormatter.format(acc.current_balance)}`,
      searchValue: `${acc.name} ${acc.type.replace('_', ' ')} ${acc.current_balance}`,
      icon: (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
          {getAccountInitial(acc.name)}
          </span>
        ),
      })),
    [sourceAccounts]
  )

const debtAccountOptions = useMemo(
  () =>
    debtAccounts.map(acc => ({
      value: acc.id,
      label: acc.name,
      description: `Cong no, ${currencyFormatter.format(acc.current_balance)}`,
      searchValue: `${acc.name} cong no ${acc.current_balance}`,
        icon: (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
            {getAccountInitial(acc.name)}
          </span>
        ),
      })),
    [debtAccounts]
  )

  const [status, setStatus] = useState<StatusMessage>(null)
  const [cashbackProgress, setCashbackProgress] = useState<CashbackCard | null>(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [spendingStats, setSpendingStats] = useState<AccountSpendingStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      occurred_at: new Date(),
      type: 'expense',
      amount: 0,
      note: '',
      tag: generateTag(new Date()), // Thêm giá trị mặc định cho tag
      cashback_share_percent: undefined,
      cashback_share_fixed: undefined,
    },
  })

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

    const payload = {
      ...values,
      occurred_at: values.occurred_at.toISOString(),
      cashback_share_percent: sanitizedPercent > 0 ? sanitizedPercent : undefined,
      cashback_share_fixed: sanitizedFixed > 0 ? sanitizedFixed : undefined,
    }

    const result = await createTransaction(payload)

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
        cashback_share_percent: undefined,
        cashback_share_fixed: undefined,
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
    register, // Thêm register vào destructuring
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
        description: cat.type === 'expense' ? 'Chi tieu' : 'Thu nhap',
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
        setStatsError('Khong the tai thong tin Min Spend')
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
        setProgressError('Khong tim thay du lieu cashback chu ky')
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
        setProgressError('Khong the tai thong tin cashback')
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

    const formattedTarget = currencyFormatter.format(spendingStats.minSpend)
    const ratePercent = Math.round(spendingStats.rate * 100)

    if (projectedSpend < spendingStats.minSpend) {
      const remaining = Math.max(0, spendingStats.minSpend - projectedSpend)
      return {
        text: `Cần chi thêm ${currencyFormatter.format(remaining)} nữa để đạt min spend ${formattedTarget} (${ratePercent}% cashback).`,
        className: 'text-amber-600',
      }
    }

    if (spendingStats.currentSpend < spendingStats.minSpend) {
      return {
        text: `Tuyệt vời! Giao dịch này giúp bạn đạt chỉ tiêu tối thiểu (${formattedTarget}).`,
        className: 'text-emerald-600',
      }
    }

    return {
      text: `Đã đạt chỉ tiêu Min Spend (${formattedTarget}). Đang tích lũy hoàn tiền ${ratePercent}%.`,
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
        text: 'Ngân sách hoàn tiền đã cạn. Giao dịch này sẽ không được hoàn thêm.',
        className: 'text-amber-600',
      }
    }

    if (potentialNewEarn > remaining) {
      return {
        text: `Ngân sách hoàn tiền chỉ còn ${currencyFormatter.format(
          Math.max(0, remaining)
        )}. Bạn chỉ nên nhận tối đa ${currencyFormatter.format(
          Math.max(0, remaining)
        )} cho giao dịch này.`,
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
    transactionType === 'debt' &&
    selectedAccount?.type === 'credit_card' &&
    Boolean(watchedDebtAccountId)

  // Thêm useEffect để tự động cập nhật tag khi ngày thay đổi
  useEffect(() => {
    if (!manualTagMode && watchedDate) {
      form.setValue('tag', generateTag(watchedDate));
    }
  }, [watchedDate, manualTagMode, form]);

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
                <TabsTrigger value="expense">Chi tieu</TabsTrigger>
                <TabsTrigger value="income">Thu nhap</TabsTrigger>
                <TabsTrigger value="transfer">Chuyen khoan</TabsTrigger>
                <TabsTrigger value="debt">No/Cho vay</TabsTrigger>
              </TabsList>
            </Tabs>
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

      {/* Thêm trường Tag vào form */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Kỳ nợ (Tag)</label>
        <Controller
          control={control}
          name="tag"
          render={({ field }) => (
            <div className="space-y-2">
              <input
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  // Khi người dùng thay đổi tag thủ công, đặt manualTagMode thành true
                  if (!manualTagMode) {
                    setManualTagMode(true);
                  }
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nhập tag (ví dụ: NOV25)"
              />
              {/* Các nút hành động nhanh */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Lùi về tháng trước
                    const currentDate = watchedDate || new Date();
                    const previousMonth = subMonths(currentDate, 1);
                    const previousTag = generateTag(previousMonth);
                    form.setValue('tag', previousTag);
                    setManualTagMode(true);
                  }}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                >
                  &lt; Tháng trước
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Reset về tag mặc định dựa trên ngày hiện tại
                    const currentDate = watchedDate || new Date();
                    const defaultTag = generateTag(currentDate);
                    form.setValue('tag', defaultTag);
                    setManualTagMode(false);
                  }}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        />
        {errors.tag && (
          <p className="text-sm text-red-600">{errors.tag.message}</p>
        )}
        
        {/* Dropdown gợi ý tag gần đây */}
        <div className="mt-1">
          <p className="text-xs text-gray-500 mb-1">Gợi ý gần đây:</p>
          <div className="flex flex-wrap gap-1">
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  form.setValue('tag', tag);
                  setManualTagMode(true);
                }}
                className={`rounded px-2 py-1 text-xs ${
                  watch('tag') === tag 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          {transactionType === 'income' ? 'To Account' : 'From Account'}
        </label>
        <Controller
          control={control}
          name="source_account_id"
          render={({ field }) => (
            <Combobox
              value={field.value}
              onValueChange={field.onChange}
              items={accountOptions}
              placeholder="Chon tai khoan"
              inputPlaceholder="Tim kiem tai khoan..."
              emptyState="Khong tim thay tai khoan"
            />
          )}
        />
        {errors.source_account_id && (
          <p className="text-sm text-red-600">{errors.source_account_id.message}</p>
        )}
        {progressLoading && (
          <p className="text-xs text-slate-400">Dang tai lich su cashback...</p>
        )}
        {progressError && (
          <p className="text-xs text-rose-600">{progressError}</p>
        )}
        {cashbackMeta && cashbackMeta.rate > 0 && (
          <div className="mt-3 flex flex-col gap-1 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-slate-600">
            {selectedCycleLabel && (
              <div className="font-semibold text-slate-900">
                Kỳ sao kê: {selectedCycleLabel}
              </div>
            )}
            <div className="text-xs text-blue-600">
              Cashback Rate: {(cashbackMeta.rate * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500">
              Max: {cashbackMeta.maxAmount ? currencyFormatter.format(cashbackMeta.maxAmount) : 'Khong gioi han'}
            </div>
            {minSpendHint && (
              <p className={`text-xs font-medium ${minSpendHint.className}`}>
                {minSpendHint.text}
              </p>
            )}
            {limitWarning && (
              <p className={`text-xs font-medium ${limitWarning.className}`}>
                {limitWarning.text}
              </p>
            )}
            {statsLoading && (
              <p className="text-xs text-slate-500">Đang cập nhật tiến độ Min Spend...</p>
            )}
            {statsError && (
              <p className="text-xs text-rose-600">{statsError}</p>
            )}
            {typeof cashbackProgress?.remainingBudget === 'number' && (
              <p className="text-xs text-slate-500">
                Ngan sach con lai: {currencyFormatter.format(cashbackProgress.remainingBudget)}
              </p>
            )}
            {potentialCashback > 0 && (
              <p className="text-xs text-emerald-600">
                Du kien hoan: +{currencyFormatter.format(potentialCashback)}
              </p>
            )}
          </div>
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
                placeholder="Chon danh muc"
                inputPlaceholder="Tim kiem danh muc..."
                emptyState="Khong co danh muc phu hop"
              />
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
            <Combobox
              value={field.value}
              onValueChange={field.onChange}
              items={debtAccountOptions}
              placeholder="Chon nguoi nhan"
              inputPlaceholder="Tim kiem doi tac..."
              emptyState="Khong tim thay doi tuong phu hop"
            />
          )}
        />
        {errors.debt_account_id && (
          <p className="text-sm text-red-600">{errors.debt_account_id.message}</p>
        )}
      </div>
    )}

    {showCashbackInputs && (
      <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 text-sm text-slate-600 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold uppercase text-indigo-700">
          <span>Chia cashback</span>
          <span>
            Ngan sach:{' '}
            {remainingBudget === null
              ? 'Khong gioi han'
              : currencyFormatter.format(remainingBudget)}
          </span>
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
                  disabled={budgetMaxed} // Thêm disabled khi ngân sách đã hết
                  className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Nhap phan tram"
                />
              )}
/>
            {rateLimitPercent !== null && (
              <p className="text-xs text-slate-500">
                {/* Thay đổi giới hạn hiển thị tối đa 50% thay vì rateLimitPercent */}
                Khong qua {Math.min(50, rateLimitPercent).toFixed(2)}%
              </p>
)}
{rateLimitPercent !== null && percentEntry > rateLimitPercent && (
  <p className="text-xs text-amber-600">
    {/* Giới hạn tối đa 50% cho cảnh báo */}
    Toi da {Math.min(50, rateLimitPercent).toFixed(2)}% theo chinh sach the
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
                  type="number"
                  step="1000"
                  min="0"
                  value={field.value ?? ''}
                  onChange={event => {
                    const nextValue = event.target.value
                    field.onChange(nextValue === '' ? undefined : Number(nextValue))
                  }}
                  disabled={budgetMaxed}
                  className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Nhap co dinh"
                />
              )}
            />
            {budgetMaxed && (
            <p className="text-xs text-rose-600">Ngan sach da het, khong the chia them co dinh.</p>
            )}
          </div>
        </div>
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Tong hoan cho nguoi khac</span>
          <span className="font-semibold text-slate-900">
            {currencyFormatter.format(totalBackGiven)}
          </span>
        </div>
        {budgetExceeded && remainingBudget !== null && (
          <p className="text-xs text-amber-600">
            Ngan sach hoan tien chi con {currencyFormatter.format(remainingBudget)}.
          </p>
        )}
        {suggestedPercent !== null && budgetExceeded && (
          <p className="text-xs text-amber-600">
            Goi y giam ty le xuong {suggestedPercent.toFixed(2)}% de khong vuot ngan sach.
          </p>
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
