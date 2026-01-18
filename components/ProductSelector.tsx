
import React, { useState, useRef, useEffect } from 'react';
import { ProductCandidate, ProductTier } from '../types';

interface ProductSelectorProps {
  candidates: ProductCandidate[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onContinue: () => void;
  loading: boolean;
  sourceImage?: string;
  zipCode: string;
  setZipCode: (val: string) => void;
  locationName: string;
  onAddManualAsset: (name: string, desc: string, tier: ProductTier, box?: [number, number, number, number]) => void;
}

const CroppedPreview = ({ src, box }: { src: string, box?: [number, number, number, number] }) => {
  if (!box || box.every(v => v === 0)) {
    return <img src={src} className="w-full h-full object-cover" alt="Source" />;
  }
  
  const [ymin, xmin, ymax, xmax] = box;
  const width = Math.max(xmax - xmin, 1);
  const height = Math.max(ymax - ymin, 1);
  
  const style: React.CSSProperties = {
    position: 'absolute',
    width: `${100 * (1000 / width)}%`,
    height: `${100 * (1000 / height)}%`,
    left: `${-(xmin / 1000) * (100 * (1000 / width))}%`,
    top: `${-(ymin / 1000) * (100 * (1000 / height))}%`,
    objectFit: 'cover',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden'
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-100 group-hover:scale-105 transition-transform duration-700 ease-out">
      <img src={src} style={style} className="max-w-none" alt="Detection Crop" />
    </div>
  );
};

const ProductSelector: React.FC<ProductSelectorProps> = ({ 
  candidates, 
  selectedIds, 
  onToggle, 
  onContinue, 
  loading, 
  sourceImage,
  zipCode,
  setZipCode,
  locationName,
  onAddManualAsset
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTier, setNewTier] = useState<ProductTier>('Standard');
  const [manualBox, setManualBox] = useState<[number, number, number, number] | undefined>(undefined);
  const [isCropping, setIsCropping] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number, y: number } | null>(null);
  const cropRef = useRef<HTMLDivElement>(null);

  const getTierColor = (tier: ProductTier) => {
    switch (tier) {
      case 'Luxury': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Premium': return 'bg-slate-900 text-white border-slate-900';
      case 'Standard': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropRef.current) return;
    const rect = cropRef.current.getBoundingClientRect();
    setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCurrentPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startPoint || !cropRef.current) return;
    const rect = cropRef.current.getBoundingClientRect();
    setCurrentPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseUp = () => {
    if (!startPoint || !currentPoint || !cropRef.current) return;
    const rect = cropRef.current.getBoundingClientRect();
    
    const xmin = Math.min(startPoint.x, currentPoint.x);
    const xmax = Math.max(startPoint.x, currentPoint.x);
    const ymin = Math.min(startPoint.y, currentPoint.y);
    const ymax = Math.max(startPoint.y, currentPoint.y);

    const normXmin = Math.round((xmin / rect.width) * 1000);
    const normXmax = Math.round((xmax / rect.width) * 1000);
    const normYmin = Math.round((ymin / rect.height) * 1000);
    const normYmax = Math.round((ymax / rect.height) * 1000);

    setManualBox([normYmin, normXmin, normYmax, normXmax]);
    setStartPoint(null);
    setCurrentPoint(null);
    setIsCropping(false);
  };

  const groupedCandidates = candidates.reduce((acc, curr) => {
    const cat = curr.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, ProductCandidate[]>);

  const categories = Object.keys(groupedCandidates).sort();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddManualAsset(newName, newDesc, newTier, manualBox);
      setNewName('');
      setNewDesc('');
      setManualBox(undefined);
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-10 md:space-y-20 pb-48">
      {/* Visual Reference Strip */}
      {sourceImage && (
        <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/80 p-6 md:p-8 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-6 duration-1000 mx-2">
           <div className="flex items-center justify-between mb-4 md:mb-6 px-1 md:px-2">
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest">Target Scene Reference</h3>
             </div>
             <div className="hidden md:flex gap-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Mapping: Active</span>
             </div>
           </div>
           <div className="w-full h-48 md:h-[400px] rounded-2xl overflow-hidden relative group border border-slate-100">
              <img src={sourceImage} className="w-full h-full object-cover" alt="Source" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />
           </div>
        </div>
      )}

      {/* Main Results Grid */}
      <div className="space-y-16">
        {categories.map((category) => (
          <section key={category} className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 px-4">
            <div className="flex items-center gap-6">
              <h3 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-[0.4em] whitespace-nowrap">{category}</h3>
              <div className="h-[2px] bg-gradient-to-r from-slate-200 to-transparent w-full" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-10">
              {groupedCandidates[category].map((product) => {
                const isSelected = selectedIds.has(product.id);
                return (
                  <div 
                    key={product.id}
                    className="relative group h-[300px] md:h-[450px]"
                    style={{ zIndex: isSelected ? 10 : 1 }}
                  >
                    <div 
                      onClick={() => onToggle(product.id)}
                      className={`absolute inset-0 cursor-pointer rounded-[1.5rem] md:rounded-[2.5rem] border-2 transition-all flex flex-col bg-white overflow-hidden
                        ${isSelected 
                          ? 'border-blue-500 ring-4 ring-blue-50/50 shadow-2xl z-10' 
                          : 'border-white/50 hover:border-blue-200 hover:shadow-xl'}
                        md:group-hover:scale-[1.08] md:group-hover:z-[50]
                        duration-500 ease-out
                      `}
                    >
                      <div className="w-full aspect-square bg-slate-50 overflow-hidden relative border-b border-slate-50 shrink-0">
                         {sourceImage ? (
                           <CroppedPreview src={sourceImage} box={product.boundingBox} />
                         ) : (
                           <div className="w-full h-full bg-slate-100 flex items-center justify-center p-8 opacity-20">
                              <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 22V4c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v18M12 18V6M6 12h12"/></svg>
                           </div>
                         )}
                         
                         <div className={`absolute top-3 right-3 md:top-6 md:right-6 w-8 h-8 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center transition-all z-20
                            ${isSelected 
                              ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg' 
                              : 'bg-white/40 backdrop-blur-xl border-white/60 text-transparent opacity-0 md:group-hover:opacity-100'}
                         `}>
                           <svg width="14" height="14" md-width="20" md-height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                         </div>

                         <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 z-10">
                            <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl border backdrop-blur-md shadow-sm ${getTierColor(product.tier)}`}>
                              {product.tier}
                            </span>
                         </div>
                      </div>

                      <div className="p-4 md:p-8 space-y-2 md:space-y-4 flex-1 flex flex-col justify-start bg-white md:group-hover:overflow-y-auto no-scrollbar">
                        <div className="space-y-1 md:space-y-2">
                          <h4 className="font-black text-slate-900 text-xs md:text-xl leading-tight tracking-tight md:group-hover:text-blue-600 transition-colors line-clamp-2 md:group-hover:line-clamp-none">
                            {product.name}
                          </h4>
                          <div className="text-[9px] md:text-[14px] text-slate-400 font-medium leading-tight md:leading-relaxed italic line-clamp-2 md:group-hover:line-clamp-none transition-all">
                            {product.description}
                          </div>
                        </div>
                        
                        <div className="pt-3 md:pt-6 border-t border-slate-50 flex items-center justify-between mt-auto shrink-0">
                          <span className="text-[7px] md:text-[9px] font-bold text-slate-300 uppercase tracking-widest">#{product.id.split('-')[0]}</span>
                          <div className={`text-[8px] md:text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                            {isSelected ? 'Validated' : 'Select'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div 
                onClick={() => setIsAdding(true)}
                className="group cursor-pointer rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-dashed border-slate-300 bg-white/40 hover:bg-white hover:border-blue-500 transition-all flex flex-col items-center justify-center h-[300px] md:h-[450px] gap-4 p-8 text-center"
              >
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-xl">
                  <svg width="24" height="24" md-width="32" md-height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-[10px] md:text-sm uppercase tracking-widest">Inject Asset</h4>
                  <p className="text-[8px] md:text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Asset missing from scan?</p>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Manual Entry Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <div className="flex flex-col lg:flex-row">
              {/* Visual Selection Panel */}
              <div className="lg:w-1/2 bg-slate-900 p-8 lg:p-14 flex flex-col gap-8 shrink-0">
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase">Segment Asset</h3>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest leading-relaxed">Drag to isolate the target object for neural verification.</p>
                </div>
                
                <div 
                  ref={cropRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="relative aspect-square bg-slate-800 rounded-3xl md:rounded-[2.5rem] overflow-hidden cursor-crosshair select-none group border border-white/10 shadow-2xl"
                >
                  <img src={sourceImage} className="w-full h-full object-cover pointer-events-none opacity-80" alt="Crop Source" />
                  
                  {isCropping && startPoint && currentPoint && (
                    <div 
                      className="absolute border-2 border-blue-400 bg-blue-500/20 shadow-[0_0_0_1000px_rgba(0,0,0,0.6)] z-10"
                      style={{
                        left: Math.min(startPoint.x, currentPoint.x),
                        top: Math.min(startPoint.y, currentPoint.y),
                        width: Math.abs(startPoint.x - currentPoint.x),
                        height: Math.abs(startPoint.y - currentPoint.y)
                      }}
                    />
                  )}

                  {manualBox && !isCropping && (
                    <div 
                      className="absolute border-4 border-emerald-400 bg-emerald-500/10 shadow-[0_0_0_1000px_rgba(0,0,0,0.7)] z-10"
                      style={{
                        left: `${(manualBox[1] / 1000) * 100}%`,
                        top: `${(manualBox[0] / 1000) * 100}%`,
                        width: `${((manualBox[3] - manualBox[1]) / 1000) * 100}%`,
                        height: `${((manualBox[2] - manualBox[0]) / 1000) * 100}%`
                      }}
                    >
                      <div className="absolute -top-4 -right-4 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-2xl">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => { setIsCropping(true); setManualBox(undefined); }}
                  className="w-full py-5 rounded-2xl border border-white/20 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                >
                  {manualBox ? 'Redefine Segment' : 'Start Segmenting'}
                </button>
              </div>

              {/* Data Input Panel */}
              <div className="lg:w-1/2 p-8 lg:p-14 space-y-10 bg-white">
                <div className="space-y-3">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Metadata</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Architectural Asset Specification</p>
                </div>

                <form onSubmit={handleAdd} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Label</label>
                    <input 
                      autoFocus required value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g., Brushed Copper Pendant"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 text-slate-900 font-bold text-lg placeholder:text-slate-300 outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Engineer Notes</label>
                    <textarea 
                      value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3}
                      placeholder="Material, finish, manufacturer hints..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 text-slate-900 font-medium text-sm placeholder:text-slate-300 outline-none focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Market Tier</label>
                      <select 
                        value={newTier} onChange={(e) => setNewTier(e.target.value as ProductTier)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 text-slate-900 font-bold text-xs outline-none appearance-none cursor-pointer"
                      >
                        <option value="Luxury">Luxury</option>
                        <option value="Premium">Premium</option>
                        <option value="Standard">Standard</option>
                        <option value="Budget">Budget</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button 
                      type="button" onClick={() => setIsAdding(false)}
                      className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-5 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-950/30 hover:bg-blue-600 transition-all"
                    >
                      Inject Asset
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 
        PREMIUM FLOATING ACTION BAR
        Refined aesthetics: Proportional text sizing for mobile and desktop.
      */}
      <div className="fixed bottom-4 md:bottom-12 left-1/2 -translate-x-1/2 w-[94%] max-w-4xl bg-white/95 backdrop-blur-3xl p-2.5 md:p-4 rounded-[1.8rem] md:rounded-[3rem] border border-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)] z-[60] flex flex-col md:flex-row items-stretch md:items-center gap-2.5 md:gap-4">
        
        {/* Hub Selection Area */}
        <div className="flex-1 bg-slate-50/80 rounded-[1.4rem] md:rounded-[2rem] flex items-center px-4 md:px-6 py-2.5 md:py-3 border border-slate-100 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-100">
           <div className="flex flex-col pr-4 md:pr-6 border-r border-slate-200 shrink-0">
             <span className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Fulfillment</span>
             <span className={`text-[9px] md:text-[11px] font-black uppercase tracking-wider truncate max-w-[65px] md:max-w-[140px] mt-0.5 ${locationName ? 'text-blue-600' : 'text-slate-900'}`}>
               {locationName || (zipCode.length === 6 ? 'Resolving...' : 'Hub Pincode')}
             </span>
           </div>
           <input 
             type="text"
             value={zipCode}
             onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
             placeholder="6-digit PIN"
             className="bg-transparent border-none focus:ring-0 text-slate-950 font-black text-lg md:text-2xl placeholder:text-slate-300 w-full pl-4 md:pl-6 outline-none caret-blue-500"
           />
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onContinue}
          disabled={selectedIds.size === 0 || loading || zipCode.length < 6}
          className={`px-6 md:px-12 py-4 md:py-6 rounded-[1.4rem] md:rounded-[2.2rem] font-black text-[10px] md:text-[12px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-[0.25em]
            ${(selectedIds.size === 0 || loading || zipCode.length < 6)
              ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
              : 'bg-slate-950 text-white hover:bg-[#457B9D] shadow-xl'}
          `}
        >
          {loading ? (
            <span className="animate-pulse flex items-center gap-2">
              <svg className="animate-spin h-3 w-3 md:h-4 md:w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sourcing...
            </span>
          ) : (
            <>
              Source {selectedIds.size || ''} Assets
              <svg width="14" height="14" md-width="16" md-height="16" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductSelector;
