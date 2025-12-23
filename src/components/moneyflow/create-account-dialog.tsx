'use client'

import { FormEvent, MouseEvent, ReactNode, useMemo, useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { parseCashbackConfig, CashbackCycleType, CashbackLevel, normalizeCashbackConfig } from '@/lib/cashback'
import { Account } from '@/types/moneyflow.types'
import type { Json } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { createAccount } from '@/actions/account-actions'
import { Plus, Trash2, X, Copy, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { CustomDropdown, type DropdownOption } from '@/components/ui/custom-dropdown'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { NumberInputWithSuggestions } from '@/components/ui/number-input-suggestions'
import { CategoryDialog } from '@/components/moneyflow/category-dialog'
import { cn } from '@/lib/utils'

type CategoryOption = { id: string; name: string; type: string; icon?: string | null; logo_url?: string | null }

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

// Import TierItem, CategoryMultiSelect, TierList from edit-account-dialog
// (Copy the same components here for consistency)

function LevelItem({
  level,
  index,
  onRemove,
  onClone,
  onChange,
  categoryOptions,
  onAddCategory,
  activeCategoryCallback
}: {
  level: CashbackLevel
  index: number
  onRemove: () => void
  onClone: () => void
  onChange: (updates: Partial<CashbackLevel>) => void
  categoryOptions: CategoryOption[]
  onAddCategory?: () => void
  activeCategoryCallback?: React.MutableRefObject<((categoryId: string) => void) | null>
}) {
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null)
  const rules = level.rules || []

  const addRule = () => {
    const newRules = [
      ...rules,
      {
        id: `rule_${Math.random().toString(36).substr(2, 9)}`,
        categoryIds: [],
        rate: 0,
        maxReward: null
      }
    ]
    onChange({ rules: newRules })
  }

  const removeRule = (ruleIndex: number) => {
    const next = [...rules]
    next.splice(ruleIndex, 1)
    onChange({ rules: next })
  }

  const updateRule = (ruleIndex: number, updates: Partial<any>) => {
    const next = [...rules]
    next[ruleIndex] = { ...next[ruleIndex], ...updates }
    onChange({ rules: next })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3 flex-1">
          <h5 className="text-sm font-bold text-slate-700 uppercase">Level {index + 1}</h5>
          <input
            type="text"
            value={level.name || ''}
            onChange={e => onChange({ name: e.target.value })}
            className="flex-1 max-w-xs rounded border border-slate-200 px-3 py-1.5 text-sm"
            placeholder="e.g. Premium, Gold, Platinum"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClone}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
            title="Clone Level"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            title="Delete Level"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Min Total Spend</label>
          <NumberInputWithSuggestions
            value={formatWithSeparators(toNumericString(level.minTotalSpend))}
            onChange={val => onChange({ minTotalSpend: parseOptionalNumber(val) ?? 0 })}
            onFocus={e => e.target.select()}
            className="w-full"
            placeholder="15,000,000"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Default Rate (%)</label>
          <input
            type="number"
            value={level.defaultRate !== null ? parseFloat((level.defaultRate * 100).toFixed(6)) : ''}
            onChange={e => {
              const val = parseFloat(e.target.value)
              onChange({ defaultRate: isNaN(val) ? null : val / 100 })
            }}
            onFocus={e => e.target.select()}
            className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="Default for this level"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rules.map((rule, rIndex) => (
            <div key={rule.id || rIndex} className="relative group rounded-xl border-2 border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-blue-200 hover:bg-white hover:shadow-md space-y-4">
              {/* Delete Rule button - visible on hover */}
              <button
                type="button"
                onClick={() => setRuleToDelete(rIndex)}
                className="absolute -top-2 -right-2 rounded-full bg-white border border-slate-200 p-1.5 text-slate-400 shadow-sm transition hover:bg-red-50 hover:text-red-500 hover:border-red-200 z-10"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Row 1: Category */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Categories</label>
                </div>
                <CategoryMultiSelect
                  options={categoryOptions}
                  selected={rule.categoryIds || []}
                  onChange={(cats) => updateRule(rIndex, { categoryIds: cats })}
                  onAddNew={() => {
                    console.log('🔵 [DEBUG] Create New Category clicked in LevelItem')
                    // Register this CategoryMultiSelect's onChange callback
                    if (activeCategoryCallback) {
                      activeCategoryCallback.current = (categoryId: string) => {
                        console.log('🟢 [DEBUG] Auto-adding category to rule:', categoryId)
                        updateRule(rIndex, { categoryIds: [...(rule.categoryIds || []), categoryId] })
                      }
                      console.log('🔵 [DEBUG] Callback registered for rule index:', rIndex)
                    } else {
                      console.error('🔴 [DEBUG] activeCategoryCallback is undefined!')
                    }
                    if (onAddCategory) onAddCategory()
                  }}
                />
              </div>

              {/* Row 2: Rate & Max Reward */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      className="w-full rounded-lg border-slate-200 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={parseFloat(((rule.rate ?? 0) * 100).toFixed(6))}
                      onChange={e => {
                        const val = parseFloat(e.target.value)
                        updateRule(rIndex, { rate: isNaN(val) ? 0 : val / 100 })
                      }}
                      onFocus={e => e.target.select()}
                      placeholder="e.g. 15"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-xs">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Max Reward</label>
                  <div className="relative">
                    <NumberInputWithSuggestions
                      value={formatWithSeparators(toNumericString(rule.maxReward))}
                      onChange={val => updateRule(rIndex, { maxReward: parseOptionalNumber(val) })}
                      onFocus={e => e.target.select()}
                      className="w-full rounded-lg border-slate-200 pl-3 pr-8 py-2 text-sm bg-white"
                      placeholder="No Limit"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-[10px] font-medium">VND</span>
                  </div>
                </div>
              </div>

              {rule.categoryIds.length === 0 && (
                <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 italic">
                  Hint: Select categories this rule applies to.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <ConfirmationModal
        isOpen={ruleToDelete !== null}
        onClose={() => setRuleToDelete(null)}
        onConfirm={() => {
          if (ruleToDelete !== null) {
            removeRule(ruleToDelete)
          }
        }}
        title="Remove Category Rule"
        description="Are you sure you want to remove this category rule? This action cannot be undone."
      />
    </div>
  )
}



function CategoryMultiSelect({ options, selected, onChange, onAddNew }: { options: CategoryOption[], selected: string[], onChange: (val: string[]) => void, onAddNew?: () => void }) {
  const expenseOptions = useMemo(() => options.filter(o => o.type === 'expense'), [options])

  const dropdownOptions = useMemo(() =>
    expenseOptions.map(opt => ({
      value: opt.id,
      label: opt.name,
      icon: opt.icon || undefined,
      logo_url: opt.logo_url || undefined
    }))
    , [expenseOptions])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selected.map(catId => {
          const cat = options.find(o => o.id === catId || o.name === catId)
          const label = cat ? cat.name : catId
          return (
            <span key={catId} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs text-blue-700 font-medium">
              {cat?.logo_url ? (
                <img src={cat.logo_url} alt="" className="h-3 w-3 object-contain rounded-none mr-0.5" />
              ) : cat?.icon ? (
                <span className="text-[10px] mr-0.5">{cat.icon}</span>
              ) : null}
              {label}
              <button type="button" onClick={() => onChange(selected.filter(c => c !== catId))} className="hover:text-blue-900 ml-0.5 font-bold">×</button>
            </span>
          )
        })}
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
        allowCustom
        onAddNew={onAddNew}
        addLabel="Category"
      />
    </div>
  )
}

function LevelList({
  levels,
  onChange,
  categoryOptions,
  onAddCategory,
  activeCategoryCallback
}: {
  levels: CashbackLevel[]
  onChange: (levels: CashbackLevel[]) => void
  categoryOptions: CategoryOption[]
  onAddCategory?: () => void
  activeCategoryCallback?: React.MutableRefObject<((categoryId: string) => void) | null>
}) {
  const [levelToDelete, setLevelToDelete] = useState<number | null>(null)
  const addLevel = () => {
    onChange([
      ...levels,
      { id: `lvl_${Date.now()}`, name: '', minTotalSpend: 0, defaultRate: null, rules: [] }
    ])
  }

  const removeLevel = (index: number) => {
    const next = [...levels]
    next.splice(index, 1)
    onChange(next)
  }

  const updateLevel = (index: number, updates: Partial<CashbackLevel>) => {
    const next = [...levels]
    next[index] = { ...next[index], ...updates }
    onChange(next)
  }

  const cloneLevel = (index: number) => {
    const levelToClone = levels[index]
    const clonedLevel: CashbackLevel = {
      ...levelToClone,
      id: `lvl_${Math.random().toString(36).substr(2, 9)}`,
      name: levelToClone.name ? `${levelToClone.name} (Copy)` : '',
      // Clone rules but give them new IDs
      rules: levelToClone.rules?.map(rule => ({
        ...rule,
        id: `rule_${Math.random().toString(36).substr(2, 9)}`
      }))
    }
    const next = [...levels]
    next.splice(index + 1, 0, clonedLevel)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Cashback Levels</h4>
        <button
          type="button"
          onClick={addLevel}
          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Level
        </button>
      </div>

      {levels.length === 0 && (
        <p className="text-sm text-slate-500 italic">No levels configured. Base rate applies.</p>
      )}

      {levels.map((level, index) => (
        <LevelItem
          key={level.id || index}
          level={level}
          index={index}
          onRemove={() => setLevelToDelete(index)}
          onClone={() => cloneLevel(index)}
          onChange={(updates) => updateLevel(index, updates)}
          categoryOptions={categoryOptions}
          onAddCategory={onAddCategory}
          activeCategoryCallback={activeCategoryCallback}
        />
      ))}

      <ConfirmationModal
        isOpen={levelToDelete !== null}
        onClose={() => setLevelToDelete(null)}
        onConfirm={() => {
          if (levelToDelete !== null) {
            removeLevel(levelToDelete)
          }
        }}
        title="Delete Cashback Level"
        description="Are you sure you want to delete this level and all its rules? This action cannot be undone."
      />
    </div>
  )
}

type CreateAccountDialogProps = {
  collateralAccounts?: Account[]
  creditCardAccounts?: Account[]
}

type StatusMessage = {
  text: string
  variant: 'success' | 'error'
} | null

const ASSET_TYPES: Account['type'][] = ['savings', 'investment', 'asset']

export function CreateAccountDialog({ collateralAccounts = [], creditCardAccounts = [] }: CreateAccountDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<StatusMessage>(null)
  const [isPending, startTransition] = useTransition()
  const [showCloseWarning, setShowCloseWarning] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const activeCategoryCallback = useRef<((categoryId: string) => void) | null>(null)

  const [name, setName] = useState('')
  const [accountType, setAccountType] = useState<Account['type']>('credit_card')
  const [logoUrl, setLogoUrl] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [annualFee, setAnnualFee] = useState('')
  const [isSecured, setIsSecured] = useState(false)
  const [securedByAccountId, setSecuredByAccountId] = useState('')
  const [parentAccountId, setParentAccountId] = useState('')

  // Cashback fields
  const [rate, setRate] = useState('0')
  const [maxAmount, setMaxAmount] = useState('')
  const [minSpend, setMinSpend] = useState('')
  const [cycleType, setCycleType] = useState<CashbackCycleType>('calendar_month')
  const [statementDay, setStatementDay] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [levels, setLevels] = useState<CashbackLevel[]>([])

  // Savings fields
  const [interestRate, setInterestRate] = useState('')
  const [termMonths, setTermMonths] = useState('')
  const [maturityDate, setMaturityDate] = useState('')

  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('categories').select('id, name, type, icon, logo_url').order('name')
      if (data) setCategoryOptions(data as any)
    }
    fetchCategories()
  }, [])

  const isCreditCard = accountType === 'credit_card'
  const isAssetAccount = ASSET_TYPES.includes(accountType)

  const collateralOptions = useMemo(
    () => collateralAccounts.filter(candidate => ASSET_TYPES.includes(candidate.type)),
    [collateralAccounts]
  )

  // Filter out child accounts - only allow linking to parent or standalone cards
  const parentCandidates = useMemo(() =>
    creditCardAccounts.filter(acc => {
      // Exclude child accounts (those with parent_account_id or parent_info)
      const isChild = !!acc.parent_account_id || !!acc.relationships?.parent_info
      return !isChild
    }),
    [creditCardAccounts]
  )

  const isDirty = useMemo(() => {
    return name !== '' ||
      accountType !== 'credit_card' ||
      logoUrl !== '' ||
      creditLimit !== '' ||
      annualFee !== '' ||
      isSecured !== false ||
      securedByAccountId !== '' ||
      parentAccountId !== '' ||
      rate !== '0' ||
      maxAmount !== '' ||
      minSpend !== '' ||
      cycleType !== 'calendar_month' ||
      statementDay !== '' ||
      dueDate !== '' ||
      levels.length > 0 ||
      interestRate !== '' ||
      termMonths !== '' ||
      maturityDate !== ''
  }, [name, accountType, logoUrl, creditLimit, annualFee, isSecured, securedByAccountId, parentAccountId, rate, maxAmount, minSpend, cycleType, statementDay, dueDate, levels, interestRate, termMonths, maturityDate])

  useUnsavedChanges(isDirty)

  const closeDialog = (force = false) => {
    if (isDirty && !force) {
      setShowCloseWarning(true)
      return
    }
    setOpen(false)
  }

  const resetForm = () => {
    setName('')
    setAccountType('credit_card')
    setLogoUrl('')
    setCreditLimit('')
    setAnnualFee('')
    setIsSecured(false)
    setSecuredByAccountId('')
    setParentAccountId('')
    setRate('0')
    setMaxAmount('')
    setMinSpend('')
    setCycleType('calendar_month')
    setStatementDay('')
    setDueDate('')
    setLevels([])
    setInterestRate('')
    setTermMonths('')
    setMaturityDate('')
    setStatus(null)
  }

  const openDialog = () => {
    resetForm()
    setOpen(true)
  }

  const suggestedParent = useMemo(() => {
    if (!isCreditCard || !name.trim() || parentAccountId) return null
    const firstWord = name.trim().split(' ')[0]
    if (firstWord.length < 2) return null
    const candidate = parentCandidates.find(acc =>
      acc.name.toLowerCase().startsWith(firstWord.toLowerCase())
    )
    return candidate || null
  }, [name, isCreditCard, parentAccountId, parentCandidates])

  // State for overriding parent secured asset
  const [overrideParentSecured, setOverrideParentSecured] = useState(false)

  // Secured Logic Inheritance with Override
  useEffect(() => {
    if (parentAccountId && !overrideParentSecured) {
      const parent = creditCardAccounts.find(a => a.id === parentAccountId)
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
  }, [parentAccountId, creditCardAccounts, overrideParentSecured])

  // Reset override if parent changes to empty
  useEffect(() => {
    if (!parentAccountId) {
      setOverrideParentSecured(false)
    }
  }, [parentAccountId])

  const stopPropagation = (event?: MouseEvent<HTMLDivElement>) => {
    event?.stopPropagation()
  }

  const parseStatementDayValue = (value: string) => {
    const parsed = parseOptionalNumber(value)
    if (parsed === null) return null
    return Math.min(Math.max(Math.floor(parsed), 1), 31)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
        program: {
          defaultRate: rateValue,
          maxBudget: parseOptionalNumber(maxAmount),
          minSpendTarget: parseOptionalNumber(minSpend),
          cycleType,
          statementDay: cycleType === 'statement_cycle' ? parseStatementDayValue(statementDay) : null,
          dueDate: parseStatementDayValue(dueDate),
          levels: levels.map(lvl => ({
            id: lvl.id,
            name: lvl.name,
            minTotalSpend: lvl.minTotalSpend,
            defaultRate: lvl.defaultRate,
            rules: lvl.rules?.map(rule => ({
              id: rule.id,
              categoryIds: rule.categoryIds,
              rate: rule.rate,
              maxReward: rule.maxReward
            }))
          }))
        },
        parentAccountId: parentAccountId || null,
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

      const { error } = await createAccount({
        name: trimmedName,
        type: accountType,
        creditLimit: nextCreditLimit,
        cashbackConfig: configPayload,
        securedByAccountId: securedBy,
        logoUrl: cleanedLogoUrl,
        annualFee: nextAnnualFee,
        parentAccountId: parentAccountId || null,
      })

      if (error) {
        setStatus({ text: 'Could not create account. Please try again.', variant: 'error' })
        return
      }

      setOpen(false)
      router.push('/accounts')
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500"
        onClick={() => setOpen(true)}
      >
        Add New Account
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create new account"
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12"
            onClick={() => closeDialog()}
          >
            <div
              className="w-full max-w-5xl rounded-xl bg-white shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: '85vh', minHeight: '400px' }}
              onClick={stopPropagation}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl">
                <h2 className="text-xl font-bold text-slate-900">Add New Account</h2>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => closeDialog()}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form className="p-6 flex-1 overflow-y-auto" onSubmit={handleSubmit}>
                {/* Account Type Selection */}
                <div className="mb-6 space-y-4">
                  <label className="block text-sm font-medium text-slate-700">Account Type</label>

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
                        placeholder="e.g. Vpbank Lady"
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
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-600">Logo/Thumbnail URL</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={e => setLogoUrl(e.target.value)}
                          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="https://example.com/logo.png"
                        />
                        <div className="h-10 w-10 shrink-0 rounded border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                          {logoUrl ? (
                            <img src={logoUrl} alt="Preview" className="h-full w-full object-contain rounded-none" />
                          ) : (
                            <span className="text-[10px] text-slate-400">No img</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isCreditCard && (
                      <>


                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-600">Credit Limit</label>
                          <NumberInputWithSuggestions
                            value={creditLimit}
                            onChange={setCreditLimit}
                            onFocus={e => e.target.select()}
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
                            onFocus={e => e.target.select()}
                            className="w-full"
                            placeholder="Annual fee"
                          />
                        </div>

                        {collateralOptions.length > 0 && (
                          <div className="space-y-3">
                            {parentAccountId && (
                              <div className="flex items-center justify-end gap-2 mb-1">
                                <label className="text-xs text-slate-500 font-medium">Use different secured asset?</label>
                                <Switch
                                  checked={overrideParentSecured}
                                  onCheckedChange={(checked) => {
                                    setOverrideParentSecured(checked);
                                    if (checked) {
                                      setIsSecured(true);
                                    }
                                  }}
                                  className="scale-75 origin-right"
                                />
                              </div>
                            )}
                            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
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
                        )}
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
                            onFocus={e => e.target.select()}
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
                              onFocus={e => e.target.select()}
                              className="w-full"
                              placeholder="Ex: 100000"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-600">Min spend</label>
                            <NumberInputWithSuggestions
                              value={minSpend}
                              onChange={setMinSpend}
                              onFocus={e => e.target.select()}
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
                          <>
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
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-600">Due Date (Day)</label>
                              <input
                                type="number"
                                min="1"
                                max="31"
                                step="1"
                                value={dueDate} // Added state for dueDate in component logic separately if not exists, but plan implies it exists. Checking file context...
                                onChange={event => setDueDate(event.target.value)} // Need to ensure setDueDate exists.
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                placeholder="Day of month"
                              />
                            </div>
                          </>
                        )}
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

                {/* Cashback Levels - Full Width */}
                {isCreditCard && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <LevelList
                      levels={levels}
                      onChange={setLevels}
                      categoryOptions={categoryOptions}
                      onAddCategory={() => setIsCategoryDialogOpen(true)}
                      activeCategoryCallback={activeCategoryCallback}
                    />
                  </div>
                )}

                {status && (
                  <p
                    className={`mt-4 text-sm ${status.variant === 'error' ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {status.text}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-6">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    onClick={() => closeDialog()}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending && <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />}
                    {isPending ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      }

      <ConfirmationModal
        isOpen={showCloseWarning}
        onClose={() => setShowCloseWarning(false)}
        onConfirm={() => closeDialog(true)}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to discard them and close?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
      />

      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        defaultType="expense"
        onSuccess={async (newCategoryId) => {
          console.log('🟡 [DEBUG] CategoryDialog onSuccess called with ID:', newCategoryId)
          // Refresh category list
          const supabase = createClient()
          const { data } = await supabase.from('categories').select('id, name, type, icon, logo_url').order('name')
          console.log('🟡 [DEBUG] Refreshed categories, count:', data?.length)
          if (data) setCategoryOptions(data as any)

          // Auto-add new category using registered callback
          console.log('🟡 [DEBUG] Checking callback - newCategoryId:', newCategoryId, 'callback exists:', !!activeCategoryCallback.current)
          if (newCategoryId && activeCategoryCallback.current) {
            console.log('🟢 [DEBUG] Invoking registered callback with category ID:', newCategoryId)
            activeCategoryCallback.current(newCategoryId)
            activeCategoryCallback.current = null
            console.log('🟢 [DEBUG] Callback invoked and cleared')
          } else {
            console.error('🔴 [DEBUG] Cannot invoke callback - newCategoryId:', newCategoryId, 'callback:', activeCategoryCallback.current)
          }
        }}
      />
    </>
  )
}
