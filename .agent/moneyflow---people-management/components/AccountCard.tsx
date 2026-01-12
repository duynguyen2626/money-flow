
import React, { useState } from 'react';
import { Account } from '../types';
import { 
  Wallet, 
  MinusCircle, 
  PlusCircle, 
  History,
  Edit2,
  Layers,
  GitBranch,
  Info,
  TrendingDown,
  Percent,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface AccountCardProps {
  account: Account;
  isGrouped?: boolean;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, isGrouped }) => {
  const [showRewardTooltip, setShowRewardTooltip] = useState(false);
  const isUrgent = account.status === 'urgent';
  const isWarning = account.status === 'warning';

  const borderColor = isUrgent ? 'border-red-500' : isWarning ? 'border-amber-400' : 'border-slate-100';
  const statusBadgeColor = isUrgent ? 'bg-red-50 text-red-600' : isWarning ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500';
  
  const limitUsage = account.limit ? Math.min(Math.round(((account.limit - account.balance) / account.limit) * 100), 100) : 0;
  
  const spentProgress = account.needToSpend > 0 
    ? Math.min(Math.round((account.spent / account.needToSpend) * 100), 100) 
    : 0;

  return (
    <div className={`relative h-full ${isGrouped ? 'bg-indigo-50/40 shadow-indigo-100/5' : 'bg-white'} rounded-3xl border-2 ${borderColor} shadow-sm hover:shadow-xl transition-all duration-500 p-5 flex flex-col gap-4 overflow-hidden group/card`}>
      
      {/* 1. TOP HEADER */}
      <div className="flex justify-between items-center h-6">
        <div className="flex items-center gap-2">
          {account.daysLeft && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${statusBadgeColor}`}>
              <span className={`w-1 h-1 rounded-full ${isUrgent ? 'bg-red-600 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
              {account.daysLeft} DAYS
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {account.isSecured ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-tight border border-emerald-100/50">
              <ShieldCheck className="w-2.5 h-2.5" />
              Secured
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-400 rounded-lg text-[8px] font-black uppercase tracking-tight border border-slate-200">
              <ShieldAlert className="w-2.5 h-2.5" />
              Unsecured
            </div>
          )}
          <button className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN INFO AREA */}
      <div className="flex gap-4 items-start">
        {/* Card Visual */}
        <div className="w-[84px] h-[110px] shrink-0 rounded-2xl bg-[#0f172a] p-3 flex flex-col justify-between shadow-lg relative overflow-hidden ring-1 ring-white/10 group-hover/card:scale-105 transition-transform duration-500">
           <div className="flex justify-between items-start z-10">
             <div className="w-5 h-3.5 bg-gradient-to-br from-amber-300 to-amber-500 rounded-sm shadow-inner opacity-90"></div>
             <div className="text-[5px] font-black text-white/30 tracking-[0.2em] uppercase">{account.type}</div>
           </div>
           <div className="z-10 mt-auto">
             <div className="text-[7px] font-mono text-white/40 tracking-wider">**** 4242</div>
             <div className="text-[8px] font-black text-white/90 uppercase truncate mt-1">{account.name}</div>
           </div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-indigo-500/10 rounded-full blur-2xl"></div>
        </div>

        {/* Info Content */}
        <div className="flex-grow flex flex-col min-w-0 min-h-[110px] justify-between py-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black text-slate-800 text-[14px] truncate tracking-tight uppercase leading-none">{account.name}</h3>
              {account.role && (
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${account.role === 'Parent' ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-slate-50 border-slate-100 text-indigo-600'}`}>
                  {account.role === 'Parent' ? <Layers className="w-2.5 h-2.5" /> : <GitBranch className="w-2.5 h-2.5" />}
                  <span className="text-[8px] font-black uppercase">{account.role}</span>
                </div>
              )}
            </div>
            <div className="text-xl font-black text-indigo-950 tracking-tighter leading-none mb-3 truncate">
              {account.balance.toLocaleString()}<span className="text-xs font-bold ml-1 text-slate-300">đ</span>
            </div>
          </div>

          {/* Need/Spent Block - High Contrast & Organized with Divider */}
          <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.1em] text-slate-400 border-b border-slate-200/50 pb-1.5 mb-0.5">
              <Calendar className="w-2.5 h-2.5 opacity-60" /> 
              <span className="truncate">{account.billingCycle || 'Standard Cycle'}</span>
            </div>
            <div className="grid grid-cols-2 gap-0 divide-x divide-slate-200">
              <div className="pr-2 flex flex-col min-w-0">
                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-0.5">Need <TrendingDown className="w-1.5 h-1.5" /></span>
                <span className="text-[10px] text-slate-800 font-black truncate">{account.needToSpend > 0 ? account.needToSpend.toLocaleString() : '---'}</span>
              </div>
              <div className="pl-3 flex flex-col min-w-0">
                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Spent</span>
                <span className="text-[10px] text-slate-800 font-black truncate">{account.spent.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. UNIFIED FEATURE ZONE */}
      <div className="min-h-[44px] flex flex-col justify-center">
        {account.rewardRules ? (
          <div className="bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-100/60 flex items-center justify-between relative group/reward">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                <Percent className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-black text-emerald-800 uppercase tracking-tight leading-tight">{account.rewardRules.description}</span>
            </div>
            
            <div className="relative">
              <button 
                onMouseEnter={() => setShowRewardTooltip(true)}
                onMouseLeave={() => setShowRewardTooltip(false)}
                className="p-1.5 text-emerald-400 hover:text-emerald-600 transition-colors bg-white rounded-lg border border-emerald-100 shadow-sm"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showRewardTooltip && (
                <div className="absolute bottom-full right-0 mb-3 w-60 bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 z-[100] animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg"><Percent className="w-3.5 h-3.5 text-emerald-600" /></div>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">Cashback Rules</span>
                  </div>
                  <ul className="space-y-1.5">
                    {account.rewardRules.details.map((d, i) => (
                      <li key={i} className="flex gap-2 text-[9px] font-medium text-slate-600 leading-tight">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0 mt-0.5" />
                        {d}
                      </li>
                    ))}
                  </ul>
                  <div className="absolute -bottom-1 right-2 w-2 h-2 bg-white rotate-45 border-r border-b border-slate-100"></div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-1.5 text-[8px] font-black uppercase tracking-tighter">
              <span className="text-slate-400">Target Completion</span>
              <span className={spentProgress >= 100 ? 'text-emerald-600' : 'text-slate-600'}>{spentProgress}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${spentProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                style={{ width: `${spentProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* 4. LIMIT BAR */}
      <div className="space-y-1.5 mt-auto">
        <div className="flex justify-between items-center px-1">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Wallet className="w-2.5 h-2.5 opacity-30" />
            LIMIT: {account.limit?.toLocaleString()}đ
          </span>
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${limitUsage > 80 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>{limitUsage}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-[1px]">
          <div 
            className={`h-full transition-all duration-1000 rounded-full ${limitUsage > 80 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-slate-900'}`} 
            style={{ width: `${limitUsage}%` }}
          ></div>
        </div>
      </div>

      {/* 5. ACTION BAR */}
      <div className="grid grid-cols-4 gap-3 pt-3 border-t border-slate-50">
        <ActionBtn icon={MinusCircle} color="indigo" label="Lend" />
        <ActionBtn icon={PlusCircle} color="emerald" label="Repay" />
        <ActionBtn icon={Wallet} color="amber" label="Pay" />
        <ActionBtn icon={History} color="slate" label="History" />
      </div>
    </div>
  );
};

const ActionBtn = ({ icon: Icon, color, label }: { icon: any, color: string, label: string }) => {
  const styles: any = {
    emerald: 'text-emerald-500 bg-emerald-50 hover:bg-emerald-500 hover:text-white border-emerald-100',
    amber: 'text-amber-500 bg-amber-50 hover:bg-amber-500 hover:text-white border-amber-100',
    indigo: 'text-indigo-500 bg-indigo-50 hover:bg-indigo-500 hover:text-white border-indigo-100',
    slate: 'text-slate-400 bg-slate-50 hover:bg-slate-900 hover:text-white border-slate-200'
  };
  return (
    <button className={`flex items-center justify-center py-2.5 rounded-xl border transition-all duration-300 active:scale-90 shadow-sm ${styles[color]}`} title={label}>
      <Icon className="w-4 h-4" />
    </button>
  );
};

export default AccountCard;
