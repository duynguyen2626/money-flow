"use client"

import { useState, useEffect } from "react"
import { LayoutDashboard, List, Undo2, Landmark, Users, BadgePercent, Tags, Store, Layers, Cloud, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { SidebarNav, type NavItem } from "./sidebar-nav"

import { cn } from "@/lib/utils"

const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: List },
  { label: "Refunds", href: "/refunds", icon: Undo2 },
  { label: "Accounts", href: "/accounts", icon: Landmark },
  { label: "People", href: "/people", icon: Users },
  { label: "Cashback", href: "/cashback", icon: BadgePercent },
  { label: "Categories", href: "/categories", icon: Tags },
  { label: "Shops", href: "/shops", icon: Store },
  { label: "Batch Transfer", href: "/batch", icon: Layers },
  { label: "Services", href: "/services", icon: Cloud },
]

type AppLayoutProps = {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(nextState));
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside
        suppressHydrationWarning
        className={cn("sticky top-0 h-screen flex flex-col border-r bg-white py-8 transition-all duration-300", isCollapsed ? "w-16 px-2" : "w-64 px-6")}
      >
        <div className={cn("text-2xl font-bold text-blue-700 mb-10", isCollapsed ? "text-center" : "")}>
          {isCollapsed ? "MF" : "Money Flow"}
        </div>
        <SidebarNav items={navItems} isCollapsed={isCollapsed} />
        <div className="mt-auto text-xs text-slate-400">
          {!isCollapsed && (
            <>
              <p>v3.0 dashboard</p>
              <p>Track cashflow, debts & more.</p>
            </>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b bg-white px-4 py-4 md:px-8">
          <div>
            <p className="text-sm text-slate-500">Money Flow</p>
            <h1 className="text-xl font-semibold text-slate-900">Control Center</h1>
          </div>
          <div className="flex items-center gap-3">

            <Link
              href="/transactions"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Ghi giao dich
            </Link>
          </div>
        </header>

        <div className="flex-1 px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  )
}
