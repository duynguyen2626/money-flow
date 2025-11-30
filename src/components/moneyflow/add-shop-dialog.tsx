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
}

export function AddShopDialog({ categories = [], open: controlledOpen, onOpenChange: setControlledOpen }: AddShopDialogProps & { open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? setControlledOpen : setInternalOpen

  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const categoryOptions = useMemo(() =>
    categories
      .filter(c => c.type === 'expense')
      .map(c => ({
        value: c.id,
        label: c.name,
        searchValue: c.name
      }))
    , [categories])

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
      setOpen?.(false)
      router.refresh()
    })
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
