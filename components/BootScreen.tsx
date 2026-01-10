
import React, { useState, useEffect } from 'react';

const BootScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [stage, setStage] = useState<'streaks' | 'logo' | 'exit' | 'done'>('streaks');

  useEffect(() => {
    const sequence = [
      setTimeout(() => setStage('logo'), 300),
      setTimeout(() => setStage('exit'), 2400),
      setTimeout(() => setStage('done'), 3000),
      setTimeout(onComplete, 3100)
    ];
    return () => sequence.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 bg-[#000000] z-[9999] flex items-center justify-center overflow-hidden transition-all duration-700 ${stage === 'done' ? 'opacity-0 scale-105' : 'opacity-100'}`}>
      <div className="scanlines" />
      
      {/* Intense Multi-Layered Cinematic Streaks */}
      <div className="absolute inset-0 flex justify-around pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div 
            key={i}
            className="netflix-streak"
            style={{
              left: `${(i / 30) * 100}%`,
              animation: `streak-flow ${0.4 + Math.random() * 0.6}s ease-out forwards`,
              animationDelay: `${Math.random() * 0.3}s`,
              opacity: 0.1 + Math.random() * 0.3,
              width: `${1 + Math.random() * 2}px`
            }}
          />
        ))}
      </div>

      {/* High-Impact Cinematic Logo Reveal - Glow Reduced */}
      <div className={`relative flex flex-col items-center transition-all duration-500 ${stage === 'exit' ? 'animate-final-exit' : ''} ${stage === 'streaks' ? 'opacity-0' : 'opacity-100'}`}>
        <div className="absolute inset-0 bg-blue-600/5 blur-[60px] scale-150 animate-pulse"></div>
        
        <div 
          className="relative text-white font-black italic tracking-tighter transition-all duration-700"
          style={{ 
            fontSize: '10rem',
            animation: stage === 'logo' ? 'logo-reveal 1s cubic-bezier(0.1, 0.9, 0.2, 1) forwards' : 'none',
            textShadow: '0 0 15px rgba(59, 130, 246, 0.3)'
          }}
        >
          A
          <div className="absolute bottom-10 left-0 right-0 h-1.5 bg-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.7)] rounded-full"></div>
        </div>

        <div className={`mt-2 transition-all duration-700 ${stage === 'logo' ? 'opacity-80 translate-y-0' : 'opacity-0 translate-y-6'}`}>
           <h1 className="text-xl font-black text-white tracking-[0.8em] uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
            ARCHI<span className="text-blue-500">RAG</span>
          </h1>
        </div>
      </div>

      {/* Neural Link Indicators */}
      <div className="absolute bottom-24 flex items-center space-x-10 opacity-30">
        <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
        <div className="flex space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping delay-200"></div>
        </div>
        <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse delay-300"></div>
      </div>
      
      <div className="absolute bottom-8 text-[9px] font-black text-slate-800 uppercase tracking-[0.6em] animate-pulse">
        Initializing Cognitive Matrix
      </div>
    </div>
  );
};

export default BootScreen;
