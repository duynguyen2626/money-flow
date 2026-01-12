
import React, { useState } from 'react';
import { Member, DebtPeriod } from '../types';
import { 
  ChevronLeft,
  Search, 
  Edit2,
  Plus,
  ArrowDown,
  Inbox,
  Trash2,
  RefreshCcw,
  FileText,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Percent,
  History,
  LayoutGrid,
  CheckCircle2,
  Split,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface MemberDetailViewProps {
  member: Member;
  onClose: () => void;
}

const MemberDetailView: React.FC<MemberDetailViewProps> = ({ member, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'Timeline' | 'All History' | 'Split Bill'>('Timeline');
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  const allPeriods = [member.currentDebt, ...(member.periods || [])];
  const [selectedPeriod, setSelectedPeriod] = useState<DebtPeriod | null>(allPeriods[0]);

  // Mock data for the stats
  const stats = {
    lend: selectedPeriod?.total || 0,
    repay: selectedPeriod?.paid || 0,
    cashback: 464004,
    paidCount: selectedPeriod?.transactions?.length ? selectedPeriod.transactions.length + 2 : 4 
  };

  // Mock Timeline Data
  const rawTimelineData = [
    { month: 'JAN 26', val: 8619199, status: 'Active' },
    { month: 'DEC 25', val: 0, status: 'Settled' },
    { month: 'NOV 25', val: 0, status: 'Settled' },
    { month: 'OCT 25', val: 0, status: 'Settled' },
    { month: 'SEP 25', val: 0, status: 'Settled' },
    { month: 'AUG 25', val: 0, status: 'Settled' },
    { month: 'JUL 25', val: 0, status: 'Settled' },
    { month: 'JUN 25', val: 0, status: 'Settled' },
  ];

  const timelineData = showFullHistory ? rawTimelineData : rawTimelineData.slice(0, 5);
  const hasUnpaid = member.status === 'warning'; // Mock condition

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] animate-in slide-in-from-right-4 duration-500">
      
      {/* 1. UNIFIED HEADER: Identity + Tabs */}
      <header className="shrink-0 bg-white border-b border-slate-200/60 px-4 h-16 flex items-center justify-between shadow-sm z-30 relative">
        <div className="flex items-center gap-6 h-full">
          {/* Identity Section */}
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="w-8 h-8 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg flex items-center justify-center transition-all border border-slate-200/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 border-l border-slate-100 pl-3">
              <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-xs shadow-md">
                {member.initials}
              </div>
              <div className="flex flex-col">
                 <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide leading-none">{member.name}</h1>
                 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mt-0.5">Active</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center h-full ml-2">
            <button 
              onClick={() => setActiveTab('Timeline')}
              className={`h-full px-3 text-[11px] font-black uppercase tracking-wider border-b-[3px] transition-all flex items-center gap-2 ${activeTab === 'Timeline' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Timeline
            </button>
            <button 
              onClick={() => setActiveTab('All History')}
              className={`h-full px-3 text-[11px] font-black uppercase tracking-wider border-b-[3px] transition-all flex items-center gap-2 ${activeTab === 'All History' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
            >
              <History className="w-3.5 h-3.5" /> History
            </button>
            <button 
              onClick={() => setActiveTab('Split Bill')}
              className={`h-full px-3 text-[11px] font-black uppercase tracking-wider border-b-[3px] transition-all flex items-center gap-2 ${activeTab === 'Split Bill' ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
            >
              <Split className="w-3.5 h-3.5" /> Split Bill
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
           <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" />
           </button>
           <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
              <MoreHorizontal className="w-4 h-4" />
           </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-grow flex flex-col p-3 lg:p-4 overflow-hidden">
        <div className="max-w-[1920px] mx-auto w-full h-full flex flex-col gap-3">
          
          {/* 2. TIMELINE ROW (Single Line Cards) */}
          <div className="shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
             
             {/* Consolidated Filter Group */}
             <div className="shrink-0 h-11 flex items-center bg-white border border-slate-200 rounded-xl shadow-sm p-1 mr-2">
               <button className="w-9 h-full flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-50">
                  <Filter className="w-4 h-4" />
               </button>
               <div className="w-px h-5 bg-slate-200 mx-1"></div>
               <button className="px-3 h-full flex items-center gap-2 text-indigo-600 font-black text-[11px] hover:bg-indigo-50 rounded-lg transition-colors">
                  2026 <ChevronDown className="w-3 h-3 opacity-50" />
               </button>
             </div>

             {/* Timeline Items */}
             {timelineData.map((item, idx) => {
                const isSelected = idx === 0;
                const isSettled = item.status === 'Settled';
                return (
                  <button 
                    key={idx}
                    className={`shrink-0 h-11 px-4 min-w-[180px] flex items-center justify-between rounded-xl border transition-all duration-200 group ${
                        isSelected 
                        ? 'bg-[#1e1b4b] border-[#1e1b4b] text-white shadow-md' // Dark indigo active state
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                     <span className={`text-[11px] font-black uppercase whitespace-nowrap ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {item.month}
                     </span>
                     
                     {isSettled ? (
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Settled</span>
                     ) : (
                        <span className={`text-[13px] font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                           {item.val.toLocaleString()}
                        </span>
                     )}
                  </button>
                );
             })}
            
            {/* Unpaid Badge (Conditional - Placed before More) */}
             {hasUnpaid && (
                <div className="shrink-0 h-11 px-4 flex items-center justify-center bg-amber-50 border border-amber-100 rounded-xl text-amber-600 shadow-sm ml-1">
                   <span className="text-[10px] font-black uppercase tracking-wider">Unpaid</span>
                </div>
             )}

             {/* More / History Button (Text Version) */}
             <button 
               onClick={() => setShowFullHistory(!showFullHistory)}
               className="shrink-0 h-11 px-4 flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all ml-auto"
             >
                <span className="text-[10px] font-black uppercase">More</span>
                <ChevronRight className="w-3.5 h-3.5" />
             </button>
          </div>

          {/* 3. MAIN CARD (Stats + Table) */}
          <div className="flex-grow bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
             
             {/* DASHBOARD HEADER: Single Row Toolbar */}
             <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-white z-10 overflow-x-auto no-scrollbar">
                
                <div className="flex items-center gap-4 flex-nowrap shrink-0">
                  {/* Unified Stats Group (Interactable) */}
                  <div className="flex items-stretch border border-slate-200 rounded-xl bg-slate-50/30 overflow-hidden divide-x divide-slate-100 h-11 shadow-sm">
                     
                     {/* Period Label (Static) */}
                     <div className="px-4 flex flex-col justify-center items-center bg-white min-w-[80px]">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{selectedPeriod?.month}</span>
                     </div>
                     
                     {/* Remains (Static highlight) */}
                     <div className="px-4 flex items-center gap-2 bg-white min-w-[110px]">
                        <span className="text-[8px] font-black text-rose-300 uppercase tracking-wider">Remains</span>
                        <span className="text-xs font-black text-rose-600">{selectedPeriod?.remains.toLocaleString()}</span>
                     </div>

                     {/* Stats: Lend (Clickable) */}
                     <button className="px-3 flex items-center gap-2 hover:bg-white active:bg-slate-50 transition-colors cursor-pointer group">
                        <div className="p-0.5 bg-rose-100 text-rose-600 rounded group-hover:scale-110 transition-transform"><ArrowUpRight className="w-3 h-3" /></div>
                        <span className="text-[10px] font-black text-slate-700 group-hover:text-rose-600 transition-colors">{stats.lend.toLocaleString()}</span>
                     </button>

                     {/* Stats: Repay (Clickable) */}
                     <button className="px-3 flex items-center gap-2 hover:bg-white active:bg-slate-50 transition-colors cursor-pointer group">
                        <div className="p-0.5 bg-emerald-100 text-emerald-600 rounded group-hover:scale-110 transition-transform"><ArrowDownLeft className="w-3 h-3" /></div>
                        <span className="text-[10px] font-black text-slate-700 group-hover:text-emerald-600 transition-colors">{stats.repay.toLocaleString()}</span>
                     </button>

                     {/* Stats: Cashback (Clickable) */}
                     <button className="px-3 flex items-center gap-2 hover:bg-white active:bg-slate-50 transition-colors cursor-pointer group">
                        <div className="p-0.5 bg-amber-100 text-amber-600 rounded group-hover:scale-110 transition-transform"><Percent className="w-3 h-3" /></div>
                        <span className="text-[10px] font-black text-slate-700 group-hover:text-amber-600 transition-colors">{stats.cashback.toLocaleString()}</span>
                     </button>

                     {/* Stats: Paid (Clickable) */}
                     <button className="px-3 flex items-center gap-2 hover:bg-white active:bg-slate-50 transition-colors cursor-pointer group">
                        <span className="text-[10px] font-black text-slate-700 group-hover:text-indigo-600 transition-colors">{stats.paidCount}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                     </button>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center gap-2 shrink-0">
                   <button className="h-11 px-4 flex items-center gap-1.5 bg-white text-slate-500 border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm whitespace-nowrap">
                      <RefreshCcw className="w-3.5 h-3.5" /> Rollover
                   </button>
                   <button className="h-11 px-4 flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-100/60 rounded-xl text-[10px] font-black uppercase hover:bg-rose-100 transition-all shadow-sm whitespace-nowrap">
                      <ArrowDown className="w-3.5 h-3.5" /> Debt
                   </button>
                   <button className="h-11 px-4 flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100/60 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-all shadow-sm whitespace-nowrap">
                      <Plus className="w-3.5 h-3.5" /> Repay
                   </button>
                   <button className="h-11 px-4 flex items-center gap-1.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm whitespace-nowrap">
                      <FileText className="w-3.5 h-3.5" /> Sheet
                   </button>

                   {/* Search Bar - Moved to End */}
                   <div className="relative group w-48 ml-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
                      <input 
                        type="text" 
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-slate-400"
                      />
                   </div>
                </div>
             </div>

             {/* TABLE AREA */}
             <div className="flex-grow overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-8 py-4 bg-slate-50/50">Time</th>
                      <th className="px-8 py-4 bg-slate-50/50">Activity</th>
                      <th className="px-8 py-4 bg-slate-50/50 text-right">Value</th>
                      <th className="px-8 py-4 bg-slate-50/50 text-center">Opt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(selectedPeriod?.transactions || []).length > 0 ? (
                      (selectedPeriod?.transactions || []).map((t) => (
                        <tr key={t.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-4 whitespace-nowrap">
                            <div className="text-[11px] font-black text-slate-800">{t.date}</div>
                            <div className="text-[8px] text-slate-300 font-bold uppercase tracking-tight">{t.time}</div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-9 h-9 bg-white border border-slate-100 rounded-xl flex items-center justify-center p-1.5 shrink-0 shadow-sm">
                                {t.sourceIcon ? (
                                  <img src={t.sourceIcon} alt="" className="w-full h-full object-contain" />
                                ) : (
                                  <Inbox className="w-4 h-4 text-slate-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-slate-800 truncate max-w-[300px] mb-0.5">{t.note}</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase border border-indigo-100/30">From {t.flowEntity.from}</span>
                                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider">{t.category}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-right">
                             <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[12px] font-black ${t.type === 'Lend' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {t.value.toLocaleString()}
                                  </span>
                                  {t.discount && (
                                    <span className="text-[7px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/40">
                                      {t.discount}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[7px] font-black uppercase text-slate-300 tracking-widest leading-none mt-1">{t.type === 'Lend' ? 'Due' : 'Settled'}</span>
                             </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                           <div className="flex flex-col items-center gap-3 opacity-20">
                              <div className="w-14 h-14 bg-slate-100 rounded-[1.5rem] flex items-center justify-center">
                                <Inbox className="w-7 h-7 text-slate-400" />
                              </div>
                              <div className="text-center">
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">No Records</p>
                                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Start adding transactions</p>
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetailView;
