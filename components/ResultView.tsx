
import React, { useState } from 'react';
import { ProductResult, SortField, SortOrder, VendorOption, ViewMode, ProductTier, NegotiationStrategy } from '../types';
import BOQTable from './BOQTable';
import NegotiationModal from './NegotiationModal';
import { generateNegotiationTactics } from '../services/geminiService';

interface ResultViewProps {
  results: ProductResult[];
  sourceImage?: string;
  onUpdateQuantity: (id: string, qty: number) => void;
  locationName?: string;
  isDevMode?: boolean;
  onReset: () => void;
  onAutoComplete: () => void;
  isCompleting: boolean;
  onUpdateResult?: (id: string, updates: Partial<ProductResult>) => void;
}

const ResultView: React.FC<ResultViewProps> = ({ results, sourceImage, onUpdateQuantity, locationName, isDevMode, onReset, onAutoComplete, isCompleting, onUpdateResult }) => {
  const [sortBy, setSortBy] = useState<SortField>('price');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('boq');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  
  // Negotiation & Outreach State
  const [negotiatingItem, setNegotiatingItem] = useState<{productName: string, vendorName: string, strategy: NegotiationStrategy} | null>(null);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [activeCall, setActiveCall] = useState<string | null>(null);

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

  const handleNegotiate = async (productName: string, vendor: VendorOption, qty: number) => {
    setIsGeneratingStrategy(true);
    try {
      const strategy = await generateNegotiationTactics(productName, vendor.vendor, vendor.numericPrice, qty);
      setNegotiatingItem({ productName, vendorName: vendor.vendor, strategy });
    } catch (e) { console.error(e); }
    finally { setIsGeneratingStrategy(false); }
  };

  const handleGlobalNegotiate = () => {
    let maxVal = 0;
    let targetItem = null;
    let targetVendor = null;

    results.forEach(r => {
        const v = r.vendors?.[0];
        if(v) {
            const val = v.numericPrice * r.quantity;
            if(val > maxVal) {
                maxVal = val;
                targetItem = r;
                targetVendor = v;
            }
        }
    });

    if(targetItem && targetVendor) {
        handleNegotiate(targetItem.productName, targetVendor, targetItem.quantity);
    } else if (results.length > 0 && results[0].vendors?.[0]) {
        handleNegotiate(results[0].productName, results[0].vendors[0], results[0].quantity);
    }
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
    <div className="space-y-12 md:space-y-16 pb-32 px-0 md:px-2">
      {/* View Mode Toggle - Adjusted sticky top for mobile visibility */}
      <div className="no-print flex justify-center md:justify-end bg-white/60 backdrop-blur-xl p-3 md:p-4 rounded-3xl border border-slate-100 shadow-sm sticky top-24 md:top-28 z-40 mx-4 md:mx-0">
        <div className="bg-slate-100 p-1 rounded-full border border-slate-200 flex items-center w-full md:w-auto">
          <button 
            onClick={() => setViewMode('grid')} 
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-full transition-all text-[9px] font-black uppercase tracking-widest ${viewMode === 'grid' ? 'bg-white shadow-md text-[#0F172A]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Vendor Grid
          </button>
          <button 
            onClick={() => setViewMode('boq')} 
            className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-full transition-all text-[9px] font-black uppercase tracking-widest ${viewMode === 'boq' ? 'bg-[#0F172A] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Project Manifest
          </button>
        </div>
      </div>

      {viewMode === 'boq' ? (
        <div className="animate-in fade-in duration-700">
           <BOQTable 
            results={results} 
            sourceImage={sourceImage} 
            onUpdateQuantity={onUpdateQuantity} 
            locationName={locationName} 
            onReset={onReset}
            onAutoComplete={onAutoComplete}
            isCompleting={isCompleting}
            onUpdateResult={onUpdateResult}
            onGlobalNegotiate={handleGlobalNegotiate}
          />
        </div>
      ) : (
        results.map((product, pIdx) => {
          const vendors = sortVendors(product.vendors);
          const isNoteExpanded = expandedNotes.has(product.id);

          return (
            <div key={product.id} className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${pIdx * 100}ms` }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <span className={`px-3 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest ${getTierBadge(product.tier)} shadow-lg`}>{product.tier}</span>
                  <h2 className="text-2xl md:text-5xl font-black text-[#0F172A] tracking-tighter">{product.productName}</h2>
                </div>
              </div>

              <div className="bg-[#0F172A] text-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden group border border-white/5">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-[#F59E0B]/5 rounded-full blur-[100px] -mr-20 -mt-20" />
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                      <p className="text-[9px] md:text-[10px] font-black text-[#F59E0B] uppercase tracking-[0.25em] animate-in fade-in duration-1000">Neural Sourcing Analysis</p>
                    </div>
                    <p className={`text-base md:text-xl font-medium italic text-slate-200 transition-all duration-500 ${!isNoteExpanded ? 'line-clamp-3 md:line-clamp-2' : ''}`}>
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
                    <div key={vi} className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 flex flex-col group hover:border-[#F59E0B]/30 hover:shadow-2xl transition-all duration-500 relative">
                      {activeCall === v.vendor && (
                        <div className="absolute inset-0 bg-slate-900/90 z-20 rounded-[2rem] md:rounded-[2.5rem] flex flex-col items-center justify-center text-white animate-in fade-in">
                          <div className="w-16 h-16 bg-[#F59E0B] rounded-full flex items-center justify-center animate-ping mb-4">
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest">Calling via Vapi.ai...</p>
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-wrap items-start justify-between gap-y-2 gap-x-4">
                           <div className="flex items-center gap-2 mt-1">
                              {v.isManufacturer && <span className="bg-[#0F172A] text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-md shrink-0">OEM</span>}
                              <span className="text-emerald-600 text-[8px] font-black uppercase whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded-md">Verified Node</span>
                           </div>
                           <div className="text-right shrink-0">
                              <span className="text-lg md:text-2xl font-black text-[#0F172A] tracking-tighter whitespace-nowrap block">{v.price}</span>
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
                      
                      {/* Button Row */}
                      <div className="mt-4">
                         <button 
                           onClick={() => handleNegotiate(product.productName, v, product.quantity)}
                           disabled={isGeneratingStrategy}
                           className="w-full py-4 bg-[#0F172A] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F59E0B] transition-all whitespace-nowrap shadow-lg flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95"
                         >
                           {isGeneratingStrategy ? 'AI Negotiating...' : 'Negotiate Rate'}
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mb-0.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-[2rem] md:rounded-[3rem] p-12 md:p-16 text-center border-2 border-dashed border-slate-200">
                   <h4 className="text-xl md:text-2xl font-black text-[#0F172A] tracking-tighter">Regional Supply Gap</h4>
                   <p className="text-slate-500 mt-2 max-w-sm mx-auto font-medium text-sm">No direct nodes detected for Pincode {locationName}.</p>
                </div>
              )}
            </div>
          );
        })
      )}

      {negotiatingItem && (
        <NegotiationModal 
          strategy={negotiatingItem.strategy} 
          productName={negotiatingItem.productName} 
          vendorName={negotiatingItem.vendorName}
          onClose={() => setNegotiatingItem(null)}
        />
      )}
    </div>
  );
};

export default ResultView;
