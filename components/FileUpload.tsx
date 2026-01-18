
import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (base64: string) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const cleanBase64 = base64.split(',')[1];
        setPreview(base64);
        onFileSelect(cleanBase64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!preview ? (
        <div 
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative border-4 border-dashed rounded-[3rem] p-12 md:p-24 transition-all cursor-pointer text-center group
            ${disabled ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-50' : 'border-white bg-white/50 hover:border-blue-500 hover:bg-white/80'}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
            disabled={disabled}
          />
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-8 text-blue-600 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-xl shadow-blue-500/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tightest mb-3">Snap Asset</h3>
            <p className="text-base text-slate-500 font-medium px-6 max-w-md mx-auto leading-relaxed italic">Upload architectural renders or component photos to begin neural synthesis.</p>
            <div className="mt-10 px-10 py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl">
              Browse Files
            </div>
          </div>
        </div>
      ) : (
        <div className="relative group rounded-[3rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] border-8 border-white">
          <img src={preview} alt="Upload Preview" className="w-full h-[400px] md:h-[550px] object-cover group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
          <button 
            onClick={handleClear}
            className="absolute top-8 right-8 bg-white/95 backdrop-blur-xl p-5 rounded-2xl shadow-2xl hover:bg-red-500 hover:text-white text-red-500 transition-all z-10 active:scale-90"
            title="Clear Image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
