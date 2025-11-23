"use client"

import { useEffect, useMemo, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createAccount } from '@/actions/account-actions'
import { Account } from '@/types/moneyflow.types'

const ASSET_TYPES: Account['type'][] = ['savings', 'investment', 'asset']

const ACCOUNT_TABS: { value: AccountTab; label: string; helper: string }[] = [
  { value: 'bank', label: '🏦 Payment', helper: 'Bank accounts for daily spending' },
  { value: 'credit', label: '💳 Credit Card', helper: 'Track limits, statements & cashback' },
  { value: 'saving', label: '💰 Savings', helper: 'Term deposits and investment accounts' },
  { value: 'other', label: '📦 Others', helper: 'Cash, e-wallets or miscellaneous funds' },
]

type AccountTab = 'bank' | 'credit' | 'saving' | 'other'
const SAVING_VARIANTS: { value: Account['type']; label: string }[] = [
  { value: 'savings', label: 'Savings' },
  { value: 'investment', label: 'Investment' },
  { value: 'asset', label: 'Secured Asset' },
]

const OTHER_VARIANTS: { value: Account['type']; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'ewallet', label: 'E-wallet' },
]

type StatusMessage =
  | { text: string; variant: 'success' | 'error' }
  | null

const formSchema = z.object({
  name: z.string().min(1, { message: 'Account name is required' }),
  imgUrl: z.string().optional(),
  initialBalance: z.number(),
  creditLimit: z.number().nullable().optional(),
  isSecured: z.boolean(),
  securedByAccountId: z.string().optional(),
  otherSubtype: z.enum(['cash', 'ewallet']),
  savingType: z.enum(['savings', 'investment', 'asset']),
  interestRate: z.number().nullable().optional(),
  termMonths: z.number().nullable().optional(),
  maturityDate: z.string().nullable().optional(),
  cashbackRate: z.number().nonnegative(),
  cashbackMaxAmount: z.number().nullable().optional(),
  cashbackMinSpend: z.number().nullable().optional(),
  cashbackCycleType: z.enum(['calendar_month', 'statement_cycle']),
  cashbackStatementDay: z.number().nullable().optional(),
})

type CreateAccountFormValues = z.infer<typeof formSchema>

const DEFAULT_FORM_VALUES: CreateAccountFormValues = {
  name: '',
  imgUrl: '',
  initialBalance: 0,
  creditLimit: null,
  isSecured: false,
  securedByAccountId: '',
  otherSubtype: 'cash',
  savingType: 'savings',
  interestRate: null,
  termMonths: null,
  maturityDate: '',
  cashbackRate: 0,
  cashbackMaxAmount: null,
  cashbackMinSpend: null,
  cashbackCycleType: 'calendar_month',
  cashbackStatementDay: null,
}

const formatWithSeparators = (value: string) => {
  const digits = value.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim().replace(/,/g, '')
  if (trimmed === '') {
    return null
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

const parseStatementDayValue = (value: string) => {
  const parsed = parseOptionalNumber(value)
  if (parsed === null) {
    return null
  }
  const normalized = Math.min(Math.max(Math.floor(parsed), 1), 31)
  return normalized
}

const toNumericString = (value: number | null | undefined) =>
  typeof value === 'number' ? String(value) : ''

type CreateAccountDialogProps = {
  collateralAccounts?: Account[]
}

export function CreateAccountDialog({ collateralAccounts = [] }: CreateAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<AccountTab>('bank')
  const router = useRouter()
  const [status, setStatus] = useState<StatusMessage>(null)

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const watchedIsSecured = watch('isSecured')
  const watchedOtherSubtype = watch('otherSubtype')
  const watchedSavingType = watch('savingType')
  const cashbackCycleType = watch('cashbackCycleType')
  const logoUrl = watch('imgUrl')

  const collateralOptions = useMemo(
    () => collateralAccounts.filter(acc => ASSET_TYPES.includes(acc.type)),
    [collateralAccounts]
  )

  useEffect(() => {
    if (!watchedIsSecured) {
      setValue('securedByAccountId', '')
    }
  }, [setValue, watchedIsSecured])

  const handleTabChange = (nextTab: AccountTab) => {
    setActiveTab(nextTab)
    if (nextTab !== 'credit') {
      setValue('isSecured', false)
      setValue('securedByAccountId', '')
    }
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset(DEFAULT_FORM_VALUES)
      setActiveTab('bank')
      setStatus(null)
    }
    setOpen(nextOpen)
  }

  const resolveAccountType = (): Account['type'] => {
    switch (activeTab) {
      case 'bank':
        return 'bank'
      case 'credit':
        return 'credit_card'
      case 'saving':
        return watchedSavingType
      case 'other':
        return watchedOtherSubtype
    }
  }

  const isCreditCard = activeTab === 'credit'
  const isSavingVariant = activeTab === 'saving'

  const onSubmit: SubmitHandler<CreateAccountFormValues> = async values => {
    const trimmedName = values.name.trim()
    if (!trimmedName) {
      return
    }
    setStatus(null)

    const finalType = resolveAccountType()
    const creditLimitPayload = isCreditCard ? values.creditLimit ?? null : null
    const securedBy =
      isCreditCard && values.isSecured && values.securedByAccountId
        ? values.securedByAccountId
        : null

    let configPayload: Record<string, unknown> | undefined
    if (isCreditCard) {
      configPayload = {
        rate: values.cashbackRate ?? 0,
        maxAmount: values.cashbackMaxAmount ?? null,
        minSpend: values.cashbackMinSpend ?? null,
        cycleType: values.cashbackCycleType,
        statementDay:
          values.cashbackCycleType === 'statement_cycle'
            ? values.cashbackStatementDay
            : null,
      }
    } else if (isSavingVariant) {
      configPayload = {
        interestRate: values.interestRate ?? null,
        termMonths: values.termMonths ?? null,
        maturityDate: values.maturityDate?.trim() || null,
      }
    }

    try {
      const result = await createAccount({
        name: trimmedName,
        balance: values.initialBalance ?? 0,
        type: finalType,
        creditLimit: creditLimitPayload,
        cashbackConfig: configPayload,
        securedByAccountId: securedBy,
        imgUrl: values.imgUrl?.trim() || null,
      })

      if (result?.error) {
        setStatus({ text: result.error, variant: 'error' })
        console.error('Error creating account:', result.error)
        return
      }

      reset(DEFAULT_FORM_VALUES)
      setActiveTab('bank')
      setOpen(false)
      router.refresh()
    } catch (error) {
      setStatus({ text: 'Unable to create the account. Please try again.', variant: 'error' })
      console.error('Error creating account:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button>Add New Account</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>Smart creation workflow for every account type.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-3">
          <TabsList className="grid w-full grid-cols-4 gap-2 rounded-full bg-slate-100 p-1 text-[13px] font-semibold text-slate-600">
            {ACCOUNT_TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="rounded-full">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="mt-2 text-xs text-slate-500">
          {ACCOUNT_TABS.find(tab => tab.value === activeTab)?.helper}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Basics</p>

            {activeTab === 'saving' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Savings & invest category
                </p>
                <div className="flex flex-wrap gap-2">
                  {SAVING_VARIANTS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setValue('savingType', option.value)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                        watchedSavingType === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'other' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account type</p>
                <div className="flex flex-wrap gap-2">
                  {OTHER_VARIANTS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setValue('otherSubtype', option.value)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                        watchedOtherSubtype === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">
                Account name <abbr title="Required">*</abbr>
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="My bank account"
              />
              {errors.name && (
                <p className="text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Image URL (logo)</label>
              <input
                type="url"
                {...register('imgUrl')}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="https://example.com/logo.png"
              />
              {logoUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200 bg-white">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="h-full w-full object-contain"
                      onError={event => {
                        const target = event.currentTarget
                        target.style.display = 'none'
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">Preview of the logo URL</p>
                </div>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Initial balance</label>
                <Controller
                  control={control}
                  name="initialBalance"
                  render={({ field }) => (
                    <input
                      type="text"
                      value={formatWithSeparators(String(field.value ?? ''))}
                      onChange={event => {
                        const parsed = parseOptionalNumber(event.target.value)
                        field.onChange(parsed ?? 0)
                      }}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="0"
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Currency</label>
                <input
                  type="text"
                  readOnly
                  value="VND"
                  className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600 shadow-sm"
                />
                <p className="text-xs text-slate-500">
                  VND is currently the default currency for new accounts.
                </p>
              </div>
            </div>
          </div>

          {activeTab === 'credit' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Credit limit</label>
                <Controller
                  control={control}
                  name="creditLimit"
                  render={({ field }) => (
                    <input
                      type="text"
                      value={formatWithSeparators(toNumericString(field.value))}
                      onChange={event => field.onChange(parseOptionalNumber(event.target.value))}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Credit limit"
                    />
                  )}
                />
              </div>

              <div className="space-y-3 rounded-md border border-slate-200 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    {...register('isSecured')}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Secured (collateral)
                </label>
                {watchedIsSecured && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Secured by</label>
                    <select
                      {...register('securedByAccountId')}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">None</option>
                      {collateralOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">
                      Pick a savings or investment account as collateral for this card.
                    </p>
                  </div>
                )}
              </div>

              <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
                <legend className="px-2 text-sm font-semibold text-slate-600">Cashback configuration</legend>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Rate (%)</label>
                    <Controller
                      control={control}
                      name="cashbackRate"
                      render={({ field }) => {
                        const displayValue =
                          field.value != null ? (field.value * 100).toString() : ''
                        return (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={displayValue}
                            onChange={event => {
                              const parsed = parseFloat(event.target.value)
                              field.onChange(isNaN(parsed) ? 0 : parsed / 100)
                            }}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="10"
                          />
                        )
                      }}
                    />
                    <p className="text-xs text-slate-500">Enter the percentage (like 10 for 10%).</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Max amount</label>
                      <Controller
                        control={control}
                        name="cashbackMaxAmount"
                        render={({ field }) => (
                          <input
                            type="text"
                            value={formatWithSeparators(toNumericString(field.value))}
                            onChange={event => field.onChange(parseOptionalNumber(event.target.value))}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="e.g. 100000"
                          />
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Min spend</label>
                      <Controller
                        control={control}
                        name="cashbackMinSpend"
                        render={({ field }) => (
                          <input
                            type="text"
                            value={formatWithSeparators(toNumericString(field.value))}
                            onChange={event => field.onChange(parseOptionalNumber(event.target.value))}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="e.g. 500000"
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Cycle type</label>
                    <select
                      {...register('cashbackCycleType')}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="calendar_month">Calendar month</option>
                      <option value="statement_cycle">Statement cycle</option>
                    </select>
                  </div>

                  {cashbackCycleType === 'statement_cycle' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Statement day</label>
                      <Controller
                        control={control}
                        name="cashbackStatementDay"
                        render={({ field }) => (
                          <input
                            type="number"
                            min="1"
                            max="31"
                            step="1"
                            value={field.value ?? ''}
                            onChange={event => {
                              const normalized = parseStatementDayValue(event.target.value)
                              field.onChange(normalized)
                            }}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Day of month"
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              </fieldset>
            </>
          )}

          {activeTab === 'saving' && (
            <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
              <legend className="px-2 text-sm font-semibold text-slate-600">
                Interest information
              </legend>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Account category</label>
                  <select
                    {...register('savingType')}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="savings">Savings</option>
                    <option value="investment">Investment</option>
                    <option value="asset">Secured asset</option>
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Interest rate (%)</label>
                    <Controller
                      control={control}
                      name="interestRate"
                      render={({ field }) => (
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={field.value ?? ''}
                          onChange={event => {
                            const parsed = parseOptionalNumber(event.target.value)
                            field.onChange(parsed)
                          }}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="e.g. 7.2"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Term (months)</label>
                    <Controller
                      control={control}
                      name="termMonths"
                      render={({ field }) => (
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={field.value ?? ''}
                          onChange={event => {
                            const parsed = parseOptionalNumber(event.target.value)
                            field.onChange(parsed)
                          }}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="e.g. 12"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Maturity date</label>
                  <input
                    type="date"
                    {...register('maturityDate')}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </fieldset>
          )}

          {status && (
            <p
              className={`text-sm ${
                status.variant === 'error' ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {status.text}
            </p>
          )}

          <DialogFooter className="border-t-0">
            <Button type="submit" disabled={isSubmitting}>
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
