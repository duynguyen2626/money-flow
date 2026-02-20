'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * PageTransitionOverlay
 *
 * Replaces NextTopLoader behavior:
 * - Detect navigation start via history.pushState patch
 * - Immediately show a centered full-screen spinner overlay
 * - Hide once the new pathname is rendered (usePathname change)
 */
export function PageTransitionOverlay() {
  const [isNavigating, setIsNavigating] = useState(false)
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history)

    window.history.pushState = (data, unused, url) => {
      if (url) {
        try {
          const newPathname = new URL(String(url), window.location.origin).pathname
          if (newPathname !== window.location.pathname) {
            setIsNavigating(true)
            // Safety: auto-hide after 8 seconds in case navigation stalls
            if (safetyTimer.current) clearTimeout(safetyTimer.current)
            safetyTimer.current = setTimeout(() => setIsNavigating(false), 8000)
          }
        } catch {
          // ignore malformed URLs
        }
      }
      return originalPushState(data, unused, url)
    }

    return () => {
      window.history.pushState = originalPushState
      if (safetyTimer.current) clearTimeout(safetyTimer.current)
    }
  }, [])

  // When pathname changes, new page is visible — hide spinner
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      // Brief delay so the new page content is painted before hiding
      const t = setTimeout(() => setIsNavigating(false), 80)
      return () => clearTimeout(t)
    }
  }, [pathname])

  if (!isNavigating) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-blue-100" />
          {/* Spinning arc */}
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-500 animate-spin" />
        </div>
        <p className="text-xs font-medium text-slate-400 tracking-wide animate-pulse">
          Loading…
        </p>
      </div>
    </div>
  )
}
