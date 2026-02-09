import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, RagConfig, SearchResult, Flashcard } from '../types';
import { ragEngine } from '../services/ragEngine';
import { geminiService } from '../services/geminiService';
import SourceExplorer from './SourceExplorer';
import { v4 as uuidv4 } from 'uuid';

interface ChatWindowProps {
  config: RagConfig;
  documentsCount: number;
  onAudit: (event: string, details: string) => void;
  onFlashcardsGenerated: (cards: Flashcard[]) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  config,
  documentsCount,
  onAudit,
  onFlashcardsGenerated,
  messages,
  setMessages
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sourceExplorerData, setSourceExplorerData] = useState<{ isOpen: boolean; results: SearchResult[] }>({
    isOpen: false,
    results: []
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleCreateCards = async (msgId: string, content: string) => {
    setIsGeneratingCards(msgId);
    try {
      const cards = await geminiService.generateFlashcards(content);
      onFlashcardsGenerated(cards);
      onAudit('Flashcard Creation', `Synthesized ${cards.length} neural cards from response.`);
    } finally {
      setIsGeneratingCards(null);
    }
  };

  const renderMarkdown = (text: string) => {
    let content = text;

    // 1. Code Blocks (Blue Themed)
    content = content.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<div class="my-4 bg-slate-950 border border-blue-500/20 rounded-xl overflow-hidden shadow-xl relative group">
        <div class="bg-blue-500/10 px-4 py-2 border-b border-blue-500/10 flex justify-between items-center">
          <span class="text-[9px] font-black text-blue-400 uppercase tracking-widest">Code Block</span>
          <div class="flex space-x-1">
            <div class="w-1.5 h-1.5 rounded-full bg-blue-500/20"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40"></div>
          </div>
        </div>
        <pre class="p-4 font-mono text-[11px] md:text-xs text-blue-100/90 overflow-x-auto selection:bg-blue-500/30"><code>${code.trim()}</code></pre>
      </div>`;
    });

    // 2. Headings (Blue Caps)
    content = content.replace(/^### (.*$)/gim, '<h3 class="text-sm md:text-base font-black text-white mt-8 mb-4 uppercase tracking-[0.2em] italic border-l-4 border-blue-600 pl-4">$1</h3>');
    content = content.replace(/^## (.*$)/gim, '<h2 class="text-lg md:text-xl font-black text-white mt-10 mb-6 uppercase tracking-tighter italic border-b border-blue-500/20 pb-2">$1</h2>');

    // 3. Formatting
    content = content.replace(/\*\*(.*?)\*\*/g, '<b class="text-blue-400 font-bold">$1</b>');
    content = content.replace(/\*(.*?)\*/g, '<i class="italic text-slate-400">$1</i>');

    // 4. Blockquotes
    content = content.replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-blue-500/50 pl-6 py-3 my-6 italic text-blue-100/60 bg-blue-500/5 rounded-r-2xl">$1</blockquote>');

    // 5. Lists (Custom Blue Bullets)
    const lines = content.split('\n');
    let inList = false;
    const finalLines: string[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const delay = index * 50; // Staggered animation delay

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) {
          finalLines.push('<ul class="list-none space-y-3 mb-6 pl-2">');
          inList = true;
        }
        finalLines.push(`<li class="flex items-start group animate-in slide-in-from-left-4 fade-in duration-500 fill-mode-backwards" style="animation-delay: ${delay}ms">
          <span class="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)] group-hover:scale-150 transition-transform duration-300"></span>
          <span class="text-slate-300 leading-relaxed font-normal tracking-wide">${trimmed.substring(2)}</span>
        </li>`);
      } else {
        if (inList) {
          finalLines.push('</ul>');
          inList = false;
        }
        if (trimmed) {
          // Paragraphs with subtle entry animation
          finalLines.push(`<p class="mb-5 leading-loose text-slate-300 font-normal tracking-wide animate-in slide-in-from-bottom-2 fade-in duration-700 fill-mode-backwards" style="animation-delay: ${delay}ms">${trimmed}</p>`);
        }
      }
    });

    if (inList) finalLines.push('</ul>');

    // 6. Citation "Shard" Tags - Support both with and without page numbers
    let finalHtml = finalLines.join('')
      .replace(/\[Source: (.*?), Page: (\d+), Chunk: (.*?)\]/g,
        '<span class="inline-flex items-center px-2.5 py-0.5 mx-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider hover:bg-blue-500/20 hover:border-blue-500/50 transition-all cursor-help select-none">PAGE $2</span>')
      .replace(/\[Source: (.*?), Chunk: (.*?)\]/g,
        '<span class="inline-flex items-center px-2.5 py-0.5 mx-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-400 font-bold uppercase tracking-wider hover:bg-blue-500/20 hover:border-blue-500/50 transition-all cursor-help select-none">SHARD $2</span>');

    return <div className="text-base md:text-lg selection:bg-blue-500/30 leading-relaxed" dangerouslySetInnerHTML={{ __html: finalHtml }} />;
  };

  const handleSend = async (textOverride?: string) => {
    const queryText = textOverride || input;
    if (!queryText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: queryText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setReasoning(isMobile ? "Scanning..." : "Inverting Query Vectors...");

    try {
      const searchResults = await ragEngine.search(userMsg.content, config);
      const strategy = searchResults[0]?.strategyUsed || 'semantic';
      setReasoning(isMobile ? "Generating..." : `Synthesizing study output [${strategy}]...`);
      const res = await geminiService.generateAnswer(userMsg.content, searchResults, { ...config, deviceType: isMobile ? 'mobile' : 'desktop' } as any);

      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: res.answer,
        timestamp: Date.now(),
        citations: searchResults,
        confidence: res.confidence,
        reasoning: res.reasoning,
        assumptions: res.assumptions,
        scope: res.scope,
        strategy: strategy,
        followUps: res.followUps,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { id: uuidv4(), role: 'assistant', content: "**CRITICAL OVERRIDE**: Knowledge retrieval failed.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
      setReasoning(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-transparent relative">
      <SourceExplorer
        isOpen={sourceExplorerData.isOpen}
        onClose={() => setSourceExplorerData({ ...sourceExplorerData, isOpen: false })}
        results={sourceExplorerData.results}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-12 space-y-10 md:space-y-20 scroll-smooth min-h-0">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-16 md:py-32 animate-in fade-in zoom-in-95 duration-1000">
            <div className="text-white font-black italic text-9xl md:text-[12rem] opacity-[0.03] mb-12 select-none pointer-events-none">E</div>
            <h2 className="text-2xl md:text-5xl font-black text-white mb-6 tracking-tighter uppercase italic drop-shadow-[0_0_30px_rgba(59,130,246,0.2)]">Study Workspace</h2>
            <p className="text-blue-500/40 text-[10px] md:text-xs max-w-[300px] md:max-w-md leading-relaxed font-black uppercase tracking-[0.5em]">
              EduHub Intelligence Active
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col animate-message ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center space-x-3 mb-4 px-3">
              <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${msg.role === 'user' ? 'text-blue-500' : 'text-slate-600'}`}>
                {msg.role === 'user' ? 'STUDENT' : 'EDUHUB SYSTEM'}
              </span>
              {msg.strategy && <span className="text-[9px] font-mono text-blue-500/40 font-bold uppercase tracking-tighter">:: {msg.strategy}</span>}
            </div>

            <div className={`glass p-5 md:p-8 rounded-2xl md:rounded-[2rem] max-w-[98%] md:max-w-[85%] border-white/5 shadow-xl transition-all duration-500 hover:border-blue-500/20 ${msg.role === 'user' ? 'bg-blue-600/5 border-blue-500/40 shadow-blue-500/5' : 'bg-[#0a0f18]/80'
              }`}>
              <div className="text-slate-200">
                {renderMarkdown(msg.content)}
              </div>

              {msg.role === 'assistant' && (
                <div className="mt-10 pt-8 border-t border-white/5 flex flex-wrap gap-4">
                  {msg.citations && msg.citations.length > 0 && (
                    <button
                      onClick={() => setSourceExplorerData({ isOpen: true, results: msg.citations! })}
                      className="flex items-center space-x-3 text-[10px] font-black text-blue-500 uppercase tracking-widest active:scale-95 transition-all bg-blue-500/5 px-6 py-3 rounded-2xl border border-blue-500/20 hover:border-blue-500/60 hover:bg-blue-500/10 shadow-lg shadow-blue-500/5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span>{msg.citations.length} Verified Shards</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleCreateCards(msg.id, msg.content)}
                    disabled={isGeneratingCards === msg.id}
                    className={`flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all px-6 py-3 rounded-2xl border ${isGeneratingCards === msg.id
                      ? 'bg-slate-800 text-slate-500 border-white/5'
                      : 'bg-indigo-500/5 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/60 hover:bg-indigo-500/10 shadow-lg shadow-indigo-500/5'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    <span>{isGeneratingCards === msg.id ? 'SYNCHRONIZING...' : 'MEMORY CARDS'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start space-y-6 max-w-3xl w-full">
            <div className="flex items-center space-x-3 px-3">
              <span className="text-[11px] font-black text-blue-500 uppercase tracking-[0.5em] animate-pulse">{reasoning}</span>
            </div>
            {/* High-End Cinematic Netflix-style "Data Scanning" Animation */}
            <div className="w-full glass rounded-[3rem] p-12 border-blue-500/10 bg-blue-500/5 relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent -translate-x-full animate-[loading_1.8s_infinite_linear] skew-x-[25deg]"></div>

              <div className="space-y-6 relative">
                <div className="h-4 w-11/12 bg-white/5 rounded-full animate-pulse"></div>
                <div className="h-4 w-full bg-white/5 rounded-full animate-pulse delay-100"></div>
                <div className="h-4 w-9/12 bg-white/5 rounded-full animate-pulse delay-200"></div>
                <div className="pt-8 flex space-x-6">
                  <div className="h-12 w-40 bg-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-12 w-40 bg-white/5 rounded-2xl animate-pulse delay-300"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile spacing for bottom nav */}
        {isMobile && <div className="h-24"></div>}
      </div>

      <div className={`p-3 md:p-6 bg-black/90 backdrop-blur-3xl border-t border-white/5 shrink-0 ${isMobile ? 'pb-28' : ''}`}>
        <div className="max-w-5xl mx-auto">
          <div className="glass rounded-2xl md:rounded-3xl p-1.5 md:p-2 flex items-center space-x-2 md:space-x-3 border-white/10 shadow-2xl focus-within:border-blue-500/50 transition-all duration-500 hover:border-white/20">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Query the knowledge collective..."
              className="flex-1 bg-transparent border-none outline-none text-sm md:text-base px-4 md:px-5 py-3 resize-none h-12 md:h-14 text-slate-100 placeholder-slate-700 font-medium scrollbar-hide"
              disabled={isLoading || documentsCount === 0}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || documentsCount === 0}
              className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-500 ${!input.trim() || isLoading ? 'text-slate-800 bg-white/5' : 'bg-blue-600 text-white active:scale-90 hover:bg-blue-500 shadow-xl shadow-blue-500/40 hover:rotate-3'}`}
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes loading { 0% { transform: translateX(-180%) skewX(25deg); } 100% { transform: translateX(180%) skewX(25deg); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default ChatWindow;
