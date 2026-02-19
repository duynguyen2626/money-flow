"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useEffect } from "react";
import { format, subMonths } from "date-fns";
import { CalendarIcon, Store, Tag, RefreshCw, Book, History, Check, X } from "lucide-react";

import {
    FormControl,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SingleTransactionFormValues } from "../types";
import { Shop, Category, Person } from "@/types/moneyflow.types";
import { SmartAmountInput } from "@/components/ui/smart-amount-input";
import { Combobox } from "@/components/ui/combobox";
import { formatShortVietnameseCurrency } from "@/lib/number-to-text";

type BasicInfoSectionProps = {
    people: Person[];
    operationMode?: 'add' | 'edit' | 'duplicate';
};

export function BasicInfoSection({ people, operationMode }: BasicInfoSectionProps) {
    const form = useFormContext<SingleTransactionFormValues>();
    const transactionType = useWatch({ control: form.control, name: "type" });
    const amount = useWatch({ control: form.control, name: "amount" });

    // Sync Tag with Date - ONLY if empty and in ADD mode
    const occurredAt = useWatch({ control: form.control, name: "occurred_at" });
    useEffect(() => {
        if (occurredAt && operationMode === 'add') {
            const currentTag = form.getValues("tag");
            if (!currentTag) {
                form.setValue("tag", format(occurredAt, "yyyy-MM"));
            }
        }
    }, [occurredAt, form, operationMode]);

    return (
        <div className="space-y-3">

            {/* ROW 1: Date & Tag */}
            <div className="flex gap-3">
                {/* Date Picker */}
                <div className="flex-1">
                    <FormField
                        control={form.control}
                        name="occurred_at"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal h-10 border-slate-200 bg-white",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "dd/MM/yyyy")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={(newDate) => {
                                                if (!newDate) return;
                                                const current = field.value || new Date();
                                                const preserved = new Date(newDate);
                                                preserved.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
                                                field.onChange(preserved);
                                            }}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Tag Input */}
                <div className="flex-1">
                    <FormField
                        control={form.control}
                        name="tag"
                        render={({ field }) => (
                            <FormItem>
                                <div className="relative flex gap-1">
                                    <div className="relative flex-1">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Tag / Cycle"
                                            className="pl-9 pr-16 bg-white border-slate-200"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="Recent Tags"
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-40 p-1" align="end">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-semibold text-slate-500 px-2 py-1 bg-slate-50 rounded-sm mb-1">
                                                            Recent Cycles
                                                        </span>
                                                        {Array.from({ length: 3 }).map((_, i) => {
                                                            const date = subMonths(new Date(), i);
                                                            const tag = format(date, "yyyy-MM");
                                                            return (
                                                                <button
                                                                    key={tag}
                                                                    type="button"
                                                                    onClick={() => field.onChange(tag)}
                                                                    className={cn(
                                                                        "text-xs px-2 py-1.5 rounded-sm hover:bg-slate-100 text-left transition-colors flex items-center justify-between group",
                                                                        field.value === tag && "bg-blue-50 text-blue-600 font-medium hover:bg-blue-100"
                                                                    )}
                                                                >
                                                                    <span>{tag}</span>
                                                                    {field.value === tag && <Check className="h-3 w-3" />}
                                                                </button>
                                                            )
                                                        })}
                                                        <div className="h-px bg-slate-100 my-1" />
                                                        <button
                                                            type="button"
                                                            onClick={() => field.onChange(format(new Date(), "yyyy-MM"))}
                                                            className="text-xs px-2 py-1.5 rounded-sm hover:bg-slate-100 text-left text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
                                                        >
                                                            <RefreshCw className="h-3 w-3" />
                                                            <span>Current</span>
                                                        </button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* ROW 3: Note */}
            <FormField
                control={form.control}
                name="note"
                render={({ field }) => {
                    // Calculate #nosync label based on selected person
                    const personId = form.getValues("person_id");
                    const selectedPerson = people?.find(p => p.id === personId);
                    const hasSheet = !!selectedPerson?.google_sheet_url;
                    const nosyncLabel = hasSheet ? "+ Not sync" : "+ #nosync";

                    return (
                        <FormItem>
                            <div className="flex items-center justify-between px-1 mb-1.5">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Note</span>
                                <span
                                    onClick={(e) => {
                                        e.preventDefault(); // Prevent focus stealing issues
                                        const current = field.value || "";
                                        if (!current.includes("#nosync")) {
                                            const newValue = current ? `${current} #nosync` : "#nosync";
                                            field.onChange(newValue);
                                        }
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-blue-600 hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                    title="Click to add #nosync tag"
                                >
                                    {nosyncLabel}
                                </span>
                            </div>
                            <FormControl>
                                <div className="relative">
                                    <Textarea
                                        placeholder="Add a note..."
                                        className="resize-none min-h-[60px] bg-white border-slate-200 pr-8"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                    {field.value && (
                                        <button
                                            type="button"
                                            onClick={() => field.onChange("")}
                                            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    );
                }}
            />

        </div>
    );
}
