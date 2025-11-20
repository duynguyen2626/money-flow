'use client'

import { FormEvent, MouseEvent, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { parseCashbackConfig, CashbackCycleType } from '@/lib/cashback'
import { Account } from '@/types/moneyflow.types'
import { updateAccountConfigAction } from '@/actions/account-actions'
import type { Json } from '@/types/database.types'

type EditAccountDialogProps = {
  account: Account
}

type StatusMessage = {
  text: string
  variant: 'success' | 'error'
} | null

const toNumericString = (value: number | null | undefined) =>
  typeof value === 'number' ? String(value) : ''

export function EditAccountDialog({ account }: EditAccountDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<StatusMessage>(null)
  const [isPending, startTransition] = useTransition()

  const parsedConfig = useMemo(
    () => parseCashbackConfig(account.cashback_config),
    [account.cashback_config]
  )

  const [name, setName] = useState(account.name)
  const [creditLimit, setCreditLimit] = useState(toNumericString(account.credit_limit))
  const [rate, setRate] = useState(String(parsedConfig.rate))
  const [maxAmount, setMaxAmount] = useState(toNumericString(parsedConfig.maxAmount))
  const [minSpend, setMinSpend] = useState(toNumericString(parsedConfig.minSpend))
  const [cycleType, setCycleType] = useState<CashbackCycleType>(parsedConfig.cycleType)
  const [statementDay, setStatementDay] = useState(toNumericString(parsedConfig.statementDay))

  const isCreditCard = account.type === 'credit_card'

  const resetForm = () => {
    const freshConfig = parseCashbackConfig(account.cashback_config)
    setName(account.name)
    setCreditLimit(toNumericString(account.credit_limit))
    setRate(String(freshConfig.rate))
    setMaxAmount(toNumericString(freshConfig.maxAmount))
    setMinSpend(toNumericString(freshConfig.minSpend))
    setCycleType(freshConfig.cycleType)
    setStatementDay(toNumericString(freshConfig.statementDay))
    setStatus(null)
  }

  const closeDialog = () => setOpen(false)

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const openDialog = () => {
    resetForm()
    setOpen(true)
  }

  const parseOptionalNumber = (value: string) => {
    const trimmed = value.trim()
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
      setStatus({ text: 'Tên tài khoản không được để trống.', variant: 'error' })
      return
    }

    const nextCreditLimit = parseOptionalNumber(creditLimit)

    const rateValue = parseOptionalNumber(rate) ?? 0
    const configPayload: Json | undefined = isCreditCard
      ? {
          rate: rateValue,
          maxAmount: parseOptionalNumber(maxAmount),
          minSpend: parseOptionalNumber(minSpend),
          cycleType,
          statementDay: cycleType === 'statement_cycle'
            ? parseStatementDayValue(statementDay)
            : null,
        }
      : undefined

    startTransition(async () => {
      setStatus(null)
      const success = await updateAccountConfigAction({
        id: account.id,
        name: trimmedName,
        creditLimit: nextCreditLimit,
        cashbackConfig: configPayload,
      })

      if (!success) {
        setStatus({ text: 'Không thể cập nhật tài khoản. Vui lòng thử lại.', variant: 'error' })
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
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        onClick={openDialog}
      >
        Cấu hình
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit account configuration"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
            onClick={stopPropagation}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Sửa tài khoản</h2>
              <button
                type="button"
                className="rounded p-1 text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                onClick={closeDialog}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">Tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Tên tài khoản"
                />
              </div>
              {isCreditCard && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">Credit limit</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={creditLimit}
                    onChange={event => setCreditLimit(event.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Credit limit"
                  />
                </div>
              )}
              {isCreditCard && (
                <fieldset className="rounded-lg border border-slate-200 p-4">
                  <legend className="px-2 text-sm font-semibold text-slate-600">
                    Cấu hình hoàn tiền
                  </legend>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Rate (%)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={rate ? (parseFloat(rate) * 100).toString() : ''}
                        onChange={event => {
                          const val = parseFloat(event.target.value);
                          setRate(isNaN(val) ? '0' : (val / 100).toString());
                        }}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="10"
                      />
                      <p className="text-xs text-slate-500">Nhập số nguyên (VD: Nhập 10 là 10%)</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Max Amount</label>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={maxAmount}
                        onChange={event => setMaxAmount(event.target.value)}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Ví dụ: 100000"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Min Spend</label>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={minSpend}
                        onChange={event => setMinSpend(event.target.value)}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Ví dụ: 500000"
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
              {status && (
                <p
                  className={`text-sm ${
                    status.variant === 'error' ? 'text-red-600' : 'text-green-600'
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
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
