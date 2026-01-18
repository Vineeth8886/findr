
import React, { useState } from 'react';
import { ProductResult, SortField, SortOrder, VendorOption, ViewMode, ProductTier } from '../types';

interface ResultViewProps {
  results: ProductResult[];
}

const ResultView: React.FC<ResultViewProps> = ({ results }) => {
  const [sortBy, setSortBy] = useState<SortField>('price');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const getTierBadge = (tier: ProductTier) => {
    const styles = {
      'Luxury': 'bg-amber-500 text-white',
      'Premium': 'bg-slate-900 text-white',
      'Standard': 'bg-blue-600 text-white',
      'Budget': 'bg-emerald-600 text-white'
    };
    return styles[tier] || 'bg-slate-500';
  };

  const sortVendors = (vendors: VendorOption[]) => {
    return [...vendors].sort((a, b) => {
      let valA = sortBy === 'price' ? a.numericPrice : (a.daysToDelivery || 99);
      let valB = sortBy === 'price' ? b.numericPrice : (b.daysToDelivery || 99);
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  };

  return (
    <div className="space-y-16 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-3xl p-6 md:p-8 rounded-[2rem] border border-white shadow-2xl sticky top-28 z-40 mx-2">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
             <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Procurement Dashboard</h3>
             <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Comparing regional nodes in real-time.</p>
          </div>
          <div className="hidden md:flex bg-slate-100 p-1 rounded-full border border-slate-200">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/></svg>
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="text-[10px] md:text-[12px] font-black border-slate-100 rounded-xl py-2.5 pl-4 pr-10 bg-slate-50 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer outline-none"
          >
            <option value="price">Priority: Price</option>
            <option value="delivery">Priority: Delivery</option>
          </select>
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}>
              <path d="m7 10 5 5 5-5"/>
            </svg>
          </button>
        </div>
      </div>

      {results.map((product, pIdx) => {
        const sortedVendors = sortVendors(product.vendors);
        const cheapestPrice = Math.min(...product.vendors.map(v => v.numericPrice));
        const fastestDelivery = Math.min(...product.vendors.map(v => v.daysToDelivery || 99));
        
        return (
          <div key={pIdx} className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center gap-4 px-4">
              <span className={`px-3 py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest ${getTierBadge(product.tier)} shadow-lg`}>
                {product.tier}
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">{product.productName}</h2>
            </div>
            
            <div className="bg-slate-950 text-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl border border-white/10 flex flex-col md:flex-row items-start gap-6 md:gap-10 mx-2">
               <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                 <svg width="24" height="24" md-width="32" md-height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
               </div>
               <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">Neural Sourcing Verification</p>
                    <p className="text-base md:text-xl font-medium leading-relaxed italic text-slate-100 opacity-95">"{product.researchNote}"</p>
                  </div>
                  
                  {product.groundingSources.length > 0 && (
                    <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mr-2 py-1">Grounding:</span>
                       {product.groundingSources.map((source, sIdx) => (
                         <a 
                           key={sIdx} 
                           href={source.uri} 
                           target="_blank" 
                           className="text-[8px] font-bold text-blue-400 hover:text-blue-300 border border-blue-400/30 px-2 py-1 rounded-md transition-all truncate max-w-[150px]"
                         >
                           {source.title}
                         </a>
                       ))}
                    </div>
                  )}
               </div>
            </div>

            {sortedVendors.length > 0 ? (
              <div className={viewMode === 'grid' ? "grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mx-2" : "space-y-6 mx-2"}>
                {sortedVendors.map((v, vIdx) => {
                  const isCheapest = v.numericPrice === cheapestPrice;
                  const isFastest = v.daysToDelivery === fastestDelivery;
                  
                  return (
                    <div key={vIdx} className={`bg-white/90 backdrop-blur-xl border rounded-[2rem] p-6 md:p-8 shadow-xl flex flex-col hover:shadow-2xl transition-all relative overflow-hidden group
                      ${isCheapest ? 'border-emerald-500/30' : 'border-white'}
                    `}>
                      {isCheapest && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black uppercase px-4 py-1.5 rounded-bl-xl shadow-lg">
                          Best Price
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-6">
                        <div className="max-w-[70%]">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Distributor</span>
                          <h4 className="text-lg md:text-xl font-black text-slate-900 leading-tight">{v.vendor}</h4>
                        </div>
                        <div className="text-right">
                          <span className={`text-xl md:text-2xl font-black block tracking-tighter ${isCheapest ? 'text-emerald-600' : 'text-slate-950'}`}>{v.price}</span>
                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{v.unit}</span>
                        </div>
                      </div>

                      <div className="space-y-5 flex-1 border-t border-slate-50 pt-6">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1.5">Status</span>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${v.availability?.includes('Stock') ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="text-xs font-bold text-slate-700">{v.availability || 'In Stock'}</span>
                              </div>
                           </div>
                           <div>
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1.5">Lead Time</span>
                              <span className={`text-xs font-bold ${isFastest ? 'text-blue-600' : 'text-slate-700'}`}>
                                {v.deliveryDate || 'Call Hub'}
                              </span>
                           </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-300 shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                           <span className="text-[11px] text-slate-500 font-medium leading-snug">{v.address || 'Verified Regional Distribution Hub'}</span>
                        </div>
                      </div>

                      <div className="mt-6 flex gap-2">
                        <a 
                          href={v.url} target="_blank" rel="noopener noreferrer"
                          className="flex-1 py-4 bg-slate-950 text-white rounded-xl text-[10px] font-black text-center hover:bg-[#457B9D] transition-all uppercase tracking-widest shadow-lg"
                        >
                          Source
                        </a>
                        <button className="px-5 py-4 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-blue-500 transition-all">
                          Quote
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/40 backdrop-blur-xl rounded-[3rem] p-16 text-center border-2 border-dashed border-white mx-2 shadow-2xl">
                 <h4 className="text-2xl font-black text-slate-900 mb-2 tracking-tighter">Inventory Gap</h4>
                 <p className="text-slate-500 text-sm font-medium mb-8 max-w-sm mx-auto">No validated listings detected. Asset might be custom-order only.</p>
                 <a 
                   href={`https://www.google.com/search?q=${encodeURIComponent(product.productName)}+dealers+India`} 
                   target="_blank" 
                   className="px-10 py-4 bg-slate-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl"
                 >
                   Manual Search
                 </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ResultView;
