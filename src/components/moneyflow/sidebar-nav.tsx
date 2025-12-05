'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Loader2, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

type SidebarNavProps = {
  items: NavItem[]
  isCollapsed?: boolean
}

export function SidebarNav({ items, isCollapsed }: SidebarNavProps) {
  const pathname = usePathname()
  const [loadingHref, setLoadingHref] = useState<string | null>(null)

  useEffect(() => {
    setLoadingHref(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <nav className="space-y-1">
      {items.map(item => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href)

        const isPending = loadingHref === item.href

        const link = (
          <Link
            href={item.href}
            onClick={() => {
              if (item.href !== pathname) {
                setLoadingHref(item.href)
              }
            }}
            className={clsx(
              'flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              isCollapsed ? 'justify-center px-2' : 'px-3'
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <item.icon className="h-4 w-4" />
            )}
            {!isCollapsed && <span>{item.label}</span>}
            {isPending && !isCollapsed && (
              <span className="absolute right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            )}
          </Link>
        )

        if (isCollapsed) {
          return (
            <CustomTooltip key={item.href} content={item.label} side="right">
              {link}
            </CustomTooltip>
          )
        }

        return (
          <div key={item.href}>
            {link}
          </div>
        )
      })}
    </nav>
  )
}
