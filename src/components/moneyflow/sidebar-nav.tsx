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
  }, [pathname])

  return (
    <>
      {loadingHref && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-100">
          <div className="h-full bg-blue-600 animate-[loading_1s_ease-in-out_infinite] w-full origin-left" />
          <style jsx>{`
               @keyframes loading {
                 0% { transform: scaleX(0); }
                 50% { transform: scaleX(0.5); }
                 100% { transform: scaleX(1); }
               }
             `}</style>
        </div>
      )}
      <nav className="space-y-1">
        {items.map(item => {
          // Optimistically show active state if we are loading this href
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

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
    </>
  )
}
