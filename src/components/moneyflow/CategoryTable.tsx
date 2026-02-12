"use client"

import React, { useState } from 'react'
import { Category } from "@/types/moneyflow.types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit2, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CategoryTableProps {
    categories: Category[]
    onEdit: (category: Category) => void
    activeTab: string
    searchQuery: string
}

export function CategoryTable({ categories, onEdit, activeTab, searchQuery }: CategoryTableProps) {
    const filteredCategories = categories.filter(cat => {
        const matchesTab = activeTab === "all"
            ? true
            : activeTab === "transfer"
                ? (cat.type === "transfer" || cat.name.toLowerCase().includes("transfer"))
                : cat.type === activeTab

        const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (cat.mcc_codes && cat.mcc_codes.some(code => code.includes(searchQuery)))

        return matchesTab && matchesSearch
    })

    const internalCategories = filteredCategories.filter(cat => cat.kind === 'internal')
    const externalCategories = filteredCategories.filter(cat => cat.kind !== 'internal')

    const renderRows = (cats: Category[]) => {
        return cats.map((category) => (
            <TableRow key={category.id} className="group hover:bg-slate-50/80 transition-colors border-slate-100">
                <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-none overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {category.image_url ? (
                                <img src={category.image_url} alt="" className="w-full h-full object-contain p-1" />
                            ) : (
                                <span className="text-xl font-black text-slate-300 uppercase">{category.name[0]}</span>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0 gap-0.5">
                            <span className="font-extrabold text-slate-900 text-base truncate">{category.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider truncate">{category.id.slice(0, 8)}</span>
                        </div>
                    </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                    <Badge
                        variant="secondary"
                        className={cn(
                            "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-tighter border shadow-sm",
                            category.type === 'expense' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                category.type === 'income' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                    "bg-blue-50 text-blue-600 border-blue-100"
                        )}
                    >
                        {category.type}
                    </Badge>
                </TableCell>
                <TableCell className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                        {category.mcc_codes && category.mcc_codes.length > 0 ? (
                            category.mcc_codes.map(code => (
                                <Badge key={code} variant="outline" className="text-[11px] font-mono px-2 py-0.5 bg-slate-50 border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors">
                                    {code}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-[11px] text-slate-300 italic font-medium">None</span>
                        )}
                    </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(category)}
                        className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm border border-transparent hover:border-blue-100"
                    >
                        <Edit2 className="h-4.5 w-4.5" />
                    </Button>
                </TableCell>
            </TableRow>
        ))
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm w-full h-[calc(100vh-250px)] flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1">
                <Table className="relative w-full border-collapse">
                    <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md shadow-sm">
                        <TableRow className="hover:bg-transparent border-slate-100 uppercase text-[11px] font-black text-slate-500 tracking-[0.1em]">
                            <TableHead className="w-[350px] h-14 px-6">Category</TableHead>
                            <TableHead className="h-14 px-6">Type</TableHead>
                            <TableHead className="h-14 px-6">MCC Codes</TableHead>
                            <TableHead className="w-[100px] text-right h-14 px-6">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCategories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-48 text-center text-slate-400 text-sm font-medium italic">
                                    No categories found matching your criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            <>
                                {internalCategories.length > 0 && (
                                    <>
                                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                            <TableCell colSpan={4} className="px-6 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70">Internal Categories</span>
                                                    <div className="flex-1 h-px bg-indigo-100/50 ml-2" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {renderRows(internalCategories)}
                                    </>
                                )}

                                {externalCategories.length > 0 && (
                                    <>
                                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                            <TableCell colSpan={4} className="px-6 py-2.5 pt-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70">External Categories</span>
                                                    <div className="flex-1 h-px bg-slate-100 ml-2" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {renderRows(externalCategories)}
                                    </>
                                )}
                            </>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
