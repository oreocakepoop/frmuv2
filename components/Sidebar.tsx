import React from 'react';
import { LayoutDashboard, ShieldCheck, Database, Settings, HelpCircle, ChevronRight, Flag, Search, Upload, PenTool } from 'lucide-react';

interface SidebarProps {
  currentView: 'search' | 'upload' | 'add_entry' | 'admin' | 'flagged' | 'documentation';
  onChangeView: (view: 'search' | 'upload' | 'add_entry' | 'admin' | 'flagged' | 'documentation') => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onOpenSettings }) => {
  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out font-sans">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {/* Logo Icon replicating the vibe */}
          <div className="bg-brand-600 text-white p-1.5 rounded-lg shadow-sm">
             <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-brand-700">
            Network<span className="text-red-500 ml-0.5 text-lg">›</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 flex flex-col gap-1 px-3">
        
        {/* Main Section */}
        <div className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 mt-1">Main</div>

        <button
          onClick={() => onChangeView('search')}
          className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 group ${
            currentView === 'search' 
              ? 'bg-brand-600 text-white shadow-md shadow-brand-900/10' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <Search size={18} className={currentView === 'search' ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'} />
            <span>Search Held Merchant</span>
          </div>
          {currentView === 'search' && <ChevronRight size={14} className="text-brand-200" />}
        </button>

        <button
          onClick={() => onChangeView('flagged')}
          className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 group ${
            currentView === 'flagged' 
              ? 'bg-brand-600 text-white shadow-md shadow-brand-900/10' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <Flag size={18} className={currentView === 'flagged' ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'} />
            <span>Flagged Merchants</span>
          </div>
           {currentView === 'flagged' && <ChevronRight size={14} className="text-brand-200" />}
        </button>

        <div className="my-4 border-t border-slate-100 mx-2"></div>

        {/* Data Management Section */}
        <div className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Data Management</div>

        <button
          onClick={() => onChangeView('upload')}
          className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 group ${
            currentView === 'upload' 
              ? 'bg-brand-600 text-white shadow-md shadow-brand-900/10' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <Upload size={18} className={currentView === 'upload' ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'} />
            <span>Upload Data</span>
          </div>
           {currentView === 'upload' && <ChevronRight size={14} className="text-brand-200" />}
        </button>

        <button
          onClick={() => onChangeView('add_entry')}
          className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 group ${
            currentView === 'add_entry' 
              ? 'bg-brand-600 text-white shadow-md shadow-brand-900/10' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <PenTool size={18} className={currentView === 'add_entry' ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'} />
            <span>Manual Entry</span>
          </div>
           {currentView === 'add_entry' && <ChevronRight size={14} className="text-brand-200" />}
        </button>
        
        <div className="my-4 border-t border-slate-100 mx-2"></div>

        <div className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">System</div>
        
        <button
          onClick={() => onChangeView('admin')}
          className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 group ${
            currentView === 'admin' 
              ? 'bg-brand-600 text-white shadow-md shadow-brand-900/10' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <LayoutDashboard size={18} className={currentView === 'admin' ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'} />
            <span>Admin Dashboard</span>
          </div>
           {currentView === 'admin' && <ChevronRight size={14} className="text-brand-200" />}
        </button>
        
        <button 
            onClick={() => onChangeView('documentation')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 group ${
            currentView === 'documentation' 
              ? 'bg-brand-600 text-white shadow-md shadow-brand-900/10' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <HelpCircle size={18} className={currentView === 'documentation' ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'} />
            <span>Documentation</span>
          </div>
           {currentView === 'documentation' && <ChevronRight size={14} className="text-brand-200" />}
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <button 
          onClick={onOpenSettings}
          className="w-full bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 shadow-sm hover:border-brand-300 hover:shadow-md transition-all group text-left"
        >
          <div className="h-8 w-8 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-xs group-hover:bg-brand-600 group-hover:text-white transition-colors">
            A
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-xs font-bold text-slate-800 truncate group-hover:text-brand-700">Administrator</div>
            <div className="text-[10px] text-slate-500 truncate">System Access</div>
          </div>
          <Settings size={14} className="text-slate-400 group-hover:text-brand-600" />
        </button>
      </div>
    </div>
  );
};