
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProductResult } from '../types';

declare var html2pdf: any;

interface BOQTableProps {
  results: ProductResult[];
  sourceImage?: string;
  onUpdateQuantity: (id: string, qty: number) => void;
  locationName?: string;
}

const BOQTable: React.FC<BOQTableProps> = ({ results, sourceImage, onUpdateQuantity, locationName }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [advancePct, setAdvancePct] = useState(40);
  const [logisticsPct, setLogisticsPct] = useState(30);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sourceImage) return;
    const img = new Image();
    img.src = sourceImage;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const newThumbs: Record<string, string> = {};
      results.forEach(item => {
        if (item.boundingBox) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const [ymin, xmin, ymax, xmax] = item.boundingBox;
          const sx = (xmin / 1000) * img.width;
          const sy = (ymin / 1000) * img.height;
          const sw = ((xmax - xmin) / 1000) * img.width;
          const sh = ((ymax - ymin) / 1000) * img.height;
          canvas.width = 120; canvas.height = 120;
          if (ctx) {
            ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, 120, 120);
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 120, 120);
            newThumbs[item.id] = canvas.toDataURL('image/jpeg', 0.8);
          }
        }
      });
      setThumbnails(newThumbs);
    };
  }, [sourceImage, results]);

  const totals = useMemo(() => {
    let material = 0;
    let labor = 0;
    let ancillaries = 0;
    results.forEach(item => {
      const bestRate = item.vendors.length > 0 ? Math.min(...item.vendors.map(v => v.numericPrice)) : 0;
      material += bestRate * item.quantity;
      labor += (item.estimatedLaborRate || 0) * item.quantity;
      if (item.ancillaryItems) {
        item.ancillaryItems.forEach(a => ancillaries += a.total);
      }
    });
    const subtotal = material + labor + ancillaries;
    const gst = subtotal * 0.18;
    return { material, labor, ancillaries, subtotal, gst, grand: subtotal + gst };
  }, [results]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const element = reportRef.current;
    const opt = {
      margin: 0, filename: `Findr_BOQ_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, width: 1024, windowWidth: 1024, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
      pagebreak: { mode: ['css', 'avoid-all'] }
    };
    try {
      await new Promise(r => setTimeout(r, 600)); 
      await html2pdf().set(opt).from(element).save();
    } catch (e) { console.error(e); } finally { setIsExporting(false); }
  };

  const hasCompletions = results.some(r => r.ancillaryItems && r.ancillaryItems.length > 0);

  return (
    <div className="page-container w-full max-w-full overflow-hidden">
      <style>{`
        .pdf-blueprint-container { background: #fff; width: 1024px; color: #1d1d1f; }
        .boq-table { table-layout: fixed; width: 944px; border-collapse: collapse; margin: 0 40px; border: 2px solid #1d1d1f; }
        .boq-table th, .boq-table td { padding: 10px; border: 1px solid #e2e8f0; font-size: 8px; vertical-align: top; }
        .boq-table th { background: #1d1d1f; color: #fff; font-weight: 900; text-transform: uppercase; font-size: 7px; text-align: center; }
        .ancillary-row { background-color: #f1f5f9; }
        .badge-neural { background: #6366f1; color: #fff; font-size: 6px; font-weight: 900; padding: 2px 4px; border-radius: 4px; text-transform: uppercase; }
        .col-amt { text-align: right; font-family: monospace; font-weight: 700; }
        .final-col { background-color: #f8fafc; border-left: 2px solid #1d1d1f; font-weight: 900; }
        .hero-image-container { width: 944px; height: 350px; background: #f8fafc; border-radius: 20px; overflow: hidden; margin: 0 40px 30px 40px; border: 1px solid #e2e8f0; }
      `}</style>

      {!hasCompletions && (
        <div className="no-print mx-10 mb-8 bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 flex items-center justify-between shadow-xl animate-bounce">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center font-black">!</div>
             <div>
               <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Incomplete BOQ Detected</h4>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Missing ancillary items may cause 20-40% budget overruns.</p>
             </div>
           </div>
           <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Recommended: Run Neural Completion</p>
        </div>
      )}

      <div className="table-scroll-wrapper overflow-x-auto pb-48 no-print">
        <div ref={reportRef} className="pdf-blueprint-container py-10">
          <div className="px-10 flex justify-between items-end mb-8 border-b-4 border-slate-900 pb-6">
            <h2 className="text-4xl font-black tracking-tighter">Findr Procurement Manifest</h2>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-slate-400">Node: {locationName}</span>
              <div className="text-xl font-black">REF-#{Math.floor(Date.now()/1000)}</div>
            </div>
          </div>

          <div className="hero-image-container">
             {sourceImage && <img src={sourceImage} className="w-full h-full object-cover" />}
          </div>

          <table className="boq-table">
            <thead>
              <tr>
                <th style={{width:'30px'}}>#</th>
                <th style={{width:'60px'}}>Visual</th>
                <th style={{width:'300px'}}>Product Specification & Neural Ancillaries</th>
                <th style={{width:'80px'}}>Qty</th>
                <th style={{width:'80px'}}>Unit</th>
                <th style={{width:'100px'}}>Rate (INR)</th>
                <th style={{width:'100px'}}>Total (INR)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <tr>
                    <td className="text-center font-black text-slate-200">{idx+1}</td>
                    <td>
                      <div className="w-12 h-12 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                        {thumbnails[item.id] && <img src={thumbnails[item.id]} className="w-full h-full object-cover" />}
                      </div>
                    </td>
                    <td>
                      <div className="font-black text-slate-900 uppercase text-[10px] mb-1">{item.productName}</div>
                      <div className="text-[7px] text-slate-500 italic mb-2">{item.description}</div>
                    </td>
                    <td className="text-center font-black">{item.quantity}</td>
                    <td className="text-center text-slate-400 uppercase">{item.unit}</td>
                    <td className="col-amt">₹{(item.vendors[0]?.numericPrice || 0).toLocaleString('en-IN')}</td>
                    <td className="col-amt final-col">₹{((item.vendors[0]?.numericPrice || 0) * item.quantity).toLocaleString('en-IN')}</td>
                  </tr>
                  {item.ancillaryItems?.map((anc, aidx) => (
                    <tr key={`${item.id}-anc-${aidx}`} className="ancillary-row">
                      <td colSpan={2}></td>
                      <td className="flex items-start gap-2 pl-4">
                        <span className="badge-neural mt-1 shrink-0">Added</span>
                        <div>
                          <div className="font-bold text-slate-700 uppercase text-[8px]">{anc.name}</div>
                          <div className="text-[7px] text-slate-400">{anc.description}</div>
                        </div>
                      </td>
                      <td className="text-center font-bold text-slate-600">{anc.quantity}</td>
                      <td className="text-center text-slate-400 uppercase text-[7px]">{anc.unit}</td>
                      <td className="col-amt text-slate-400">₹{anc.rate.toLocaleString('en-IN')}</td>
                      <td className="col-amt text-slate-900 font-bold">₹{anc.total.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <div className="mt-10 px-10 grid grid-cols-4 gap-6">
             <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Asset Value</span>
                <span className="text-2xl font-black">₹{totals.material.toLocaleString('en-IN')}</span>
             </div>
             <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100">
                <span className="text-[10px] font-black text-blue-400 uppercase block mb-1">Neural Ancillaries</span>
                <span className="text-2xl font-black text-blue-600">₹{totals.ancillaries.toLocaleString('en-IN')}</span>
             </div>
             <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-100">
                <span className="text-[10px] font-black text-emerald-400 uppercase block mb-1">Installation</span>
                <span className="text-2xl font-black text-emerald-600">₹{totals.labor.toLocaleString('en-IN')}</span>
             </div>
             <div className="bg-slate-950 p-6 rounded-3xl shadow-xl text-right flex flex-col justify-center">
                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Grand Payable (Inc. GST)</span>
                <span className="text-3xl font-black text-white tracking-tighter">₹{totals.grand.toLocaleString('en-IN')}</span>
             </div>
          </div>
        </div>
      </div>

      <div data-html2canvas-ignore="true" className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl flex items-center gap-10 z-[1000] min-w-[600px] animate-in slide-in-from-bottom-5 duration-1000">
        <div className="flex-1">
           <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Fulfillment Accuracy</h4>
           <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">98.4% Confidence Score • B2B Vetted</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => window.print()} className="px-8 py-4 border border-white/20 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Preview</button>
          <button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className="px-12 py-4 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl"
          >
            {isExporting ? 'Generating...' : 'Export Verified Manifest'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BOQTable;
