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
  const [mounted, setMounted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()

  // Dynamic Favicon for Page Navigation
  useAppFavicon(false)

  // Load sidebar state after mount
  useEffect(() => {
    setMounted(true)
    const savedState = localStorage.getItem('sidebar-collapsed-v2')
    if (savedState) {
      setSidebarCollapsed(JSON.parse(savedState))
    }
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

  // Click outside to collapse
  useEffect(() => {
    if (!sidebarCollapsed) return

    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById('desktop-sidebar-container')
      if (sidebar && !sidebar.contains(e.target as Node)) {
        // If we are in an "expanded" state but it was persistent, we might want to close it
        // This logic will be more precisely handled by state inside SidebarNavV2 if we pass it down
        // For now, let's let SidebarNavV2 handle its own internal temporary/persistent states
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sidebarCollapsed])

  // Hide sidebar on login page
  if (pathname?.startsWith('/login')) {
    return (
      <main className="h-full w-full overflow-auto bg-background">
        {children}
      </main>
    )
  }


  return (
    <div className="flex h-full w-full overflow-hidden" suppressHydrationWarning>
      {/* Desktop Sidebar - Fixed Gutter (Zero Layout Shift) */}
      <aside
        suppressHydrationWarning
        className="flex-none h-full border-r border-slate-200 bg-slate-50 hidden md:flex w-16 z-[190] relative"
      >
        {/* The actual Sidebar Panel that can expand as an overlay */}
        <div
          id="desktop-sidebar-container"
          className={cn(
            "absolute top-0 left-0 h-full bg-white border-r border-slate-200 transition-all duration-300 shadow-2xl overflow-visible z-[200]",
            // This container will be sized by its content (SidebarNavV2)
            "w-auto"
          )}
        >
          <div className="flex flex-col h-full overflow-y-auto overflow-x-visible custom-scrollbar py-6">
            {/* Sidebar Navigation */}
            <div className="flex-1">
              <SidebarNavV2
                isCollapsed={sidebarCollapsed}
                onCollapseChange={toggleSidebar}
              />
            </div>

            {/* Footer / User Area - stable position */}
            <div className="mt-auto px-4 py-6 border-t border-slate-200">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm mx-auto shadow-sm">
                U
              </div>
            </div>
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
