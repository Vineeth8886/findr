
import React from 'react';
import { NegotiationStrategy } from '../types';

interface NegotiationModalProps {
  strategy: NegotiationStrategy;
  productName: string;
  vendorName: string;
  onClose: () => void;
}

const NegotiationModal: React.FC<NegotiationModalProps> = ({ strategy, productName, vendorName, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
        
        {/* Sidebar */}
        <div className="bg-[#0F172A] text-white p-8 md:p-10 md:w-1/3 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B]/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-[#F59E0B] rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F59E0B]">Negotiation Coach</span>
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight leading-tight mb-2">{vendorName}</h3>
            <p className="text-xs font-medium text-slate-400 mb-8">{productName}</p>
            
            <div className="space-y-6">
               <div>
                 <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Target Price</div>
                 <div className="text-3xl font-black text-white">₹{strategy.targetPrice.toLocaleString('en-IN')}</div>
               </div>
               <div>
                 <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Opening Offer</div>
                 <div className="text-xl font-black text-emerald-400">₹{strategy.openingOffer.toLocaleString('en-IN')}</div>
               </div>
               <div>
                 <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Potential Savings</div>
                 <div className="text-xl font-black text-[#F59E0B]">₹{strategy.savings.toLocaleString('en-IN')}</div>
               </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-[9px] font-medium text-slate-400 italic">"{strategy.vendorPsychology}"</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-10 md:w-2/3 bg-white">
          <div className="space-y-8">
            <div>
               <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                 Talking Points (Copy/Paste)
               </h4>
               <ul className="space-y-3">
                 {strategy.talkingPoints.map((point, i) => (
                   <li key={i} className="bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-600 border border-slate-100 flex gap-3">
                     <span className="text-[#F59E0B] font-bold">{i+1}.</span> {point}
                   </li>
                 ))}
               </ul>
            </div>

            <div>
               <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                 Leverage Points
               </h4>
               <div className="flex flex-wrap gap-2">
                 {strategy.leverage.map((lev, i) => (
                   <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold uppercase tracking-wide border border-blue-100">
                     {lev}
                   </span>
                 ))}
               </div>
            </div>
          </div>
          
          <button onClick={onClose} className="w-full mt-10 py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
            Close Strategy
          </button>
        </div>

      </div>
    </div>
  );
};

export default NegotiationModal;
