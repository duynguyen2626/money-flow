"use client"

import { useState, useEffect, KeyboardEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, X, Plus, Hash, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet"
import { UnsavedChangesDialog } from "@/components/transaction/slide-v2/unsaved-changes-dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Category } from "@/types/moneyflow.types"
import { createCategory, updateCategory } from "@/services/category.service"
import { cn } from "@/lib/utils"

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["expense", "income", "transfer"]),
    icon: z.string().optional(),
    image_url: z.string().optional(),
    kind: z.enum(["internal", "external"]),
})

interface CategorySlideProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    category?: Category | null
    defaultType?: "expense" | "income" | "transfer"
    defaultKind?: "internal" | "external"
    onSuccess?: (newCategoryId?: string) => void
    onBack?: () => void
}

export function CategorySlide({
    open,
    onOpenChange,
    category,
    defaultType = "expense",
    defaultKind,
    onSuccess,
    onBack,
}: CategorySlideProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
    const [pendingCloseAction, setPendingCloseAction] = useState<"close" | "back" | null>(null)
    const [mccCodes, setMccCodes] = useState<string[]>([])
    const [mccInput, setMccInput] = useState("")

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            type: defaultType,
            icon: "",
            image_url: "",
            kind: defaultKind || (defaultType === 'transfer' ? 'internal' : 'external'),
        },
    })

    const hasChanges = form.formState.isDirty || mccCodes.length > (category?.mcc_codes?.length || 0) || (category && JSON.stringify(mccCodes) !== JSON.stringify(category.mcc_codes)) || mccInput !== ""

    const handleBack = () => {
        if (hasChanges) {
            setPendingCloseAction("back")
            setShowUnsavedDialog(true)
        } else {
            onBack?.()
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && hasChanges) {
            setPendingCloseAction("close")
            setShowUnsavedDialog(true)
        } else {
            onOpenChange(newOpen)
        }
    }

    const confirmDiscard = () => {
        setShowUnsavedDialog(false)
        if (pendingCloseAction === "back") {
            onBack?.()
        } else {
            onOpenChange(false)
        }
        setPendingCloseAction(null)
    }

    useEffect(() => {
        if (open) {
            if (category) {
                form.reset({
                    name: category.name,
                    type: (category.type as any) || "expense",
                    icon: category.icon || "",
                    image_url: category.image_url || "",
                    kind: (category.kind as any) || (category.type === 'transfer' ? 'internal' : 'external'),
                })
                setMccCodes(Array.isArray(category.mcc_codes) ? category.mcc_codes : [])
            } else {
                form.reset({
                    name: "",
                    type: defaultType,
                    icon: "",
                    image_url: "",
                    kind: defaultKind || (defaultType === 'transfer' ? 'internal' : 'external'),
                })
                setMccCodes([])
            }
            setMccInput("")
        }
    }, [category, defaultType, defaultKind, form, open])

    const handleAddMcc = () => {
        const trimmed = mccInput.trim().replace(/[^0-9]/g, "")
        if (trimmed && !mccCodes.includes(trimmed)) {
            setMccCodes([...mccCodes, trimmed])
            setMccInput("")
        } else {
            setMccInput("")
        }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            handleAddMcc()
        }
    }

    const removeMcc = (code: string) => {
        setMccCodes(mccCodes.filter(c => c !== code))
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const payload = {
                ...values,
                mcc_codes: mccCodes.length > 0 ? mccCodes : undefined,
            }

            if (category) {
                await updateCategory(category.id, payload)
                toast.success("Category updated")
                onSuccess?.()
            } else {
                const newCategory = await createCategory(payload)
                toast.success("Category created")
                onSuccess?.(newCategory?.id)
            }
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent
                    side="right"
                    className="sm:max-w-[480px] p-0 flex flex-col h-full bg-slate-50 border-l border-slate-200"
                    zIndex={60}
                >
                    <SheetHeader className="px-6 py-6 bg-white border-b sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            {onBack && (
                                <button
                                    onClick={handleBack}
                                    className="h-8 w-8 flex items-center justify-center -ml-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90"
                                    title="Back"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                            )}
                            <div className="min-w-0 flex-1">
                                <SheetTitle className="text-xl font-black text-slate-900 leading-tight">
                                    {category ? "Edit Category" : "New Category"}
                                </SheetTitle>
                                <SheetDescription className="text-xs font-medium text-slate-500 mt-1">
                                    {category ? "Update category details." : "Create a new category for your transactions."}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-none">
                        <Form {...form}>
                            <form id="category-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Food & Dining" {...field} className="h-11 bg-white border-slate-200 focus:ring-blue-500 font-bold" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Type</FormLabel>
                                            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                                                {["expense", "income", "transfer"].map((t) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => field.onChange(t)}
                                                        className={cn(
                                                            "flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all border",
                                                            field.value === t
                                                                ? "bg-white border-slate-200 text-slate-900 shadow-sm"
                                                                : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                                                        )}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="kind"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-white shadow-sm transition-all hover:border-slate-300">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-sm font-black text-slate-900">Category Kind</FormLabel>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                        {field.value === 'external' ? 'External (People, Shops)' : 'Internal (Transfers, Accounts)'}
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={field.value === 'internal'}
                                                    onCheckedChange={(checked) => field.onChange(checked ? 'internal' : 'external')}
                                                />
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="icon"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Icon (Emoji)</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="🍔" {...field} value={field.value || ""} className="h-11 bg-white border-slate-200 text-lg" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="image_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Image URL</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://..." {...field} value={field.value || ""} className="h-11 bg-white border-slate-200 text-xs" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* MCC Section Enhanced */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                            <Hash className="h-3 w-3 text-slate-400" /> MCC Codes (Merchants)
                                        </FormLabel>
                                        {mccCodes.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setMccCodes([])}
                                                className="text-[9px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-tighter"
                                            >
                                                Clear All
                                            </button>
                                        )}
                                    </div>

                                    <div className="min-h-[120px] p-3 rounded-xl border border-slate-200 bg-white shadow-inner flex flex-wrap gap-2 content-start group focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all cursor-text" onClick={() => document.getElementById('mcc-input')?.focus()}>
                                        {mccCodes.map(code => (
                                            <div
                                                key={code}
                                                onDoubleClick={() => {
                                                    setMccInput(code);
                                                    removeMcc(code);
                                                }}
                                                title="Double-click to edit"
                                                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-black text-slate-700 hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 group/mcc cursor-pointer"
                                            >
                                                <span className="font-mono tracking-wider">{code}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeMcc(code); }}
                                                    className="text-slate-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}

                                        <div className="flex-1 min-w-[80px]">
                                            <Input
                                                id="mcc-input"
                                                value={mccInput}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                                    if (val.length <= 4) {
                                                        setMccInput(val);
                                                    }
                                                }}
                                                onKeyDown={handleKeyDown}
                                                onBlur={handleAddMcc}
                                                placeholder={mccCodes.length === 0 ? "Type code (e.g. 5411) & Enter" : "..."}
                                                className="h-7 border-none focus-visible:ring-0 px-0 text-[11px] font-bold placeholder:text-slate-300 bg-transparent"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        * TIP: These codes are used to automatically match credit card rewards tiers based on merchant codes.
                                    </p>
                                </div>
                            </form>
                        </Form>
                    </div>

                    <SheetFooter className="p-6 bg-white border-t shrink-0">
                        <Button
                            type="submit"
                            form="category-form"
                            disabled={isLoading}
                            className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-[0.2em] h-12 shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {category ? "Update Category" : "Save Category"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <UnsavedChangesDialog
                open={showUnsavedDialog}
                onOpenChange={setShowUnsavedDialog}
                onConfirm={confirmDiscard}
                onCancel={() => {
                    setShowUnsavedDialog(false)
                    setPendingCloseAction(null)
                }}
            />
        </>
    )
}
