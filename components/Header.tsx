
import React from 'react';

interface HeaderProps {
  onViewChange: (view: 'search' | 'vendors' | 'history') => void;
  onHomeClick: () => void;
  activeView: string;
  isDevMode: boolean;
  onDevModeToggle: (val: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ onViewChange, onHomeClick, activeView, isDevMode, onDevModeToggle }) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50">
      {/* Premium Glass Bar */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-3xl border-b border-slate-100 pointer-events-none" />
      
      <div className="relative max-w-[1400px] mx-auto py-5 px-8 flex justify-between items-center gap-3">
        {/* Brand Identity */}
        <div 
          onClick={onHomeClick}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 bg-[#0F172A] text-white rounded-[0.9rem] flex items-center justify-center shadow-lg group-hover:bg-[#F59E0B] transition-all relative overflow-hidden">
            <span className="text-xl font-black font-sans relative z-10">F</span>
            <div className="absolute bottom-1 right-1 w-2 h-2 bg-[#F59E0B] rounded-full shadow-sm group-hover:bg-white transition-all" />
          </div>
          
          <h1 className="text-xl font-black tracking-tightest text-[#0F172A] flex items-baseline">
            Findr<span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] ml-1 shadow-sm" />
          </h1>
        </div>

        {/* Navigation & Dev Toggle */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 mr-4">
            <span className="hidden sm:inline text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Dev Mode</span>
            <button 
              onClick={() => onDevModeToggle(!isDevMode)}
              className={`w-10 h-5 rounded-full transition-all relative border border-transparent shadow-inner ${isDevMode ? 'bg-[#F59E0B]' : 'bg-slate-200'}`}
              aria-label="Toggle Developer Mode"
            >
              <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all shadow-sm ${isDevMode ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          <nav className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-100">
            {[
              { id: 'search', label: 'Explore' },
              { id: 'vendors', label: 'Network' },
              { id: 'history', label: 'Archives' }
            ].map(link => (
              <button 
                key={link.id}
                onClick={() => onViewChange(link.id as any)}
                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all whitespace-nowrap
                  ${activeView === link.id ? 'bg-[#0F172A] text-white shadow-xl' : 'text-slate-500 hover:text-[#0F172A]'}
                `}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;