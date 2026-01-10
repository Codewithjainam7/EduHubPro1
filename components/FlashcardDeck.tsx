
import React, { useState } from 'react';
import { Flashcard } from '../types';

interface FlashcardDeckProps {
  cards: Flashcard[];
  onRemove: (id: string) => void;
}

const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ cards, onRemove }) => {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);

  const toggleFlip = (id: string) => {
    const next = new Set(flippedCards);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFlippedCards(next);
  };

  const handleSnapDelete = (id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      onRemove(id);
      setRemovingId(null);
    }, 800);
  };

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-20 italic">
        <div className="w-16 h-16 mb-6 border-2 border-dashed border-blue-500/40 rounded-2xl animate-pulse"></div>
        <p className="text-xl font-black uppercase tracking-[0.5em] text-white">Neural Void</p>
        <p className="text-[10px] mt-2 font-black tracking-widest text-blue-500/60 uppercase">No active memory shards detected.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 scrollbar-hide">
      {cards.map((card) => (
        <div 
          key={card.id} 
          className={`relative group h-64 md:h-72 perspective-1000 transition-all duration-500 ${removingId === card.id ? 'animate-disintegrate' : 'animate-in fade-in zoom-in-95'}`}
        >
          {/* Snap Cancel Button - Elegant Rose Quartz Glow */}
          <button 
            onClick={(e) => { e.stopPropagation(); handleSnapDelete(card.id); }}
            className="absolute -top-3 -right-3 z-[100] w-10 h-10 bg-black border border-rose-500/40 text-rose-500 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white hover:border-rose-600 shadow-2xl shadow-rose-600/20 active:scale-90"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div 
            onClick={() => toggleFlip(card.id)}
            className={`card-inner h-full w-full preserve-3d cursor-pointer ${flippedCards.has(card.id) ? 'rotate-y-180' : ''}`}
          >
            {/* Front - Cleaner Spacing */}
            <div className="absolute inset-0 backface-hidden glass rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 flex flex-col items-center justify-center text-center border-white/5 bg-[#0a0f18]/80 holo-glow transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
              <span className="absolute top-6 left-8 text-[9px] font-black text-blue-500/60 uppercase tracking-[0.4em] italic">Concept</span>
              <p className="text-lg md:text-xl font-black text-white leading-snug italic tracking-tight px-4">
                {card.question}
              </p>
              <div className="mt-8 text-[8px] font-black text-slate-600 uppercase tracking-[0.5em] group-hover:text-blue-500/40 transition-colors">Invoke Data</div>
            </div>
            
            {/* Back - Verified Matrix Design */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 glass rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 flex flex-col items-center justify-center text-center border-blue-500/40 bg-blue-600/5 shadow-[inset_0_0_60px_rgba(59,130,246,0.1)] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
              <span className="absolute top-6 left-8 text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] italic">Knowledge</span>
              <div className="max-h-[80%] overflow-y-auto scrollbar-hide">
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium px-2">
                  {card.answer}
                </p>
              </div>
              <div className="mt-8 text-[8px] font-black text-blue-500/40 uppercase tracking-[0.4em] italic animate-pulse">Neural Link Verified</div>
            </div>
          </div>
        </div>
      ))}
      <div className="h-40 md:h-0 col-span-full"></div>
    </div>
  );
};

export default FlashcardDeck;
