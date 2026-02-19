'use client'

import { useEffect } from 'react'

export function useLoadingFavicon(isLoading: boolean) {
  useEffect(() => {
    const originalFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    const originalHref = originalFavicon?.href || '/favicon.svg'

    if (isLoading) {
      // Create a dynamic SVG with a spinner matching the new PREMIUM design
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <!-- Orbiting ring -->
          <circle cx="50" cy="50" r="42" stroke="#3b82f6" stroke-width="10" fill="none" stroke-dasharray="160 100" opacity="0.8">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </circle>
          <!-- Premium Gold Core -->
          <circle cx="50" cy="50" r="28" fill="#f59e0b" stroke="#92400e" stroke-width="2" />
          <text x="50" y="60" font-size="32" font-weight="950" fill="white" text-anchor="middle" font-family="Arial">$</text>
        </svg>
      `
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = url
      link.id = 'loading-favicon'

      // Remove current favicon(s)
      const icons = document.querySelectorAll('link[rel="icon"]')
      icons.forEach(icon => icon.parentNode?.removeChild(icon))

      document.head.appendChild(link)

      return () => {
        const loadingIcon = document.getElementById('loading-favicon')
        if (loadingIcon) {
          loadingIcon.parentNode?.removeChild(loadingIcon)
        }
        URL.revokeObjectURL(url)

        // Restore original
        const restoreLink = document.createElement('link')
        restoreLink.rel = 'icon'
        restoreLink.href = originalHref
        document.head.appendChild(restoreLink)
      }
    }
  }, [isLoading])
}
