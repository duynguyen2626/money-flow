'use client'

import { FormEvent, MouseEvent, ReactNode, useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { parseCashbackConfig, CashbackCycleType } from '@/lib/cashback'
import { getSharedLimitParentId } from '@/lib/account-utils'
import { Account } from '@/types/moneyflow.types'
import { updateAccountConfigAction } from '@/actions/account-actions'
import type { Json } from '@/types/database.types'

type EditAccountDialogProps = {
  account: Account
  collateralAccounts?: Account[]
  accounts?: Account[]
  triggerContent?: ReactNode
  buttonClassName?: string
  onOpen?: () => void
}

type StatusMessage = {
  text: string
  variant: 'success' | 'error'
} | null

const toNumericString = (value: number | null | undefined) =>
  typeof value === 'number' ? String(value) : ''

const formatWithSeparators = (value: string) => {
  const digits = value.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

const ASSET_TYPES: Account['type'][] = ['savings', 'investment', 'asset']

type SavingsConfig = {
  interestRate: number | null
  termMonths: number | null
  maturityDate: string | null
}

function parseSavingsConfig(raw: Json | null | undefined): SavingsConfig {
  if (!raw) {
    return { interestRate: null, termMonths: null, maturityDate: null }
  }

  let parsed: Record<string, unknown> | null = null
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  } else if (typeof raw === 'object') {
    parsed = raw as Record<string, unknown>
  }

  if (!parsed) {
    return { interestRate: null, termMonths: null, maturityDate: null }
  }

  const parseNumber = (value: unknown) => {
    const asNumber = Number(value)
    return Number.isFinite(asNumber) ? asNumber : null
  }

  return {
    interestRate: parseNumber(parsed.interestRate),
    termMonths: parseNumber(parsed.termMonths ?? parsed.term),
    maturityDate: typeof parsed.maturityDate === 'string' ? parsed.maturityDate : null,
  }
}

export function EditAccountDialog({ account, collateralAccounts, accounts = [], triggerContent, buttonClassName, onOpen }: EditAccountDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<StatusMessage>(null)
  const [isPending, startTransition] = useTransition()

  const parsedCashbackConfig = useMemo(
    () => parseCashbackConfig(account.cashback_config),
    [account.cashback_config]
  )
  const parsedSavingsConfig = useMemo(
    () => parseSavingsConfig(account.cashback_config),
    [account.cashback_config]
  )

  const [name, setName] = useState(account.name)
  const [accountType, setAccountType] = useState<Account['type']>(account.type)
  const [securedByAccountId, setSecuredByAccountId] = useState(account.secured_by_account_id ?? '')
  const [isSecured, setIsSecured] = useState(Boolean(account.secured_by_account_id))
  const [creditLimit, setCreditLimit] = useState(formatWithSeparators(toNumericString(account.credit_limit)))
  const [logoUrl, setLogoUrl] = useState(account.logo_url ?? '')
  const [rate, setRate] = useState(String(parsedCashbackConfig.rate))
  const [maxAmount, setMaxAmount] = useState(formatWithSeparators(toNumericString(parsedCashbackConfig.maxAmount)))
  const [minSpend, setMinSpend] = useState(formatWithSeparators(toNumericString(parsedCashbackConfig.minSpend)))
  const [cycleType, setCycleType] = useState<CashbackCycleType>(parsedCashbackConfig.cycleType)
  const [statementDay, setStatementDay] = useState(toNumericString(parsedCashbackConfig.statementDay))
  const [interestRate, setInterestRate] = useState(toNumericString(parsedSavingsConfig.interestRate))
  const [termMonths, setTermMonths] = useState(toNumericString(parsedSavingsConfig.termMonths))
  const [maturityDate, setMaturityDate] = useState(parsedSavingsConfig.maturityDate ?? '')
  const [parentAccountId, setParentAccountId] = useState(getSharedLimitParentId(account.cashback_config) ?? '')

  const isCreditCard = accountType === 'credit_card'
  const isAssetAccount = ASSET_TYPES.includes(accountType)
  const collateralOptions = useMemo(
    () =>
      (collateralAccounts ?? []).filter(
        candidate => candidate.id !== account.id && ASSET_TYPES.includes(candidate.type)
      ),
    [collateralAccounts, account.id]
  )
  const accountTypeOptions = useMemo(
    () => [
      { value: 'bank', label: 'Bank account' },
      { value: 'cash', label: 'Cash' },
      { value: 'credit_card', label: 'Credit card' },
      { value: 'ewallet', label: 'E-wallet' },
      { value: 'debt', label: 'Debt / People' },
      { value: 'savings', label: 'Savings' },
      { value: 'investment', label: 'Investment' },
      { value: 'asset', label: 'Secured asset' },
    ],
    []
  )

  const resetForm = () => {
    const freshCashback = parseCashbackConfig(account.cashback_config)
    const freshSavings = parseSavingsConfig(account.cashback_config)
    setName(account.name)
    setAccountType(account.type)
    setSecuredByAccountId(account.secured_by_account_id ?? '')
    setIsSecured(Boolean(account.secured_by_account_id))
    setCreditLimit(formatWithSeparators(toNumericString(account.credit_limit)))
    setRate(String(freshCashback.rate))
    setMaxAmount(formatWithSeparators(toNumericString(freshCashback.maxAmount)))
    setMinSpend(formatWithSeparators(toNumericString(freshCashback.minSpend)))
    setCycleType(freshCashback.cycleType)
    setStatementDay(toNumericString(freshCashback.statementDay))
    setInterestRate(toNumericString(freshSavings.interestRate))
    setTermMonths(toNumericString(freshSavings.termMonths))
    setMaturityDate(freshSavings.maturityDate ?? '')
    setLogoUrl(account.logo_url ?? '')
    setParentAccountId(getSharedLimitParentId(account.cashback_config) ?? '')
    setStatus(null)
  }

  const closeDialog = () => setOpen(false)

  const stopPropagation = (event?: MouseEvent<HTMLDivElement>) => {
    event?.stopPropagation()
  }

  const openDialog = () => {
    onOpen?.()
    resetForm()
    setOpen(true)
  }

  // Smart Parent Suggestion
  useEffect(() => {
    if (!isCreditCard || parentAccountId || !name) return

    const normalizedName = name.toLowerCase()

    // Find a potential parent
    const suggestion = accounts.find(acc => {
      if (acc.id === account.id) return false
      if (acc.type !== 'credit_card') return false

      const accName = acc.name.toLowerCase()
      // Check if current name contains parent name (e.g. "VIB Super Card (Phụ)" contains "VIB Super Card")
      // And parent name is reasonably long to avoid false positives with short names
      return normalizedName.includes(accName) && accName.length > 3
    })

    if (suggestion) {
      setParentAccountId(suggestion.id)
    }
  }, [name, isCreditCard, parentAccountId, accounts, account.id])

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setStatus({ text: 'Account name cannot be empty.', variant: 'error' })
      return
    }

    const nextCreditLimit = isCreditCard ? parseOptionalNumber(creditLimit) : null
    const cleanedLogoUrl = logoUrl.trim() || null

    const rateValue = parseOptionalNumber(rate) ?? 0
    let configPayload: Json | undefined
    if (isCreditCard) {
      configPayload = {
        rate: rateValue,
        maxAmount: parseOptionalNumber(maxAmount),
        minSpend: parseOptionalNumber(minSpend),
        cycleType,
        statementDay: cycleType === 'statement_cycle'
          ? parseStatementDayValue(statementDay)
          : null,
        parentAccountId: parentAccountId || null,
      }
    } else if (isAssetAccount) {
      configPayload = {
        interestRate: parseOptionalNumber(interestRate),
        termMonths: parseOptionalNumber(termMonths),
        maturityDate: maturityDate.trim() || null,
      }
    }

    const securedBy = isCreditCard && isSecured ? (securedByAccountId || null) : null

    startTransition(async () => {
      setStatus(null)
      const success = await updateAccountConfigAction({
        id: account.id,
        name: trimmedName,
        creditLimit: nextCreditLimit,
        cashbackConfig: configPayload,
        type: accountType,
        securedByAccountId: securedBy,
        logoUrl: cleanedLogoUrl,
      })

      if (!success) {
        setStatus({ text: 'Could not update account. Please try again.', variant: 'error' })
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        className={
          buttonClassName ??
          (triggerContent
            ? 'inline-flex items-center justify-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50'
            : 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600')
        }
        onClick={event => {
          event.stopPropagation()
          onOpen?.()
          openDialog()
        }}
      >
        {triggerContent ?? 'Settings'}
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit account configuration"
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
            onClick={closeDialog}
          >
            <div
              className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
              onClick={stopPropagation}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Edit account</h2>
                <button
                  type="button"
                  className="rounded p-1 text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  onClick={closeDialog}
                  aria-label="Close dialog"
                >
                  ?
                </button>
              </div>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Account name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">Logo URL</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={event => setLogoUrl(event.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="https://logo.example.com/bank.png"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">Account type</label>
                  <select
                    value={accountType}
                    onChange={event => {
                      const nextType = event.target.value as Account['type']
                      setAccountType(nextType)
                      if (nextType !== 'credit_card') {
                        setSecuredByAccountId('')
                      }
                    }}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {accountTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isCreditCard && (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Credit limit</label>
                      <input
                        type="text"
                        value={creditLimit}
                        onChange={event => setCreditLimit(formatWithSeparators(event.target.value))}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Credit limit"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Parent Account (Shared Limit)</label>
                      <select
                        value={parentAccountId}
                        onChange={event => setParentAccountId(event.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">None (Primary Card)</option>
                        {accounts
                          .filter(acc => acc.type === 'credit_card' && acc.id !== account.id)
                          .map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-slate-500">
                        If this is a supplementary card, select the primary card here.
                      </p>
                    </div>

                    {collateralOptions.length > 0 && (
                      <div className="space-y-2 rounded-md border border-slate-200 p-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={isSecured}
                            onChange={event => {
                              const next = event.target.checked
                              setIsSecured(next)
                              if (!next) setSecuredByAccountId('')
                            }}
                          />
                          Secured (collateral)
                        </label>
                        {isSecured && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">Secured by</label>
                            <select
                              value={securedByAccountId}
                              onChange={event => setSecuredByAccountId(event.target.value)}
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
                              Choose a savings/investment account as collateral for this card.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {isCreditCard && (
                  <fieldset className="rounded-lg border border-slate-200 p-4">
                    <legend className="px-2 text-sm font-semibold text-slate-600">
                      Cashback configuration
                    </legend>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">Rate (%)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          value={rate ? (parseFloat(rate) * 100).toString() : ''}
                          onChange={event => {
                            const val = parseFloat(event.target.value)
                            setRate(isNaN(val) ? '0' : (val / 100).toString())
                          }}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="10"
                        />
                        <p className="text-xs text-slate-500">Enter integer (e.g. 10 for 10%)</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">Max amount</label>
                        <input
                          type="text"
                          value={maxAmount}
                          onChange={event => setMaxAmount(formatWithSeparators(event.target.value))}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Ex: 100000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">Min spend</label>
                        <input
                          type="text"
                          value={minSpend}
                          onChange={event => setMinSpend(formatWithSeparators(event.target.value))}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Ex: 500000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">Cycle type</label>
                        <select
                          value={cycleType}
                          onChange={event => setCycleType(event.target.value as CashbackCycleType)}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="calendar_month">Calendar month</option>
                          <option value="statement_cycle">Statement cycle</option>
                        </select>
                      </div>
                      {cycleType === 'statement_cycle' && (
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-600">Statement day</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            step="1"
                            value={statementDay}
                            onChange={event => setStatementDay(event.target.value)}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Day of month"
                          />
                        </div>
                      )}
                    </div>
                  </fieldset>
                )}
                {isAssetAccount && (
                  <fieldset className="rounded-lg border border-slate-200 p-4">
                    <legend className="px-2 text-sm font-semibold text-slate-600">Interest info</legend>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">Interest rate (%)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={interestRate}
                          onChange={event => setInterestRate(event.target.value)}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Ex: 7.2"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">Term (months)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={termMonths}
                          onChange={event => setTermMonths(event.target.value)}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Ex: 12"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">Maturity date</label>
                        <input
                          type="date"
                          value={maturityDate}
                          onChange={event => setMaturityDate(event.target.value)}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    </div>
                  </fieldset>
                )}
                {status && (
                  <p
                    className={`text-sm ${status.variant === 'error' ? 'text-red-600' : 'text-green-600'
                      }`}
                  >
                    {status.text}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    onClick={closeDialog}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
