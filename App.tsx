import React, { useState, useEffect, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ProductSelector from './components/ProductSelector';
import ResultView from './components/ResultView';
import ThinkingVisual from './components/ThinkingVisual';
import { identifyProducts, fetchVendorsForProduct, resolvePincode } from './services/geminiService';
import { ProductCandidate, ProductResult, ProductTier } from './types';

type AppState = 'upload' | 'analyzing' | 'selecting' | 'sourcing' | 'results';
type ViewType = 'search' | 'vendors' | 'history';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('search');
  const [state, setState] = useState<AppState>('upload');
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  
  const [candidates, setCandidates] = useState<ProductCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isCriticalError, setIsCriticalError] = useState(false);

  const [history, setHistory] = useState<ProductResult[][]>(() => {
    const saved = localStorage.getItem('findr_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (results.length > 0 && state === 'results') {
      setHistory(prev => {
        const next = [results, ...prev].slice(0, 10);
        localStorage.setItem('findr_history', JSON.stringify(next));
        return next;
      });
    }
  }, [results, state]);

  // PROGRESS ANIMATION LOGIC
  useEffect(() => {
    let timeout: number;
    if (loading && progress < 99) {
      const run = () => {
        setProgress(prev => {
          let inc = 0.5;
          if (prev < 20) inc = 5;
          else if (prev < 50) inc = 1.5;
          else if (prev < 85) inc = 0.4;
          else inc = 0.05;
          return Math.min(prev + (inc * (Math.random() > 0.1 ? 1 : 0)), 99.5);
        });
        timeout = window.setTimeout(run, 150 + (Math.random() * 200));
      };
      run();
    }
    return () => clearTimeout(timeout);
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
    setIsCriticalError(false);
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
      console.error(err);
      setIsCriticalError(true);
      setError(err.message === 'INVALID_KEY' 
        ? "API Key rejected. Ensure a valid key is set in your environment." 
        : `Analysis Interrupted: ${err.message || "Network Error"}`);
      setState('upload');
      setLoading(false);
    }
  };

  const handleSourceProducts = async () => {
    if (!zipCode || zipCode.length < 6) {
      setError('6-digit Pincode required for logistics routing.');
      return;
    }
    setLoading(true);
    setError(null);
    setIsCriticalError(false);
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
      }, 800);
    } catch (err: any) {
      console.error(err);
      setIsCriticalError(true);
      setError(`Sourcing Failed: ${err.message || "Quota limit or network timeout"}`);
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
    setIsCriticalError(false);
    setProgress(0);
    setActiveView('search');
  };

  const handleManualSearchFallback = () => {
    const products = candidates.filter(c => selectedIds.has(c.id));
    const queries = products.length > 0 
      ? products.map(p => `${p.name} B2B vendors dealers India ${zipCode}`)
      : [`Industrial procurement vendors India ${zipCode}`];
    
    queries.forEach(q => window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank'));
  };

  const selectedNames = candidates.filter(c => selectedIds.has(c.id)).map(c => c.name);

  return (
    <div className="min-h-screen pb-12">
      <Header onViewChange={setActiveView} onHomeClick={reset} activeView={activeView} />
      
      {/* Dynamic Error & Fallback Bridge */}
      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg bg-slate-900 text-white px-6 py-5 rounded-[2rem] shadow-2xl flex flex-col gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">{error}</span>
            </div>
            <button onClick={() => { setError(null); setIsCriticalError(false); }} className="p-2 hover:bg-white/10 rounded-full">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          {isCriticalError && (
            <button 
              onClick={handleManualSearchFallback}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl"
            >
              Bypass AI & Open Manual Search
            </button>
          )}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-36">
        {activeView === 'search' && (
          <div className="max-w-6xl mx-auto">
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
              <ProductSelector 
                candidates={candidates} 
                selectedIds={selectedIds} 
                onToggle={(id) => {
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
                onAddManualAsset={(name, desc, tier, box) => {
                  const id = `man-${Date.now()}`;
                  setCandidates(prev => [...prev, { id, name, description: desc, category: 'Generic', tier, boundingBox: box }]);
                  setSelectedIds(prev => new Set(prev).add(id));
                }}
              />
            )}

            {state === 'results' && (
              <div className="space-y-12 animate-in fade-in duration-700">
                <div className="flex justify-start">
                   <button onClick={reset} className="flex items-center gap-3 px-8 py-4 bg-white/70 backdrop-blur border border-white/60 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-950 transition-all shadow-xl group">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:-translate-x-1 transition-transform"><path d="M15 18l-6-6 6-6"/></svg>
                      New Research
                   </button>
                </div>
                <ResultView results={results} />
              </div>
            )}
          </div>
        )}

        {/* Archives and Network logic remain integrated */}
        {activeView === 'vendors' && (
          <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in">
             <div className="text-center space-y-3">
               <h2 className="text-5xl font-black text-slate-900 tracking-tight">Supply Network</h2>
               <p className="text-slate-500 font-medium text-lg">Verified B2B distribution nodes across India.</p>
             </div>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {['Kohler India', 'Jaquar World', 'Asian Paints'].map(v => (
                  <div key={v} className="bg-white/60 backdrop-blur-xl p-10 rounded-[2rem] border border-white/60 shadow-xl">
                     <h4 className="text-2xl font-black text-slate-900 tracking-tight">{v}</h4>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Verified Distributor</p>
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
                    <div key={i} className="bg-white/60 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/60 shadow-xl flex items-center justify-between group">
                       <h4 className="text-xl font-black text-slate-900">{h[0]?.productName || 'Legacy Scan'}</h4>
                       <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                       </div>
                    </div>
                  ))}
               </div>
             ) : (
               <div className="text-center py-32 bg-white/20 border-4 border-dashed border-white/40 rounded-[3rem]">
                  <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Vault Empty</p>
               </div>
             )}
          </div>
        )}
      </main>
      <Analytics />
    </div>
  );
};

export default App;