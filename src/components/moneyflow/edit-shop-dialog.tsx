'use client'

import { useState, useTransition, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
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
import { updateShopAction } from '@/actions/shop-actions'
import { Category, Shop } from '@/types/moneyflow.types'
import { Combobox } from '@/components/ui/combobox'
import { Pencil } from 'lucide-react'

type EditShopDialogProps = {
  shop: Shop
  categories?: Category[]
}

export function EditShopDialog({ shop, categories = [] }: EditShopDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(shop.name)
  const [logoUrl, setLogoUrl] = useState(shop.logo_url ?? '')
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(shop.default_category_id ?? null)
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
      const result = await updateShopAction(shop.id, {
        name: trimmedName,
        logo_url: logoUrl.trim() || null,
        default_category_id: defaultCategoryId
      })

      if (!result) {
        setError('Could not update shop. Please try again.')
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Only allow closing, opening is handled by trigger
      setOpen(val)
    }}>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(true)
          }}
          className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="bg-white"
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Shop</DialogTitle>
          <DialogDescription>Update shop details.</DialogDescription>
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
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Saving...' : 'Update Shop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
