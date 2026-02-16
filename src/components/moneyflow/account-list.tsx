"use client";

import { useEffect, useMemo, useState, memo } from 'react';
import { LayoutGrid, List, Search, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Check, Filter, Coins, CalendarClock, Wallet, Clock, TrendingUp, Plus, ListFilter, X } from 'lucide-react';
import { AccountSlideV2 } from '@/components/accounts/v2/AccountSlideV2';
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
  userId?: string;
};

type ViewMode = 'grid' | 'table';
type FilterKey = 'all' | 'bank' | 'credit' | 'savings' | 'debt';
type SortKey = 'due_date' | 'balance' | 'limit';
type SortOrder = 'asc' | 'desc';

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

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


export function AccountList({ accounts, cashbackById = {}, categories, people, shops, pendingBatchAccountIds = [], usageStats, quickPeopleConfig, userId }: AccountListProps) {
  const [layoutMode, setLayoutMode] = useState<ViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [showWaitingConfirm, setShowWaitingConfirm] = useState(false);
  const [showNeedToSpend, setShowNeedToSpend] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Account[]>(accounts);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Mobile states
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isAccountSlideOpen, setIsAccountSlideOpen] = useState(false);

  useEffect(() => {
    setItems(accounts);
  }, [accounts]);

  const collateralAccounts = useMemo(
    () => items.filter(acc => ['savings', 'investment', 'asset'].includes(acc.type)),
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

  // Stats for Header
  const totalDebt = useMemo(() => {
    return items.reduce((sum, acc) => {
      if (acc.type === 'credit_card' && (acc.current_balance ?? 0) > 0) {
        return sum + (acc.current_balance ?? 0);
      }
      if (acc.type === 'debt' && (acc.current_balance ?? 0) > 0) {
        return sum + (acc.current_balance ?? 0);
      }
      return sum;
    }, 0);
  }, [items]);

  const totalDebtNextMonth = useMemo(() => {
    return totalDebt;
  }, [totalDebt]);


  // 1. Filter Logic
  const filteredItems = useMemo(() => {
    let filtered = activeItems;

    // A. Visual Tabs
    if (activeFilter !== 'all') {
      if (activeFilter === 'bank') filtered = filtered.filter(acc => ['bank', 'cash', 'ewallet'].includes(acc.type));
      else if (activeFilter === 'credit') filtered = filtered.filter(acc => acc.type === 'credit_card');
      else if (activeFilter === 'savings') filtered = filtered.filter(acc => ['savings', 'investment', 'asset'].includes(acc.type));
      else if (activeFilter === 'debt') filtered = filtered.filter(acc => acc.type === 'debt');
    }

    // B. Toggles (Intersecting)
    if (showWaitingConfirm) {
      filtered = filtered.filter(acc => pendingBatchAccountIds.includes(acc.id));
    }
    if (showNeedToSpend) {
      filtered = filtered.filter(acc => (cashbackById[acc.id]?.missing_min_spend ?? 0) > 0);
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
  }, [items, activeItems, activeFilter, searchQuery, pendingBatchAccountIds, cashbackById, showWaitingConfirm, showNeedToSpend]);

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

  const [showClosedAccountsState, setShowClosedAccountsState] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. Header with Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white/50 backdrop-blur-xl sticky top-0 z-30 py-4 -mx-4 px-4 border-b border-slate-100/50 shadow-sm md:static md:bg-transparent md:border-none md:p-0 md:m-0 md:shadow-none mb-20">

        {/* Left: Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0 md:overflow-visible flex-nowrap">
          {/* Mobile Filter Trigger */}
          <div className="md:hidden">
            <Popover open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 rounded-full border-slate-200 bg-white", activeFilter !== 'all' && "bg-slate-900 text-white border-slate-900")}>
                  <ListFilter className="w-3.5 h-3.5 mr-1.5" />
                  {activeFilter === 'all' ? 'Filter' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="flex flex-col gap-1">
                  {['all', 'bank', 'credit', 'savings', 'debt'].map(f => (
                    <button
                      key={f}
                      onClick={() => { setActiveFilter(f as any); setMobileFilterOpen(false); }}
                      className={cn("text-left px-3 py-2 rounded-lg text-sm transition-colors", activeFilter === f ? "bg-slate-100 font-bold text-slate-900" : "hover:bg-slate-50 text-slate-600")}
                    >
                      {f === 'all' ? 'All Accounts' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Desktop Filters */}
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              "hidden md:block px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
              activeFilter === 'all'
                ? "bg-blue-600 text-white shadow-md shadow-blue-200 transform scale-105"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            All Accounts
          </button>

          <div className="hidden md:block w-px h-6 bg-slate-200 mx-2 shrink-0" />

          {[
            { id: 'bank', label: 'Bank' },
            { id: 'credit', label: 'Credit Card' },
            { id: 'savings', label: 'Savings' },
            { id: 'debt', label: 'Debt & Loans' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={cn(
                "hidden md:block px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                activeFilter === filter.id
                  ? "bg-slate-900 text-white shadow-md transform scale-105"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {filter.label}
            </button>
          ))}

          {/* Waiting & Need Toggle (Visible on Mobile too) */}
          <div className="flex items-center gap-2 bg-white rounded-full border border-slate-200 p-1 pr-1 md:pr-3 shrink-0">
            <button
              onClick={() => setShowWaitingConfirm(!showWaitingConfirm)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1",
                showWaitingConfirm ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"
              )}
            >
              <Clock className="w-3 h-3" /> <span className="hidden sm:inline">Waiting</span>
            </button>
            <button
              onClick={() => setShowNeedToSpend(!showNeedToSpend)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1",
                showNeedToSpend ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-400"
              )}
            >
              <TrendingUp className="w-3 h-3" /> <span className="hidden sm:inline">Needs</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          {/* Sort Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-2.5 bg-white border-slate-200 text-slate-600 hover:text-slate-900 ml-auto md:ml-0">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline text-xs font-medium">Sort</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1" align="end">
              <div className="grid gap-1">
                <button onClick={() => setSortKey('due_date')} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-slate-50", sortKey === 'due_date' && "bg-slate-50 font-bold")}>
                  <CalendarClock className="w-3.5 h-3.5 text-amber-500" /> Due Date
                </button>
                <button onClick={() => setSortKey('balance')} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-slate-50", sortKey === 'balance' && "bg-slate-50 font-bold")}>
                  <Coins className="w-3.5 h-3.5 text-emerald-500" /> Balance
                </button>
                <button onClick={() => setSortKey('limit')} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-slate-50", sortKey === 'limit' && "bg-slate-50 font-bold")}>
                  <Wallet className="w-3.5 h-3.5 text-blue-500" /> Credit Limit
                </button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="relative flex-1 md:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-8 pr-4 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400"
            />
          </div>

          {/* Layout Mode */}
          <div className="bg-slate-100 p-1 rounded-lg hidden md:flex">
            <button onClick={() => setLayoutMode('grid')} className={cn("p-1.5 rounded-md transition-all", layoutMode === 'grid' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600")}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setLayoutMode('table')} className={cn("p-1.5 rounded-md transition-all", layoutMode === 'table' ? "bg-white shadow-sm text-slate-900" : "text-slate-400 hover:text-slate-600")}>
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={() => setIsAccountSlideOpen(true)}
            size="sm"
            className="h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200 px-3"
          >
            <Plus className="w-4 h-4 md:mr-1.5" />
            <span className="hidden md:inline">Add New</span>
          </Button>
        </div>
      </div>

      {/* Debt Banner (Mobile Sticky or Top) */}
      <div className="md:hidden mb-4 mx-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-lg shadow-slate-200/50 p-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Total Debt</span>
          <div className="text-lg font-bold">{numberFormatter.format(totalDebt)} <span className="text-xs font-normal text-slate-500">₫</span></div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Projected Next Month</span>
          <div className="text-sm font-bold text-emerald-400">{numberFormatter.format(totalDebtNextMonth)}</div>
        </div>
      </div>


      {/* 2. Content */}
      <div className={cn(
        "grid gap-6 pb-20",
        layoutMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "grid-cols-1"
      )}>
        {displayItems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 opacity-50" />
            </div>
            <p className="text-sm font-medium">No accounts found</p>
          </div>
        ) : (
          displayItems.map((item) => (
            item.type === 'single' ? (
              <AccountCard
                key={item.account.id}
                account={item.account}
                accounts={items}
                cashbackById={cashbackById}
                categories={categories}
                people={people}
                shops={shops}
                collateralAccounts={items}
                pendingBatchAccountIds={pendingBatchAccountIds}
                className="w-full"
              />
            ) : (
              <FamilyCluster
                key={item.id}
                parent={item.parent}
                children_accounts={item.children}
                allAccounts={items}
                categories={categories}
                people={people}
                shops={shops}
                pendingBatchAccountIds={pendingBatchAccountIds}
                cashbackById={cashbackById as Record<string, AccountCashbackSnapshot>}
                collateralAccounts={items}
              />
            )
          ))
        )}
      </div>

      {closedItems.length > 0 && layoutMode === 'table' && (
        <details
          className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3"
          open={showClosedAccountsState}
          onToggle={event => setShowClosedAccountsState(event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-800">
            Show {closedItems.length} Closed Accounts
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
      <AccountSlideV2
        open={isAccountSlideOpen}
        onOpenChange={setIsAccountSlideOpen}
        allAccounts={accounts}
        categories={categories}
      />
    </div>
  );
}
