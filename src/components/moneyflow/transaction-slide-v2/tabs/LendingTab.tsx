"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { TransactionFormValues } from "@/components/moneyflow/transaction-form/types";
import { Account, Person } from "@/types/moneyflow.types";

interface LendingTabProps {
    accounts: Account[];
    people: Person[];
}

export function LendingTab({ accounts, people }: LendingTabProps) {
    const { control, watch, setValue } = useFormContext<TransactionFormValues>();

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {/* Field 1: Date Picker */}
                <FormField
                    control={control}
                    name="occurred_at"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal h-11",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value ? (
                                                format(field.value, "PPP")
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
                                        onSelect={field.onChange}
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

                {/* Field 2: Cycle Tag (Controls Date) */}
                <FormItem>
                    <FormLabel>Billing Cycle</FormLabel>
                    <div className="flex items-center gap-2 h-11">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-full px-3 font-mono text-sm"
                            onClick={() => {
                                const current = watch("occurred_at") || new Date();
                                const prev = new Date(current);
                                prev.setMonth(prev.getMonth() - 1);
                                setValue("occurred_at", prev);
                            }}
                            title="Previous Month"
                        >
                            -1 Mo
                        </Button>
                        <div className="relative flex-1 h-full">
                            <input
                                type="text"
                                className="w-full h-full px-3 rounded-md border border-input bg-background font-mono text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={watch("occurred_at") ? format(watch("occurred_at"), "yyyy-MM") : ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow typing, but only update if valid
                                    if (val.length === 7 && /^\d{4}-\d{2}$/.test(val)) {
                                        const [y, m] = val.split("-").map(Number);
                                        if (y > 1900 && m >= 1 && m <= 12) {
                                            const current = watch("occurred_at") || new Date();
                                            const newDate = new Date(current);
                                            newDate.setFullYear(y);
                                            newDate.setMonth(m - 1); // Month is 0-indexed
                                            setValue("occurred_at", newDate);
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </FormItem>
            </div>

            {/* Visual Debt Tag (Floating or just informational) */}
            <div className="flex justify-start">
                <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/10">
                    Debt Transaction
                </span>
            </div>
        </div>
    );
}
