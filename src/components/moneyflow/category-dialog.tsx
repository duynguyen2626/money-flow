"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"


import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["expense", "income", "transfer"]),
    icon: z.string().optional(),
    logo_url: z.string().optional(),
    mcc_codes: z.string().optional(),
    kind: z.enum(["internal", "external"]).optional(),
})

interface CategoryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    category?: Category | null
    defaultType?: "expense" | "income" | "transfer"
    onSuccess: () => void
}

export function CategoryDialog({
    open,
    onOpenChange,
    category,
    defaultType = "expense",
    onSuccess,
}: CategoryDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            type: defaultType,
            icon: "",
            logo_url: "",
            mcc_codes: "",
            kind: "internal", // Default to internal
        },
    })

    useEffect(() => {
        if (category) {
            const mccCodesStr = Array.isArray(category.mcc_codes)
                ? category.mcc_codes.join(", ")
                : "";
            form.reset({
                name: category.name,
                type: category.type,
                icon: category.icon || "",
                logo_url: category.logo_url || "",
                mcc_codes: mccCodesStr,
                kind: category.kind || (category.type === 'transfer' ? 'internal' : 'external'),
            })
        } else {
            form.reset({
                name: "",
                type: defaultType,
                icon: "",
                logo_url: "",
                mcc_codes: "",
                kind: 'internal', // Default to internal
            })
        }
    }, [category, defaultType, form, open])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            // Convert comma-separated MCC codes to array
            const mccCodesArray = values.mcc_codes
                ? values.mcc_codes.split(",").map(code => code.trim()).filter(Boolean)
                : [];

            const payload = {
                name: values.name,
                type: values.type,
                icon: values.icon,
                logo_url: values.logo_url,
                mcc_codes: mccCodesArray.length > 0 ? mccCodesArray : undefined,
                kind: values.kind,
            };

            if (category) {
                await updateCategory(category.id, payload)
                toast.success("Category updated")
            } else {
                await createCategory(payload)
                toast.success("Category created")
            }
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{category ? "Edit Category" : "New Category"}</DialogTitle>
                    <DialogDescription>
                        {category ? "Update category details." : "Create a new category for your transactions."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Food" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="kind"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 bg-slate-50">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Kind</FormLabel>
                                            <DialogDescription>
                                                {field.value === 'external' ? 'External (People, Shops)' : 'Internal (Transfers, Accounts)'}
                                            </DialogDescription>
                                        </div>
                                        <Switch
                                            checked={field.value === 'external'}
                                            onCheckedChange={(checked) => field.onChange(checked ? 'external' : 'internal')}
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
                                        <FormLabel>Icon (Emoji)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="🍔" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="logo_url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="mcc_codes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mã MCC (Ngăn cách bởi dấu phẩy)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="5411, 5812" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
