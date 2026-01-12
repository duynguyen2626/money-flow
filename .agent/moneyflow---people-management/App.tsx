
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import MemberCard from './components/MemberCard';
import AccountCard from './components/AccountCard';
import MemberDetailView from './components/MemberDetailView';
import TransactionsView from './components/TransactionsView'; // Import the new view
import { mockMembers, mockAccounts } from './services/mockData';
import { Account, Member } from './types';
import { 
  Search, 
  Plus, 
  LayoutGrid, 
  List, 
  ArrowRight,
  ShieldCheck,
  Link as LinkIcon
} from 'lucide-react';

type GridUnit = 
  | { type: 'single'; account: Account }
  | { type: 'group'; parent: Account; children: Account[] };

const App: React.FC = () => {
  // Set transactions as default view as requested
  const [currentView, setCurrentView] = useState<'people' | 'accounts' | 'transactions'>('transactions');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'warning' | 'clean'>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const gridUnits = useMemo(() => {
    if (currentView !== 'accounts') return [];
    
    const searchLower = searchTerm.toLowerCase();
    
    const matchingIds = new Set(
      mockAccounts
        .filter(a => a.name.toLowerCase().includes(searchLower))
        .map(a => a.id)
    );

    const units: GridUnit[] = [];
    const processedIds = new Set<string>();

    mockAccounts.forEach(acc => {
      if (acc.role === 'Parent' && !processedIds.has(acc.id)) {
        const children = mockAccounts.filter(child => child.parentId === acc.id);
        const familyIds = [acc.id, ...children.map(c => c.id)];
        const familyMatches = familyIds.some(id => matchingIds.has(id));
        
        if (familyMatches || searchTerm === '') {
          units.push({ type: 'group', parent: acc, children });
          familyIds.forEach(id => processedIds.add(id));
        }
      }
    });

    mockAccounts.forEach(acc => {
      if (!processedIds.has(acc.id)) {
        if (matchingIds.has(acc.id) || searchTerm === '') {
          if (acc.role !== 'Child' || !acc.parentId) {
             units.push({ type: 'single', account: acc });
             processedIds.add(acc.id);
          }
        }
      }
    });

    return units;
  }, [searchTerm, currentView]);

  const filteredMembers = useMemo(() => {
    return mockMembers.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (activeTab === 'all') return matchesSearch;
      if (activeTab === 'warning') return matchesSearch && m.currentDebt.remains > 0;
      if (activeTab === 'clean') return matchesSearch && m.currentDebt.remains === 0;
      return matchesSearch;
    });
  }, [searchTerm, activeTab]);

  const stats = useMemo(() => {
    const totalRemaining = mockMembers.reduce((acc, m) => acc + m.currentDebt.remains, 0);
    const totalAccountBalance = mockAccounts.reduce((acc, a) => acc + a.balance, 0);
    return { totalRemaining, totalAccountBalance };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      <main className="flex-grow flex flex-col ml-20 transition-all duration-300 min-h-screen relative">
        
        {/* VIEW ROUTING */}
        {currentView === 'transactions' ? (
          <TransactionsView />
        ) : selectedMember ? (
          <MemberDetailView 
            member={selectedMember} 
            onClose={() => setSelectedMember(null)} 
          />
        ) : (
          <>
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 lg:px-10 py-5">
              <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-1 block">Management Engine</span>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {currentView === 'people' ? 'Members' : 'Accounts'}
                  </h1>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative group w-full sm:w-[320px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder={`Search ${currentView}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-6 py-3.5 bg-slate-100/50 border-2 border-transparent rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-100 transition-all font-medium"
                    />
                  </div>
                  <button className="flex items-center justify-center bg-indigo-600 text-white px-7 py-3.5 rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100 shrink-0">
                    <Plus className="w-4 h-4 mr-2" />
                    <span>Add New</span>
                  </button>
                </div>
              </div>
            </header>

            <div className="p-4 lg:p-10 flex-grow">
              <div className="max-w-[1700px] mx-auto space-y-10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-8">
                   <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
                    <FilterTab active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All" />
                    <FilterTab active={activeTab === 'warning'} onClick={() => setActiveTab('warning')} label="Priority" color="rose" />
                    <FilterTab active={activeTab === 'clean'} onClick={() => setActiveTab('clean')} label="Cleared" color="emerald" />
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">
                        {currentView === 'people' ? 'Total Remains' : 'Global Assets'}
                      </span>
                      <div className="text-xl font-black text-slate-900 leading-none">
                        {(currentView === 'people' ? stats.totalRemaining : stats.totalAccountBalance).toLocaleString()}đ
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <button className="p-2 bg-slate-900 text-white rounded-xl"><LayoutGrid className="w-4 h-4" /></button>
                      <button className="p-2 text-slate-400 hover:text-slate-600"><List className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>

                {/* Redesigned grid for compact cards */}
                <div className={`grid ${currentView === 'people' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' : 'grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'} gap-4 md:gap-6`}>
                  {currentView === 'people' ? (
                    filteredMembers.map(m => (
                      <MemberCard 
                        key={m.id} 
                        member={m} 
                        onViewDetails={(member) => setSelectedMember(member)} 
                      />
                    ))
                  ) : (
                    gridUnits.map((unit) => {
                      if (unit.type === 'single') {
                        return <AccountCard key={unit.account.id} account={unit.account} />;
                      } else {
                        const totalCols = Math.min(unit.children.length + 1, 3);
                        return (
                          <div key={unit.parent.id} className={`col-span-full grid grid-cols-2 lg:grid-cols-${totalCols} gap-8 relative group/unit bg-indigo-50/20 p-6 rounded-[2.5rem] border border-indigo-100/50`}>
                            <div className="relative">
                              <AccountCard account={unit.parent} isGrouped />
                              <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md shadow-lg shadow-indigo-100">Primary Account</div>
                            </div>
                            
                            {unit.children.map((child, idx) => (
                              <div key={child.id} className="relative flex flex-col justify-center">
                                <div className="flex absolute -left-10 top-1/2 -translate-y-1/2 items-center justify-center pointer-events-none z-20">
                                   <div className="w-12 h-[2px] border-t-2 border-dashed border-indigo-200 relative">
                                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full border-2 border-indigo-100 shadow-md transition-all group-hover/unit:scale-110 group-hover/unit:rotate-12">
                                        <LinkIcon className="w-3.5 h-3.5 text-indigo-500 stroke-[3px]" />
                                      </div>
                                   </div>
                                </div>
                                <AccountCard account={child} isGrouped />
                              </div>
                            ))}
                          </div>
                        );
                      }
                    })
                  )}
                </div>
              </div>

              <footer className="mt-20 py-10 border-t border-slate-100/60">
                 <div className="max-w-[1700px] mx-auto flex items-center justify-between">
                   <div className="flex items-center gap-5">
                      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-900 font-black uppercase tracking-[0.2em]">MoneyFlow Engine v3.8</p>
                        <p className="text-[9px] text-slate-400 font-bold tracking-tight">Enterprise Financial Management & Security</p>
                      </div>
                   </div>
                 </div>
              </footer>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const FilterTab = ({ active, onClick, label, color = 'indigo' }: any) => {
  const activeStyles: any = {
    indigo: 'bg-white text-indigo-600 shadow-md shadow-indigo-100',
    rose: 'bg-white text-rose-600 shadow-md shadow-rose-100',
    emerald: 'bg-white text-emerald-600 shadow-md shadow-emerald-100'
  };
  return (
    <button onClick={onClick} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${active ? activeStyles[color] : 'text-slate-500 hover:text-slate-800'}`}>
      {label}
    </button>
  );
};

export default App;
