
import React, { useState } from 'react';
import { ProductResult, SortField, SortOrder, VendorOption, ViewMode, ProductTier } from '../types';
import BOQTable from './BOQTable';

interface ResultViewProps {
  results: ProductResult[];
  sourceImage?: string;
  onUpdateQuantity: (id: string, qty: number) => void;
  locationName?: string;
  isDevMode?: boolean;
  onReset: () => void;
  onAutoComplete: () => void;
  isCompleting: boolean;
}

const ResultView: React.FC<ResultViewProps> = ({ results, sourceImage, onUpdateQuantity, locationName, isDevMode, onReset, onAutoComplete, isCompleting }) => {
  const [sortBy, setSortBy] = useState<SortField>('price');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('boq');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const getTierBadge = (tier: ProductTier) => {
    const styles = { 
      'Luxury': 'bg-amber-500 text-white', 
      'Premium': 'bg-[#0F172A] text-white border border-white/10', 
      'Standard': 'bg-blue-600 text-white', 
      'Budget': 'bg-emerald-600 text-white' 
    };
    return styles[tier] || 'bg-slate-500';
  };

  const toggleNote = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    <div className="space-y-16 pb-32 px-2">
      {/* View Mode Toggle Only (Manifest Summary Moved to Bottom Unified Bar) */}
      <div className="no-print flex justify-end bg-white/50 backdrop-blur-xl p-4 rounded-3xl border border-slate-100 shadow-sm sticky top-28 z-40">
        <div className="bg-slate-100 p-1 rounded-full border border-slate-200 flex items-center">
          <button 
            onClick={() => setViewMode('grid')} 
            className={`px-6 py-2 rounded-full transition-all text-[9px] font-black uppercase tracking-widest ${viewMode === 'grid' ? 'bg-white shadow-md text-[#0F172A]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Vendor Grid
          </button>
          <button 
            onClick={() => setViewMode('boq')} 
            className={`px-6 py-2 rounded-full transition-all text-[9px] font-black uppercase tracking-widest ${viewMode === 'boq' ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Project Manifest
          </button>
        </div>
      </div>

      {viewMode === 'boq' ? (
        <BOQTable 
          results={results} 
          sourceImage={sourceImage} 
          onUpdateQuantity={onUpdateQuantity} 
          locationName={locationName} 
          onReset={onReset}
          onAutoComplete={onAutoComplete}
          isCompleting={isCompleting}
        />
      ) : (
        results.map((product, pIdx) => {
          const vendors = sortVendors(product.vendors);
          const isNoteExpanded = expandedNotes.has(product.id);

          return (
            <div key={product.id} className="space-y-8 animate-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${pIdx * 100}ms` }}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getTierBadge(product.tier)} shadow-lg`}>{product.tier}</span>
                  <h2 className="text-3xl md:text-5xl font-black text-[#0F172A] tracking-tighter">{product.productName}</h2>
                </div>
              </div>

              <div className="bg-[#0F172A] text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group border border-white/5">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B]/5 rounded-full blur-[100px] -mr-20 -mt-20" />
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                      <p className="text-[10px] font-black text-[#F59E0B] uppercase tracking-[0.25em] animate-in fade-in duration-1000">Neural Sourcing Analysis</p>
                    </div>
                    <p className={`text-lg md:text-xl font-medium italic text-slate-200 transition-all duration-500 ${!isNoteExpanded ? 'line-clamp-2' : ''}`}>
                      "{product.researchNote}"
                    </p>
                    {product.researchNote.length > 150 && (
                      <button onClick={() => toggleNote(product.id)} className="mt-3 text-[9px] font-black uppercase tracking-widest text-[#F59E0B] hover:text-white transition-colors">
                        {isNoteExpanded ? 'Read Less' : 'Read Full Synthesis'}
                      </button>
                    )}
                 </div>
              </div>

              {vendors.length > 0 ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {vendors.map((v, vi) => (
                    <div key={vi} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col group hover:border-[#F59E0B]/30 hover:shadow-2xl transition-all duration-500">
                      <div className="flex flex-col gap-4 mb-6">
                        <div className="flex items-center justify-between gap-2">
                           <div className="flex items-center gap-2">
                              {v.isManufacturer && <span className="bg-[#0F172A] text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-md shrink-0">OEM</span>}
                              <span className="text-emerald-600 text-[8px] font-black uppercase whitespace-nowrap">Verified Node</span>
                           </div>
                           <div className="text-right">
                              <span className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tighter whitespace-nowrap">{v.price}</span>
                              <span className="block text-[8px] font-black text-slate-400 uppercase mt-0.5">per {v.unit}</span>
                           </div>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xl font-black text-[#0F172A] leading-tight line-clamp-2">{v.vendor}</h4>
                          <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{v.address}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 py-6 border-y border-slate-50 mb-6 mt-auto">
                        <div className="space-y-1 overflow-hidden">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Contact Node</label>
                          <div className="text-[10px] font-bold text-[#0F172A] truncate">{v.contactPhone || 'Unlisted'}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Trust Score</label>
                          <div className="text-[10px] font-black text-emerald-600">{v.reliabilityScore}/5.0</div>
                        </div>
                      </div>
                      <button onClick={() => window.open(v.url, '_blank')} className="w-full py-4 bg-[#0F172A] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl group-hover:bg-[#F59E0B] transition-all transform active:scale-95">
                        Request Quote
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-[3rem] p-16 text-center border-2 border-dashed border-slate-200">
                   <h4 className="text-2xl font-black text-[#0F172A] tracking-tighter">Regional Supply Gap</h4>
                   <p className="text-slate-500 mt-2 max-w-sm mx-auto font-medium text-sm">No direct nodes detected for Pincode {locationName}.</p>
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
