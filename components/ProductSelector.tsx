
import React, { useState, useRef } from 'react';
import { ProductCandidate, ProductTier } from '../types';

interface ProductSelectorProps {
  candidates: ProductCandidate[];
  sceneSummary?: string;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onContinue: () => void;
  loading: boolean;
  sourceImage?: string;
  zipCode: string;
  setZipCode: (val: string) => void;
  locationName: string;
  onAddManualAsset: (name: string, desc: string, tier: ProductTier, box?: [number, number, number, number], dims?: string) => void;
}

const CroppedPreview = ({ src, box }: { src: string, box?: [number, number, number, number] }) => {
  if (!box || box.every(v => v === 0)) {
    return <img src={src} className="w-full h-full object-cover" alt="Source" />;
  }
  const [ymin, xmin, ymax, xmax] = box;
  const centerX = (xmin + xmax) / 20;
  const centerY = (ymin + ymax) / 20;

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${centerX}% ${centerY}%`,
    transform: 'scale(2.4)',
    transition: 'transform 0.5s ease-out'
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-200 group-hover:scale-105 transition-transform duration-700 ease-out">
      <img src={src} style={style} className="max-w-none" alt="Asset Close-up" />
    </div>
  );
};

const ProductSelector: React.FC<ProductSelectorProps> = ({ 
  candidates, 
  sceneSummary,
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
  const [newDims, setNewDims] = useState('');
  const [newTier, setNewTier] = useState<ProductTier>('Standard');
  const [manualBox, setManualBox] = useState<[number, number, number, number] | undefined>(undefined);
  const [isCropping, setIsCropping] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number, y: number } | null>(null);
  const cropRef = useRef<HTMLDivElement>(null);

  const allSelected = candidates.length > 0 && candidates.every(c => selectedIds.has(c.id));

  const toggleAll = () => {
    if (allSelected) {
      candidates.forEach(c => { if (selectedIds.has(c.id)) onToggle(c.id); });
    } else {
      candidates.forEach(c => { if (!selectedIds.has(c.id)) onToggle(c.id); });
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddManualAsset(newName, newDesc, newTier, manualBox, newDims);
    setNewName(''); setNewDesc(''); setNewDims(''); setManualBox(undefined); setIsAdding(false);
  };

  const groupedCandidates = candidates.reduce((acc, curr) => {
    const cat = curr.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, ProductCandidate[]>);

  const categories = Object.keys(groupedCandidates).sort();

  return (
    <div className="space-y-10 md:space-y-20 pb-32">
      {sourceImage && (
        <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] border border-white/80 p-6 md:p-10 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-6 duration-1000 mx-2">
           <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-10 gap-4">
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
               <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest">Target Scene Reference</h3>
             </div>
             <div className="bg-slate-950 text-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest">
               Neural Map: {candidates.length} Detected
             </div>
           </div>
           
           <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              <div className="lg:w-2/3 h-[250px] md:h-[500px] rounded-3xl overflow-hidden relative group border border-slate-100 shadow-inner bg-slate-50">
                 <img src={sourceImage} className="w-full h-full object-cover" alt="Source" />
                 {candidates.map(c => (
                   <div 
                    key={c.id} 
                    className={`absolute border-2 pointer-events-none transition-all ${selectedIds.has(c.id) ? 'border-blue-500 bg-blue-500/20 z-10' : 'border-white/30 bg-white/5'}`}
                    style={{
                      top: `${(c.boundingBox?.[0] || 0) / 10}%`,
                      left: `${(c.boundingBox?.[1] || 0) / 10}%`,
                      width: `${((c.boundingBox?.[3] || 0) - (c.boundingBox?.[1] || 0)) / 10}%`,
                      height: `${((c.boundingBox?.[2] || 0) - (c.boundingBox?.[0] || 0)) / 10}%`
                    }}
                   />
                 ))}
              </div>
              <div className="lg:w-1/3 flex flex-col justify-center space-y-6">
                 <div className="bg-white/40 backdrop-blur-xl border border-white rounded-[2rem] p-6 md:p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <p className="text-slate-600 text-sm md:text-lg font-medium leading-relaxed italic">
                      {sceneSummary ? `"${sceneSummary}"` : "Analyzing architectural geometry..."}
                    </p>
                 </div>
                 <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                   <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-relaxed">
                     Tip: Verify identified assets before sourcing. Items with low confidence (below 85%) may require manual correction.
                   </p>
                 </div>
              </div>
           </div>
        </div>
      )}

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
                const isLowConfidence = (product.confidence || 100) < 85;
                return (
                  <div key={product.id} className="relative group h-[400px] md:h-[500px]">
                    <div 
                      onClick={() => onToggle(product.id)}
                      className={`absolute inset-0 cursor-pointer rounded-[1.5rem] md:rounded-[2.5rem] border-2 transition-all flex flex-col bg-white overflow-hidden
                        ${isSelected ? 'border-blue-500 ring-4 ring-blue-50/50 shadow-2xl z-10' : 'border-white/50 hover:border-blue-200 shadow-sm'}
                        duration-500 ease-out
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
                            {isLowConfidence && (
                              <span className="px-3 py-1 bg-red-500/90 text-white rounded-full text-[7px] font-black tracking-widest uppercase">
                                CONF: {product.confidence}% (LOW)
                              </span>
                            )}
                         </div>
                      </div>
                      
                      <div className="p-4 md:p-8 flex-1 flex flex-col justify-start overflow-y-auto no-scrollbar overscroll-contain">
                        <h4 className="font-black text-slate-900 text-[11px] md:text-xl leading-tight mb-2 uppercase tracking-tight">{product.name}</h4>
                        <div className="mb-3 text-[9px] md:text-[11px] font-black text-[#457B9D] uppercase tracking-widest bg-blue-50 w-fit px-2 py-0.5 rounded">
                          DIM: {product.dimensions || 'Approx 1:1'}
                        </div>
                        <div className="text-[10px] md:text-[14px] text-slate-500 font-medium italic leading-relaxed">
                          {product.description}
                        </div>
                      </div>
                      <div className="h-6 bg-gradient-to-t from-white to-transparent absolute bottom-0 left-0 w-full pointer-events-none" />
                    </div>
                  </div>
                );
              })}
              
              <div 
                onClick={() => setIsAdding(true)}
                className="group cursor-pointer rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-dashed border-slate-300 bg-white/40 hover:bg-white hover:border-blue-500 transition-all flex flex-col items-center justify-center h-[400px] md:h-[500px] gap-4 p-8 text-center shadow-sm"
              >
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-xl">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
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

      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <div className="flex flex-col lg:flex-row">
              <div className="lg:w-1/2 bg-slate-900 p-8 lg:p-14 flex flex-col gap-8 shrink-0">
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase">Segment Asset</h3>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest leading-relaxed">Drag to isolate the target object.</p>
                </div>
                <div 
                  ref={cropRef}
                  onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
                  className="relative aspect-square bg-slate-800 rounded-[2.5rem] overflow-hidden cursor-crosshair border border-white/10 shadow-2xl"
                >
                  <img src={sourceImage} className="w-full h-full object-cover pointer-events-none opacity-80" alt="Crop Source" />
                  {(isCropping && startPoint && currentPoint) && (
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
                        left: `${(manualBox[1] / 1000) * 100}%`, top: `${(manualBox[0] / 1000) * 100}%`,
                        width: `${((manualBox[3] - manualBox[1]) / 1000) * 100}%`, height: `${((manualBox[2] - manualBox[0]) / 1000) * 100}%`
                      }}
                    />
                  )}
                </div>
                <button 
                  onClick={() => { setIsCropping(true); setManualBox(undefined); }}
                  className="w-full py-5 rounded-2xl border border-white/20 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
                >
                  {manualBox ? 'Redefine Segment' : 'Start Segmenting'}
                </button>
              </div>
              <div className="lg:w-1/2 p-8 lg:p-14 space-y-10 bg-white max-h-[80vh] overflow-y-auto no-scrollbar">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Metadata</h3>
                <form onSubmit={handleManualSubmit} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Asset Name</label>
                    <input autoFocus required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Oak Office Desk" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 font-bold outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Approx Dimensions (LxWxH)</label>
                    <input value={newDims} onChange={(e) => setNewDims(e.target.value)} placeholder="e.g. 1200 x 600 x 750 mm" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 font-bold outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Detailed Specifications</label>
                    <textarea rows={3} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Specs, material, finishes..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 font-medium outline-none focus:border-blue-500 transition-all resize-none" />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
                    <button type="submit" className="flex-1 py-5 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">Inject</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-2 md:bottom-6 left-1/2 -translate-x-1/2 w-[96%] max-w-5xl bg-white/95 backdrop-blur-3xl p-1.5 md:p-2 rounded-[2rem] md:rounded-[3rem] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] z-[60] flex flex-col md:flex-row items-center gap-2">
        
        <div className="flex-1 bg-slate-50/80 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center px-4 py-1.5 md:py-2 border border-slate-100 w-full group focus-within:bg-white transition-all overflow-hidden">
           <div className="flex flex-col pr-4 border-r border-slate-200 shrink-0 min-w-[100px] md:min-w-[160px] max-w-[200px]">
             <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Fulfillment</span>
             <span 
              className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider mt-0.5 leading-tight ${locationName ? 'text-blue-600' : 'text-slate-900'}`}
              style={{
                whiteSpace: 'normal',
                overflow: 'visible',
                textOverflow: 'clip',
                wordBreak: 'break-word',
                lineHeight: '1.2'
              }}
             >
               {locationName || (zipCode.length === 6 ? 'Resolving...' : 'Enter Pincode')}
             </span>
           </div>
           <input 
             type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
             placeholder="6-digit PIN" className="bg-transparent border-none focus:ring-0 text-slate-950 font-black text-lg md:text-2xl w-full pl-4 md:pl-6 outline-none placeholder:text-slate-300"
           />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button 
            onClick={toggleAll}
            className={`px-4 md:px-5 py-3 md:py-4 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-[9px] md:text-[11px] uppercase tracking-widest border-2 transition-all active:scale-95 whitespace-nowrap
              ${allSelected ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}
            `}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>

          <button
            onClick={onContinue}
            disabled={selectedIds.size === 0 || loading || zipCode.length < 6}
            className={`flex-1 md:flex-none px-5 md:px-8 py-3 md:py-4 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-[9px] md:text-[11px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-[0.2em] shadow-xl
              ${(selectedIds.size === 0 || loading || zipCode.length < 6) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}
            `}
          >
            {loading ? 'Neural Search...' : `Source ${selectedIds.size || ''} Assets`}
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSelector;
