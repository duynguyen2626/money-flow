'use client'

import { FormEvent, MouseEvent, ReactNode, useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { parseCashbackConfig, CashbackCycleType, CashbackTier } from '@/lib/cashback'
import { getSharedLimitParentId } from '@/lib/account-utils'
import { Account } from '@/types/moneyflow.types'
import { updateAccountConfigAction } from '@/actions/account-actions'
import type { Json } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { CustomDropdown, type DropdownOption } from '@/components/ui/custom-dropdown'
import { NumberInputWithSuggestions } from '@/components/ui/number-input-suggestions'
import { cn } from '@/lib/utils'

type CategoryOption = { id: string; name: string; type: 'expense' | 'income' }

const toNumericString = (value: number | null | undefined) =>
  typeof value === 'number' ? String(value) : ''

const formatWithSeparators = (value: string) => {
  const digits = value.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim().replace(/,/g, '')
  if (trimmed === '') {
    return null
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function TierItem({
  tier,
  index,
  onRemove,
  onChange,
  categoryOptions
}: {
  tier: CashbackTier
  index: number
  onRemove: () => void
  onChange: (updates: Partial<CashbackTier>) => void
  categoryOptions: CategoryOption[]
}) {
  const rules = useMemo(() => {
    const grouped: { rate: number; maxAmount?: number; mcc_codes?: string; max_reward?: number; categories: string[] }[] = []

    Object.entries(tier.categories).forEach(([catKey, config]) => {
      const existing = grouped.find(
        g => g.rate === config.rate && g.maxAmount === config.maxAmount && g.mcc_codes === config.mcc_codes && g.max_reward === config.max_reward
      )
      if (existing) {
        existing.categories.push(catKey)
      } else {
        grouped.push({
          rate: config.rate,
          maxAmount: config.maxAmount,
          mcc_codes: config.mcc_codes,
          max_reward: config.max_reward,
          categories: [catKey]
        })
      }
    })
    return grouped
  }, [tier.categories])

  const updateRules = (newRules: { rate: number; maxAmount?: number; mcc_codes?: string; max_reward?: number; categories: string[] }[]) => {
    const newCategories: Record<string, { rate: number; maxAmount?: number; mcc_codes?: string; max_reward?: number }> = {}
    newRules.forEach(rule => {
      rule.categories.forEach(cat => {
        newCategories[cat] = {
          rate: rule.rate,
          maxAmount: rule.maxAmount,
          mcc_codes: rule.mcc_codes,
          max_reward: rule.max_reward
        }
      })
    })
    onChange({ categories: newCategories })
  }

  const addRule = () => {
    const draftKey = `DRAFT_${Math.random().toString(36).substr(2, 9)}`
    const newCategories = {
      ...tier.categories,
      [draftKey]: {
        rate: 0,
        max_reward: undefined,
        mcc_codes: undefined
      }
    }
    onChange({ categories: newCategories })
  }

  const removeRule = (ruleIndex: number) => {
    const next = [...rules]
    next.splice(ruleIndex, 1)
    updateRules(next)
  }

  const updateRule = (ruleIndex: number, field: string, value: any) => {
    const rule = rules[ruleIndex]
    const newCategories = { ...tier.categories }

    if (field === 'categories') {
      const newCats = value as string[]
      rule.categories.forEach(c => delete newCategories[c])

      if (newCats.length === 0) {
        const draftKey = `DRAFT_${Math.random().toString(36).substr(2, 9)}`
        newCategories[draftKey] = {
          rate: rule.rate,
          maxAmount: rule.maxAmount,
          mcc_codes: rule.mcc_codes,
          max_reward: rule.max_reward
        }
      } else {
        newCats.forEach(c => {
          newCategories[c] = {
            rate: rule.rate,
            maxAmount: rule.maxAmount,
            mcc_codes: rule.mcc_codes,
            max_reward: rule.max_reward
          }
        })
      }
    } else {
      rule.categories.forEach(c => {
        if (newCategories[c]) {
          newCategories[c] = { ...newCategories[c], [field]: value }
        }
      })
    }

    onChange({ categories: newCategories })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3 flex-1">
          <h5 className="text-sm font-bold text-slate-700 uppercase">Tier {index + 1}</h5>
          <input
            type="text"
            value={tier.name || ''}
            onChange={e => onChange({ name: e.target.value })}
            className="flex-1 max-w-xs rounded border border-slate-200 px-3 py-1.5 text-sm"
            placeholder="e.g. Premium, Gold, Platinum"
          />
        </div>
        <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Min Total Spend</label>
          <NumberInputWithSuggestions
            value={formatWithSeparators(toNumericString(tier.minSpend))}
            onChange={val => onChange({ minSpend: parseOptionalNumber(val) ?? 0 })}
            className="w-full"
            placeholder="15,000,000"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Default Rate (%)</label>
          <input
            type="number"
            value={tier.defaultRate !== undefined ? tier.defaultRate * 100 : ''}
            onChange={e => {
              const val = parseFloat(e.target.value)
              onChange({ defaultRate: isNaN(val) ? undefined : val / 100 })
            }}
            className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="Default for this tier"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600">Category Rules</label>
          <button type="button" onClick={addRule} className="text-xs text-blue-600 hover:underline font-medium">
            + Add Rule
          </button>
        </div>

        {rules.length === 0 && (
          <p className="text-xs text-slate-400 italic">No category rules. Click "+ Add Rule" to add specific rates.</p>
        )}

        {rules.length > 0 && (
          <div className="space-y-3">
            {rules.map((rule, rIndex) => (
              <div key={rIndex} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                {/* Row 1: Category */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase">Category</label>
                  <CategoryMultiSelect
                    options={categoryOptions}
                    selected={rule.categories.filter(c => !c.startsWith('DRAFT_'))}
                    onChange={(cats) => updateRule(rIndex, 'categories', cats)}
                  />
                </div>

                {/* Row 2: Rate & Max Reward */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Rate (%)</label>
                    <input
                      type="number"
                      className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                      value={(rule.rate ?? 0) * 100}
                      onChange={e => {
                        const val = parseFloat(e.target.value)
                        // If empty or NaN, we can store 0 or leave it be.
                        // Best to safe parse.
                        updateRule(rIndex, 'rate', isNaN(val) ? 0 : val / 100)
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Max Reward (VND)</label>
                    <NumberInputWithSuggestions
                      value={formatWithSeparators(toNumericString(rule.max_reward))}
                      onChange={val => updateRule(rIndex, 'max_reward', parseOptionalNumber(val))}
                      className="w-full"
                      placeholder="No Limit"
                    />
                  </div>
                </div>

                {/* Row 3: MCC & Delete */}
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">MCC Codes</label>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                      value={rule.mcc_codes || ''}
                      onChange={e => updateRule(rIndex, 'mcc_codes', e.target.value)}
                      placeholder="e.g. 5411, 5812"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRule(rIndex)}
                    className="rounded-md bg-red-50 p-2 text-red-500 hover:bg-red-100 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryMultiSelect({ options, selected, onChange }: { options: CategoryOption[], selected: string[], onChange: (val: string[]) => void }) {
  const expenseOptions = useMemo(() => options.filter(o => o.type === 'expense'), [options])

  const dropdownOptions = useMemo(() =>
    expenseOptions.map(opt => ({ value: opt.name, label: opt.name }))
    , [expenseOptions])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selected.map(cat => (
          <span key={cat} className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700 font-medium">
            {cat}
            <button type="button" onClick={() => onChange(selected.filter(c => c !== cat))} className="hover:text-blue-900">×</button>
          </span>
        ))}
      </div>
      <CustomDropdown
        options={dropdownOptions}
        value=""
        onChange={(val) => {
          if (val && !selected.includes(val)) {
            onChange([...selected, val])
          }
        }}
        placeholder="+ Add Category"
        className="w-full"
      />
    </div>
  )
}

function TierList({
  tiers,
  onChange,
  categoryOptions
}: {
  tiers: CashbackTier[]
  onChange: (tiers: CashbackTier[]) => void
  categoryOptions: CategoryOption[]
}) {
  const addTier = () => {
    onChange([
      ...tiers,
      { minSpend: 0, categories: {}, defaultRate: 0 }
    ])
  }

  const removeTier = (index: number) => {
    const next = [...tiers]
    next.splice(index, 1)
    onChange(next)
  }

  const updateTier = (index: number, updates: Partial<CashbackTier>) => {
    const next = [...tiers]
    next[index] = { ...next[index], ...updates }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Advanced Tiers</h4>
        <button
          type="button"
          onClick={addTier}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Tier
        </button>
      </div>

      {tiers.length === 0 && (
        <p className="text-sm text-slate-500 italic">No tiers configured. Base rate applies.</p>
      )}

      {tiers.map((tier, index) => (
        <TierItem
          key={index}
          tier={tier}
          index={index}
          onRemove={() => removeTier(index)}
          onChange={(updates) => updateTier(index, updates)}
          categoryOptions={categoryOptions}
        />
      ))}
    </div>
  )
}


type EditAccountDialogProps = {
  account: Account
  collateralAccounts?: Account[]
  accounts?: Account[]
  triggerContent?: ReactNode
  buttonClassName?: string
  onOpen?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type StatusMessage = {
  text: string
  variant: 'success' | 'error'
} | null


const ASSET_TYPES: Account['type'][] = ['savings', 'investment', 'asset']

type SavingsConfig = {
  interestRate: number | null
  termMonths: number | null
  maturityDate: string | null
}

function parseSavingsConfig(raw: Json | null | undefined): SavingsConfig {
  if (!raw) {
    return { interestRate: null, termMonths: null, maturityDate: null }
  }

  let parsed: Record<string, unknown> | null = null
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  } else if (typeof raw === 'object') {
    parsed = raw as Record<string, unknown>
  }

  if (!parsed) {
    return { interestRate: null, termMonths: null, maturityDate: null }
  }

  const parseNumber = (value: unknown) => {
    const asNumber = Number(value)
    return Number.isFinite(asNumber) ? asNumber : null
  }

  return {
    interestRate: parseNumber(parsed.interestRate),
    termMonths: parseNumber(parsed.termMonths ?? parsed.term),
    maturityDate: typeof parsed.maturityDate === 'string' ? parsed.maturityDate : null,
  }
}

export function EditAccountDialog({
  account,
  collateralAccounts,
  accounts = [],
  triggerContent,
  buttonClassName,
  onOpen,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: EditAccountDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControllable = externalOpen !== undefined && externalOnOpenChange !== undefined
  const open = isControllable ? externalOpen : internalOpen
  const setOpen = isControllable ? externalOnOpenChange : setInternalOpen
  const [status, setStatus] = useState<StatusMessage>(null)
  const [isPending, startTransition] = useTransition()

  const parsedCashbackConfig = useMemo(
    () => parseCashbackConfig(account.cashback_config),
    [account.cashback_config]
  )
  const parsedSavingsConfig = useMemo(
    () => parseSavingsConfig(account.cashback_config),
    [account.cashback_config]
  )



  const [name, setName] = useState(account.name)
  const [accountType, setAccountType] = useState<Account['type']>(account.type)
  const [securedByAccountId, setSecuredByAccountId] = useState(account.secured_by_account_id ?? '')
  const [isSecured, setIsSecured] = useState(Boolean(account.secured_by_account_id))
  const [creditLimit, setCreditLimit] = useState(formatWithSeparators(toNumericString(account.credit_limit)))
  const [annualFee, setAnnualFee] = useState(formatWithSeparators(toNumericString(account.annual_fee)))
  const [logoUrl, setLogoUrl] = useState(account.logo_url ?? '')
  const [rate, setRate] = useState(String(parsedCashbackConfig.rate))
  const [maxAmount, setMaxAmount] = useState(formatWithSeparators(toNumericString(parsedCashbackConfig.maxAmount)))
  const [minSpend, setMinSpend] = useState(formatWithSeparators(toNumericString(parsedCashbackConfig.minSpend)))
  const [cycleType, setCycleType] = useState<CashbackCycleType>(parsedCashbackConfig.cycleType)
  const [statementDay, setStatementDay] = useState(toNumericString(parsedCashbackConfig.statementDay))
  const [dueDate, setDueDate] = useState(toNumericString(parsedCashbackConfig.dueDate))
  const [interestRate, setInterestRate] = useState(toNumericString(parsedSavingsConfig.interestRate))
  const [termMonths, setTermMonths] = useState(toNumericString(parsedSavingsConfig.termMonths))
  const [maturityDate, setMaturityDate] = useState(parsedSavingsConfig.maturityDate ?? '')
  const [parentAccountId, setParentAccountId] = useState(getSharedLimitParentId(account.cashback_config) ?? '')
  const [overrideParentSecured, setOverrideParentSecured] = useState(false)

  // Secured Logic Inheritance with Override
  useEffect(() => {
    if (parentAccountId && !overrideParentSecured) {
      const parent = accounts.find(a => a.id === parentAccountId)
      if (parent) {
        if (parent.secured_by_account_id) {
          setIsSecured(true)
          setSecuredByAccountId(parent.secured_by_account_id)
        } else {
          setIsSecured(false)
          setSecuredByAccountId('')
        }
      }
    }
  }, [parentAccountId, accounts, overrideParentSecured])

  // Reset override if parent changes to empty
  useEffect(() => {
    if (!parentAccountId) {
      setOverrideParentSecured(false)
    }
  }, [parentAccountId])

  const [tiers, setTiers] = useState<CashbackTier[]>(parsedCashbackConfig.tiers ?? [])
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('categories').select('id, name, type').order('name')
      if (data) setCategoryOptions(data)
    }
    fetchCategories()
  }, [])

  const isCreditCard = accountType === 'credit_card'
  const isAssetAccount = ASSET_TYPES.includes(accountType)
  const collateralOptions = useMemo(
    () =>
      (collateralAccounts ?? []).filter(
        candidate => candidate.id !== account.id && ASSET_TYPES.includes(candidate.type)
      ),
    [collateralAccounts, account.id]
  )
  const accountTypeOptions = useMemo(
    () => [
      { value: 'credit_card', label: 'Credit card' },
      { value: 'bank', label: 'Bank' },
      { value: 'savings', label: 'Savings' },
      { value: 'investment', label: 'Investment' },
      { value: 'cash', label: 'Cash' },
      { value: 'ewallet', label: 'E-wallet' },
      { value: 'debt', label: 'Debt' },
      { value: 'asset', label: 'Asset' },
    ],
    []
  )

  const resetForm = () => {
    const freshCashback = parseCashbackConfig(account.cashback_config)
    const freshSavings = parseSavingsConfig(account.cashback_config)
    setName(account.name)
    setAccountType(account.type)
    setSecuredByAccountId(account.secured_by_account_id ?? '')
    setIsSecured(Boolean(account.secured_by_account_id))
    setCreditLimit(formatWithSeparators(toNumericString(account.credit_limit)))
    setAnnualFee(formatWithSeparators(toNumericString(account.annual_fee)))
    setRate(String(freshCashback.rate))
    setMaxAmount(formatWithSeparators(toNumericString(freshCashback.maxAmount)))
    setMinSpend(formatWithSeparators(toNumericString(freshCashback.minSpend)))
    setCycleType(freshCashback.cycleType)
    setStatementDay(toNumericString(freshCashback.statementDay))
    setDueDate(toNumericString(freshCashback.dueDate))
    setInterestRate(toNumericString(freshSavings.interestRate))
    setTermMonths(toNumericString(freshSavings.termMonths))
    setMaturityDate(freshSavings.maturityDate ?? '')
    setLogoUrl(account.logo_url ?? '')
    setParentAccountId(getSharedLimitParentId(account.cashback_config) ?? '')
    setTiers(freshCashback.tiers ?? [])
    setStatus(null)
  }

  const closeDialog = () => setOpen(false)

  const stopPropagation = (event?: MouseEvent<HTMLDivElement>) => {
    event?.stopPropagation()
  }

  const openDialog = () => {
    onOpen?.()
    resetForm()
    setOpen(true)
  }

  // Filter out child accounts - only allow linking to parent or standalone cards
  const parentCandidates = useMemo(() =>
    accounts.filter(acc => {
      if (acc.id === account.id) return false
      if (acc.type !== 'credit_card') return false
      // Exclude child accounts (those with parent_account_id or parent_info)
      const isChild = !!acc.parent_account_id || !!acc.relationships?.parent_info
      return !isChild
    }),
    [accounts, account.id]
  )

  // Smart Parent Suggestion - triggers on name change
  // Always calculate suggestion, even if parent is already selected
  const suggestedParent = useMemo(() => {
    if (!isCreditCard || !name.trim()) return null
    const firstWord = name.trim().split(' ')[0]
    if (firstWord.length < 2) return null
    const candidate = parentCandidates.find(acc =>
      acc.name.toLowerCase().startsWith(firstWord.toLowerCase())
    )
    // Only show suggestion if it's different from current selection
    if (candidate && candidate.id !== parentAccountId) {
      return candidate
    }
    return null
  }, [name, isCreditCard, parentAccountId, parentCandidates])

  const parseStatementDayValue = (value: string) => {
    const parsed = parseOptionalNumber(value)
    if (parsed === null) {
      return null
    }
    const normalized = Math.min(Math.max(Math.floor(parsed), 1), 31)
    return normalized
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setStatus({ text: 'Account name cannot be empty.', variant: 'error' })
      return
    }

    const nextCreditLimit = isCreditCard ? parseOptionalNumber(creditLimit) : null
    const nextAnnualFee = isCreditCard ? parseOptionalNumber(annualFee) : null
    const cleanedLogoUrl = logoUrl.trim() || null

    const rateValue = parseOptionalNumber(rate) ?? 0
    let configPayload: Json | undefined
    if (isCreditCard) {
      configPayload = {
        rate: rateValue,
        maxAmount: parseOptionalNumber(maxAmount),
        minSpend: parseOptionalNumber(minSpend),
        cycleType,
        statementDay: cycleType === 'statement_cycle'
          ? parseStatementDayValue(statementDay)
          : null,
        dueDate: parseStatementDayValue(dueDate),
        parentAccountId: parentAccountId || null,
        hasTiers: tiers.length > 0,
        tiers: tiers.length > 0 ? tiers.map(t => {
          const cleanCategories: Record<string, any> = {}
          Object.entries(t.categories).forEach(([k, v]) => {
            if (!k.startsWith('DRAFT_')) {
              cleanCategories[k] = v
            }
          })
          return { ...t, categories: cleanCategories }
        }) : undefined,
      }
    } else if (isAssetAccount) {
      configPayload = {
        interestRate: parseOptionalNumber(interestRate),
        termMonths: parseOptionalNumber(termMonths),
        maturityDate: maturityDate.trim() || null,
      }
    }

    const securedBy = isCreditCard && isSecured ? (securedByAccountId || null) : null

    startTransition(async () => {
      setStatus(null)
      const success = await updateAccountConfigAction({
        id: account.id,
        name: trimmedName,
        creditLimit: nextCreditLimit,
        annualFee: nextAnnualFee,
        cashbackConfig: configPayload,
        type: accountType,
        securedByAccountId: securedBy,
        logoUrl: cleanedLogoUrl,
        parentAccountId: parentAccountId || null,
      })

      if (!success) {
        setStatus({ text: 'Could not update account. Please try again.', variant: 'error' })
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      {!isControllable && (
        <span
          role="button"
          tabIndex={0}
          className={
            buttonClassName ??
            (triggerContent
              ? 'inline-flex items-center justify-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50'
              : 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600')
          }
          onClick={event => {
            event.stopPropagation()
            onOpen?.()
            openDialog()
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpen?.()
              openDialog()
            }
          }}
        >
          {triggerContent ?? 'Settings'}
        </span>
      )}

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit account configuration"
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12"
            onClick={closeDialog}
          >
            <div
              className="w-full max-w-5xl rounded-xl bg-white shadow-2xl flex flex-col"
              style={{ maxHeight: '85vh', minHeight: '400px' }}
              onClick={stopPropagation}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl">
                <h2 className="text-xl font-bold text-slate-900">Edit Account</h2>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  onClick={closeDialog}
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Account Type Selection - Main Tabs */}
                  <div className="mb-6 space-y-4">
                    <label className="block text-sm font-medium text-slate-700">Account Type</label>

                    {/* Main Category Tabs */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setAccountType('credit_card')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${accountType === 'credit_card'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        💳 Credit Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType('bank')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${accountType === 'bank'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        🏦 Bank
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!['savings', 'investment', 'asset'].includes(accountType)) {
                            setAccountType('savings')
                          }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${['savings', 'investment', 'asset'].includes(accountType)
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        💰 Savings & Investment
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!['cash', 'ewallet', 'debt'].includes(accountType)) {
                            setAccountType('cash')
                          }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${['cash', 'ewallet', 'debt'].includes(accountType)
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        📦 Others
                      </button>
                    </div>

                    {/* Sub-tabs for Savings & Investment */}
                    {['savings', 'investment', 'asset'].includes(accountType) && (
                      <div className="flex gap-2 pl-4 border-l-2 border-blue-200">
                        <button
                          type="button"
                          onClick={() => setAccountType('savings')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${accountType === 'savings'
                            ? 'bg-blue-100 text-blue-700 font-semibold'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                          Savings
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountType('investment')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${accountType === 'investment'
                            ? 'bg-blue-100 text-blue-700 font-semibold'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                          Investment
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountType('asset')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${accountType === 'asset'
                            ? 'bg-blue-100 text-blue-700 font-semibold'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                          Secured Asset
                        </button>
                      </div>
                    )}

                    {/* Sub-tabs for Others */}
                    {['cash', 'ewallet', 'debt'].includes(accountType) && (
                      <div className="flex gap-2 pl-4 border-l-2 border-blue-200">
                        <button
                          type="button"
                          onClick={() => setAccountType('cash')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${accountType === 'cash'
                            ? 'bg-blue-100 text-blue-700 font-semibold'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                          Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountType('ewallet')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${accountType === 'ewallet'
                            ? 'bg-blue-100 text-blue-700 font-semibold'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                          E-wallet
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountType('debt')}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${accountType === 'debt'
                            ? 'bg-blue-100 text-blue-700 font-semibold'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                          Debt
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2 Column Layout */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Left Column - Basic Info */}
                    <div className="space-y-5">
                      <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">Basic Information</h3>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-sm font-medium text-slate-600">Name</label>
                          {isCreditCard && (
                            <span className={cn(
                              "text-xs px-2.5 py-0.5 rounded-full font-bold border",
                              parentAccountId
                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                : "bg-slate-50 text-slate-700 border-slate-100"
                            )}>
                              {parentAccountId ? "Child Card" : "Primary Card"}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={event => setName(event.target.value)}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Account name"
                        />
                      </div>

                      {isCreditCard && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-600">Parent Account (Shared Limit)</label>
                            {suggestedParent && (
                              <button
                                type="button"
                                onClick={() => setParentAccountId(suggestedParent.id)}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Link to {suggestedParent.name}?
                              </button>
                            )}
                          </div>
                          <CustomDropdown
                            options={[
                              { value: '', label: 'None (Primary Card)' },
                              ...parentCandidates.map(acc => ({ value: acc.id, label: acc.name }))
                            ]}
                            value={parentAccountId}
                            onChange={setParentAccountId}
                            className="w-full"
                          />
                          <p className="text-xs text-slate-500">
                            If this is a supplementary card, select the primary card here.
                          </p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-600">Logo URL</label>
                        <input
                          type="url"
                          value={logoUrl}
                          onChange={event => setLogoUrl(event.target.value)}
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="https://logo.example.com/bank.png"
                        />
                      </div>

                      {isCreditCard && (
                        <>


                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">Credit Limit</label>
                            <NumberInputWithSuggestions
                              value={creditLimit}
                              onChange={setCreditLimit}
                              className="w-full"
                              placeholder="Credit limit"
                              disabled={!!parentAccountId}
                            />
                            {parentAccountId && (
                              <p className="text-xs text-amber-600">
                                Shared limit with parent card
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">Annual Fee</label>
                            <NumberInputWithSuggestions
                              value={annualFee}
                              onChange={setAnnualFee}
                              className="w-full"
                              placeholder="Annual fee"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-end gap-2 mb-1">
                              <label className="text-xs text-slate-500 font-medium">Use different secured asset?</label>
                              <Switch
                                checked={overrideParentSecured}
                                onCheckedChange={(checked) => {
                                  setOverrideParentSecured(checked);
                                  // If turning ON override, force Secured to ON
                                  if (checked) {
                                    setIsSecured(true);
                                  }
                                }}
                                className="scale-75 origin-right"
                              />
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">
                                  Secured (collateral)
                                </label>
                                <Switch
                                  checked={isSecured}
                                  disabled={!!parentAccountId && !overrideParentSecured}
                                  onCheckedChange={(checked) => {
                                    setIsSecured(checked)
                                    if (!checked) setSecuredByAccountId('')
                                  }}
                                />
                              </div>

                              {isSecured && (
                                <div className="space-y-1 mt-3">
                                  <label className="text-sm font-medium text-slate-600">Secured by</label>
                                  <CustomDropdown
                                    options={[
                                      { value: '', label: 'None' },
                                      ...collateralOptions.map(option => ({ value: option.id, label: option.name }))
                                    ]}
                                    value={securedByAccountId}
                                    onChange={setSecuredByAccountId}
                                    className="w-full"
                                    disabled={!!parentAccountId && !overrideParentSecured}
                                  />
                                  {!overrideParentSecured && parentAccountId && (
                                    <p className="text-xs text-slate-500">Inherited from parent card</p>
                                  )}
                                  {(!parentAccountId || overrideParentSecured) && (
                                    <p className="text-xs text-slate-500">
                                      Choose a savings/investment account as collateral for this card.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}


                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                      {isCreditCard && (
                        <div className="space-y-5">
                          <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">Cashback Configuration</h3>

                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">Rate (%)</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="100"
                              value={rate ? (parseFloat(rate) * 100).toString() : ''}
                              onChange={event => {
                                const val = parseFloat(event.target.value)
                                setRate(isNaN(val) ? '0' : (val / 100).toString())
                              }}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="10"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-600">Max amount</label>
                              <NumberInputWithSuggestions
                                value={maxAmount}
                                onChange={setMaxAmount}
                                className="w-full"
                                placeholder="Ex: 100000"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-600">Min spend</label>
                              <NumberInputWithSuggestions
                                value={minSpend}
                                onChange={setMinSpend}
                                className="w-full"
                                placeholder="Ex: 500000"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">Cycle type</label>
                            <CustomDropdown
                              options={[
                                { value: 'calendar_month', label: 'Calendar month' },
                                { value: 'statement_cycle', label: 'Statement cycle' }
                              ]}
                              value={cycleType ?? ''}
                              onChange={(val) => setCycleType(val as CashbackCycleType)}
                              className="w-full"
                            />
                          </div>

                          {cycleType === 'statement_cycle' && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-600">Statement day</label>
                              <input
                                type="number"
                                min="1"
                                max="31"
                                step="1"
                                value={statementDay}
                                onChange={event => setStatementDay(event.target.value)}
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="Day of month"
                              />
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">Due Date (Day)</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              step="1"
                              value={dueDate}
                              onChange={event => setDueDate(event.target.value)}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="Day of month"
                            />
                          </div>
                        </div>
                      )}

                      {isAssetAccount && (
                        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <h4 className="text-sm font-semibold text-slate-700">Interest Info</h4>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">Interest rate (%)</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={interestRate}
                              onChange={event => setInterestRate(event.target.value)}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="Ex: 7.2"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Statement Day</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={statementDay}
                              onChange={e => setStatementDay(e.target.value)}
                              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Day (1-31)"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">Due Date</label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={dueDate}
                              onChange={e => setDueDate(e.target.value)}
                              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Day (1-31)"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">Term (months)</label>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={termMonths}
                              onChange={event => setTermMonths(event.target.value)}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                              placeholder="Ex: 12"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">Maturity date</label>
                            <input
                              type="date"
                              value={maturityDate}
                              onChange={event => setMaturityDate(event.target.value)}
                              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Advanced Tiers - Full Width */}
                  {isCreditCard && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <TierList tiers={tiers} onChange={setTiers} categoryOptions={categoryOptions} />
                    </div>
                  )}

                  {status && (
                    <p
                      className={`mt-4 text-sm ${status.variant === 'error' ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {status.text}
                    </p>
                  )}

                </div>
                <div className="flex justify-end gap-3 border-t border-slate-200 p-6 bg-white rounded-b-xl shrink-0">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    onClick={closeDialog}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
