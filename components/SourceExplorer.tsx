
import React, { useEffect, useState } from 'react';
import { SearchResult } from '../types';

interface SourceExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  results: SearchResult[];
}

const SourceExplorer: React.FC<SourceExplorerProps> = ({ isOpen, onClose, results }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const mobileStyles = "fixed inset-x-0 bottom-0 max-h-[95vh] rounded-t-[4rem]";
  const desktopStyles = "fixed inset-y-0 right-0 w-[620px] border-l";
  const animation = isMobile ? "animate-in slide-in-from-bottom" : "animate-in slide-in-from-right";

  return (
    <div className={`fixed inset-0 z-[1000] ${isMobile ? 'bg-black/95 backdrop-blur-3xl' : 'pointer-events-none'}`} onClick={isMobile ? onClose : undefined}>
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`${isMobile ? mobileStyles : desktopStyles} bg-[#010408] border-white/10 shadow-[0_0_150px_rgba(0,0,0,1)] z-[1100] flex flex-col pointer-events-auto ${animation} duration-700 ease-out`}
      >
        <div className={`p-10 md:p-14 border-b border-white/5 flex items-center justify-between bg-black/50 ${isMobile ? 'rounded-t-[4rem]' : ''}`}>
          <div className="flex-1">
            <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Knowledge Shards</h3>
            <p className="text-[11px] text-blue-500 font-black uppercase tracking-[0.5em] mt-3">Neural Matrix Inspection</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-6 bg-white/5 hover:bg-rose-600 rounded-[2.5rem] text-slate-400 hover:text-white transition-all active:scale-90 shadow-2xl hover:rotate-90 duration-500"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-14 space-y-16 scrollbar-hide">
          {results.map((res, i) => (
            <div key={res.chunk.id} className="group relative animate-in fade-in slide-in-from-right duration-700" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="absolute -left-8 top-0 bottom-0 w-2 bg-blue-600/20 group-hover:bg-blue-500 transition-all rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-5">
                  <span className="text-[12px] font-black text-blue-400 bg-blue-600/10 px-5 py-2.5 rounded-2xl border border-blue-500/30 shadow-2xl uppercase tracking-[0.2em] italic">
                    SHARD :: {res.chunk.metadata.chunkIndex}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Neural Asset</span>
                    <span className="text-sm font-black text-slate-300 truncate max-w-[220px] italic">
                      {res.chunk.metadata.sourceFileName}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">Proximity</span>
                   <span className="text-base font-mono text-blue-500 font-black">
                    {(res.score * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div className="bg-[#03070c] p-10 md:p-12 rounded-[3.5rem] border border-white/5 group-hover:border-blue-500/40 transition-all duration-700 shadow-3xl">
                <div className="text-sm md:text-base text-slate-300 leading-relaxed font-mono selection:bg-blue-600/50">
                  <div className="pl-8 border-l-2 border-blue-500/10 py-4 mb-6 italic opacity-80">
                    {res.chunk.text}
                  </div>
                </div>
                
                <div className="mt-12 pt-10 border-t border-white/5 flex flex-col space-y-6">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Data Match integrity</span>
                      <span className="text-[10px] font-mono text-blue-500 font-black">SCAN_COMPLETE</span>
                   </div>
                   <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-700 to-blue-400 transition-all duration-1000 shadow-[0_0_15px_#3b82f6]" 
                        style={{ width: `${res.score * 100}%` }}
                      ></div>
                   </div>
                </div>
              </div>
            </div>
          ))}
          <div className="h-32"></div>
        </div>
        
        <div className="p-12 md:p-16 bg-black border-t border-white/5 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center space-x-6">
             <div className="w-14 h-14 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 shadow-2xl">
               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <p className="text-[11px] text-slate-600 uppercase font-black leading-relaxed tracking-widest italic opacity-80">
              Shards are prioritized by <span className="text-blue-500">Multimodal Neural Vectors</span> and Contextual Similarity scores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceExplorer;
