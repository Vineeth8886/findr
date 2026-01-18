
import React, { useState, useEffect } from 'react';

interface ThinkingVisualProps {
  progress: number;
  itemsCount: number;
  mode: 'analyzing' | 'sourcing';
  itemNames?: string[];
}

const ThinkingVisual: React.FC<ThinkingVisualProps> = ({ progress, itemsCount, mode, itemNames = [] }) => {
  const [logs, setLogs] = useState<{label: string, task: string}[]>([]);
  
  const manufacturers = ['Kohler', 'Jaquar', 'Pepperfry', 'IKEA', 'Asian Paints'];
  
  const analysisTasks = [
    'Scanning visual geometry...',
    'Extracting material properties...',
    'Identifying architectural textures...',
    'Matching texture maps...',
    'Resolving object hierarchy...',
    'Detecting flooring patterns...',
    'Mapping wall finishes...',
    'Mapping to SKU database...'
  ];

  useEffect(() => {
    let timeoutId: number;
    
    const addLog = () => {
      setLogs(prev => {
        let label = 'SYSTEM';
        let task = '';

        if (mode === 'analyzing') {
          label = 'VISION';
          task = analysisTasks[Math.floor(Math.random() * analysisTasks.length)];
        } else {
          const randomItem = itemNames[Math.floor(Math.random() * itemNames.length)] || 'Asset';
          const randomVendor = manufacturers[Math.floor(Math.random() * manufacturers.length)];
          const actions = [
            `Checking ${randomVendor} inventory...`,
            `Retrieving prices for ${randomItem}...`,
            `Verifying Pincode logistics...`,
            `Contacting supply nodes...`,
            `Validating GST compliance...`
          ];
          label = 'SOURCE';
          task = actions[Math.floor(Math.random() * actions.length)];
        }

        if (prev[0]?.task === task) return prev;
        return [{ label, task }, ...prev].slice(0, 4);
      });

      const nextDelay = Math.random() > 0.8 ? 1200 : 400;
      timeoutId = window.setTimeout(addLog, nextDelay);
    };

    addLog();
    return () => clearTimeout(timeoutId);
  }, [mode, itemNames]);

  return (
    <div className="flex flex-col items-center justify-center py-4 md:py-8 animate-in fade-in duration-500 mx-2">
      <div className="w-full max-w-2xl bg-white rounded-[1.5rem] md:rounded-2xl p-6 md:p-10 border border-slate-200 shadow-xl shadow-slate-100 relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-50">
          <div 
            className="h-full bg-blue-500 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center mb-6 md:mb-10 pt-2">
          <div className="space-y-1.5">
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
              {mode === 'analyzing' ? 'Neural Processing' : 'Direct Sourcing'}
            </h2>
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {mode === 'analyzing' ? 'Segmenting architectural data...' : 'Verifying supply chain nodes...'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl md:text-4xl font-black text-slate-100 tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <div className="space-y-3 min-h-[140px] md:min-h-[180px]">
          {logs.map((log, i) => (
            <div 
              key={`${log.task}-${i}`} 
              className={`flex items-start gap-2 md:gap-4 transition-all duration-500
                ${i === 0 ? 'opacity-100 scale-100 translate-x-0' : 'opacity-20 scale-95 -translate-x-1'}
              `}
            >
              <div className={`shrink-0 text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] py-1 px-1.5 md:px-2 rounded border mt-0.5
                ${log.label === 'VISION' ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-blue-50 text-blue-500 border-blue-100'}
              `}>
                {log.label}
              </div>
              <p className={`text-xs md:text-sm font-bold flex-1 leading-snug ${i === 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                {log.task}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThinkingVisual;
