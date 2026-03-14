"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { format, subMonths } from "date-fns";
import { CalendarIcon, Tag, RefreshCw, History, Check, X, Users } from "lucide-react";

import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
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
import { Person } from "@/types/moneyflow.types";
import { Combobox } from "@/components/ui/combobox";
import { PersonAvatar } from "@/components/ui/person-avatar";

type BasicInfoSectionProps = {
    people: Person[];
    operationMode?: 'add' | 'edit' | 'duplicate';
};

export function BasicInfoSection({ people, operationMode }: BasicInfoSectionProps) {
    const form = useFormContext<SingleTransactionFormValues>();

    // Sync Tag with Date - ONLY if empty and in ADD mode
    const occurredAt = useWatch({ control: form.control, name: "occurred_at" });

    const peopleItems = useMemo(
        () =>
            people.map((person) => ({
                value: person.id,
                label: person.name,
                icon: (
                    <PersonAvatar
                        name={person.name}
                        imageUrl={person.image_url}
                        size="sm"
                    />
                ),
            })),
        [people],
    );

    useEffect(() => {
        if (occurredAt && operationMode === 'add') {
            const currentTag = form.getValues("tag");
            const dateTag = format(occurredAt, "yyyy-MM");

            // Only auto-update if tag is empty OR it looks like a year-month tag
            // We want it to be dynamic but not overwrite custom manual tags
            const isManualTag = currentTag && !/^\d{4}-\d{2}$/.test(currentTag);

            if (!currentTag || !isManualTag) {
                form.setValue("tag", dateTag);
            }
        }
    }, [occurredAt, form, operationMode]);

    return (
        <div className="space-y-3">

            {/* ROW 1: Date (full width) */}
            <FormField
                control={form.control}
                name="occurred_at"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel className="flex items-center gap-1.5 text-[10px] font-bold text-sky-500 capitalize tracking-wide mb-1.5 min-h-[14px]">
                            <CalendarIcon className="w-3 h-3" />
                            Date
                        </FormLabel>
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

            {/* ROW 2: People + Debt Tag Cycle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                    control={form.control}
                    name="person_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 capitalize tracking-wide mb-1.5 min-h-[14px]">
                                <Users className="w-3 h-3" />
                                Involved Person
                            </FormLabel>
                            <FormControl>
                                <Combobox
                                    items={peopleItems}
                                    value={field.value || undefined}
                                    onValueChange={(value) => field.onChange(value ?? null)}
                                    placeholder="Personal Flow (No one)"
                                    hideTriggerBadge
                                    className="w-full h-10 bg-white border-slate-200"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="tag"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 capitalize tracking-wide mb-1.5 min-h-[14px]">
                                <Tag className="w-3 h-3" />
                                Debt Tag Cycle
                            </FormLabel>
                            <div className="relative flex gap-1">
                                <div className="relative flex-1">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Debt Tag Cycle"
                                        className="pl-9 pr-16 bg-white border-slate-200 h-10"
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
