'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

import { SubscriptionPayload } from '@/services/subscription.service'
import { Account, Person, Subscription } from '@/types/moneyflow.types'

import { getServiceBranding } from './service-branding'

function formatPreview(template: string, serviceName: string, price: number, memberCount: number) {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear())
  const safePrice = Math.max(0, Math.round(price))
  return template
    .replace('{name}', serviceName)
    .replace('{date}', `${month}-${year}`)
    .replace('{month}', month)
    .replace('{year}', year)
    .replace('{price}', String(safePrice))
    .replace('{members}', String(memberCount))
    .replace('{member}', String(memberCount))
}

type SubscriptionFormProps = {
  mode: 'create' | 'edit'
  people: Person[]
  accounts: Account[]
  initialData?: Subscription
  submitLabel?: string
  onCancel?: () => void
  onSubmit: (payload: SubscriptionPayload) => Promise<void> | void
}

type MemberSelection = {
  profile_id: string
  fixed_amount?: number | null
}

function roundThousand(value: number) {
  return Math.max(0, Math.floor(value / 1000) * 1000)
}

function distributeEvenly(profileIds: string[], price: number): MemberSelection[] {
  if (price <= 0 || profileIds.length === 0) {
    return profileIds.map(id => ({ profile_id: id, fixed_amount: 0 }))
  }
  const base = roundThousand(price / profileIds.length)
  let remaining = price
  const shares = profileIds.map((id, index) => {
    const isLast = index === profileIds.length - 1
    const amount = isLast ? Math.max(0, remaining) : base
    remaining = Math.max(0, remaining - amount)
    return { profile_id: id, fixed_amount: amount }
  })
  return shares
}

function clampShares(members: MemberSelection[], price: number): MemberSelection[] {
  if (price <= 0 || members.length === 0) {
    return members.map(m => ({ ...m, fixed_amount: 0 }))
  }
  const total = members.reduce((sum, m) => sum + Math.max(0, Number(m.fixed_amount ?? 0)), 0)
  if (total <= price) {
    return members
  }
  const factor = price / total
  let remaining = price
  const scaled = members.map((m, index) => {
    const raw = Math.max(0, Number(m.fixed_amount ?? 0))
    const scaledValue = roundThousand(raw * factor)
    const isLast = index === members.length - 1
    const amount = isLast ? Math.max(0, remaining) : scaledValue
    remaining = Math.max(0, remaining - amount)
    return { ...m, fixed_amount: amount }
  })
  return scaled
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function pickInitialDate(value?: string | null) {
  if (value) {
    return value.slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

function getInitialMembers(subscription?: Subscription): MemberSelection[] {
  return (
    subscription?.members?.map(member => ({
      profile_id: member.profile_id,
      fixed_amount: member.fixed_amount ?? 0,
    })) ?? []
  )
}

export function SubscriptionForm({
  mode,
  people,
  accounts,
  initialData,
  submitLabel,
  onCancel,
  onSubmit,
}: SubscriptionFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [priceInput, setPriceInput] = useState(
    typeof initialData?.price === 'number' ? String(initialData.price) : ''
  )
  const [nextBillingDate, setNextBillingDate] = useState(
    pickInitialDate(initialData?.next_billing_date)
  )
  const defaultTemplate = 'Auto: {name} {date}'
  const [noteTemplate, setNoteTemplate] = useState(initialData?.note_template ?? defaultTemplate)
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true)
  const [members, setMembers] = useState<MemberSelection[]>(getInitialMembers(initialData))
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const paymentAccount = useMemo(
    () => accounts.find(acc => acc.id === initialData?.payment_account_id) ?? null,
    [accounts, initialData?.payment_account_id]
  )
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(
    paymentAccount?.id ?? null
  )

  const priceNumber = useMemo(() => {
    const parsed = Number(priceInput)
    return Number.isFinite(parsed) ? parsed : 0
  }, [priceInput])

  const totalMemberShare = useMemo(
    () =>
      members.reduce(
        (sum, member) => sum + Math.max(0, Number(member.fixed_amount ?? 0)),
        0
      ),
    [members]
  )
  const ownerShare = Math.max(0, priceNumber - totalMemberShare)
  const overBudget = totalMemberShare > priceNumber

  const brand = getServiceBranding(name || initialData?.name || 'SV')

  const toggleMember = (profile_id: string) => {
    setMembers(prev => {
      const exists = prev.some(member => member.profile_id === profile_id)
      const nextIds = exists
        ? prev.filter(m => m.profile_id !== profile_id).map(m => m.profile_id)
        : [...prev.map(m => m.profile_id), profile_id]
      return distributeEvenly(nextIds, priceNumber)
    })
  }

  const updateShare = (profile_id: string, value: string) => {
    const parsed = Number(value)
    setMembers(prev => {
      const next = prev.map(member =>
        member.profile_id === profile_id
          ? {
              ...member,
              fixed_amount: Number.isFinite(parsed) ? parsed : 0,
            }
          : member
      )
      return clampShares(next, priceNumber)
    })
  }

  useEffect(() => {
    setMembers(prev => clampShares(prev, priceNumber))
  }, [priceNumber])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setStatus({
        type: 'error',
        text: 'Nhap ten dich vu truoc khi luu.',
      })
      return
    }
    setIsSaving(true)
    setStatus(null)

    try {
      await onSubmit({
        name: trimmedName,
        price: Number.isFinite(priceNumber) ? priceNumber : null,
        next_billing_date: nextBillingDate || null,
        payment_account_id: paymentAccountId,
        is_active: isActive,
        note_template: noteTemplate.trim() || null,
        members,
      })
      setStatus({
        type: 'success',
        text: mode === 'create' ? 'Da tao dich vu.' : 'Da cap nhat dich vu.',
      })
    } catch (error) {
      console.error('Failed to submit subscription form', error)
      setStatus({
        type: 'error',
        text: 'Khong the luu dich vu. Thu lai nhe.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ring-4 ${brand.bg} ${brand.text} ${brand.ring}`}
            >
              {brand.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase text-slate-500">Dich vu</span>
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Vi du: YouTube Premium"
                className="w-full border-b border-dashed border-slate-200 text-base font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <label className="space-y-1 text-sm">
            <span className="text-slate-600">Mẫu nội dung giao dịch</span>
            <input
              value={noteTemplate}
              onChange={event => setNoteTemplate(event.target.value)}
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={defaultTemplate}
            />
            <span className="text-xs text-slate-500">
              Dùng các từ khóa: {`{name}`}, {`{date}`} (MM-YYYY), {`{price}`}, {`{members}`}.
            </span>
            <span className="text-[11px] text-slate-600">
              Ví dụ: {formatPreview(
                noteTemplate || defaultTemplate,
                name || initialData?.name || 'Service',
                priceNumber,
                members.length
              )}
            </span>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
              {['{name}', '{date}', '{price}', '{members}'].map(token => (
                <button
                  key={token}
                  type="button"
                  onClick={() => setNoteTemplate(prev => `${prev} ${token}`.trim())}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 hover:bg-slate-100"
                  title="Chèn từ khóa"
                >
                  {token}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setNoteTemplate(defaultTemplate)}
                className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700 hover:bg-blue-100"
              >
                Reset
              </button>
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Tong chi phi</span>
              <input
                value={priceInput}
                onChange={event => setPriceInput(event.target.value)}
                type="number"
                min={0}
                step="any"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="200000"
              />
              <span className="text-xs text-slate-500">So tien auto debit hang ky.</span>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Ngay nhac thu</span>
              <input
                value={nextBillingDate}
                onChange={event => setNextBillingDate(event.target.value)}
                type="date"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className="text-xs text-slate-500">Bot se chay vao ngay nay.</span>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Tai khoan thanh toan</span>
              <select
                value={paymentAccountId ?? ''}
                onChange={event => setPaymentAccountId(event.target.value || null)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Mac dinh (chon lon nhat)</option>
                {accounts
                  .filter(acc => acc.type !== 'debt')
                  .map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
              </select>
              <span className="text-xs text-slate-500">Chon nguon thanh toan cho bot.</span>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">Trang thai</p>
              <p className="text-xs text-slate-500">Chi dich vu Active moi duoc quet.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={event => setIsActive(event.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-slate-700">{isActive ? 'Active' : 'Tam dung'}</span>
            </label>
          </div>

          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-600">
            <p>Chu tai khoan se chiu: {formatMoney(ownerShare)}</p>
            {overBudget && (
              <p className="text-xs text-rose-600">
                Tong phan chia lon hon tong bill. Giam share hoac tang gia dich vu.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Members chia bill</p>
              <p className="text-xs text-slate-500">
                Chia theo fixed amount. Phan con lai tinh vao owner.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {members.length} thanh vien
            </span>
          </div>

          <div className="space-y-2">
            {people.length === 0 ? (
              <p className="text-sm text-slate-500">Chua co thanh vien nao.</p>
            ) : (
              people.map(person => {
                const selected = members.find(member => member.profile_id === person.id)
                return (
                  <div
                    key={person.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      {person.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={person.avatar_url}
                          alt={person.name}
                          className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{person.name}</span>
                        <span className="text-[11px] text-slate-500">
                          {selected ? 'Dang chia' : 'Chua chon'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
                        placeholder="0"
                        min={0}
                        step="any"
                        disabled={!selected}
                        value={selected?.fixed_amount ?? ''}
                        onChange={event => updateShare(person.id, event.target.value)}
                      />
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600"
                        checked={Boolean(selected)}
                        onChange={() => toggleMember(person.id)}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Da chia</span>
              <span className="font-semibold">{formatMoney(totalMemberShare)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Bill</span>
              <span>{formatMoney(priceNumber)}</span>
            </div>
          </div>
        </div>
      </div>

      {status && (
        <p className={`text-sm ${status.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
          {status.text}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Huy
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Dang luu...' : submitLabel ?? (mode === 'create' ? 'Tao dich vu' : 'Cap nhat')}
        </button>
      </div>
    </form>
  )
}
