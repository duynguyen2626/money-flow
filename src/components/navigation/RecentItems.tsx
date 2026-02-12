'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRecentItems } from '@/hooks/use-recent-items';
import { cn } from '@/lib/utils';
import { Landmark, User, History, X } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface RecentItemsProps {
    isCollapsed: boolean;
}

export function RecentItems({ isCollapsed }: RecentItemsProps) {
    const { items, clearRecentItems } = useRecentItems();
    const pathname = usePathname();

    if (items.length === 0) return null;

    return (
        <div className="mt-8 space-y-3">
            <div className={cn(
                "flex items-center justify-between px-3",
                isCollapsed && "justify-center px-0"
            )}>
                {!isCollapsed && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Recent Items
                    </span>
                )}
                {!isCollapsed && (
                    <button
                        onClick={clearRecentItems}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                        title="Clear recent items"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
                {isCollapsed && (
                    <div className="h-px w-8 bg-slate-100" />
                )}
            </div>

            <div className="space-y-1">
                {items.map((item) => {
                    const href = item.type === 'account' ? `/accounts/${item.id}` : `/people/${item.id}`;
                    const isActive = pathname === href;

                    const icon = item.type === 'account' ? (
                        <Landmark className="h-3.5 w-3.5" />
                    ) : (
                        <User className="h-3.5 w-3.5" />
                    );

                    const content = (
                        <Link
                            key={`${item.type}-${item.id}`}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-1.5 transition-all",
                                isActive
                                    ? "bg-blue-50 text-blue-700 font-bold"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                isCollapsed && "justify-center px-2"
                            )}
                        >
                            <div className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-none transition-colors",
                                isActive ? "bg-white" : "bg-slate-50"
                            )}>
                                {item.image_url ? (
                                    <img src={item.image_url} alt="" className="h-full w-full object-contain" />
                                ) : (
                                    <div className="text-slate-400">
                                        {icon}
                                    </div>
                                )}
                            </div>
                            {!isCollapsed && (
                                <span className="text-xs truncate flex-1">{item.name}</span>
                            )}
                        </Link>
                    );

                    if (isCollapsed) {
                        return (
                            <TooltipProvider key={`${item.type}-${item.id}`}>
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        {content}
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p className="text-xs font-bold">{item.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    }

                    return content;
                })}
            </div>
        </div>
    );
}
