// src/components/transaction/ui/ExpandIcon.tsx

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandIconProps {
    isExpanded: boolean;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
}

export function ExpandIcon({ isExpanded, onClick, className }: ExpandIconProps) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(e);
            }}
            className={cn(
                "p-1 hover:bg-slate-100 rounded-md transition-all duration-200 transform",
                isExpanded ? "rotate-90 bg-slate-100" : "rotate-0",
                className
            )}
            aria-label={isExpanded ? "Collapse" : "Expand"}
        >
            <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
    );
}
