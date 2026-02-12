"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategorySlide } from "@/components/accounts/v2/CategorySlide";
import { getCategories } from "@/services/category.service"
import { Category } from "@/types/moneyflow.types"

import { CategoryTable } from "@/components/moneyflow/CategoryTable"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
    const [activeTab, setActiveTab] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    const fetchCategories = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await getCategories()
            setCategories(data)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    const handleEdit = (category: Category) => {
        setSelectedCategory(category)
        setIsDialogOpen(true)
    }

    const handleCreate = () => {
        setSelectedCategory(null)
        setIsDialogOpen(true)
    }

    const filterOptions = [
        { value: "all", label: "All Types" },
        { value: "expense", label: "Expense" },
        { value: "income", label: "Income" },
        { value: "transfer", label: "Transfer" },
    ]

    return (
        <div className="w-full min-h-full flex flex-col bg-white">
            <div className="px-6 py-8 border-b border-slate-100 bg-slate-50/30">
                <div className="max-w-[1800px] mx-auto space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Categories</h1>
                            <p className="text-sm font-medium text-slate-500">Manage transaction categories, MCC mappings, and spending rules.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                                {isLoading ? "Fetching..." : `${categories.length} Categories`}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                        {/* Type Filter */}
                        <div className="w-full md:w-48">
                            <Select
                                items={filterOptions}
                                value={activeTab}
                                onValueChange={(v) => setActiveTab(v || "all")}
                                className="h-11 rounded-xl border-none bg-slate-50 hover:bg-slate-100 transition-colors font-bold uppercase text-[11px] tracking-wider"
                            />
                        </div>

                        {/* Search Bar */}
                        <div className="flex-1 relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name or MCC code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-11 pl-11 pr-11 bg-slate-50 hover:bg-slate-100 border-none transition-all focus:ring-2 focus:ring-blue-100 rounded-xl font-medium"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-all"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Add Button */}
                        <Button
                            onClick={handleCreate}
                            className="w-full md:w-auto bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.1em] text-xs px-8 h-11 rounded-xl shadow-lg shadow-slate-200 active:scale-95 transition-all shrink-0"
                        >
                            <Plus className="mr-2 h-4 w-4 stroke-[3px]" />
                            Add Category
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-6 py-8">
                <div className="max-w-[1800px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {isLoading ? (
                        <div className="h-96 flex items-center justify-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-100" />
                                <div className="space-y-1">
                                    <span className="block text-sm font-black text-slate-900 uppercase tracking-widest">Loading Repository</span>
                                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-tighter">Synchronizing Categories...</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <CategoryTable
                            categories={categories}
                            onEdit={handleEdit}
                            activeTab={activeTab}
                            searchQuery={searchQuery}
                        />
                    )}
                </div>
            </div>

            <CategorySlide
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                category={selectedCategory}
                defaultType={activeTab === "all" || activeTab === "transfer" ? "expense" : activeTab as any}
                onSuccess={() => {
                    fetchCategories();
                    setIsDialogOpen(false);
                }}
            />
        </div>
    )
}
