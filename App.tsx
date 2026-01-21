
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ProductSelector from './components/ProductSelector';
import ResultView from './components/ResultView';
import ThinkingVisual from './components/ThinkingVisual';
import { identifyProducts, fetchVendorsForProduct, resolvePincode, autoCompleteBOQ } from './services/geminiService';
import { ProductCandidate, ProductResult } from './types';

type AppState = 'setup' | 'upload' | 'analyzing' | 'selecting' | 'sourcing' | 'results';
type ViewType = 'search' | 'vendors' | 'history';

const MOCK_RESULTS: ProductResult[] = [
  {
    id: "mock-1",
    productName: "Ergonomic Mesh Task Chair",
    description: "High-back ergonomic chair with adjustable lumbar support, 4D armrests, and synchro-tilt mechanism. Features high-tensile polyester mesh for breathability and a reinforced nylon base.",
    tier: "Premium",
    researchNote: "Verified at Featherlite Regional Hub (Worli, Mumbai). Matches ISO 9001 quality standards for commercial seating. Nearest showroom is 6km from Fort. Delivery lead time: 3 business days. Pricing includes threshold delivery within city limits.",
    vendors: [
      {
        vendor: "Featherlite Furniture",
        price: "₹18,500",
        numericPrice: 18500,
        unit: "Nos",
        availability: "In Stock",
        url: "https://www.featherlitefurniture.com",
        daysToDelivery: 3,
        address: "Regional Office/Showroom - Worli, Mumbai, MH 400018",
        reliabilityScore: 4.8,
        contactPhone: "+91 22 2490 1234",
        gstNumber: "27AAACF1234A1Z1",
        gstStatus: "Verified",
        isManufacturer: true
      }
    ],
    groundingSources: [{ uri: "https://www.featherlitefurniture.com", title: "Featherlite Official Catalog" }],
    quantity: 12,
    unit: "Nos",
    dimensions: "1200 x 650 x 600 mm",
    scanSource: "Scene_A1",
    scanZone: "Office_Floor",
    scanConfidence: 98,
    specsDetail: { material: "Polyester Mesh / Nylon Frame", finish: "Matte Black", compliance: "BIFMA Level 3 / ISO 9001", warranty: "3 Years" },
    estimatedLaborRate: 450
  },
  {
    id: "mock-2",
    productName: "Modular Workstation Desk (Linear)",
    description: "Linear workstation system with 25mm thick pre-laminated particle board tabletop and powder-coated steel understructure. Includes integrated cable management tray and aluminum grommet.",
    tier: "Standard",
    researchNote: "Sourced from authorized Godrej Interio industrial dealers. Vikhroli node confirmed for bulk stock. Pricing optimized for 'Work-From-Hub' regional clusters. Installation support provided by certified technicians.",
    vendors: [
      {
        vendor: "Godrej Interio",
        price: "₹12,200",
        numericPrice: 12200,
        unit: "Nos",
        availability: "7 Days Lead",
        url: "https://www.godrejinterio.com",
        daysToDelivery: 7,
        address: "Plant 13, Vikhroli (W), Mumbai, MH 400079",
        reliabilityScore: 4.5,
        contactPhone: "+91 22 6796 5678",
        gstNumber: "27GDRJ5678B1Z2",
        gstStatus: "Verified",
        isManufacturer: true
      }
    ],
    groundingSources: [{ uri: "https://www.godrejinterio.com", title: "Godrej B2B Procurement Portal" }],
    quantity: 24,
    unit: "Nos",
    dimensions: "1200 x 600 x 750 mm",
    scanSource: "Scene_A2",
    scanZone: "Open_Office_West",
    scanConfidence: 94,
    specsDetail: { material: "Particle Board / Powder Coated Steel", finish: "Natural Oak / Polar White", compliance: "ISO 14001 / GreenGuard", warranty: "1 Year" },
    estimatedLaborRate: 850
  },
  {
    id: "mock-3",
    productName: "Industrial Pendant Light (Linear)",
    description: "4-foot linear LED pendant light with extruded aluminum housing and high-efficiency diffuser. 4000K neutral white color temperature.",
    tier: "Standard",
    researchNote: "Sourced from Philips Professional Lighting channel. Optimized for commercial high-ceiling environments. Regional distribution center in Bhiwandi provides same-day dispatch for verified B2B partners.",
    vendors: [
      {
        vendor: "Signify India (Philips)",
        price: "₹4,850",
        numericPrice: 4850,
        unit: "Nos",
        availability: "Immediate",
        url: "https://www.lighting.philips.co.in",
        daysToDelivery: 1,
        address: "Bhiwandi Logistics Park, Thane, MH 421302",
        reliabilityScore: 4.9,
        contactPhone: "+91 1800 102 2929",
        gstNumber: "27SIG7890C1Z3",
        gstStatus: "Verified",
        isManufacturer: true
      }
    ],
    groundingSources: [{ uri: "https://www.lighting.philips.co.in", title: "Philips Professional Lighting" }],
    quantity: 15,
    unit: "Nos",
    dimensions: "1200 x 50 x 80 mm",
    scanSource: "Scene_A3",
    scanZone: "Ceiling_Infrastructure",
    scanConfidence: 96,
    specsDetail: { material: "Extruded Aluminum", finish: "Anodized Silver", compliance: "BIS / LM80", warranty: "2 Years" },
    estimatedLaborRate: 350
  }
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('search');
  const [state, setState] = useState<AppState>('results');
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [zipCode, setZipCode] = useState<string>('400001');
  const [locationName, setLocationName] = useState<string>('Fort, Mumbai, MH');
  const [candidates, setCandidates] = useState<ProductCandidate[]>([]);
  const [sceneSummary, setSceneSummary] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(["mock-1", "mock-2", "mock-3"]));
  const [results, setResults] = useState<ProductResult[]>(MOCK_RESULTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState<boolean>(true);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (zipCode.length === 6 && !locationName) {
      resolvePincode(zipCode).then(setLocationName).catch(() => setLocationName("Regional Hub"));
    }
  }, [zipCode]);

  const handleIdentify = async (img: string) => {
    setLoading(true); setProgress(15); setError(null); setState('analyzing');
    setCurrentTask("Synthesizing Input...");
    try {
      const { products, summary } = await identifyProducts(img);
      setCandidates(products); setSceneSummary(summary); setProgress(100);
      setTimeout(() => { setState('selecting'); setLoading(false); }, 800);
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
        setCurrentTask(`Sourcing ${prod.name}...`);
        try {
          const res = await fetchVendorsForProduct(prod, zipCode);
          allResults.push(res);
        } catch (innerErr: any) {
          allResults.push({
            id: prod.id, productName: prod.name, description: prod.description, tier: prod.tier, researchNote: "Switching to offline queue.", vendors: [], groundingSources: [], quantity: prod.quantity, unit: prod.suggestedUnit, dimensions: prod.dimensions || "Verify", scanSource: "Scene", scanZone: "A1", scanConfidence: 0, specsDetail: { material: "TBD", finish: "TBD", compliance: "ISO", warranty: "12m" }, estimatedLaborRate: 0
          });
        }
        setProgress(Math.round(((i + 1) / selectedProducts.length) * 90) + 5);
      }
      setResults(allResults); setProgress(100);
      setTimeout(() => { setState('results'); setLoading(false); }, 800);
    } catch (err: any) {
      setError(err.message || "Sourcing Failed"); setState('selecting'); setLoading(false);
    }
  };

  const handleAutoCompleteBOQ = async () => {
    setIsCompleting(true);
    setCurrentTask("Completing BOQ Lifecycle...");
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
    <div className="min-h-screen transition-all duration-700 bg-white">
      <Header onViewChange={setActiveView} onHomeClick={reset} activeView={activeView} isDevMode={isDevMode} onDevModeToggle={setIsDevMode} />
      
      <main className="max-w-[1400px] mx-auto px-6 pt-32 pb-32">
        {activeView === 'search' && (
          <div className="max-w-6xl mx-auto">
            {state === 'setup' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-12 animate-in fade-in duration-1000">
                <div className="space-y-6">
                  <p className="text-[10px] font-black text-[#F59E0B] uppercase tracking-[0.8em]">Neural Procurement Platform</p>
                  <h2 className="text-7xl md:text-9xl font-black text-[#0F172A] tracking-tightest leading-none uppercase">Findr<span className="text-[#F59E0B]">.</span></h2>
                  <p className="text-lg md:text-2xl text-slate-500 font-medium max-w-xl mx-auto italic tracking-tight">Industrial Sourcing: From Render to Reality.</p>
                </div>
                <button onClick={() => setState('upload')} className="px-20 py-6 bg-[#0F172A] text-white rounded-full font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl hover:bg-[#F59E0B] transition-all hover:scale-105 active:scale-95">Initiate Pipeline</button>
              </div>
            )}
            
            {state === 'upload' && (
              <section className="bg-white rounded-[3rem] p-12 md:p-24 text-center border border-slate-100 shadow-xl transition-all">
                <h2 className="text-6xl md:text-9xl font-black text-[#0F172A] tracking-tightest mb-16 uppercase">Visual <span className="text-[#F59E0B]">Input</span></h2>
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
              <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-1000">
                <ResultView 
                  isDevMode={isDevMode} results={results} sourceImage={base64Image ? `data:image/jpeg;base64,${base64Image}` : undefined} 
                  onUpdateQuantity={(id, qty) => setResults(p => p.map(r => r.id === id ? {...r, quantity: qty} : r))} 
                  locationName={locationName} 
                  onReset={reset}
                  onAutoComplete={handleAutoCompleteBOQ}
                  isCompleting={isCompleting}
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