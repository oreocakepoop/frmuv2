import React, { useState } from 'react';
import { Database, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Trash2, Link, Globe, Plus, X } from 'lucide-react';
import { parseExcelFile, parseExcelFromUrl } from '../services/excelService';
import { ParsedDatabase } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: ParsedDatabase | ParsedDatabase[]) => void;
  onRemoveDatabase: (fileName: string) => void;
  onClearAll: () => void;
  loadedFiles: { name: string; count: number }[];
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, onRemoveDatabase, onClearAll, loadedFiles }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [progress, setProgress] = useState('');

  // If no files are loaded, we always show the form
  const isAdding = showAddForm || loadedFiles.length === 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);
    setProgress('');

    const results: ParsedDatabase[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            if (files.length > 1) setProgress(`Processing ${i + 1} of ${files.length}: ${file.name}`);
            const parsed = await parseExcelFile(file);
            results.push(parsed);
        } catch (err) {
            console.error(`Error parsing ${file.name}`, err);
            errors.push(file.name);
        }
      }

      if (results.length > 0) {
        await onDataLoaded(results);
        setShowAddForm(false);
      }

      if (errors.length > 0) {
        setError(`Failed to parse: ${errors.join(', ')}. Ensure they are valid Excel files.`);
      }

    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during upload.");
    } finally {
      setLoading(false);
      setProgress('');
      // Reset input
      e.target.value = '';
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    
    try {
        const parsed = await parseExcelFromUrl(url.trim());
        await onDataLoaded(parsed);
        setUrl('');
        setShowAddForm(false);
    } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load from URL. Ensure the URL is accessible (CORS enabled) and points to a valid Excel file.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
          <Database size={24} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Databases</h2>
        <span className="ml-auto bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{loadedFiles.length}</span>
      </div>

      {/* Loaded Files List */}
      {loadedFiles.length > 0 && (
        <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-1">
            {loadedFiles.map((file) => (
                <div key={file.name} className="group bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-3 hover:border-brand-200 transition-colors">
                    <div className="bg-white p-1.5 rounded border border-slate-200 text-green-600">
                        <FileSpreadsheet size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate" title={file.name}>{file.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">{file.count.toLocaleString()} records</p>
                    </div>
                    <button 
                        onClick={() => onRemoveDatabase(file.name)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Remove Database"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}

            {loadedFiles.length > 0 && !isAdding && (
                 <div className="flex gap-2 mt-4">
                    <button 
                        onClick={() => setShowAddForm(true)}
                        className="flex-1 py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg font-bold text-sm hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Add Sources
                    </button>
                    <button 
                        onClick={onClearAll}
                        className="py-2 px-3 border border-slate-200 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                        title="Unload All"
                    >
                        <Trash2 size={16} />
                    </button>
                 </div>
            )}
        </div>
      )}

      {/* Add Form Area */}
      {isAdding && (
        <div className={`flex flex-col ${loadedFiles.length > 0 ? 'border-t border-slate-200 pt-4' : 'flex-1 justify-center'}`}>
            {loadedFiles.length > 0 && (
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-700">Add Data Source</h3>
                    <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                    </button>
                </div>
            )}
            
            <div className="flex border-b border-slate-200 mb-6">
                <button 
                    className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'upload' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    onClick={() => { setActiveTab('upload'); setError(null); }}
                >
                    Upload File
                </button>
                <button 
                    className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'url' ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    onClick={() => { setActiveTab('url'); setError(null); }}
                >
                    From URL
                </button>
            </div>

            <div className="">
                {activeTab === 'upload' ? (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {loading ? (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-3"></div>
                            {progress && <span className="text-xs text-brand-600 font-medium">{progress}</span>}
                        </div>
                    ) : (
                        <Upload className="w-8 h-8 mb-3 text-slate-400" />
                    )}
                    {!loading && (
                        <>
                        <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span></p>
                        <p className="text-xs text-slate-500">.XLSX or .XLS (Select Multiple)</p>
                        </>
                    )}
                    </div>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} disabled={loading} multiple />
                </label>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <input 
                                type="text"
                                id="urlInput"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder=" "
                                className="block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent pl-9"
                            />
                            <label
                                htmlFor="urlInput"
                                className="absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-8 pointer-events-none"
                            >
                                https://...
                            </label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Link className="h-4 w-4" />
                            </div>
                        </div>
                        <button 
                            onClick={handleUrlSubmit}
                            disabled={!url.trim() || loading}
                            className="w-full py-2.5 bg-brand-600 text-white rounded-full font-bold text-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Globe size={16} />}
                            Fetch
                        </button>
                    </div>
                )}

                {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-start gap-2">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <div>{error}</div>
                </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};