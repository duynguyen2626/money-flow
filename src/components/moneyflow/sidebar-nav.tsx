'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Loader2,
  type LucideIcon,
  PieChart,
  LayoutGrid, // Dashboard
  Landmark, // Accounts (Bank)
  ArrowLeftRight, // Transactions
  Hourglass, // Installments
  Tags, // Categories
  Users, // People
  Settings,
  Database, // Batch
  Cloud, // Sheet Services
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  CreditCard,
  ShoppingBag,
  Undo2,
  Contact,
} from 'lucide-react'
import clsx from 'clsx'
import { CustomTooltip } from '@/components/ui/custom-tooltip'

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  subItems?: NavItem[]
}

type SidebarNavProps = {
  className?: string
}

export function SidebarNav({ className }: SidebarNavProps) {
  const pathname = usePathname()
  const [loadingHref, setLoadingHref] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(true);

  // Phase 7X-2: Reordered items and updated icons
  const navItems: NavItem[] = [
    { title: "Dashboard", href: "/", icon: LayoutGrid },
    { title: "Accounts", href: "/accounts/v2", icon: Landmark },
    {
      title: "Transactions",
      href: "/transactions",
      icon: ArrowLeftRight,
      subItems: [
        { title: "Refunds", href: "/transactions?filter=refund", icon: Undo2 } // Moved Refund here
      ]
    },
    { title: "Cashback", href: "/cashback", icon: PieChart },
    { title: "Installments", href: "/installments", icon: Hourglass }, // Updated Icon
    {
      title: "Categories",
      href: "/categories",
      icon: Tags, // Updated Icon
      subItems: [
        { title: "Shops", href: "/shops", icon: ShoppingBag } // Moved Shop here
      ]
    },
    { title: "People", href: "/people", icon: Users },
    { title: "People V2", href: "/people/v2", icon: Contact },
    { title: "Batch Import", href: "/batch", icon: Database },
    { title: "Services", href: "/services", icon: Cloud }, // Updated Icon
    { title: "Settings", href: "/settings", icon: Settings },
  ];

  useEffect(() => {
    setLoadingHref(null)
  }, [pathname])

  // For now, isCollapsed is hardcoded to false as the prop was removed.
  // If the sidebar collapse functionality is to be re-introduced,
  // it would need to be managed via state or context.
  const isCollapsed = !isOpen;

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
      <nav className={clsx("space-y-1", className)}>
        {navItems.map(item => {
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
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          )

          if (isCollapsed) {
            return (
              <CustomTooltip key={item.href} content={item.title} side="right">
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
