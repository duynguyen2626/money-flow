'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createShopAction } from '@/actions/shop-actions'
import { Category } from '@/types/moneyflow.types'
import { Combobox } from '@/components/ui/combobox'

type AddShopDialogProps = {
  categories?: Category[]
  preselectedCategoryId?: string
  onShopCreated?: (shop: any) => void
}

export function AddShopDialog({
  categories = [],
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  preselectedCategoryId,
  onShopCreated
}: AddShopDialogProps & { open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? setControlledOpen : setInternalOpen

  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(preselectedCategoryId ?? null)
  const [selectedKind, setSelectedKind] = useState<string[]>(['ex']) // Default to External
  const [error, setError] = useState<string | null>(null)

  // Update local state when prop changes
  useMemo(() => {
    if (preselectedCategoryId) setDefaultCategoryId(preselectedCategoryId)
  }, [preselectedCategoryId])
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const categoryOptions = useMemo(() =>
    categories
      .filter(c => {
        // Filter by selected kind
        if (selectedKind.length === 0) return true
        const kindCode = c.kind === 'internal' ? 'in' : (c.kind === 'external' ? 'ex' : null)
        if (!kindCode) return false
        return selectedKind.includes(kindCode)
      })
      .map(c => ({
        value: c.id,
        label: c.name,
        searchValue: c.name,
        icon: c.icon ? <span className="text-lg">{c.icon}</span> : undefined
      }))
    , [categories, selectedKind])

  const handleSubmit = () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Shop name is required.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await createShopAction({
        name: trimmedName,
        logo_url: logoUrl.trim() || null,
        default_category_id: defaultCategoryId
      })

      if (!result) {
        setError('Could not create shop. Please try again.')
        return
      }

      setName('')
      setLogoUrl('')
      setDefaultCategoryId(null)
      setSelectedKind(['ex'])

      onShopCreated?.(result)

      setOpen?.(false)
      router.refresh()
    })
  }

  const toggleKind = (kind: string) => {
    if (selectedKind.includes(kind)) {
      setSelectedKind(selectedKind.filter(k => k !== kind))
    } else {
      setSelectedKind([...selectedKind, kind])
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            Add Shop
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Add Shop</DialogTitle>
          <DialogDescription>Save the store where you usually shop so it can be linked to expenses.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <Input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="e.g. Shopee"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-slate-700">Category Kind</label>
              <div className="flex gap-1.5">
                {selectedKind.includes("ex") && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-xs font-medium">
                    External
                    <button
                      type="button"
                      onClick={() => toggleKind("ex")}
                      className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {selectedKind.includes("in") && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                    Internal
                    <button
                      type="button"
                      onClick={() => toggleKind("in")}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => toggleKind("ex")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${selectedKind.includes("ex")
                  ? "bg-purple-100 border-purple-300 text-purple-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-purple-200 hover:bg-purple-50"
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium">External</span>
              </button>
              <button
                type="button"
                onClick={() => toggleKind("in")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${selectedKind.includes("in")
                  ? "bg-blue-100 border-blue-300 text-blue-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-medium">Internal</span>
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Default Category (optional)</label>
            <Combobox
              items={categoryOptions}
              value={defaultCategoryId ?? undefined}
              onValueChange={val => setDefaultCategoryId(val ?? null)}
              placeholder="Select default category"
              inputPlaceholder="Search category..."
              emptyState="No categories found"
            />
            <p className="mt-1 text-xs text-slate-500">Auto-fills the category when selecting this shop.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Logo URL (optional)</label>
            <Input
              value={logoUrl}
              onChange={event => setLogoUrl(event.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen?.(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : 'Create Shop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
