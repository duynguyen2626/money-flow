"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { Plus, Search, X, Loader2, Store, Tag, Filter, Play, Check, ChevronDown, Calendar, MoreVertical, Copy, ExternalLink, ArrowUpDown, Archive, LayoutList, Trash2, ArrowRightLeft, ArchiveRestore, ArrowDownRight, ArrowUpRight } from "lucide-react"
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
    deleteShopsBulk,
    getShopStats
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
    const [archiveFilter, setArchiveFilter] = useState<"all" | "categories" | "shops">("all")

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const [isLoading, setIsLoading] = useState(false)
    const [isStatsLoading, setIsStatsLoading] = useState(false)

    const [categoryFilter, setCategoryFilter] = useState("all")
    const [shopTypeFilter, setShopTypeFilter] = useState("all")
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

    // Hover-to-Open state
    const [isYearOpen, setIsYearOpen] = useState(false)
    const [isShopFilterOpen, setIsShopFilterOpen] = useState(false)
    const [isTypeFilterOpen, setIsTypeFilterOpen] = useState(false)

    // Stats State
    const currentYear = new Date().getFullYear()
    const [selectedYear, setSelectedYear] = useState(currentYear.toString())
    const [categoryStats, setCategoryStats] = useState<Record<string, { total: number; count: number }>>({})
    const [shopStats, setShopStats] = useState<Record<string, { total: number; count: number }>>({})

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
            const [cStats, sStats] = await Promise.all([
                getCategoryStats(parseInt(selectedYear)),
                getShopStats(parseInt(selectedYear))
            ])
            setCategoryStats(cStats || {})
            setShopStats(sStats || {})
        } finally {
            setIsStatsLoading(false)
        }
    }, [selectedYear])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    const activeCategoryCount = categories.filter(c => !c.is_archived).length
    const activeShopCount = shops.filter(s => !s.is_archived).length
    const archivedCount = categories.filter(c => c.is_archived).length + shops.filter(s => s.is_archived).length

    // Generate years from 2024 to current year + 1
    const years = useMemo(() => {
        const startYear = 2024
        const endYear = currentYear + 1
        const yearsList: string[] = []
        for (let y = endYear; y >= startYear; y--) {
            yearsList.push(y.toString())
        }
        return yearsList
    }, [currentYear])

    const handleSelect = (id: string | string[]) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (Array.isArray(id)) {
                id.forEach(i => next.add(i))
            } else {
                if (next.has(id)) next.delete(id)
                else next.add(id)
            }
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

    const handleCreate = () => {
        if (activeTab === 'categories') {
            setSelectedCategory(null)
            setIsCategoryDialogOpen(true)
        } else if (activeTab === 'shops') {
            setSelectedShop(null)
            setIsShopDialogOpen(true)
        }
    }

    const handleQuickAddTxn = () => {
        setIsAddTransactionOpen(true)
    }

    const initialDataForQuickAdd = useMemo(() => {
        if (activeTab === 'shops' && selectedIds.size === 1) {
            const shopId = Array.from(selectedIds)[0]
            const shop = shops.find(s => s.id === shopId)
            if (shop) {
                return {
                    shop_id: shop.id,
                    category_id: shop.default_category_id,
                    type: (categories.find(c => c.id === shop.default_category_id)?.type as any) || 'expense'
                }
            }
        }
        return {}
    }, [activeTab, selectedIds, shops, categories])

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

        const count = shopStats[shop.id]?.count || 0
        if (count > 0) {
            setDeleteDialog({ open: true, entity: shop, type: 'shop', mode: 'archive' })
        } else {
            setIsLoading(true)
            const success = await toggleShopArchive(shop.id, true)
            if (success) {
                toast.success("Shop archived successfully")
                await refreshShops()
            } else {
                toast.error("Failed to archive")
            }
            setIsLoading(false)
        }
    }

    const handleDeleteCategory = (cat: Category) => {
        setDeleteDialog({ open: true, entity: cat, type: 'category', mode: 'delete' })
    }

    const handleDeleteShop = (shop: Shop) => {
        setDeleteDialog({ open: true, entity: shop, type: 'shop', mode: 'delete' })
    }

    const handleBulkArchive = async () => {
        const ids = Array.from(selectedIds)
        if (ids.length === 0) return

        setIsLoading(true)
        const isArchiving = activeTab !== 'archives'

        try {
            // Split IDs into categories and shops
            const selectedCatIds = ids.filter(id => categories.some(c => c.id === id))
            const selectedShopIds = ids.filter(id => shops.some(s => s.id === id))

            let catSuccess = true
            let shopSuccess = true

            if (selectedCatIds.length > 0) {
                catSuccess = await toggleCategoriesArchiveBulk(selectedCatIds, isArchiving)
                if (catSuccess) await refreshCategories()
            }

            if (selectedShopIds.length > 0) {
                shopSuccess = await toggleShopsArchiveBulk(selectedShopIds, isArchiving)
                if (shopSuccess) await refreshShops()
            }

            if (catSuccess && shopSuccess) {
                toast.success(`${ids.length} items ${isArchiving ? 'archived' : 'unarchived'} successfully`)
                setSelectedIds(new Set())
            } else {
                toast.error(`Failed to ${isArchiving ? 'archive' : 'unarchive'}`)
            }
        } catch (error) {
            console.error('Bulk archive error:', error)
            toast.error("An error occurred during bulk operation")
        } finally {
            setIsLoading(false)
        }
    }

    const handleBulkDelete = () => {
        const ids = Array.from(selectedIds)
        if (ids.length === 0) return

        setDeleteDialog({
            open: true,
            entity: null,
            ids,
            type: activeTab === 'categories' ? 'category' : 'shop',
            mode: 'delete'
        })
    }

    const typeFilterItems = [
        { value: "all", label: "All Types", icon: <LayoutList className="h-3.5 w-3.5" /> },
        { value: "expense", label: "Expense", icon: <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" /> },
        { value: "income", label: "Income", icon: <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" /> },
        { value: "transfer", label: "Transfer", icon: <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" /> },
    ]

    const currentTypeFilter = activeTab === 'categories' ? categoryFilter : shopTypeFilter
    const setTypeFilter = activeTab === 'categories' ? setCategoryFilter : setShopTypeFilter
    const selectedTypeItem = typeFilterItems.find(i => i.value === currentTypeFilter)

    const renderHeader = () => (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 transition-all">
            {/* Left: Tabs */}
            <div className="flex items-center gap-6">
                <div className="flex bg-slate-100/80 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab("categories")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                            activeTab === "categories" ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Tag className="h-3.5 w-3.5" /> Categories ({activeCategoryCount})
                    </button>
                    <button
                        onClick={() => setActiveTab("shops")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                            activeTab === "shops" ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Store className="h-3.5 w-3.5" /> Shops ({activeShopCount})
                    </button>
                    <button
                        onClick={() => setActiveTab("archives")}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                            activeTab === "archives" ? "bg-orange-500 text-white shadow-md shadow-orange-100" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Archive className="h-3.5 w-3.5" /> Archived ({archivedCount})
                    </button>
                </div>
            </div>

            {/* Middle: Bulk Actions (Absolute or centered) */}
            <div className="flex-1 flex items-center justify-center min-w-0">
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] font-black uppercase text-slate-400 mr-2 whitespace-nowrap">{selectedIds.size} SELECTED</span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkArchive}
                                className="h-8 px-3 text-[10px] font-black uppercase gap-2 border-slate-200 hover:bg-white transition-all rounded-lg"
                            >
                                {activeTab === "archives" ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                                {activeTab === "archives" ? "Unarchive" : "Archive"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="h-8 px-3 text-[10px] font-black uppercase gap-2 border-rose-100 text-rose-600 hover:bg-rose-50 transition-all rounded-lg"
                            >
                                <Trash2 className="h-3 w-3 text-rose-500" />
                                Delete
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Filters + Actions */}
            <div className="flex items-center gap-3">
                {/* Year Selector */}
                <div
                    className="w-[85px] shrink-0"
                    onMouseEnter={() => setIsYearOpen(true)}
                    onMouseLeave={() => setIsYearOpen(false)}
                >
                    <Select
                        open={isYearOpen}
                        onOpenChange={setIsYearOpen}
                        items={years.map(y => ({ value: y, label: y }))}
                        value={selectedYear}
                        onValueChange={(v) => setSelectedYear(v || "")}
                        className="h-9 bg-slate-50 border-slate-200 font-bold text-[11px]"
                    />
                </div>

                {/* Type Filter Dropdown - Hover Show */}
                {(activeTab === "categories" || activeTab === "shops") && (
                    <div
                        className="min-w-[130px]"
                        onMouseEnter={() => setIsTypeFilterOpen(true)}
                        onMouseLeave={() => setIsTypeFilterOpen(false)}
                    >
                        <Select
                            open={isTypeFilterOpen}
                            onOpenChange={setIsTypeFilterOpen}
                            items={typeFilterItems.map(item => ({
                                value: item.value,
                                label: (
                                    <div className="flex items-center gap-2">
                                        {item.icon}
                                        <span className="font-bold text-[11px] uppercase tracking-wider">{item.label}</span>
                                    </div>
                                )
                            }))}
                            value={currentTypeFilter}
                            onValueChange={(v) => setTypeFilter(v || "all")}
                            className="h-9 bg-slate-50 border-slate-200"
                        />
                    </div>
                )}

                {activeTab === "shops" && (
                    <div
                        className="w-[180px] shrink-0"
                        onMouseEnter={() => setIsShopFilterOpen(true)}
                        onMouseLeave={() => setIsShopFilterOpen(false)}
                    >
                        <Combobox
                            open={isShopFilterOpen}
                            onOpenChange={setIsShopFilterOpen}
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
                            placeholder="Filter Category"
                            inputPlaceholder="Search categories..."
                            className="h-9 bg-slate-50 border-slate-200 font-bold text-[11px]"
                        />
                    </div>
                )}

                {/* Search */}
                <div className="relative w-[200px] shrink-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                        placeholder="Search..."
                        value={activeTab === 'categories' ? catSearch : activeTab === 'shops' ? shopSearch : archiveSearch}
                        onChange={(e) => {
                            if (activeTab === 'categories') setCatSearch(e.target.value)
                            else if (activeTab === 'shops') setShopSearch(e.target.value)
                            else setArchiveSearch(e.target.value)
                        }}
                        className="h-9 pl-8 bg-slate-50 border-slate-200 font-bold text-[11px] rounded-lg"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleQuickAddTxn}
                        variant="outline"
                        className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black uppercase tracking-[0.1em] text-[10px] px-3 rounded-lg shadow-sm active:scale-95 transition-all"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5 stroke-[3px]" />
                        Quick
                    </Button>

                    <Button
                        onClick={handleCreate}
                        className="h-9 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.1em] text-[10px] px-4 rounded-lg shadow-sm active:scale-95 transition-all"
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5 stroke-[3px]" />
                        Add
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

                <div className={cn(
                    "h-full px-6 py-6 pb-20",
                    activeTab === "archives" ? "overflow-auto" : "overflow-hidden"
                )}>
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
                                typeFilter={shopTypeFilter}
                                onArchive={handleArchiveShop}
                                onDelete={handleDeleteShop}
                                selectedIds={selectedIds}
                                onSelect={handleSelect}
                                onSelectAll={handleSelectAll}
                                stats={shopStats}
                                selectedYear={parseInt(selectedYear)}
                            />
                        </div>
                    )}

                    {activeTab === "archives" && (
                        <div className="h-full flex flex-col gap-6 p-6 overflow-y-auto">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] flex items-center gap-2">
                                        <Tag className="h-3.5 w-3.5" /> Archived Categories
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
                                    className="h-fit"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] flex items-center gap-2">
                                        <Store className="h-3.5 w-3.5" /> Archived Shops
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
                                    stats={shopStats}
                                    selectedYear={parseInt(selectedYear)}
                                    className="h-fit"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Slides ... */}
            <CategorySlide
                open={isCategoryDialogOpen}
                onOpenChange={(open) => {
                    setIsCategoryDialogOpen(open)
                    if (!open) setIsCreatingCategoryFromShop(false)
                }}
                category={selectedCategory}
                defaultType={categoryFilter === "all" || categoryFilter === "transfer" ? "expense" : categoryFilter as any}
                onSuccess={(newCatId) => {
                    refreshCategories();
                    setIsCategoryDialogOpen(false);
                    loadStats();
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
                    loadStats();
                }}
                onCreateCategory={() => {
                    setIsCreatingCategoryFromShop(true)
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
                        const typeToMatch = (deleteDialog.entity as Category)?.type || categories.find(cat => deleteDialog.ids?.includes(cat.id))?.type
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
                    loadStats()
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
                    loadStats()
                }}
            />
        </div>
    )
}
