'use client'

import React from 'react'
import {
  LayoutDashboard,
  Landmark,
  ArrowRightLeft,
  Hourglass,
  Tags,
  ShoppingBag,
  Users,
  Banknote,
  Database,
  Cloud,
  Settings,
  Undo2,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavItemConfig = {
  title: string
  href: string
  icon: LucideIcon
  color?: 'blue' | 'amber' | 'green' | 'purple' | 'red' | 'indigo' | 'orange' | 'slate'
  description?: string
}

// Color schemes for different nav items
const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    hover: 'hover:bg-blue-100'
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    hover: 'hover:bg-amber-100'
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    hover: 'hover:bg-green-100'
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    hover: 'hover:bg-purple-100'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    hover: 'hover:bg-red-100'
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    hover: 'hover:bg-indigo-100'
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    hover: 'hover:bg-orange-100'
  },
  slate: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    hover: 'hover:bg-slate-100'
  }
}

interface NavIconProps {
  icon: LucideIcon
  color?: string
  size?: 'sm' | 'md' | 'lg'
  showBg?: boolean
}

export function NavIcon({
  icon: Icon,
  color = 'blue',
  size = 'md',
  showBg = false
}: NavIconProps) {
  const colors = colorMap[color] || colorMap['blue']
  const sizeMap = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  if (showBg) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-md p-1.5",
        colors.bg
      )}>
        <Icon className={cn(sizeMap[size], colors.text)} />
      </div>
    )
  }

  return <Icon className={cn(sizeMap[size], colors.text)} />
}

// Predefined nav items with colors
export const coloredNavItems: NavItemConfig[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    color: 'blue',
    description: 'Overview & analytics'
  },
  {
    title: "Accounts",
    href: "/accounts",
    icon: Landmark,
    color: 'blue',
    description: 'Bank & credit cards'
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: ArrowRightLeft,
    color: 'green',
    description: 'Income & expenses'
  },
  {
    title: "Installments",
    href: "/installments",
    icon: Hourglass,
    color: 'amber',
    description: 'Payment plans'
  },
  {
    title: "Categories",
    href: "/categories",
    icon: Tags,
    color: 'purple',
    description: 'Expense categories'
  },
  {
    title: "People",
    href: "/people",
    icon: Users,
    color: 'indigo',
    description: 'Debt management'
  },
  {
    title: "Cashback",
    href: "/cashback",
    icon: Banknote,
    color: 'green',
    description: 'Rewards tracking'
  },
  {
    title: "Batches",
    href: "/batch",
    icon: Database,
    color: 'red',
    description: 'Import transactions'
  },
  {
    title: "Services",
    href: "/services",
    icon: Cloud,
    color: 'blue',
    description: 'Subscriptions'
  },
  {
    title: "Refunds",
    href: "/refunds",
    icon: Undo2,
    color: 'amber',
    description: 'Return management'
  },
  {
    title: "AI Management",
    href: "/settings/ai",
    icon: Sparkles,
    color: 'purple',
    description: 'AI settings'
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    color: 'slate',
    description: 'App configuration'
  }
]

export function getNavItemConfig(href: string): NavItemConfig | undefined {
  return coloredNavItems.find(item => item.href === href)
}

export function getColorForItemType(type: 'account' | 'person'): string {
  return type === 'account' ? 'blue' : 'indigo'
}
