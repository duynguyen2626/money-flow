"use client";

import * as React from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EntityItem {
    id: string;
    name: string;
    image_url?: string | null;
}

interface EntityPickerProps {
    items: EntityItem[];
    value?: string | null;
    onSelect: (id: string, name: string) => void;
    placeholder?: string;
    triggerClassName?: string;
    icon?: React.ReactNode;
}

export function EntityPicker({
    items,
    value,
    onSelect,
    placeholder = "Tìm kiếm...",
    triggerClassName,
    icon
}: EntityPickerProps) {
    const [open, setOpen] = React.useState(false);

    const selectedItem = items.find((item) => item.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "w-full flex items-center gap-2 text-left focus:outline-none",
                        triggerClassName
                    )}
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-100 overflow-hidden shadow-sm">
                        {selectedItem?.image_url ? (
                            <Avatar className="h-full w-full rounded-none">
                                <AvatarImage src={selectedItem.image_url} className="object-cover" />
                                <AvatarFallback className="rounded-none bg-slate-50">{icon}</AvatarFallback>
                            </Avatar>
                        ) : (
                            <div className="text-slate-400">{icon}</div>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-[10px] font-medium text-slate-400 capitalize">{placeholder}</p>
                        <p className={cn(
                            "truncate text-sm font-bold",
                            selectedItem ? "text-slate-900" : "text-slate-300 italic font-normal"
                        )}>
                            {selectedItem?.name || `Chọn ${placeholder}`}
                        </p>
                    </div>
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[280px] p-0 z-[10001] shadow-2xl border-blue-100"
                align="start"
                side="top"
                sideOffset={10}
            >
                <Command className="border-none">
                    <CommandInput placeholder={placeholder} className="h-9" />
                    <CommandList className="max-h-[300px]">
                        <CommandEmpty>Không tìm thấy.</CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => (
                                <CommandItem
                                    key={item.id}
                                    value={item.name}
                                    onSelect={() => {
                                        onSelect(item.id, item.name);
                                        setOpen(false);
                                    }}
                                    className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
                                >
                                    <Avatar className="h-6 w-6 rounded-none shrink-0 border border-slate-100">
                                        <AvatarImage src={item.image_url || ""} className="object-cover" />
                                        <AvatarFallback className="rounded-none text-[10px] bg-slate-100">
                                            {item.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 truncate text-xs font-medium">{item.name}</span>
                                    <Check
                                        className={cn(
                                            "h-4 w-4 text-blue-600 transition-opacity",
                                            value === item.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
