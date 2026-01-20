
import React, { useMemo, useEffect, useState } from 'react';

interface ThinkingVisualProps {
  progress: number;
  itemsCount: number;
  mode: 'analyzing' | 'sourcing';
  activeTask?: string;
}

const ThinkingVisual: React.FC<ThinkingVisualProps> = ({ progress, itemsCount, mode, activeTask }) => {
  const [deepThinkingLog, setDeepThinkingLog] = useState<string[]>([]);
  
  useEffect(() => {
    const thoughts = [
      "De-noising sensor input weights...",
      "Analyzing floor-plane reflectivity indices...",
      "Validating distributor GST registrations...",
      "Calculating regional lead-time variance...",
      "Synthesizing market pricing benchmarks...",
      "Verifying structural ISO certifications...",
      "Indexing local fulfillment nodes...",
      "Mapping multimodal transport corridors...",
      "Neural search deepening: Indexing 4,000+ sources...",
      "Validating bulk discount thresholds...",
      "Estimating customs clearance (if import needed)...",
      "Cross-referencing manufacturer-direct channels..."
    ];
    const interval = setInterval(() => {
      const rt = thoughts[Math.floor(Math.random() * thoughts.length)];
      setDeepThinkingLog(prev => [rt, ...prev].slice(0, 5));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-700">
      <div className="w-full max-w-5xl bg-white rounded-[4rem] p-12 border border-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-2.5 bg-slate-50">
          <div className="h-full bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-600 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-1/2 space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping" />
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tightest leading-none uppercase">
                  {mode === 'analyzing' ? 'Neural Vision' : 'Neural Sourcing'}
                </h2>
              </div>
              <div className="flex gap-2">
                 <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-4 py-1.5 bg-blue-50 rounded-full">
                   Mode: Deep Reasoning
                 </span>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 py-1.5 bg-slate-100 rounded-full">
                   {itemsCount} Targets In Queue
                 </span>
              </div>
            </div>

            <div className="text-8xl md:text-[10rem] font-black text-slate-900 tracking-tightest leading-none">
              {Math.round(progress)}<span className="text-3xl text-slate-200 ml-2">%</span>
            </div>

            <div className="pt-10 border-t border-slate-100 space-y-3">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Thread</p>
              <p className="text-xl md:text-3xl font-black text-blue-600 animate-pulse truncate uppercase tracking-tight">
                {activeTask || 'Initializing Engine...'}
              </p>
            </div>
          </div>

          {/* Deep Thinking Console */}
          <div className="lg:w-1/2 bg-slate-950 rounded-[2.5rem] p-10 font-mono text-blue-400 text-[11px] relative border border-white/10 shadow-inner">
             <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <span className="text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-3">
                   <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                   Neural Reasoning Log
                </span>
                <span className="text-slate-600 text-[9px] uppercase">G3_Pro_v1.2</span>
             </div>
             
             <div className="space-y-4 min-h-[220px]">
                {deepThinkingLog.map((log, i) => (
                  <div key={i} className={`flex gap-4 animate-in fade-in slide-in-from-left-4 duration-500 ${i === 0 ? 'text-blue-300' : 'text-blue-900 opacity-50'}`}>
                    <span className="text-blue-800 font-bold shrink-0">{`[${new Date().toLocaleTimeString([], { hour12: false })}]`}</span>
                    <span className="leading-relaxed uppercase text-[10px]">{log}</span>
                  </div>
                ))}
             </div>

             <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Grounding Search: Active</span>
                <div className="flex gap-1">
                   {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-4 bg-blue-600/30 rounded-full animate-pulse" style={{ animationDelay: `${i*150}ms` }} />)}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThinkingVisual;
