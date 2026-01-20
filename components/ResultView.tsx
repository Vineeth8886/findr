
import React, { useState } from 'react';
import { ProductResult, SortField, SortOrder, VendorOption, ViewMode, ProductTier } from '../types';
import BOQTable from './BOQTable';

interface ResultViewProps {
  results: ProductResult[];
  sourceImage?: string;
  onUpdateQuantity: (id: string, qty: number) => void;
  locationName?: string;
  isDevMode?: boolean;
}

const ResultView: React.FC<ResultViewProps> = ({ results, sourceImage, onUpdateQuantity, locationName, isDevMode }) => {
  const [sortBy, setSortBy] = useState<SortField>('price');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('boq');

  const getTierBadge = (tier: ProductTier) => {
    const styles = { 'Luxury': 'bg-amber-500 text-white', 'Premium': 'bg-slate-950 text-white', 'Standard': 'bg-[#457B9D] text-white', 'Budget': 'bg-emerald-600 text-white' };
    return styles[tier] || 'bg-slate-500';
  };

  const sortVendors = (vendors: VendorOption[]) => {
    if (!Array.isArray(vendors)) return [];
    return [...vendors].sort((a, b) => {
      let valA = sortBy === 'price' ? a.numericPrice : (a.daysToDelivery || 99);
      let valB = sortBy === 'price' ? b.numericPrice : (b.daysToDelivery || 99);
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  };

  return (
    <div className="space-y-16 pb-20 px-2">
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-3xl p-8 rounded-[2rem] border border-white shadow-2xl sticky top-28 z-40">
        <div className="flex flex-col">
           <h3 className="text-2xl font-black text-slate-900 tracking-tight">Procurement Hub</h3>
           <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Grounding {results.length} Industrial Assets</p>
        </div>
        <div className="flex gap-3">
          <div className="hidden md:flex bg-slate-100 p-1.5 rounded-full border border-slate-200">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/></svg>
            </button>
            <button onClick={() => setViewMode('boq')} className={`px-6 py-2.5 rounded-full transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${viewMode === 'boq' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400'}`}>
              Project Manifest
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'boq' ? (
        <BOQTable results={results} sourceImage={sourceImage} onUpdateQuantity={onUpdateQuantity} locationName={locationName} />
      ) : (
        results.map((product, pIdx) => {
          const vendors = sortVendors(product.vendors);
          return (
            <div key={pIdx} className="space-y-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getTierBadge(product.tier)} shadow-xl`}>{product.tier}</span>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">{product.productName}</h2>
                </div>
                {isDevMode && (
                   <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-[8px] font-mono font-black uppercase">
                     SCAN_CONF: {product.scanConfidence}%
                   </div>
                )}
              </div>
              
              {isDevMode && (
                <div className="p-6 bg-slate-900 text-blue-300 rounded-[2.5rem] border-2 border-blue-500/20 font-mono text-[9px] overflow-auto max-h-[150px]">
                   <h4 className="text-white font-black mb-2">Dev Debug: Result Object</h4>
                   <pre>{JSON.stringify(product, null, 2)}</pre>
                </div>
              )}

              <div className="bg-slate-950 text-white rounded-[3rem] p-10 shadow-2xl flex flex-col md:flex-row gap-10">
                 <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                 </div>
                 <div className="flex-1">
                    <p className="text-[10px] font-black text-[#A8DADC] uppercase tracking-[0.25em] mb-2">Neural Sourcing Analysis</p>
                    <p className="text-xl font-medium italic text-slate-200">"{product.researchNote}"</p>
                    <div className="mt-6 flex flex-wrap gap-2 pt-6 border-t border-white/5">
                      {product.groundingSources.map((s, si) => (
                        <a key={si} href={s.uri} target="_blank" className="text-[9px] font-bold text-[#A8DADC] border border-[#A8DADC]/20 px-3 py-1.5 rounded-lg hover:bg-white/5 truncate max-w-[200px]">{s.title}</a>
                      ))}
                    </div>
                 </div>
              </div>

              {vendors.length > 0 ? (
                <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
                  {vendors.map((v, vi) => (
                    <div key={vi} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                          {v.isManufacturer && <span className="bg-blue-100 text-blue-700 text-[7px] font-black uppercase px-2 py-1 rounded">Manufacturer</span>}
                          <h4 className="text-xl font-black text-slate-900 leading-none">{v.vendor}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-slate-950 tracking-tighter">{v.price}</span>
                          <span className="block text-[8px] font-black text-slate-400 uppercase">{v.unit}</span>
                        </div>
                      </div>
                      <div className="space-y-4 pt-6 border-t border-slate-50 flex-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-400 uppercase tracking-widest">B2B Trust Score</span>
                          <span className="text-emerald-600">Verified • {v.reliabilityScore}/5.0</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-400 uppercase tracking-widest">MOQ</span>
                          <span className="text-slate-900">{v.moq || '1 Unit'}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-400 uppercase tracking-widest">Price Range</span>
                          <span className="text-blue-600 font-black">{v.priceRange || 'Fixed'}</span>
                        </div>
                        {isDevMode && (
                           <div className="pt-2 mt-2 border-t border-dashed border-slate-200 text-[7px] font-mono text-slate-400">
                             GST: {v.gstNumber || 'NONE'} ({v.gstStatus})<br/>
                             CONTACT: {v.contactPhone || 'NONE'}
                           </div>
                        )}
                      </div>
                      <a href={v.url} target="_blank" className="mt-8 py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black text-center uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">Request Formal Quote</a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/40 rounded-[3rem] p-16 text-center border-2 border-dashed border-white shadow-2xl">
                   <h4 className="text-2xl font-black text-slate-900 tracking-tighter">Zero Regional Matches Detected</h4>
                   <p className="text-slate-500 mt-2 max-w-sm mx-auto font-medium">No B2B manufacturer listings found for Pincode {locationName}. Triggering global partner network RFQ.</p>
                   <button className="mt-8 px-10 py-4 bg-slate-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-600 transition-all">Request Offline Sourcing</button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default ResultView;
