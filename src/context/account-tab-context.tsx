import { createContext, useContext } from 'react'

type AccountTabContextType = {
  isPending: boolean
}

export const AccountTabContext = createContext<AccountTabContextType | undefined>(undefined)

export function useAccountTabLoading() {
  const context = useContext(AccountTabContext)
  if (!context) {
    throw new Error('useAccountTabLoading must be used within AccountTabProvider')
  }
  return context
}
