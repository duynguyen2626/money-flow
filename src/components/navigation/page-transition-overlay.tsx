'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

// Map pathname prefixes to friendly page names
function getPageName(path: string): string {
  if (path === '/') return 'Dashboard'
  const segments: Record<string, string> = {
    '/accounts': 'Accounts',
    '/transactions': 'Transactions',
    '/installments': 'Installments',
    '/categories': 'Categories',
    '/shops': 'Shops',
    '/people': 'People',
    '/cashback': 'Cashback',
    '/batch': 'Batches',
    '/services': 'Services',
    '/refunds': 'Refunds',
    '/settings': 'Settings',
    '/debt': 'Debt',
  }
  for (const [prefix, name] of Object.entries(segments)) {
    if (path === prefix || path.startsWith(prefix + '/')) return name
  }
  return 'Page'
}

/**
 * PageTransitionOverlay
 *
 * - Patches history.pushState to detect navigation start
 * - Shows a frosted overlay + spinner + target page name immediately
 * - Hides once the new pathname is committed by React
 * - setState is always deferred via setTimeout to avoid useInsertionEffect error
 */
export function PageTransitionOverlay() {
  const [targetPage, setTargetPage] = useState<string | null>(null)
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable setter — deferred so it never runs inside React's commit phase
  const startNav = useCallback((pageName: string) => {
    if (startTimer.current) clearTimeout(startTimer.current)
    startTimer.current = setTimeout(() => setTargetPage(pageName), 0)
    if (safetyTimer.current) clearTimeout(safetyTimer.current)
    safetyTimer.current = setTimeout(() => setTargetPage(null), 10000)
  }, [])

  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history)

    window.history.pushState = (data, unused, url) => {
      const result = originalPushState(data, unused, url)
      if (url) {
        try {
          const newPathname = new URL(String(url), window.location.origin).pathname
          if (newPathname !== window.location.pathname) {
            startNav(getPageName(newPathname))
          }
        } catch {
          // ignore malformed URLs
        }
      }
      return result
    }

    return () => {
      window.history.pushState = originalPushState
      if (safetyTimer.current) clearTimeout(safetyTimer.current)
      if (startTimer.current) clearTimeout(startTimer.current)
    }
  }, [startNav])

  // Hide once the new pathname is rendered by React
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      // Small delay so server content is painted first
      const t = setTimeout(() => setTargetPage(null), 120)
      return () => clearTimeout(t)
    }
  }, [pathname])

  if (!targetPage) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/75 backdrop-blur-sm pointer-events-all">
      <div className="flex flex-col items-center gap-5">
        {/* Spinner */}
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-200" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-500 animate-spin" />
        </div>
        {/* Label */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-slate-700">
            Opening {targetPage}
          </p>
          <p className="text-xs text-slate-400">Please wait…</p>
        </div>
      </div>
    </div>
  )
}
