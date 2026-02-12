"use client"

import { useState, useCallback } from "react"
import { Plus, Search, X, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shop, Category } from "@/types/moneyflow.types"
import { ShopTable } from "@/components/shops/ShopTable"
import { ShopSlide } from "@/components/shops/ShopSlide"
import { getShops } from "@/services/shop.service"

interface ShopsManagerProps {
    initialShops: Shop[]
    categories: Category[]
}

export function ShopsManager({ initialShops, categories }: ShopsManagerProps) {
    const router = useRouter()
    const [shops, setShops] = useState<Shop[]>(initialShops)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    // Sync with server if needed, or rely on manual refresh
    const refreshShops = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await getShops()
            setShops(data)
            router.refresh()
        } finally {
            setIsLoading(false)
        }
    }, [router])

    const handleEdit = (shop: Shop) => {
        setSelectedShop(shop)
        setIsDialogOpen(true)
    }

    const handleCreate = () => {
        setSelectedShop(null)
        setIsDialogOpen(true)
    }

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/30">
                <div className="max-w-[1800px] mx-auto space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Shops & Merchants</h1>
                            <p className="text-xs font-medium text-slate-500">Manage marketplaces and default category assignments.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : `${shops.length} Shops`}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">

                        {/* Search Bar */}
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by shop name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 pl-9 pr-9 bg-slate-50 hover:bg-slate-100 border-none transition-all focus:ring-2 focus:ring-blue-100 rounded-lg font-medium text-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 hover:bg-slate-200 rounded-full transition-all"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Add Button */}
                        <Button
                            onClick={handleCreate}
                            className="w-full md:w-auto bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.1em] text-[10px] px-6 h-10 rounded-lg shadow-md shadow-slate-200 active:scale-95 transition-all shrink-0"
                        >
                            <Plus className="mr-2 h-3.5 w-3.5 stroke-[3px]" />
                            Add Shop
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-6 py-6 overflow-hidden">
                <div className="max-w-[1800px] mx-auto h-full flex flex-col">
                    <ShopTable
                        shops={shops}
                        categories={categories}
                        onEdit={handleEdit}
                        searchQuery={searchQuery}
                    />
                </div>
            </div>

            <ShopSlide
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                shop={selectedShop}
                categories={categories}
                onSuccess={() => {
                    refreshShops();
                }}
            />
        </div>
    )
}
