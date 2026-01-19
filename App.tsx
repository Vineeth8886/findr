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
  const [isCriticalError, setIsCriticalError] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  // Network State
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkCategory, setNetworkCategory] = useState('All');
  const [networkSort, setNetworkSort] = useState<'name' | 'category' | 'region'>('name');

  const [history, setHistory] = useState<ProductResult[][]>(() => {
    const saved = localStorage.getItem('findr_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Massive Industrial Supply Network Dataset
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
    { id: 'ND-010', name: 'UltraTech', category: 'Materials', region: 'Tier-1 Network', status: 'Active', specialty: 'Concrete Solutions', color: 'bg-amber-600' },
    { id: 'ND-011', name: 'Godrej Interio', category: 'Furniture', region: 'Central Hub', status: 'Active', specialty: 'Industrial Storage', color: 'bg-slate-700' },
    { id: 'ND-012', name: 'Philips Prof.', category: 'Lighting', region: 'Global', status: 'Active', specialty: 'Connected Luminaires', color: 'bg-blue-500' },
    { id: 'ND-013', name: 'Legrand B2B', category: 'Electrical', region: 'Industrial Zone', status: 'Active', specialty: 'Smart Controls', color: 'bg-red-700' },
    { id: 'ND-014', name: 'ABB Robotics', category: 'Automation', region: 'Manufacturing', status: 'Active', specialty: 'Power Grids', color: 'bg-red-600' },
    { id: 'ND-015', name: 'Siemens Indust.', category: 'Automation', region: 'Global', status: 'Active', specialty: 'Digital Twin Tech', color: 'bg-teal-600' },
    { id: 'ND-016', name: 'Polycab India', category: 'Electrical', region: 'National', status: 'Active', specialty: 'Cables & Wires', color: 'bg-blue-900' },
    { id: 'ND-017', name: 'Hafele Home', category: 'Hardware', region: 'West Hub', status: 'Active', specialty: 'German Engineering', color: 'bg-red-900' },
    { id: 'ND-018', name: 'Dormakaba', category: 'Access Control', region: 'National', status: 'Active', specialty: 'Security Entrances', color: 'bg-slate-800' },
    { id: 'ND-019', name: 'Herman Miller', category: 'Furniture', region: 'Global Node', status: 'Active', specialty: 'Ergonomic Design', color: 'bg-red-600' },
    { id: 'ND-020', name: 'Steelcase', category: 'Furniture', region: 'Regional Hub', status: 'Active', specialty: 'Learning Spaces', color: 'bg-blue-600' },
    { id: 'ND-021', name: 'JSW Steel', category: 'Steel', region: 'Manufacturing', status: 'Active', specialty: 'Coated Products', color: 'bg-blue-700' },
    { id: 'ND-022', name: 'ACC Concrete', category: 'Materials', region: 'National', status: 'Active', specialty: 'Cement Nodes', color: 'bg-amber-700' },
    { id: 'ND-023', name: 'Berger Paints', category: 'Coatings', region: 'Regional Hub', status: 'Active', specialty: 'Architectural Finishes', color: 'bg-emerald-700' },
    { id: 'ND-024', name: 'Dulux Prof.', category: 'Coatings', region: 'Global', status: 'Active', specialty: 'Specialist Paints', color: 'bg-blue-600' },
    { id: 'ND-025', name: 'Daikin HVAC', category: 'HVAC', region: 'National', status: 'Active', specialty: 'Variable Refrigerant', color: 'bg-blue-400' },
    { id: 'ND-026', name: 'Blue Star', category: 'HVAC', region: 'Industrial Zone', status: 'Active', specialty: 'Cold Storage', color: 'bg-blue-900' },
    { id: 'ND-027', name: 'Voltas B2B', category: 'HVAC', region: 'National', status: 'Active', specialty: 'Central Cooling', color: 'bg-slate-700' },
    { id: 'ND-028', name: 'Honeywell', category: 'Automation', region: 'Global Node', status: 'Active', specialty: 'Fire & Safety', color: 'bg-red-600' },
    { id: 'ND-029', name: 'Johnson Cont.', category: 'Automation', region: 'Manufacturing', status: 'Active', specialty: 'Building Efficiency', color: 'bg-blue-800' },
    { id: 'ND-030', name: 'Bosch Indust.', category: 'Automation', region: 'Global', status: 'Active', specialty: 'Security Systems', color: 'bg-red-600' },
    { id: 'ND-031', name: 'Hindware', category: 'Sanitaryware', region: 'National', status: 'Active', specialty: 'Commercial Bath', color: 'bg-slate-900' },
    { id: 'ND-032', name: 'Roca India', category: 'Sanitaryware', region: 'Regional Hub', status: 'Active', specialty: 'Sustainable Ceramics', color: 'bg-blue-900' },
    { id: 'ND-033', name: 'Cera Glass', category: 'Sanitaryware', region: 'Manufacturing', status: 'Active', specialty: 'Italian Collection', color: 'bg-emerald-600' },
    { id: 'ND-034', name: 'Ambuja Cement', category: 'Materials', region: 'National', status: 'Active', specialty: 'Sustainable Build', color: 'bg-blue-800' },
    { id: 'ND-035', name: 'Pidilite B2B', category: 'Chemicals', region: 'Pan-India', status: 'Active', specialty: 'Adhesives & Sealants', color: 'bg-blue-600' },
    { id: 'ND-036', name: 'Kajaria Prof.', category: 'Surfaces', region: 'Manufacturing', status: 'Active', specialty: 'Vitrified Tiles', color: 'bg-red-800' },
    { id: 'ND-037', name: 'Somany Ceramics', category: 'Surfaces', region: 'Regional Hub', status: 'Active', specialty: 'Slip Resistant Tech', color: 'bg-blue-900' },
    { id: 'ND-038', name: 'Armstrong World', category: 'Surfaces', region: 'Global', status: 'Active', specialty: 'Ceiling Systems', color: 'bg-blue-700' },
    { id: 'ND-039', name: 'Knoll Office', category: 'Furniture', region: 'Global Node', status: 'Active', specialty: 'Modernist Design', color: 'bg-slate-900' },
    { id: 'ND-040', name: 'Fosroc Indust.', category: 'Chemicals', region: 'Global', status: 'Active', specialty: 'Concrete Repair', color: 'bg-blue-600' }
  ], []);

  const filteredNetwork = useMemo(() => {
    let result = [...supplyNetwork];
    
    if (networkSearch) {
      result = result.filter(v => 
        v.name.toLowerCase().includes(networkSearch.toLowerCase()) || 
        v.specialty.toLowerCase().includes(networkSearch.toLowerCase())
      );
    }
    
    if (networkCategory !== 'All') {
      result = result.filter(v => v.category === networkCategory);
    }
    
    result.sort((a, b) => {
      const valA = a[networkSort].toLowerCase();
      const valB = b[networkSort].toLowerCase();
      return valA < valB ? -1 : valA > valB ? 1 : 0;
    });
    
    return result;
  }, [supplyNetwork, networkSearch, networkCategory, networkSort]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(supplyNetwork.map(v => v.category))).sort()], [supplyNetwork]);

  useEffect(() => {
    const checkKey = async () => {
      if (process.env.API_KEY && process.env.API_KEY.trim() !== "") {
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
      await window.aistudio.openSelectKey();
      setState('upload');
      setError(null);
      setIsCriticalError(false);
    } else {
      setError("AI Studio environment not detected. Please set process.env.API_KEY.");
    }
  };

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  const handleApplyVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setShowVerifyModal(false);
    showToast("Verification application submitted to Findr Registry.", "success");
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
    let timeout: number;
    if (loading && progress < 99) {
      const run = () => {
        setProgress(prev => {
          let inc = prev < 20 ? 5 : prev < 50 ? 1.5 : 0.4;
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
      setTimeout(() => { setState('selecting'); setLoading(false); }, 800);
    } catch (err: any) {
      console.error(err);
      setIsCriticalError(true);
      if (err.message === 'INVALID_KEY') {
        setError("API Key Missing or Invalid. Please re-connect with a valid paid project key.");
        setState('setup');
      } else {
        setError(`Neural Error: ${err.message || "Network Timeout"}`);
        setState('upload');
      }
      setLoading(false);
    }
  };

  const handleSourceProducts = async () => {
    if (!zipCode || zipCode.length < 6) { setError('6-digit Pincode required.'); return; }
    setLoading(true);
    setError(null);
    setIsCriticalError(false);
    setState('sourcing');
    setProgress(5);
    try {
      const selectedProducts = candidates.filter(c => selectedIds.has(c.id));
      const allResults = await Promise.all(selectedProducts.map(p => fetchVendorsForProduct(p, zipCode)));
      setResults(allResults);
      setProgress(100);
      setTimeout(() => { setState('results'); setLoading(false); }, 800);
    } catch (err: any) {
      console.error(err);
      setIsCriticalError(true);
      if (err.message === 'QUOTA_EXCEEDED') {
        setError("Search Quota Reached. Use the Manual Search Bridge below.");
      } else if (err.message === 'INVALID_KEY') {
        setError("Authentication Failed. Re-connect required.");
        setState('setup');
      } else {
        setError(`Sourcing Failed: ${err.message || "Network Failure"}`);
      }
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
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-4">
          <div className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
             <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
             {toast.message}
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 md:p-14 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <button onClick={() => setShowVerifyModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="space-y-2">
                   <h3 className="text-3xl font-black text-slate-900 tracking-tightest uppercase">Join the Network</h3>
                   <p className="text-slate-500 font-medium leading-relaxed">Submit your manufacturing node for neural verification to bypass standard retail listing fees.</p>
                </div>
                <form onSubmit={handleApplyVerification} className="space-y-4">
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Name</label>
                     <input required type="text" placeholder="e.g., UltraFab Manufacturing Ltd." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-bold outline-none focus:border-blue-500 transition-all" />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Identification</label>
                     <input required type="text" placeholder="Enter valid GSTIN" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 font-bold outline-none focus:border-blue-500 transition-all uppercase" />
                   </div>
                   <div className="pt-4 flex gap-3">
                     <button type="button" onClick={() => setShowVerifyModal(false)} className="flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Discard</button>
                     <button type="submit" className="flex-1 py-5 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">Verify Node</button>
                   </div>
                </form>
             </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-36">
        {activeView === 'search' && (
          <div className="max-w-6xl mx-auto">
            {state === 'setup' && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-gradient-to-br from-[#A8DADC] to-[#457B9D] rounded-3xl flex items-center justify-center text-white shadow-2xl relative">
                   <span className="text-4xl font-black">F</span>
                   <div className="absolute bottom-3 right-3 w-3 h-3 bg-white rounded-full shadow-sm" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Authentication Required</h2>
                  <p className="text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">Please connect a valid Gemini API key from a <b>paid GCP project</b> to enable high-volume procurement tools.</p>
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:underline">View Billing Requirements</a>
                </div>
                <button onClick={handleConnect} className="px-12 py-5 bg-slate-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-[#457B9D] transition-all">Connect to Gemini</button>
              </div>
            )}

            {state === 'upload' && (
              <div className="animate-in slide-in-from-bottom-8 duration-700">
                <section className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] md:rounded-[4rem] p-12 md:p-24 border border-white/60 shadow-2xl text-center relative overflow-hidden">
                  <div className="mb-14 relative z-10">
                    <h2 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tightest mb-6 leading-tight">Snap. Search. <span className="findr-gradient-text">Done.</span></h2>
                    <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">Find anything. Instantly. Visual procurement for the architectural and commercial sector.</p>
                  </div>
                  <FileUpload onFileSelect={(img) => { setBase64Image(img); handleIdentify(img); }} disabled={loading} />
                </section>
              </div>
            )}

            {(state === 'analyzing' || state === 'sourcing') && (
              <ThinkingVisual progress={progress} itemsCount={selectedIds.size} mode={state} itemNames={selectedNames} />
            )}

            {state === 'selecting' && (
              <ProductSelector 
                candidates={candidates} selectedIds={selectedIds} onToggle={(id) => setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
                onContinue={handleSourceProducts} loading={loading} sourceImage={base64Image ? `data:image/jpeg;base64,${base64Image}` : undefined}
                zipCode={zipCode} setZipCode={setZipCode} locationName={locationName}
                onAddManualAsset={(name, desc, tier, box) => {
                  const id = `man-${Date.now()}`;
                  setCandidates(prev => [...prev, { id, name, description: desc, category: 'Generic', tier, boundingBox: box }]);
                  setSelectedIds(prev => new Set(prev).add(id));
                }}
              />
            )}

            {state === 'results' && (
              <div className="space-y-12 animate-in fade-in duration-700">
                <button onClick={reset} className="flex items-center gap-3 px-8 py-4 bg-white/70 backdrop-blur border border-white/60 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-950 transition-all shadow-xl group">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:-translate-x-1 transition-transform"><path d="M15 18l-6-6 6-6"/></svg>New Research
                </button>
                <ResultView results={results} />
              </div>
            )}
          </div>
        )}
        
        {/* Expanded Supply Network View with Logos & Sorting */}
        {activeView === 'vendors' && (
          <div className="max-w-6xl mx-auto space-y-12 py-12 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tightest uppercase">Supply Network</h2>
              <p className="text-slate-500 font-medium text-lg md:text-xl max-w-2xl mx-auto">A global grid of verified industrial manufacturing and B2B distribution nodes.</p>
            </div>

            {/* Filter & Sort Bar */}
            <div className="bg-white/80 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white shadow-xl flex flex-col md:flex-row items-stretch md:items-center gap-4 sticky top-28 z-[60]">
               <div className="flex-1 relative">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                 <input 
                  type="text" value={networkSearch} onChange={(e) => setNetworkSearch(e.target.value)}
                  placeholder="Filter nodes..." 
                  className="w-full bg-slate-50/50 border-2 border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                 />
               </div>
               
               <div className="flex gap-3">
                 <select 
                   value={networkCategory} onChange={(e) => setNetworkCategory(e.target.value)}
                   className="bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                 >
                   {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>

                 <select 
                   value={networkSort} onChange={(e) => setNetworkSort(e.target.value as any)}
                   className="bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                 >
                   <option value="name">Sort: Name</option>
                   <option value="category">Sort: Category</option>
                   <option value="region">Sort: Region</option>
                 </select>
               </div>
            </div>

            {/* Vendor Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNetwork.map(v => (
                <div key={v.id} className="group bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all relative overflow-hidden">
                  <div className="flex items-start gap-5">
                    {/* Simulated Brand Logo */}
                    <div className={`w-16 h-16 ${v.color} rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                       <span className="text-2xl font-black tracking-tighter">{v.name.substring(0, 2).toUpperCase()}</span>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest px-2 py-0.5 bg-blue-50 rounded-md">{v.region}</span>
                        <span className="text-[8px] font-mono text-slate-300">{v.id}</span>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{v.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.category}</p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                     <div className="space-y-0.5">
                       <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block">Main Speciality</span>
                       <span className="text-xs font-bold text-slate-600 italic">"{v.specialty}"</span>
                     </div>
                     <button onClick={() => showToast(`Synchronizing ${v.name} catalog...`)} className="p-3 bg-slate-50 rounded-xl group-hover:bg-slate-950 group-hover:text-white transition-all">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                     </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredNetwork.length === 0 && (
              <div className="py-24 text-center bg-white/40 border-4 border-dashed border-white rounded-[3rem]">
                <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">No matching nodes found in directory.</p>
              </div>
            )}

            <div className="bg-slate-950 text-white p-12 rounded-[3rem] md:rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10">
               <div className="space-y-3 text-center md:text-left">
                  <h3 className="text-3xl font-black tracking-tight">Expand the Grid?</h3>
                  <p className="text-slate-400 font-medium text-lg">Integrate your direct-to-manufacturer ERP with Findr Intelligence.</p>
               </div>
               <button onClick={() => setShowVerifyModal(true)} className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-500 hover:text-white transition-all active:scale-95">
                 Apply for Verification
               </button>
            </div>
          </div>
        )}

        {/* Archives/History Screen */}
        {activeView === 'history' && (
          <div className="max-w-5xl mx-auto space-y-12 py-12 animate-in fade-in duration-700">
             <div className="text-center">
               <h2 className="text-5xl font-black text-slate-900 tracking-tightest uppercase">Research Vault</h2>
               <p className="text-slate-500 font-medium text-lg mt-4">Localized logs of your previous neural procurement cycles.</p>
             </div>
             
             {history.length > 0 ? (
               <div className="grid gap-6">
                 {history.map((h, i) => (
                   <div key={i} onClick={() => { setResults(h); setActiveView('search'); setState('results'); }} className="group bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-xl flex items-center justify-between hover:bg-white transition-all cursor-pointer">
                      <div className="flex items-center gap-6">
                         <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/></svg>
                         </div>
                         <div className="space-y-1">
                           <h4 className="text-xl font-black text-slate-900">{h[0]?.productName || 'Legacy Capture'}</h4>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h.length} Assets Found • India Node</p>
                         </div>
                      </div>
                      <div className="w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="py-32 text-center bg-white/20 border-4 border-dashed border-white rounded-[3rem]">
                  <p className="text-[12px] font-black text-slate-300 uppercase tracking-[0.4em]">Vault Synchronized: 0 Logs</p>
               </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;