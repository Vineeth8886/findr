
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
}

const BOQTable: React.FC<BOQTableProps> = ({ results, sourceImage, onUpdateQuantity, locationName, onReset, onAutoComplete, isCompleting }) => {
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
    csv += "ID,Product Name,Description,Vendor,Price,Quantity,Unit,Labor Rate,Total (INR)\n";
    
    results.forEach((r, idx) => {
      const supplier = r.vendors?.[0];
      const unitTotal = (supplier?.numericPrice || 0) + (r.estimatedLaborRate || 0);
      csv += `"${idx+1}","${r.productName}","${r.description.replace(/"/g, '""')}","${supplier?.vendor || 'N/A'}",${supplier?.numericPrice || 0},${r.quantity},"${r.unit}",${r.estimatedLaborRate},${unitTotal * r.quantity}\n`;
    });
    
    csv += `\nSubtotal,,,${totals.subtotal}\n`;
    csv += `GST (18%),,,${totals.gst}\n`;
    csv += `Grand Total,,,${totals.grand}\n`;
    csv += "\nDISCLAIMER: This manifest is generated using neural sourcing. Verify all dimensions and pricing with vendors before procurement.";
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Findr_Manifest_${manifestId}.csv`;
    a.click();
  };

  const fmt = (val: any) => Number(val).toLocaleString('en-IN');

  return (
    <div className="w-full flex flex-col items-center pb-20" ref={containerRef}>
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
        .pdf-summary-item value { display: block; font-size: 13px; font-weight: 800; color: #000; }
        .pdf-table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; border: 1.5px solid #000; }
        .pdf-table th { background: #f8fafc; color: #000; font-size: 8px; font-weight: 900; text-transform: uppercase; padding: 12px 10px; text-align: left; border-bottom: 1.5px solid #000; letter-spacing: 1px; }
        .pdf-table td { padding: 10px; border: 0.5px solid #e2e8f0; font-size: 10px; vertical-align: top; line-height: 1.4; overflow: hidden; page-break-inside: avoid; }
        .cell-title { font-weight: 900; color: #000; margin-bottom: 2px; text-transform: uppercase; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cell-description { color: #64748b; font-size: 8px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 6px; }
        .cell-meta { font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .cell-meta span { color: #000; margin-right: 12px; }
        .dim-box { font-size: 9px; font-weight: 900; color: #000; line-height: 1.1; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pdf-totals-grid { margin-top: auto; display: grid; grid-template-columns: repeat(5, 1fr); border: 1.5px solid #000; background: #000; gap: 1px; }
        .total-cell { padding: 15px; text-align: center; background: #fff; }
        .total-cell:last-child { background: #000; color: #fff; }
        .total-cell label { display: block; font-size: 8px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 1px; }
        .total-cell value { font-size: 16px; font-weight: 900; }
      `}</style>

      <div ref={reportRef} className="pdf-manifest shadow-2xl bg-white" style={{ transform: `scale(${scale})` }}>
        <div className="pdf-page">
          <header className="pdf-header">
            <div className="pdf-logo">findr.</div>
            <div className="pdf-meta-box">
              <h2>manifest / boq</h2>
              <p>#{manifestId} • {todayDate}</p>
            </div>
          </header>
          <div className="pdf-summary-row">
            <div className="pdf-summary-item"><label>Node</label><value>{locationName || 'Region Hub'}</value></div>
            <div className="pdf-summary-item"><label>Grounding</label><value>Industrial B2B</value></div>
            <div className="pdf-summary-item"><label>Verification</label><value>Neural Logic</value></div>
            <div className="pdf-summary-item" style={{background:'#000'}}><label style={{color:'#64748b'}}>Net Value</label><value style={{color:'#fff'}}>₹{fmt(totals.grand)}</value></div>
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
                      <div className="cell-description">"{item.description}"</div>
                    </td>
                    <td>
                      <div className="cell-title">{supplier?.vendor || "Source Pending"}</div>
                      <div className="cell-description truncate">{supplier?.address || "Regional Node"}</div>
                    </td>
                    <td><div className="dim-box">{item.dimensions || "STD"}</div></td>
                    <td className="text-center font-black">{item.quantity}</td>
                    <td className="text-right font-black">₹{fmt(unitTotal)}</td>
                    <td className="text-right font-black text-slate-900">₹{fmt(unitTotal * (item.quantity || 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="pdf-totals-grid">
            <div className="total-cell"><label>Subtotal</label><value>₹{fmt(totals.subtotal)}</value></div>
            <div className="total-cell"><label>GST 18%</label><value>₹{fmt(totals.gst)}</value></div>
            <div className="total-cell"><label>Final Payable</label><value>₹{fmt(totals.grand)}</value></div>
          </div>
        </div>
      </div>

      <div data-html2canvas-ignore="true" className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-6xl flex items-center bg-[#0F172A] p-2 rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] z-[100] transition-all group overflow-hidden">
        <div className="flex-1 flex items-center gap-10 px-8 py-3">
          <div className="hidden md:flex flex-col">
            <span className="text-[8px] font-black text-[#F59E0B] uppercase tracking-[0.4em]">Verified Manifest</span>
            <span className="text-[11px] font-black text-white uppercase tracking-wider">{manifestId}</span>
          </div>
          <div className="h-8 w-px bg-white/10 hidden md:block" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Node Value</span>
            <span className="text-[13px] font-black text-[#F59E0B] tracking-tight">₹{fmt(totals.grand)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {!results[0]?.ancillaryItems?.length && onAutoComplete && (
            <button 
              onClick={onAutoComplete} 
              disabled={isCompleting}
              className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              {isCompleting ? 'Reasoning...' : 'Complete BOQ'}
            </button>
          )}
          <button 
            onClick={onReset}
            className="px-6 py-4 bg-white/5 border border-white/10 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Reset
          </button>
          <button 
            onClick={handleExportCSV}
            className="px-8 py-4 bg-white text-black rounded-full font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all"
          >
            Excel (CSV)
          </button>
          <button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className="px-10 py-4 bg-[#F59E0B] text-[#0F172A] rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            {isExporting ? 'Generating...' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BOQTable;
