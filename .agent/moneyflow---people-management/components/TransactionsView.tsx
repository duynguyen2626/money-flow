
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  ArrowRight,
  Edit2,
  Utensils,
  Zap,
  Clock,
  Copy,
  Wrench,
  Sigma,
  MoreVertical,
  Inbox,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  Percent,
  Calendar,
  ChevronDown,
  Users,
  CreditCard
} from 'lucide-react';

// Mock data structure
interface TransactionData {
  id: string;
  date: string; // Format: DD.MM
  time: string;
  note: string;
  icon: any;
  iconColor: string;
  source: { name: string; date?: string | null; img: string };
  target: { name: string; date?: string; initials: string; color: string } | null;
  originalValue: number;
  finalValue: number;
  discountInfo?: string;
  discountAmount?: number;
  type: 'Income' | 'Expense' | 'Lend' | 'Repay';
  category: string;
  status: 'Active' | 'Void' | 'Pending';
  metaBadges?: { text: string; color: string }[]; // Metadata badges like "+1 Paid", "Split", "CB"
}

const MOCK_TRANSACTIONS: TransactionData[] = [
  {
    id: 'da59',
    date: '10.01',
    time: '16:54',
    note: 'Dư nợ T12',
    icon: ShoppingBag,
    iconColor: 'text-indigo-500',
    source: { name: 'Vpbank Lady', date: '20-12 to 19-01', img: 'https://img.icons8.com/color/48/visa.png' },
    target: { name: 'Tuấn', date: '2026-01', initials: 'TU', color: 'bg-indigo-600' },
    originalValue: 2158586,
    finalValue: 2158586,
    type: 'Lend',
    category: 'Lending',
    status: 'Active',
    metaBadges: [{ text: 'Split', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' }]
  },
  {
    id: 'da60',
    date: '09.01',
    time: '12:30',
    note: 'Buffet sáng',
    icon: Utensils,
    iconColor: 'text-rose-500',
    source: { name: 'Vpbank Lady', date: '20-12 to 19-01', img: 'https://img.icons8.com/color/48/visa.png' },
    target: { name: 'Tuấn', date: '2026-01', initials: 'TU', color: 'bg-indigo-600' },
    originalValue: 395766,
    finalValue: 395766,
    type: 'Lend',
    category: 'Food',
    status: 'Active',
    metaBadges: [{ text: '+1 Paid', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' }]
  },
  {
    id: 'c08b',
    date: '05.01',
    time: '00:00',
    note: 'Điện T12',
    icon: Zap,
    iconColor: 'text-rose-500',
    source: { name: 'Vpbank', date: 'Monthly Cycle', img: 'https://img.icons8.com/color/48/citibank.png' },
    target: { name: 'Ngọc', date: '2026-01', initials: 'NG', color: 'bg-purple-500 text-white' },
    originalValue: 1403352,
    finalValue: 1389318,
    discountInfo: '1%', 
    discountAmount: 14034,
    type: 'Expense',
    category: 'Utilities',
    status: 'Pending',
    metaBadges: [{ text: 'CB', color: 'bg-amber-50 text-amber-600 border-amber-100' }, { text: 'Refund', color: 'bg-rose-50 text-rose-600 border-rose-100' }]
  },
  {
    id: 'ecd1',
    date: '04.01',
    time: '14:09',
    note: 'Buffet sáng',
    icon: Utensils,
    iconColor: 'text-rose-500',
    source: { name: 'Vpbank Lady', date: 'Pending', img: 'https://img.icons8.com/color/48/visa.png' },
    target: { name: 'Tuấn', date: '2026-01', initials: 'TU', color: 'bg-indigo-600' },
    originalValue: 791532,
    finalValue: 791532,
    type: 'Lend',
    category: 'Shopping',
    status: 'Active',
    metaBadges: [{ text: 'Split', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' }]
  },
  {
    id: 'ecd2',
    date: '04.01',
    time: '14:15',
    note: '[Split] Buffet sáng',
    icon: Utensils,
    iconColor: 'text-blue-500',
    source: { name: 'Draft Fund', date: 'Pending', img: 'https://img.icons8.com/color/48/wallet.png' },
    target: { name: 'Tuấn', date: '2026-01', initials: 'TU', color: 'bg-indigo-600' },
    originalValue: 395766,
    finalValue: 395766,
    type: 'Lend',
    category: 'Shopping',
    status: 'Void',
    metaBadges: [{ text: 'Refunded', color: 'bg-slate-100 text-slate-500 border-slate-200' }]
  }
];

const TransactionsView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransactionData['status'] | 'All'>('All');
  const [monthFilter, setMonthFilter] = useState<string>('JAN');

  const filteredTransactions = useMemo(() => {
    return MOCK_TRANSACTIONS.filter(t => {
      const matchesSearch = t.note.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const getMonthName = (dateStr: string) => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthIdx = parseInt(dateStr.split('.')[1]) - 1;
    return months[monthIdx];
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden">
      {/* 1. COMPACT UNIFIED HEADER - REFINED SPACING & SIZE */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8 flex-grow">
          <div className="shrink-0">
            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block leading-none mb-0.5">Financial Engine</span>
            <h1 className="text-base font-black text-slate-900 tracking-tighter leading-none whitespace-nowrap">Transactions Flow</h1>
          </div>

          {/* Unified Quick Filter Bar */}
          <div className="flex items-center bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200 flex-grow max-w-[1400px] shadow-inner">
              {/* Search Segment - Increased Size */}
              <div className="relative group w-56 shrink-0 ml-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Find anything..."
                  className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500/30 transition-all placeholder:text-slate-400 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="h-6 w-px bg-slate-200 mx-3" />

              {/* People & Account Dropdowns Segment */}
              <div className="flex items-center gap-2 shrink-0">
                  <button className="h-10 px-4 flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-all shadow-sm">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>People</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-30" />
                  </button>
                  <button className="h-10 px-4 flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-all shadow-sm">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    <span>Accounts</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-30" />
                  </button>
              </div>

              <div className="h-6 w-px bg-slate-200 mx-3" />

              {/* Stats Segment */}
              <div className="flex items-center gap-8 px-4 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Lending</span>
                  <span className="text-[13px] font-black text-rose-600 tabular-nums leading-none tracking-tight">8,619,199</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Repaid</span>
                  <span className="text-[13px] font-black text-emerald-600 tabular-nums leading-none tracking-tight">0</span>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-200 mx-3" />

              {/* Status Filters Segment */}
              <div className="flex items-center gap-1 shrink-0">
                  {(['All', 'Active', 'Pending', 'Void'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-4 h-10 text-[9px] font-black uppercase rounded-xl transition-all ${
                        statusFilter === s 
                        ? 'bg-slate-900 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
              </div>

              <div className="h-6 w-px bg-slate-200 mx-3" />

              {/* Timeline Month Segment */}
              <div className="flex items-center gap-1 shrink-0 pr-1">
                  {['JAN', 'FEB', 'MAR'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMonthFilter(m)}
                      className={`px-4 h-10 text-[9px] font-black uppercase rounded-xl transition-all ${
                        monthFilter === m 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                  <button className="px-4 h-10 text-[9px] font-black uppercase rounded-xl text-slate-400 hover:bg-slate-200/50 flex items-center gap-1.5 transition-all group">
                    More <span className="text-[8px] opacity-50 group-hover:opacity-100 transition-opacity">2026</span>
                  </button>
              </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-3 shrink-0">
            <button className="h-12 w-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
               <Filter className="w-5 h-5" />
            </button>
            <button className="h-12 px-7 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-slate-200 active:scale-95 transition-all">
               <Plus className="w-5 h-5" /> New Entry
            </button>
        </div>
      </header>

      {/* 2. MAIN SCROLL AREA */}
      <div className="flex-grow overflow-y-auto no-scrollbar p-6">
        <div className="max-w-[1600px] mx-auto">
           
           {/* HEADER ROW - PERFECTLY ALIGNED */}
           <div className="grid grid-cols-[100px_1fr_480px_180px_180px_120px] gap-6 px-6 mb-6 text-[10px] font-black text-slate-300 uppercase tracking-widest items-center opacity-60">
              <div className="text-center">Timeline</div>
              <div className="pl-4">Transaction Details</div>
              <div className="text-center">Flow Performance</div>
              <div className="text-right pr-4">Base Amount</div>
              <div className="text-right pr-4">Final Settlement</div>
              <div className="text-center">Operations</div>
           </div>

           {/* TRANSACTION ROWS */}
           <div className="space-y-3">
             {filteredTransactions.map((t) => {
               const day = t.date.split('.')[0];
               const month = getMonthName(t.date);
               const hasDiscount = t.originalValue !== t.finalValue;
               const valueColor = (t.type === 'Income' || t.type === 'Repay') ? 'text-emerald-600' : 'text-rose-600';

               return (
                 <div key={t.id} className="grid grid-cols-[100px_1fr_480px_180px_180px_120px] gap-6 bg-white p-5 rounded-[2.5rem] border border-slate-200 items-center transition-all duration-500 relative group overflow-hidden hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/5">
                    
                    {/* COL 1: TIMELINE */}
                    <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-6">
                       <div className="flex flex-col items-center leading-none">
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1.5">{month}</span>
                          <span className="text-3xl font-black text-slate-900 leading-none">{day}</span>
                       </div>
                       <div className="mt-2.5 text-[10px] font-bold text-slate-300 tabular-nums uppercase tracking-tighter">
                          {t.time}
                       </div>
                    </div>

                    {/* COL 2: DETAILS */}
                    <div className="flex items-center gap-5 min-w-0 pl-4">
                       <div className="w-16 h-16 rounded-[1.25rem] bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm group-hover:bg-white group-hover:border-indigo-100 transition-all group-hover:rotate-3">
                          <t.icon className={`w-7 h-7 ${t.iconColor}`} />
                       </div>
                       <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                             <h3 className="text-[16px] font-bold text-slate-900 truncate leading-none tracking-tight">{t.note}</h3>
                             <span className="text-[9px] font-black text-slate-300 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">#{t.id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">{t.category}</span>
                             <div className="w-1 h-1 rounded-full bg-slate-200 mx-1" />
                             <span className="text-[10px] font-bold text-slate-300">Verified</span>
                          </div>
                       </div>
                    </div>

                    {/* COL 3: FLOW PERFORMANCE */}
                    <div className="px-6 border-l border-slate-100 h-full flex items-center relative">
                        <div className="flex items-center justify-between gap-6 w-full">
                            {/* Source */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-16 h-16 p-2 bg-white rounded-2xl border-2 border-slate-50 shrink-0 flex items-center justify-center shadow-sm group-hover:border-indigo-100 transition-all group-hover:scale-105">
                                    <img src={t.source.img} alt="" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                   <span className="text-[12px] font-black text-slate-900 uppercase truncate leading-none mb-2 tracking-tight">{t.source.name}</span>
                                   <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 w-fit">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate max-w-[90px]">
                                         {t.source.date || 'Cycle Active'}
                                      </span>
                                   </div>
                                </div>
                            </div>

                            {/* Center Flow Section */}
                            <div className="flex flex-col items-center gap-2.5 shrink-0 px-2 min-w-[120px]">
                                <ArrowRight className="w-6 h-6 text-slate-200 group-hover:text-indigo-400 transition-colors" strokeWidth={2.5} />
                                <div className="flex flex-wrap justify-center gap-1.5">
                                   {t.metaBadges?.map((b, idx) => (
                                      <span key={idx} className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tighter whitespace-nowrap shadow-sm transition-transform hover:scale-110 ${b.color}`}>
                                         {b.text}
                                      </span>
                                   ))}
                                </div>
                            </div>

                            {/* Target */}
                            <div className="flex items-center gap-4 justify-end flex-1 min-w-0 text-right">
                                {t.target ? (
                                    <>
                                        <div className="flex flex-col min-w-0 items-end">
                                           <span className="text-[12px] font-black text-slate-900 uppercase truncate leading-none mb-2 tracking-tight">{t.target.name}</span>
                                           <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100 w-fit shadow-sm shadow-emerald-100/20">
                                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">{t.target.date || 'Lending'}</span>
                                           </div>
                                        </div>
                                        <div className={`w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-[13px] font-black text-white shrink-0 shadow-xl border-4 border-white ${t.target.color} group-hover:scale-110 group-hover:-rotate-3 transition-all`}>
                                            {t.target.initials}
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-16 h-16 rounded-[1.25rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-200">
                                       <Inbox className="w-7 h-7" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COL 4: BASE AMOUNT */}
                    <div className="text-right border-l border-slate-100 px-6 h-full flex flex-col justify-center">
                        <div className="flex flex-col items-end">
                            <span className={`text-[22px] font-black tracking-tighter leading-none tabular-nums ${valueColor}`}>
                                {t.originalValue.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mt-2 opacity-60">BASE VALUE</span>
                        </div>
                    </div>

                    {/* COL 5: FINAL SETTLEMENT */}
                    <div className="text-right border-l border-slate-100 px-6 bg-slate-50/10 h-full flex flex-col justify-center">
                        <div className="flex flex-col items-end gap-2">
                            {hasDiscount ? (
                                <>
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200 shadow-sm shadow-emerald-100/50 animate-pulse">
                                     <Percent className="w-3 h-3" />
                                     <span className="text-[10px] font-black">-{t.discountInfo}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <span className={`text-[19px] font-black tracking-tight leading-none tabular-nums ${valueColor}`}>
                                         {t.finalValue.toLocaleString()}
                                     </span>
                                     <Sigma className="w-4 h-4 text-indigo-400 opacity-80" strokeWidth={3} />
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 tabular-nums uppercase tracking-tighter">REF: {t.originalValue.toLocaleString()}</span>
                                </>
                            ) : (
                                <>
                                  <span className={`text-[19px] font-black tracking-tight leading-none tabular-nums ${valueColor}`}>
                                      {t.finalValue.toLocaleString()}
                                  </span>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Info className="w-4 h-4 text-slate-300" strokeWidth={3} />
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">NET SETTLEMENT</span>
                                  </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* COL 6: ACTION */}
                    <div className="flex items-center justify-center gap-2 border-l border-slate-100 pl-6 h-full">
                        <button className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-lg hover:shadow-indigo-100 rounded-2xl transition-all border border-transparent hover:border-indigo-100 active:scale-90" title="Edit">
                            <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-lg hover:shadow-emerald-100 rounded-2xl transition-all border border-transparent hover:border-emerald-100 active:scale-90" title="Copy">
                            <Copy className="w-4.5 h-4.5" />
                        </button>
                        <button className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-lg rounded-2xl transition-all border border-transparent hover:border-slate-200 active:scale-90" title="More Options">
                            <MoreVertical className="w-4.5 h-4.5" />
                        </button>
                    </div>
                 </div>
               );
             })}
           </div>

           {/* EMPTY STATE */}
           {filteredTransactions.length === 0 && (
             <div className="py-32 flex flex-col items-center gap-5 text-slate-200 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-inner">
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 border border-slate-100">
                    <Inbox className="w-10 h-10" />
                </div>
                <div className="text-center">
                   <h3 className="font-black text-slate-300 uppercase tracking-[0.3em] mb-2">Vault Empty</h3>
                   <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] max-w-[200px] mx-auto leading-relaxed">Modify your filters or search terms to uncover financial flows</p>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="shrink-0 bg-white border-t border-slate-200 px-8 py-3.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
         <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Engine Version</span>
               <span className="text-[10px] font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shadow-sm shadow-slate-100/50">v5.4.2-PRECISION</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-2.5">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Records</span>
               <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100/50 shadow-sm shadow-indigo-100/20">{filteredTransactions.length}</span>
            </div>
         </div>
         <div className="flex items-center gap-5 uppercase tracking-[0.2em] font-black">
            <div className="flex items-center gap-2.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50 shadow-sm shadow-emerald-100/10">
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" />
               <span className="text-emerald-700 text-[8px]">Realtime Sync Active</span>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default TransactionsView;
