"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategoryDialog } from "@/components/moneyflow/category-dialog"
import { getCategories } from "@/services/category.service"
import { Category } from "@/types/moneyflow.types"

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
    const [activeTab, setActiveTab] = useState<"expense" | "income" | "transfer">("expense")

    // Fixed: Use useCallback to memoize fetchCategories
    const fetchCategories = useCallback(async () => {
        const data = await getCategories()
        setCategories(data)
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

    const filteredCategories = categories.filter(cat => {
        if (activeTab === "transfer") {
            // Show categories that look like transfer
            return cat.name.toLowerCase().includes("transfer")
        }
        return cat.type === activeTab
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList>
                    <TabsTrigger value="expense">Expense</TabsTrigger>
                    <TabsTrigger value="income">Income</TabsTrigger>
                    <TabsTrigger value="transfer">Transfer</TabsTrigger>
                </TabsList>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
                    {filteredCategories.map((category) => (
                        <Card
                            key={category.id}
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => handleEdit(category)}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-6 gap-3 text-center">
                                <div className="text-4xl">
                                    {category.image_url ? (
                                        <img
                                            src={category.image_url}
                                            alt={category.name}
                                            className="w-10 h-10 object-contain"
                                        />
                                    ) : (
                                        category.icon || "📁"
                                    )}
                                </div>
                                <div className="font-medium text-sm">{category.name}</div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredCategories.length === 0 && (
                        <div className="col-span-full text-center text-slate-500 py-10">
                            No categories found.
                        </div>
                    )}
                </div>
            </Tabs>

            <CategoryDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                category={selectedCategory}
                defaultType={activeTab === "transfer" ? "expense" : activeTab}
                onSuccess={fetchCategories}
            />
        </div>
    )
}
