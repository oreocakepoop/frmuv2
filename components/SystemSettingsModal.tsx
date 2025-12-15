import React, { useRef, useState } from 'react';
import { X, Save, Upload, Download, Trash2, Power, AlertOctagon, User, CheckCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { exportSystemConfig, importSystemConfig, factoryReset } from '../services/storageService';

interface SystemSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: UserProfile[];
    activeProfile: UserProfile | null;
    onProfileChange: (p: UserProfile | null) => void;
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({ 
    isOpen, onClose, profiles, activeProfile, onProfileChange 
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [msg, setMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

    if (!isOpen) return null;

    const handleExport = async () => {
        try {
            const blob = await exportSystemConfig();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FRMU_Config_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setMsg({ type: 'success', text: 'Configuration exported successfully.' });
        } catch (e) {
            setMsg({ type: 'error', text: 'Failed to export configuration.' });
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const json = ev.target?.result as string;
                await importSystemConfig(json);
                setMsg({ type: 'success', text: 'Configuration imported. Please refresh the page.' });
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                setMsg({ type: 'error', text: 'Invalid configuration file.' });
            }
        };
        reader.readAsText(file);
    };

    const handleFactoryReset = async () => {
        const confirm1 = confirm("⚠️ FACTORY RESET WARNING ⚠️\n\nThis will delete ALL data, including:\n- Loaded Excel Files\n- User Profiles & Mappings\n- Flagged Merchants\n- File Links\n\nAre you sure?");
        if (!confirm1) return;
        
        const confirm2 = confirm("Are you really sure? This cannot be undone.");
        if (!confirm2) return;

        try {
            await factoryReset();
            alert("System has been reset. The application will now reload.");
            window.location.reload();
        } catch (e) {
            alert("Reset failed. Please close all other tabs of this app and try again.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">System Access</h2>
                        <p className="text-xs text-slate-500">Lifecycle & Maintenance</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-8">
                    
                    {msg && (
                        <div className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertOctagon size={16} />}
                            {msg.text}
                        </div>
                    )}

                    {/* Quick Switch */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <User size={14} /> Active Session Profile
                        </h3>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <select 
                                value={activeProfile?.id || ''} 
                                onChange={(e) => {
                                    const p = profiles.find(pr => pr.id === e.target.value) || null;
                                    onProfileChange(p);
                                }}
                                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2.5 font-bold"
                            >
                                <option value="">-- Guest Session --</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                                Switching profiles instantly updates column mappings and dropdown options.
                            </p>
                        </div>
                    </div>

                    {/* Portability */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Save size={14} /> Configuration Portability
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={handleExport}
                                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 hover:border-brand-500 hover:text-brand-600 rounded-xl transition-all group shadow-sm hover:shadow-md"
                            >
                                <div className="p-3 bg-slate-50 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 rounded-full mb-2 transition-colors">
                                    <Download size={20} />
                                </div>
                                <span className="font-bold text-sm">Export Config</span>
                                <span className="text-[10px] text-slate-400 mt-1">Share settings</span>
                            </button>
                            
                            <button 
                                onClick={handleImportClick}
                                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 hover:border-brand-500 hover:text-brand-600 rounded-xl transition-all group shadow-sm hover:shadow-md"
                            >
                                <div className="p-3 bg-slate-50 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 rounded-full mb-2 transition-colors">
                                    <Upload size={20} />
                                </div>
                                <span className="font-bold text-sm">Import Config</span>
                                <span className="text-[10px] text-slate-400 mt-1">Load file</span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-6 border-t border-slate-100">
                        <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                            <AlertOctagon size={14} /> Danger Zone
                        </h3>
                        <button 
                            onClick={handleFactoryReset}
                            className="w-full py-3 bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 hover:border-red-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <Power size={16} /> Factory Reset System
                        </button>
                        <p className="text-[10px] text-center text-slate-400 mt-2">
                            Version 1.0.0 • Local Environment
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};