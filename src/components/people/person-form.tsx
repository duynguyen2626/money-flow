'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Subscription } from '@/types/moneyflow.types'

type PersonFormValues = {
  name: string
  email?: string
  avatar_url?: string
  sheet_link?: string
  subscriptionIds: string[]
  is_owner?: boolean
  is_archived?: boolean
  is_group?: boolean
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
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  avatar_url: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
  sheet_link: z.string().url('Invalid script link URL').optional().or(z.literal('')),
  subscriptionIds: z.array(z.string()),
  is_owner: z.boolean().optional(),
  is_archived: z.boolean().optional(),
  is_group: z.boolean().optional(),
})

const currencyFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return ''
  return currencyFormatter.format(value)
}

function formatNextDate(value?: string | null) {
  if (!value) return 'Not scheduled'
  try {
    return new Intl.DateTimeFormat('en-US').format(new Date(value))
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
      is_group: initialValues?.is_group ?? false,
    },
  })

  const watchedAvatar = watch('avatar_url')
  const watchedSubs = watch('subscriptionIds')
  const watchedIsOwner = watch('is_owner')
  const watchedIsArchived = watch('is_archived')
  const watchedIsGroup = watch('is_group')

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
      setStatus({ type: 'success', text: mode === 'create' ? 'Member created.' : 'Member updated.' })
    } catch (error) {
      console.error(error)
      setStatus({ type: 'error', text: 'Unable to save changes. Please try again.' })
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
    <form onSubmit={handleSubmit(submission)} className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 space-y-6 overflow-y-auto px-6 py-5">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
          A debt account is created automatically after saving this person.
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile</p>
              <p className="text-sm text-slate-500">Basic info and sheet connection.</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
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

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Full name</label>
              <input
                {...register('name')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. Jamie Lee"
              />
              {errors.name && <p className="text-sm text-rose-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email address</label>
              <input
                {...register('email')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="jamie@example.com"
              />
              {errors.email && <p className="text-sm text-rose-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Avatar URL</label>
              <input
                {...register('avatar_url')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="https://example.com/avatar.jpg"
              />
              {errors.avatar_url && (
                <p className="text-sm text-rose-600">{errors.avatar_url.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Script Link (Webhook)</label>
              <input
                {...register('sheet_link')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="https://script.google.com/macros/s/..."
              />
              {errors.sheet_link && (
                <p className="text-sm text-rose-600">{errors.sheet_link.message}</p>
              )}
              <p className="text-xs text-slate-500">Used for Manage Sheet sync.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-800">Owner profile</p>
              <p className="text-xs text-slate-500">Mark if this person is you.</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={watchedIsOwner}
              onChange={e => setValue('is_owner', e.target.checked, { shouldValidate: true })}
            />
          </div>

          {mode === 'edit' && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-800">Archive member</p>
                <p className="text-xs text-slate-500">Hide from lists and transaction pickers.</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={watchedIsArchived}
                onChange={e => setValue('is_archived', e.target.checked, { shouldValidate: true })}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-800">Group profile</p>
              <p className="text-xs text-slate-500">Show in Split Bill group picker.</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={watchedIsGroup}
              onChange={e => setValue('is_group', e.target.checked, { shouldValidate: true })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Subscriptions</p>
            <span className="text-xs text-slate-500">{watchedSubs?.length ?? 0} selected</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subscriptionOptions.length === 0 ? (
              <p className="col-span-full text-sm text-slate-500">No services available yet.</p>
            ) : (
              subscriptionOptions.map(item => {
                const checked = watchedSubs?.includes(item.id) ?? false
                const brand = { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200', icon: item.name.charAt(0) }
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-blue-200"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold ring-2 ${brand.bg} ${brand.text} ${brand.ring}`}
                    >
                      {brand.icon}
                    </div>
                    <div className="flex flex-1 flex-col min-w-0">
                      <span className="truncate font-medium text-slate-900">{item.name}</span>
                      <span className="truncate text-xs text-slate-500">
                        {formatMoney(item.price ?? null) || 'No price'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600 shrink-0"
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

      <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {status && (
            <p className={`text-sm ${status.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
              {status.text}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 sm:ml-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : submitLabel ?? (mode === 'create' ? 'Create member' : 'Save changes')}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
