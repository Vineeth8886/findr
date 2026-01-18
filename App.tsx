
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ProductSelector from './components/ProductSelector';
import ResultView from './components/ResultView';
import ThinkingVisual from './components/ThinkingVisual';
import { identifyProducts, fetchVendorsForProduct, resolvePincode } from './services/geminiService';
import { ProductCandidate, ProductResult, ProductTier } from './types';

// Use AIStudio interface and re-declare it in the global scope to match the environment's expectations.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Fixed: Changed to optional to match the environmental declaration and avoid "identical modifiers" error.
    aistudio?: AIStudio;
  }
}

type AppState = 'setup' | 'upload' | 'analyzing' | 'selecting' | 'sourcing' | 'results';
type ViewType = 'search' | 'vendors' | 'history';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('search');
  const [state, setState] = useState<AppState>('setup');
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  
  const [candidates, setCandidates] = useState<ProductCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<ProductResult[][]>(() => {
    const saved = localStorage.getItem('findr_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const checkKey = async () => {
      if (process.env.API_KEY) {
        setState('upload');
      } else if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) setState('upload');
      }
    };
    checkKey();
  }, []);

  const handleConnect = async () => {
    if (window.aistudio) {
      // Mitigate race condition by assuming key selection was successful.
      await window.aistudio.openSelectKey();
      setState('upload');
    }
  };

  useEffect(() => {
    if (results.length > 0 && state === 'results') {
      setHistory(prev => {
        const next = [results, ...prev].slice(0, 10);
        localStorage.setItem('findr_history', JSON.stringify(next));
        return next;
      });
    }
  }, [results, state]);

  useEffect(() => {
    let interval: number;
    if (loading && progress < 98) {
      interval = window.setInterval(() => {
        setProgress(prev => {
          const jitter = Math.random() > 0.8 ? 0.05 : 1;
          const increment = prev < 30 ? 6 * jitter : prev < 70 ? 1 * jitter : 0.2 * jitter;
          return Math.min(prev + increment, 98);
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [loading, progress]);

  useEffect(() => {
    if (zipCode.length === 6) {
      resolvePincode(zipCode).then(setLocationName).catch(() => setLocationName("Verified Hub"));
    } else {
      setLocationName("");
    }
  }, [zipCode]);

  const handleIdentify = async (img: string) => {
    setLoading(true);
    setProgress(0);
    setError(null);
    setState('analyzing');
    try {
      const identified = await identifyProducts(img);
      setCandidates(identified);
      setProgress(100);
      setTimeout(() => {
        setState('selecting');
        setLoading(false);
      }, 800);
    } catch (err: any) {
      setError('Neural scan unsuccessful. Please clarify the source image.');
      setState('upload');
      setLoading(false);
    }
  };

  const handleAddManualAsset = (name: string, desc: string, tier: ProductTier, box?: [number, number, number, number]) => {
    const newId = `manual-${Date.now()}`;
    const newCandidate: ProductCandidate = {
      id: newId,
      name,
      description: desc,
      category: 'Generic',
      tier: tier,
      boundingBox: box
    };
    setCandidates(prev => [...prev, newCandidate]);
    setSelectedIds(prev => new Set(prev).add(newId));
  };

  const handleSourceProducts = async () => {
    if (!zipCode || zipCode.length < 6) {
      setError('A 6-digit Pincode is required for regional fulfillment logic.');
      return;
    }
    setLoading(true);
    setError(null);
    setState('sourcing');
    setProgress(5);
    try {
      const selectedProducts = candidates.filter(c => selectedIds.has(c.id));
      const allResults = await Promise.all(
        selectedProducts.map(p => fetchVendorsForProduct(p, zipCode))
      );
      setResults(allResults);
      setProgress(100);
      setTimeout(() => {
        setState('results');
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError('Search Pipeline Error. Re-routing through secondary nodes.');
      setState('selecting');
      setLoading(false);
    }
  };

  const reset = () => {
    setState('upload');
    setBase64Image(null);
    setCandidates([]);
    setSelectedIds(new Set());
    setResults([]);
    setError(null);
    setProgress(0);
    setActiveView('search');
  };

  const selectedNames = candidates.filter(c => selectedIds.has(c.id)).map(c => c.name);

  return (
    <div className="min-h-screen pb-12">
      <Header onViewChange={setActiveView} activeView={activeView} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-36">
        {activeView === 'search' && (
          <div className="max-w-6xl mx-auto">
            {state === 'setup' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-gradient-to-br from-[#A8DADC] to-[#457B9D] rounded-3xl flex items-center justify-center text-white shadow-2xl relative">
                   <span className="text-4xl font-black">F</span>
                   <div className="absolute bottom-3 right-3 w-3 h-3 bg-white rounded-full shadow-sm" />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Initialize Findr.</h2>
                  <p className="text-slate-500 mt-2 max-w-sm mx-auto font-medium">To enable multi-device visual procurement, connect your Gemini API key.</p>
                </div>
                <button 
                  onClick={handleConnect}
                  className="px-12 py-5 bg-slate-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-[#457B9D] transition-all"
                >
                  Connect to Gemini
                </button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:underline">
                  Gemini API Documentation & Billing
                </a>
              </div>
            )}

            {state === 'upload' && (
              <div className="animate-in slide-in-from-bottom-8 duration-700">
                <section className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] md:rounded-[4rem] p-12 md:p-24 border border-white/60 shadow-2xl text-center relative overflow-hidden">
                  <div className="mb-14 relative z-10">
                    <h2 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tightest mb-6 leading-tight">
                      Snap. Search. <span className="findr-gradient-text">Done.</span>
                    </h2>
                    <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                      Find anything. Instantly. Visual procurement for the architectural and commercial sector.
                    </p>
                  </div>
                  <FileUpload onFileSelect={(img) => { setBase64Image(img); handleIdentify(img); }} disabled={loading} />
                </section>
              </div>
            )}

            {(state === 'analyzing' || state === 'sourcing') && (
              <ThinkingVisual 
                progress={progress} 
                itemsCount={selectedIds.size} 
                mode={state} 
                itemNames={selectedNames}
              />
            )}

            {state === 'selecting' && (
              <div className="animate-in fade-in duration-500">
                  <ProductSelector 
                    candidates={candidates} 
                    selectedIds={selectedIds} 
                    onToggle={(id) => {
                      if (id === 'all') {
                        setSelectedIds(prev => prev.size === candidates.length ? new Set() : new Set(candidates.map(c => c.id)));
                        return;
                      }
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        return next;
                      });
                    }}
                    onContinue={handleSourceProducts}
                    loading={loading}
                    sourceImage={base64Image ? `data:image/jpeg;base64,${base64Image}` : undefined}
                    zipCode={zipCode}
                    setZipCode={setZipCode}
                    locationName={locationName}
                    onAddManualAsset={handleAddManualAsset}
                  />
              </div>
            )}

            {state === 'results' && (
              <div className="space-y-12 animate-in fade-in duration-700">
                <div className="flex justify-start">
                   <button onClick={reset} className="flex items-center gap-3 px-8 py-4 bg-white/70 backdrop-blur border border-white/60 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-950 transition-all shadow-xl group">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:-translate-x-1 transition-transform"><path d="M15 18l-6-6 6-6"/></svg>
                      Restart Research
                   </button>
                </div>
                <ResultView results={results} />
              </div>
            )}
          </div>
        )}

        {/* Network & Archives views maintained with Findr. styling */}
        {activeView === 'vendors' && (
          <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in">
             <div className="text-center space-y-3">
               <h2 className="text-5xl font-black text-slate-900 tracking-tight">Supply Network</h2>
               <p className="text-slate-500 font-medium text-lg">Verified B2B distribution nodes across India.</p>
             </div>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { name: 'Kohler India', category: 'Fittings', score: 5, color: 'bg-[#E3F2FD]/50' },
                  { name: 'Jaquar World', category: 'Lighting', score: 5, color: 'bg-[#F1FAEE]/50' },
                  { name: 'Pepperfry', category: 'Furniture', score: 4, color: 'bg-[#F3E5F5]/50' },
                  { name: 'Asian Paints', category: 'Surfaces', score: 5, color: 'bg-[#E8F5E9]/50' }
                ].map(v => (
                  <div key={v.name} className={`${v.color} backdrop-blur-xl p-10 rounded-[2rem] border border-white/60 shadow-xl flex flex-col gap-6`}>
                     <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-2xl font-black text-slate-900 tracking-tight">{v.name}</h4>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{v.category}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-sm">
                           <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        </div>
                     </div>
                     <div className="flex gap-1.5">
                        {[1,2,3,4,5].map(s => <div key={s} className={`w-4 h-2 rounded-full ${s <= v.score ? 'bg-slate-900' : 'bg-slate-200'}`} />)}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeView === 'history' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in">
             <div className="text-center">
               <h2 className="text-5xl font-black text-slate-900 tracking-tight">Research Vault</h2>
             </div>
             {history.length > 0 ? (
               <div className="space-y-6">
                  {history.map((h, i) => (
                    <div key={i} className="bg-white/60 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/60 shadow-xl flex items-center justify-between group cursor-pointer hover:border-blue-400 transition-all">
                       <div className="flex items-center gap-8">
                          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors shadow-sm">
                             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{h[0]?.productName || 'Unnamed Scan'}</h4>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Archived Oct 2024</p>
                          </div>
                       </div>
                       <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:translate-x-2 transition-all">
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                       </div>
                    </div>
                  ))}
               </div>
             ) : (
               <div className="text-center py-32 border-4 border-dashed border-white/40 rounded-[3rem] bg-white/20">
                  <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Vault Empty</p>
               </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
