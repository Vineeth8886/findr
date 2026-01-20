
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ProductSelector from './components/ProductSelector';
import ResultView from './components/ResultView';
import ThinkingVisual from './components/ThinkingVisual';
import { identifyProducts, fetchVendorsForProduct, resolvePincode } from './services/geminiService';
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

interface NetworkVendor {
  id: string;
  name: string;
  category: string;
  region: string;
  status: 'Active' | 'Pending' | 'Offline';
  specialty: string;
  color: string;
}

const MOCK_RESULTS: ProductResult[] = [
  {
    id: 'mock-1',
    productName: 'Architectural Lattice Canopy Module',
    description: 'Custom-engineered octagonal canopy with a lattice top, integrated lighting, and support pillar with geometric metal screens.',
    tier: 'Luxury',
    researchNote: 'High-fidelity architectural component. Structural MS frame with Grade A Teak wood lattice. Verified fabrication network in Hyderabad/Bangalore.',
    vendors: [
      { vendor: 'Kinetics Industrial', price: '₹48,500', numericPrice: 48500, unit: 'Nos', availability: 'In Stock', url: '#', daysToDelivery: 7, address: 'Plot 42, Jeedimetla Industrial Area, Hyderabad', deliveryDate: '7 Days', reliabilityScore: 4.8 },
      { vendor: 'Global Arch Tech', price: '₹52,000', numericPrice: 52000, unit: 'Nos', availability: 'Limited Stock', url: '#', daysToDelivery: 12, address: 'Phase III, Whitefield, Bangalore', deliveryDate: '12 Days', reliabilityScore: 4.2 },
      { vendor: 'Urban Fabrication Hub', price: '₹46,800', numericPrice: 46800, unit: 'Nos', availability: 'Backordered', url: '#', daysToDelivery: 21, address: 'Kengeri Industrial Estate, Bangalore', deliveryDate: '21 Days', reliabilityScore: 4.6 }
    ],
    groundingSources: [{ title: 'Architectural Standards Guide', uri: '#' }],
    quantity: 1,
    unit: 'Nos',
    dimensions: '12ft Ø x 10ft H',
    boundingBox: [100, 100, 400, 400],
    // Removed non-existent property 'drawingRef' to fix TypeScript error and match ProductResult interface.
    scanSource: "Primary_Render.jpg",
    scanZone: "Upper-Left",
    scanConfidence: 98,
    specsDetail: { 
      material: 'MS Structural Frame / Grade A CP Teak Lattice', 
      finish: 'Polyurethane (Asian Paints) / 2-Coat Powder Coating (Jet Black)', 
      compliance: 'IS 800 (Structural) / IS 4970 (Timber)',
      // Added missing warranty property to satisfy DetailedSpecs interface
      warranty: '24 Months'
    },
    estimatedLaborRate: 14550 // ~30% of material
  },
  {
    id: 'mock-2',
    productName: 'Rectangular Solid Wood Dining Table',
    description: 'Commercial-grade rectangular dining table crafted from solid Sheesham wood, sized for four-person seating.',
    tier: 'Premium',
    researchNote: 'Durable commercial grade finish. Sourced via high-volume furniture manufacturers. 45mm thick top.',
    vendors: [
      { vendor: 'Spaze Commercial', price: '₹17,800', numericPrice: 17800, unit: 'Nos', availability: 'In Stock', url: '#', daysToDelivery: 3, address: 'Gachibowli, Hyderabad', deliveryDate: '3 Days', reliabilityScore: 4.5 },
      { vendor: 'Hometown B2B', price: '₹19,200', numericPrice: 19200, unit: 'Nos', availability: 'In Stock', url: '#', daysToDelivery: 5, address: 'Banjara Hills, Hyderabad', deliveryDate: '5 Days', reliabilityScore: 4.1 },
      { vendor: 'IndiaMART Verified', price: '₹16,500', numericPrice: 16500, unit: 'Nos', availability: 'Backordered', url: '#', daysToDelivery: 14, address: 'MIDC, Pune', deliveryDate: '14 Days', reliabilityScore: 3.9 }
    ],
    groundingSources: [{ title: 'B2B Furniture Index', uri: '#' }],
    quantity: 3,
    unit: 'Nos',
    dimensions: '4.5ft L x 3ft W x 2.5ft H',
    boundingBox: [500, 100, 800, 500],
    // Removed non-existent property 'drawingRef' to fix TypeScript error and match ProductResult interface.
    scanSource: "Primary_Render.jpg",
    scanZone: "Center-Left",
    scanConfidence: 96,
    specsDetail: { 
      material: 'Solid Sheesham (Moisture content <12%)', 
      finish: 'Melamine Matt Finish (ICA Pidilite)', 
      compliance: 'Commercial Grade / FSC Certified Wood',
      // Added missing warranty property to satisfy DetailedSpecs interface
      warranty: '12 Months'
    },
    estimatedLaborRate: 3560 // ~20% for commercial assembly
  }
];

const App: React.FC = () => {
  const getInitialSession = () => {
    const data = localStorage.getItem('findr_current_session');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  };

  const initialSession = getInitialSession();

  const [activeView, setActiveView] = useState<ViewType>(initialSession?.activeView || 'search');
  const [state, setState] = useState<AppState>(
    initialSession?.results?.length > 0 ? 'results' : (initialSession?.state || 'setup')
  );
  
  const [base64Image, setBase64Image] = useState<string | null>(initialSession?.base64Image || null);
  const [zipCode, setZipCode] = useState<string>(initialSession?.zipCode || '');
  const [locationName, setLocationName] = useState<string>(initialSession?.locationName || '');
  
  const [candidates, setCandidates] = useState<ProductCandidate[]>(initialSession?.candidates || []);
  const [sceneSummary, setSceneSummary] = useState<string>(initialSession?.sceneSummary || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSession?.selectedIds || []));
  
  const [results, setResults] = useState<ProductResult[]>(initialSession?.results || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  
  useEffect(() => {
    const sessionData = {
      activeView,
      state,
      base64Image,
      zipCode,
      locationName,
      candidates,
      sceneSummary,
      selectedIds: Array.from(selectedIds),
      results
    };
    localStorage.setItem('findr_current_session', JSON.stringify(sessionData));
  }, [activeView, state, base64Image, zipCode, locationName, candidates, sceneSummary, selectedIds, results]);

  const [history, setHistory] = useState<ProductResult[][]>(() => {
    const saved = localStorage.getItem('findr_history');
    return saved ? JSON.parse(saved) : [];
  });

  const supplyNetwork: NetworkVendor[] = useMemo(() => [
    { id: 'ND-001', name: 'Kohler B2B', category: 'Sanitaryware', region: 'Pan-India', status: 'Active', specialty: 'Luxury Fixtures', color: 'bg-slate-900' },
    { id: 'ND-002', name: 'Jaquar Industrial', category: 'Bath & Lighting', region: 'Regional Hub', status: 'Active', specialty: 'Faucets & Spas', color: 'bg-blue-900' },
    { id: 'ND-003', name: 'Asian Paints', category: 'Coatings', region: 'Global', status: 'Active', specialty: 'Industrial Finishes', color: 'bg-red-800' },
    { id: 'ND-004', name: 'Hettich Solutions', category: 'Hardware', region: 'Industrial Zone', status: 'Active', specialty: 'Precision Fittings', color: 'bg-blue-600' },
    { id: 'ND-005', name: 'Saint-Gobain', category: 'Glass & Gypsum', region: 'Manufacturing', status: 'Active', specialty: 'Acoustic Ceilings', color: 'bg-indigo-700' },
    { id: 'ND-006', name: 'Havells Prof.', category: 'Electrical', region: 'Pan-India', status: 'Active', specialty: 'Switchgear', color: 'bg-red-600' },
    { id: 'ND-007', name: 'Tata Steel', category: 'Steel', region: 'National', status: 'Active', specialty: 'Pre-fab Structures', color: 'bg-blue-800' },
    { id: 'ND-008', name: 'Schneider Electric', category: 'Automation', region: 'Global Node', status: 'Active', specialty: 'Grid Management', color: 'bg-emerald-600' },
    { id: 'ND-009', name: 'Ebco Hardware', category: 'Hardware', region: 'West Hub', status: 'Active', specialty: 'Office Solutions', color: 'bg-orange-600' },
    { id: 'ND-010', name: 'UltraTech', category: 'Materials', region: 'Tier-1 Network', status: 'Active', specialty: 'Concrete Solutions', color: 'bg-amber-600' }
  ], []);

  useEffect(() => {
    const checkKey = async () => {
      if (state !== 'setup' && state !== 'upload') return;
      if (process.env.API_KEY && process.env.API_KEY.trim() !== "") {
        if (state === 'setup') setState('upload');
      } else if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey && state === 'setup') setState('upload');
      }
    };
    checkKey();
  }, [state]);

  const handleConnect = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setState('upload');
      setError(null);
    }
  };

  useEffect(() => {
    if (results.length > 0 && state === 'results') {
      setHistory(prev => {
        const exists = prev.some(h => JSON.stringify(h) === JSON.stringify(results));
        if (exists) return prev;
        const next = [results, ...prev].slice(0, 10);
        localStorage.setItem('findr_history', JSON.stringify(next));
        return next;
      });
    }
  }, [results, state]);

  useEffect(() => {
    let timeout: number;
    if (loading && progress < 99) {
      const run = () => {
        setProgress(prev => Math.min(prev + (Math.random() * 2), 99.5));
        timeout = window.setTimeout(run, 200);
      };
      run();
    }
    return () => clearTimeout(timeout);
  }, [loading, progress]);

  useEffect(() => {
    if (zipCode.length === 6) {
      resolvePincode(zipCode).then(setLocationName).catch(() => setLocationName("Regional Hub"));
    }
  }, [zipCode]);

  const handleIdentify = async (img: string) => {
    setLoading(true);
    setProgress(0);
    setError(null);
    setState('analyzing');
    try {
      const { products, summary } = await identifyProducts(img);
      setCandidates(products);
      setSceneSummary(summary);
      setProgress(100);
      setTimeout(() => { setState('selecting'); setLoading(false); }, 800);
    } catch (err: any) {
      setError(err.message || "Identification Failed");
      setState('upload');
      setLoading(false);
    }
  };

  const handleSourceProducts = async () => {
    if (!zipCode || zipCode.length < 6) { return; }
    setLoading(true);
    setError(null);
    setState('sourcing');
    setProgress(5);
    try {
      const selectedProducts = candidates.filter(c => selectedIds.has(c.id));
      const allResults = await Promise.all(selectedProducts.map(p => fetchVendorsForProduct(p, zipCode)));
      setResults(allResults);
      setProgress(100);
      setTimeout(() => { setState('results'); setLoading(false); }, 800);
    } catch (err: any) {
      setError(err.message || "Sourcing Failed");
      setState('selecting');
      setLoading(false);
    }
  };

  const reset = () => {
    localStorage.removeItem('findr_current_session');
    setState('upload');
    setBase64Image(null);
    setCandidates([]);
    setSelectedIds(new Set());
    setResults([]);
    setError(null);
    setProgress(0);
    setActiveView('search');
    setZipCode('');
    setLocationName('');
  };

  const toggleDevMode = (val: boolean) => {
    setIsDevMode(val);
    if (val) {
      setResults(MOCK_RESULTS);
      setState('results');
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <Header 
        onViewChange={setActiveView} 
        onHomeClick={reset} 
        activeView={activeView} 
        isDevMode={isDevMode} 
        onDevModeToggle={toggleDevMode}
      />
      
      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-2xl">
           <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[2rem] shadow-2xl flex flex-col items-center text-center gap-4">
              <p className="text-sm font-black text-slate-900">{error}</p>
              <button onClick={() => setError(null)} className="px-6 py-2 bg-slate-950 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Dismiss</button>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 pt-24 md:pt-36">
        {activeView === 'search' && (
          <div className="max-w-6xl mx-auto">
            {state === 'setup' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Connect Pipeline</h2>
                <button onClick={handleConnect} className="px-12 py-5 bg-slate-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl">Select API Key</button>
              </div>
            )}

            {state === 'upload' && (
              <div className="animate-in slide-in-from-bottom-8 duration-700">
                <section className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] p-12 md:p-24 border border-white/60 shadow-2xl text-center">
                  <h2 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tightest mb-6 leading-tight">Snap. Search.. <span className="findr-gradient-text">Done...</span></h2>
                  <FileUpload onFileSelect={(img) => { setBase64Image(img); handleIdentify(img); }} disabled={loading} />
                </section>
              </div>
            )}

            {(state === 'analyzing' || state === 'sourcing') && (
              <ThinkingVisual progress={progress} itemsCount={selectedIds.size} mode={state} />
            )}

            {state === 'selecting' && (
              <ProductSelector 
                candidates={candidates} sceneSummary={sceneSummary}
                selectedIds={selectedIds} onToggle={(id) => setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
                onContinue={handleSourceProducts} loading={loading} sourceImage={base64Image ? `data:image/jpeg;base64,${base64Image}` : undefined}
                zipCode={zipCode} setZipCode={setZipCode} locationName={locationName}
                onAddManualAsset={(name, desc, tier, box, dims) => {
                  const id = `man-${Date.now()}`;
                  setCandidates(prev => [...prev, { id, name, description: desc, category: 'Generic', tier, boundingBox: box, quantity: 1, suggestedUnit: 'Nos', dimensions: dims }]);
                  setSelectedIds(prev => new Set(prev).add(id));
                }}
              />
            )}

            {state === 'results' && (
              <div className="space-y-12 animate-in fade-in duration-700">
                <button onClick={reset} className="flex items-center gap-3 px-8 py-4 bg-white/70 backdrop-blur border border-white/60 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-950 transition-all shadow-xl">
                  New Session
                </button>
                <ResultView 
                  results={results} 
                  sourceImage={base64Image ? `data:image/jpeg;base64,${base64Image}` : undefined} 
                  onUpdateQuantity={(id, qty) => setResults(prev => prev.map(r => r.id === id ? {...r, quantity: qty} : r))}
                  locationName={locationName}
                />
              </div>
            )}
          </div>
        )}
        
        {activeView === 'vendors' && (
          <div className="space-y-12 pb-32">
             <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tightest uppercase">Supply Network</h2>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {supplyNetwork.map(vendor => (
                <div key={vendor.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-2 h-full ${vendor.color}`} />
                  <h4 className="text-xl font-black text-slate-900">{vendor.name}</h4>
                  <p className="text-xs font-bold text-slate-600 mt-2">{vendor.specialty}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'history' && (
          <div className="space-y-12 pb-32">
            <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tightest uppercase">Archives</h2>
            <div className="space-y-8">
              {history.map((h, i) => (
                <div key={i} className="bg-white/60 rounded-[3rem] p-10 border border-white shadow-2xl flex justify-between items-center">
                  <h4 className="text-2xl font-black text-slate-900">Project #{history.length - i}</h4>
                  <button onClick={() => { setResults(h); setState('results'); setActiveView('search'); }} className="px-10 py-5 bg-slate-950 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest">Open</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
