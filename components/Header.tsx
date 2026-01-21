
import React from 'react';

interface HeaderProps {
  onViewChange: (view: 'search' | 'vendors' | 'commissions') => void;
  onHomeClick: () => void;
  activeView: string;
  isDevMode: boolean;
  onDevModeToggle: (val: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ onViewChange, onHomeClick, activeView, isDevMode, onDevModeToggle }) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300">
      {/* Premium Glass Bar */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-3xl border-b border-slate-100 pointer-events-none shadow-sm" />
      
      <div className="relative max-w-[1400px] mx-auto h-[72px] md:h-[88px] px-4 md:px-8 flex items-center justify-between gap-4">
        
        {/* Brand Identity - Fixed Left */}
        <div 
          onClick={onHomeClick}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 md:w-10 md:h-10 bg-[#0F172A] text-white rounded-[0.8rem] md:rounded-[0.9rem] flex items-center justify-center shadow-lg group-hover:bg-[#F59E0B] transition-all relative overflow-hidden">
            <span className="text-lg md:text-xl font-black font-sans relative z-10">F</span>
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-[#F59E0B] rounded-full shadow-sm group-hover:bg-white transition-all" />
          </div>
          
          <h1 className="text-lg md:text-xl font-black tracking-tightest text-[#0F172A] flex items-baseline">
            Findr<span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#F59E0B] ml-1 shadow-sm" />
          </h1>
        </div>

        {/* Navigation & Actions - Scrollable Right */}
        <div className="flex-1 flex items-center justify-end overflow-x-auto no-scrollbar pl-2">
            <div className="flex items-center gap-3 md:gap-6 pr-1">
                {/* Mobile Dev Toggle */}
                <div className="flex md:hidden items-center">
                    <button 
                    onClick={() => onDevModeToggle(!isDevMode)}
                    className={`w-8 h-4 rounded-full transition-all relative border border-transparent shadow-inner ${isDevMode ? 'bg-[#F59E0B]' : 'bg-slate-200'}`}
                    >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${isDevMode ? 'left-[18px]' : 'left-0.5'}`} />
                    </button>
                </div>

                {/* Main Navigation Pills */}
                <nav className="flex items-center gap-1 bg-slate-50/80 p-1 rounded-full border border-slate-200/60 backdrop-blur-sm">
                    {[
                    { id: 'search', label: 'Explore' },
                    { id: 'vendors', label: 'Network' },
                    { id: 'commissions', label: 'Commissions' }
                    ].map(link => (
                    <button 
                        key={link.id}
                        onClick={() => onViewChange(link.id as any)}
                        className={`px-4 md:px-6 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap select-none
                        ${activeView === link.id ? 'bg-[#0F172A] text-white shadow-md transform scale-105' : 'text-slate-500 hover:text-[#0F172A] hover:bg-white'}
                        `}
                    >
                        {link.label}
                    </button>
                    ))}
                </nav>

                {/* Desktop Dev Toggle */}
                <div className="hidden md:flex items-center gap-3 border-l border-slate-200 pl-6">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Dev Mode</span>
                    <button 
                    onClick={() => onDevModeToggle(!isDevMode)}
                    className={`w-10 h-5 rounded-full transition-all relative border border-transparent shadow-inner cursor-pointer ${isDevMode ? 'bg-[#F59E0B]' : 'bg-slate-200'}`}
                    >
                    <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${isDevMode ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                </div>
            </div>
        </div>

      </div>
    </header>
  );
};

export default Header;
