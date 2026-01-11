"use client"

import React, { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Check, ChevronsUpDown, ArrowRight, Wallet, User as UserIcon, Tag, Store } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Account, Category, Person, Shop, TransactionWithDetails } from "@/types/moneyflow.types"
import { updateTransaction } from "@/actions/transaction-actions"
import { toast } from "sonner"
import { SmartAmountInput } from "@/components/ui/smart-amount-input"

interface EditableTempTableProps {
    transactions: TransactionWithDetails[]
    accounts: Account[]
    categories: Category[]
    shops: Shop[]
    people: Person[]
}

export function EditableTempTable({
    transactions,
    accounts,
    categories,
    shops,
    people
}: EditableTempTableProps) {
    // Internal state to manage optimistic updates
    const [internalTransactions, setInternalTransactions] = useState(transactions);

    useEffect(() => {
        setInternalTransactions(transactions);
    }, [transactions]);

    const handleUpdateField = async (txnId: string, field: string, value: any) => {
        // Optimistic update
        setInternalTransactions(prev =>
            prev.map(t => t.id === txnId ? { ...t, [field]: value } : t)
        );

        const currentTxn = internalTransactions.find(t => t.id === txnId);
        if (!currentTxn) return;

        try {
            const payload: any = {
                occurred_at: field === 'occurred_at' ? value : currentTxn.occurred_at,
                note: field === 'note' ? value : (currentTxn.note ?? ""),
                type: field === 'type' ? value : currentTxn.type,
                amount: field === 'amount' ? Math.abs(value) : (typeof currentTxn.original_amount === 'number' ? currentTxn.original_amount : currentTxn.amount),
                source_account_id: field === 'account_id' ? value : currentTxn.account_id,
                category_id: field === 'category_id' ? value : currentTxn.category_id,
                person_id: field === 'person_id' ? value : currentTxn.person_id,
                shop_id: field === 'shop_id' ? value : currentTxn.shop_id,
                tag: currentTxn.tag ?? "",
            }
            const success = await updateTransaction(txnId, payload)
            if (success) {
                toast.success("Saved", { position: 'bottom-center' })
            } else {
                toast.error("Failed to save")
                // Revert optimistic update on failure
                setInternalTransactions(transactions);
            }
        } catch (e) {
            toast.error("Error saving")
            // Revert optimistic update on error
            setInternalTransactions(transactions);
        }
    }

    if (internalTransactions.length === 0) return null

    return (
        <div className="space-y-6">
            {internalTransactions.map(txn => (
                <Card key={txn.id} className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <CardHeader className="bg-slate-50/50 px-6 py-4 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="px-3 py-1 bg-white text-slate-600 capitalize">
                                    {txn.type}
                                </Badge>
                                <span className="text-sm text-slate-400">
                                    {format(new Date(txn.occurred_at), "PPP")}
                                </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono">{txn.id.slice(0, 8)}</div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 divide-y md:divide-y-0 lg:divide-x divide-slate-100">
                            {/* Account & Amount (Large) */}
                            <div className="col-span-12 lg:col-span-4 p-6 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</label>
                                    <EntitySelect
                                        value={txn.account_id}
                                        items={accounts.map(a => ({ id: a.id, name: a.name, imageUrl: a.image_url }))}
                                        onChange={(id) => handleUpdateField(txn.id, 'account_id', id)}
                                        placeholder="Select Account"
                                        icon={<Wallet className="w-4 h-4 text-slate-400" />}
                                        className="h-10 border-slate-200 bg-slate-50/50 hover:bg-white transition-colors"
                                        showAvatar
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="relative">
                                        <SmartAmountInput
                                            value={typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount}
                                            onChange={(v) => handleUpdateField(txn.id, 'amount', v)}
                                            className="text-2xl font-bold h-12 border-0 px-0 shadow-none focus-visible:ring-0 placeholder:text-slate-300"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Details (Grid) */}
                            <div className="col-span-12 lg:col-span-4 p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                                        <EntitySelect
                                            value={txn.category_id}
                                            items={categories.map(c => ({ id: c.id, name: c.name }))}
                                            onChange={(id) => handleUpdateField(txn.id, 'category_id', id)}
                                            placeholder="Category"
                                            icon={<Tag className="w-3 h-3" />}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shop</label>
                                        <EntitySelect
                                            value={txn.shop_id}
                                            items={shops.map(s => ({ id: s.id, name: s.name, imageUrl: s.image_url }))}
                                            onChange={(id) => handleUpdateField(txn.id, 'shop_id', id)}
                                            placeholder="Shop"
                                            icon={<Store className="w-3 h-3" />}
                                            showAvatar
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Person (Debt/Split)</label>
                                    <EntitySelect
                                        value={txn.person_id}
                                        items={people.map(p => ({ id: p.id, name: p.name, imageUrl: p.image_url }))}
                                        onChange={(id) => handleUpdateField(txn.id, 'person_id', id)}
                                        placeholder="Assign Person"
                                        allowClear
                                        icon={<UserIcon className="w-4 h-4" />}
                                        showAvatar
                                    />
                                </div>
                            </div>

                            {/* Note & Date */}
                            <div className="col-span-12 lg:col-span-4 p-6 space-y-4 bg-slate-50/30">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
                                    <SimpleDatePicker
                                        date={new Date(txn.occurred_at)}
                                        onSelect={(d) => d && handleUpdateField(txn.id, 'occurred_at', d.toISOString())}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Note</label>
                                    <Input
                                        defaultValue={txn.note || ""}
                                        onBlur={(e) => handleUpdateField(txn.id, 'note', e.target.value)}
                                        className="bg-white border-slate-200"
                                        placeholder="Add a note..."
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

interface EntitySelectProps {
    value?: string | null
    items: { id: string; name: string; imageUrl?: string | null }[]
    onChange: (id: string) => void
    placeholder: string
    allowClear?: boolean
    icon?: React.ReactNode
    className?: string
    showAvatar?: boolean
}

function EntitySelect({ value, items, onChange, placeholder, icon, className, allowClear, showAvatar }: EntitySelectProps) {
    const [open, setOpen] = useState(false)
    const selected = items.find((i) => i.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal text-slate-700", !selected && "text-slate-500", className)}
                >
                    <div className="flex items-center gap-2 truncate">
                        {showAvatar && selected?.imageUrl ? (
                            <Avatar className="h-6 w-6 rounded-md flex-shrink-0">
                                <AvatarImage src={selected.imageUrl} alt={selected.name} className="object-contain" />
                                <AvatarFallback className="rounded-md text-xs">{selected.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        ) : icon ? (
                            <span className="text-slate-400">{icon}</span>
                        ) : null}
                        <span className="truncate">{selected ? selected.name : placeholder}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Search ${placeholder}...`} />
                    <CommandList>
                        <CommandEmpty>No results.</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem key={item.id} value={item.name} onSelect={() => { onChange(item.id); setOpen(false) }}>
                                    {showAvatar && item.imageUrl && (
                                        <Avatar className="mr-2 h-8 w-8 rounded-md flex-shrink-0">
                                            <AvatarImage src={item.imageUrl} alt={item.name} className="object-contain" />
                                            <AvatarFallback className="rounded-md text-xs">{item.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <Check className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")} />
                                    {item.name}
                                </CommandItem>
                            ))}
                            {allowClear && value && (
                                <CommandItem onSelect={() => { onChange(''); setOpen(false) }}>
                                    Clear Selection
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

function SimpleDatePicker({ date, onSelect }: { date?: Date, onSelect: (d: Date | undefined) => void }) {
    const dateStr = date ? format(date, "yyyy-MM-dd") : ""
    return (
        <Input
            type="date"
            value={dateStr}
            onChange={(e) => {
                const d = e.target.valueAsDate
                onSelect(d || undefined)
            }}
            className="w-full justify-start text-left font-normal"
        />
    )
}

