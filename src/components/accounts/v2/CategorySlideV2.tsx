"use client"

import React, { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/services/category.service";
import { Category } from "@/types/moneyflow.types";

interface CategorySlideV2Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: Category | null;
    defaultType?: "expense" | "income" | "transfer";
    onSuccess?: (newCategoryId?: string) => void;
    onBack?: () => void;
}

export function CategorySlideV2({
    open,
    onOpenChange,
    category,
    defaultType = "expense",
    onSuccess,
    onBack,
}: CategorySlideV2Props) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState<"expense" | "income" | "transfer">(defaultType);
    const [icon, setIcon] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [mccCodes, setMccCodes] = useState("");
    const [kind, setKind] = useState<"internal" | "external">("internal");

    useEffect(() => {
        if (category) {
            setName(category.name);
            setType(category.type as any);
            setIcon(category.icon || "");
            setImageUrl(category.image_url || "");
            setMccCodes(Array.isArray(category.mcc_codes) ? category.mcc_codes.join(", ") : "");
            setKind(category.kind || "internal");
        } else {
            setName("");
            setType(defaultType);
            setIcon("");
            setImageUrl("");
            setMccCodes("");
            setKind("internal");
        }
    }, [category, defaultType, open]);

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Category name is required");
            return;
        }

        setLoading(true);
        try {
            const mccArray = mccCodes
                .split(",")
                .map((code) => code.trim())
                .filter((code) => code.length > 0);

            if (category) {
                await updateCategory(category.id, {
                    name: name.trim(),
                    type,
                    icon: icon || null,
                    image_url: imageUrl || null,
                    mcc_codes: mccArray,
                    kind,
                });
                toast.success("Category updated");
            } else {
                const newCat = await createCategory({
                    name: name.trim(),
                    type,
                    icon: icon || null,
                    image_url: imageUrl || null,
                    mcc_codes: mccArray,
                    kind,
                });
                toast.success("Category created");
                onSuccess?.(newCat.id);
            }
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to save category");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col gap-0 border-l border-slate-200">
                <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex items-start justify-between">
                    <div className="flex-1">
                        <SheetHeader className="text-left">
                            <SheetTitle className="text-xl font-black text-slate-900">
                                {category ? "Edit Category" : "New Category"}
                            </SheetTitle>
                            <SheetDescription className="text-xs font-medium text-slate-500 mt-1">
                                {category ? "Update category details" : "Create a new category for your transactions"}
                            </SheetDescription>
                        </SheetHeader>
                    </div>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="ml-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
                            title="Back to Account"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-600 tracking-wider">Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Food & Dining"
                            className="h-10 border-slate-200"
                        />
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-600 tracking-wider">Type</Label>
                        <div className="flex gap-2">
                            {["expense", "income", "transfer"].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t as any)}
                                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border ${
                                        type === t
                                            ? "bg-blue-600 border-blue-700 text-white"
                                            : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Kind (Internal/External) */}
                    {type === "transfer" && (
                        <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase text-slate-600 tracking-wider">Internal Transfer</Label>
                                <Switch
                                    checked={kind === "internal"}
                                    onCheckedChange={(checked) => setKind(checked ? "internal" : "external")}
                                />
                            </div>
                            <p className="text-[10px] text-slate-500">
                                {kind === "internal" ? "Between your own accounts" : "To external accounts"}
                            </p>
                        </div>
                    )}

                    {/* Icon, Image URL, MCC Codes - All in one line */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-600 tracking-wider">Icon & Details</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-medium">Icon (Emoji)</label>
                                <Input
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    placeholder="🍔"
                                    maxLength={2}
                                    className="h-9 text-center text-lg border-slate-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-medium">Image URL</label>
                                <Input
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="h-9 text-xs border-slate-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-medium">MCC Codes</label>
                                <Input
                                    value={mccCodes}
                                    onChange={(e) => setMccCodes(e.target.value)}
                                    placeholder="5411, 5812"
                                    className="h-9 text-xs border-slate-200"
                                />
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-400">Enter MCC codes separated by commas</p>
                    </div>
                </div>

                <SheetFooter className="p-6 bg-white border-t border-slate-200 sm:justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="h-10 px-6 font-bold text-slate-600"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading || !name.trim()}
                        className="h-10 px-8 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-wider"
                    >
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
