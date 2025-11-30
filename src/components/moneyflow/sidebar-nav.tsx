'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
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

  return (
    <nav className="space-y-1">
      {items.map(item => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href)
        const link = (
          <Link
            href={item.href}
            className={clsx(
              'flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              isCollapsed ? 'justify-center px-2' : 'px-3'
            )}
          >
            <item.icon className="h-4 w-4" />
            {!isCollapsed && <span>{item.label}</span>}
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
