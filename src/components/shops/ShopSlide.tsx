"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, ArrowLeft, Store, Image as ImageIcon } from "lucide-react"
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
// import { Select } from "@/components/ui/select"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { Shop, Category } from "@/types/moneyflow.types"
import { createShop, updateShop } from "@/services/shop.service"
import { cn } from "@/lib/utils"

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    image_url: z.string().optional(),
    default_category_id: z.string().optional(),
})

interface ShopSlideProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    shop?: Shop | null
    categories: Category[]
    onSuccess?: (newShopId?: string) => void
    onCreateCategory?: () => void
    onBack?: () => void
    zIndex?: number
    defaultCategoryId?: string
}

export function ShopSlide({
    open,
    onOpenChange,
    shop,
    categories,
    onSuccess,
    onCreateCategory,
    onBack,
    zIndex = 700,
    defaultCategoryId,
}: ShopSlideProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
    const [pendingCloseAction, setPendingCloseAction] = useState<"close" | "back" | null>(null)
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            image_url: "",
            default_category_id: "none",
        },
    })

    const hasChanges = form.formState.isDirty

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
            if (shop) {
                form.reset({
                    name: shop.name || "",
                    image_url: shop.image_url || "",
                    default_category_id: shop.default_category_id || "none",
                })
            } else {
                form.reset({
                    name: "",
                    image_url: "",
                    default_category_id: defaultCategoryId || "none",
                })
            }
        }
    }, [shop, form, open, defaultCategoryId])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const payload = {
                ...values,
                default_category_id: values.default_category_id === "none" ? null : values.default_category_id,
            }

            if (shop) {
                await updateShop(shop.id, payload)
                toast.success("Shop updated")
                onSuccess?.()
            } else {
                const newShop = await createShop(payload)
                toast.success("Shop created")
                onSuccess?.(newShop?.id)
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
                    zIndex={zIndex}
                    onPointerDownOutside={(e) => {
                        if (hasChanges) {
                            e.preventDefault()
                            setPendingCloseAction("close")
                            setShowUnsavedDialog(true)
                        }
                    }}
                    onEscapeKeyDown={(e) => {
                        if (hasChanges) {
                            e.preventDefault()
                            setPendingCloseAction("close")
                            setShowUnsavedDialog(true)
                        }
                    }}
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
                            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm mr-2 shrink-0">
                                <Store className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <SheetTitle className="text-xl font-black text-slate-900 leading-tight">
                                    {shop ? "Edit Shop" : "New Shop"}
                                </SheetTitle>
                                <SheetDescription className="text-xs font-medium text-slate-500 mt-1">
                                    {shop ? "Update merchant details." : "Add a new merchant to track expenses."}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-none">
                        <Form {...form}>
                            <form id="shop-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Shop Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. Amazon, Starbucks"
                                                    {...field}
                                                    className="h-11 bg-white border-slate-200 focus:ring-blue-500 font-bold text-base"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <ImageIcon className="h-4 w-4 text-slate-400" />
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Appearance</h3>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="image_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Image URL</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="https://..."
                                                        {...field}
                                                        value={field.value || ""}
                                                        className="h-9 bg-slate-50 border-slate-200 text-xs font-medium"
                                                    />
                                                </FormControl>
                                                <FormMessage />

                                                <div className="mt-4 flex justify-center bg-slate-50/50 p-4 rounded-xl border border-slate-200 border-dashed">
                                                    {field.value ? (
                                                        <div className="relative h-20 w-20 rounded-xl overflow-hidden border-4 border-white shadow-md ring-1 ring-slate-200">
                                                            <img
                                                                src={field.value}
                                                                alt="Shop Preview"
                                                                className="h-full w-full object-cover"
                                                                onError={(e) => e.currentTarget.style.display = 'none'}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="h-20 w-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                                                            <Store className="h-8 w-8 opacity-50" />
                                                        </div>
                                                    )}
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Hash className="h-4 w-4 text-slate-400" />
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Automation</h3>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="default_category_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Default Category</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className={cn(
                                                                    "w-full justify-between h-11 bg-slate-50 border-slate-200 font-medium hover:bg-slate-100",
                                                                    !field.value && "text-slate-500"
                                                                )}
                                                            >
                                                                {field.value && field.value !== "none" ? (
                                                                    (() => {
                                                                        const cat = categories.find((c) => c.id === field.value);
                                                                        return cat ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <span>{cat.icon || "📁"}</span>
                                                                                <span className="font-medium">{cat.name}</span>
                                                                            </div>
                                                                        ) : "Select category";
                                                                    })()
                                                                ) : (
                                                                    <span className="text-slate-500 italic">No default category</span>
                                                                )}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Search category..." />
                                                            <CommandList>
                                                                <CommandEmpty>No category found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    <CommandItem
                                                                        value="none"
                                                                        onSelect={() => {
                                                                            form.setValue("default_category_id", "none", { shouldDirty: true })
                                                                        }}
                                                                        className="text-slate-500 italic"
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                field.value === "none" ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        No default category
                                                                    </CommandItem>
                                                                    {categories.map((cat) => (
                                                                        <CommandItem
                                                                            key={cat.id}
                                                                            value={cat.name}
                                                                            onSelect={() => {
                                                                                form.setValue("default_category_id", cat.id, { shouldDirty: true })
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    field.value === cat.id ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            <span className="mr-2">{cat.icon || "📁"}</span>
                                                                            {cat.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                            {onCreateCategory && (
                                                                <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                        onClick={() => onCreateCategory()}
                                                                    >
                                                                        <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                                                        Create New Category
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <SheetDescription className="text-[10px] text-slate-400 font-medium mt-1">
                                                    Automatically assign this category when creating transactions with this shop.
                                                </SheetDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </form>
                        </Form>
                    </div>

                    <SheetFooter className="p-6 bg-white border-t shrink-0">
                        <Button
                            type="submit"
                            form="shop-form"
                            disabled={isLoading || !hasChanges}
                            className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-[0.2em] h-12 shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {shop ? "Update Shop" : "Create Shop"}
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

function Hash({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="4" x2="20" y1="9" y2="9" />
            <line x1="4" x2="20" y1="15" y2="15" />
            <line x1="10" x2="8" y1="3" y2="21" />
            <line x1="16" x2="14" y1="3" y2="21" />
        </svg>
    )
}
