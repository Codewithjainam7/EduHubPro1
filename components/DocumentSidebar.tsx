
import React, { useRef, useState, useEffect } from 'react';
import { IngestedDocument, RagConfig } from '../types';
import { ragEngine } from '../services/ragEngine';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface DocumentSidebarProps {
  documents: IngestedDocument[];
  onIngest: (doc: IngestedDocument) => void;
  onRemove: (id: string) => void;
  config: RagConfig;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({ 
  documents, 
  onIngest, 
  onRemove,
  config, 
  isProcessing,
  setIsProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

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
      onIngest(doc);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || "Neural Link Error.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-80 border-r border-white/5 h-full flex flex-col bg-[#05080f] text-slate-300">
      <div className="p-8 border-b border-white/5">
        <h2 className="text-2xl font-black text-white mb-1 tracking-tighter italic uppercase">Knowledge</h2>
        <p className="text-[10px] text-blue-500 font-black tracking-[0.4em] uppercase">Base Active</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between px-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Assets</label>
          <span className="text-[10px] font-mono text-blue-500/60 font-bold">{documents.length}</span>
        </div>

        {documents.map(doc => (
          <div key={doc.id} className="group p-4 glass bg-white/[0.02] border border-white/5 rounded-2xl hover:border-blue-500/40 transition-all flex items-center justify-between">
            <div className="flex items-center space-x-3 truncate">
              <div className="p-2 rounded-lg bg-blue-500/10 text-[9px] font-black text-blue-400 uppercase">
                {doc.fileName.split('.').pop()}
              </div>
              <span className="text-xs font-bold text-slate-300 truncate">{doc.fileName}</span>
            </div>
            <button 
              onClick={() => onRemove(doc.id)}
              className="p-1 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="p-6 bg-black/40 border-t border-white/5">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.txt,.md,.html" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className={`w-full flex items-center justify-center space-x-3 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isProcessing ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 active:scale-95 hover:bg-blue-500'}`}
        >
          {isProcessing ? (
            <>
              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              <span>Ingest Shards</span>
            </>
          )}
        </button>
        {error && <div className="mt-4 text-[9px] text-rose-500 font-bold uppercase text-center tracking-widest">{error}</div>}
      </div>
    </div>
  );
};

export default DocumentSidebar;
