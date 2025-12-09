"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Receipt,
  Users,
  CreditCard,
  Settings,
  Menu,
  ChevronLeft,
  ArrowRightLeft,
  ShoppingBag,
  Layers
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: <LayoutDashboard className="h-5 w-5" /> },
  { title: "Transactions", href: "/transactions", icon: <ArrowRightLeft className="h-5 w-5" /> },
  { title: "Accounts", href: "/accounts", icon: <CreditCard className="h-5 w-5" /> },
  { title: "People & Debt", href: "/people", icon: <Users className="h-5 w-5" /> },
  { title: "Installments", href: "/installments", icon: <Receipt className="h-5 w-5" /> },
  { title: "Shops", href: "/shops", icon: <ShoppingBag className="h-5 w-5" /> },
  { title: "Services", href: "/services", icon: <Layers className="h-5 w-5" /> },
  { title: "Batches", href: "/batch", icon: <LayoutDashboard className="h-5 w-5" /> }, // Icon placeholder
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()

  // Load state from localStorage on mount (Client-side only)
  useEffect(() => {
    setIsMounted(true)
    const savedState = localStorage.getItem("sidebar-collapsed")
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState))
    }
  }, [])

  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState))
  }

  // Prevent hydration mismatch by using default state until mounted
  const sidebarCollapsed = isMounted ? isCollapsed : false

  return (
    <div className="min-h-screen bg-slate-100 flex" suppressHydrationWarning>
      <aside
        className={cn(
          "sticky top-0 h-screen flex flex-col border-r bg-white py-8 transition-all duration-300 z-20 shadow-sm",
          sidebarCollapsed ? "w-16 px-2" : "w-64 px-6"
        )}
      >
        {/* Header / Logo Area */}
        <div className={cn("flex items-center mb-8", sidebarCollapsed ? "justify-center" : "justify-between")}>
          {!sidebarCollapsed && (
            <span className="text-xl font-bold text-slate-800 tracking-tight">
              Money Flow <span className="text-blue-600">3</span>
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-slate-500 hover:bg-slate-100"
          >
            {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  sidebarCollapsed && "justify-center px-2"
                )}
                title={sidebarCollapsed ? item.title : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.title}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer / User Area */}
        <div className="mt-auto pt-8 border-t">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                U
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">User</span>
                <span className="text-xs text-slate-500">Admin</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                U
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}