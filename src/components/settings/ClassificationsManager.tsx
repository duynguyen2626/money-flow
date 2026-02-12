"use client"

import { useState, useCallback } from "react"
import { Plus, Search, X, Loader2, Store, Tag, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"

import { Shop, Category } from "@/types/moneyflow.types"
import { ShopTable } from "@/components/shops/ShopTable"
import { ShopSlide } from "@/components/shops/ShopSlide"
import { getShops } from "@/services/shop.service"

import { CategoryTable } from "@/components/moneyflow/CategoryTable"
import { CategorySlide } from "@/components/accounts/v2/CategorySlide"
import { getCategories } from "@/services/category.service"
import { cn } from "@/lib/utils"

export interface ClassificationsManagerProps {
    initialShops: Shop[]
    initialCategories: Category[]
    defaultTab?: string
}

export function ClassificationsManager({ initialShops, initialCategories, defaultTab = "categories" }: ClassificationsManagerProps) {
    const [shops, setShops] = useState<Shop[]>(initialShops)
    const [categories, setCategories] = useState<Category[]>(initialCategories)

    const [activeTab, setActiveTab] = useState(defaultTab)

    const [isShopDialogOpen, setIsShopDialogOpen] = useState(false)
    const [selectedShop, setSelectedShop] = useState<Shop | null>(null)

    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    // Category specific filter
    const [categoryFilter, setCategoryFilter] = useState("all")

    const refreshShops = useCallback(async () => {
        const data = await getShops()
        setShops(data)
    }, [])

    const refreshCategories = useCallback(async () => {
        const data = await getCategories()
        setCategories(data)
    }, [])

    const handleRefresh = async () => {
        setIsLoading(true)
        try {
            await Promise.all([refreshShops(), refreshCategories()])
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreate = () => {
        if (activeTab === "shops") {
            setSelectedShop(null)
            setIsShopDialogOpen(true)
        } else {
            setSelectedCategory(null)
            setIsCategoryDialogOpen(true)
        }
    }

    const renderHeader = () => (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Classifications</h1>
                <p className="text-sm font-medium text-slate-500">Manage transaction categories, shops, and classification rules.</p>
            </div>

            <div className="flex items-center gap-3">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    {isLoading ? "Syncing..." : `${categories.length} Categories • ${shops.length} Shops`}
                </div>
            </div>
        </div>
    )

    const renderControls = () => (
        <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {/* Tabs Trigger */}
            <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                <button
                    onClick={() => setActiveTab("categories")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-wider transition-all",
                        activeTab === "categories" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Tag className="h-3.5 w-3.5" /> Categories
                </button>
                <button
                    onClick={() => setActiveTab("shops")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-black uppercase tracking-wider transition-all",
                        activeTab === "shops" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Store className="h-3.5 w-3.5" /> Shops
                </button>
            </div>

            <div className="w-px h-8 bg-slate-100 hidden md:block" />

            {/* Filters (Context Aware) */}
            {activeTab === "categories" && (
                <div className="w-full md:w-40 shrink-0">
                    <Select
                        items={[
                            { value: "all", label: "All Types" },
                            { value: "expense", label: "Expense" },
                            { value: "income", label: "Income" },
                            { value: "transfer", label: "Transfer" },
                        ]}
                        value={categoryFilter}
                        onValueChange={(v) => setCategoryFilter(v || "all")}
                        className="h-10 bg-slate-50 border-none font-bold text-[11px] uppercase tracking-wider"
                    />
                </div>
            )}

            {/* Search Bar */}
            <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder={activeTab === "shops" ? "Search shops..." : "Search categories or MCC..."}
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
                Add {activeTab === "shops" ? "Shop" : "Category"}
            </Button>
        </div>
    )

    return (
        <div className="w-full min-h-full flex flex-col bg-white">
            <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/30">
                <div className="max-w-[1800px] mx-auto space-y-6">
                    {renderHeader()}
                    {renderControls()}
                </div>
            </div>

            <div className="flex-1 px-6 py-6 overflow-hidden">
                <div className="max-w-[1800px] mx-auto h-full flex flex-col">
                    {activeTab === "categories" ? (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300 h-full">
                            <CategoryTable
                                categories={categories}
                                onEdit={(cat) => {
                                    setSelectedCategory(cat)
                                    setIsCategoryDialogOpen(true)
                                }}
                                activeTab={categoryFilter}
                                searchQuery={searchQuery}
                            />
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                            <ShopTable
                                shops={shops}
                                categories={categories}
                                onEdit={(shop) => {
                                    setSelectedShop(shop)
                                    setIsShopDialogOpen(true)
                                }}
                                searchQuery={searchQuery}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Slides */}
            <CategorySlide
                open={isCategoryDialogOpen}
                onOpenChange={setIsCategoryDialogOpen}
                category={selectedCategory}
                defaultType={categoryFilter === "all" || categoryFilter === "transfer" ? "expense" : categoryFilter as any}
                onSuccess={() => {
                    refreshCategories();
                    setIsCategoryDialogOpen(false);
                }}
            />

            <ShopSlide
                open={isShopDialogOpen}
                onOpenChange={setIsShopDialogOpen}
                shop={selectedShop}
                categories={categories}
                onSuccess={() => {
                    refreshShops();
                }}
            />
        </div>
    )
}
