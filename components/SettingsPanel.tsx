
import React from 'react';
import { RagConfig } from '../types';

interface SettingsPanelProps {
  config: RagConfig;
  onChange: (config: RagConfig) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onChange }) => {
  const handleChange = (name: string, value: any) => {
    onChange({ ...config, [name]: value });
  };

  const retrievalPresets = [
    { label: 'Minimal', val: 2 },
    { label: 'Balanced', val: 6 },
    { label: 'Broad', val: 10 },
    { label: 'Exhaustive', val: 15 },
  ];

  return (
    <div className="p-4 md:p-6 bg-[#0d1117]/90 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          
          {/* RETRIEVAL CONTROL */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieval Breadth (Top-K)</label>
              <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{config.topK} Chunks</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {retrievalPresets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleChange('topK', p.val)}
                  className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border ${
                    config.topK === p.val 
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
                      : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* TEMPERATURE SLIDER (NEW SCROLLABLE RANGE) */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Creative Temperature</label>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${config.temperature < 0.4 ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' : config.temperature < 0.7 ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' : 'text-violet-400 border-violet-500/20 bg-violet-500/5'}`}>
                {config.temperature.toFixed(1)} — {config.temperature < 0.4 ? 'STRICT' : config.temperature < 0.7 ? 'BALANCED' : 'CREATIVE'}
              </span>
            </div>
            <div className="px-1">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={config.temperature} 
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
              />
              <div className="flex justify-between mt-3 text-[8px] font-black text-slate-600 uppercase tracking-tighter">
                <span>0.0 Factuality</span>
                <span>0.5 Balanced</span>
                <span>1.0 Creativity</span>
              </div>
            </div>
          </div>

          {/* GROUNDING & DEPTH */}
          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Inference strategy</label>
            <div className="space-y-3">
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                {(['factual', 'balanced', 'creative'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleChange('strictness', mode)}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${
                      config.strictness === mode 
                        ? 'bg-slate-800 text-blue-400 shadow-inner' 
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                {(['concise', 'standard', 'detailed'] as const).map((depth) => (
                  <button
                    key={depth}
                    onClick={() => handleChange('answerDepth', depth)}
                    className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${
                      config.answerDepth === depth 
                        ? 'bg-slate-800 text-indigo-400 shadow-inner' 
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    {depth}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
