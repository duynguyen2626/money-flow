'use client'

import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Subscription } from '@/types/moneyflow.types'
import { getServiceBranding } from '@/components/services/service-branding'

type PersonFormValues = {
  name: string
  email?: string
  avatar_url?: string
  sheet_link?: string
  subscriptionIds: string[]
  is_owner?: boolean
  is_archived?: boolean
}

type PersonFormProps = {
  mode: 'create' | 'edit'
  onSubmit: (values: PersonFormValues) => Promise<void> | void
  submitLabel?: string
  initialValues?: Partial<PersonFormValues>
  subscriptions: Subscription[]
  onCancel?: () => void
}

const schema = z.object({
  name: z.string().min(1, 'Ten khong duoc de trong'),
  email: z.string().email('Email khong hop le').optional().or(z.literal('')),
  avatar_url: z.string().url('Link avatar khong hop le').optional().or(z.literal('')),
  sheet_link: z.string().url('Link sheet khong hop le').optional().or(z.literal('')),
  subscriptionIds: z.array(z.string()),
  is_owner: z.boolean().optional(),
  is_archived: z.boolean().optional(),
})

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
})

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return ''
  return currencyFormatter.format(value)
}

function formatNextDate(value?: string | null) {
  if (!value) return 'Chua hen'
  try {
    return new Intl.DateTimeFormat('vi-VN').format(new Date(value))
  } catch {
    return value
  }
}

export function PersonForm({
  mode,
  onSubmit,
  submitLabel,
  initialValues,
  subscriptions,
  onCancel,
}: PersonFormProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialValues?.avatar_url || null)
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  )
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name ?? '',
      email: initialValues?.email ?? '',
      avatar_url: initialValues?.avatar_url ?? '',
      sheet_link: initialValues?.sheet_link ?? '',
      subscriptionIds: initialValues?.subscriptionIds ?? [],
      is_owner: initialValues?.is_owner ?? false,
      is_archived: initialValues?.is_archived ?? false,
    },
  })

  const watchedAvatar = watch('avatar_url')
  const watchedSubs = watch('subscriptionIds')
  const watchedIsOwner = watch('is_owner')
  const watchedIsArchived = watch('is_archived')

  useEffect(() => {
    setAvatarPreview(watchedAvatar || null)
  }, [watchedAvatar])

  useEffect(() => {
    // Ensure subscriptionIds is registered even without direct input binding
    register('subscriptionIds')
  }, [register])

  const submission = async (values: PersonFormValues) => {
    setStatus(null)
    try {
      await onSubmit(values)
      setStatus({ type: 'success', text: mode === 'create' ? 'Da tao thanh vien.' : 'Da cap nhat thanh vien.' })
    } catch (error) {
      console.error(error)
      setStatus({ type: 'error', text: 'Khong the luu thong tin. Vui long thu lai.' })
    }
  }

  const subscriptionOptions = useMemo(
    () =>
      subscriptions.map(sub => ({
        id: sub.id,
        name: sub.name,
        price: sub.price,
        next_billing_date: sub.next_billing_date,
      })),
    [subscriptions]
  )

  return (
    <form onSubmit={handleSubmit(submission)} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Account no se duoc tu dong tao va lien ket sau khi luu nguoi nay.
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ten</label>
            <input
              {...register('name')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Vi du: Lam"
            />
            {errors.name && <p className="text-sm text-rose-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              {...register('email')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="lam@example.com"
            />
            {errors.email && <p className="text-sm text-rose-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Avatar URL</label>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                    onError={() => setAvatarPreview(null)}
                  />
                ) : (
                  <span className="text-xs text-slate-400">No</span>
                )}
              </div>
            </div>
            <input
              {...register('avatar_url')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="https://example.com/avatar.jpg"
            />
            {errors.avatar_url && (
              <p className="text-sm text-rose-600">{errors.avatar_url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Link Sheet</label>
            <input
              {...register('sheet_link')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Link Google Sheet theo doi"
            />
            {errors.sheet_link && (
              <p className="text-sm text-rose-600">{errors.sheet_link.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">Toi la chu? (Owner)</p>
              <p className="text-xs text-slate-500">Flag de bot Subscription biet day la chi phi cua minh.</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={watchedIsOwner}
              onChange={e => setValue('is_owner', e.target.checked, { shouldValidate: true })}
            />
          </div>

          {mode === 'edit' && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-slate-800">Archive member</p>
                <p className="text-xs text-slate-500">An thanh vien khoi danh sach va dropdown giao dich.</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={watchedIsArchived}
                onChange={e => setValue('is_archived', e.target.checked, { shouldValidate: true })}
              />
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Dang ky dich vu</p>
            <span className="text-xs text-slate-500">{watchedSubs?.length ?? 0} da chon</span>
          </div>
          <div className="space-y-2">
            {subscriptionOptions.length === 0 ? (
              <p className="text-sm text-slate-500">Chua co dich vu nao.</p>
            ) : (
              subscriptionOptions.map(item => {
                const checked = watchedSubs?.includes(item.id) ?? false
                const brand = getServiceBranding(item.name)
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-blue-200"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold ring-2 ${brand.bg} ${brand.text} ${brand.ring}`}
                    >
                      {brand.icon}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium text-slate-900">{item.name}</span>
                      <span className="text-xs text-slate-500">
                        {formatMoney(item.price ?? null) || 'No price'} - {formatNextDate(item.next_billing_date)}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? (watchedSubs ?? []).filter(id => id !== item.id)
                          : [...(watchedSubs ?? []), item.id]
                        setValue('subscriptionIds', next, { shouldValidate: true })
                      }}
                    />
                  </label>
                )
              })
            )}
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
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Dang luu...' : submitLabel ?? (mode === 'create' ? 'Tao moi' : 'Cap nhat')}
        </button>
      </div>
    </form>
  )
}
