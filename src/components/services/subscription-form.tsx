'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ShoppingBag } from 'lucide-react'

import { Combobox } from '@/components/ui/combobox'
import { SubscriptionPayload } from '@/services/subscription.service'
import { Account, Person, Shop, Subscription } from '@/types/moneyflow.types'

import { getServiceBranding } from './service-branding'

function formatPreview(template: string, serviceName: string, price: number, memberCount: number) {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear())
  const safePrice = Math.max(0, Math.round(price))
  return template
    .replace('{name}', serviceName)
    .replace('{date}', `${month}-${year}`)
    .replace('{member}', String(memberCount))
}

type MemberSelection = {
  profile_id: string
  fixed_amount?: number | null
  slots: number
}

type SubscriptionFormProps = {
  mode: 'create' | 'edit'
  people: Person[]
  accounts: Account[]
  shops: Shop[]
  initialData?: Subscription
  submitLabel?: string
  focusProfileId?: string
  onCancel?: () => void
  onSubmit: (payload: SubscriptionPayload) => Promise<void> | void
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
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
      slots: member.slots ?? 1,
    })) ?? []
  )
}

export function SubscriptionForm({
  mode,
  people,
  accounts,
  shops,
  initialData,
  submitLabel,
  focusProfileId,
  onCancel,
  onSubmit,
}: SubscriptionFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [shopId, setShopId] = useState<string | null>(initialData?.shop_id ?? null)
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
  const [memberToAdd, setMemberToAdd] = useState<string | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const paymentAccount = useMemo(
    () => accounts.find(acc => acc.id === initialData?.payment_account_id) ?? null,
    [accounts, initialData?.payment_account_id]
  )
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(
    paymentAccount?.id ?? null
  )

  const shopItems = useMemo(
    () =>
      shops.map(shop => ({
        value: shop.id,
        label: shop.name,
        icon: shop.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shop.logo_url} alt="" className="h-5 w-5 object-contain" />
        ) : (
          <ShoppingBag className="h-4 w-4 text-slate-400" />
        ),
      })),
    [shops]
  )

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setShopId(initialData.shop_id ?? null)
      setPriceInput(typeof initialData.price === 'number' ? String(initialData.price) : '')
      setNextBillingDate(pickInitialDate(initialData.next_billing_date))
      setNoteTemplate(initialData.note_template ?? defaultTemplate)
      setIsActive(initialData.is_active ?? true)
      setPaymentAccountId(initialData.payment_account_id ?? null)
      setMembers(getInitialMembers(initialData))
    }
  }, [initialData, defaultTemplate])

  useEffect(() => {
    if (shopId) {
      const selectedShop = shops.find(s => s.id === shopId)
      if (selectedShop && !name) {
        setName(selectedShop.name)
      }
    }
  }, [shopId, shops, name])

  const priceNumber = useMemo(() => {
    const parsed = Number(priceInput)
    return Number.isFinite(parsed) ? parsed : 0
  }, [priceInput])

  // Calculate shares based on slots
  const totalSlots = useMemo(() => {
    // Assuming owner also has slots? 
    // If owner is not in members list, we assume owner pays the remainder.
    // If "Me" is in members list, we count their slots.
    return members.reduce((sum, m) => sum + m.slots, 0)
  }, [members])

  const unitCost = totalSlots > 0 ? priceNumber / totalSlots : 0

  const totalAllocated = useMemo(() => {
    return members.reduce((sum, m) => sum + (unitCost * m.slots), 0)
  }, [members, unitCost])

  const ownerShare = Math.max(0, priceNumber - totalAllocated)

  // If "Me" is in members, ownerShare might be 0 because "Me" is allocated via slots.
  // But visually we might want to show "My Cost" which is OwnerShare + (Me's Slot Cost).
  // For now, let's just show Owner Share (Remainder).

  const brand = getServiceBranding(name || initialData?.name || 'SV')
  const availablePeople = useMemo(
    () => people.filter(person => !members.some(member => member.profile_id === person.id)),
    [people, members]
  )
  const addablePeopleItems = useMemo(
    () =>
      availablePeople.map(person => ({
        value: person.id,
        label: person.name,
        description: person.email ?? 'Select to add',
        icon: person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt={person.name}
            className="h-6 w-6 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
            {person.name.charAt(0).toUpperCase()}
          </div>
        ),
      })),
    [availablePeople]
  )
  const handleAddMember = (profile_id?: string) => {
    if (!profile_id) {
      setMemberToAdd(undefined)
      return
    }
    setMembers(prev => [...prev, { profile_id, slots: 1 }])
    setMemberToAdd(undefined)
  }
  const removeMember = (profile_id: string) => {
    setMembers(prev => prev.filter(member => member.profile_id !== profile_id))
  }

  const updateSlots = (profile_id: string, value: string) => {
    const parsed = parseInt(value, 10)
    const newSlots = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0

    setMembers(prev => {
      if (newSlots === 0) {
        // If slots is 0, should we remove the member? 
        // User said "untick mới 0". So maybe typing 0 just sets slots to 0 but keeps them in list (unticked state?)
        // Or maybe typing 0 is allowed.
        // Let's allow 0 slots.
        return prev.map(m => m.profile_id === profile_id ? { ...m, slots: 0 } : m)
      }
      return prev.map(m => m.profile_id === profile_id ? { ...m, slots: newSlots } : m)
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setStatus({
        type: 'error',
        text: 'Please enter a service name.',
      })
      return
    }
    setIsSaving(true)
    setStatus(null)

    try {
      await onSubmit({
        name: trimmedName,
        shop_id: shopId,
        price: Number.isFinite(priceNumber) ? priceNumber : null,
        next_billing_date: nextBillingDate || null,
        payment_account_id: paymentAccountId,
        is_active: isActive,
        note_template: noteTemplate.trim() || null,
        members: members.map(m => ({
          profile_id: m.profile_id,
          slots: m.slots,
          fixed_amount: unitCost * m.slots // Calculate fixed amount for DB compatibility/reference
        })),
      })
      setStatus({
        type: 'success',
        text: mode === 'create' ? 'Service created.' : 'Service updated.',
      })
    } catch (error) {
      console.error('Failed to submit subscription form', error)
      setStatus({
        type: 'error',
        text: 'Failed to save service. Please try again.',
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
            <div className="flex flex-col flex-1">
              <span className="text-xs uppercase text-slate-500">Service Name</span>
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Ex: YouTube Premium"
                className="w-full border-b border-dashed border-slate-200 text-base font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <label className="space-y-1 text-sm block">
            <span className="text-slate-600">Transaction Note Template</span>
            <input
              value={noteTemplate}
              onChange={event => setNoteTemplate(event.target.value)}
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder={defaultTemplate}
            />
            <span className="text-xs text-slate-500 block">
              Keywords: {`{name}`}, {`{date}`} (MM-YYYY), {`{price}`}, {`{members}`}.
            </span>
            <span className="text-[11px] text-slate-600 block">
              Preview: {formatPreview(
                noteTemplate || defaultTemplate,
                name || initialData?.name || 'Service',
                priceNumber,
                members.length
              )}
            </span>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 mt-1">
              {['{name}', '{date}', '{price}', '{members}'].map(token => (
                <button
                  key={token}
                  type="button"
                  onClick={() => setNoteTemplate(prev => `${prev} ${token}`.trim())}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 hover:bg-slate-100"
                  title="Insert keyword"
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
              <span className="text-slate-600">Total Cost</span>
              <input
                value={priceInput}
                onChange={event => setPriceInput(event.target.value)}
                type="number"
                min={0}
                step="any"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="200000"
              />
              <span className="text-xs text-slate-500">Auto-debit amount per cycle.</span>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Next Billing Date</span>
              <input
                value={nextBillingDate}
                onChange={event => setNextBillingDate(event.target.value)}
                type="date"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <span className="text-xs text-slate-500">Bot will run on this date.</span>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Payment Account</span>
              <select
                value={paymentAccountId ?? ''}
                onChange={event => setPaymentAccountId(event.target.value || null)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Default (Highest Balance)</option>
                {accounts
                  .filter(acc => acc.type !== 'debt')
                  .map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
              </select>
              <span className="text-xs text-slate-500">Source of funds.</span>
            </label>
          </div>

          <label className="space-y-1 text-sm block">
            <span className="text-slate-600">Provider (Shop)</span>
            <Combobox
              items={shopItems}
              value={shopId ?? undefined}
              onValueChange={val => setShopId(val ?? null)}
              placeholder="Select shop (e.g. Youtube, Apple)..."
              inputPlaceholder="Search shop..."
            />
            <span className="text-xs text-slate-500">
              Shop logo will be used for transactions.
            </span>
          </label>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">Status</p>
              <p className="text-xs text-slate-500">Only active services are processed.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={event => setIsActive(event.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-slate-700">{isActive ? 'Active' : 'Paused'}</span>
            </label>
          </div>

          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-600">
            <p>Owner Remainder: {formatMoney(ownerShare)}</p>
            {totalAllocated > priceNumber && (
              <p className="text-xs text-rose-600">
                Total allocated ({formatMoney(totalAllocated)}) exceeds total cost.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Member Manager</p>
              <p className="text-[11px] text-slate-500">
                {focusProfileId
                  ? 'Editing slots for this member only.'
                  : 'Active list + quick add. Slots determine each person\'s share.'}
              </p>
            </div>
            {!focusProfileId && (
              <div className="w-48">
                <Combobox
                  items={addablePeopleItems}
                  value={memberToAdd}
                  onValueChange={handleAddMember}
                  placeholder={availablePeople.length ? 'Add member' : 'All people added'}
                  inputPlaceholder="Search people..."
                  emptyState="No eligible people"
                  disabled={availablePeople.length === 0}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-slate-500">No active members yet.</p>
            ) : (
              members
                .filter(m => !focusProfileId || m.profile_id === focusProfileId)
                .map(member => {
                  const person = people.find(p => p.id === member.profile_id)
                  const slots = member.slots
                  return (
                    <div
                      key={member.profile_id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        {person?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={person.avatar_url}
                            alt={person.name}
                            className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                            {person?.name.charAt(0).toUpperCase() ?? '?'}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{person?.name ?? 'Member'}</span>
                          <span className="text-[11px] text-slate-500">
                            {slots > 0 ? `${formatMoney(unitCost * slots)}` : 'Slots: 0'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>Slots</span>
                          <input
                            type="number"
                            min={0}
                            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            value={slots}
                            onChange={event => updateSlots(member.profile_id, event.target.value)}
                          />
                        </label>
                        {!focusProfileId && (
                          <button
                            type="button"
                            className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                            onClick={() => removeMember(member.profile_id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Allocated</span>
              <span className="font-semibold">{formatMoney(totalAllocated)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Bill</span>
              <span>{formatMoney(priceNumber)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total persons</span>
              <span className="font-semibold">{members.length}</span>
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
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Saving...' : submitLabel ?? (mode === 'create' ? 'Create Service' : 'Update Service')}
        </button>
      </div>
    </form>
  )
}
