'use client'

import { FormEvent, MouseEvent, ReactNode, useMemo, useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { parseCashbackConfig, CashbackCycleType, CashbackLevel, normalizeCashbackConfig } from '@/lib/cashback'
import { Account } from '@/types/moneyflow.types'
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
import { CategoryDialog } from '@/components/moneyflow/category-dialog'
import { formatShortVietnameseCurrency } from '@/lib/number-to-text'
import { cn } from '@/lib/utils'

type CategoryOption = { id: string; name: string; type: string; icon?: string | null; image_url?: string | null }

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
              <button
                type="button"
                onClick={() => setRuleToDelete(rIndex)}
                className="absolute -top-2 -right-2 rounded-full bg-white border border-slate-200 p-1.5 text-slate-400 shadow-sm transition hover:bg-red-50 hover:text-red-500 hover:border-red-200 z-10"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Categories</label>
                </div>
                <CategoryMultiSelect
                  options={categoryOptions}
                  selected={rule.categoryIds || []}
                  onChange={(cats) => updateRule(rIndex, { categoryIds: cats })}
                  onAddNew={() => {
                    if (activeCategoryCallback) {
                      activeCategoryCallback.current = (categoryId: string) => {
                        updateRule(rIndex, { categoryIds: [...(rule.categoryIds || []), categoryId] })
                      }
                    }
                    if (onAddCategory) onAddCategory()
                  }}
                />
              </div>

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
      image_url: opt.image_url || undefined
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
              {cat?.image_url ? (
                <img src={cat.image_url} alt="" className="h-3 w-3 object-contain rounded-none mr-0.5" />
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

function CashbackLevelsList({
  levels,
  setLevels,
  categoryOptions,
  onAddCategory,
  activeCategoryCallback
}: {
  levels: CashbackLevel[]
  setLevels: (levels: CashbackLevel[]) => void
  categoryOptions: CategoryOption[]
  onAddCategory?: () => void
  activeCategoryCallback?: React.MutableRefObject<((categoryId: string) => void) | null>
}) {
  const [levelToDelete, setLevelToDelete] = useState<number | null>(null)
  const addLevel = () => {
    setLevels([
      ...levels,
      { id: `lvl_${Date.now()}`, name: '', minTotalSpend: 0, defaultRate: null, rules: [] }
    ])
  }

  const removeLevel = (index: number) => {
    const next = [...levels]
    next.splice(index, 1)
    setLevels(next)
  }

  const updateLevel = (index: number, updates: Partial<CashbackLevel>) => {
    const next = [...levels]
    next[index] = { ...next[index], ...updates }
    setLevels(next)
  }

  const cloneLevel = (index: number) => {
    const levelToClone = levels[index]
    const clonedLevel: CashbackLevel = {
      ...levelToClone,
      id: `lvl_${Math.random().toString(36).substr(2, 9)}`,
      name: levelToClone.name ? `${levelToClone.name} (Copy)` : '',
      rules: levelToClone.rules?.map(rule => ({
        ...rule,
        id: `rule_${Math.random().toString(36).substr(2, 9)}`
      }))
    }
    const next = [...levels]
    next.splice(index + 1, 0, clonedLevel)
    setLevels(next)
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
  trigger?: ReactNode
}

type StatusMessage = {
  text: string
  variant: 'success' | 'error'
} | null

const ASSET_TYPES: Account['type'][] = ['savings', 'investment', 'asset']

export function CreateAccountDialog({ collateralAccounts = [], creditCardAccounts = [], trigger }: CreateAccountDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<StatusMessage>(null)
  const [isPending, startTransition] = useTransition()
  const [showCloseWarning, setShowCloseWarning] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const activeCategoryCallback = useRef<((categoryId: string) => void) | null>(null)

  const [name, setName] = useState('')
  const [accountType, setAccountType] = useState<Account['type']>('credit_card')
  const [imageUrl, setImageUrl] = useState('')
  const [creditLimit, setCreditLimit] = useState<number | undefined>(undefined)
  const [annualFee, setAnnualFee] = useState<number | undefined>(undefined)
  const [isSecured, setIsSecured] = useState(false)
  const [securedByAccountId, setSecuredByAccountId] = useState('')
  const [parentAccountId, setParentAccountId] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [receiverName, setReceiverName] = useState('NGUYEN THANH NAM')

  const [rate, setRate] = useState('0')
  const [maxAmount, setMaxAmount] = useState('')
  const [minSpend, setMinSpend] = useState('')
  const [cycleType, setCycleType] = useState<CashbackCycleType>('calendar_month')
  const [statementDay, setStatementDay] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [levels, setLevels] = useState<CashbackLevel[]>([])
  const [showAdvancedCashback, setShowAdvancedCashback] = useState(false)

  const [interestRate, setInterestRate] = useState('')
  const [termMonths, setTermMonths] = useState('')
  const [maturityDate, setMaturityDate] = useState('')

  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('categories').select('id, name, type, icon, image_url').order('name')
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

  const parentCandidates = useMemo(() =>
    creditCardAccounts.filter(acc => {
      const isChild = !!acc.parent_account_id || !!acc.relationships?.parent_info
      return !isChild
    }),
    [creditCardAccounts]
  )

  const isDirty = useMemo(() => {
    return name !== '' ||
      accountType !== 'credit_card' ||
      imageUrl !== '' ||
      creditLimit !== undefined ||
      annualFee !== undefined ||
      isSecured !== false ||
      securedByAccountId !== '' ||
      parentAccountId !== '' ||
      accountNumber !== '' ||
      receiverName !== '' ||
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
  }, [name, accountType, imageUrl, creditLimit, annualFee, isSecured, securedByAccountId, parentAccountId, accountNumber, receiverName, rate, maxAmount, minSpend, cycleType, statementDay, dueDate, levels, interestRate, termMonths, maturityDate])

  useUnsavedChanges(isDirty)

  const closeDialog = (force = false) => {
    if (isDirty && !force) {
      setShowCloseWarning(true)
      return
    }
    setOpen(false)
    setShowCloseWarning(false)
  }

  const resetForm = () => {
    setName('')
    setAccountType('credit_card')
    setImageUrl('')
    setCreditLimit(undefined)
    setAnnualFee(undefined)
    setIsSecured(false)
    setSecuredByAccountId('')
    setParentAccountId('')
    setAccountNumber('')
    setReceiverName('')
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

  const [overrideParentSecured, setOverrideParentSecured] = useState(false)

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

    const nextCreditLimit = isCreditCard ? (creditLimit ?? null) : null
    const nextAnnualFee = isCreditCard ? (annualFee ?? null) : null
    const cleanedLogoUrl = imageUrl.trim() || null

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
        imageUrl: cleanedLogoUrl,
        annualFee: nextAnnualFee,
        parentAccountId: parentAccountId || null,
        accountNumber: accountNumber.trim() || null,
        receiverName: receiverName.trim() || null,
      })

      if (error) {
        setStatus({ text: error.message || 'Could not create account. Please try again.', variant: 'error' })
        return
      }

      setOpen(false)
      router.push('/accounts')
      router.refresh()
    })
  }

  const bankOptions = useMemo(() => [], [])

  return (
    <>
      <div onClick={(e) => { e.stopPropagation(); openDialog(); }}>
        {trigger}
      </div>
      {!trigger && (
        <button
          type="button"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500"
          onClick={() => setOpen(true)}
        >
          Add New Account
        </button>
      )}

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create new account"
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12"
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

              <form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit}>
                <div className="flex-1 overflow-y-auto p-6">
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

                  <div className="flex flex-col">
                    {/* Row 1: Top Grid (Identity & Sync) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Left Top: Basic Information */}
                      <div className="flex flex-col space-y-6">
                        <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">Basic Information</h3>
                        <div className="space-y-4">
                          <div className="space-y-1.5 flex-1">
                            <label className="text-sm font-medium text-slate-700">Account Name</label>
                            <InputWithClear
                              value={name}
                              onChange={e => setName(e.target.value)}
                              onClear={() => setName('')}
                              placeholder="Enter account name"
                              autoFocus
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
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                                  >
                                    💡 Link to {suggestedParent.name}?
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
                                placeholder="Select Primary Card"
                              />
                              {parentAccountId && (
                                <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                  ℹ️ This card shares credit limit with parent
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Top: Sync Information (Only if Credit Card) */}
                      {isCreditCard && (
                        <div className="flex flex-col space-y-6">
                          <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">Sync Information</h3>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-600">Bank Number</label>
                              <InputWithClear
                                value={accountNumber}
                                onChange={e => setAccountNumber(e.target.value)}
                                onClear={() => setAccountNumber('')}
                                placeholder="Account number"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-600">Receiver Name</label>
                              <InputWithClear
                                value={receiverName}
                                onChange={e => setReceiverName(e.target.value)}
                                onClear={() => setReceiverName('')}
                                placeholder="NGUYEN THANH NAM"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Row 3: Financials (Limit & Collateral) - Only if Credit Card */}
                    {isCreditCard && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8 items-end">
                        {/* Left Bottom: Limits & Fees */}
                        <div className="flex flex-col space-y-5">
                          <SmartAmountInput
                            label="Credit Limit"
                            value={creditLimit}
                            onChange={setCreditLimit}
                            placeholder="Ex: 50M"
                            className="w-full"
                            disabled={!!parentAccountId}
                          />
                          <SmartAmountInput
                            label="Annual Fee"
                            value={annualFee}
                            onChange={setAnnualFee}
                            placeholder="Ex: 500k"
                            className="w-full"
                          />
                        </div>

                        {/* Right Bottom: Collateral */}
                        <div>
                          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Collateral</label>
                              {parentAccountId && (
                                <div className="flex items-center gap-1.5">
                                  <label className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Override?</label>
                                  <Switch
                                    checked={overrideParentSecured}
                                    onCheckedChange={(checked) => {
                                      setOverrideParentSecured(checked);
                                      if (checked) setIsSecured(true);
                                    }}
                                    className="scale-75 origin-right"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Top Toggle for consistency */}
                            <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-slate-200 shadow-sm mb-2">
                              <label className="text-sm font-medium text-slate-700">Secured Account?</label>
                              <Switch
                                checked={isSecured}
                                disabled={!!parentAccountId && !overrideParentSecured}
                                onCheckedChange={(checked) => {
                                  setIsSecured(checked)
                                  if (!checked) setSecuredByAccountId('')
                                }}
                                className="scale-90"
                              />
                            </div>

                            {/* Unified Secured Account UI: Always show dropdown, disable if OFF */}
                            <div className="flex flex-col justify-start gap-1.5 mt-2">
                              <label className={`text-[10px] font-bold uppercase tracking-wider ml-1 transition-colors ${isSecured ? 'text-slate-500' : 'text-slate-400'}`}>
                                Secured By Asset
                              </label>
                              <CustomDropdown
                                options={[
                                  { value: '', label: 'Select asset...' },
                                  ...collateralOptions.map(option => ({
                                    value: option.id,
                                    label: option.name,
                                    image_url: option.image_url || undefined
                                  }))
                                ]}
                                value={securedByAccountId}
                                onChange={setSecuredByAccountId}
                                className={`w-full shadow-sm transition-all h-[38px] ${isSecured ? 'bg-white' : 'bg-blue-50/50 opacity-70'}`}
                                disabled={!isSecured || (!!parentAccountId && !overrideParentSecured)}
                                placeholder={!isSecured ? "Enable toggle above" : "Select asset..."}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {isCreditCard && (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-sm">💰</span>
                            Cashback Policy
                          </h3>
                          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 shadow-inner">
                            <span className="text-xs font-semibold text-slate-600">Advanced Levels?</span>
                            <Switch
                              checked={showAdvancedCashback}
                              onCheckedChange={setShowAdvancedCashback}
                              className="scale-90"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base Rate (%)</label>
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
                                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white shadow-sm h-[42px]"
                                placeholder="e.g. 10"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Max Budget</label>
                                <NumberInputWithSuggestions
                                  value={maxAmount}
                                  onChange={setMaxAmount}
                                  className="w-full h-[42px]"
                                  placeholder="No Limit"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Min Spend</label>
                                <NumberInputWithSuggestions
                                  value={minSpend}
                                  onChange={setMinSpend}
                                  className="w-full h-[42px]"
                                  placeholder="None"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cycle Type</label>
                              <CustomDropdown
                                options={[
                                  { value: 'calendar_month', label: 'Calendar month' },
                                  { value: 'statement_cycle', label: 'Statement cycle' }
                                ]}
                                value={cycleType ?? ''}
                                onChange={(val) => setCycleType(val as CashbackCycleType)}
                                className="w-full h-[42px]"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Statement Day</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                  value={statementDay}
                                  onChange={event => setStatementDay(event.target.value)}
                                  disabled={cycleType !== 'statement_cycle'}
                                  placeholder="Day"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Due Day</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                                  value={dueDate}
                                  onChange={event => setDueDate(event.target.value)}
                                  placeholder="Day"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {showAdvancedCashback && (
                          <div className="mt-8 pt-8 border-t border-slate-100">
                            <CashbackLevelsList
                              levels={levels}
                              setLevels={setLevels}
                              categoryOptions={categoryOptions}
                              onAddCategory={() => setIsCategoryDialogOpen(true)}
                              activeCategoryCallback={activeCategoryCallback}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {status && (
                    <p className={`mt-4 text-sm ${status.variant === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                      {status.text}
                    </p>
                  )}
                </div>

                <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
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
            </div >
          </div >,
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
          const supabase = createClient()
          const { data } = await supabase.from('categories').select('id, name, type, icon, image_url').order('name')
          if (data) setCategoryOptions(data as any)

          if (newCategoryId && activeCategoryCallback.current) {
            activeCategoryCallback.current(newCategoryId)
            activeCategoryCallback.current = null
          }
        }}
      />
    </>
  )
}
