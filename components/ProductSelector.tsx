
import React, { useState, useRef } from 'react';
import { ProductCandidate, ProductTier } from '../types';

interface ProductSelectorProps {
  candidates: ProductCandidate[];
  sceneSummary?: string;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onUpdateCandidate: (id: string, updates: Partial<ProductCandidate>) => void;
  onContinue: () => void;
  loading: boolean;
  sourceImage?: string;
  zipCode: string;
  setZipCode: (val: string) => void;
  locationName: string;
  onAddManualAsset: (name: string, desc: string, tier: ProductTier, box?: [number, number, number, number], dims?: string) => void;
  isDevMode?: boolean;
}

const UNITS = ['Nos', 'Sqft', 'Sqm', 'Rft', 'Mtr', 'Set', 'Kg', 'Ltr', 'Box', 'Roll', 'Pkt'];

const CroppedPreview = ({ src, box }: { src: string, box?: [number, number, number, number] }) => {
  if (!box || box.every(v => v === 0)) {
    return (
      <div className="w-full h-full overflow-hidden bg-slate-100">
        <img src={src} className="w-full h-full object-cover transition-transform duration-500 hover:scale-125" alt="Source" />
      </div>
    );
  }
  const [ymin, xmin, ymax, xmax] = box;
  
  // Calculate center percentage
  const cx = (xmin + xmax) / 20;
  const cy = (ymin + ymax) / 20;

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-200 group">
      <img 
        src={src} 
        style={{
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          objectPosition: `${cx}% ${cy}%`,
          transformOrigin: `${cx}% ${cy}%`
        }} 
        className="transition-transform duration-700 ease-in-out scale-[2.0] group-hover:scale-[4.0]" 
        alt="Asset" 
      />
    </div>
  );
};

const ProductSelector: React.FC<ProductSelectorProps> = ({ 
  candidates, sceneSummary, selectedIds, onToggle, onUpdateCandidate, onContinue, loading, sourceImage, zipCode, setZipCode, locationName, onAddManualAsset, isDevMode
}) => {
  const [verifyingItem, setVerifyingItem] = useState<ProductCandidate | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  // Manual Add State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDims, setNewDims] = useState('');
  const [newTier, setNewTier] = useState<ProductTier>('Standard');
  const [manualBox, setManualBox] = useState<[number, number, number, number] | undefined>(undefined);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddManualAsset(newName, newDesc, newTier, manualBox, newDims);
    setNewName(''); setNewDesc(''); setNewDims(''); setManualBox(undefined); setIsAdding(false);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyingItem) {
      onUpdateCandidate(verifyingItem.id, { ...verifyingItem, isVerified: true });
      setVerifyingItem(null);
    }
  };

  const groupedCandidates = candidates.reduce((acc, curr) => {
    const cat = curr.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, ProductCandidate[]>);

  const getConfidenceLevel = (score: number) => {
    if (score >= 90) return { label: 'High Precision', color: 'bg-emerald-500' };
    if (score >= 75) return { label: 'Probable Match', color: 'bg-blue-500' };
    return { label: 'Review Recommended', color: 'bg-amber-500' };
  };

  const needsVerification = candidates.some(c => selectedIds.has(c.id) && (c.confidence || 100) < 75 && !c.isVerified);
  
  const isAreaUnit = (unit: string) => ['Sqft', 'Sqm', 'Mtr', 'Rft'].includes(unit);

  return (
    <div className="space-y-10 md:space-y-20 pb-32">
      {sourceImage && (
        <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/80 p-4 md:p-10 shadow-2xl animate-in fade-in slide-in-from-top-6 duration-1000 mx-0 md:mx-2">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Neural Vision Reference</h3>
             </div>
             <div className="bg-slate-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest w-fit">
               Map Confidence: {Math.round(candidates.reduce((a,b)=>a+(b.confidence||0),0)/candidates.length || 0)}%
             </div>
           </div>
           <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              <div className="w-full lg:w-2/3 h-[300px] md:h-[500px] rounded-3xl overflow-hidden relative border border-slate-200 shadow-inner bg-slate-50">
                 <img src={sourceImage} className="w-full h-full object-cover" alt="Source" />
                 {candidates.map(c => (
                   <div key={c.id} className={`absolute border-2 pointer-events-none transition-all duration-300 ${selectedIds.has(c.id) ? 'border-blue-500 bg-blue-500/10 z-10' : 'border-white/30 bg-white/5'}`}
                    style={{
                      top: `${(c.boundingBox?.[0] || 0) / 10}%`, left: `${(c.boundingBox?.[1] || 0) / 10}%`,
                      width: `${((c.boundingBox?.[3] || 0) - (c.boundingBox?.[1] || 0)) / 10}%`, height: `${((c.boundingBox?.[2] || 0) - (c.boundingBox?.[0] || 0)) / 10}%`
                    }}
                   />
                 ))}
              </div>
              <div className="w-full lg:w-1/3 space-y-6">
                 <div className="bg-white/60 border border-white rounded-[2rem] p-6 md:p-8 shadow-xl backdrop-blur-sm">
                    <p className="text-slate-900 text-base md:text-lg font-bold italic leading-relaxed">
                      {sceneSummary ? `"${sceneSummary}"` : "Analyzing architectural geometry..."}
                    </p>
                 </div>
                 {needsVerification && (
                   <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl animate-pulse">
                     <p className="text-[11px] font-black text-amber-900 uppercase tracking-widest leading-relaxed">
                       Warning: Uncertain assets detected. Verify dimensions below to ensure B2B sourcing accuracy.
                     </p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <div className="space-y-12 md:space-y-16">
        {Object.keys(groupedCandidates).sort().map((category) => (
          <section key={category} className="space-y-8 px-0 md:px-4">
            <div className="flex items-center gap-6">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.4em] whitespace-nowrap">{category}</h3>
              <div className="h-[2px] bg-slate-100 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10">
              {groupedCandidates[category].map((product) => {
                const isSelected = selectedIds.has(product.id);
                const conf = getConfidenceLevel(product.confidence || 0);
                
                return (
                  <div key={product.id} className="relative h-[480px] md:h-[520px]">
                    <div 
                      onClick={() => onToggle(product.id)}
                      className={`absolute inset-0 cursor-pointer rounded-[2.5rem] border-[3px] transition-all duration-300 flex flex-col bg-white overflow-hidden hover:-translate-y-2 active:scale-[0.98]
                        ${isSelected ? 'border-blue-600 shadow-2xl shadow-blue-900/10 z-10' : 'border-transparent shadow-lg hover:shadow-xl'}
                      `}
                    >
                      {/* Image Container: Fixed height on mobile (h-56) to save space, Aspect Square on desktop */}
                      <div className="w-full h-56 md:h-auto md:aspect-square bg-slate-100 overflow-hidden relative border-b border-slate-100 shrink-0">
                         {sourceImage && <CroppedPreview src={sourceImage} box={product.boundingBox} />}
                         
                         {/* Selection Indicator */}
                         <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 shadow-lg ${isSelected ? 'bg-blue-600 text-white scale-100' : 'bg-white text-slate-200 scale-90'}`}>
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                         </div>

                         <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 items-start">
                            <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black tracking-widest uppercase shadow-md">
                              {product.quantity} {product.suggestedUnit}
                            </span>
                            <span className={`px-3 py-1.5 text-white rounded-lg text-[8px] font-black tracking-widest uppercase shadow-md ${product.isVerified ? 'bg-emerald-500' : conf.color}`}>
                                {product.isVerified ? 'Verified' : conf.label}
                            </span>
                         </div>
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col relative justify-between">
                         <div>
                            <h4 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-tight leading-none line-clamp-2 mb-2">{product.name}</h4>
                            
                            {!isAreaUnit(product.suggestedUnit) && (
                            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded w-fit mb-3">
                                DIM: {product.dimensions || 'Verify'}
                            </div>
                            )}
                            
                            <p className="text-xs text-slate-950 font-bold leading-relaxed line-clamp-2 md:line-clamp-3 mb-2">{product.description}</p>
                         </div>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); setVerifyingItem(product); }}
                          className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all mt-auto
                            ${product.isVerified 
                              ? 'bg-slate-100 text-slate-400' 
                              : 'bg-slate-900 text-white hover:bg-blue-600 shadow-xl'}
                          `}
                        >
                          {product.isVerified ? 'Edit Specs' : 'Verify Asset'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Manual Add Card */}
              <div onClick={() => setIsAdding(true)} className="group cursor-pointer rounded-[2.5rem] border-4 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-white transition-all flex flex-col items-center justify-center h-[480px] md:h-[520px] p-8 text-center min-h-[350px]">
                <div className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:border-blue-500 group-hover:scale-110 transition-all shadow-sm">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                </div>
                <h4 className="mt-6 font-black text-slate-900 text-sm uppercase tracking-widest">Inject Manual Asset</h4>
              </div>
            </div>
          </section>
        ))}
      </div>

      {verifyingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[250] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-lg p-6 md:p-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 max-h-[90vh] overflow-y-auto">
             <div className="flex items-center gap-4 mb-8">
               <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                 <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
               </div>
               <div>
                 <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Verify Specs</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ensure procurement accuracy</p>
               </div>
             </div>
             
             <form onSubmit={handleVerifySubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantity</label>
                     <input 
                       type="number" required 
                       value={verifyingItem.quantity} 
                       onChange={e => setVerifyingItem({...verifyingItem, quantity: Number(e.target.value)})} 
                       className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-black text-slate-900 focus:border-blue-500 outline-none text-lg" 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit</label>
                     <select 
                        required 
                        value={verifyingItem.suggestedUnit} 
                        onChange={e => setVerifyingItem({...verifyingItem, suggestedUnit: e.target.value})} 
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-black text-slate-900 focus:border-blue-500 outline-none appearance-none text-lg"
                     >
                       {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                     </select>
                   </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex justify-between">
                    <span>Dimensions</span>
                    {isAreaUnit(verifyingItem.suggestedUnit) && <span className="text-emerald-600">Optional for Area</span>}
                  </label>
                  <input 
                    value={verifyingItem.dimensions || ''} 
                    onChange={e => setVerifyingItem({...verifyingItem, dimensions: e.target.value})} 
                    disabled={isAreaUnit(verifyingItem.suggestedUnit)}
                    className={`w-full border-2 rounded-xl p-4 font-black text-slate-900 outline-none text-lg transition-all
                      ${isAreaUnit(verifyingItem.suggestedUnit) 
                        ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-50 border-slate-200 focus:border-blue-500'}
                    `}
                    placeholder="e.g. 1200 x 600 mm" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Description</label>
                  <textarea 
                    value={verifyingItem.description} 
                    onChange={e => setVerifyingItem({...verifyingItem, description: e.target.value})} 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-bold text-sm text-slate-900 focus:border-blue-500 outline-none leading-relaxed" 
                    rows={4} 
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setVerifyingItem(null)} className="flex-1 py-4 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:text-slate-600">Discard</button>
                  <button type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all">Confirm</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* Floating Bottom Bar (Responsive) */}
      <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl bg-white/95 backdrop-blur-3xl p-2 md:p-3 rounded-[2rem] md:rounded-[3rem] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] z-[60] flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center px-4 md:px-6 py-3 border border-slate-100 w-full">
           <div className="flex flex-col pr-4 md:pr-6 border-r border-slate-200 shrink-0">
             <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Regional Node</span>
             <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-600 tracking-wider truncate max-w-[80px] md:max-w-[120px]">{locationName || 'PIN'}</span>
           </div>
           <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Pincode" className="bg-transparent border-none focus:ring-0 text-slate-950 font-black text-xl md:text-2xl w-full pl-4 md:pl-6 outline-none" />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={onContinue}
            disabled={selectedIds.size === 0 || loading || zipCode.length < 6 || needsVerification}
            className={`w-full md:w-auto px-6 md:px-10 py-4 md:py-5 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-[10px] md:text-[11px] flex items-center justify-center gap-3 transition-all uppercase tracking-[0.2em] shadow-xl
              ${(selectedIds.size === 0 || loading || zipCode.length < 6 || needsVerification) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}
            `}
          >
            {needsVerification ? 'Verify Required' : loading ? 'Neural Search...' : `Source ${selectedIds.size}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelector;
