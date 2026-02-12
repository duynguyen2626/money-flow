'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Account } from '@/types/moneyflow.types';
import { getRecentAccountsByTransactions } from '@/services/account.service';
import { cn } from '@/lib/utils';
import { Landmark } from 'lucide-react';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

export function RecentAccountsList({ isCollapsed }: { isCollapsed: boolean }) {
    const [recentAccounts, setRecentAccounts] = useState<Account[]>([]);
    const pathname = usePathname();

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const data = await getRecentAccountsByTransactions(4);
                setRecentAccounts(data);
            } catch (err) {
                console.error('Failed to fetch recent accounts:', err);
            }
        };
        fetchRecent();
    }, []);

    if (recentAccounts.length === 0) return null;

    return (
        <div className={cn(
            "space-y-0.5 mt-0.5 mb-1 transition-all duration-300 overflow-hidden",
            isCollapsed ? "w-full" : "pl-6"
        )}>
            <div className="space-y-0.5">
                {recentAccounts.map(account => {
                    const href = `/accounts/${account.id}`;
                    const isActive = pathname === href;

                    return (
                        <CustomTooltip
                            key={account.id}
                            content={account.name}
                            side="right"
                            disabled={!isCollapsed}
                        >
                            <Link
                                href={href}
                                className={cn(
                                    "flex items-center gap-2 rounded-md transition-all group relative",
                                    isActive
                                        ? "text-blue-700 font-bold"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50",
                                    isCollapsed ? "justify-center px-1 py-1.5" : "px-2 py-1.5"
                                )}
                            >
                                {/* Vertical line for nesting visual */}
                                {!isCollapsed && (
                                    <div className={cn(
                                        "absolute -left-3 top-0 bottom-0 w-px bg-slate-100 group-hover:bg-blue-200 transition-colors",
                                        isActive && "bg-blue-300"
                                    )} />
                                )}

                                <div className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-none transition-colors",
                                    isActive ? "bg-white" : "bg-slate-50"
                                )}>
                                    {account.image_url ? (
                                        <img src={account.image_url} alt="" className="h-full w-full object-contain" />
                                    ) : (
                                        <Landmark className="h-2.5 w-2.5 text-slate-400" />
                                    )}
                                </div>
                                {!isCollapsed && (
                                    <span className="text-[10px] truncate leading-tight">{account.name}</span>
                                )}
                            </Link>
                        </CustomTooltip>
                    );
                })}
            </div>
        </div>
    );
}
