import React, { useState, useEffect, useRef } from 'react';
import { IngestedDocument, RagConfig, AppPage, AuditLog, Flashcard, ChatMessage, Toast } from './types';
import { DEFAULT_CONFIG } from './constants';
import DocumentSidebar from './components/DocumentSidebar';
import SettingsPanel from './components/SettingsPanel';
import ChatWindow from './components/ChatWindow';
import BootScreen from './components/BootScreen';
import BottomNav from './components/BottomNav';
import FlashcardDeck from './components/FlashcardDeck';
import { v4 as uuidv4 } from 'uuid';
import { ragEngine } from './services/ragEngine';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

const App: React.FC = () => {
  const [documents, setDocuments] = useState<IngestedDocument[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]); 
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [config, setConfig] = useState<RagConfig>(DEFAULT_CONFIG);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [activeTab, setActiveTab] = useState<AppPage>('Workspace');
  const [showSettings, setShowSettings] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const addAudit = (event: string, details: string, status: AuditLog['status'] = 'SUCCESS') => {
    setAuditLogs(prev => [{ id: uuidv4(), timestamp: Date.now(), event, status, details }, ...prev].slice(0, 100));
  };

  const handleFlashcardsGenerated = (cards: Flashcard[]) => {
    setFlashcards(prev => [...cards, ...prev]);
    addToast(`Neural Extraction: ${cards.length} Concepts Indexed`);
    setActiveTab('Flashcards');
  };

  const handleIngest = (doc: IngestedDocument) => {
    setDocuments(prev => [...prev, doc]);
    addToast(`Link Established: ${doc.fileName}`);
    addAudit('Document Ingestion', `Successfully indexed ${doc.fileName}.`);
    if (isMobile) setActiveTab('Workspace');
  };

  const handleRemoveDoc = (id: string) => {
    const doc = documents.find(d => d.id === id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    addToast(`Link Severed: ${doc?.fileName || 'Asset'} removed`, 'info');
    addAudit('Asset Purged', `Removed ${doc?.fileName} from matrix.`);
  };

  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(" ") + "\n";
    }
    return fullText;
  };

  const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleMobileFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      let text = "";
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        text = await extractTextFromPdf(arrayBuffer);
      } else if (extension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        text = await extractTextFromDocx(arrayBuffer);
      } else {
        text = await file.text();
      }

      const doc = await ragEngine.ingestDocument(file.name, file.type, text, config);
      handleIngest(doc);
      if (mobileFileInputRef.current) mobileFileInputRef.current.value = '';
    } catch (err: any) {
      addToast(err.message || "Neural Link Error.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isBooting) return <BootScreen onComplete={() => setIsBooting(false)} />;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#000000] overflow-hidden font-sans text-slate-200">
      {/* Hidden file input for mobile */}
      {isMobile && (
        <input 
          type="file" 
          ref={mobileFileInputRef} 
          onChange={handleMobileFileUpload} 
          className="hidden" 
          accept=".pdf,.docx,.txt,.md,.html" 
        />
      )}

      {/* Neural Toast Layer - Fixed clipping and overflow */}
      <div className="fixed top-4 md:top-8 right-4 md:right-8 z-[1000] flex flex-col space-y-4 w-auto max-w-[calc(100vw-2rem)] md:w-80 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto glass p-4 md:p-5 rounded-2xl md:rounded-3xl border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] animate-in slide-in-from-right-12 duration-500 flex items-center space-x-4 overflow-hidden">
            <div className={`w-3 h-3 rounded-full shrink-0 ${toast.type === 'error' ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e]' : 'bg-blue-500 shadow-[0_0_12px_#3b82f6]'}`}></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic break-words flex-1 min-w-0">{toast.message}</p>
          </div>
        ))}
      </div>

      {!isMobile && (
        <DocumentSidebar 
          documents={documents} 
          onIngest={handleIngest} 
          onRemove={handleRemoveDoc}
          config={config} 
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
        />
      )}
      
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
        <header className="glass border-b-0 px-6 md:px-12 py-5 md:py-8 flex items-center justify-between z-[50] shadow-2xl m-3 md:m-6 rounded-[2rem] md:rounded-[3rem] shrink-0">
          <div className="flex items-center space-x-6 md:space-x-16">
            <div className="group cursor-pointer">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter italic">
                ARCHI<span className="text-blue-500">RAG</span>
              </h1>
              <span className="hidden md:inline-block text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-1">Operational Kernel</span>
            </div>
            
            {!isMobile && (
              <nav className="flex space-x-3">
                 {(['Workspace', 'Explorer', 'Flashcards', 'Security', 'Audit'] as AppPage[]).map((tab) => (
                   <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === tab ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                   >
                     {tab}
                   </button>
                 ))}
              </nav>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-4 rounded-2xl border border-white/5 transition-all duration-500 ${showSettings ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/30' : 'glass text-slate-500 hover:text-white hover:border-blue-500/30'}`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-2xl ring-2 ring-white/10">AD</div>
          </div>
        </header>

        <div className={`transition-all duration-700 ease-in-out overflow-hidden shrink-0 ${showSettings ? 'max-h-[600px] opacity-100 mb-4 px-4' : 'max-h-0 opacity-0'}`}>
          <SettingsPanel config={config} onChange={setConfig} />
        </div>

        {/* SECTION CONTAINER WITH TRANSITION */}
        <div key={activeTab} className="flex-1 min-h-0 flex flex-col relative animate-section-switch">
          {activeTab === 'Workspace' && (
            <ChatWindow 
              config={config} 
              documentsCount={documents.length} 
              onAudit={addAudit} 
              onFlashcardsGenerated={handleFlashcardsGenerated}
              messages={messages}
              setMessages={setMessages}
            />
          )}
          
          {activeTab === 'Flashcards' && (
            <FlashcardDeck 
              cards={flashcards} 
              onRemove={(id) => setFlashcards(prev => prev.filter(c => c.id !== id))} 
            />
          )}

          {activeTab === 'Explorer' && (
            <div className="flex-1 overflow-y-auto p-6 md:p-14 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {documents.length === 0 ? (
                <div className="col-span-full h-64 flex flex-col items-center justify-center opacity-20 italic space-y-6 uppercase tracking-[0.5em] font-black text-center">
                  Awaiting Neural Asset Link
                </div>
              ) : (
                documents.map(doc => (
                  <div key={doc.id} className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6 hover:border-blue-500/40 transition-all group relative shadow-2xl hover:-translate-y-2">
                    <button 
                      onClick={() => handleRemoveDoc(doc.id)}
                      className="absolute top-6 right-6 p-3 bg-rose-500/10 text-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white shadow-xl shadow-rose-500/10"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white truncate italic">{doc.fileName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em] mt-2">{doc.chunks.length} Neural Shards</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="p-6 md:p-14 max-w-5xl mx-auto w-full space-y-8">
               <div className="glass p-12 rounded-[3rem] space-y-10 border-blue-500/10">
                  <h3 className="text-3xl font-black text-white italic tracking-tighter">Secure Kernel Protection</h3>
                  <div className="bg-[#05080f] p-8 rounded-[2rem] border border-blue-500/20 flex items-center shadow-2xl">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full mr-5 animate-pulse shadow-[0_0_20px_#10b981]"></div>
                    <div>
                        <span className="text-sm font-mono text-emerald-400 font-bold uppercase tracking-[0.3em]">Neural Shield: Active</span>
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">AES-GCM Memory Layer encryption initialized.</p>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'Audit' && (
            <div className="p-6 md:p-14 flex flex-col h-full">
               <div className="glass rounded-[3rem] overflow-hidden flex flex-col h-full border-white/5 shadow-inner">
                  <div className="p-8 bg-black/40 border-b border-white/5 font-black text-[11px] uppercase tracking-[0.4em] italic text-blue-500">Operation Trace History</div>
                  <div className="flex-1 overflow-y-auto font-mono text-[10px] p-8 space-y-5 scrollbar-hide">
                     {auditLogs.map(log => (
                       <div key={log.id} className="flex border-l-4 border-blue-600/20 pl-6 py-2 hover:bg-white/5 transition-all rounded-r-2xl">
                          <span className="text-slate-600 mr-6 shrink-0 font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className="text-blue-400 font-black uppercase mr-6 shrink-0 tracking-widest">{log.event}</span>
                          <span className="text-slate-400 font-medium italic">{log.details}</span>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}
        </div>

        {isMobile && (
          <BottomNav 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            onUploadClick={() => mobileFileInputRef.current?.click()}
            isProcessing={isProcessing}
          />
        )}
      </main>
    </div>
  );
};

export default App;
