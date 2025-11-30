'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format, subMonths } from 'date-fns'
import { Controller, Resolver, useForm, useWatch } from 'react-hook-form'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { ensureDebtAccountAction } from '@/actions/people-actions'
import { createTransaction, updateTransaction, requestRefund, confirmRefund } from '@/services/transaction.service'
import { Account, Category, Person, Shop } from '@/types/moneyflow.types'
import { parseCashbackConfig, getCashbackCycleRange, ParsedCashbackConfig } from '@/lib/cashback'
import { CashbackCard, AccountSpendingStats } from '@/types/cashback.types'
import { Combobox } from '@/components/ui/combobox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { generateTag } from '@/lib/tag'
import { REFUND_PENDING_ACCOUNT_ID } from '@/constants/refunds'
import { Lock, Wallet, User, Store, Tag, Calendar, FileText, Percent, DollarSign, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, CreditCard, RotateCcw, ChevronLeft } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { SmartAmountInput } from '@/components/ui/smart-amount-input'
import { CategoryDialog } from '@/components/moneyflow/category-dialog'
import { AddShopDialog } from '@/components/moneyflow/add-shop-dialog'
import { CreatePersonDialog } from '@/components/people/create-person-dialog'



const formSchema = z.object({
  occurred_at: z.date(),
  type: z.enum(['expense', 'income', 'debt', 'transfer', 'repayment']),
  amount: z.coerce.number().positive(),
  note: z.string().optional(),
  tag: z.string().min(1, 'Tag is required'),
  source_account_id: z.string().min(1, { message: 'Please select an account.' }),
  category_id: z.string().optional(),
  person_id: z.string().optional(),
  debt_account_id: z.string().optional(),
  cashback_share_percent: z.coerce.number().min(0).optional(),
  cashback_share_fixed: z.coerce.number().min(0).optional(),
  shop_id: z.string().optional(),
  is_voluntary: z.boolean().optional(),
}).refine(data => {
  if ((data.type === 'expense' || data.type === 'income') && !data.category_id) {
    return false
  }
  return true;
}, {
  message: 'Category is required for expenses and incomes.',
  path: ['category_id'],
}).refine(data => {
  if ((data.type === 'debt' || data.type === 'repayment') && !data.person_id) {
    return false
  }
  return true
}, {
  message: 'Please choose a person for this transaction.',
  path: ['person_id'],
}).refine(data => {
  if ((data.type === 'debt' || data.type === 'transfer' || data.type === 'repayment') && !data.debt_account_id) {
    return false
  }
  return true
}, {
  message: 'Destination account is required for this transaction.',
  path: ['debt_account_id'],
}).refine(data => {
  if (
    (data.type === 'transfer' || data.type === 'debt' || data.type === 'repayment') &&
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
const REFUND_CATEGORY_ID = 'e0000000-0000-0000-0000-000000000095'

export type TransactionFormValues = z.infer<typeof formSchema>

const cycleDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: '2-digit',
})

function formatRangeLabel(range: { start: Date; end: Date }, targetDate: Date) {
  const fmt = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const diffTime = range.end.getTime() - targetDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return `Cycle: ${fmt(range.start)} - ${fmt(range.end)} (Remaining: ${diffDays} days)`;
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
  return formatRangeLabel(range, referenceDate)
}

function getAccountInitial(name: string) {
  const firstLetter = name?.trim().charAt(0)
  return firstLetter ? firstLetter.toUpperCase() : '?'
}

type TransactionFormProps = {
  accounts: Account[];
  categories: Category[];
  people: Person[];
  shops?: Shop[];
  onSuccess?: () => void;
  defaultTag?: string;
  defaultPersonId?: string;
  defaultType?: 'expense' | 'income' | 'debt' | 'transfer' | 'repayment';
  defaultSourceAccountId?: string;
  defaultDebtAccountId?: string;
  transactionId?: string;
  initialValues?: Partial<TransactionFormValues> & {
    category_name?: string
    account_name?: string
  };
  mode?: 'create' | 'edit' | 'refund';
  refundTransactionId?: string;
  refundAction?: 'request' | 'confirm';
  refundMaxAmount?: number;
  defaultRefundStatus?: 'pending' | 'received';
}

type StatusMessage = {
  type: 'success' | 'error';
  text: string;
} | null

export function TransactionForm({
  accounts: allAccounts,
  categories,
  people,
  shops = [],
  onSuccess,
  defaultTag,
  defaultPersonId,
  defaultType,
  defaultSourceAccountId,
  defaultDebtAccountId,
  transactionId,
  initialValues,
  mode = 'create',
  refundTransactionId,
  refundAction = 'request',
  refundMaxAmount,
  defaultRefundStatus = 'pending',
}: TransactionFormProps) {
  const sourceAccounts = useMemo(
    () => allAccounts,
    [allAccounts]
  )

  const [peopleState, setPeopleState] = useState<Person[]>(people)

  useEffect(() => {
    setPeopleState(people)
  }, [people])

  const [manualTagMode, setManualTagMode] = useState(() => Boolean(defaultTag || initialValues?.tag));

  const suggestedTags = useMemo(() => {
    const tags = [];
    const today = new Date();
    for (let i = 2; i >= 0; i--) {
      const date = subMonths(today, i);
      tags.push(generateTag(date));
    }
    return [...new Set(tags)];
  }, []);

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

  const refundCategoryId = useMemo(() => {
    const direct = categories.find(cat => cat.id === REFUND_CATEGORY_ID)
    if (direct) return direct.id
    const byName = categories.find(cat => (cat.name ?? '').toLowerCase().includes('refund'))
    return byName?.id ?? REFUND_CATEGORY_ID
  }, [categories])

  const [status, setStatus] = useState<StatusMessage>(null)
  const [cashbackProgress, setCashbackProgress] = useState<CashbackCard | null>(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [spendingStats, setSpendingStats] = useState<AccountSpendingStats | null>(null)
  const [transactionType, setTransactionType] = useState<'expense' | 'income' | 'debt' | 'transfer' | 'repayment'>(defaultType || 'expense')
  const [accountFilter, setAccountFilter] = useState<'all' | 'bank' | 'credit' | 'other'>('all')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isShopDialogOpen, setIsShopDialogOpen] = useState(false)
  const [isPersonDialogOpen, setIsPersonDialogOpen] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [debtEnsureError, setDebtEnsureError] = useState<string | null>(null)
  const [isEnsuringDebt, startEnsuringDebt] = useTransition()
  const isEditMode = mode === 'edit' || (mode !== 'refund' && Boolean(transactionId))
  const isRefundMode = mode === 'refund'
  const isConfirmRefund = isRefundMode && refundAction === 'confirm'
  const [refundStatus, setRefundStatus] = useState<'pending' | 'received'>(
    isConfirmRefund ? 'received' : defaultRefundStatus
  )
  const router = useRouter()

  const baseDefaults = useMemo(
    () => ({
      occurred_at: new Date(),
      type: defaultType ?? (isRefundMode ? 'income' : 'expense'),
      amount: 0,
      note: '',
      tag: defaultTag ?? generateTag(new Date()),
      source_account_id: defaultSourceAccountId ?? undefined,
      person_id: undefined,
      debt_account_id: defaultDebtAccountId ?? undefined,
      category_id: isRefundMode ? refundCategoryId ?? undefined : undefined,
      shop_id: undefined,
      cashback_share_percent: undefined,
      cashback_share_fixed: undefined,
      is_voluntary: false,
    }),
    [defaultDebtAccountId, defaultSourceAccountId, defaultTag, defaultType, isRefundMode, refundCategoryId]
  )

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      ...baseDefaults,
      ...initialValues,
      amount: initialValues?.amount ? Math.abs(initialValues.amount) : 0,
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

  useEffect(() => {
    if (!initialValues) {
      return
    }

    const newValues = {
      ...baseDefaults,
      ...initialValues,
      amount: initialValues.amount ? Math.abs(initialValues.amount) : 0
    };

    const isRepayment = initialValues.category_name?.toLowerCase().includes('thu nợ')
      || initialValues.category_name?.toLowerCase().includes('repayment')
      || (initialValues.type === 'repayment');

    const isDebt = initialValues.type === 'debt' || (initialValues.type as string) === 'lending';
    const isIncomeWithPerson = initialValues.type === 'income' && initialValues.person_id;

    if (isRepayment || (isIncomeWithPerson && !isDebt)) {
      newValues.type = 'repayment';
      const sourceId = newValues.source_account_id;
      const sourceAcc = allAccounts.find(a => a.id === sourceId);

      if (sourceAcc?.type === 'debt') {
        if (newValues.debt_account_id) {
          const temp = newValues.source_account_id;
          newValues.source_account_id = newValues.debt_account_id;
          newValues.debt_account_id = temp;
        }
      }
    }

    form.reset(newValues)
    setManualTagMode(true)
    setTransactionType(newValues.type)
  }, [baseDefaults, form, initialValues, allAccounts])

  useEffect(() => {
    if (!isRefundMode) return
    form.setValue('type', 'income')
    setTransactionType('income')
    form.setValue('category_id', refundCategoryId ?? REFUND_CATEGORY_ID, { shouldValidate: true })
    const currentNote = form.getValues('note')
    if (!currentNote || currentNote.trim().length === 0) {
      const baseNote = initialValues?.note ?? ''
      const nextNote = baseNote ? `Refund: ${baseNote}` : 'Refund'
      form.setValue('note', nextNote)
    }
  }, [form, initialValues?.note, isRefundMode, refundCategoryId])

  async function onSubmit(values: TransactionFormValues) {
    console.log('[Form Submit] Category ID being submitted:', values.category_id);
    console.log('[Form Submit] Full values:', values);
    setStatus(null)
    setIsSubmitting(true)

    try {
      if (isRefundMode) {
        const targetTransactionId = refundTransactionId ?? transactionId
        if (!targetTransactionId) {
          setStatus({ type: 'error', text: 'Missing target transaction to refund.' })
          return
        }

        const maxRefund = typeof refundMaxAmount === 'number' ? Math.abs(refundMaxAmount) : Math.abs(values.amount ?? 0)

        if (Math.abs(values.amount ?? 0) > maxRefund) {
          setStatus({ type: 'error', text: `Refund amount cannot exceed ${numberFormatter.format(maxRefund)}` })
          return
        }

        const safeAmount = Math.abs(values.amount ?? 0)
        if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
          setStatus({ type: 'error', text: 'Please enter a valid refund amount.' })
          return
        }

        const partialFlag = safeAmount < maxRefund

        if (isConfirmRefund) {
          const targetAccountId = values.source_account_id
          if (!targetAccountId || targetAccountId === REFUND_PENDING_ACCOUNT_ID) {
            setStatus({ type: 'error', text: 'Choose the receiving account for this refund.' })
            return
          }
          const confirmResult = await confirmRefund(targetTransactionId, targetAccountId)
          if (!confirmResult.success) {
            setStatus({ type: 'error', text: confirmResult.error ?? 'Unable to confirm refund.' })
            return
          }
          router.refresh()
          setStatus({ type: 'success', text: 'Refund confirmed successfully.' })
          onSuccess?.()
          return
        }

        const requestResult = await requestRefund(targetTransactionId, safeAmount, partialFlag, {
          note: values.note ?? undefined,
          shop_id: values.shop_id ?? undefined,
        })

        if (!requestResult.success) {
          setStatus({ type: 'error', text: requestResult.error ?? 'Unable to create refund request.' })
          return
        }

        if (refundStatus === 'received') {
          const preferredAccount =
            values.source_account_id === REFUND_PENDING_ACCOUNT_ID
              ? defaultSourceAccountId ?? initialValues?.source_account_id ?? null
              : values.source_account_id ?? null

          if (!preferredAccount) {
            setStatus({ type: 'error', text: 'Select where the refunded money was received.' })
            return
          }

          const confirmResult = await confirmRefund(
            requestResult.refundTransactionId ?? '',
            preferredAccount
          )
          if (!confirmResult.success) {
            setStatus({ type: 'error', text: confirmResult.error ?? 'Unable to confirm refund.' })
            return
          }
        }

        router.refresh()
        setStatus({
          type: 'success',
          text: refundStatus === 'received' ? 'Refund confirmed successfully.' : 'Refund request created.',
        })
        onSuccess?.()
        return
      }

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
        shop_id: values.shop_id ?? undefined,
        cashback_share_percent: sanitizedPercent > 0 ? sanitizedPercent : undefined,
        cashback_share_fixed: sanitizedFixed > 0 ? sanitizedFixed : undefined,
        note: values.note ?? '',
        destination_account_id: values.type === 'income' ? values.source_account_id : undefined,
        is_voluntary: values.is_voluntary,
      }

      const result = transactionId
        ? await updateTransaction(transactionId, payload)
        : await createTransaction(payload)

      if (result) {
        router.refresh()
        setStatus({
          type: 'success',
          text: isEditMode ? 'Transaction updated successfully.' : 'Transaction created successfully.',
        })
        if (isEditMode) {
          onSuccess?.()
          return
        }
        form.reset({
          ...baseDefaults,
          occurred_at: new Date(),
          amount: 0,
          note: '',
          tag: defaultTag ?? generateTag(new Date()),
          source_account_id: defaultSourceAccountId ?? undefined,
          category_id: undefined,
          person_id: undefined,
          debt_account_id: defaultDebtAccountId ?? undefined,
          shop_id: undefined,
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const {
    control,
    handleSubmit,
    formState: { errors },
    register,
    watch,
  } = form

  useEffect(() => {
    if (isEditMode) return;

    const currentCategoryId = form.getValues('category_id');

    // Only auto-set category if it's currently empty
    if (transactionType === 'debt' && !currentCategoryId) {
      const peopleShoppingCat = categories.find(c => c.name === 'People Shopping' || c.name === 'Shopping');
      if (peopleShoppingCat) {
        console.log('[Category Auto-Set] Setting category to People Shopping/Shopping for debt type');
        form.setValue('category_id', peopleShoppingCat.id);
      }
      const shopeeShop = shops.find(s => s.name === 'Shopee');
      if (shopeeShop) {
        form.setValue('shop_id', shopeeShop.id);
      }
    } else if (transactionType === 'repayment' && !currentCategoryId) {
      const repaymentCatId = 'e0000000-0000-0000-0000-000000000097';
      if (categories.some(c => c.id === repaymentCatId)) {
        console.log('[Category Auto-Set] Setting category to Repayment for repayment type');
        form.setValue('category_id', repaymentCatId);
      } else {
        const repaymentCat = categories.find(c => c.name === 'Thu nợ người khác' || c.name === 'Repayment');
        if (repaymentCat) {
          console.log('[Category Auto-Set] Setting category to Thu nợ người khác for repayment type');
          form.setValue('category_id', repaymentCat.id);
        }
      }
    }
    // REMOVED: Auto-selection for 'transfer' type to fix incorrect Money Transfer category bug
  }, [transactionType, categories, shops, form, isEditMode]);

  const watchedCategoryId = useWatch({
    control,
    name: 'category_id',
  })

  const watchedAccountId = useWatch({
    control,
    name: 'source_account_id',
  })

  const watchedShopId = useWatch({
    control,
    name: 'shop_id',
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



  const categoryOptions = useMemo(
    () => {
      if (isRefundMode && refundCategoryId) {
        const refundCat =
          categories.find(cat => cat.id === refundCategoryId) ??
          categories.find(cat => (cat.name ?? '').toLowerCase().includes('refund')) ??
          categories.find(cat => (cat.name ?? '').toLowerCase().includes('pending')) ??
          null
        return [
          {
            value: refundCategoryId,
            label: refundCat?.name ?? 'Refund',
            description: refundCat?.type === 'income' ? 'Income' : 'Expense',
            searchValue: refundCat?.name ?? 'Refund',
            icon: refundCat?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={refundCat.image_url}
                alt={refundCat.name}
                className="h-5 w-5 object-contain rounded-none"
              />
            ) : (
              <span className="text-xl">{refundCat?.icon || '📦'}</span>
            ),
          },
        ]
      }

      const targetType = transactionType === 'debt' ? 'expense' : transactionType
      if (targetType !== 'expense' && targetType !== 'income' && targetType !== 'transfer' && targetType !== 'repayment') {
        return []
      }
      return categories
        .filter(cat => cat.type === targetType)
        .map(cat => ({
          value: cat.id,
          label: cat.name,
          description: cat.type === 'expense' ? 'Expense' : 'Income',
          searchValue: `${cat.name} ${cat.type}`,
          icon: cat.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cat.image_url}
              alt={cat.name}
              className="h-5 w-5 object-contain rounded-none"
            />
          ) : (
            <span className="text-xl">{cat.icon || '📦'}</span>
          ),
        }))
    }, [categories, transactionType, isRefundMode, refundCategoryId]
  )

  const debugCategoryClick = useCallback(() => {
    console.log('[Refund Category Debug]', {
      isRefundMode,
      categoryValue: form.getValues('category_id'),
      refundCategoryId,
      categoryOptions,
    })
  }, [categoryOptions, form, isRefundMode, refundCategoryId])



  const accountOptions = useMemo(
    () => {
      let filteredAccounts = sourceAccounts;

      // Filter by type based on accountFilter state
      if (accountFilter !== 'all') {
        filteredAccounts = sourceAccounts.filter(acc => {
          if (accountFilter === 'bank') return acc.type === 'bank';
          if (accountFilter === 'credit') return acc.type === 'credit_card';
          if (accountFilter === 'other') return acc.type !== 'bank' && acc.type !== 'credit_card';
          return true;
        });
      }

      // If category is selected, sort relevant accounts to top (existing logic)
      if (watchedCategoryId) {
        const category = categories.find(c => c.id === watchedCategoryId)
        if (category && category.name) {
          // ... (existing sort logic if needed)
        }
      }

      return filteredAccounts.map(acc => ({
        value: acc.id,
        label: acc.name,
        description: `${acc.type.replace('_', ' ')} - ${numberFormatter.format(acc.current_balance)}`,
        searchValue: `${acc.name} ${acc.type.replace('_', ' ')} ${acc.current_balance}`,
        icon: acc.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={acc.logo_url}
            alt={acc.name}
            className="h-5 w-5 object-contain rounded-none"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-none bg-slate-100 text-[11px] font-semibold text-slate-600">
            {getAccountInitial(acc.name)}
          </span>
        ),
      }))
    },
    [sourceAccounts, watchedCategoryId, categories, transactionType, accountFilter]
  )

  const destinationAccountOptions = useMemo(
    () => {
      let filteredAccounts = allAccounts;
      if (watchedAccountId) {
        filteredAccounts = allAccounts.filter(a => a.id !== watchedAccountId);
      }

      return filteredAccounts.map(acc => ({
        value: acc.id,
        label: acc.name,
        description: `${acc.type.replace('_', ' ')} - ${numberFormatter.format(acc.current_balance)}`,
        searchValue: `${acc.name} ${acc.type.replace('_', ' ')} ${acc.current_balance}`,
        icon: acc.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={acc.logo_url}
            alt={acc.name}
            className="h-5 w-5 object-contain rounded-none"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-none bg-slate-100 text-[11px] font-semibold text-slate-600">
            {getAccountInitial(acc.name)}
          </span>
        ),
      }))
    },
    [allAccounts, watchedAccountId]
  )

  const personOptions = useMemo(
    () =>
      peopleState.map(person => ({
        value: person.id,
        label: person.name,
        description: person.email || 'No email',
        searchValue: `${person.name} ${person.email ?? ''}`.trim(),
        icon: person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt={person.name}
            className="h-5 w-5 object-contain rounded-none"
          />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-none bg-slate-100 text-[11px] font-semibold text-slate-600">
            {getAccountInitial(person.name)}
          </span>
        ),
      })),
    [peopleState]
  )

  const shopOptions = useMemo(
    () =>
      shops.map(shop => ({
        value: shop.id,
        label: shop.name,
        description: 'Shop',
        searchValue: shop.name,
        icon: shop.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.logo_url}
            alt={shop.name}
            className="h-5 w-5 object-contain rounded-none"
          />
        ) : (
          <Store className="h-4 w-4 text-slate-400" />
        ),
      })),
    [shops]
  );

  const selectedAccount = useMemo(
    () => sourceAccounts.find(acc => acc.id === watchedAccountId),
    [sourceAccounts, watchedAccountId]
  )

  useEffect(() => {
    // CRITICAL FIX: Only auto-set category from shop if:
    // 1. Not in edit mode (user is creating new transaction)
    // 2. Category is currently empty (user hasn't selected anything yet)
    // 3. Shop has a default category
    if (isEditMode) return;
    if (!watchedShopId) return;

    const currentCategoryId = form.getValues('category_id');
    if (currentCategoryId) {
      console.log('[Shop Category] User already selected category, not overriding:', currentCategoryId);
      return; // User already selected a category, don't override!
    }

    const shop = shops.find(s => s.id === watchedShopId);
    if (shop?.default_category_id) {
      console.log('[Shop Category] Auto-setting category from shop:', shop.name, shop.default_category_id);
      form.setValue('category_id', shop.default_category_id);
    }
  }, [watchedShopId, shops, form, isEditMode])

  useEffect(() => {
    if (!isRefundMode) return
    if (refundStatus === 'pending') {
      form.setValue('source_account_id', REFUND_PENDING_ACCOUNT_ID, { shouldValidate: true })
      return
    }
    const preferredAccount =
      (watchedAccountId && watchedAccountId !== REFUND_PENDING_ACCOUNT_ID ? watchedAccountId : undefined) ??
      defaultSourceAccountId ??
      initialValues?.source_account_id ??
      sourceAccounts.find(acc => acc.id !== REFUND_PENDING_ACCOUNT_ID)?.id

    if (preferredAccount) {
      form.setValue('source_account_id', preferredAccount, { shouldValidate: true })
    }
  }, [
    defaultSourceAccountId,
    form,
    initialValues?.source_account_id,
    isRefundMode,
    refundStatus,
    sourceAccounts,
    watchedAccountId,
  ])

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
    if (transactionType !== 'debt' && transactionType !== 'repayment') {
      setDebtEnsureError(null)
      return
    }
    if (!watchedPersonId) {
      form.setValue('debt_account_id', undefined)
      setDebtEnsureError(null)
      return
    }
    setDebtEnsureError(null)
    const linkedAccountId = debtAccountByPerson.get(watchedPersonId)
    form.setValue('debt_account_id', linkedAccountId ?? undefined)
  }, [transactionType, watchedPersonId, debtAccountByPerson, form])

  useEffect(() => {
    if (transactionType !== 'expense' && transactionType !== 'debt' && transactionType !== 'repayment') {
      form.setValue('shop_id', undefined)
    }
  }, [transactionType, form])

  useEffect(() => {
    if (isRefundMode) {
      const amt = Math.abs(watchedAmount ?? 0)
      const noteValue = `Refund: ${numberFormatter.format(amt)}`
      form.setValue('note', noteValue)
    }
  }, [form, isRefundMode, watchedAmount])

  useEffect(() => {
    if (isRefundMode) {
      setSpendingStats(null)
      setStatsError(null)
      setStatsLoading(false)
      return
    }

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
    if (watchedCategoryId) {
      params.set('categoryId', watchedCategoryId)
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
  }, [isRefundMode, watchedAccountId, watchedDate, watchedCategoryId])

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
    const rate = spendingStats?.potentialRate ?? cashbackMeta?.rate ?? 0
    if (rate === 0) {
      return 0
    }
    if (typeof watchedAmount !== 'number' || Number.isNaN(watchedAmount)) {
      return 0
    }
    const rawCashback = Math.abs(watchedAmount) * rate
    // Apply category-specific max reward if available
    if (spendingStats?.maxReward && spendingStats.maxReward > 0) {
      return Math.min(rawCashback, spendingStats.maxReward)
    }
    return rawCashback
  }, [cashbackMeta, watchedAmount, spendingStats])

  const amountValue = typeof watchedAmount === 'number' ? Math.abs(watchedAmount) : 0
  const projectedSpend = (spendingStats?.currentSpend ?? 0) + amountValue
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
  const isVoluntary = useWatch({ control, name: 'is_voluntary' })

  const showCashbackInputs =
    (transactionType !== 'income' &&
      transactionType !== 'transfer' &&
      transactionType !== 'repayment' &&
      ((selectedAccount?.type === 'credit_card' && amountValue > 0) || isVoluntary))

  useEffect(() => {
    if (amountValue <= 0) {
      form.setValue('cashback_share_percent', undefined)
      form.setValue('cashback_share_fixed', undefined)
      return
    }
    if (typeof watchedCashbackFixed === 'number' && watchedCashbackFixed > amountValue) {
      form.setValue('cashback_share_fixed', amountValue)
    }
  }, [amountValue, form, watchedCashbackFixed])

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
    if (isEditMode && initialValues?.tag) {
      return
    }
    if (typeof defaultTag === 'string') {
      form.setValue('tag', defaultTag);
      setManualTagMode(true);
    }
  }, [defaultTag, form, initialValues?.tag, isEditMode]);

  useEffect(() => {
    if (isEditMode || isRefundMode) return
    if (defaultType) {
      form.setValue('type', defaultType);
      setTransactionType(defaultType);
    }
  }, [defaultType, form, isEditMode, isRefundMode]);

  useEffect(() => {
    if (isRefundMode) {
      form.setValue('type', 'income')
      setTransactionType('income')
    }
  }, [form, isRefundMode])

  useEffect(() => {
    if (isEditMode && initialValues?.source_account_id) return
    if (defaultSourceAccountId) {
      form.setValue('source_account_id', defaultSourceAccountId)
    }
  }, [defaultSourceAccountId, form, initialValues?.source_account_id, isEditMode])

  useEffect(() => {
    if (isEditMode && initialValues?.debt_account_id) return
    if (defaultDebtAccountId) {
      form.setValue('debt_account_id', defaultDebtAccountId)
    }
  }, [defaultDebtAccountId, form, initialValues?.debt_account_id, isEditMode])

  const debtAccountName = useMemo(() => {
    if (!watchedDebtAccountId) return null
    const account = allAccounts.find(acc => acc.id === watchedDebtAccountId)
    return account?.name ?? null
  }, [watchedDebtAccountId, allAccounts])

  const TypeInput = isRefundMode ? (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Type</label>
      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-slate-700">
        Refund
      </div>
    </div>
  ) : (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Type</label>
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Tabs value={field.value} onValueChange={(value) => { field.onChange(value); setTransactionType(value as 'expense' | 'income' | 'debt' | 'transfer' | 'repayment') }} className="w-full">
            <TabsList className="grid w-full grid-cols-5 gap-1 p-1.5 bg-slate-100/80 rounded-xl">
              <TabsTrigger value="expense" className="data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm rounded-lg flex items-center justify-center gap-1 text-xs font-medium transition-all">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Expense</span>
              </TabsTrigger>
              <TabsTrigger value="income" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm rounded-lg flex items-center justify-center gap-1 text-xs font-medium transition-all">
                <ArrowDownLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Income</span>
              </TabsTrigger>
              <TabsTrigger value="transfer" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm rounded-lg flex items-center justify-center gap-1 text-xs font-medium transition-all">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Transfer</span>
              </TabsTrigger>
              <TabsTrigger value="debt" className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm rounded-lg flex items-center justify-center gap-1 text-xs font-medium transition-all">
                <Wallet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lending</span>
              </TabsTrigger>
              <TabsTrigger value="repayment" className="data-[state=active]:bg-white data-[state=active]:text-lime-600 data-[state=active]:shadow-sm rounded-lg flex items-center justify-center gap-1 text-xs font-medium transition-all">
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Repay</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      />
      {errors.type && (
        <p className="text-sm text-red-600">{errors.type.message}</p>
      )}
    </div>
  )

  const RefundStatusInput = isRefundMode ? (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Refund Status</label>
      <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm font-semibold text-slate-600">
        <button
          type="button"
          className={`rounded-md px-3 py-1 transition ${refundStatus === 'received' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            }`}
          onClick={() => setRefundStatus('received')}
        >
          Received (Instant)
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1 transition ${refundStatus === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
            } ${isConfirmRefund ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={() => {
            if (isConfirmRefund) return
            setRefundStatus('pending')
          }}
          disabled={isConfirmRefund}
        >
          Pending (Wait)
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {refundStatus === 'pending'
          ? 'Money will stay in the system account until you confirm it.'
          : 'Use the receiving account to mark the refund as received.'}
      </p>
    </div>
  ) : null

  const CategoryInput =
    transactionType !== 'repayment' &&
      (transactionType === 'expense' ||
        transactionType === 'debt' ||
        transactionType === 'transfer' ||
        transactionType === 'income' ||
        isRefundMode) ? (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-500" />
          Category {transactionType === 'transfer' ? '(Optional)' : ''}
        </label>
        <Controller
          control={control}
          name="category_id"
          render={({ field }) => (
            <div onClick={debugCategoryClick}>
              <Combobox
                value={field.value}
                onValueChange={field.onChange}
                items={categoryOptions}
                placeholder="Select category"
                inputPlaceholder="Search category..."
                emptyState="No matching category"
                disabled={false} // Explicitly allow selecting category in refund modal
                className="h-11"
              />
            </div>
          )}
        />
        {errors.category_id && (
          <p className="text-sm text-red-600">{errors.category_id.message}</p>
        )}
      </div>
    ) : null

  const debtAccountForRepayment = useMemo(() => {
    if (transactionType !== 'repayment' || !watchedDebtAccountId) return null;
    return allAccounts.find(acc => acc.id === watchedDebtAccountId) ?? null;
  }, [transactionType, watchedDebtAccountId, allAccounts]);

  const ShopInput =
    transactionType === 'expense' ||
      transactionType === 'debt' ||
      transactionType === 'repayment' ||
      (isEditMode && transactionType !== 'income' && transactionType !== 'transfer') ? (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Store className="h-4 w-4 text-slate-500" />
          Shop
        </label>
        <Controller
          control={control}
          name="shop_id"
          render={({ field }) => (
            <Combobox
              value={field.value}
              onValueChange={field.onChange}
              items={shopOptions}
              placeholder={
                debtAccountForRepayment && !field.value ? (
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-none bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {getAccountInitial(debtAccountForRepayment.name)}
                    </span>
                    <span>To: {debtAccountForRepayment.name}</span>
                  </span>
                ) : (
                  'Select shop'
                )
              }
              inputPlaceholder="Search shop..."
              emptyState="No shops yet"
              className="h-11"
            />
          )}
        />
      </div>
    ) : null

  const PersonInput = (transactionType === 'debt' || transactionType === 'repayment' || (transactionType === 'income' && !isRefundMode)) ? (
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
              className="h-11"
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
  ) : null

  const DestinationAccountInput = (transactionType === 'transfer') ? (
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
              className="h-11"
            />
          )}
        />
        {errors.debt_account_id && (
          <p className="text-sm text-red-600">{errors.debt_account_id.message}</p>
        )}
      </div>
    </div>
  ) : null

  const DateInput = (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-500" />
        Date
      </label>
      <Controller
        control={control}
        name="occurred_at"
        render={({ field }) => (
          <input
            type="date"
            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
            onChange={event => {
              const dateStr = event.target.value
              if (!dateStr) {
                field.onChange(undefined)
                return
              }
              // Create date from input (local midnight)
              const [y, m, d] = dateStr.split('-').map(Number)
              const date = new Date(y, m - 1, d)

              // Add current time to avoid 00:00 UTC -> 07:00 VN issue
              const now = new Date()
              date.setHours(now.getHours(), now.getMinutes(), now.getSeconds())

              field.onChange(date)
            }}
            className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        )}
      />
      {errors.occurred_at && (
        <p className="text-sm text-red-600">{errors.occurred_at.message}</p>
      )}
      {transactionType !== 'debt' && transactionType !== 'repayment' && <p className="text-xs text-gray-500 pt-1">Cycle Tag: <span className="font-semibold">{watch('tag')}</span></p>}
    </div>
  )

  const TagInput = (transactionType === 'debt' || transactionType === 'repayment') ? (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-500" />
          Tag
        </label>
        <div className="flex items-center gap-2">
          {suggestedTags.slice(0, 1).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                form.setValue('tag', tag, { shouldValidate: true });
                setManualTagMode(true);
              }}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors border",
                watch('tag') === tag
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              {tag}
            </button>
          ))}
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => {
              const currentDate = watchedDate || new Date();
              const previousMonth = subMonths(currentDate, 1);
              const previousTag = generateTag(previousMonth);
              form.setValue('tag', previousTag, { shouldValidate: true });
              setManualTagMode(true);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              form.setValue('tag', generateTag(new Date()), { shouldValidate: true });
              setManualTagMode(true);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
            title="Reset to Current"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>
      <Controller
        control={control}
        name="tag"
        render={({ field }) => (
          <input
            {...field}
            value={field.value || ''}
            onChange={(e) => {
              field.onChange(e.target.value);
              if (e.target.value) {
                setManualTagMode(true);
              }
            }}
            className="h-11 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Enter tag (e.g., NOV25)"
          />
        )}
      />
      {errors.tag && (
        <p className="text-sm text-red-600">{errors.tag.message}</p>
      )}
    </div>
  ) : null

  const SourceAccountInput = (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-slate-500" />
          <span>
            {isRefundMode
              ? refundStatus === 'pending'
                ? 'Holding Account'
                : 'Receiving Account'
              : transactionType === 'income' || transactionType === 'repayment'
                ? 'To Account'
                : transactionType === 'transfer'
                  ? 'Source of Funds'
                  : 'From Account'}
          </span>
        </label>
        <Controller
          control={control}
          name="source_account_id"
          render={({ field }) => (
            <Combobox
              items={accountOptions}
              value={field.value}
              onValueChange={field.onChange}
              placeholder={isRefundMode && refundStatus === 'pending' ? 'System Account' : 'Select account'}
              inputPlaceholder="Search account..."
              emptyState="No account found"
              disabled={isRefundMode && refundStatus === 'pending'}
              className="h-11"
              tabs={[
                { value: 'all', label: 'All', active: accountFilter === 'all', onClick: () => setAccountFilter('all') },
                { value: 'bank', label: 'Bank', active: accountFilter === 'bank', onClick: () => setAccountFilter('bank') },
                { value: 'credit', label: 'Credit', active: accountFilter === 'credit', onClick: () => setAccountFilter('credit') },
                { value: 'other', label: 'Others', active: accountFilter === 'other', onClick: () => setAccountFilter('other') },
              ]}
            // No onAddNew for accounts as it's complex
            />
          )}
        />
        {errors.source_account_id && (
          <p className="text-sm text-red-600">{errors.source_account_id.message}</p>
        )}
      </div>
    </div>
  )

  const AmountInput = (
    <div className="space-y-3">
      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <SmartAmountInput
            value={field.value}
            onChange={field.onChange}
            disabled={isConfirmRefund}
            placeholder="0"
            error={errors.amount?.message}
          />
        )}
      />
      {progressLoading && (
        <p className="text-xs text-slate-400">Loading cashback history...</p>
      )}
      {progressError && (
        <p className="text-xs text-rose-600">{progressError}</p>
      )}
    </div>
  )

  const NoteInput = (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-500" />
        Note
      </label>
      <textarea
        {...register('note')}
        placeholder="Add a note..."
        className="min-h-[60px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {errors.note && (
        <p className="text-sm text-red-600">{errors.note.message}</p>
      )}
    </div>
  )

  const CashbackInputs = showCashbackInputs ? (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-900 flex items-center gap-2">
          <Percent className="h-4 w-4 text-blue-500" />
          Cashback Details
        </h4>
        {spendingStats && spendingStats.cycle && (
          <span className="text-xs text-slate-500">
            Cycle: {spendingStats.cycle.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">% Back</label>
          <Controller
            control={control}
            name="cashback_share_percent"
            render={({ field }) => (
              <SmartAmountInput
                value={field.value}
                onChange={field.onChange}
                disabled={budgetMaxed}
                className="w-full"
                placeholder="Enter percentage"
              />
            )}
          />
          {rateLimitPercent !== null && (
            <p className="text-xs text-slate-500">
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
              <SmartAmountInput
                value={field.value}
                onChange={val => {
                  if (val === undefined) {
                    field.onChange(undefined)
                    return
                  }
                  const clamped = amountValue > 0 ? Math.min(val, amountValue) : val
                  field.onChange(clamped)
                }}
                disabled={budgetMaxed}
                placeholder="Enter fixed amount"
                label="Fixed Amount"
                className="w-full"
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
      <div className="border-t border-indigo-200/80 pt-2 text-slate-500 space-y-1">
        <p className="text-xs">
          <span className="font-semibold text-slate-700">Cycle:</span> {selectedCycleLabel ?? 'N/A'}
        </p>

        {/* Smart Hint Display */}
        {spendingStats && spendingStats.matchReason && (
          <p className="text-xs">
            <span className="font-semibold text-slate-700">Applied Rate:</span>{' '}
            <span className="text-emerald-600 font-bold">
              {((spendingStats.potentialRate ?? spendingStats.rate) * 100).toFixed(2)}%
            </span>
            {' '}({spendingStats.matchReason})
          </p>
        )}
        {spendingStats && spendingStats.maxReward && spendingStats.maxReward > 0 && (
          <p className="text-xs">
            <span className="font-semibold text-slate-700">Max Reward (Category):</span>{' '}
            <span className="text-blue-600 font-bold">
              {numberFormatter.format(spendingStats.maxReward)}đ
            </span>
          </p>
        )}
        {potentialCashback > 0 && (
          <p className="text-xs">
            <span className="font-semibold text-slate-700">Estimated Cashback:</span>{' '}
            <span className="text-emerald-600 font-bold">
              {numberFormatter.format(potentialCashback)}
            </span>
          </p>
        )}

        {statsLoading && <p>Loading min spend...</p>}
        {statsError && <p className="text-rose-600">{statsError}</p>}
        {spendingStats && spendingStats.minSpend && spendingStats.minSpend > 0 && (
          <p>
            <span className="font-semibold text-slate-700">Min Spend:</span>
            {projectedSpend >= spendingStats.minSpend ? (
              <span className="text-emerald-600"> Met ({numberFormatter.format(projectedSpend)} / {numberFormatter.format(spendingStats.minSpend)})</span>
            ) : (
              <span className="text-amber-600"> Pending ({numberFormatter.format(projectedSpend)} / {numberFormatter.format(spendingStats.minSpend)})</span>
            )}
          </p>
        )}
        {spendingStats && spendingStats.maxCashback && spendingStats.maxCashback > 0 && (
          <p>
            <span className="font-semibold text-slate-700">Budget:</span>
            {numberFormatter.format(spendingStats.maxCashback - spendingStats.earnedSoFar)} remaining
          </p>
        )}
      </div>
    </div>
  ) : null;

  const showVoluntaryToggle =
    (transactionType === 'expense' || transactionType === 'debt') &&
    selectedAccount &&
    (selectedAccount.type !== 'credit_card' || !selectedAccount.cashback_config)

  const VoluntaryCashbackInput = showVoluntaryToggle ? (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 bg-slate-50">
      <div className="space-y-0.5">
        <label htmlFor="is_voluntary" className="text-sm font-medium text-slate-900">
          Voluntary Cashback
        </label>
        <p className="text-xs text-slate-500">
          Enable to track cashback without creating a debt record.
        </p>
      </div>
      <Controller
        control={control}
        name="is_voluntary"
        render={({ field }) => (
          <Switch
            checked={field.value ?? false}
            onCheckedChange={field.onChange}
          />
        )}
      />
    </div>
  ) : null;

  const submitLabel = isSubmitting
    ? 'Saving...'
    : isRefundMode
      ? refundStatus === 'received'
        ? 'Confirm Refund'
        : 'Request Refund'
      : isEditMode
        ? 'Update Transaction'
        : 'Add Transaction'

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Refund Status (Full Width) */}
        {RefundStatusInput}

        {/* Type Selection (Full Width) - Sticky */}
        <div className="sticky top-0 z-10 bg-white pb-4 pt-2 -mt-2">
          {TypeInput}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {(transactionType === 'debt' || transactionType === 'repayment') ? (
            <>
              {/* LENDING MODE: Person First */}
              <div className="col-span-2">
                {PersonInput}
              </div>

              {/* Date & Tag */}
              <div className="col-span-1">
                {DateInput}
              </div>
              <div className="col-span-1">
                {TagInput}
              </div>

              {/* From Account & Amount (Side-by-Side) */}
              <div className="col-span-1">
                {SourceAccountInput}
              </div>
              <div className="col-span-1">
                {AmountInput}
              </div>

              {/* Category & Shop */}
              {transactionType !== 'repayment' && (
                <div className="col-span-1">
                  {CategoryInput}
                </div>
              )}
              <div className={transactionType === 'repayment' ? "col-span-2" : "col-span-1"}>
                {ShopInput}
              </div>
            </>
          ) : (
            <>
              {/* OTHER MODES */}
              <div className="col-span-2">
                {DateInput}
              </div>

              {transactionType === 'transfer' ? (
                <>
                  <div className="col-span-1">
                    {SourceAccountInput}
                  </div>
                  <div className="col-span-1">
                    {DestinationAccountInput}
                  </div>
                  <div className="col-span-1">
                    {CategoryInput}
                  </div>
                  <div className="col-span-1">
                    {AmountInput}
                  </div>
                </>
              ) : transactionType === 'income' ? (
                <>
                  <div className="col-span-1">
                    {CategoryInput}
                  </div>
                  <div className="col-span-1">
                    {SourceAccountInput}
                  </div>
                  <div className="col-span-1">
                    {AmountInput}
                  </div>
                  <div className="col-span-1">
                    {PersonInput}
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-1">
                    {CategoryInput}
                  </div>
                  <div className="col-span-1">
                    {ShopInput}
                  </div>
                  <div className="col-span-1">
                    {SourceAccountInput}
                  </div>
                  <div className="col-span-1">
                    {AmountInput}
                  </div>
                  <div className="col-span-2">
                    {PersonInput}
                  </div>
                </>
              )}
            </>
          )}

          {/* Common Bottom Section */}
          <div className="col-span-2 space-y-4 pt-2 border-t border-slate-100">
            {VoluntaryCashbackInput}
            {CashbackInputs}
            {NoteInput}
          </div>
        </div>

        {status && (
          <p className={`text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {status.text}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitLabel}
        </button>
      </form>

      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onSuccess={() => {
          // Ideally we should refresh categories or select the new one
          // But for now just closing is fine, the parent might refresh
        }}
        defaultType={transactionType === 'income' ? 'income' : 'expense'}
      />

      <AddShopDialog
        open={isShopDialogOpen}
        onOpenChange={setIsShopDialogOpen}
        categories={categories}
      />

      <CreatePersonDialog
        open={isPersonDialogOpen}
        onOpenChange={setIsPersonDialogOpen}
        subscriptions={[]}
      />
    </>
  )
}
