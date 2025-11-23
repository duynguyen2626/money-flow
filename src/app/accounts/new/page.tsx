'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EditAccountDialog } from '@/components/moneyflow/edit-account-dialog'
import { Account } from '@/types/moneyflow.types'
import { createPortal } from 'react-dom'

export default function NewAccountPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Create a mock account object for the dialog
  const newAccount: Account = {
    id: 'new',
    name: '',
    type: 'bank',
    balance: 0,
    credit_limit: null,
    cashback_config: null,
    secured_by_account_id: null,
    is_active: true,
    owner_id: null,
    img_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const handleSuccess = () => {
    router.push('/accounts')
  }

  if (!isMounted) {
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Add New Account</h1>
          <p className="text-gray-600">Create a new bank account, credit card, or other financial account.</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <EditAccountDialog 
            account={newAccount}
            triggerContent="Open Account Creation Form"
            buttonClassName="hidden"
            onOpen={() => console.log('Dialog opened')}
          />
        </div>
      </div>
    </div>
  )
}