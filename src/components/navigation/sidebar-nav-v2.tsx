'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronLeft, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CustomTooltip } from '@/components/ui/custom-tooltip'
import { coloredNavItems, NavIcon } from './nav-icon-system'
import { UnifiedRecentSidebar } from './unified-recent-sidebar'
import { SidebarSearch } from './sidebar-search'
import { RecentAccountsList } from './RecentAccountsList'
import { RecentPeopleList } from './RecentPeopleList'

type SidebarNavV2Props = {
  className?: string
  isCollapsed?: boolean
  onCollapseChange?: (collapsed: boolean) => void
}

export function SidebarNavV2({ 
  className, 
  isCollapsed: externalCollapsed,
  onCollapseChange 
}: SidebarNavV2Props) {
  const pathname = usePathname()
  const [internalCollapsed, setInternalCollapsed] = useState(externalCollapsed ?? false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Use external state if provided, otherwise use internal state
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed

  const handleCollapse = (collapsed: boolean) => {
    setInternalCollapsed(collapsed)
    onCollapseChange?.(collapsed)
  }

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(h => h !== href)
        : [...prev, href]
    )
  }

  // Items that can have sub-lists
  const expandableItems = ['/accounts', '/people']
  
  // Filter nav items based on search
  const filteredNavItems = searchQuery
    ? coloredNavItems.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : coloredNavItems

  const renderNavItem = (item: typeof coloredNavItems[0]) => {
    const isActive = item.href === '/'
      ? pathname === '/'
      : pathname.startsWith(item.href)
    const isExpandable = expandableItems.includes(item.href)
    const isExpanded = expandedItems.includes(item.href)
    const isHighlighted = searchQuery && 
      (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
       item.description?.toLowerCase().includes(searchQuery.toLowerCase()))

    const linkContent = (
      <div className="relative flex flex-col w-full">
        <div className="flex items-center gap-2">
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 flex-1",
              isActive
                ? 'bg-blue-100 text-blue-700 shadow-sm'
                : isHighlighted
                ? 'bg-yellow-50 text-slate-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <div className={cn(
              "flex-shrink-0 transition-colors",
              isActive && 'brightness-125'
            )}>
              <NavIcon icon={item.icon} color={item.color} size="md" />
            </div>
            {!isCollapsed && (
              <span className="truncate">{item.title}</span>
            )}
            {isExpandable && !isCollapsed && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleExpanded(item.href)
                }}
                className="ml-auto p-1 hover:bg-slate-200/50 rounded-sm transition-colors"
              >
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-slate-400 transition-transform duration-300",
                  isExpanded && "rotate-180"
                )} />
              </button>
            )}
          </Link>
        </div>

        {/* Sub-items */}
        {!isCollapsed && isExpandable && isExpanded && (
          <div className={cn(
            "transition-all duration-300 ease-in-out origin-top overflow-hidden",
            isExpanded ? "max-h-[300px] opacity-100 mt-1" : "max-h-0 opacity-0"
          )}>
            {item.href === '/accounts' && <RecentAccountsList isCollapsed={isCollapsed} />}
            {item.href === '/people' && <RecentPeopleList isCollapsed={isCollapsed} />}
          </div>
        )}
      </div>
    )

    if (isCollapsed) {
      return (
        <CustomTooltip key={item.href} content={item.title} side="right">
          <div>{linkContent}</div>
        </CustomTooltip>
      )
    }

    return (
      <div key={item.href}>{linkContent}</div>
    )
  }

  return (
    <>
      {/* Search Section */}
      {!isCollapsed && (
        <div className="mb-6">
          <SidebarSearch 
            onSearchChange={setSearchQuery} 
            placeholder="Search menu..."
            isCollapsed={isCollapsed}
          />
        </div>
      )}

      {/* Collapse Button */}
      {!isCollapsed && (
        <div className="mb-4 -mx-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCollapse(true)}
            className="w-full justify-start text-slate-500 hover:bg-slate-100 gap-2 px-3"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs font-semibold">Collapse</span>
          </Button>
        </div>
      )}

      {isCollapsed && (
        <div className="mb-4 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCollapse(false)}
            className="text-slate-500 hover:bg-slate-100"
            title="Expand sidebar"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}

      {/* Recent Section - without search interference */}
      {!searchQuery && (
        <UnifiedRecentSidebar isCollapsed={isCollapsed} searchQuery={searchQuery} />
      )}

      {/* Main Navigation */}
      <nav className={cn("space-y-1", className)}>
        {filteredNavItems.length === 0 ? (
          !isCollapsed && (
            <div className="px-3 py-4 text-xs text-slate-400 text-center">
              No items matching "{searchQuery}"
            </div>
          )
        ) : (
          filteredNavItems.map(item => renderNavItem(item))
        )}
      </nav>
    </>
  )
}
