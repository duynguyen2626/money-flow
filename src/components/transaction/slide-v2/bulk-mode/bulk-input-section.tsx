"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, CalendarIcon, Tag, History, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, subMonths } from "date-fns";
import { BulkTransactionFormValues } from "../types";
import { Shop, Account, Person } from "@/types/moneyflow.types";
import { BulkTransactionRow } from "./bulk-row";
import { useEffect } from "react";
import { CycleSelector } from "@/components/ui/cycle-selector";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { readMoney } from "@/lib/number-to-text";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    FormControl,
    FormField,
    FormItem,
} from "@/components/ui/form";

type BulkInputSectionProps = {
    shops: Shop[];
    accounts: Account[];
    people: Person[]; // Added
    onAddNewAccount?: () => void;
    onAddNewPerson?: () => void; // Added
};

export function BulkInputSection({ shops, accounts, people, onAddNewAccount, onAddNewPerson }: BulkInputSectionProps) {
    const form = useFormContext<BulkTransactionFormValues>();
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "rows",
    });

    // Calculate totals
    const rows = form.watch("rows");
    const totalAmount = rows?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;
    const rowCount = rows?.length || 0;

    // Sync Tag with Date
    const occurredAt = form.watch("occurred_at");
    useEffect(() => {
        if (occurredAt) {
            form.setValue("tag", format(occurredAt, "yyyy-MM"));
        }
    }, [occurredAt, form]);

    // Initial row if empty
    useEffect(() => {
        if (fields.length === 0) {
            append({
                id: crypto.randomUUID(),
                amount: 0,
                cashback_mode: 'none_back',
                is_expanded: false
            });
        }
    }, [fields.length, append]);

    const addRow = () => {
        append({
            id: crypto.randomUUID(),
            amount: 0,
            cashback_mode: 'none_back',
            is_expanded: false
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* HEADER / SUMMARY */}
            <div className="bg-slate-50 border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    {/* Date Picker */}
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
                                                    "w-[130px] pl-3 text-left font-normal h-9 bg-white text-xs",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "dd/MM/yyyy")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </FormItem>
                        )}
                    />

                    {/* Tag Input */}
                    <div className="flex-1 max-w-[150px]">
                        <FormField
                            control={form.control}
                            name="tag"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="relative">
                                        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                        <FormControl>
                                            <Input
                                                placeholder="Tag..."
                                                className="pl-8 pr-8 w-full h-9 bg-white text-xs"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        </FormControl>

                                        {/* History / Reset Button */}
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
                                                        <History className="h-3 w-3" />
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
                                                            onClick={() => {
                                                                const currentDate = form.getValues('occurred_at') || new Date();
                                                                field.onChange(format(currentDate, "yyyy-MM"));
                                                            }}
                                                            className="text-xs px-2 py-1.5 rounded-sm hover:bg-slate-100 text-left text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
                                                        >
                                                            <RefreshCw className="h-3 w-3" />
                                                            <span>Sync Date</span>
                                                        </button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-2" />

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span>Rows: <strong className="text-slate-900">{rowCount}</strong></span>
                        <span className="ml-2">Total: <strong className="text-slate-900">{new Intl.NumberFormat('vi-VN').format(totalAmount)}</strong></span>
                        {totalAmount > 0 && (
                            <span className="text-xs text-slate-500 italic ml-1">
                                ({readMoney(totalAmount)})
                            </span>
                        )}
                    </div>
                </div>

                <Button size="sm" type="button" onClick={addRow} className="gap-1 h-8 text-xs">
                    <Plus className="w-3 h-3" /> Add Row
                </Button>
            </div>

            {/* ROWS LIST */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {fields.map((field, index) => (
                    <BulkTransactionRow
                        key={field.id}
                        index={index}
                        onRemove={remove}
                        shops={shops}
                        accounts={accounts}
                        people={people}
                        onAddNewAccount={onAddNewAccount}
                        onAddNewPerson={onAddNewPerson}
                    />
                ))}

                <div
                    onClick={addRow}
                    className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all"
                >
                    <Plus className="w-5 h-5 mr-2" /> Add another transaction
                </div>
            </div>

        </div>
    );
}
