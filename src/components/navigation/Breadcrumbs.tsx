'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBreadcrumbs } from '@/context/breadcrumb-context';

export function Breadcrumbs() {
    const pathname = usePathname();

    const { customNames } = useBreadcrumbs();

    const breadcrumbs = useMemo(() => {
        if (!pathname || pathname === '/') return [];

        const segments = pathname.split('/').filter(Boolean);
        return segments.map((segment, index) => {
            const href = `/${segments.slice(0, index + 1).join('/')}`;

            // Check if we have a custom name for this path
            if (customNames[href]) {
                return { name: customNames[href], href, isLast: index === segments.length - 1 };
            }

            // Format name: capitalize, replace hyphens, handle UUIDs
            let name = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

            // If it looks like a UUID or short ID, maybe just call it "Details" or similar
            if (segment.length > 20 || /^[0-9a-fA-F-]+$/.test(segment)) {
                name = 'Details';
            }

            return { name, href, isLast: index === segments.length - 1 };
        });
    }, [pathname, customNames]);

    if (breadcrumbs.length === 0) return null;

    return (
        <nav className="flex items-center gap-1.5 px-4 py-2 border-b bg-slate-50/50" aria-label="Breadcrumb">
            <Link
                href="/"
                className="text-slate-400 hover:text-blue-600 transition-colors"
                title="Dashboard"
            >
                <Home className="h-3.5 w-3.5" />
            </Link>

            {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.href}>
                    <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                    {crumb.isLast ? (
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                            {crumb.name}
                        </span>
                    ) : (
                        <Link
                            href={crumb.href}
                            target={crumb.href === '/people' ? "_blank" : undefined}
                            rel={crumb.href === '/people' ? "noopener noreferrer" : undefined}
                            className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors truncate max-w-[150px]"
                        >
                            {crumb.name}
                        </Link>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
}
