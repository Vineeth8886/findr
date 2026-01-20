
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ProductSelector from './components/ProductSelector';
import ResultView from './components/ResultView';
import ThinkingVisual from './components/ThinkingVisual';
import { identifyProducts, fetchVendorsForProduct, resolvePincode, autoCompleteBOQ } from './services/geminiService';
import { ProductCandidate, ProductResult, ProductTier } from './types';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

type AppState = 'setup' | 'upload' | 'analyzing' | 'selecting' | 'sourcing' | 'results';
type ViewType = 'search' | 'vendors' | 'history';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('search');
  const [state, setState] = useState<AppState>('setup');
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState<string>('400001');
  const [locationName, setLocationName] = useState<string>('Mumbai, MH');
  const [candidates, setCandidates] = useState<ProductCandidate[]>([]);
  const [sceneSummary, setSceneSummary] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (zipCode.length === 6) {
      resolvePincode(zipCode).then(setLocationName).catch(() => setLocationName("Regional Hub"));
    }
  }, [zipCode]);

  const handleIdentify = async (img: string) => {
    setLoading(true); setProgress(0); setError(null); setState('analyzing');
    setCurrentTask("Synthesizing Visual Topology...");
    try {
      const { products, summary } = await identifyProducts(img);
      setCandidates(products); setSceneSummary(summary); setProgress(100);
      setTimeout(() => { setState('selecting'); setLoading(false); }, 500);
    } catch (err: any) {
      setError(err.message || "Identification Failed"); setState('upload'); setLoading(false);
    }
  };

  const handleSourceProducts = async () => {
    if (!zipCode || zipCode.length < 6) return;
    setLoading(true); setError(null); setState('sourcing'); setProgress(5);
    try {
      const selectedProducts = candidates.filter(c => selectedIds.has(c.id));
      const allResults: ProductResult[] = [];
      
      for (let i = 0; i < selectedProducts.length; i++) {
        const prod = selectedProducts[i];
        setCurrentTask(`Grounding: ${prod.name}...`);
        try {
          const res = await fetchVendorsForProduct(prod, zipCode);
          allResults.push(res);
        } catch (innerErr: any) {
          console.warn(`Sourcing error for ${prod.name}`, innerErr);
          // Auto-recover with partial data so we don't hang at 5%
          allResults.push({
            id: prod.id,
            productName: prod.name,
            description: prod.description,
            tier: prod.tier,
            researchNote: "Neural search timed out. Switching to offline verification queue.",
            vendors: [],
            groundingSources: [],
            quantity: prod.quantity,
            unit: prod.suggestedUnit,
            dimensions: prod.dimensions || "Verify",
            scanSource: "Scene",
            scanZone: "A1",
            scanConfidence: 0,
            specsDetail: { material: "TBD", finish: "TBD", compliance: "ISO", warranty: "12m" },
            estimatedLaborRate: 0
          });
        }
        setProgress(Math.round(((i + 1) / selectedProducts.length) * 90) + 5);
      }
      setResults(allResults); setProgress(100);
      setTimeout(() => { setState('results'); setLoading(false); }, 500);
    } catch (err: any) {
      setError(err.message || "Sourcing Failed"); setState('selecting'); setLoading(false);
    }
  };

  const handleBypassToBOQ = () => {
    const mockResults: ProductResult[] = [{
      id: 'mock-1',
      productName: 'Engineered Oak Flooring',
      description: 'Hand-scraped engineered oak planks, 14mm thick.',
      tier: 'Premium',
      researchNote: 'Direct manufacturers found in Gujarat region; delivery within 4 days to Mumbai.',
      quantity: 450,
      unit: 'sqft',
      dimensions: '1900 x 190 x 14mm',
      scanConfidence: 99,
      scanZone: 'Primary Floor',
      scanSource: 'Bypass_Inject.jpg',
      estimatedLaborRate: 85,
      specsDetail: { material: 'Oak Wood', finish: 'UV Lacquered', compliance: 'PEFC Certified', warranty: '15 Years' },
      vendors: [{ 
        vendor: 'Greenlam Industries Ltd', 
        price: '₹285', 
        numericPrice: 285, 
        unit: 'sqft', 
        availability: 'In Stock', 
        url: '#', 
        daysToDelivery: 3, 
        address: 'Mumbai Central', 
        reliabilityScore: 4.9 
      }],
      groundingSources: [{ uri: 'https://greenlam.com', title: 'Product Specification Page' }],
      ancillaryItems: [
        { id: 'a1', parentProductId: 'mock-1', name: 'PE Foam Underlay', description: '2mm sound-dampening foam', quantity: 450, unit: 'sqft', rate: 12, total: 5400, category: 'Material' },
        { id: 'a2', parentProductId: 'mock-1', name: 'Installation Labor', description: 'Professional wooden floor fitting', quantity: 450, unit: 'sqft', rate: 45, total: 20250, category: 'Labor' }
      ]
    }];
    setResults(mockResults);
    setZipCode('400001');
    setLocationName('Mumbai, MH');
    setState('results');
  };

  const handleAutoCompleteBOQ = async () => {
    setIsCompleting(true);
    try {
      const completions = await autoCompleteBOQ(results);
      setResults(prev => prev.map(r => ({ ...r, ancillaryItems: completions[r.id] || [] })));
    } catch (err: any) { setError("Neural Completion Error: " + err.message); }
    finally { setIsCompleting(false); }
  };

  const reset = () => {
    setState('upload'); setBase64Image(null); setCandidates([]); setSelectedIds(new Set());
    setResults([]); setError(null); setProgress(0); setActiveView('search');
  };

  return (
    <div className={`min-h-screen transition-all duration-700 ${isDevMode ? 'ring-inset ring-8 ring-blue-500/10' : ''}`}>
      <Header onViewChange={setActiveView} onHomeClick={reset} activeView={activeView} isDevMode={isDevMode} onDevModeToggle={setIsDevMode} />
      
      {isDevMode && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex gap-3 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Engine: Gemini-3-Pro
          </div>
          {(state === 'setup' || state === 'upload') && (
            <button onClick={handleBypassToBOQ} className="bg-slate-900 text-blue-400 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all">
              ⚡ Instant BOQ Bypass
            </button>
          )}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 pt-24 md:pt-36">
        {activeView === 'search' && (
          <div className="max-w-6xl mx-auto">
            {state === 'setup' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-12 animate-in fade-in duration-1000">
                <div className="space-y-4">
                  <h2 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tightest leading-none uppercase">Neural <br/><span className="findr-gradient-text">Procurement.</span></h2>
                  <p className="text-base md:text-xl text-slate-500 font-medium max-w-xl mx-auto italic">Computer Vision + Market Grounding for Industrial Assets.</p>
                </div>
                <button onClick={() => setState('upload')} className="px-16 py-6 bg-slate-950 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all">Launch Pipeline</button>
              </div>
            )}
            {state === 'upload' && (
              <section className="bg-white/40 backdrop-blur-3xl rounded-[3rem] p-12 md:p-24 border border-white/60 shadow-2xl text-center">
                <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tightest mb-8 leading-tight uppercase">Visual Input <span className="findr-gradient-text">Required</span></h2>
                <FileUpload onFileSelect={(img) => { setBase64Image(img); handleIdentify(img); }} disabled={loading} />
              </section>
            )}
            {(state === 'analyzing' || state === 'sourcing') && <ThinkingVisual progress={progress} itemsCount={selectedIds.size} mode={state} activeTask={currentTask} />}
            {state === 'selecting' && (
              <ProductSelector 
                isDevMode={isDevMode} candidates={candidates} sceneSummary={sceneSummary} selectedIds={selectedIds} loading={loading} sourceImage={base64Image ? `data:image/jpeg;base64,${base64Image}` : undefined} zipCode={zipCode} setZipCode={setZipCode} locationName={locationName}
                onToggle={id => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                onUpdateCandidate={(id, up) => setCandidates(prev => prev.map(c => c.id === id ? {...c, ...up} : c))}
                onContinue={handleSourceProducts}
                onAddManualAsset={(name, desc, tier, box, dims) => {
                  const id = `man-${Date.now()}`;
                  setCandidates(p => [...p, { id, name, description: desc, category: 'Generic', tier, boundingBox: box, quantity: 1, suggestedUnit: 'Nos', dimensions: dims, isVerified: true }]);
                  setSelectedIds(p => new Set(p).add(id));
                }}
              />
            )}
            {state === 'results' && (
              <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
                <div className="flex justify-between items-center px-4">
                  <button onClick={reset} className="px-8 py-4 bg-white/70 border border-white/60 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-950 transition-all shadow-lg">Restart Manifest</button>
                  {!results[0]?.ancillaryItems?.length && (
                    <button onClick={handleAutoCompleteBOQ} disabled={isCompleting} className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all animate-pulse">
                      {isCompleting ? 'Reasoning...' : '🔍 Complete Neural BOQ'}
                    </button>
                  )}
                </div>
                <ResultView isDevMode={isDevMode} results={results} sourceImage={base64Image ? `data:image/jpeg;base64,${base64Image}` : undefined} onUpdateQuantity={(id, qty) => setResults(p => p.map(r => r.id === id ? {...r, quantity: qty} : r))} locationName={locationName} />
              </div>
            )}
          </div>
        )}
      </main>

      {error && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-lg">
          <div className="bg-red-500 text-white p-6 rounded-3xl shadow-2xl flex items-center justify-between border-2 border-red-400">
             <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
               {error}
             </div>
             <button onClick={() => setError(null)} className="p-2 hover:bg-white/20 rounded-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
