import React from 'react';
import { AppPage } from '../types';

interface BottomNavProps {
  activeTab: AppPage;
  onTabChange: (tab: AppPage) => void;
  onUploadClick: () => void;
  isProcessing: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, onUploadClick, isProcessing }) => {
  const tabs: { id: AppPage; icon: React.ReactNode; label: string }[] = [
    {
      id: 'Workspace',
      label: 'Chat',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    },
    {
      id: 'Flashcards',
      label: 'Cards',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
    {
      id: 'Explorer',
      label: 'Files',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'Audit',
      label: 'Logs',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full glass border-t border-white/10 z-[100] px-4 py-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex justify-between items-center" style={{ position: 'fixed', transform: 'translateZ(0)' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center space-y-1 transition-all duration-300 ${activeTab === tab.id ? 'text-blue-500 scale-110' : 'text-slate-500'}`}
        >
          <div className={`${activeTab === tab.id ? 'bg-blue-500/10 p-2 rounded-xl' : 'p-2'}`}>
            {tab.icon}
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
        </button>
      ))}

      {/* Upload Button - Center FAB Style */}
      <button
        onClick={onUploadClick}
        disabled={isProcessing}
        className={`flex flex-col items-center space-y-1 transition-all duration-300 ${isProcessing
            ? 'text-slate-700 scale-95'
            : 'text-blue-500 hover:scale-110 active:scale-95'
          }`}
      >
        <div className={`${isProcessing
            ? 'bg-slate-800/50 p-3 rounded-xl'
            : 'bg-blue-600 p-3 rounded-xl shadow-2xl shadow-blue-500/40'
          }`}>
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest">
          {isProcessing ? 'Syncing' : 'Upload'}
        </span>
      </button>
    </div>
  );
};

export default BottomNav;
