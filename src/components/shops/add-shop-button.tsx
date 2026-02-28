"use client"

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShopSlide } from '@/components/shops/ShopSlide'
import { Category } from '@/types/moneyflow.types'
import { useRouter } from 'next/navigation'

export function AddShopButton({ categories }: { categories: Category[] }) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                className="bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm rounded-lg"
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Shop
            </Button>

            <ShopSlide
                open={open}
                onOpenChange={setOpen}
                categories={categories}
                onSuccess={() => {
                    setOpen(false)
                    router.refresh()
                }}
            />
        </>
    )
}
