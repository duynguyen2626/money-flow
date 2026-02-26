'use client'

import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Search, X, Landmark, User, ChevronRight, ChevronDown, Sparkles, ShoppingBag, Tags, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { CustomTooltip } from '@/components/ui/custom-tooltip'
import { getAccounts } from '@/services/account.service'
import { getPeople } from '@/services/people.service'
import { getShops } from '@/services/shop.service'
import { getCategories } from '@/services/category.service'
import { Account, Person, Category, Shop } from '@/types/moneyflow.types'

interface SidebarSearchProps {
  onSearchChange: (query: string) => void
  onExpand?: () => void
  placeholder?: string
  isCollapsed?: boolean
}

type ResultItem = {
  id: string
  name: string
  image?: string | null
  icon?: any
  type: 'account' | 'person' | 'shop' | 'category'
}

export function SidebarSearch({
  onSearchChange,
  onExpand,
  placeholder = 'Search items...',
  isCollapsed = false
}: SidebarSearchProps) {
  const [searchValue, setSearchValue] = useState('')
  const [isSmartEnabled, setIsSmartEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    account: true,
    person: true,
    shop: false,
    category: false
  })

  const [data, setData] = useState({
    accounts: [] as Account[],
    people: [] as Person[],
    shops: [] as Shop[],
    categories: [] as Category[]
  })

  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch all data for smart search
  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [accs, ppl, shps, cats] = await Promise.all([
          getAccounts(),
          getPeople(),
          getShops(),
          getCategories()
        ])
        if (isMounted) {
          setData({
            accounts: accs,
            people: ppl,
            shops: shps as Shop[],
            categories: cats
          })
        }
      } catch (err) {
        console.error('SidebarSearch: Failed to fetch data', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchData()
    return () => { isMounted = false }
  }, [])

  const toggleSection = (type: string) => {
    setExpandedSections(prev => ({ ...prev, [type]: !prev[type] }))
  }

  // Categorized Smart Results
  const categorizedResults = useMemo(() => {
    const query = searchValue.toLowerCase().trim()
    const isSearching = query.length > 0

    // Search Mode: Match all types
    const filter = (list: any[], type: ResultItem['type'], limit = 2) => {
      const matched = list.filter(item => item.name.toLowerCase().includes(query))
      return matched.slice(0, limit).map(item => ({
        id: item.id,
        name: item.name,
        image: item.image_url,
        type
      }))
    }

    const results = {
      account: filter(data.accounts, 'account'),
      person: filter(data.people, 'person'),
      shop: isSearching ? filter(data.shops, 'shop') : [],
      category: isSearching ? filter(data.categories, 'category') : []
    }

    // "Always show" logic: strictly show 1 Account and 1 Person if not searching or no matches
    if (results.account.length === 0 && data.accounts.length > 0) {
      results.account = [{
        id: data.accounts[0].id,
        name: data.accounts[0].name,
        image: data.accounts[0].image_url,
        type: 'account' as const
      }]
    }

    if (results.person.length === 0 && data.people.length > 0) {
      results.person = [{
        id: data.people[0].id,
        name: data.people[0].name,
        image: data.people[0].image_url,
        type: 'person' as const
      }]
    }

    return results
  }, [searchValue, data])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    onSearchChange(value)
    if (isCollapsed && value.length > 0) {
      onExpand?.()
    }
  }, [onSearchChange, isCollapsed, onExpand])

  const handleClear = useCallback(() => {
    setSearchValue('')
    onSearchChange('')
  }, [onSearchChange])

  const handleExpandClick = useCallback(() => {
    onExpand?.()
    // Small delay to allow Sidebar to animate before focusing
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 150)
  }, [onExpand])

  const isSearching = searchValue.trim().length > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="relative group/search">
        {isCollapsed ? (
          <div className="flex justify-center py-1">
            <CustomTooltip content="Search menu" side="right">
              <div
                onClick={handleExpandClick}
                className="h-9 w-9 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Search className="h-4 w-4" />
              </div>
            </CustomTooltip>
          </div>
        ) : (
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={searchValue}
                onChange={handleChange}
                className={cn(
                  "w-full h-9 rounded-md border border-slate-200 bg-white pl-9 pr-8 text-xs placeholder:text-slate-400",
                  "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200",
                  "transition-colors duration-200"
                )}
              />
              {searchValue && (
                <button
                  onClick={handleClear}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsSmartEnabled(!isSmartEnabled)}
              className={cn(
                "h-9 w-9 flex items-center justify-center rounded-md border transition-all",
                isSmartEnabled
                  ? "bg-blue-50 border-blue-200 text-blue-600 shadow-xs"
                  : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
              )}
              title={isSmartEnabled ? "Disable Smart Search" : "Enable Smart Search"}
            >
              <Sparkles className={cn("h-4 w-4", isSmartEnabled && "fill-blue-600/20")} />
            </button>
          </div>
        )}
      </div>

      {/* Result Container - Always visible logic */}
      {isSmartEnabled && (
        <div className={cn(
          "flex flex-col gap-1 transition-all duration-300",
          isCollapsed ? "items-center" : "px-0"
        )}>
          {!isCollapsed && (
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                {isSearching ? 'Search Results' : 'Quick Data'}
              </span>
              {isLoading && isSearching && <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-500" />}
            </div>
          )}

          <div className={cn("space-y-1", isCollapsed ? "flex flex-col gap-1.5" : "")}>
            <ResultSection
              title="Accounts"
              type="account"
              items={categorizedResults.account}
              isCollapsed={isCollapsed}
              isSearching={isSearching}
              isLoading={isLoading}
              isExpanded={expandedSections.account}
              onToggle={() => toggleSection('account')}
            />

            <ResultSection
              title="People"
              type="person"
              items={categorizedResults.person}
              isCollapsed={isCollapsed}
              isSearching={isSearching}
              isLoading={isLoading}
              isExpanded={expandedSections.person}
              onToggle={() => toggleSection('person')}
            />

            {(isSearching || isSmartEnabled) && (
              <>
                <ResultSection
                  title="Shops"
                  type="shop"
                  items={categorizedResults.shop}
                  isCollapsed={isCollapsed}
                  isSearching={isSearching}
                  isLoading={isLoading}
                  isExpanded={expandedSections.shop}
                  onToggle={() => toggleSection('shop')}
                />
                <ResultSection
                  title="Categories"
                  type="category"
                  items={categorizedResults.category}
                  isCollapsed={isCollapsed}
                  isSearching={isSearching}
                  isLoading={isLoading}
                  isExpanded={expandedSections.category}
                  onToggle={() => toggleSection('category')}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ResultSection({
  title,
  type,
  items,
  isCollapsed,
  isSearching,
  isLoading,
  isExpanded,
  onToggle
}: {
  title: string,
  type: ResultItem['type'],
  items: ResultItem[],
  isCollapsed: boolean,
  isSearching: boolean,
  isLoading: boolean,
  isExpanded: boolean,
  onToggle: () => void
}) {
  if (!isSearching && items.length === 0) return null

  return (
    <div className="flex flex-col gap-0.5">
      {!isCollapsed && (
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 px-1 py-0.5 w-full text-left hover:bg-slate-50 rounded transition-colors group/header"
        >
          {isExpanded ? <ChevronDown className="h-2.5 w-2.5 text-slate-400 group-hover/header:text-blue-500" /> : <ChevronRight className="h-2.5 w-2.5 text-slate-400 group-hover/header:text-blue-500" />}
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
          {!isLoading && isSearching && items.length === 0 && <span className="ml-auto text-[8px] text-slate-300 italic font-medium">None</span>}
        </button>
      )}

      {isExpanded && (
        <div className={cn("space-y-1", !isCollapsed && "pl-2")}>
          {items.length > 0 ? (
            items.map(item => <ResultRow key={item.id} result={item} isCollapsed={isCollapsed} />)
          ) : isSearching ? (
            isLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
              </div>
            ) : (
              <NotFoundRow type={type as any} isCollapsed={isCollapsed} />
            )
          ) : null}
        </div>
      )}
    </div>
  )
}

function ResultRow({ result, isCollapsed }: { result: ResultItem, isCollapsed: boolean }) {
  const getHref = () => {
    switch (result.type) {
      case 'account': return `/accounts/${result.id}`
      case 'person': return `/people/${result.id}`
      case 'shop': return `/shops/${result.id}`
      case 'category': return `/categories/${result.id}`
      default: return '#'
    }
  }

  const getIcon = () => {
    switch (result.type) {
      case 'account': return Landmark
      case 'person': return User
      case 'shop': return ShoppingBag
      case 'category': return Tags
      default: return Landmark
    }
  }

  const Icon = getIcon()
  const href = getHref()
  const label = result.type.charAt(0).toUpperCase() + result.type.slice(1)

  if (isCollapsed) {
    return (
      <CustomTooltip content={`${label}: ${result.name}`} side="right">
        <Link
          href={href}
          className="h-8 w-8 rounded-none border border-slate-100 bg-slate-50/50 flex items-center justify-center overflow-hidden hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm group"
        >
          {result.image ? (
            <img src={result.image} alt="" className="h-full w-full object-contain" />
          ) : (
            <Icon className="h-3 w-3 text-slate-400 group-hover:text-blue-500" />
          )}
        </Link>
      </CustomTooltip>
    )
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-2 p-1.5 rounded-md hover:bg-blue-50/50 border border-transparent hover:border-blue-100 transition-all group"
    >
      <div className="h-6 w-6 rounded-none bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
        {result.image ? (
          <img src={result.image} alt="" className="h-full w-full object-contain" />
        ) : (
          <Icon className="h-2.5 w-2.5 text-slate-400" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="text-[10px] font-bold text-slate-700 truncate group-hover:text-blue-600">
          {result.name}
        </span>
      </div>
      <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-blue-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function NotFoundRow({ type, isCollapsed }: { type: 'account' | 'person' | 'shop' | 'category', isCollapsed: boolean }) {
  const label = type.charAt(0).toUpperCase() + type.slice(1, 3)

  if (isCollapsed) {
    return (
      <CustomTooltip content={`${type} not found`} side="right">
        <div className="h-8 w-8 rounded-none border border-slate-100 bg-slate-50/20 flex items-center justify-center text-slate-300">
          <X className="h-3 w-3 opacity-50" />
        </div>
      </CustomTooltip>
    )
  }

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-md border border-dashed border-slate-200 bg-slate-50/30 opacity-60">
      <div className="h-6 w-6 rounded-none border border-slate-100 flex items-center justify-center shrink-0 text-slate-300 bg-white">
        <Search className="h-2.5 w-2.5" />
      </div>
      <div className="flex-1">
        <span className="text-[10px] font-medium text-slate-400 italic">
          {label} not found...
        </span>
      </div>
    </div>
  )
}
