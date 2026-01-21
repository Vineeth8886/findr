
import React, { useState, useEffect } from 'react';

interface ThinkingVisualProps {
  progress: number;
  itemsCount: number;
  mode: 'analyzing' | 'sourcing';
  activeTask?: string;
}

const ThinkingVisual: React.FC<ThinkingVisualProps> = ({ progress, itemsCount, mode, activeTask }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [displayTitle, setDisplayTitle] = useState(activeTask || 'Initializing Engine...');

  const sourcingLogs = [
    "Traversing regional B2B hubs...",
    "Cross-referencing GST compliance...",
    "Validating manufacturer certifications...",
    "Calculating logistic overheads...",
    "Verifying pricing parity...",
    "Indexing authorized wholesale nodes...",
    "Establishing direct vendor handshakes..."
  ];

  const analyzingLogs = [
    "Deconstructing spatial geometry...",
    "Synthesizing architectural patterns...",
    "Mapping asset metadata to standards...",
    "Extracting volumetric dimensions...",
    "Identifying high-fidelity matches...",
    "Grounding vision confidence scores..."
  ];

  // Animated Title Logic for Live Transparency
  useEffect(() => {
    if (activeTask) {
      setDisplayTitle(activeTask);
    } else {
      const titles = mode === 'analyzing' ? ["Vision Synthesis", "Geometry Mapping", "Asset Recognition"] : ["Supply Chain Sourcing", "Vendor Validation", "Pricing Discovery"];
      let i = 0;
      const t = setInterval(() => {
        setDisplayTitle(titles[i % titles.length]);
        i++;
      }, 3000);
      return () => clearInterval(t);
    }
  }, [activeTask, mode]);

  useEffect(() => {
    const sourcePool = mode === 'analyzing' ? analyzingLogs : sourcingLogs;
    const interval = setInterval(() => {
      const nextLog = sourcePool[Math.floor(Math.random() * sourcePool.length)];
      setLogs(prev => [nextLog, ...prev.slice(0, 4)]);
    }, 1200);

    return () => clearInterval(interval);
  }, [mode]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full animate-in fade-in duration-1000">
      <div className="w-full max-w-4xl px-8 text-center space-y-12 relative">
        
        <div className="relative mx-auto w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="2" />
            <circle 
              cx="50" cy="50" r="45" 
              fill="none" 
              stroke="#F59E0B" 
              strokeWidth="3" 
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * progress) / 100}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-[0_10px_40px_-10px_rgba(245,158,11,0.2)] border border-[#F59E0B]/10">
              <span className="text-[#0F172A] text-2xl font-black tracking-tighter">{Math.round(progress)}%</span>
              <div className="w-1 h-1 bg-[#F59E0B] rounded-full animate-ping mt-1" />
            </div>
          </div>
        </div>

        <div className="space-y-4 min-h-[120px]">
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#F59E0B] animate-pulse">
            Neural Reasoning Live
          </p>
          <h2 className="text-4xl md:text-6xl font-black text-[#0F172A] tracking-tight leading-tight uppercase transition-all duration-500">
            {displayTitle}
          </h2>
        </div>

        <div className="max-w-md mx-auto h-32 relative overflow-hidden bg-slate-50/50 rounded-2xl border border-slate-100 p-6 flex flex-col justify-end">
          <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white to-transparent z-10" />
          <div className="space-y-2">
            {logs.map((log, idx) => (
              <p 
                key={idx} 
                className={`text-[10px] md:text-xs font-medium uppercase tracking-widest text-left
                  ${idx === 0 ? 'text-[#0F172A] opacity-100 font-bold translate-x-1' : 'text-slate-400 opacity-40'}
                  transition-all duration-700
                `}
              >
                <span className="text-[#F59E0B] mr-2">/</span> {log}
              </p>
            ))}
          </div>
        </div>

        <p className="text-slate-400 font-medium italic text-sm max-w-lg mx-auto">
          "Traversing industrial nodes to ensure pricing parity and asset verification for professional B2B delivery."
        </p>
      </div>
    </div>
  );
};

export default ThinkingVisual;