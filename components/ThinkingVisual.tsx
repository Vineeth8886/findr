import React, { useMemo } from 'react';

interface ThinkingVisualProps {
  progress: number;
  itemsCount: number;
  mode: 'analyzing' | 'sourcing';
  itemNames?: string[];
}

const ThinkingVisual: React.FC<ThinkingVisualProps> = ({ progress, itemsCount, mode }) => {
  // Fine-grained, unique tasks for Analysis (Architecture/Vision)
  const analysisTasks = useMemo(() => [
    { label: 'OPTIC', task: 'Initializing neural weight matrix...' },
    { label: 'OPTIC', task: 'Loading vision transformer (ViT-H/14)...' },
    { label: 'OPTIC', task: 'Calibrating lens distortion parameters...' },
    { label: 'OPTIC', task: 'Normalizing RGB histograms for material accuracy...' },
    { label: 'GEOM', task: 'Generating depth-field spatial estimation...' },
    { label: 'GEOM', task: 'Detecting primary floor-plane geometry...' },
    { label: 'GEOM', task: 'Isolating foreground asset clusters...' },
    { label: 'GEOM', task: 'Analyzing specular highlight reflectivity...' },
    { label: 'TEXTURE', task: 'Segmenting grain textures from stone surfaces...' },
    { label: 'TEXTURE', task: 'Extracting high-frequency edge vectors...' },
    { label: 'SEMANTIC', task: 'Cross-referencing furniture ontology...' },
    { label: 'SEMANTIC', task: 'Estimating dimensions from spatial context...' },
    { label: 'CLASS', task: 'Identifying manufacturer-specific hardware...' },
    { label: 'CLASS', task: 'Calculating material density approximations...' },
    { label: 'CLASS', task: 'Tagging architectural sub-components...' },
    { label: 'CLASS', task: 'Resolving overlapping bounding box hierarchies...' },
    { label: 'SYNTH', task: 'Verifying structural integrity confidence...' },
    { label: 'SYNTH', task: 'Compiling multi-modal asset metadata...' },
    { label: 'SYNTH', task: 'Optimizing identification scores...' },
    { label: 'FINAL', task: 'Structuring procurement-ready payload...' }
  ], []);

  // Fine-grained, unique tasks for Sourcing (Procurement/Logistics)
  const sourcingTasks = useMemo(() => [
    { label: 'GLOBAL', task: 'Initializing B2B search index...' },
    { label: 'GLOBAL', task: 'Authenticating with regional supply APIs...' },
    { label: 'LOCATION', task: 'Injecting regional Pincode parameters...' },
    { label: 'GLOBAL', task: 'Querying global SKU database...' },
    { label: 'MARKET', task: 'Filtering for Indian market availability...' },
    { label: 'MARKET', task: 'Scoping distributor inventory levels...' },
    { label: 'COMPLIANCE', task: 'Verifying GST registration status...' },
    { label: 'PRICING', task: 'Scraping real-time wholesale pricing...' },
    { label: 'PRICING', task: 'Cross-referencing historical price points...' },
    { label: 'PRICING', task: 'Calculating volume discount structures...' },
    { label: 'LOGISTICS', task: 'Analyzing historic lead-time data...' },
    { label: 'LOGISTICS', task: 'Estimating regional transit windows...' },
    { label: 'VETTING', task: 'Validating vendor reliability ratings...' },
    { label: 'LOGISTICS', task: 'Checking local warehouse proximity...' },
    { label: 'GROUNDING', task: 'Running search-grounding verification...' },
    { label: 'GROUNDING', task: 'Verifying product warranty terms...' },
    { label: 'DATA', task: 'Sanitizing vendor contact metadata...' },
    { label: 'DATA', task: 'Linking verified source documentation...' },
    { label: 'FINAL', task: 'Synthesizing procurement matrix...' },
    { label: 'FINAL', task: 'Finalizing fulfillment report...' }
  ], []);

  const activeTasks = mode === 'analyzing' ? analysisTasks : sourcingTasks;
  
  // Determine how many tasks to show based on progress
  // We want to "reveal" tasks as progress increases.
  const currentIndex = Math.min(
    Math.floor((progress / 100) * activeTasks.length),
    activeTasks.length - 1
  );

  // Get the current and previous tasks to display
  // We show the "active" task at the top and the "completed" ones below
  const visibleTasks = useMemo(() => {
    const list = [];
    for (let i = currentIndex; i >= 0; i--) {
      list.push({
        ...activeTasks[i],
        isCurrent: i === currentIndex,
        // Deterministic ID for consistency
        id: `0x${(1000 + i).toString(16).toUpperCase()}`
      });
      if (list.length >= 8) break; // Keep the list manageable
    }
    return list;
  }, [currentIndex, activeTasks]);

  return (
    <div className="flex flex-col items-center justify-center py-8 md:py-16 animate-in fade-in zoom-in-95 duration-1000 mx-2">
      <div className="w-full max-w-3xl bg-white rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-16 border border-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] relative overflow-hidden group">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-slate-50">
          <div 
            className="h-full bg-gradient-to-r from-[#A8DADC] via-[#457B9D] to-blue-600 transition-all duration-700 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute top-0 right-0 w-24 h-full bg-white/40 blur-md animate-pulse" />
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 md:mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tightest">
                {mode === 'analyzing' ? 'Neural Synthesis' : 'Procurement Logic'}
              </h2>
            </div>
            <div className="flex gap-2">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                 {itemsCount > 0 ? `${itemsCount} Targets Active` : 'Initializing Core'}
               </span>
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                 Live Neural Stream
               </span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-6xl md:text-8xl font-black text-slate-900 tabular-nums tracking-tightest leading-none">
              {Math.round(progress)}<span className="text-2xl md:text-4xl text-slate-200 ml-1">%</span>
            </span>
          </div>
        </div>

        {/* Realistic Task Stream */}
        <div className="space-y-6 min-h-[450px]">
          {visibleTasks.map((log, i) => (
            <div 
              key={log.task} 
              className={`flex items-start gap-4 md:gap-8 transition-all duration-500
                ${log.isCurrent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-50 scale-[0.98] -translate-y-1'}
              `}
            >
              <div className="flex flex-col items-center pt-1.5 shrink-0">
                {log.isCurrent ? (
                  <div className="w-3.5 h-3.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                ) : (
                  <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
                {i < visibleTasks.length - 1 && <div className="w-0.5 h-12 bg-slate-100 mt-2" />}
              </div>
              
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border transition-colors
                    ${log.isCurrent ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-emerald-600 border-emerald-100'}
                  `}>
                    {log.isCurrent ? log.label : 'VERIFIED'}
                  </span>
                  <span className="text-[8px] md:text-[9px] font-mono text-slate-300 tracking-wider tabular-nums">{log.id}</span>
                </div>
                <p className={`text-base md:text-2xl font-bold tracking-tight leading-tight transition-colors duration-500 ${log.isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>
                  {log.task}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Decorative Radar Overlay */}
        <div className="absolute bottom-8 right-12 opacity-[0.03] pointer-events-none hidden md:block">
           <svg width="240" height="240" viewBox="0 0 100 100" className="animate-spin-slow">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.1" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.1" />
           </svg>
        </div>
      </div>
    </div>
  );
};

export default ThinkingVisual;