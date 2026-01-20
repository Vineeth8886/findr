
import React, { useState } from 'react';

interface SlideProps {
  number: number;
  title: string;
  children: React.ReactNode;
  active: boolean;
}

// Slide sub-component to render individual pitch content
const Slide: React.FC<SlideProps> = ({ number, title, children, active }) => (
  <div className={`absolute inset-0 transition-all duration-700 ease-out flex flex-col items-center justify-center p-6 md:p-12 ${active ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20 pointer-events-none'}`}>
    <div className="w-full max-w-5xl bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[3rem] p-10 md:p-20 shadow-2xl relative overflow-hidden group">
      {/* Slide Background Accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#A8DADC]/20 to-transparent blur-3xl -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-1000" />
      
      <div className="relative z-10 space-y-8 md:space-y-12">
        <div className="flex items-center gap-4">
          <span className="text-xl md:text-2xl font-black text-blue-500 tabular-nums">{(number + 1).toString().padStart(2, '0')}</span>
          <div className="h-px flex-1 bg-slate-200/50" />
        </div>
        
        <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tightest leading-none uppercase">
          {title}<span className="inline-block w-3 h-3 md:w-4 md:h-4 rounded-full bg-gradient-to-br from-[#A8DADC] to-[#457B9D] ml-2 shadow-sm" />
        </h2>
        
        <div className="text-lg md:text-2xl text-slate-600 font-medium leading-relaxed max-w-3xl">
          {children}
        </div>
      </div>
    </div>
  </div>
);

// Main PitchDeck component: Fixes 'Type () => void is not assignable to type FC' by adding return statement
const PitchDeck: React.FC = () => {
  const [current, setCurrent] = useState(0);

  const slides = [
    {
      title: "The Future of Sourcing",
      content: (
        <div className="space-y-6">
          <p className="text-3xl md:text-5xl font-black findr-gradient-text tracking-tighter">Findr Neural Pipeline.</p>
          <p>Architectural procurement reimagined through Computer Vision and Grounded AI. Bypassing retail friction for professional engineers.</p>
        </div>
      )
    },
    {
      title: "Industrial Precision",
      content: (
        <div className="space-y-6">
          <p className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">Verified B2B Networks.</p>
          <p>Identify manufacturer-direct sources and authorized wholesale dealers across regional hubs instantly.</p>
        </div>
      )
    },
    {
      title: "Neural Vision",
      content: (
        <div className="space-y-6">
          <p className="text-3xl md:text-5xl font-black text-[#457B9D] tracking-tighter">Spatial Synthesis.</p>
          <p>Advanced object detection and depth analysis integrated with live market grounding for accurate procurement estimates.</p>
        </div>
      )
    }
  ];

  const next = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  // Fix: Added the missing return statement to resolve the reported TypeScript error on line 34
  return (
    <div className="relative w-full h-[600px] overflow-hidden flex flex-col items-center justify-center">
      <div className="w-full h-full relative">
        {slides.map((slide, index) => (
          <Slide 
            key={index} 
            number={index} 
            title={slide.title} 
            active={index === current}
          >
            {slide.content}
          </Slide>
        ))}
      </div>
      
      {/* Navigation Buttons */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 z-50">
        <button 
          onClick={prev}
          className="p-4 bg-white/80 backdrop-blur rounded-2xl shadow-xl hover:bg-slate-900 hover:text-white transition-all active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${i === current ? 'w-8 bg-blue-500' : 'w-2 bg-slate-300'}`}
            />
          ))}
        </div>
        <button 
          onClick={next}
          className="p-4 bg-white/80 backdrop-blur rounded-2xl shadow-xl hover:bg-slate-900 hover:text-white transition-all active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  );
};

export default PitchDeck;
