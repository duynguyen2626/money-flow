"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ClearableInputProps extends React.ComponentPropsWithoutRef<'input'> {
    onClear?: () => void;
    containerClassName?: string;
    alwaysShowValues?: boolean;
}

export const ClearableInput = React.forwardRef<HTMLInputElement, ClearableInputProps>(
    ({ className, containerClassName, value, onChange, onClear, alwaysShowValues, ...props }, ref) => {
        const hasValue = value !== undefined && value !== null && value !== "";

        const handleClear = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (onClear) {
                onClear();
            } else if (onChange) {
                // Try to trigger a change event with empty string
                const event = {
                    target: { value: "" },
                    currentTarget: { value: "" }
                } as React.ChangeEvent<HTMLInputElement>;
                onChange(event);
            }
        };

        return (
            <div className={cn("relative", containerClassName)}>
                <Input
                    {...props}
                    ref={ref}
                    value={value}
                    onChange={onChange}
                    className={cn("pr-8", className)}
                />
                {hasValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-100"
                        tabIndex={-1}
                    >
                        <X className="h-3.5 w-3.5" />
                        <span className="sr-only">Clear</span>
                    </button>
                )}
            </div>
        );
    }
);

ClearableInput.displayName = "ClearableInput";
