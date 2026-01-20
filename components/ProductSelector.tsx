
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

const CroppedPreview = ({ src, box }: { src: string, box?: [number, number, number, number] }) => {
  if (!box || box.every(v => v === 0)) {
    return <img src={src} className="w-full h-full object-cover" alt="Source" />;
  }
  const [ymin, xmin, ymax, xmax] = box;
  const centerX = (xmin + xmax) / 20;
  const centerY = (ymin + ymax) / 20;

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-200 group-hover:scale-105 transition-transform duration-700 ease-out">
      <img 
        src={src} 
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          objectPosition: `${centerX}% ${centerY}%`, transform: 'scale(2.4)',
        }} 
        className="max-w-none" alt="Asset" 
      />
    </div>
  );
};

const ProductSelector: React.FC<ProductSelectorProps> = ({ 
  candidates, sceneSummary, selectedIds, onToggle, onUpdateCandidate, onContinue, loading, sourceImage, zipCode, setZipCode, locationName, onAddManualAsset, isDevMode
}) => {
  const [verifyingItem, setVerifyingItem] = useState<ProductCandidate | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDims, setNewDims] = useState('');
  const [newTier, setNewTier] = useState<ProductTier>('Standard');
  const [manualBox, setManualBox] = useState<[number, number, number, number] | undefined>(undefined);
  const [isCropping, setIsCropping] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number, y: number } | null>(null);
  const cropRef = useRef<HTMLDivElement>(null);

  const allSelected = candidates.length > 0 && candidates.every(c => selectedIds.has(c.id));
  const needsVerification = candidates.some(c => selectedIds.has(c.id) && (c.confidence || 100) < 85 && !c.isVerified);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddManualAsset(newName, newDesc, newTier, manualBox, newDims);
    setNewName(''); setNewDesc(''); setNewDims(''); setManualBox(undefined); setIsAdding(false);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyingItem) {
      onUpdateCandidate(verifyingItem.id, { isVerified: true });
      setVerifyingItem(null);
    }
  };

  const groupedCandidates = candidates.reduce((acc, curr) => {
    const cat = curr.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, ProductCandidate[]>);

  return (
    <div className="space-y-10 md:space-y-20 pb-32">
      {sourceImage && (
        <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/80 p-6 md:p-10 shadow-2xl animate-in fade-in slide-in-from-top-6 duration-1000 mx-2">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest">Neural Vision Reference</h3>
             </div>
             <div className="bg-slate-950 text-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest">
               Map Confidence: {Math.round(candidates.reduce((a,b)=>a+(b.confidence||0),0)/candidates.length || 0)}%
             </div>
           </div>
           <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              <div className="lg:w-2/3 h-[250px] md:h-[500px] rounded-3xl overflow-hidden relative border border-slate-100 shadow-inner bg-slate-50">
                 <img src={sourceImage} className="w-full h-full object-cover" alt="Source" />
                 {candidates.map(c => (
                   <div key={c.id} className={`absolute border-2 pointer-events-none transition-all ${selectedIds.has(c.id) ? 'border-blue-500 bg-blue-500/10 z-10' : 'border-white/20 bg-white/5'}`}
                    style={{
                      top: `${(c.boundingBox?.[0] || 0) / 10}%`, left: `${(c.boundingBox?.[1] || 0) / 10}%`,
                      width: `${((c.boundingBox?.[3] || 0) - (c.boundingBox?.[1] || 0)) / 10}%`, height: `${((c.boundingBox?.[2] || 0) - (c.boundingBox?.[0] || 0)) / 10}%`
                    }}
                   >
                     {isDevMode && (
                        <div className="absolute top-0 left-0 bg-blue-600 text-white text-[6px] font-mono px-1">
                          {c.boundingBox?.join(',')}
                        </div>
                     )}
                   </div>
                 ))}
              </div>
              <div className="lg:w-1/3 space-y-6">
                 <div className="bg-white/40 border border-white rounded-[2rem] p-8 shadow-xl">
                    <p className="text-slate-600 text-sm md:text-lg font-medium italic">
                      {sceneSummary ? `"${sceneSummary}"` : "Analyzing architectural geometry..."}
                    </p>
                 </div>
                 {needsVerification && (
                   <div className="p-5 bg-red-50 border border-red-200 rounded-2xl animate-pulse">
                     <p className="text-[10px] font-black text-red-700 uppercase tracking-widest leading-relaxed">
                       Warning: Low-confidence assets detected. Verification required before sourcing to ensure B2B accuracy.
                     </p>
                   </div>
                 )}
                 {isDevMode && (
                    <div className="p-6 bg-slate-900 text-blue-400 rounded-3xl font-mono text-[9px] overflow-auto max-h-[200px] border border-blue-500/30">
                       <h4 className="font-black text-white uppercase mb-2">Dev Debug: Candidates</h4>
                       <pre>{JSON.stringify(candidates, null, 2)}</pre>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <div className="space-y-16">
        {Object.keys(groupedCandidates).sort().map((category) => (
          <section key={category} className="space-y-8 px-4">
            <div className="flex items-center gap-6">
              <h3 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-[0.4em] whitespace-nowrap">{category}</h3>
              <div className="h-[2px] bg-gradient-to-r from-slate-200 to-transparent w-full" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-10">
              {groupedCandidates[category].map((product) => {
                const isSelected = selectedIds.has(product.id);
                const isLowConfidence = (product.confidence || 100) < 85;
                const verified = product.isVerified;
                
                return (
                  <div key={product.id} className="relative group h-[400px] md:h-[500px]">
                    <div 
                      onClick={() => onToggle(product.id)}
                      className={`absolute inset-0 cursor-pointer rounded-[2rem] md:rounded-[2.5rem] border-2 transition-all flex flex-col bg-white overflow-hidden
                        ${isSelected ? 'border-blue-500 ring-4 ring-blue-50/50 shadow-2xl z-10' : 'border-white shadow-sm'}
                      `}
                    >
                      <div className="w-full aspect-square bg-slate-100 overflow-hidden relative border-b border-slate-100 shrink-0">
                         {sourceImage && <CroppedPreview src={sourceImage} box={product.boundingBox} />}
                         <div className={`absolute top-3 right-3 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all z-20 ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/60 border-white/60 text-transparent opacity-0 group-hover:opacity-100'}`}>
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                         </div>
                         <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
                            <span className="px-3 py-1 bg-slate-950/80 backdrop-blur text-white rounded-full text-[9px] font-black tracking-widest uppercase">
                              {product.quantity} {product.suggestedUnit}
                            </span>
                            {isLowConfidence && !verified && (
                              <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[7px] font-black tracking-widest uppercase flex items-center gap-1">
                                <span className="w-1 h-1 bg-white rounded-full animate-ping" /> Verify Required
                              </span>
                            )}
                            {verified && (
                              <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[7px] font-black tracking-widest uppercase flex items-center gap-1">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg> Verified
                              </span>
                            )}
                            {isDevMode && (
                               <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-[7px] font-mono font-black tracking-widest uppercase">
                                 CONF: {product.confidence}%
                               </span>
                            )}
                         </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h4 className="font-black text-slate-900 text-[11px] md:text-xl uppercase tracking-tight">{product.name}</h4>
                        <div className="mt-2 text-[9px] md:text-[11px] font-black text-[#457B9D] uppercase tracking-widest bg-blue-50 w-fit px-2 py-0.5 rounded">
                          DIM: {product.dimensions || 'Verify...'}
                        </div>
                        <p className="mt-3 text-[10px] md:text-sm text-slate-500 line-clamp-3">{product.description}</p>
                        
                        {isSelected && isLowConfidence && !verified && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setVerifyingItem(product); }}
                            className="mt-auto py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all"
                          >
                            Verify Specifications
                          </button>
                        )}
                        {isDevMode && (
                           <div className="mt-2 p-2 bg-slate-50 rounded-lg font-mono text-[7px] text-slate-400 overflow-hidden">
                              ID: {product.id}<br/>
                              BOX: {JSON.stringify(product.boundingBox)}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div onClick={() => setIsAdding(true)} className="group cursor-pointer rounded-[2rem] border-2 border-dashed border-slate-300 bg-white/40 hover:bg-white hover:border-blue-500 transition-all flex flex-col items-center justify-center h-[400px] md:h-[500px] p-8 text-center shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-xl">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                </div>
                <h4 className="mt-4 font-black text-slate-900 text-[10px] md:text-sm uppercase tracking-widest">Inject Asset</h4>
              </div>
            </div>
          </section>
        ))}
      </div>

      {verifyingItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[250] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
               </div>
               <div>
                 <h3 className="text-xl font-black text-slate-900 uppercase">Verification Required</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm asset metadata before sourcing</p>
               </div>
             </div>
             <form onSubmit={handleVerifySubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Product Name</label>
                  <input required value={verifyingItem.name} onChange={e => setVerifyingItem({...verifyingItem, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confirmed Dimensions</label>
                  <input required value={verifyingItem.dimensions || ''} onChange={e => setVerifyingItem({...verifyingItem, dimensions: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-blue-500" placeholder="e.g. 1200 x 600 mm" />
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setVerifyingItem(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Skip</button>
                  <button type="submit" className="flex-1 py-4 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">Confirm Specs</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">
            <div className="lg:w-1/2 bg-slate-900 p-14 flex flex-col gap-8">
               <h3 className="text-2xl font-black text-white uppercase tracking-tight">Manual Injection</h3>
               <div className="bg-slate-800 rounded-3xl aspect-square border border-white/10 flex items-center justify-center text-white/20">
                  <p className="text-[10px] font-black uppercase tracking-widest">Segmentation Hub</p>
               </div>
            </div>
            <div className="lg:w-1/2 p-14 space-y-8">
               <form onSubmit={handleManualSubmit} className="space-y-6">
                 <input autoFocus required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Asset Name" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 font-bold" />
                 <input value={newDims} onChange={e => setNewDims(e.target.value)} placeholder="Dimensions" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 font-bold" />
                 <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 font-medium" rows={3} />
                 <div className="flex gap-4">
                   <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-slate-950 text-white rounded-xl font-black text-[10px] uppercase shadow-xl">Inject</button>
                 </div>
               </form>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl bg-white/95 backdrop-blur-3xl p-3 rounded-[3rem] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] z-[60] flex flex-col md:flex-row items-center gap-3">
        <div className="flex-1 bg-slate-50 rounded-[2.5rem] flex items-center px-6 py-3 border border-slate-100 w-full">
           <div className="flex flex-col pr-6 border-r border-slate-200 shrink-0">
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Regional Node</span>
             <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider truncate max-w-[120px]">{locationName || 'PINCODE'}</span>
           </div>
           <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Enter Pincode" className="bg-transparent border-none focus:ring-0 text-slate-950 font-black text-2xl w-full pl-6 outline-none" />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={onContinue}
            disabled={selectedIds.size === 0 || loading || zipCode.length < 6 || needsVerification}
            className={`flex-1 md:flex-none px-10 py-5 rounded-[2.5rem] font-black text-[11px] flex items-center justify-center gap-3 transition-all uppercase tracking-[0.2em] shadow-xl
              ${(selectedIds.size === 0 || loading || zipCode.length < 6 || needsVerification) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}
            `}
          >
            {needsVerification ? 'Verification Required' : loading ? 'Neural Search...' : `Source ${selectedIds.size} Assets`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelector;
