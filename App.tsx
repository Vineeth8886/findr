
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ProductSelector from './components/ProductSelector';
import ResultView from './components/ResultView';
import ThinkingVisual from './components/ThinkingVisual';
import CommissionView from './components/CommissionView';
import { identifyProducts, fetchVendorsForProduct, resolvePincode, autoCompleteBOQ } from './services/geminiService';
import { ProductCandidate, ProductResult } from './types';

type AppState = 'setup' | 'upload' | 'analyzing' | 'selecting' | 'sourcing' | 'results';
type ViewType = 'search' | 'vendors' | 'commissions';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('search');
  const [state, setState] = useState<AppState>('setup');
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState<string>('400001');
  const [locationName, setLocationName] = useState<string>('Fort, Mumbai, MH');
  const [candidates, setCandidates] = useState<ProductCandidate[]>([]);
  const [sceneSummary, setSceneSummary] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState<boolean>(true);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [vendorStats, setVendorStats] = useState({ searched: 0, verified: 0 });
  const [isCompleting, setIsCompleting] = useState(false);

  // -- CACHE LOGIC --
  useEffect(() => {
    const cachedData = localStorage.getItem('findr_cache_v1');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.results?.length > 0 || parsed.candidates?.length > 0) {
          setResults(parsed.results || []);
          setCandidates(parsed.candidates || []);
          setState(parsed.state || 'setup');
          setZipCode(parsed.zipCode || '400001');
          setLocationName(parsed.locationName || '');
          setBase64Image(parsed.base64Image || null);
          setSelectedIds(new Set(parsed.selectedIds || []));
          setSceneSummary(parsed.sceneSummary || '');
        }
      } catch (e) { console.error("Cache load failed", e); }
    }
  }, []);

  useEffect(() => {
    if (state !== 'setup' && state !== 'upload') {
      const cachePayload = {
        results, candidates, state, zipCode, locationName, base64Image, 
        selectedIds: Array.from(selectedIds), sceneSummary
      };
      try {
        localStorage.setItem('findr_cache_v1', JSON.stringify(cachePayload));
      } catch (e) { console.warn("Cache quota exceeded"); }
    }
  }, [results, candidates, state, zipCode, locationName, base64Image, selectedIds, sceneSummary]);

  // -- PINCODE LOGIC --
  useEffect(() => {
    if (zipCode.length === 6) {
      setLocationName("Locating Node...");
      resolvePincode(zipCode)
        .then(name => setLocationName(name || "Regional Hub Identified"))
        .catch(() => setLocationName("Regional Hub"));
    }
  }, [zipCode]);

  const handleIdentify = async (img: string) => {
    setLoading(true); setProgress(15); setError(null); setState('analyzing');
    setCurrentTask("Synthesizing Input...");

    // DEV MODE: IMMEDIATE OVERRIDE
    if (isDevMode) {
       const syntheticProducts: ProductCandidate[] = [
         { id: 'syn-1', name: 'Executive Desk', description: 'Mahogany finish, L-shape executive desk with integrated cable management.', category: 'Commercial', tier: 'Premium', quantity: 1, suggestedUnit: 'Nos', dimensions: '1800x2000mm', confidence: 95, boundingBox: [300, 200, 700, 800] },
         { id: 'syn-2', name: 'Ergonomic Chair', description: 'High-back mesh chair with lumbar support and chrome base.', category: 'Commercial', tier: 'Standard', quantity: 4, suggestedUnit: 'Nos', dimensions: 'Standard', confidence: 92, boundingBox: [400, 100, 600, 300] }
       ];
       setTimeout(() => {
           setCandidates(syntheticProducts);
           setSelectedIds(new Set(['syn-1', 'syn-2']));
           setSceneSummary("Simulated Office Environment with Executive Furniture.");
           setProgress(100);
           setState('selecting'); 
           setLoading(false);
       }, 1500);
       return;
    }

    try {
      const { products, summary } = await identifyProducts(img);
      
      if (!products || products.length === 0) {
        throw new Error("No identifiable assets found. Try a clearer angle.");
      }

      setCandidates(products); 
      setSceneSummary(summary); 
      setProgress(100);
      
      const highConfIds = new Set(products.filter(p => (p.confidence || 0) > 80).map(p => p.id));
      setSelectedIds(highConfIds.size > 0 ? highConfIds : new Set(products.map(p => p.id)));

      setTimeout(() => { setState('selecting'); setLoading(false); }, 800);
    } catch (err: any) {
      setError(err.message || "Identification Failed"); setState('upload'); setLoading(false);
    }
  };

  const handleSourceProducts = async () => {
    if (!zipCode || zipCode.length < 6) return;
    setLoading(true); setError(null); setState('sourcing'); setProgress(0);
    setVendorStats({ searched: 0, verified: 0 });
    
    // DEV MODE: Simulation
    if (isDevMode) {
      const selectedProducts = candidates.filter(c => selectedIds.has(c.id));
      const activeProducts = selectedProducts.length > 0 ? selectedProducts : candidates.slice(0, 2);
      
      const totalSteps = 100;
      let step = 0;
      
      const interval = setInterval(() => {
        step++;
        const pct = Math.round((step / totalSteps) * 100);
        setProgress(pct);
        
        // Simulate rapid vendor scanning
        const simulatedSearch = Math.floor((step / totalSteps) * 87);
        const simulatedVerified = Math.floor(simulatedSearch * 0.45); 
        
        setVendorStats({ searched: simulatedSearch, verified: simulatedVerified });

        // Cycle through product names for realism
        const prodName = activeProducts[Math.floor((step / 100) * activeProducts.length)]?.name || "Asset";
        setCurrentTask(`Sourcing Live: ${prodName}...`);

        if (step >= totalSteps) {
          clearInterval(interval);
          
          // Generate synthetic results
          const syntheticResults: ProductResult[] = activeProducts.map(p => ({
            id: p.id,
            productName: p.name,
            description: p.description,
            tier: p.tier,
            researchNote: "Synthetic Data: High-volume availability detected in local industrial zones.",
            vendors: [
              { vendor: "Godrej Interio", price: "₹16,500", numericPrice: 16500, unit: "Nos", availability: "In Stock", contactPhone: "+91 22 6796 5656", reliabilityScore: 4.9, address: "Mumbai, MH", isManufacturer: true, url: "https://www.godrejinterio.com", daysToDelivery: 5 },
              { vendor: "Featherlite", price: "₹18,200", numericPrice: 18200, unit: "Nos", availability: "2 Days", contactPhone: "+91 80 4719 7000", reliabilityScore: 4.8, address: "Mumbai, MH", isManufacturer: true, url: "https://featherlitefurniture.com", daysToDelivery: 2 },
              { vendor: "Local Distributor", price: "₹14,000", numericPrice: 14000, unit: "Nos", availability: "Immediate", contactPhone: "+91 98 1234 5678", reliabilityScore: 3.5, address: "Bhiwandi, MH", isManufacturer: false, url: "#", daysToDelivery: 1 }
            ],
            groundingSources: [],
            quantity: p.quantity,
            unit: p.suggestedUnit,
            dimensions: p.dimensions || "Standard",
            specsDetail: { material: "Mixed", finish: "Matte", compliance: "ISO 9001", warranty: "3 Years" },
            estimatedLaborRate: 450,
            scanSource: "Synthetic", scanZone: "Dev", scanConfidence: 100
          }));
          
          setResults(syntheticResults);
          setTimeout(() => { setState('results'); setLoading(false); }, 500);
        }
      }, 50); // 5 seconds
      return;
    }

    // LIVE MODE
    try {
      const selectedProducts = candidates.filter(c => selectedIds.has(c.id));
      let completedCount = 0;
      const total = selectedProducts.length;

      const sourcingPromises = selectedProducts.map(async (prod) => {
        setCurrentTask(`Sourcing Live: ${prod.name}...`);
        try {
          const result = await fetchVendorsForProduct(prod, zipCode);
          completedCount++;
          setProgress(Math.round((completedCount / total) * 100));
          
          setVendorStats(prev => ({
            searched: prev.searched + (result.vendors.length > 0 ? result.vendors.length * 12 : 5), 
            verified: prev.verified + result.vendors.length
          }));

          return result;
        } catch (innerErr: any) {
          completedCount++;
          setProgress(Math.round((completedCount / total) * 100));
          return {
            id: prod.id, productName: prod.name, description: prod.description, tier: prod.tier, 
            researchNote: "Market data unavailable.", vendors: [], groundingSources: [], quantity: prod.quantity, unit: prod.suggestedUnit, dimensions: prod.dimensions || "Verify", scanSource: "Scene", scanZone: "A1", scanConfidence: 0, specsDetail: { material: "TBD", finish: "TBD", compliance: "ISO", warranty: "12m" }, estimatedLaborRate: 0
          } as ProductResult;
        }
      });

      const allResults = await Promise.all(sourcingPromises);
      setResults(allResults); 
      setTimeout(() => { setState('results'); setLoading(false); }, 800);
      
    } catch (err: any) {
      setError(err.message || "Sourcing Failed"); setState('selecting'); setLoading(false);
    }
  };

  const handleAutoCompleteBOQ = async () => {
    setIsCompleting(true);
    setCurrentTask("Completing BOQ Lifecycle...");
    
    if (isDevMode) {
      setTimeout(() => {
        setResults(prev => prev.map(r => ({
           ...r,
           ancillaryItems: [
             { id: `anc-${r.id}-1`, parentProductId: r.id, name: 'Installation Hardware', description: 'Screws, bolts, and fasteners', quantity: 1, unit: 'Set', rate: 250, total: 250, category: 'Material' },
             { id: `anc-${r.id}-2`, parentProductId: r.id, name: 'Assembly Labor', description: 'Skilled technician per unit', quantity: r.quantity, unit: 'Man-Days', rate: 500, total: 500 * r.quantity, category: 'Labor' }
           ]
        })));
        setIsCompleting(false);
      }, 2000);
      return;
    }

    try {
      const completions = await autoCompleteBOQ(results);
      setResults(prev => prev.map(r => ({ ...r, ancillaryItems: completions[r.id] || [] })));
    } catch (err: any) { setError("Neural Completion Error: " + err.message); }
    finally { setIsCompleting(false); }
  };

  const reset = () => {
    localStorage.removeItem('findr_cache_v1');
    setState('setup'); setBase64Image(null); setCandidates([]); setSelectedIds(new Set());
    setResults([]); setError(null); setProgress(0); setActiveView('search');
    setZipCode(''); setLocationName('');
  };

  const handleUpdateResult = (id: string, updates: Partial<ProductResult>) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  return (
    <div className="min-h-screen transition-all duration-700 bg-white">
      <Header onViewChange={setActiveView} onHomeClick={reset} activeView={activeView} isDevMode={isDevMode} onDevModeToggle={setIsDevMode} />
      
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-32">
        {activeView === 'commissions' ? (
           <CommissionView results={results} />
        ) : (
          <div className="max-w-6xl mx-auto">
            {state === 'setup' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 md:space-y-12 animate-in fade-in duration-1000">
                <div className="space-y-4 md:space-y-6">
                  <p className="text-[9px] md:text-[10px] font-black text-[#F59E0B] uppercase tracking-[0.6em] md:tracking-[0.8em]">Neural Procurement Platform</p>
                  <h2 className="text-5xl md:text-9xl font-black text-[#0F172A] tracking-tightest leading-none uppercase">Findr<span className="text-[#F59E0B]">.</span></h2>
                  <p className="text-base md:text-2xl text-slate-500 font-medium max-w-xs md:max-w-xl mx-auto italic tracking-tight">Industrial Sourcing: From Render to Reality.</p>
                </div>
                <button onClick={() => setState('upload')} className="px-12 md:px-20 py-5 md:py-6 bg-[#0F172A] text-white rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] md:tracking-[0.4em] shadow-2xl hover:bg-[#F59E0B] transition-all hover:scale-105 active:scale-95">Initiate Pipeline</button>
              </div>
            )}
            
            {state === 'upload' && (
              <section className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-24 text-center border border-slate-100 shadow-xl transition-all relative">
                 {error && (
                   <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-lg animate-bounce border border-red-100 w-max max-w-[90%] truncate">
                     {error}
                   </div>
                 )}
                <h2 className="text-5xl md:text-9xl font-black text-[#0F172A] tracking-tightest mb-8 md:mb-16 uppercase">Visual <span className="text-[#F59E0B]">Input</span></h2>
                <FileUpload onFileSelect={(img) => { setBase64Image(img); handleIdentify(img); }} disabled={loading} />
              </section>
            )}

            {(state === 'analyzing' || state === 'sourcing') && (
              <ThinkingVisual 
                progress={progress} 
                itemsCount={selectedIds.size} 
                mode={state} 
                activeTask={currentTask} 
                vendorStats={vendorStats}
              />
            )}

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
              <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-1000">
                <ResultView 
                  isDevMode={isDevMode} results={results} sourceImage={base64Image ? `data:image/jpeg;base64,${base64Image}` : undefined} 
                  onUpdateQuantity={(id, qty) => handleUpdateResult(id, { quantity: qty })} 
                  locationName={locationName} 
                  onReset={reset}
                  onAutoComplete={handleAutoCompleteBOQ}
                  isCompleting={isCompleting}
                  onUpdateResult={handleUpdateResult}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
