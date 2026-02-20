'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Person } from '@/types/moneyflow.types';
import { getRecentPeopleByTransactions } from '@/services/people.service';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

export function RecentPeopleList({ isCollapsed, onClick }: { isCollapsed: boolean; onClick?: () => void }) {
    const [recentPeople, setRecentPeople] = useState<Person[]>([]);
    const pathname = usePathname();

    useEffect(() => {
        let isMounted = true;
        // Fetch recent people based on last transaction
        const fetchRecent = async () => {
            try {
                const data = await getRecentPeopleByTransactions(4);
                if (isMounted) setRecentPeople(data);
            } catch (err) {
                if (isMounted) console.error('Failed to fetch recent people:', err);
            }
        };
        fetchRecent();
        return () => { isMounted = false; };
    }, []);

    if (recentPeople.length === 0) return null;

    return (
        <div className={cn(
            "space-y-0.5 mt-0.5 mb-1 transition-all duration-300 overflow-hidden",
            isCollapsed ? "w-full" : "pl-6"
        )}>
            <div className="space-y-0.5">
                {recentPeople.map(person => {
                    const href = `/people/${person.id}`;
                    const isActive = pathname === href;

                    return (
                        <CustomTooltip
                            key={person.id}
                            content={person.name}
                            side="right"
                            disabled={!isCollapsed}
                        >
                            <Link
                                href={href}
                                onClick={onClick}
                                className={cn(
                                    "flex items-center gap-2 rounded-md transition-all group relative",
                                    isActive
                                        ? "text-indigo-700 font-bold"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
                                    isCollapsed ? "justify-center px-1 py-1.5" : "px-2 py-1.5"
                                )}
                            >
                                {/* Vertical line for nesting visual */}
                                {!isCollapsed && (
                                    <div className={cn(
                                        "absolute -left-3 top-0 bottom-0 w-px bg-slate-100 group-hover:bg-indigo-200 transition-colors",
                                        isActive && "bg-indigo-300"
                                    )} />
                                )}

                                <div className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-none transition-colors",
                                    isActive ? "bg-white" : "bg-slate-50"
                                )}>
                                    {person.image_url ? (
                                        <img src={person.image_url} alt="" className="h-full w-full object-contain" />
                                    ) : (
                                        <User className="h-2.5 w-2.5 text-slate-400" />
                                    )}
                                </div>
                                {!isCollapsed && (
                                    <span className="text-[10px] truncate leading-tight">{person.name}</span>
                                )}
                            </Link>
                        </CustomTooltip>
                    );
                })}
            </div>
        </div>
    );
}
