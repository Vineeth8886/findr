import React from 'react';

interface HeaderProps {
  onViewChange: (view: 'search' | 'vendors' | 'history') => void;
  onHomeClick: () => void;
  activeView: string;
}

const Header: React.FC<HeaderProps> = ({ onViewChange, onHomeClick, activeView }) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 pointer-events-none">
      {/* Full-width Glass Bar: Ensures content scrolls cleanly behind the header */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl border-b border-white/40 shadow-sm" />
      
      <div className="relative max-w-7xl mx-auto py-3 md:py-5 px-4 md:px-8 flex justify-between items-center pointer-events-auto gap-3">
        {/* Brand Identity */}
        <div 
          onClick={onHomeClick}
          className="flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#A8DADC] to-[#457B9D] text-white rounded-[0.7rem] md:rounded-[0.9rem] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform relative">
            <span className="text-sm md:text-xl font-black font-sans">F</span>
            <div className="absolute bottom-1 right-1 md:bottom-1.5 md:right-1.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full shadow-sm ring-1 ring-black/5" />
          </div>
          
          <h1 className="text-lg md:text-xl font-bold tracking-tighter text-slate-900 flex items-baseline">
            Findr<span className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-gradient-to-br from-[#A8DADC] to-[#457B9D] ml-0.5 shadow-sm" />
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 md:gap-2 bg-white/90 p-1 md:p-1.5 rounded-full border border-white/80 shadow-sm">
          {[
            { id: 'search', label: 'Explore' },
            { id: 'vendors', label: 'Network' },
            { id: 'history', label: 'Archives' }
          ].map(link => (
            <button 
              key={link.id}
              onClick={() => onViewChange(link.id as any)}
              className={`px-3 md:px-6 py-1.5 md:py-2.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                ${activeView === link.id ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-500 hover:text-slate-950'}
              `}
            >
              {link.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;