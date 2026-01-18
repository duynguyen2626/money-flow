"use client";

import * as React from "react";
import { format, subMonths } from "date-fns";
import { History, Calendar } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ClearableInput } from "@/components/ui/clearable-input";
import { cn } from "@/lib/utils";

interface CycleSelectorProps extends React.ComponentPropsWithoutRef<'input'> {
    value?: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClear?: () => void;
}

export function CycleSelector({ className, value, onChange, onClear, ...props }: CycleSelectorProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    const cycles = React.useMemo(() => {
        const today = new Date();
        return [
            format(today, 'yyyy-MM'),
            format(subMonths(today, 1), 'yyyy-MM'),
            format(subMonths(today, 2), 'yyyy-MM'),
            format(subMonths(today, 3), 'yyyy-MM'),
        ];
    }, []);

    const handleSelect = (cycle: string) => {
        const event = {
            target: { value: cycle },
            currentTarget: { value: cycle }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(event);
        setIsOpen(false);
    };

    return (
        <div className="relative flex items-center">
            <ClearableInput
                {...props}
                value={value}
                onChange={onChange}
                onClear={onClear}
                className={cn("pr-16", className)}
                containerClassName="[&>button]:right-9"
                placeholder="Cycle (YYYY-MM)"
            />
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 h-9 w-8 text-slate-400 hover:text-blue-600 rounded-l-none"
                    >
                        <History className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start">
                    <div className="text-xs font-semibold text-slate-500 px-2 py-1.5 border-b mb-1">
                        Recent Cycles
                    </div>
                    <div className="grid gap-0.5">
                        {cycles.map((cycle) => (
                            <button
                                key={cycle}
                                onClick={() => handleSelect(cycle)}
                                className={cn(
                                    "flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded-sm hover:bg-slate-100 transition-colors",
                                    value === cycle && "bg-blue-50 text-blue-600 font-medium"
                                )}
                            >
                                <Calendar className="h-3 w-3 opacity-70" />
                                {cycle}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
