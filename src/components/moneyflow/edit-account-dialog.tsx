'use client'

import { FormEvent, MouseEvent, ReactNode, useMemo, useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { parseCashbackConfig, CashbackCycleType, CashbackLevel, normalizeCashbackConfig, CashbackCategoryRule } from '@/lib/cashback'
import { getSharedLimitParentId } from '@/lib/account-utils'
import { Account } from '@/types/moneyflow.types'
import { updateAccountConfigAction } from '@/actions/account-actions'
import type { Json } from '@/types/database.types'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, X, Copy, Info, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { CustomDropdown, type DropdownOption } from '@/components/ui/custom-dropdown'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { NumberInputWithSuggestions } from '@/components/ui/number-input-suggestions'
import { InputWithClear } from '@/components/ui/input-with-clear'
import { SmartAmountInput } from '@/components/ui/smart-amount-input'
import { CategoryDialog } from '@/components/moneyflow/category-dialog'
import { ApplyRuleDialog } from '@/components/moneyflow/apply-rule-dialog'
import { CashbackGuideModal } from '@/components/moneyflow/cashback-guide-modal'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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

const FieldHint = ({ content, side = "top" }: { content: string, side?: "top" | "bottom" | "left" | "right" }) => (
  <TooltipProvider>
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 text-slate-400 hover:text-blue-500 transition-colors cursor-help" />
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[200px] text-xs bg-slate-800 text-white border-slate-700">
        {content}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

function LevelItem({
  level,
  index,
  onRemove,
  onClone,
  onChange,
  categoryOptions,
  onAddCategory,
  activeCategoryCallback,
  onApplyRule
}: {
  level: CashbackLevel
  index: number
  onRemove: () => void
  onClone: () => void
  onChange: (updates: Partial<CashbackLevel>) => void
  categoryOptions: CategoryOption[]
  onAddCategory?: () => void
  activeCategoryCallback?: React.MutableRefObject<((categoryId: string) => void) | null>
  onApplyRule: (ruleIndex: number) => void
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
          <h5 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-1">
            Level {index + 1}
            <FieldHint content="Name of this cashback tier (e.g. 'Premium Tier', 'Standard')." />
          </h5>
          <input
            type="text"
            value={level.name || ''}
            onChange={e => onChange({ name: e.target.value })}
            className="flex-1 max-w-xs rounded border border-slate-200 px-3 py-1.5 text-sm"
            placeholder="e.g., Premium (≥15M) or Standard (<15M)"
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
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-slate-600">Min Total Spend</label>
            <FieldHint content="Customers qualify for this level when their total spending in a cycle reaches this amount. Example: 15,000,000 = ≥15M/cycle" />
          </div>
          <NumberInputWithSuggestions
            value={formatWithSeparators(toNumericString(level.minTotalSpend))}
            onChange={val => onChange({ minTotalSpend: parseOptionalNumber(val) ?? 0 })}
            onFocus={e => e.target.select()}
            className="w-full"
            placeholder="e.g., 15,000,000"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <label className="text-xs font-medium text-slate-600">Default Rate (%)</label>
            <FieldHint content="Rate for categories not covered by specific rules. Usually 0.1% for 'other' spending." />
          </div>
          <input
            type="number"
            step="0.1"
            value={level.defaultRate !== null ? parseFloat((level.defaultRate * 100).toFixed(6)) : ''}
            onChange={e => {
              const val = parseFloat(e.target.value)
              onChange({ defaultRate: isNaN(val) ? null : val / 100 })
            }}
            onFocus={e => e.target.select()}
            className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="e.g., 0.1"
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

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onApplyRule(rIndex)}
                      className="absolute -top-2 right-6 rounded-full bg-white border border-slate-200 p-1.5 text-slate-400 shadow-sm transition hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200 z-10"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs font-semibold mb-1">Copy this rule to other levels</p>
                    <p className="text-xs text-slate-300">Useful when the same categories apply across levels with different rates.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    Categories
                    <FieldHint content="Select specific categories for this rule." />
                  </label>
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    Rate (%)
                    <FieldHint content="Cashback percentage." />
                  </label>
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
                      placeholder="e.g., 15"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-xs">%</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    Max Reward
                    <FieldHint content="Maximum cashback limit per cycle." />
                  </label>
                  <div className="relative">
                    <NumberInputWithSuggestions
                      value={formatWithSeparators(toNumericString(rule.maxReward))}
                      onChange={val => updateRule(rIndex, { maxReward: parseOptionalNumber(val) })}
                      onFocus={(e) => e.target.select()}
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
  initialLevels,
  onLevelsChange,
  categoryOptions,
  onAddCategory,
  activeCategoryCallback
}: {
  initialLevels: CashbackLevel[]
  onLevelsChange: (levels: CashbackLevel[]) => void
  categoryOptions: CategoryOption[]
  onAddCategory?: () => void
  activeCategoryCallback?: React.MutableRefObject<((categoryId: string) => void) | null>
}) {
  const [levels, setLevels] = useState<CashbackLevel[]>(initialLevels)
  const [levelToDelete, setLevelToDelete] = useState<number | null>(null)
  const [applyingRule, setApplyingRule] = useState<{ levelIndex: number, ruleIndex: number, rule: CashbackCategoryRule } | null>(null)

  useEffect(() => {
    setLevels(initialLevels)
  }, [initialLevels])

  const notifyParent = (next: CashbackLevel[]) => {
    setLevels(next)
    onLevelsChange(next)
  }

  const addLevel = () => {
    notifyParent([
      ...levels,
      { id: `lvl_${Date.now()}`, name: '', minTotalSpend: 0, defaultRate: null, rules: [] }
    ])
  }

  const removeLevel = (index: number) => {
    const next = [...levels]
    next.splice(index, 1)
    notifyParent(next)
  }

  const updateLevel = (index: number, updates: Partial<CashbackLevel>) => {
    const next = [...levels]
    next[index] = { ...next[index], ...updates }
    notifyParent(next)
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
    notifyParent(next)
  }

  const handleApplyRuleConfirm = (targetLevelIds: string[], mode: 'cat_only' | 'cat_rate') => {
    if (!applyingRule) return
    const { rule } = applyingRule
    const nextLevels = [...levels]
    targetLevelIds.forEach(targetId => {
      const targetIndex = nextLevels.findIndex(l => l.id === targetId)
      if (targetIndex !== -1) {
        const targetLevel = { ...nextLevels[targetIndex] }
        const newRule: CashbackCategoryRule = {
          id: `rule_${Math.random().toString(36).substr(2, 9)}`,
          categoryIds: [...rule.categoryIds],
          rate: mode === 'cat_rate' ? rule.rate : 0,
          maxReward: mode === 'cat_rate' ? rule.maxReward : null
        }
        targetLevel.rules = [...(targetLevel.rules || []), newRule]
        nextLevels[targetIndex] = targetLevel
      }
    })
    notifyParent(nextLevels)
    setApplyingRule(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-slate-700">Cashback Levels</h4>
          <CashbackGuideModal />
        </div>
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
          onApplyRule={(ruleIndex) => {
            if (level.rules && level.rules[ruleIndex]) {
              setApplyingRule({
                levelIndex: index,
                ruleIndex: ruleIndex,
                rule: level.rules[ruleIndex]
              })
            }
          }}
        />
      ))}

      {applyingRule && (
        <ApplyRuleDialog
          isOpen={true}
          onClose={() => setApplyingRule(null)}
          onConfirm={handleApplyRuleConfirm}
          levels={levels.filter((_, idx) => idx !== applyingRule.levelIndex).map(l => ({ id: l.id, name: l.name }))}
          ruleSummary={`${applyingRule.rule.categoryIds.length} Categor${applyingRule.rule.categoryIds.length === 1 ? 'y' : 'ies'}, ${(applyingRule.rule.rate * 100).toFixed(1)}%`}
          currentLevelId={levels[applyingRule.levelIndex].id}
          currentLevelName={levels[applyingRule.levelIndex].name || `Level ${applyingRule.levelIndex + 1}`}
        />
      )}

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

type EditAccountDialogProps = {
  account: Account
  collateralAccounts?: Account[]
  accounts?: Account[]
  triggerContent?: ReactNode
  buttonClassName?: string
  onOpen?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: (account: Account) => void
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
  if (!raw) return { interestRate: null, termMonths: null, maturityDate: null }
  let parsed: Record<string, unknown> | null = null
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch { parsed = null }
  } else if (typeof raw === 'object') {
    parsed = raw as Record<string, unknown>
  }
  if (!parsed) return { interestRate: null, termMonths: null, maturityDate: null }
  const parseNumber = (value: unknown) => {
    const asNumber = Number(value); return Number.isFinite(asNumber) ? asNumber : null
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
  onSuccess
}: EditAccountDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControllable = externalOpen !== undefined && externalOnOpenChange !== undefined
  const open = isControllable ? externalOpen : internalOpen
  const setOpen = isControllable ? externalOnOpenChange : setInternalOpen
  const [status, setStatus] = useState<StatusMessage>(null)
  const [isPending, startTransition] = useTransition()
  const [isDirty, setIsDirty] = useState(false)
  const [showCloseWarning, setShowCloseWarning] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const activeCategoryCallback = useRef<((categoryId: string) => void) | null>(null)

  useUnsavedChanges(isDirty)

  const normalizedCashback = useMemo(() => normalizeCashbackConfig(account.cashback_config), [account.cashback_config])
  const parsedSavingsConfig = useMemo(() => parseSavingsConfig(account.cashback_config), [account.cashback_config])

  const [name, setName] = useState(account.name)
  const [accountType, setAccountType] = useState<Account['type']>(account.type)
  const [securedByAccountId, setSecuredByAccountId] = useState(account.secured_by_account_id ?? '')
  const [isSecured, setIsSecured] = useState(Boolean(account.secured_by_account_id))
  const [creditLimit, setCreditLimit] = useState<number | undefined>(account.credit_limit ?? undefined)
  const [annualFee, setAnnualFee] = useState<number | undefined>(account.annual_fee ?? undefined)
  const [imageUrl, setImageUrl] = useState(account.image_url ?? '')
  const [rate, setRate] = useState(String(normalizedCashback.defaultRate * 100))
  const [maxAmount, setMaxAmount] = useState(formatWithSeparators(toNumericString(normalizedCashback.maxBudget)))
  const [minSpend, setMinSpend] = useState(formatWithSeparators(toNumericString(normalizedCashback.minSpendTarget)))
  const [cycleType, setCycleType] = useState<CashbackCycleType>(normalizedCashback.cycleType)
  const [statementDay, setStatementDay] = useState(toNumericString(normalizedCashback.statementDay))
  const [dueDate, setDueDate] = useState(toNumericString(normalizedCashback.dueDate))
  const [interestRate, setInterestRate] = useState(toNumericString(parsedSavingsConfig.interestRate))
  const [termMonths, setTermMonths] = useState(toNumericString(parsedSavingsConfig.termMonths))
  const [maturityDate, setMaturityDate] = useState(parsedSavingsConfig.maturityDate ?? '')
  const [parentAccountId, setParentAccountId] = useState(getSharedLimitParentId(account.cashback_config) ?? '')
  const [accountNumber, setAccountNumber] = useState(account.account_number ?? '')
  const [receiverName, setReceiverName] = useState(account.receiver_name || 'NGUYEN THANH NAM')
  const [overrideParentSecured, setOverrideParentSecured] = useState(false)

  const [levels, setLevels] = useState<CashbackLevel[]>(normalizedCashback.levels ?? [])
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [showAdvancedCashback, setShowAdvancedCashback] = useState((normalizedCashback.levels ?? []).length > 0)

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

  useEffect(() => {
    if (!parentAccountId) setOverrideParentSecured(false)
  }, [parentAccountId])

  useEffect(() => {
    if (!open) { setIsDirty(false); return }
    const hasChanged = name !== (account.name || '') || accountType !== account.type ||
      securedByAccountId !== (account.secured_by_account_id || '') || imageUrl !== (account.image_url || '') ||
      rate !== String(normalizedCashback.defaultRate * 100) || maxAmount !== formatWithSeparators(toNumericString(normalizedCashback.maxBudget)) ||
      minSpend !== formatWithSeparators(toNumericString(normalizedCashback.minSpendTarget)) || cycleType !== normalizedCashback.cycleType ||
      statementDay !== toNumericString(normalizedCashback.statementDay) || dueDate !== toNumericString(normalizedCashback.dueDate) ||
      parentAccountId !== (getSharedLimitParentId(account.cashback_config) || '') || accountNumber !== (account.account_number || '') ||
      receiverName !== (account.receiver_name || '') || JSON.stringify(levels) !== JSON.stringify(normalizedCashback.levels ?? []) ||
      creditLimit !== (account.credit_limit ?? undefined) || annualFee !== (account.annual_fee ?? undefined)
    setIsDirty(hasChanged)
  }, [open, name, accountType, securedByAccountId, imageUrl, rate, maxAmount, minSpend, cycleType, statementDay, dueDate, parentAccountId, levels, accountNumber, receiverName, account, normalizedCashback, creditLimit, annualFee])

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
  const collateralOptions = useMemo(() =>
    (collateralAccounts ?? []).filter(candidate => candidate.id !== account.id && ASSET_TYPES.includes(candidate.type)),
    [collateralAccounts, account.id]
  )

  const resetForm = () => {
    const freshCashback = normalizeCashbackConfig(account.cashback_config)
    const freshSavings = parseSavingsConfig(account.cashback_config)
    setName(account.name); setAccountType(account.type); setSecuredByAccountId(account.secured_by_account_id ?? '')
    setIsSecured(Boolean(account.secured_by_account_id))
    setCreditLimit(account.credit_limit ?? undefined)
    setAnnualFee(account.annual_fee ?? undefined)
    setRate(String(freshCashback.defaultRate * 100))
    setMaxAmount(formatWithSeparators(toNumericString(freshCashback.maxBudget)))
    setMinSpend(formatWithSeparators(toNumericString(freshCashback.minSpendTarget)))
    setCycleType(freshCashback.cycleType); setStatementDay(toNumericString(freshCashback.statementDay))
    setDueDate(toNumericString(freshCashback.dueDate)); setInterestRate(toNumericString(freshSavings.interestRate))
    setTermMonths(toNumericString(freshSavings.termMonths)); setMaturityDate(freshSavings.maturityDate ?? '')
    setImageUrl(account.image_url ?? ''); setParentAccountId(getSharedLimitParentId(account.cashback_config) ?? '')
    setAccountNumber(account.account_number ?? ''); setReceiverName(account.receiver_name || 'NGUYEN THANH NAM')
    setLevels(freshCashback.levels ?? []); setStatus(null)
  }

  const closeDialog = (force = false) => {
    if (isDirty && !force) { setShowCloseWarning(true); return }
    setOpen(false)
    setIsDirty(false)
    setShowCloseWarning(false)
  }

  const stopPropagation = (event?: MouseEvent<HTMLDivElement>) => event?.stopPropagation()

  const openDialog = () => { onOpen?.(); resetForm(); setOpen(true) }

  const parentCandidates = useMemo(() =>
    accounts.filter(acc => acc.id !== account.id && acc.type === 'credit_card' && !acc.parent_account_id && !acc.relationships?.parent_info),
    [accounts, account.id]
  )

  const suggestedParent = useMemo(() => {
    if (!isCreditCard || !name.trim()) return null
    const firstWord = name.trim().split(' ')[0]
    if (firstWord.length < 2) return null
    const candidate = parentCandidates.find(acc => acc.name.toLowerCase().startsWith(firstWord.toLowerCase()))
    return candidate && candidate.id !== parentAccountId ? candidate : null
  }, [name, isCreditCard, parentAccountId, parentCandidates])

  const parseStatementDayValue = (value: string) => {
    const parsed = parseOptionalNumber(value)
    return parsed === null ? null : Math.min(Math.max(Math.floor(parsed), 1), 31)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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
          defaultRate: rateValue / 100,
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
      try {
        const success = await updateAccountConfigAction({
          id: account.id,
          name: trimmedName,
          creditLimit: nextCreditLimit,
          annualFee: nextAnnualFee,
          cashbackConfig: configPayload,
          type: accountType,
          securedByAccountId: securedBy,
          imageUrl: cleanedLogoUrl,
          parentAccountId: parentAccountId || null,
          accountNumber: accountNumber.trim() || null,
          receiverName: receiverName.trim() || null,
        })
        if (!success) {
          setStatus({ text: 'Could not update account. Please try again.', variant: 'error' })
          return
        }
        setOpen(false)
        setIsDirty(false)
        router.refresh()
      } catch (error: any) {
        console.error('[EditAccountDialog] Submit Error:', error);
        setStatus({ text: error.message || 'An unexpected error occurred.', variant: 'error' })
      }
    })
  }

  const bankOptions = useMemo(() => [], [])

  return (
    <>
      {!isControllable && (
        <span
          role="button"
          tabIndex={0}
          className={cn(
            "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            buttonClassName ?? (triggerContent ? 'inline-flex items-center justify-center rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50' : 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-500')
          )}
          onClick={event => { event.stopPropagation(); onOpen?.(); openDialog() }}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen?.(); openDialog() } }}
        >
          {triggerContent ?? 'Settings'}
        </span>
      )}

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => closeDialog()}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-full w-full max-w-4xl flex-col rounded-xl bg-slate-50 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={stopPropagation}
          >
            <div className="flex bg-white items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Edit {account.name}</h2>
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
                <div className="flex flex-col">
                  {/* Row 1: Top Grid (Identity & Sync) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Left Top: Basic Information */}
                    <div className="flex flex-col space-y-6">
                      <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2">Basic Information</h3>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-600">Name</label>
                          <InputWithClear
                            value={name}
                            onChange={event => setName(event.target.value)}
                            onClear={() => setName('')}
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
                        {parentAccountId && (
                          <p className="text-[10px] text-amber-600 italic mt-1">Shared with parent</p>
                        )}
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

                  {/* Account Logo URL (Moved to bottom) */}
                  <div className="mt-8">
                    <div className="flex gap-4 items-center">
                      <div className="flex-1 space-y-1">
                        <label className="text-sm font-medium text-slate-600">Account Logo URL</label>
                        <InputWithClear
                          value={imageUrl}
                          onChange={e => setImageUrl(e.target.value)}
                          onClear={() => setImageUrl('')}
                          placeholder="Paste image URL"
                        />
                      </div>
                      {imageUrl && (
                        <div className="shrink-0 pt-6">
                          <img src={imageUrl} alt="" className="h-auto max-h-[44px] w-auto max-w-[80px] object-contain rounded-md" />
                        </div>
                      )}
                    </div>
                  </div>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-stretch">
                        {/* Left Column */}
                        <div className="flex flex-col space-y-6 flex-1">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base Rate (%)</label>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max="100"
                              value={rate}
                              onChange={event => setRate(event.target.value)}
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
                            initialLevels={levels}
                            onLevelsChange={setLevels}
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
                  <p className={cn(
                    "mt-4 rounded-md p-3 text-sm font-medium",
                    status.variant === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
                  )}>
                    {status.text}
                  </p>
                )}

                {/* Danger Zone */}
                <div className="border-t border-slate-100 bg-slate-50 p-6">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Account Status</h3>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-900">
                        {account.is_active ? 'Close this account' : 'Reopen this account'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {account.is_active
                          ? 'Closing will hide it from main views but preserve history.'
                          : 'Reopening will make it visible in main views again.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const newStatus = !account.is_active
                        // Optimistic update isn't enough, we need to call server action
                        // But we want to confirm first? Maybe just a simple toggle for now as per requirements.
                        // Actually requirements said verify Close/Archive functionality.
                        // We'll trust updateAccountConfigAction to handle it.
                        try {
                          setStatus(null)
                          const success = await updateAccountConfigAction({
                            id: account.id,
                            isActive: newStatus
                          })
                          if (!success) {
                            setStatus({ text: 'Failed to update status', variant: 'error' })
                          } else {
                            setStatus({
                              text: `Account ${newStatus ? 'reopened' : 'closed'} successfully`,
                              variant: 'success'
                            })
                            // Refresh router to reflect changes in background
                            router.refresh()
                            // Close dialog after short delay if closing
                            if (!newStatus) {
                              setTimeout(() => closeDialog(true), 1000)
                            }
                          }
                        } catch (err) {
                          console.error('Failed to toggle status', err)
                          setStatus({ text: 'Error updating status', variant: 'error' })
                        }
                      }}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
                        account.is_active
                          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300"
                          : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:border-slate-300"
                      )}
                    >
                      {account.is_active ? 'Close Account' : 'Reopen Account'}
                    </button>
                  </div>
                </div>
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
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form >
          </div >

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
              const supabase = createClient()
              const { data } = await supabase.from('categories').select('id, name, type, icon, image_url').order('name')
              if (data) setCategoryOptions(data as any)

              if (newCategoryId && activeCategoryCallback.current) {
                activeCategoryCallback.current(newCategoryId)
                activeCategoryCallback.current = null
              }
            }}
          />
        </div >,
        document.body
      )
      }
    </>
  )
}
