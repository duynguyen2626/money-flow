'use client'

import dynamic from 'next/dynamic'

// This wrapper exists solely to use dynamic({ ssr: false }) inside a
// Client Component — next/dynamic with ssr:false is not allowed in
// Server Components (layout.tsx).  Rendering AppLayoutV2 client-only
// eliminates the hydration mismatch caused by browser extensions
// injecting nodes into <body> before React hydrates.
const AppLayoutV2 = dynamic(
    () => import('@/components/moneyflow/app-layout-v2').then(m => ({ default: m.AppLayoutV2 })),
    {
        ssr: false,
        // Invisible placeholder — same dimensions as the real layout so
        // there's no layout shift while the JS bundle loads.
        loading: () => <div className="flex h-full w-full overflow-hidden" />,
    }
)

export function AppLayoutClientWrapper({ children }: { children: React.ReactNode }) {
    return <AppLayoutV2>{children}</AppLayoutV2>
}
