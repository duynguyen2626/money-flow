import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'
import { TooltipProvider } from '@/components/ui/custom-tooltip'
import { AppLayout } from '@/components/moneyflow/app-layout'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Money Flow 3.0 - Personal Finance Dashboard',
  description: 'Track your accounts, transactions, debts, and cashback with double-entry bookkeeping.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full w-full overflow-hidden">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full w-full overflow-hidden flex flex-col bg-background font-sans`} suppressHydrationWarning>
        <TooltipProvider>
          <AppLayout>{children}</AppLayout>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  )
}
