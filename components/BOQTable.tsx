
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProductResult } from '../types';

declare var html2pdf: any;

interface BOQTableProps {
  results: ProductResult[];
  sourceImage?: string;
  onUpdateQuantity: (id: string, qty: number) => void;
  locationName?: string;
  onReset?: () => void;
  onAutoComplete?: () => void;
  isCompleting?: boolean;
  onUpdateResult?: (id: string, updates: Partial<ProductResult>) => void;
  onGlobalNegotiate?: () => void;
}

const BOQTable: React.FC<BOQTableProps> = ({ results, sourceImage, onUpdateQuantity, locationName, onReset, onAutoComplete, isCompleting, onUpdateResult, onGlobalNegotiate }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [scale, setScale] = useState(1);
  const reportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const manifestId = useMemo(() => Math.floor(1000000 + Math.random() * 9000000).toString(), []);
  const todayDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth;
        const targetWidth = 1122; // A4 Landscape
        setScale(availableWidth < targetWidth ? availableWidth / targetWidth : 1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          canvas.width = 160; canvas.height = 160;
          if (ctx) {
            ctx.fillStyle = '#ffffff'; 
            ctx.fillRect(0, 0, 160, 160);
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 160, 160);
            newThumbs[item.id] = canvas.toDataURL('image/jpeg', 0.85);
          }
        }
      });
      setThumbnails(newThumbs);
    };
  }, [sourceImage, results]);

  const totals = useMemo(() => {
    let material = 0;
    let labor = 0;
    results.forEach(item => {
      const bestRate = item.vendors?.[0]?.numericPrice || 0;
      material += bestRate * (item.quantity || 0);
      labor += (item.estimatedLaborRate || 0) * (item.quantity || 0);
      item.ancillaryItems?.forEach(a => {
        if (a.category === 'Labor') labor += (a.total || 0);
        else material += (a.total || 0);
      });
    });
    const subtotal = material + labor;
    const gst = subtotal * 0.18;
    return { material, labor, subtotal, gst, grand: subtotal + gst };
  }, [results]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const originalScale = scale;
    setScale(1);

    const opt = {
      margin: 0,
      filename: `Findr_BOQ_${manifestId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        width: 1122,
        windowWidth: 1122,
        scrollX: 0,
        scrollY: 0,
        logging: false
      },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'avoid-all'], before: '.page-break' }
    };

    try {
      await new Promise(r => setTimeout(r, 600)); 
      await html2pdf().set(opt).from(reportRef.current).save();
    } catch (e) { 
      console.error(e); 
    } finally { 
      setScale(originalScale);
      setIsExporting(false); 
    }
  };

  const handleExportCSV = () => {
    let csv = "FINDR.,NEURAL PROCUREMENT MANIFEST\n";
    csv += `Manifest ID,${manifestId}\n`;
    csv += `Date,${todayDate}\n`;
    csv += `Location,${locationName || 'Global'}\n`;
    csv += `Verification Status,Neural Logic Verified\n`;
    csv += "--------------------------------------------------\n\n";
    csv += "ID,Product Name,Description,Technical Specs,Vendor,Price,Quantity,Unit,Labor Rate,Total (INR)\n";
    
    results.forEach((r, idx) => {
      const supplier = r.vendors?.[0];
      const unitTotal = (supplier?.numericPrice || 0) + (r.estimatedLaborRate || 0);
      const specs = r.specsDetail ? `Mat: ${r.specsDetail.material || '-'} | Fin: ${r.specsDetail.finish || '-'} | War: ${r.specsDetail.warranty || '-'}` : '';
      csv += `"${idx+1}","${r.productName}","${r.description.replace(/"/g, '""')}","${specs}","${supplier?.vendor || 'N/A'}",${supplier?.numericPrice || 0},${r.quantity},"${r.unit}",${r.estimatedLaborRate},${unitTotal * r.quantity}\n`;
      
      if (r.ancillaryItems?.length) {
        r.ancillaryItems.forEach(anc => {
           csv += `,"[Ancillary] ${anc.name}","${anc.description}","-","Auto-Generated",${anc.rate},${anc.quantity},"${anc.unit}",0,${anc.total}\n`;
        });
      }
    });
    
    csv += `\n,,,Subtotal,,,${totals.subtotal}\n`;
    csv += `,,,GST (18%),,,${totals.gst}\n`;
    csv += `,,,Grand Total,,,${totals.grand}\n`;
    csv += "\nTERMS: 50% Advance against PO, 40% on Delivery, 10% after Installation.";
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Findr_Manifest_${manifestId}.csv`;
    a.click();
  };

  const fmt = (val: any) => Number(val).toLocaleString('en-IN');

  return (
    <div className="w-full flex flex-col items-center pb-24" ref={containerRef}>
      <style>{`
        .pdf-manifest { width: 1122px; background: #fff; color: #1a1a1a; font-family: 'Inter', sans-serif; transform-origin: top center; }
        .pdf-page { width: 1122px; min-height: 794px; padding: 40px 60px; box-sizing: border-box; background: white; position: relative; overflow: hidden; display: flex; flex-direction: column; }
        .page-break { page-break-before: always; }
        .pdf-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
        .pdf-logo { font-size: 32px; font-weight: 800; letter-spacing: -1.5px; color: #000; text-transform: lowercase; }
        .pdf-meta-box { text-align: right; }
        .pdf-meta-box h2 { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 2px; }
        .pdf-meta-box p { font-size: 9px; font-weight: 700; color: #94a3b8; margin: 2px 0 0; text-transform: uppercase; letter-spacing: 1px; }
        .pdf-summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #000; border: 1px solid #000; margin-bottom: 30px; }
        .pdf-summary-item { background: #fff; padding: 15px; }
        .pdf-summary-item label { display: block; font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 1px; }
        .pdf-summary-item .value { display: block; font-size: 13px; font-weight: 800; color: #000; }
        .pdf-table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; border: 1.5px solid #000; }
        .pdf-table th { background: #f8fafc; color: #000; font-size: 8px; font-weight: 900; text-transform: uppercase; padding: 12px 10px; text-align: left; border-bottom: 1.5px solid #000; letter-spacing: 1px; }
        .pdf-table td { padding: 10px; border: 0.5px solid #e2e8f0; font-size: 10px; vertical-align: top; line-height: 1.4; word-break: break-word; white-space: normal; }
        .cell-title { font-weight: 900; color: #000; margin-bottom: 2px; text-transform: uppercase; font-size: 10px; }
        .cell-description { color: #64748b; font-size: 8px; line-height: 1.3; margin-bottom: 6px; }
        .dim-box { font-size: 9px; font-weight: 900; color: #000; line-height: 1.1; text-transform: uppercase; }
        .pdf-totals-grid { margin-top: auto; display: grid; grid-template-columns: repeat(5, 1fr); border: 1.5px solid #000; background: #000; gap: 1px; }
        .total-cell { padding: 15px; text-align: center; background: #fff; }
        .total-cell:last-child { background: #000; color: #fff; }
        .total-cell label { display: block; font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 1px; }
        .total-cell .value { font-size: 16px; font-weight: 900; }
        .editable-input { width: 100%; border: none; border-bottom: 1px dashed #cbd5e1; background: transparent; font-family: inherit; font-size: inherit; font-weight: inherit; color: #2563eb; padding: 2px 0; outline: none; resize: none; }
        .editable-input:focus { border-bottom: 1px solid #2563eb; background: #eff6ff; }
        .terms-box { margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; }
        .terms-header { font-size: 9px; font-weight: 900; color: #000; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
        .terms-text { font-size: 8px; color: #64748b; line-height: 1.5; }
      `}</style>
      
      {/* Scrollable Container for interactive HTML view */}
      <div className="w-full overflow-x-auto no-scrollbar pb-6 px-1">
        <div ref={reportRef} className="pdf-manifest shadow-2xl bg-white mx-auto origin-top-left sm:origin-top" style={{ transform: `scale(${scale})` }}>
          <div className="pdf-page">
            <header className="pdf-header">
              <div className="pdf-logo">findr.</div>
              <div className="pdf-meta-box">
                <h2>manifest / boq</h2>
                <p>#{manifestId} • {todayDate}</p>
              </div>
            </header>
            <div className="pdf-summary-row">
              <div className="pdf-summary-item"><label>Node</label><div className="value">{locationName || 'Region Hub'}</div></div>
              <div className="pdf-summary-item"><label>Grounding</label><div className="value">Industrial B2B</div></div>
              <div className="pdf-summary-item"><label>Verification</label><div className="value">Neural Logic</div></div>
              <div className="pdf-summary-item" style={{background:'#000'}}><label style={{color:'#64748b'}}>Net Value</label><div className="value" style={{color:'#fff'}}>₹{fmt(totals.grand)}</div></div>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-200 overflow-hidden relative mb-6">
              {sourceImage && <img src={sourceImage} className="w-full h-full object-cover grayscale opacity-90" />}
              <div className="absolute top-6 left-6 bg-black text-white px-4 py-1.5 text-[8px] font-black uppercase tracking-[0.3em]">neural_vision_ref_a1</div>
            </div>
            <div className="flex justify-between items-end border-t border-slate-100 pt-6 mt-4">
              <div className="text-[7px] font-black text-slate-300 uppercase tracking-widest"> findr neural pipeline / v2.5 / secure node </div>
            </div>
          </div>

          <div className="pdf-page page-break">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 border-b border-slate-100 pb-4 text-slate-400">Verified Asset Manifest</h3>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th style={{width: '35px'}}>#</th>
                  <th style={{width: '70px'}}>Asset</th>
                  <th style={{width: '240px'}}>Specifications</th>
                  <th style={{width: '180px'}}>Vendor Node</th>
                  <th style={{width: '115px'}}>Dims</th>
                  <th style={{width: '40px'}}>Qty</th>
                  <th style={{width: '80px'}}>Rate</th>
                  <th style={{width: '102px'}}>Total (INR)</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, idx) => {
                  const supplier = item.vendors?.[0];
                  const unitTotal = (supplier?.numericPrice || 0) + (item.estimatedLaborRate || 0);
                  return (
                    <tr key={item.id}>
                      <td className="text-center font-black text-slate-300">{idx + 1}</td>
                      <td>
                        <div className="w-14 h-14 bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                          {thumbnails[item.id] ? <img src={thumbnails[item.id]} className="w-full h-full object-cover grayscale" /> : <span className="text-[7px] text-slate-300">n/a</span>}
                        </div>
                      </td>
                      <td>
                        <div className="cell-title">{item.productName}</div>
                        <div className="cell-description">
                          {onUpdateResult ? (
                            <textarea 
                              rows={3}
                              className="editable-input" 
                              value={item.description}
                              onChange={(e) => onUpdateResult(item.id, { description: e.target.value })}
                            />
                          ) : item.description}
                        </div>
                        
                        {item.specsDetail && (
                          <div className="mt-2 pt-2 border-t border-slate-100 text-[8px] text-slate-500 font-medium">
                            <span className="font-bold text-slate-700">SPECS:</span> {item.specsDetail.material || 'Std'} / {item.specsDetail.finish || 'Std'} / Warranty: {item.specsDetail.warranty || 'Manufacturer Std'}
                          </div>
                        )}

                        {item.ancillaryItems && item.ancillaryItems.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
                            <span className="text-[8px] font-bold text-slate-400 block mb-1">+ ANCILLARY:</span>
                            {item.ancillaryItems.map(anc => (
                              <div key={anc.id} className="text-[8px] text-slate-600 flex justify-between mb-1">
                                <span>• {anc.name} ({anc.quantity} {anc.unit})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="cell-title">{supplier?.vendor || "Source Pending"}</div>
                        <div className="cell-description truncate">{supplier?.address || "Regional Node"}</div>
                      </td>
                      <td>
                        <div className="dim-box">
                          {onUpdateResult ? (
                            <input 
                              className="editable-input"
                              value={item.dimensions || "STD"}
                              onChange={(e) => onUpdateResult(item.id, { dimensions: e.target.value })}
                            />
                          ) : (item.dimensions || "STD")}
                        </div>
                      </td>
                      <td className="text-center font-black">
                          {onUpdateResult ? (
                            <input 
                              className="editable-input text-center"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => onUpdateResult(item.id, { quantity: Number(e.target.value) })}
                            />
                          ) : item.quantity}
                      </td>
                      <td className="text-right font-black">₹{fmt(unitTotal)}</td>
                      <td className="text-right font-black text-slate-900">₹{fmt(unitTotal * (item.quantity || 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="pdf-totals-grid">
              <div className="total-cell"><label>Subtotal</label><div className="value">₹{fmt(totals.subtotal)}</div></div>
              <div className="total-cell"><label>GST 18%</label><div className="value">₹{fmt(totals.gst)}</div></div>
              <div className="total-cell"><label>Final Payable</label><div className="value">₹{fmt(totals.grand)}</div></div>
            </div>
            
            <div className="terms-box">
              <div className="terms-header">Standard Payment Terms & Conditions</div>
              <div className="terms-text">
                  1. <strong>Payment Schedule:</strong> 50% Advance along with Purchase Order, 40% against Delivery, 10% post-installation sign-off.<br/>
                  2. <strong>Validity:</strong> This commercial proposal is valid for 7 days from date of issue.<br/>
                  3. <strong>Delivery:</strong> Timelines subject to force majeure. Standard delivery 7-14 days for stocked items.<br/>
                  4. <strong>Warranty:</strong> As per OEM standard terms. Consumables not covered under warranty.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar - Mobile Optimized */}
      <div data-html2canvas-ignore="true" className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-6xl flex flex-col md:flex-row items-center bg-[#0F172A] p-2 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] z-[100] transition-all group overflow-hidden">
        
        {/* Total Value Section */}
        <div className="w-full md:flex-1 flex justify-between md:justify-start items-center px-6 py-3 border-b border-white/10 md:border-b-0 md:gap-10">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-[#F59E0B] uppercase tracking-[0.4em] hidden md:block">Verified Manifest</span>
            <span className="text-[9px] md:text-[11px] font-black text-white uppercase tracking-wider">{manifestId}</span>
          </div>
          <div className="h-8 w-px bg-white/10 hidden md:block" />
          <div className="flex flex-col text-right md:text-left">
            <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Node Value</span>
            <span className="text-[11px] md:text-[13px] font-black text-[#F59E0B] tracking-tight">₹{fmt(totals.grand)}</span>
          </div>
        </div>

        {/* Buttons - Scrollable Row on Mobile */}
        <div className="w-full md:w-auto flex gap-2 overflow-x-auto no-scrollbar p-2">
          {!results[0]?.ancillaryItems?.length && onAutoComplete && (
            <button 
              onClick={onAutoComplete} 
              disabled={isCompleting}
              className="whitespace-nowrap flex-shrink-0 px-6 md:px-8 py-3 md:py-4 bg-white/5 border border-white/10 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              {isCompleting ? 'Reasoning...' : 'Complete BOQ'}
            </button>
          )}
          {onGlobalNegotiate && (
             <button 
               onClick={onGlobalNegotiate}
               className="whitespace-nowrap flex-shrink-0 px-6 md:px-8 py-3 md:py-4 bg-[#0F172A] border border-white/20 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#F59E0B] transition-all shadow-lg flex items-center gap-2"
             >
               Negotiate
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
             </button>
          )}
          <button 
            onClick={onReset}
            className="whitespace-nowrap flex-shrink-0 px-5 md:px-6 py-3 md:py-4 bg-white/5 border border-white/10 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Reset
          </button>
          <button 
            onClick={handleExportCSV}
            className="whitespace-nowrap flex-shrink-0 px-6 md:px-8 py-3 md:py-4 bg-white text-black rounded-full font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all"
          >
            Excel
          </button>
          <button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className="whitespace-nowrap flex-shrink-0 px-8 md:px-10 py-3 md:py-4 bg-[#F59E0B] text-[#0F172A] rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            {isExporting ? 'Generating...' : 'PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BOQTable;
