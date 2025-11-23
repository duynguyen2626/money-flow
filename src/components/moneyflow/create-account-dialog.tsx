"use client"

import { FormEvent, useState, useTransition } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createAccount } from '@/actions/account-actions'
import { CashbackCycleType } from '@/lib/cashback'
import { Account } from '@/types/moneyflow.types'
import type { Json } from '@/types/database.types'

type TabValue = 'bank' | 'credit' | 'saving' | 'other'
type SavingSubtype = 'savings' | 'investment' | 'asset'
type OtherSubtype = 'cash' | 'ewallet'

type StatusMessage = { text: string; variant: 'success' | 'error' } | null

type CreateAccountDialogProps = {
  collateralAccounts?: Account[]
}

const TAB_OPTIONS: { value: TabValue; label: string }[] = [
  { value: 'bank', label: '🏦 Payment' },
  { value: 'credit', label: '💳 Credit Card' },
  { value: 'saving', label: '💰 Savings / Invest' },
  { value: 'other', label: '📦 Others' },
]

const SAVING_TYPE_OPTIONS: { value: SavingSubtype; label: string }[] = [
  { value: 'savings', label: 'Savings account' },
  { value: 'investment', label: 'Investment account' },
  { value: 'asset', label: 'Secured asset' },
]

const OTHER_TYPE_OPTIONS: { value: OtherSubtype; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'ewallet', label: 'E-wallet' },
]

const formatDecimalInput = (value: string) => {
  if (!value) {
    return ''
  }

  const withoutCommas = value.replace(/,/g, '')
  if (withoutCommas === '.') {
    return '0.'
  }

  const sanitized = withoutCommas.replace(/[^0-9.]/g, '')
  if (!sanitized) {
    return ''
  }

  const [rawInteger, ...fractionalParts] = sanitized.split('.')
  const integerDigits = (rawInteger.replace(/[^0-9]/g, '') || '0').replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ',',
  )
  const fraction = fractionalParts.join('').replace(/[^0-9]/g, '')

  if (fractionalParts.length) {
    return `${integerDigits}.${fraction}`
  }

  return integerDigits
}

const parseDecimalValue = (value: string) => {
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized || normalized === '.' || normalized === '-' || normalized === '-.') {
    return null
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const parseStatementDayValue = (value: string) => {
  const parsed = parseDecimalValue(value)
  if (parsed === null) {
    return null
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 31)
}

const clearZeroValue = (value: string, setter: (next: string) => void) => {
  if (parseDecimalValue(value) === 0) {
    setter('')
  }
}

type SharedFieldsProps = {
  name: string
  onNameChange: (value: string) => void
  imgUrl: string
  onImgUrlChange: (value: string) => void
  initialBalance: string
  onBalanceChange: (value: string) => void
  onBalanceFocus: () => void
}

function SharedFields({
  name,
  onNameChange,
  imgUrl,
  onImgUrlChange,
  initialBalance,
  onBalanceChange,
  onBalanceFocus,
}: SharedFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-600">Name *</label>
        <input
          type="text"
          value={name}
          onChange={event => onNameChange(event.target.value)}
          placeholder="Account name"
          required
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-600">Image URL</label>
        <input
          type="url"
          value={imgUrl}
          onChange={event => onImgUrlChange(event.target.value)}
          placeholder="https://logo.example.com/bank.png"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        {imgUrl && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>Preview:</span>
            <img
              src={imgUrl}
              alt="Logo preview"
              className="h-10 w-10 rounded-md border border-slate-200 object-contain"
              loading="lazy"
            />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-600">Initial Balance</label>
        <input
          type="text"
          value={initialBalance}
          onChange={event => onBalanceChange(event.target.value)}
          onFocus={onBalanceFocus}
          placeholder="0.00"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <p className="text-xs text-slate-500">
          Currency is fixed to VND. Decimal separators make large amounts easier to read.
        </p>
      </div>
    </div>
  )
}

export function CreateAccountDialog({ collateralAccounts = [] }: CreateAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<StatusMessage>(null)
  const [isPending, startTransition] = useTransition()
  const [tabValue, setTabValue] = useState<TabValue>('bank')
  const [savingSubtype, setSavingSubtype] = useState<SavingSubtype>('savings')
  const [otherSubtype, setOtherSubtype] = useState<OtherSubtype>('cash')
  const [name, setName] = useState('')
  const [imgUrl, setImgUrl] = useState('')
  const [initialBalance, setInitialBalance] = useState('0.00')
  const [creditLimit, setCreditLimit] = useState('')
  const [isSecured, setIsSecured] = useState(false)
  const [securedByAccountId, setSecuredByAccountId] = useState('')
  const [ratePercent, setRatePercent] = useState('0')
  const [maxAmount, setMaxAmount] = useState('')
  const [minSpend, setMinSpend] = useState('')
  const [cycleType, setCycleType] = useState<CashbackCycleType>('calendar_month')
  const [statementDay, setStatementDay] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [termMonths, setTermMonths] = useState('')
  const [maturityDate, setMaturityDate] = useState('')

  const handleBalanceChange = (value: string) => setInitialBalance(formatDecimalInput(value))
  const handleCreditLimitChange = (value: string) => setCreditLimit(formatDecimalInput(value))
  const handleMaxAmountChange = (value: string) => setMaxAmount(formatDecimalInput(value))
  const handleMinSpendChange = (value: string) => setMinSpend(formatDecimalInput(value))
  const handleBalanceFocus = () => clearZeroValue(initialBalance, setInitialBalance)
  const handleCreditLimitFocus = () => clearZeroValue(creditLimit, setCreditLimit)
  const handleMaxAmountFocus = () => clearZeroValue(maxAmount, setMaxAmount)
  const handleMinSpendFocus = () => clearZeroValue(minSpend, setMinSpend)

  const selectedType: Account['type'] = (() => {
    if (tabValue === 'credit') return 'credit_card'
    if (tabValue === 'saving') return savingSubtype
    if (tabValue === 'other') return otherSubtype
    return 'bank'
  })()

  const resetForm = () => {
    setTabValue('bank')
    setSavingSubtype('savings')
    setOtherSubtype('cash')
    setName('')
    setImgUrl('')
    setInitialBalance('0.00')
    setCreditLimit('')
    setIsSecured(false)
    setSecuredByAccountId('')
    setRatePercent('0')
    setMaxAmount('')
    setMinSpend('')
    setCycleType('calendar_month')
    setStatementDay('')
    setInterestRate('')
    setTermMonths('')
    setMaturityDate('')
    setStatus(null)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    setOpen(nextOpen)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setStatus({ text: 'Account name cannot be empty.', variant: 'error' })
      return
    }

    startTransition(async () => {
      setStatus(null)
      const balanceValue = parseDecimalValue(initialBalance) ?? 0
      const nextCreditLimit = selectedType === 'credit_card' ? parseDecimalValue(creditLimit) : null
      const cleanedImgUrl = imgUrl.trim() || null

      let configPayload: Json | null = null
      if (selectedType === 'credit_card') {
        const rateValue = parseDecimalValue(ratePercent) ?? 0
        configPayload = {
          rate: rateValue ? rateValue / 100 : 0,
          maxAmount: parseDecimalValue(maxAmount),
          minSpend: parseDecimalValue(minSpend),
          cycleType,
          statementDay: cycleType === 'statement_cycle' ? parseStatementDayValue(statementDay) : null,
        }
      } else if (['savings', 'investment', 'asset'].includes(selectedType)) {
        configPayload = {
          interestRate: parseDecimalValue(interestRate),
          termMonths: parseDecimalValue(termMonths),
          maturityDate: maturityDate.trim() || null,
        }
      }

      const securedBy = selectedType === 'credit_card' && isSecured ? securedByAccountId || null : null

      const result = await createAccount({
        name: trimmedName,
        balance: balanceValue,
        type: selectedType,
        creditLimit: selectedType === 'credit_card' ? nextCreditLimit : null,
        cashbackConfig: configPayload,
        securedByAccountId: securedBy,
        imgUrl: cleanedImgUrl,
      })

      if ('error' in result && result.error) {
        setStatus({ text: 'Unable to create account. Please try again.', variant: 'error' })
        return
      }

      handleDialogOpenChange(false)
    })
  }

  const creditHasCollateralOptions = collateralAccounts.length > 0

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button>Add New Account</Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Pick an account type below and fill out the details to get started.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs value={tabValue} onValueChange={setTabValue} className="space-y-4">
            <TabsList className="grid grid-cols-4 gap-2">
              {TAB_OPTIONS.map(option => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="whitespace-nowrap"
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="bank">
              <div className="space-y-4">
                <SharedFields
                  name={name}
                  onNameChange={setName}
                  imgUrl={imgUrl}
                  onImgUrlChange={setImgUrl}
                  initialBalance={initialBalance}
                  onBalanceChange={handleBalanceChange}
                  onBalanceFocus={handleBalanceFocus}
                />
                <p className="text-sm text-slate-500">
                  Use this tab for bank accounts, cash, or any payment providers that do not need extra metadata.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="credit">
              <div className="space-y-4">
                <SharedFields
                  name={name}
                  onNameChange={setName}
                  imgUrl={imgUrl}
                  onImgUrlChange={setImgUrl}
                  initialBalance={initialBalance}
                  onBalanceChange={handleBalanceChange}
                  onBalanceFocus={handleBalanceFocus}
                />
                <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-600">Credit limit</label>
                    <input
                      type="text"
                      value={creditLimit}
                      onChange={event => handleCreditLimitChange(event.target.value)}
                      onFocus={handleCreditLimitFocus}
                      placeholder="0"
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        className={`h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${
                          !creditHasCollateralOptions ? 'cursor-not-allowed opacity-60' : ''
                        }`}
                        checked={isSecured}
                        disabled={!creditHasCollateralOptions}
                        onChange={event => {
                          const next = event.target.checked
                          setIsSecured(next)
                          if (!next) {
                            setSecuredByAccountId('')
                          }
                        }}
                      />
                      Secured (collateral)
                    </label>
                    {!creditHasCollateralOptions && (
                      <p className="text-xs text-slate-500">
                        Add a savings or investment account before linking collateral.
                      </p>
                    )}
                    {isSecured && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">Secured by</label>
                        <select
                          value={securedByAccountId}
                          onChange={event => setSecuredByAccountId(event.target.value)}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="">None</option>
                          {collateralAccounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-600">Cashback configuration</legend>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={ratePercent}
                        onChange={event => setRatePercent(event.target.value)}
                        placeholder="10"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <p className="text-xs text-slate-500">Example: enter 10 for 10% cashback.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Max amount</label>
                      <input
                        type="text"
                        value={maxAmount}
                        onChange={event => handleMaxAmountChange(event.target.value)}
                        onFocus={handleMaxAmountFocus}
                        placeholder="0"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Min spend</label>
                      <input
                        type="text"
                        value={minSpend}
                        onChange={event => handleMinSpendChange(event.target.value)}
                        onFocus={handleMinSpendFocus}
                        placeholder="0"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                          placeholder="Day of month"
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                    )}
                  </div>
                </fieldset>
              </div>
            </TabsContent>

            <TabsContent value="saving">
              <div className="space-y-4">
                <SharedFields
                  name={name}
                  onNameChange={setName}
                  imgUrl={imgUrl}
                  onImgUrlChange={setImgUrl}
                  initialBalance={initialBalance}
                  onBalanceChange={handleBalanceChange}
                  onBalanceFocus={handleBalanceFocus}
                />
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-600">Account subtype</label>
                  <select
                    value={savingSubtype}
                    onChange={event => setSavingSubtype(event.target.value as SavingSubtype)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {SAVING_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
                  <legend className="px-1 text-sm font-semibold text-slate-600">Interest information</legend>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Interest rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={interestRate}
                        onChange={event => setInterestRate(event.target.value)}
                        placeholder="7.2"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Term (months)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={termMonths}
                        onChange={event => setTermMonths(event.target.value)}
                        placeholder="12"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
              </div>
            </TabsContent>

            <TabsContent value="other">
              <div className="space-y-4">
                <SharedFields
                  name={name}
                  onNameChange={setName}
                  imgUrl={imgUrl}
                  onImgUrlChange={setImgUrl}
                  initialBalance={initialBalance}
                  onBalanceChange={handleBalanceChange}
                  onBalanceFocus={handleBalanceFocus}
                />
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-600">Account subtype</label>
                  <div className="flex flex-wrap gap-2">
                    {OTHER_TYPE_OPTIONS.map(option => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${otherSubtype === option.value ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        <input
                          type="radio"
                          name="otherType"
                          value={option.value}
                          checked={otherSubtype === option.value}
                          onChange={() => setOtherSubtype(option.value)}
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Choose cash for on-hand money or e-wallet for digital balances.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {status && (
            <p className={`text-sm ${status.variant === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {status.text}
            </p>
          )}

          <DialogFooter className="pt-0">
            <Button type="button" variant="ghost" onClick={() => handleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
