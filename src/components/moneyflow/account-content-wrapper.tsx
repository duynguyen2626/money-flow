'use client'

import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAccountTabLoading } from '@/context/account-tab-context'

type AccountContentWrapperProps = {
  children: ReactNode
}

export function AccountContentWrapper({ children }: AccountContentWrapperProps) {
  const { isPending } = useAccountTabLoading()

  return (
    <div className="relative flex-1 bg-white overflow-hidden">
      <div
        className={`h-full transition-opacity duration-200 ${
          isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}
      >
        {children}
      </div>

      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm z-20 pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="text-sm font-medium text-slate-600">Loading...</span>
          </div>
        </div>
      )}
    </div>
  )
}
