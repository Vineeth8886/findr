
import React, { useState, useMemo } from 'react';
import { ProductResult } from '../types';

interface CommissionViewProps {
  results: ProductResult[];
}

const CommissionView: React.FC<CommissionViewProps> = ({ results }) => {
  const [rate, setRate] = useState(3.5); // Default 3.5%

  const totals = useMemo(() => {
    let totalValue = 0;
    results.forEach(r => {
      const price = r.vendors?.[0]?.numericPrice || 0;
      totalValue += price * (r.quantity || 0);
      r.ancillaryItems?.forEach(a => totalValue += a.total);
    });
    const commission = Math.floor(totalValue * (rate / 100));
    return { totalValue, commission };
  }, [results, rate]);

  const fmt = (v: number) => v.toLocaleString('en-IN');

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700 px-0 md:px-2">
       <div className="bg-[#0F172A] rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden mb-8 md:mb-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#F59E0B] to-transparent opacity-10 blur-[120px] rounded-full -mr-32 -mt-32" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-10">
             <div className="space-y-4 w-full">
                <div className="flex items-center gap-3 mb-2">
                   <span className="px-3 py-1 bg-[#F59E0B] text-[#0F172A] rounded-full text-[9px] font-black uppercase tracking-widest">Partner Program</span>
                   <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest hidden md:inline">Commission Maker</span>
                </div>
                <h2 className="text-5xl md:text-7xl font-black tracking-tightest">
                   ₹{fmt(totals.commission)}
                </h2>
                <p className="text-slate-400 font-medium text-sm md:text-base max-w-sm">
                   Projected earnings based on current verified asset manifest. Payouts processed upon vendor invoice clearance.
                </p>
             </div>
             
             <div className="bg-white/5 border border-white/10 rounded-3xl p-6 w-full md:w-80 backdrop-blur-sm">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                   <span>Rate</span>
                   <span>{rate}%</span>
                </div>
                <input 
                  type="range" 
                  min="2" max="5" step="0.5" 
                  value={rate} 
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#F59E0B]"
                />
                <div className="flex justify-between text-[9px] font-bold text-slate-500 mt-2">
                   <span>2%</span>
                   <span>5%</span>
                </div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
          <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 border border-slate-100 shadow-xl">
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Income Projection</h3>
             <div className="space-y-6">
                <div className="flex justify-between items-center py-4 border-b border-slate-50">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Project Value</div>
                   <div className="text-lg md:text-xl font-black text-slate-900">₹{fmt(totals.totalValue)}</div>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-slate-50">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Vendors</div>
                   <div className="text-lg md:text-xl font-black text-slate-900">{results.length}</div>
                </div>
                <div className="flex justify-between items-center py-4">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Annual Run Rate (Est.)</div>
                   <div className="text-lg md:text-xl font-black text-emerald-600">₹{fmt(totals.commission * 12)}</div>
                </div>
             </div>
          </div>
          
          <div className="bg-emerald-50 rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 border border-emerald-100 flex flex-col justify-center items-center text-center space-y-6">
             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-lg">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
             </div>
             <div>
                <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tight">Active & Eligible</h3>
                <p className="text-sm text-emerald-700 mt-2 font-medium">Your account is verified for direct B2B commission payouts.</p>
             </div>
             <button className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">
                Track Payment
             </button>
          </div>
       </div>

       {/* Shared BOQ Manifest Table - Mobile Scrollable */}
       <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-xl overflow-hidden">
          <div className="flex items-center gap-4 mb-6 md:mb-8">
             <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900 shrink-0">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
             </div>
             <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">Active BOQ Manifest</h3>
          </div>
          
          <div className="overflow-x-auto pb-2">
             <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                   <tr className="border-b-2 border-slate-100">
                      <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Asset</th>
                      <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Vendor Node</th>
                      <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Qty</th>
                      <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Value</th>
                   </tr>
                </thead>
                <tbody>
                   {results.map((r, i) => {
                      const val = (r.vendors?.[0]?.numericPrice || 0) * r.quantity;
                      return (
                         <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 pr-4">
                               <div className="font-bold text-slate-900 text-sm">{r.productName}</div>
                               <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{r.description}</div>
                            </td>
                            <td className="py-4">
                               <span className="px-2 py-1 bg-slate-100 rounded-md text-[9px] font-bold text-slate-600 uppercase tracking-wide">
                                  {r.vendors?.[0]?.vendor || "Sourcing..."}
                               </span>
                            </td>
                            <td className="py-4 text-right font-medium text-slate-700">{r.quantity}</td>
                            <td className="py-4 text-right font-black text-slate-900">₹{fmt(val)}</td>
                         </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
};

export default CommissionView;
