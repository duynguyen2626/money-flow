"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Plus, Search, X, Loader2, Store, Tag, Filter, Play, Check, ChevronDown, Calendar, MoreVertical, Copy, ExternalLink, ArrowUpDown, Archive, LayoutList, Trash2, ArrowRightLeft, ArchiveRestore } from "lucide-react"
import { TransactionSlideV2 } from "@/components/transaction/slide-v2/transaction-slide-v2"
import { Account, Person } from "@/types/moneyflow.types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Combobox } from "@/components/ui/combobox"

import { Shop, Category } from "@/types/moneyflow.types"
import { ShopTable } from "@/components/shops/ShopTable"
import { ShopSlide } from "@/components/shops/ShopSlide"
import {
    getShops,
    toggleShopArchive,
    archiveShop,
    deleteShop,
    toggleShopsArchiveBulk,
    deleteShopsBulk
} from "@/services/shop.service"

import { CategoryTable } from "@/components/moneyflow/CategoryTable"
import { CategorySlide } from "@/components/accounts/v2/CategorySlide"
import {
    getCategories,
    getCategoryStats,
    toggleCategoryArchive,
    archiveCategory,
    deleteCategory,
    toggleCategoriesArchiveBulk,
    deleteCategoriesBulk
} from "@/services/category.service"
import { DeleteClassificationDialog } from "./delete-classification-dialog"
import { cn } from "@/lib/utils"

export interface ClassificationsManagerProps {
    initialShops: Shop[]
    initialCategories: Category[]
    accounts: Account[]
    people: Person[]
    defaultTab?: string
}

export function ClassificationsManager({ initialShops, initialCategories, accounts, people, defaultTab = "categories" }: ClassificationsManagerProps) {
    const [shops, setShops] = useState<Shop[]>(initialShops)
    const [categories, setCategories] = useState<Category[]>(initialCategories)

    const [activeTab, setActiveTab] = useState(defaultTab)

    const [isShopDialogOpen, setIsShopDialogOpen] = useState(false)
    const [selectedShop, setSelectedShop] = useState<Shop | null>(null)

    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

    const [catSearch, setCatSearch] = useState("")
    const [shopSearch, setShopSearch] = useState("")
    const [archiveSearch, setArchiveSearch] = useState("")

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const [isLoading, setIsLoading] = useState(false)
    const [isStatsLoading, setIsStatsLoading] = useState(false)

    const [categoryFilter, setCategoryFilter] = useState("all")
    const [shopCategoryFilter, setShopCategoryFilter] = useState("all")
    const [isCreatingCategoryFromShop, setIsCreatingCategoryFromShop] = useState(false)
    const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false)

    // Delete Dialog State
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean
        entity: Category | Shop | null
        ids?: string[]
        type: 'category' | 'shop'
        mode: 'delete' | 'archive'
    }>({ open: false, entity: null, type: 'category', mode: 'delete' })

    // Stats State
    const currentYear = new Date().getFullYear()
    const [selectedYear, setSelectedYear] = useState(currentYear.toString())
    const [categoryStats, setCategoryStats] = useState<Record<string, { total: number; count: number }>>({})

    const refreshShops = useCallback(async () => {
        const data = await getShops()
        setShops(data)
    }, [])

    const refreshCategories = useCallback(async () => {
        const data = await getCategories()
        setCategories(data)
    }, [])

    const loadStats = useCallback(async () => {
        setIsStatsLoading(true)
        try {
            const stats = await getCategoryStats(parseInt(selectedYear))
            setCategoryStats(stats || {})
        } finally {
            setIsStatsLoading(false)
        }
    }, [selectedYear])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    // Clear selection when changing tabs
    useEffect(() => {
        setSelectedIds(new Set())
    }, [activeTab])

    const handleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleSelectAll = (ids: string[]) => {
        if (selectedIds.size === ids.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(ids))
        }
    }

    const handleArchiveCategory = async (cat: Category) => {
        if (cat.is_archived) {
            setIsLoading(true)
            const success = await toggleCategoryArchive(cat.id, false)
            if (success) {
                toast.success("Category unarchived successfully")
                await refreshCategories()
            } else {
                toast.error("Failed to unarchive")
            }
            setIsLoading(false)
            return
        }

        const count = categoryStats[cat.id]?.count || 0
        if (count > 0) {
            setDeleteDialog({ open: true, entity: cat, type: 'category', mode: 'archive' })
        } else {
            setIsLoading(true)
            const success = await toggleCategoryArchive(cat.id, true)
            if (success) {
                toast.success("Category archived successfully")
                await refreshCategories()
            } else {
                toast.error("Failed to archive")
            }
            setIsLoading(false)
        }
    }

    const handleDeleteCategory = (cat: Category) => {
        setDeleteDialog({ open: true, entity: cat, type: 'category', mode: 'delete' })
    }

    const handleBulkArchive = async () => {
        if (selectedIds.size === 0) return

        setIsLoading(true)
        const ids = Array.from(selectedIds)
        const isArchiving = activeTab !== "archives"

        let success = false
        if (activeTab === "categories" || (activeTab === "archives" && archiveFilter === "categories")) {
            success = await toggleCategoriesArchiveBulk(ids, isArchiving)
        } else {
            success = await toggleShopsArchiveBulk(ids, isArchiving)
        }

        if (success) {
            toast.success(`Successfully ${isArchiving ? 'archived' : 'unarchived'} ${ids.length} items`)
            setSelectedIds(new Set())
            loadData()
        } else {
            toast.error("Failed to update items")
        }
        setIsLoading(false)
    }

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return
        const ids = Array.from(selectedIds)
        setDeleteDialog({
            open: true,
            entity: null,
            ids: ids,
            type: (activeTab === "categories" || (activeTab === "archives" && archiveFilter === "categories")) ? 'category' : 'shop'
        })
    }

    const handleArchiveShop = async (shop: Shop) => {
        if (shop.is_archived) {
            setIsLoading(true)
            const success = await toggleShopArchive(shop.id, false)
            if (success) {
                toast.success("Shop unarchived successfully")
                await refreshShops()
            } else {
                toast.error("Failed to unarchive")
            }
            setIsLoading(false)
            return
        }

        // shops don't have stats yet in this view, so we check if archived manually or just use the dialog check
        setDeleteDialog({ open: true, entity: shop, type: 'shop', mode: 'archive' })
    }

    const handleDeleteShop = (shop: Shop) => {
        setDeleteDialog({ open: true, entity: shop, type: 'shop', mode: 'delete' })
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

    const handleQuickAddTxn = () => {
        setIsAddTransactionOpen(true)
    }

    const initialDataForQuickAdd = useMemo(() => {
        if (activeTab === 'shops') {
            return {
                type: 'expense' as const,
                occurred_at: new Date(),
            }
        }
        return {
            type: (categoryFilter === 'income' ? 'income' : 'expense') as any,
            category_id: categoryFilter !== 'all' && categoryFilter !== 'transfer' ? categoryFilter : null,
            occurred_at: new Date(),
        }
    }, [activeTab, categoryFilter])

    // Generate years for dropdown (e.g. current year - 2 to current year + 1)
    const years = Array.from({ length: 4 }, (_, i) => (currentYear - 2 + i).toString()).reverse()

    const activeCategoryCount = categories.filter(c => !c.is_archived).length
    const activeShopCount = shops.filter(s => !s.is_archived).length
    const archivedCount = categories.filter(c => c.is_archived).length + shops.filter(s => s.is_archived).length

    const renderHeader = () => (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex flex-col xl:flex-row items-center justify-between gap-4 transition-all">
            {/* Left: Title + Tabs */}
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full xl:w-auto">
                <div className="hidden sm:block">
                    <h1 className="text-sm font-black text-slate-900 tracking-[0.2em] uppercase">Classifications</h1>
                </div>

                <div className="flex bg-slate-100/80 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab("categories")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                            activeTab === "categories" ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Tag className="h-3 w-3" /> Categories ({activeCategoryCount})
                    </button>
                    <button
                        onClick={() => setActiveTab("shops")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                            activeTab === "shops" ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Store className="h-3 w-3" /> Shops ({activeShopCount})
                    </button>
                    <button
                        onClick={() => setActiveTab("archives")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                            activeTab === "archives" ? "bg-orange-500 text-white shadow-md shadow-orange-100" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Archive className="h-3 w-3" /> Archived ({archivedCount})
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                {activeTab === "categories" && (
                    <div className="flex items-center gap-2">
                        <div className="w-[85px] shrink-0">
                            <Select
                                items={years.map(y => ({ value: y, label: y }))}
                                value={selectedYear}
                                onValueChange={(v) => setSelectedYear(v)}
                                className="h-9 bg-slate-50 border-slate-200 font-bold text-[11px]"
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                            <button
                                onClick={() => setCategoryFilter("all")}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                                    categoryFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setCategoryFilter("expense")}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                                    categoryFilter === "expense" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Exp
                            </button>
                            <button
                                onClick={() => setCategoryFilter("income")}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                                    categoryFilter === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Inc
                            </button>
                            <button
                                onClick={() => setCategoryFilter("transfer")}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                                    categoryFilter === "transfer" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Trf
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === "shops" && (
                    <div className="w-[200px] shrink-0">
                        <Combobox
                            items={[
                                { value: "all", label: "All Categories" },
                                { value: "none", label: "Uncategorized" },
                                ...categories
                                    .filter(c => !c.is_archived)
                                    .map(c => ({
                                        value: c.id,
                                        label: c.name,
                                        description: c.type.toUpperCase(),
                                        icon: (
                                            <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 uppercase font-black text-[8px] text-slate-400">
                                                {c.image_url ? (
                                                    <img src={c.image_url} alt="" className="w-full h-full object-contain p-0.5" />
                                                ) : (
                                                    <span>{c.icon || c.name[0]}</span>
                                                )}
                                            </div>
                                        )
                                    }))
                            ]}
                            value={shopCategoryFilter}
                            onValueChange={(v) => setShopCategoryFilter(v || "all")}
                            placeholder="Filter by category"
                            inputPlaceholder="Search categories..."
                            onAddNew={() => {
                                setSelectedCategory(null)
                                setIsCategoryDialogOpen(true)
                            }}
                            addLabel="Category"
                            className="h-9 bg-slate-50 border-slate-200 font-bold text-[11px] uppercase tracking-wider"
                        />
                    </div>
                )}

                {/* Search */}
                <div className="relative w-full sm:w-[240px] shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                        placeholder={`Search ${activeTab === 'archives' ? 'archived' : activeTab}...`}
                        value={activeTab === 'categories' ? catSearch : activeTab === 'shops' ? shopSearch : archiveSearch}
                        onChange={(e) => {
                            if (activeTab === 'categories') setCatSearch(e.target.value)
                            else if (activeTab === 'shops') setShopSearch(e.target.value)
                            else setArchiveSearch(e.target.value)
                        }}
                        className="h-9 pl-8 bg-slate-50 border-slate-200 font-bold text-xs rounded-lg focus-visible:ring-blue-400 transition-all placeholder:text-slate-300"
                    />
                    {(activeTab === 'categories' ? catSearch : activeTab === 'shops' ? shopSearch : archiveSearch) && (
                        <button
                            onClick={() => {
                                if (activeTab === 'categories') setCatSearch("")
                                else if (activeTab === 'shops') setShopSearch("")
                                else setArchiveSearch("")
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Bulk Actions */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                            <span className="text-[10px] font-black uppercase text-slate-400 mr-2">{selectedIds.size} SELECTED</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkArchive}
                                className="h-9 px-4 text-xs font-bold gap-2 border-slate-200 hover:bg-slate-50 transition-all rounded-lg"
                            >
                                {activeTab === "archives" ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                                {activeTab === "archives" ? "Unarchive" : "Archive"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="h-9 px-4 text-xs font-bold gap-2 border-rose-100 text-rose-600 hover:bg-rose-50 transition-all rounded-lg"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                            </Button>
                            <div className="w-px h-6 bg-slate-200 mx-2" />
                        </div>
                    )}

                    <Button
                        onClick={handleQuickAddTxn}
                        variant="outline"
                        className="h-10 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black uppercase tracking-[0.1em] text-[10px] px-4 rounded-xl shadow-sm active:scale-95 transition-all shrink-0 ml-2"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5 stroke-[3px]" />
                        Quick Txn
                    </Button>

                    <Button
                        onClick={handleCreate}
                        className="h-10 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.1em] text-[10px] px-4 rounded-xl shadow-sm active:scale-95 transition-all shrink-0 ml-2"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5 stroke-[3px]" />
                        Add {activeTab === 'shops' ? 'Shop' : 'Cate'}
                    </Button>
                </div>
            </div>
        </div>
    )

    return (
        <div className="w-full h-screen flex flex-col bg-white overflow-hidden">
            {renderHeader()}

            <div className="flex-1 overflow-hidden relative">
                {(isStatsLoading || isLoading) && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/40 backdrop-blur-[2px] transition-all animate-in fade-in duration-300">
                        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white shadow-xl border border-slate-100">
                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Refreshing...</span>
                        </div>
                    </div>
                )}

                <div className="h-full overflow-auto px-6 py-6 pb-20">
                    {activeTab === "categories" && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300 h-full">
                            <CategoryTable
                                categories={categories}
                                onEdit={(cat) => {
                                    setSelectedCategory(cat)
                                    setIsCategoryDialogOpen(true)
                                }}
                                activeTab={categoryFilter}
                                searchQuery={catSearch}
                                stats={categoryStats}
                                selectedYear={parseInt(selectedYear)}
                                onArchive={handleArchiveCategory}
                                onDelete={handleDeleteCategory}
                                selectedIds={selectedIds}
                                onSelect={handleSelect}
                                onSelectAll={handleSelectAll}
                            />
                        </div>
                    )}

                    {activeTab === "shops" && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                            <ShopTable
                                shops={shops}
                                categories={categories}
                                onEdit={(shop) => {
                                    setSelectedShop(shop)
                                    setIsShopDialogOpen(true)
                                }}
                                searchQuery={shopSearch}
                                categoryFilter={shopCategoryFilter}
                                onArchive={handleArchiveShop}
                                onDelete={handleDeleteShop}
                                selectedIds={selectedIds}
                                onSelect={handleSelect}
                                onSelectAll={handleSelectAll}
                            />
                        </div>
                    )}

                    {activeTab === "archives" && (
                        <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] flex items-center gap-2">
                                        <Tag className="h-3 w-3" /> Archived Categories
                                        <span className="text-slate-300">/</span>
                                        <span className="text-slate-400 font-bold tracking-normal">{categories.filter(c => c.is_archived).length} items</span>
                                    </h3>
                                </div>
                                <CategoryTable
                                    categories={categories.filter(c => c.is_archived)}
                                    onEdit={(cat) => {
                                        setSelectedCategory(cat)
                                        setIsCategoryDialogOpen(true)
                                    }}
                                    activeTab="archived"
                                    searchQuery={archiveSearch}
                                    stats={categoryStats}
                                    selectedYear={parseInt(selectedYear)}
                                    onArchive={handleArchiveCategory}
                                    onDelete={handleDeleteCategory}
                                    selectedIds={selectedIds}
                                    onSelect={handleSelect}
                                    onSelectAll={handleSelectAll}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] flex items-center gap-2">
                                        <Store className="h-3 w-3" /> Archived Shops
                                        <span className="text-slate-300">/</span>
                                        <span className="text-slate-400 font-bold tracking-normal">{shops.filter(s => s.is_archived).length} items</span>
                                    </h3>
                                </div>
                                <ShopTable
                                    shops={shops.filter(s => s.is_archived)}
                                    categories={categories}
                                    onEdit={(shop) => {
                                        setSelectedShop(shop)
                                        setIsShopDialogOpen(true)
                                    }}
                                    searchQuery={archiveSearch}
                                    isArchived={true}
                                    onArchive={handleArchiveShop}
                                    onDelete={handleDeleteShop}
                                    selectedIds={selectedIds}
                                    onSelect={handleSelect}
                                    onSelectAll={handleSelectAll}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Slides */}
            <CategorySlide
                open={isCategoryDialogOpen}
                onOpenChange={(open) => {
                    setIsCategoryDialogOpen(open)
                    // If closing and we were creating from shop, this flag isn't strictly needed if we just stack,
                    // but good for cleanup.
                    if (!open) setIsCreatingCategoryFromShop(false)
                }}
                category={selectedCategory}
                defaultType={categoryFilter === "all" || categoryFilter === "transfer" ? "expense" : categoryFilter as any}
                onSuccess={(newCatId) => {
                    refreshCategories();
                    setIsCategoryDialogOpen(false);
                    // If we are in "stack" mode, we might want to auto-select the new category in the underlying ShopSlide.
                    // But we can't easily reach into ShopSlide form.
                    // Unless we pass a callback to ShopSlide?
                    // ShopSlide is active.
                }}
                onBack={isCreatingCategoryFromShop ? () => {
                    setIsCategoryDialogOpen(false)
                } : undefined}
                zIndex={70}
            />

            <ShopSlide
                open={isShopDialogOpen}
                onOpenChange={setIsShopDialogOpen}
                shop={selectedShop}
                categories={categories}
                onSuccess={() => {
                    refreshShops();
                }}
                onCreateCategory={() => {
                    setIsCreatingCategoryFromShop(true)
                    // setIsShopDialogOpen(false) // KEEP OPEN
                    setSelectedCategory(null)
                    setIsCategoryDialogOpen(true)
                }}
            />

            <DeleteClassificationDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
                entity={deleteDialog.entity}
                ids={deleteDialog.ids}
                entityType={deleteDialog.type}
                mode={deleteDialog.mode}
                candidates={deleteDialog.type === 'category'
                    ? categories.filter(c => {
                        const typeToMatch = deleteDialog.entity?.type || categories.find(cat => deleteDialog.ids?.includes(cat.id))?.type
                        return c.type === typeToMatch && !c.is_archived
                    })
                    : shops.filter(s => !s.is_archived)
                }
                onConfirm={async (idOrIds, targetId) => {
                    if (Array.isArray(idOrIds)) {
                        return deleteDialog.type === 'category'
                            ? deleteCategoriesBulk(idOrIds, targetId)
                            : deleteShopsBulk(idOrIds, targetId)
                    } else {
                        if (deleteDialog.mode === 'archive') {
                            return deleteDialog.type === 'category'
                                ? archiveCategory(idOrIds, targetId)
                                : archiveShop(idOrIds, targetId)
                        } else {
                            return deleteDialog.type === 'category'
                                ? deleteCategory(idOrIds, targetId)
                                : deleteShop(idOrIds, targetId)
                        }
                    }
                }}
                onSuccess={() => {
                    setSelectedIds(new Set())
                    if (deleteDialog.type === 'category') refreshCategories()
                    else refreshShops()
                }}
            />

            <TransactionSlideV2
                open={isAddTransactionOpen}
                onOpenChange={setIsAddTransactionOpen}
                initialData={initialDataForQuickAdd}
                accounts={accounts}
                categories={categories}
                people={people}
                shops={shops}
                onSuccess={() => {
                    setIsAddTransactionOpen(false)
                    // No need to refresh stats here if they are loaded on every year change, 
                    // but maybe refresh categories for stats?
                    loadStats()
                }}
            />
        </div>
    )
}
