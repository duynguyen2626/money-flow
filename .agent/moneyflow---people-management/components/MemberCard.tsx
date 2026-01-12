
import React from 'react';
import { Member, ServiceType } from '../types';
import { 
  Youtube, 
  Cloud, 
  Tv, 
  Music, 
  Edit2,
  Calendar,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight
} from 'lucide-react';

interface MemberCardProps {
  member: Member;
  onViewDetails?: (member: Member) => void;
}

const ServiceIcon: React.FC<{ type: ServiceType }> = ({ type }) => {
  switch (type) {
    case 'Youtube': return <Youtube className="w-3 h-3 text-red-500" />;
    case 'iCloud': return <Cloud className="w-3 h-3 text-blue-500" />;
    case 'Netflix': return <Tv className="w-3 h-3 text-slate-500" />;
    case 'Spotify': return <Music className="w-3 h-3 text-green-500" />;
    default: return null;
  }
};

const MemberCard: React.FC<MemberCardProps> = ({ member, onViewDetails }) => {
  const formatPeriod = (p: string) => {
    const parts = p.split(' ');
    return `${parts[0]} '${parts[1]}`;
  };

  return (
    <div className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/40 transition-all duration-500 p-4 flex flex-col gap-4 relative overflow-hidden h-full min-h-[240px]">
      
      {/* 1. Header: Identity */}
      <div className="flex justify-between items-start shrink-0">
        <div className="flex gap-3 items-center min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[11px] border border-indigo-100/50 shrink-0 shadow-sm">
            {member.initials}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 text-[14px] leading-none mb-1.5 truncate">{member.name}</h3>
            <div className="flex gap-1.5">
              {member.services.map((s, idx) => (
                <div key={idx} className="shrink-0 p-1 bg-slate-50 rounded-md border border-slate-100" title={`${s.type}: ${s.count}`}>
                   <ServiceIcon type={s.type} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <button className="p-1.5 text-slate-200 hover:text-slate-400 hover:bg-slate-50 rounded-lg transition-all">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Debt Insight Box: Integrated Info */}
      <div className="flex-grow flex flex-col justify-between bg-slate-50/50 rounded-[1.5rem] border border-slate-100 p-3.5 relative group-hover:bg-white group-hover:border-indigo-100 transition-colors">
        
        {/* Top line: Period context */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-100 shadow-sm">
            <Calendar className="w-3 h-3 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{formatPeriod(member.currentDebt.month)}</span>
          </div>
          {member.extraPeriodsCount > 0 && (
            <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 uppercase animate-pulse">
              +{member.extraPeriodsCount} months
            </span>
          )}
        </div>

        {/* Main: Balance */}
        <div className="my-2">
          <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.2em] block mb-1 leading-none">Remains</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-rose-600 leading-none tracking-tighter">
              {member.currentDebt.remains.toLocaleString()}
            </span>
            <span className="text-[10px] font-black text-slate-300">đ</span>
          </div>
        </div>

        {/* Bottom line: Lend/Repay Icons (No text, with Tooltips) */}
        <div className="flex items-center gap-4 pt-3 border-t border-slate-200/40">
           <div className="flex items-center gap-1.5 group/tip cursor-help" title="Total Lend (Nợ phát sinh)">
              <div className="p-1 bg-rose-50 text-rose-500 rounded-md group-hover/tip:bg-rose-100 transition-colors">
                <ArrowUpRight className="w-3 h-3" />
              </div>
              <span className="text-[10px] font-black text-slate-500">{member.currentDebt.total.toLocaleString()}</span>
           </div>
           <div className="flex items-center gap-1.5 group/tip cursor-help" title="Total Repay (Đã trả)">
              <div className="p-1 bg-emerald-50 text-emerald-600 rounded-md group-hover/tip:bg-emerald-100 transition-colors">
                <ArrowDownLeft className="w-3 h-3" />
              </div>
              <span className="text-[10px] font-black text-slate-500">{member.currentDebt.paid.toLocaleString()}</span>
           </div>
        </div>
      </div>

      {/* 3. Actions: Quick Settle & Entry */}
      <div className="flex gap-2 shrink-0">
        <button 
          onClick={() => onViewDetails?.(member)}
          className="flex-grow flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 group/btn"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 group-hover/btn:scale-110 transition-transform" />
          <span className="text-[9px] font-black uppercase tracking-[0.1em]">Quick Settle</span>
        </button>
        <button 
          onClick={() => onViewDetails?.(member)}
          className="w-12 flex items-center justify-center bg-white border-2 border-slate-100 text-slate-400 rounded-2xl hover:border-indigo-500 hover:text-indigo-600 transition-all active:scale-95"
          title="Open Details"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default MemberCard;
