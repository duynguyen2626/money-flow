"use client";

import { useEffect, useMemo, useState, memo } from 'react';
import { LayoutGrid, List, Search, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Check, Filter } from 'lucide-react';
import { CreateAccountDialog } from './create-account-dialog';
import { AccountCard } from './account-card';
import { AccountTable } from './account-table';
import { FamilyCluster } from './family-cluster';
import { Account, AccountCashbackSnapshot, Category, Person, Shop } from '@/types/moneyflow.types';
import { updateAccountConfigAction } from '@/actions/account-actions';
import { computeNextDueDate, getSharedLimitParentId } from '@/lib/account-utils';
import { getCreditCardAvailableBalance } from '@/lib/account-balance';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { UsageStats, QuickPeopleConfig } from '@/types/settings.types';
import { cn } from '@/lib/utils';

type AccountListProps = {
  accounts: Account[];
  cashbackById?: Record<string, AccountCashbackSnapshot | undefined>;
  categories: Category[];
  people: Person[];
  shops: Shop[];
  pendingBatchAccountIds?: string[];
  usageStats?: UsageStats;
  quickPeopleConfig?: QuickPeopleConfig;
};

type ViewMode = 'grid' | 'table';
type FilterKey = 'all' | 'bank' | 'credit' | 'savings' | 'debt' | 'waiting_confirm' | 'need_to_spend';
type SortKey = 'due_date' | 'balance' | 'limit';
type SortOrder = 'asc' | 'desc';

const FILTERS: { key: FilterKey; label: string; match: (account: Account) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'bank', label: 'Bank', match: account => ['bank', 'cash', 'ewallet'].includes(account.type) },
  { key: 'credit', label: 'Credit', match: account => account.type === 'credit_card' },
  { key: 'savings', label: 'Savings', match: account => ['savings', 'investment', 'asset'].includes(account.type) },
  { key: 'debt', label: 'Debt', match: account => account.type === 'debt' },
  { key: 'waiting_confirm', label: 'Waiting Confirm', match: () => true }, // Logic handled separately
  { key: 'need_to_spend', label: 'Need To Spend', match: () => true }, // Logic handled separately
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'due_date', label: 'Due Date' },
  { key: 'balance', label: 'Balance' },
  { key: 'limit', label: 'Limit' },
];

function getDaysUntilDue(account: Account): number {
  const dueDate = computeNextDueDate(account.cashback_config ?? null);
  if (!dueDate) return 999999;
  const now = new Date();
  return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getAccountBalance(account: Account, allAccounts: Account[]): number {
  const netBalance = (account.total_in ?? 0) + (account.total_out ?? 0);
  if (account.type !== 'credit_card') return netBalance;

  const sharedLimitParentId = getSharedLimitParentId(account.cashback_config);
  if (sharedLimitParentId) {
    const parent = allAccounts.find(a => a.id === sharedLimitParentId);
    if (parent) {
      const siblings = allAccounts.filter(a => getSharedLimitParentId(a.cashback_config) === parent.id);
      const familyMembers = [parent, ...siblings];
      const totalDebt = familyMembers.reduce((sum, member) => {
        return sum + (member.current_balance ?? 0);
      }, 0);
      return (parent.credit_limit ?? 0) - totalDebt;
    }
  }
  return getCreditCardAvailableBalance(account);
}

// Memoized filter button
const FilterButton = memo(({ filter, isActive, onClick }: {
  filter: { key: FilterKey; label: string };
  isActive: boolean;
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-full px-3 py-1 text-sm font-semibold transition",
      isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    )}
    aria-pressed={isActive}
  >
    {filter.label}
  </button>
));
FilterButton.displayName = 'FilterButton';

export function AccountList({ accounts, cashbackById = {}, categories, people, shops, pendingBatchAccountIds = [], usageStats, quickPeopleConfig }: AccountListProps) {
  const [view, setView] = useState<ViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Account[]>(accounts);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [showClosedAccounts, setShowClosedAccounts] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [sortOpen, setSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false); // New state for mobile filter

  useEffect(() => {
    setItems(accounts);
  }, [accounts]);

  const collateralAccounts = useMemo(
    () => items.filter(acc => ['savings', 'investment', 'asset'].includes(acc.type)),
    [items]
  );

  const creditCardAccounts = useMemo(
    () => items.filter(acc => acc.type === 'credit_card'),
    [items]
  );

  const activeItems = useMemo(
    () => items.filter(acc => acc.is_active !== false),
    [items]
  );

  const closedItems = useMemo(
    () => items.filter(acc => acc.is_active === false),
    [items]
  );

  // 1. Filter Logic
  const filteredItems = useMemo(() => {
    let filtered = activeItems;

    // Filter Logic
    if (activeFilter === 'waiting_confirm') {
      filtered = filtered.filter(acc => pendingBatchAccountIds.includes(acc.id));
    } else if (activeFilter === 'need_to_spend') {
      filtered = filtered.filter(acc => (cashbackById[acc.id]?.missing_min_spend ?? 0) > 0);
    } else {
      filtered = filtered.filter(acc => FILTERS.find(f => f.key === activeFilter)?.match(acc));
    }

    // 2. Search Logic (Family Expansion)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      // Find matching IDs first
      const matchedIds = new Set(
        items.filter(acc => acc.name.toLowerCase().includes(query)).map(a => a.id)
      );

      // Expand to include families
      const expandedIds = new Set<string>();
      items.forEach(acc => {
        if (matchedIds.has(acc.id)) {
          expandedIds.add(acc.id);
          // If parent, add children
          if (acc.relationships?.child_accounts) {
            acc.relationships.child_accounts.forEach(c => expandedIds.add(c.id));
          }
          // If child, add parent and siblings
          if (acc.parent_account_id) {
            expandedIds.add(acc.parent_account_id);
            // Assume parent exists in items
            const parent = items.find(p => p.id === acc.parent_account_id);
            if (parent?.relationships?.child_accounts) {
              parent.relationships.child_accounts.forEach(c => expandedIds.add(c.id));
            }
          }
        }
      });

      filtered = items.filter(acc => expandedIds.has(acc.id) && acc.is_active !== false);
    }
    return filtered;
  }, [items, activeItems, activeFilter, searchQuery, pendingBatchAccountIds, cashbackById]);

  // 3. Sorting
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'due_date': comparison = getDaysUntilDue(a) - getDaysUntilDue(b); break;
        case 'balance': comparison = getAccountBalance(a, items) - getAccountBalance(b, items); break;
        case 'limit': comparison = (a.credit_limit ?? 0) - (b.credit_limit ?? 0); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredItems, sortKey, sortOrder, items]);

  // --- Display Item Interface ---
  type DisplayItem =
    | { type: 'single', account: Account }
    | { type: 'family', parent: Account, children: Account[], id: string };

  // --- Process Items Logic ---
  const displayItems = useMemo(() => {
    // 4. Clustering
    const result: DisplayItem[] = [];
    const processedIds = new Set<string>();

    sortedItems.forEach(acc => {
      if (processedIds.has(acc.id)) return;

      // Check if Parent with Children in filtered list
      const children = sortedItems.filter(c => c.parent_account_id === acc.id);

      if ((acc.relationships?.is_parent || children.length > 0) && children.length > 0) {
        // It is a parent with visible children
        result.push({
          type: 'family',
          id: acc.id,
          parent: acc,
          children: children
        });
        processedIds.add(acc.id);
        children.forEach(c => processedIds.add(c.id));
      } else if (acc.parent_account_id) {
        // Child
        const parentInList = sortedItems.find(p => p.id === acc.parent_account_id);
        if (parentInList) {
          // Skip, handled by parent
          return;
        } else {
          result.push({ type: 'single', account: acc });
          processedIds.add(acc.id);
        }
      } else {
        // Standalone
        result.push({ type: 'single', account: acc });
        processedIds.add(acc.id);
      }
    });

    return result;

  }, [sortedItems, items]);


  const handleToggleStatus = async (accountId: string, nextValue: boolean) => {
    setPendingId(accountId);
    try {
      const success = await updateAccountConfigAction({ id: accountId, isActive: nextValue });
      if (success) {
        setItems(prev => prev.map(acc => (acc.id === accountId ? { ...acc, is_active: nextValue } : acc)));
      }
    } finally {
      setPendingId(null);
    }
  };

  const handleSortSelect = (key: SortKey, order: SortOrder) => {
    setSortKey(key);
    setSortOrder(order);
    setSortOpen(false);
  };

  const handleResetSort = () => {
    setSortKey('due_date');
    setSortOrder('asc');
    setSortOpen(false);
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? 'Sort';

  return (
    <div className="space-y-6">

      {/* --- HEADER (DESKTOP) --- */}
      <div className="hidden md:flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between sticky top-0 z-40">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(filter => (
            <FilterButton
              key={filter.key}
              filter={filter}
              isActive={activeFilter === filter.key}
              onClick={() => setActiveFilter(filter.key)}
            />
          ))}

          {/* Sort Popover */}
          <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2 gap-1.5 text-xs h-8">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {currentSortLabel}
                {sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1" align="start">
              <div className="flex flex-col">
                {SORT_OPTIONS.map(option => (
                  <div key={option.key} className="flex flex-col">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {option.label}
                    </div>
                    <button
                      onClick={() => handleSortSelect(option.key, 'asc')}
                      className={cn("flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors",
                        sortKey === option.key && sortOrder === 'asc' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <ArrowUp className="h-3 w-3" />
                        Ascending
                      </span>
                      {sortKey === option.key && sortOrder === 'asc' && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => handleSortSelect(option.key, 'desc')}
                      className={cn("flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors",
                        sortKey === option.key && sortOrder === 'desc' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <ArrowDown className="h-3 w-3" />
                        Descending
                      </span>
                      {sortKey === option.key && sortOrder === 'desc' && <Check className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
                <hr className="my-1 border-slate-200" />
                <button
                  onClick={handleResetSort}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-md"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to Default
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-sm"
            />
          </div>
          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition", view === 'grid' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
              aria-pressed={view === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition", view === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
              aria-pressed={view === 'table'}
            >
              <List className="h-4 w-4" />
              Table
            </button>
          </div>
          <CreateAccountDialog
            collateralAccounts={collateralAccounts}
            creditCardAccounts={creditCardAccounts}
          />
        </div>
      </div>

      {/* --- HEADER (MOBILE) --- */}
      <div className="md:hidden flex flex-col gap-3 sticky top-0 z-40 bg-slate-50/95 backdrop-blur-sm pb-2 pt-1">
        {/* Row 1: Search + Add */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none shadow-sm"
            />
          </div>
          {/* Create Button (Compact) */}
          <div className="shrink-0">
            <CreateAccountDialog
              collateralAccounts={collateralAccounts}
              creditCardAccounts={creditCardAccounts}
            />
          </div>
        </div>

        {/* Row 2: Controls (Filter, Sort, View) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Filter Popover */}
            <Popover open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-colors",
                    activeFilter !== 'all' ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {FILTERS.find(f => f.key === activeFilter)?.label || 'Filter'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="grid grid-cols-1 gap-1">
                  {FILTERS.map(filter => (
                    <button
                      key={filter.key}
                      onClick={() => { setActiveFilter(filter.key); setMobileFilterOpen(false); }}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors text-left",
                        activeFilter === filter.key ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {filter.label}
                      {activeFilter === filter.key && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort Popover (Mobile) - Reusing Desktop Sort, just simpler trigger */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortKey === 'due_date' ? 'Date' : sortKey === 'balance' ? 'Bal' : 'Limit'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-1" align="start">
                {/* Reusing same sort content structure */}
                <div className="flex flex-col">
                  {SORT_OPTIONS.map(option => (
                    <div key={option.key} className="flex flex-col">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {option.label}
                      </div>
                      <button onClick={() => handleSortSelect(option.key, 'asc')} className={cn("flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors", sortKey === option.key && sortOrder === 'asc' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100')}>
                        <span className="flex items-center gap-2"><ArrowUp className="h-3 w-3" /> Asc</span>
                        {sortKey === option.key && sortOrder === 'asc' && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => handleSortSelect(option.key, 'desc')} className={cn("flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors", sortKey === option.key && sortOrder === 'desc' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100')}>
                        <span className="flex items-center gap-2"><ArrowDown className="h-3 w-3" /> Desc</span>
                        {sortKey === option.key && sortOrder === 'desc' && <Check className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button onClick={() => setView('grid')} className={cn("p-1.5 rounded-md transition", view === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400')}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setView('table')} className={cn("p-1.5 rounded-md transition", view === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400')}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>


      {displayItems.length === 0 && view === 'grid' ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          No accounts match this filter.
        </div>
      ) : view === 'grid' ? (
        /* NEW GRID SYSTEM: grid-cols-2 */
        /* NEW GRID SYSTEM: grid-cols-4 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {displayItems.map(item => {
            if (item.type === 'family') {
              return (
                <FamilyCluster
                  key={item.id}
                  parent={item.parent}
                  children_accounts={item.children}
                  allAccounts={items}
                  cashbackById={cashbackById as Record<string, AccountCashbackSnapshot>}
                  categories={categories}
                  people={people}
                  shops={shops}
                  collateralAccounts={collateralAccounts}
                  pendingBatchAccountIds={pendingBatchAccountIds}
                // Identify Single/Orphan vs Family handled internally by FamilyCluster
                />
              )
            } else {
              return (
                <div key={item.account.id} className="col-span-1">
                  <AccountCard
                    account={item.account}
                    accounts={items}
                    cashbackById={cashbackById}
                    categories={categories}
                    people={people}
                    shops={shops}
                    collateralAccounts={collateralAccounts}
                    pendingBatchAccountIds={pendingBatchAccountIds}
                  />
                </div>
              )
            }
          })}
        </div>

      ) : (
        <>
          <AccountTable
            accounts={sortedItems}
            onToggleStatus={handleToggleStatus}
            pendingId={pendingId}
            collateralAccounts={collateralAccounts}
            allAccounts={items}
          />

          {closedItems.length > 0 && (
            <details
              className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3"
              open={showClosedAccounts}
              onToggle={event => setShowClosedAccounts(event.currentTarget.open)}
            >
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-800">
                <div className="flex items-center gap-2">
                  <span>Closed accounts</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {closedItems.length}
                  </span>
                </div>
                <span className="text-slate-500">{showClosedAccounts ? '▲' : '▼'}</span>
              </summary>
              <div className="mt-4">
                <AccountTable
                  accounts={closedItems}
                  onToggleStatus={handleToggleStatus}
                  pendingId={pendingId}
                  collateralAccounts={collateralAccounts}
                  allAccounts={items}
                />
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
