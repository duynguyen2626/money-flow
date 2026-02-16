/*
'use client'

import { FormEvent, MouseEvent, ReactNode, useMemo, useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { parseCashbackConfig, CashbackCycleType, CashbackLevel, normalizeCashbackConfig } from '@/lib/cashback'
import { Account } from '@/types/moneyflow.types'
import { SYSTEM_ACCOUNTS, ASSET_TYPES } from '@/lib/constants'
import type { Json } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { createAccount } from '@/actions/account-actions'
import { Plus, Trash2, X, Copy, Loader2, Info } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { CustomDropdown, type DropdownOption } from '@/components/ui/custom-dropdown'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { NumberInputWithSuggestions } from '@/components/ui/number-input-suggestions'
import { InputWithClear } from '@/components/ui/input-with-clear'
import { SmartAmountInput } from '@/components/ui/smart-amount-input'
import { CategorySlide } from "@/components/accounts/v2/CategorySlide";
import { formatShortVietnameseCurrency } from '@/lib/number-to-text'
import { cn } from '@/lib/utils'

// ... (Rest of the archived code)
*/

// DEPRECATED: Use AccountSlideV2 instead
import React from 'react';

export function CreateAccountDialog({ trigger }: { trigger?: React.ReactNode, [key: string]: any }) {
  console.warn("CreateAccountDialog is deprecated. Use AccountSlideV2 instead.");
  return <>{trigger || null}</>;
}
