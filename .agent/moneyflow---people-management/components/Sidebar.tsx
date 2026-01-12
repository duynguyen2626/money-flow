
import React, { useState } from 'react';
import { 
  Users, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Menu,
  ArrowRightLeft
} from 'lucide-react';

interface SidebarProps {
  currentView: 'people' | 'accounts' | 'transactions';
  onViewChange: (view: 'people' | 'accounts' | 'transactions') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside 
      className={`fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50 transition-all duration-300 flex flex-col ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-center border-b border-slate-50 relative shrink-0">
        <div className={`flex items-center gap-3 transition-all ${isExpanded ? 'px-6 w-full' : ''}`}>
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
            <span className="font-black text-lg">M</span>
          </div>
          {isExpanded && (
            <span className="font-black text-slate-800 tracking-tight truncate">MoneyFlow</span>
          )}
        </div>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 transition-colors z-10"
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Content */}
      <nav className="flex-grow py-8 px-3 space-y-4">
        <NavButton 
          icon={Users} 
          label="People" 
          active={currentView === 'people'} 
          isExpanded={isExpanded}
          onClick={() => onViewChange('people')}
        />
        <NavButton 
          icon={CreditCard} 
          label="Accounts" 
          active={currentView === 'accounts'} 
          isExpanded={isExpanded}
          onClick={() => onViewChange('accounts')}
        />
        <NavButton 
          icon={ArrowRightLeft} 
          label="Transactions" 
          active={currentView === 'transactions'} 
          isExpanded={isExpanded}
          onClick={() => onViewChange('transactions')}
        />
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-50 flex items-center justify-center">
        <div className={`flex items-center gap-3 transition-all ${isExpanded ? 'w-full' : ''}`}>
           <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs shrink-0">
             JS
           </div>
           {isExpanded && (
             <div className="min-w-0">
               <p className="text-xs font-black text-slate-900 truncate">John Smith</p>
               <p className="text-[10px] font-bold text-slate-400 truncate">Admin</p>
             </div>
           )}
        </div>
      </div>
    </aside>
  );
};

interface NavButtonProps {
  icon: any;
  label: string;
  active: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

const NavButton = ({ icon: Icon, label, active, isExpanded, onClick }: NavButtonProps) => (
  <button 
    onClick={onClick}
    className={`relative group w-full flex items-center transition-all duration-200 rounded-2xl ${
      active 
        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
    } ${isExpanded ? 'px-4 py-3' : 'justify-center w-14 h-14 mx-auto'}`}
  >
    <Icon className={`w-6 h-6 shrink-0 ${active ? 'text-white' : 'group-hover:text-slate-600'}`} />
    {isExpanded && (
      <span className="ml-3 font-black text-sm uppercase tracking-wider">{label}</span>
    )}
    
    {!isExpanded && (
      <div className="absolute left-16 bg-slate-900 text-white text-[10px] font-black uppercase py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] shadow-xl">
        {label}
      </div>
    )}
  </button>
);

export default Sidebar;
