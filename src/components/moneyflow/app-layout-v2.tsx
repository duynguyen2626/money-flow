'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { GlobalAI } from '@/components/ai/global-ai'
import { useAppFavicon } from '@/hooks/use-app-favicon'
import { SidebarNavV2 } from '@/components/navigation/sidebar-nav-v2'
import { coloredNavItems } from '@/components/navigation/nav-icon-system'

export function AppLayoutV2({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const pathname = usePathname()

  // Dynamic Favicon for Page Navigation
  useAppFavicon(false)

  // Load sidebar state after mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed-v2')
    if (savedState) {
      setSidebarCollapsed(JSON.parse(savedState))
    }
    setIsHydrated(true)
  }, [])

  const toggleSidebar = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
    localStorage.setItem('sidebar-collapsed-v2', JSON.stringify(collapsed))
  }

  // Get current page title
  const currentPageTitle = useMemo(() => {
    if (!pathname) return 'Money Flow 3'
    if (pathname === '/') return 'Dashboard'

    const match = coloredNavItems.find((item) =>
      item.href !== '/' && (pathname === item.href || pathname.startsWith(`${item.href}/`))
    )

    return match?.title ?? 'Money Flow 3'
  }, [pathname])

  // Hide sidebar on login page
  if (pathname?.startsWith('/login')) {
    return (
      <main className="h-full w-full overflow-auto bg-background">
        {children}
      </main>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "flex-none h-full flex-col border-r border-slate-200 bg-card transition-all duration-300 z-20 shadow-sm hidden md:flex overflow-visible",
          isHydrated && sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Inner scroll container — overflow-y-auto is here, not on aside */}
        <div className={cn(
          "flex flex-col h-full overflow-y-auto overflow-x-visible custom-scrollbar py-8",
          isHydrated && sidebarCollapsed ? "px-1" : "px-6"
        )}>
        {/* Header / Logo Area */}
        <div className={cn(
          "sticky top-0 z-50 flex items-center mb-6 bg-card/80 backdrop-blur-md py-4 -mt-4 transition-all",
          isHydrated && sidebarCollapsed ? "justify-center" : "px-0"
        )}>
          {(!isHydrated || !sidebarCollapsed) && (
            <span className="text-xl font-bold text-slate-800 tracking-tight pl-2">
              {currentPageTitle}
            </span>
          )}
        </div>

        {/* Sidebar Navigation */}
        <SidebarNavV2 
          isCollapsed={sidebarCollapsed}
          onCollapseChange={toggleSidebar}
        />

        {/* Footer / User Area */}
        <div className="mt-auto pt-8 border-t border-slate-200">
          {(!isHydrated || !sidebarCollapsed) ? (
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                U
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">User</span>
                <span className="text-xs text-slate-500">Admin</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                U
              </div>
            </div>
          )}
        </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0 bg-white">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 text-slate-600">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex h-full flex-col bg-card py-6">
                  {/* Mobile Logo */}
                  <div className="flex items-center px-6 mb-8">
                    <span className="text-xl font-bold text-slate-800 tracking-tight">
                      {currentPageTitle}
                    </span>
                  </div>

                  {/* Mobile Nav */}
                  <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
                    <SidebarNavV2 isCollapsed={false} />
                  </nav>

                  {/* Mobile Footer */}
                  <div className="mt-auto px-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        U
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">User</span>
                        <span className="text-xs text-slate-500">Admin</span>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-lg font-bold text-slate-800">{currentPageTitle}</span>
          </div>
        </div>

        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Main Page Content */}
        <div className="w-full flex-1 min-h-0 bg-white">
          {children}
        </div>

        {/* Global AI */}
        <GlobalAI />
      </main>
    </div>
  )
}
