'use client'

import { useEffect } from 'react'

export function useLoadingFavicon(isLoading: boolean) {
    useEffect(() => {
        const originalFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
        const originalHref = originalFavicon?.href || '/favicon.svg'

        if (isLoading) {
            // Create a dynamic SVG with a spinner
            const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#3b82f6" stroke-width="12" fill="none" stroke-dasharray="180 100">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="50" cy="50" r="20" fill="#f59e0b" />
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
