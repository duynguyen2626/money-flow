"use client"

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { ShopSlide } from '@/components/shops/ShopSlide'
import { Category, Shop } from '@/types/moneyflow.types'
import { useRouter } from 'next/navigation'

export function EditShopButton({ shop, categories }: { shop: Shop, categories: Category[] }) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpen(true)
                }}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
            >
                <Pencil className="h-4 w-4" />
            </button>

            <ShopSlide
                open={open}
                onOpenChange={setOpen}
                shop={shop}
                categories={categories}
                onSuccess={() => {
                    setOpen(false)
                    router.refresh()
                }}
            />
        </>
    )
}
