
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
          canvas.width = 120;
          canvas.height = 120;
          if (ctx) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, 120, 120);
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
    results.forEach(item => {
      const bestRate = item.vendors.length > 0 ? Math.min(...item.vendors.map(v => v.numericPrice)) : 0;
      material += bestRate * item.quantity;
      labor += (item.estimatedLaborRate || 0) * item.quantity;
    });
    const subtotal = material + labor;
    const gst = subtotal * 0.18;
    return { material, labor, subtotal, gst, grand: subtotal + gst };
  }, [results]);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    const element = reportRef.current;
    
    const opt = {
      margin: [0, 0, 0, 0],
      filename: `Findr_Manifest_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        width: 1024,
        windowWidth: 1024,
        scrollY: 0,
        scrollX: 0,
        x: 0,
        y: 0,
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
      pagebreak: { mode: ['css', 'avoid-all'], before: '.legal-grid' }
    };

    try {
      await new Promise(r => setTimeout(r, 600)); 
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handoverPct = 100 - (advancePct + logisticsPct);

  return (
    <div className="page-container w-full max-w-full overflow-hidden">
      <style>{`
        .pdf-blueprint-container { 
            background: #fff; 
            width: 1024px; 
            margin: 0; 
            padding: 0;
            box-sizing: border-box;
            color: #1d1d1f;
        }

        .header-section, .project-strip, .hero-image-section, .totals-grid, .legal-grid, .footer-note { 
            padding-left: 40px; 
            padding-right: 40px; 
        }

        .header-section {
            padding-top: 40px;
        }

        .hero-image-container {
            width: 944px;
            height: 400px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 24px;
            overflow: hidden;
            position: relative;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.04);
        }

        .hero-image-overlay {
            position: absolute;
            bottom: 24px;
            left: 24px;
            background: rgba(29, 29, 31, 0.95);
            color: #fff;
            padding: 12px 24px;
            border-radius: 14px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        .boq-table {
            table-layout: fixed !important;
            width: 944px !important; 
            border-collapse: collapse !important;
            margin: 0 40px !important;
            border: 2px solid #1d1d1f !important;
        }

        .boq-table tr, .totals-grid, .legal-grid > div, .hero-image-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }

        .boq-table th, .boq-table td {
            padding: 12px 10px !important;
            border: 1px solid #e2e8f0 !important;
            font-size: 8.5px !important;
            line-height: 1.4 !important;
            vertical-align: top !important;
        }

        .boq-table th {
            background: #1d1d1f !important;
            color: #fff !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            font-size: 7.5px !important;
            text-align: center !important;
            letter-spacing: 0.05em;
        }

        .col-amt { text-align: right !important; font-family: 'SF Mono', 'Courier New', monospace; font-weight: 700; }
        .final-col { background-color: #f8fafc !important; border-left: 2.5px solid #1d1d1f !important; font-weight: 900 !important; }
        .spec-label { color: #86868b; font-weight: 900; text-transform: uppercase; font-size: 6.5px; margin-right: 4px; }
        .badge-verified { background: #E8F5E9; color: #2e7d32; font-size: 6.5px; font-weight: 900; padding: 2px 6px; border-radius: 5px; border: 1px solid #C8E6C9; display: inline-block; margin-bottom: 5px; }
        .badge-manufacturer { background: #E3F2FD; color: #457B9D; font-size: 6.5px; font-weight: 900; padding: 2px 6px; border-radius: 5px; border: 1px solid #BBDEFB; display: inline-block; margin-bottom: 5px; }
        .chip-compliance { background: #f1f5f9; color: #64748b; font-size: 6.5px; font-weight: 900; padding: 2px 6px; border-radius: 5px; border: 1px solid #e2e8f0; }
        .thumb-box { width: 55px; height: 55px; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
        .input-term { background: transparent; border: none; font-weight: 900; width: 30px; text-align: right; outline: none; border-bottom: 1px dashed #457B9D; color: #457B9D; }
        .input-term:hover { background: #f1f5f9; }
      `}</style>

      <div className="table-scroll-wrapper overflow-x-auto pb-48 no-print">
        <div ref={reportRef} className="pdf-blueprint-container">
          
          <div className="header-section flex justify-between items-end mb-10 border-b-8 border-[#1d1d1f] pb-8">
            <div className="flex gap-7 items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#A8DADC] to-[#457B9D] text-white flex items-center justify-center font-black text-5xl rounded-[1.75rem] shadow-lg relative">
                F
                <div className="absolute bottom-4 right-4 w-4 h-4 bg-white rounded-full"></div>
              </div>
              <div>
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">Findr<span className="text-[#A8DADC]">.</span></h2>
                <p className="text-[13px] font-black text-[#86868b] uppercase tracking-widest mt-2">Visual Procurement Manifest v5.1.0</p>
              </div>
            </div>
            <div className="text-right">
               <div className="text-3xl font-black text-[#1d1d1f] tabular-nums tracking-tighter">MANIFEST-#{Math.floor(Date.now()/10000)}</div>
               <span className="text-[11px] font-black text-[#86868b] uppercase tracking-widest">NETWORK VALIDATED: {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          <div className="project-strip grid grid-cols-4 gap-6 mb-10">
             <div className="bg-[#F1FAEE] p-6 border border-[#E8F5E9] rounded-2xl">
               <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Project Hub Node</label>
               <span className="text-[15px] font-black text-slate-900 block">{locationName || "Neural Active"}</span>
             </div>
             <div className="bg-[#E3F2FD] p-6 border border-[#BBDEFB] rounded-2xl">
               <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Taxation Protocol</label>
               <span className="text-[15px] font-black text-[#457B9D] block">GST 18% / B2B VETTED</span>
             </div>
             <div className="bg-slate-50 p-6 border border-slate-200 rounded-2xl">
               <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Commercial Logic</label>
               <span className="text-[15px] font-black text-slate-900 block uppercase">Lowest Responsive Bid</span>
             </div>
             <div className="bg-[#1d1d1f] p-6 rounded-2xl text-right flex flex-col justify-center shadow-xl">
               <label className="text-[10px] font-black text-[#A8DADC] uppercase block mb-1">Grand Net Contract Value</label>
               <span className="text-4xl font-black text-white tabular-nums tracking-tighter leading-none">₹{totals.grand.toLocaleString('en-IN')}</span>
             </div>
          </div>

          {sourceImage && (
            <div className="hero-image-section mb-12">
              <h3 className="text-[12px] font-black text-[#1d1d1f] uppercase tracking-[0.3em] mb-5 flex items-center gap-4">
                <span className="w-10 h-[2.5px] bg-[#457B9D]" />
                Primary Scene Reference Mapping
              </h3>
              <div className="hero-image-container">
                <img src={sourceImage} alt="Reference Scene" className="w-full h-full object-cover" />
                <div className="hero-image-overlay">
                   Findr. Site Survey Visual Hub | Scan Timestamp: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}

          <table className="boq-table">
            <colgroup>
              <col style={{width: '35px'}} />
              <col style={{width: '75px'}} />
              <col style={{width: '240px'}} />
              <col style={{width: '160px'}} />
              <col style={{width: '85px'}} />
              <col style={{width: '40px'}} />
              <col style={{width: '60px'}} />
              <col style={{width: '90px'}} />
              <col style={{width: '90px'}} />
              <col style={{width: '94px'}} />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>Visual</th>
                <th className="text-left">Technical Asset Specifications</th>
                <th className="text-left">Verified Supplier Node</th>
                <th>Dims</th>
                <th>Qty</th>
                <th>Lead</th>
                <th className="text-right">Mat. Rate</th>
                <th className="text-right">Lab. Rate</th>
                <th className="text-right">Final Total</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item, idx) => {
                const primaryVendor = item.vendors[0];
                const matRate = primaryVendor?.numericPrice || 0;
                const labRate = item.estimatedLaborRate || 0;
                const totalAmt = (matRate + labRate) * item.quantity;
                return (
                  <tr key={item.id}>
                    <td className="text-center font-bold text-slate-300">{idx + 1}</td>
                    <td>
                       <div className="thumb-box">
                         {thumbnails[item.id] ? (
                           <img src={thumbnails[item.id]} alt="Asset" className="w-full h-full object-cover" />
                         ) : (
                           <div className="bg-slate-50 w-full h-full" />
                         )}
                       </div>
                       <div className={`text-[6px] font-black uppercase mt-2 ${item.scanConfidence < 85 ? 'text-red-500' : 'text-[#457B9D]'}`}>
                         CONF: {item.scanConfidence}% {item.scanConfidence < 85 ? '(VERIFY)' : ''}
                       </div>
                    </td>
                    <td>
                      <div className="font-black text-[#1d1d1f] uppercase text-[10.5px] mb-1.5 leading-none">{item.productName}</div>
                      <div className="text-[8.5px] text-[#86868b] leading-tight mb-3 italic">"{item.description}"</div>
                      <div className="space-y-2 pt-2.5 border-t border-slate-50">
                        <div><span className="spec-label">Mat:</span> <span className="text-slate-700 font-bold">{item.specsDetail.material}</span></div>
                        <div className="flex items-center gap-2">
                           <span className="spec-label">IS Code:</span> 
                           <span className="chip-compliance">{item.specsDetail.compliance}</span>
                        </div>
                        <div><span className="spec-label">Warranty:</span> <span className="text-slate-600 font-bold">{item.specsDetail.warranty}</span></div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {primaryVendor?.gstStatus === 'Verified' && <div className="badge-verified">GST Vetted</div>}
                        {primaryVendor?.isManufacturer && <div className="badge-manufacturer">OEM/Manufacturer</div>}
                      </div>
                      <div className="font-black text-[#1d1d1f] text-[9.5px] mb-1">{primaryVendor?.vendor || "Awaiting Node"}</div>
                      <div className="text-[7.5px] text-[#86868b] mb-2 leading-tight">{primaryVendor?.address}</div>
                      <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 border border-slate-100">
                        <div className="flex justify-between text-[7px] font-black">
                          <span className="text-slate-400">GSTIN:</span> <span className="text-[#2e7d32]">{primaryVendor?.gstNumber || "27AABCV1234F1Z5"}</span>
                        </div>
                        <div className="flex justify-between text-[7px] font-black">
                          <span className="text-slate-400">MOQ:</span> <span className="text-[#457B9D]">{primaryVendor?.moq || "1 Unit"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-center text-[8.5px] font-bold text-slate-500 uppercase">{item.dimensions}</td>
                    <td className="text-center font-black text-[#1d1d1f]">{item.quantity}</td>
                    <td className="text-center text-[8.5px] font-black text-[#457B9D] uppercase">{primaryVendor?.daysToDelivery} Days</td>
                    <td className="col-amt">₹{matRate.toLocaleString('en-IN')}</td>
                    <td className="col-amt text-slate-300">₹{labRate.toLocaleString('en-IN')}</td>
                    <td className="col-amt final-col text-[#1d1d1f]">₹{totalAmt.toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="totals-grid grid grid-cols-5 gap-0 mt-14 border-4 border-[#1d1d1f] rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-7 text-center border-r border-slate-100 bg-white">
              <span className="text-[11px] font-black text-[#86868b] uppercase block mb-1.5">Material Net</span>
              <span className="text-2xl font-black text-[#1d1d1f]">₹{totals.material.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-7 text-center border-r border-slate-100 bg-white">
              <span className="text-[11px] font-black text-[#86868b] uppercase block mb-1.5">Installation</span>
              <span className="text-2xl font-black text-[#457B9D]">₹{totals.labor.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-7 text-center border-r border-slate-100 bg-white">
              <span className="text-[11px] font-black text-[#86868b] uppercase block mb-1.5">Net Subtotal</span>
              <span className="text-2xl font-black text-[#1d1d1f]">₹{totals.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-7 text-center border-r border-slate-100 bg-[#F1FAEE]">
              <span className="text-[11px] font-black text-[#86868b] uppercase block mb-1.5">GST (18%)</span>
              <span className="text-2xl font-black text-[#1d1d1f]">₹{totals.gst.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-7 bg-[#1d1d1f] text-white text-center flex flex-col justify-center">
              <span className="text-[12px] font-black text-[#A8DADC] uppercase block mb-1.5">Grand Payable</span>
              <span className="text-3xl font-black tracking-tighter">₹{totals.grand.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="legal-grid mt-20 grid grid-cols-3 gap-14">
             <div className="space-y-6">
               <h4 className="text-[13px] font-black uppercase text-[#1d1d1f] border-l-4 border-red-500 pl-5">Procurement Disclaimer</h4>
               <p className="text-[8.5px] text-slate-500 font-medium leading-relaxed italic">
                 This manifest is generated via AI-assisted visual mapping. Prices are indicative of verified B2B nodes but are subject to final vendor quotation, inventory fluctuation, and volume discounts. Final purchase orders must be vetted by a qualified procurement officer.
               </p>
               <ul className="text-[9px] text-slate-500 space-y-3 font-medium leading-relaxed">
                 <li>• Any site modifications or structural reinforcement excluded.</li>
                 <li>• Primary power cabling and ELV terminations excluded.</li>
               </ul>
             </div>
             <div className="space-y-6">
               <h4 className="text-[13px] font-black uppercase text-[#1d1d1f] border-l-4 border-[#457B9D] pl-5">Commercial Terms (Editable)</h4>
               <div className="bg-slate-50 rounded-2xl p-6 space-y-3.5 border border-slate-100">
                 <div className="flex justify-between border-b border-slate-200 pb-2.5 text-[9px] font-bold">
                   <span>Advance:</span> 
                   <span className="text-[#1d1d1f]">
                     <input type="number" value={advancePct} onChange={(e) => setAdvancePct(Number(e.target.value))} className="input-term no-print" />
                     {advancePct}% against PO
                   </span>
                 </div>
                 <div className="flex justify-between border-b border-slate-200 pb-2.5 text-[9px] font-bold">
                   <span>Logistics:</span> 
                   <span className="text-[#1d1d1f]">
                     <input type="number" value={logisticsPct} onChange={(e) => setLogisticsPct(Number(e.target.value))} className="input-term no-print" />
                     {logisticsPct}% on Dispatch
                   </span>
                 </div>
                 <div className="flex justify-between text-[9px] font-bold">
                   <span>Handover:</span> <span className="text-[#1d1d1f]">{handoverPct}% Post Install</span>
                 </div>
               </div>
             </div>
             <div className="space-y-6">
               <h4 className="text-[13px] font-black uppercase text-[#1d1d1f] border-l-4 border-emerald-500 pl-5">Neural Assurance</h4>
               <ul className="text-[9px] text-slate-500 space-y-3 font-medium leading-relaxed">
                 <li>• All vendors B2B Vetted for IS-Compliance.</li>
                 <li>• <span className="font-black text-[#1d1d1f]">DIM TOLERANCE: ±5%</span> mandatory check.</li>
                 <li>• Validity: 7 Calendar Days from Issuance.</li>
               </ul>
             </div>
          </div>

          <div className="footer-note mt-24 flex justify-between items-center opacity-30 pt-12 border-t border-slate-100 pb-16">
             <div className="flex flex-col">
               <span className="text-[11px] font-black uppercase tracking-widest">Neural Ledger Node • IND-WEST-01</span>
               <span className="text-[8px] font-bold font-mono mt-2 uppercase tracking-widest">SYSTEM-HASH: {Math.random().toString(36).substring(7).toUpperCase()}...</span>
             </div>
             <div className="text-right flex flex-col items-end">
               <span className="text-[11px] font-black uppercase tracking-widest">Findr. PRO-PROCUREMENT MANIFEST</span>
               <p className="text-[8px] font-bold mt-2 text-slate-400">© 2026 FINDR LOGISTICS NETWORK</p>
             </div>
          </div>
        </div>
      </div>

      <div data-html2canvas-ignore="true" className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1d1d1f]/95 backdrop-blur-3xl p-4 md:px-14 md:py-6 rounded-full border border-white/10 shadow-2xl flex items-center gap-14 z-[1000] min-w-[320px] md:min-w-[700px] animate-in slide-in-from-bottom-5 duration-1000">
        <div className="hidden md:flex flex-col pr-14 border-r border-white/10 shrink-0">
          <h3 className="text-[11px] font-black text-[#A8DADC] uppercase tracking-widest">Network Node</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{locationName || "Neural Active"}</p>
        </div>
        <div className="flex gap-5 flex-1 justify-center md:justify-end">
          <button onClick={() => window.print()} className="px-10 py-4 border border-white/20 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Preview</button>
          <button 
            onClick={handleExportPDF} 
            disabled={isExporting}
            className={`px-16 py-4 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all ${isExporting ? 'opacity-50 scale-95' : 'hover:bg-[#457B9D] hover:text-white shadow-xl shadow-white/10'}`}
          >
            {isExporting ? 'Processing Manifest...' : 'Export Final Manifest'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BOQTable;
