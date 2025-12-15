import React, { useState, useEffect, useMemo } from 'react';
import { ParsedDatabase, MerchantRecord, UserProfile } from '../types';
import { Flag, Search, Download, Trash2, AlertCircle, FileSpreadsheet, CheckCircle, X, ChevronDown, ChevronUp, Briefcase, User, Calendar, DollarSign, Activity, Copy, ShieldAlert, AlertTriangle, Layers, LayoutList, LayoutGrid, BarChart2, PieChart } from 'lucide-react';
import { normalizeKey, findMidColumn, findNameColumn, exportToExcel, formatDateForDisplay, getStatusColor } from '../services/excelService';
import { saveFlaggedMerchant, getFlaggedMerchants, deleteFlaggedMerchant } from '../services/storageService';

interface FlaggedMerchantsProps {
  databases: ParsedDatabase[];
  activeProfile: UserProfile | null;
}

type ViewMode = 'card' | 'list' | 'group' | 'analytics';

// --- SUB COMPONENTS ---

const SimpleBarChart: React.FC<{ data: { label: string; value: number; color?: string }[]; total: number }> = ({ data, total }) => {
    return (
        <div className="space-y-3">
            {data.map((item, idx) => {
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                return (
                    <div key={idx} className="group">
                         <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                             <span className="truncate">{item.label || 'Unknown'}</span>
                             <span>{item.value}</span>
                         </div>
                         <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div 
                                style={{ width: `${percentage}%` }} 
                                className={`h-full rounded-full transition-all duration-500 ${item.color || 'bg-brand-500'}`}
                             ></div>
                         </div>
                    </div>
                );
            })}
        </div>
    );
};

export const FlaggedMerchants: React.FC<FlaggedMerchantsProps> = ({ databases, activeProfile }) => {
  const [flagMid, setFlagMid] = useState('');
  const [flaggedList, setFlaggedList] = useState<MerchantRecord[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [groupBy, setGroupBy] = useState<'channel' | 'type'>('channel');

  // Security / Verification State
  const [previewRecord, setPreviewRecord] = useState<MerchantRecord | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Duplicate Handling
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Copy Feedback State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load flagged items on mount
  useEffect(() => {
    loadFlaggedData();
  }, []);

  const loadFlaggedData = async () => {
    const data = await getFlaggedMerchants();
    setFlaggedList(data.reverse());
  };

  const handleSearchForFlag = async () => {
    if (!flagMid.trim()) return;
    setMessage(null);
    setPreviewRecord(null);
    setDuplicateCount(0);

    const searchKey = normalizeKey(flagMid);
    let foundRecord: MerchantRecord | null = null;
    let sourceFile = '';

    // Search across all loaded databases
    for (const db of databases) {
      // 1. Try to find specific MID column first for accuracy
      let midCol = findMidColumn(db.columns);
      let match: MerchantRecord | undefined;

      if (midCol) {
        match = db.data.find(row => normalizeKey(String(row[midCol])) === searchKey);
      } 
      
      // 2. Fallback: Exhaustive search
      if (!match) {
        match = db.data.find(row => {
            return Object.values(row).some(val => normalizeKey(String(val)) === searchKey);
        });
      }

      if (match) {
        foundRecord = match;
        sourceFile = db.fileName;
        break; 
      }
    }

    if (foundRecord) {
       // Check if already flagged - Count occurrences
       const existingMatches = flaggedList.filter(f => {
           // Heuristic: Does this record match the search key in its values?
           return Object.values(f).some(val => normalizeKey(String(val)) === searchKey);
       });

       setDuplicateCount(existingMatches.length);

        // SET PREVIEW FOR VERIFICATION
        setPreviewRecord({ ...foundRecord, Source_File: sourceFile });
        setShowPreview(true);
        
    } else {
      setMessage({ type: 'error', text: `Merchant MID "${flagMid}" not found in any loaded database.` });
    }
  };

  const confirmFlag = async () => {
    if (!previewRecord) return;

    try {
        const recordToSave = { 
            ...previewRecord, 
            Flagged_Date: new Date().toLocaleDateString('en-CA') // Save as ISO YYYY-MM-DD for consistency
        };
        
        await saveFlaggedMerchant(recordToSave);
        await loadFlaggedData();
        
        setMessage({ type: 'success', text: `Successfully flagged merchant from ${previewRecord.Source_File}` });
        setFlagMid('');
        setShowPreview(false);
        setPreviewRecord(null);
    } catch (e) {
        console.error(e);
        setMessage({ type: 'error', text: 'Failed to save merchant data.' });
    }
  };

  const handleDelete = async (flagId: number) => {
      if(!confirm("Remove this merchant from the flagged list?")) return;
      await deleteFlaggedMerchant(flagId);
      await loadFlaggedData();
  };

  const handleExport = () => {
      if (flaggedList.length === 0) return;
      exportToExcel(flaggedList, `Flagged_Merchants_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleExpand = (id: number) => {
      setExpandedId(expandedId === id ? null : id);
  };

  const formatValue = (key: string, value: any): string => {
      if (value === null || value === undefined) return '';
      let str = String(value);
      
      const normKey = normalizeKey(key);
      
      // Date Formatting
      if (normKey.includes('date') || normKey === 'dateofhold' || normKey === 'dateofrelease' || normKey === 'flaggeddate') {
          return formatDateForDisplay(str);
      }

      // EXCEPTION: Merchant Name and Channel kept raw/uppercase
      if (normKey.includes('name') || normKey.includes('channel') || normKey === 'dba' || normKey === 'legalname') {
          return str;
      }

      // Title Case for everything else
      return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  };

  const handleCopy = (text: string, key: string) => {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
  };

  const getMidFromRecord = (record: MerchantRecord) => {
      const k = findMidColumn(Object.keys(record));
      return k ? String(record[k]) : 'Unknown ID';
  };

  // --- ANALYTICS CALCULATIONS ---
  const analyticsData = useMemo(() => {
      const statusCounts: Record<string, number> = {};
      const channelCounts: Record<string, number> = {};
      let totalHoldAmount = 0;

      flaggedList.forEach(item => {
          const keys = Object.keys(item);
          
          // Status
          const statusKey = keys.find(k => normalizeKey(k).includes('status'));
          const status = statusKey ? String(item[statusKey] || 'Unknown').toUpperCase() : 'UNKNOWN';
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          // Channel (Column G logic - prioritizing finalseg)
          const channelKey = keys.find(k => ['finalseg', 'final_segment', 'finalsegment', 'final_seg', 'channel'].includes(normalizeKey(k)));
          const channel = channelKey ? String(item[channelKey] || 'Unassigned').toUpperCase() : 'UNASSIGNED';
          channelCounts[channel] = (channelCounts[channel] || 0) + 1;

          // Hold Amount
          const holdKey = keys.find(k => normalizeKey(k).includes('holdamount'));
          if (holdKey && item[holdKey]) {
              const val = String(item[holdKey]).replace(/[^0-9.-]+/g, '');
              const num = parseFloat(val);
              if (!isNaN(num)) totalHoldAmount += num;
          }
      });

      const topStatuses = Object.entries(statusCounts)
          .map(([label, value]) => ({ label, value, color: getStatusColor(label).includes('emerald') ? 'bg-emerald-500' : getStatusColor(label).includes('rose') ? 'bg-rose-500' : getStatusColor(label).includes('purple') ? 'bg-purple-500' : 'bg-slate-400' }))
          .sort((a,b) => b.value - a.value)
          .slice(0, 5);

      const topChannels = Object.entries(channelCounts)
          .map(([label, value]) => ({ label, value, color: 'bg-brand-500' }))
          .sort((a,b) => b.value - a.value)
          .slice(0, 5);

      return { topStatuses, topChannels, totalHoldAmount };
  }, [flaggedList]);

  // --- GROUPING LOGIC ---
  const groupedList = useMemo<Record<string, MerchantRecord[]>>(() => {
      if (viewMode !== 'group') return {};
      
      const groups: Record<string, MerchantRecord[]> = {};
      
      flaggedList.forEach(item => {
          const keys = Object.keys(item);
          let groupKey = 'Other';

          if (groupBy === 'channel') {
             // Prioritize Final Segment
             const k = keys.find(key => ['finalseg', 'final_segment', 'finalsegment', 'final_seg', 'channel'].includes(normalizeKey(key)));
             groupKey = k && item[k] ? String(item[k]).toUpperCase() : 'UNASSIGNED';
          } else {
             // Group by Type (POS/ECOM)
             const k = keys.find(key => ['pos', 'posecom', 'type'].includes(normalizeKey(key)));
             const rawVal = k && item[k] ? String(item[k]).toUpperCase() : 'UNKNOWN';
             // Normalize clusters
             if (rawVal.includes('POS')) groupKey = 'POS';
             else if (rawVal.includes('ECOM') || rawVal.includes('E-COM')) groupKey = 'ECOM';
             else groupKey = rawVal;
          }
          
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(item);
      });
      return groups;
  }, [flaggedList, viewMode, groupBy]);


  // calculate frequencies for the list view badge
  const midFrequencies = React.useMemo(() => {
     const counts: Record<string, number> = {};
     flaggedList.forEach(item => {
        const id = getMidFromRecord(item);
        const normId = normalizeKey(id);
        counts[normId] = (counts[normId] || 0) + 1;
     });
     return counts;
  }, [flaggedList]);

  const filteredList = flaggedList.filter(row => {
      if (!searchFilter) return true;
      const term = searchFilter.toLowerCase();
      return Object.values(row).some(val => String(val).toLowerCase().includes(term));
  });

  return (
    <div className="flex-1 h-full bg-slate-50 overflow-hidden flex flex-col font-sans relative">
      
      {/* POLISHED VERIFICATION MODAL */}
      {showPreview && previewRecord && (
          <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 transform transition-all scale-100">
                  {/* ... Same Modal Content ... */}
                   <div className={`px-6 py-5 flex items-center justify-between border-b ${duplicateCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
                      <h3 className={`font-bold text-xl flex items-center gap-2 ${duplicateCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                          {duplicateCount > 0 ? <AlertTriangle className="text-amber-600" /> : <ShieldAlert className="text-brand-600" />}
                          {duplicateCount > 0 ? 'Duplicate Warning' : 'Verify Merchant'}
                      </h3>
                      <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 hover:bg-slate-100 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="p-6">
                      {duplicateCount > 0 ? (
                          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
                             <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                             <div className="text-sm text-amber-800">
                                 <p className="font-bold mb-1">Merchant Already Flagged</p>
                                 <p>This merchant currently appears <span className="font-bold">{duplicateCount} time{duplicateCount > 1 ? 's' : ''}</span> in your flagged list. Do you want to add another entry?</p>
                             </div>
                          </div>
                      ) : (
                          <p className="text-slate-500 text-sm mb-6">
                              Please review the details below. Ensure this matches the merchant you intend to flag.
                          </p>
                      )}
                      
                      {/* Data Preview Card */}
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 mb-8 shadow-sm">
                          <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Merchant Name</div>
                              <div className="font-bold text-slate-900 text-xl leading-tight">
                                  {(() => {
                                      const k = findNameColumn(Object.keys(previewRecord));
                                      return k ? previewRecord[k] : 'Unknown Name';
                                  })()}
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/50">
                              <div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">MID / ID</div>
                                  <div className="font-mono font-bold text-slate-700 text-base bg-white border border-slate-200 px-2 py-1 rounded inline-block">
                                      {(() => {
                                          const k = findMidColumn(Object.keys(previewRecord));
                                          return k ? previewRecord[k] : flagMid;
                                      })()}
                                  </div>
                              </div>
                              <div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Source</div>
                                  <div className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                                      <FileSpreadsheet size={14} className="text-brand-500" />
                                      {previewRecord.Source_File}
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                          <button 
                              onClick={() => setShowPreview(false)}
                              className="flex-1 py-3.5 text-slate-600 font-bold text-sm bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={confirmFlag}
                              className={`flex-1 py-3.5 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95
                                ${duplicateCount > 0 ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-900/20'}
                              `}
                          >
                              {duplicateCount > 0 ? (
                                  <> <PlusIcon /> Add Duplicate Entry </>
                              ) : (
                                  <> <Flag size={16} /> Confirm & Flag </>
                              )}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header Area */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <Flag size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Flagged Merchants</h1>
        </div>
        <p className="text-slate-500 text-sm max-w-2xl">
            Input a MID to search across all databases. Verification is required before flagging.
        </p>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left: Input Panel */}
        <div className="w-full lg:w-80 bg-white border-r border-slate-200 p-6 flex flex-col shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <PlusIcon /> New Flag Entry
            </h3>
            
            <div className="space-y-4 mb-6">
                <div className="relative">
                    <input 
                        type="text" 
                        id="midSearch"
                        value={flagMid}
                        onChange={e => setFlagMid(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearchForFlag()}
                        placeholder=" "
                        className="block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent pl-10"
                    />
                    <label htmlFor="midSearch" className="absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-9 pointer-events-none">
                        Merchant MID
                    </label>
                    <Search className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" size={18} />
                </div>
                
                <button 
                    onClick={handleSearchForFlag}
                    disabled={!flagMid || databases.length === 0}
                    className="w-full py-3 bg-brand-600 text-white rounded-full font-bold text-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-900/10 transition-all flex items-center justify-center gap-2"
                >
                    <Search size={16} /> Search & Verify
                </button>
            </div>

            {/* View Modes */}
            <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">View Mode</h4>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setViewMode('card')} className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition-all ${viewMode === 'card' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <LayoutGrid size={18} className="mb-1" /> Cards
                    </button>
                    <button onClick={() => setViewMode('list')} className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <LayoutList size={18} className="mb-1" /> List
                    </button>
                    <button onClick={() => setViewMode('group')} className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition-all ${viewMode === 'group' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <Layers size={18} className="mb-1" /> Grouped
                    </button>
                    <button onClick={() => setViewMode('analytics')} className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition-all ${viewMode === 'analytics' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <BarChart2 size={18} className="mb-1" /> Analytics
                    </button>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">Total Flagged</span>
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-xs font-bold border border-slate-200">{flaggedList.length}</span>
                </div>
                <button 
                    onClick={handleExport}
                    disabled={flaggedList.length === 0}
                    className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 rounded-full font-bold text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                    <Download size={16} /> Export to Excel
                </button>
            </div>
        </div>

        {/* Right: Content View */}
        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
            
            {/* ANALYTICS DASHBOARD VIEW */}
            {viewMode === 'analytics' ? (
                <div className="flex-1 overflow-auto p-6 md:p-8">
                     <div className="max-w-5xl mx-auto space-y-6">
                         {/* Stats Cards */}
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                 <div className="flex items-start justify-between">
                                     <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Flagged</div>
                                     <Flag size={18} className="text-red-500 opacity-60" />
                                 </div>
                                 <div className="text-3xl font-bold text-slate-900">{flaggedList.length}</div>
                             </div>
                             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                 <div className="flex items-start justify-between">
                                     <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Hold Value</div>
                                     <DollarSign size={18} className="text-green-500 opacity-60" />
                                 </div>
                                 <div className="text-3xl font-bold text-slate-900">${analyticsData.totalHoldAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                             </div>
                             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                                 <div className="flex items-start justify-between">
                                     <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Channel</div>
                                     <Layers size={18} className="text-brand-500 opacity-60" />
                                 </div>
                                 <div className="text-2xl font-bold text-slate-900 truncate">
                                     {analyticsData.topChannels[0]?.label || 'N/A'}
                                 </div>
                             </div>
                         </div>

                         {/* Charts */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                 <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                     <PieChart size={16} className="text-brand-500"/> Status Distribution
                                 </h4>
                                 <SimpleBarChart data={analyticsData.topStatuses} total={flaggedList.length} />
                             </div>
                             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                 <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                     <Activity size={16} className="text-brand-500"/> Channel Distribution (Top 5)
                                 </h4>
                                 <SimpleBarChart data={analyticsData.topChannels} total={flaggedList.length} />
                             </div>
                         </div>
                     </div>
                </div>
            ) : (
                /* LIST/CARD/GROUP VIEW */
                <>
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                        <div className="relative max-w-md w-full">
                            <input 
                                type="text" 
                                id="flagSearch"
                                value={searchFilter}
                                onChange={e => setSearchFilter(e.target.value)}
                                placeholder=" "
                                className="block px-4 py-2 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent pl-9"
                            />
                            <label htmlFor="flagSearch" className="absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-8 pointer-events-none">
                                Search flagged list...
                            </label>
                            <Search className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                            {searchFilter && (
                                <button onClick={() => setSearchFilter('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        {viewMode === 'group' && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-bold text-slate-500 text-xs uppercase">Group By:</span>
                                <select 
                                    value={groupBy} 
                                    onChange={(e) => setGroupBy(e.target.value as any)}
                                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-700 outline-none cursor-pointer"
                                >
                                    <option value="channel">Channel</option>
                                    <option value="type">Type (POS/ECOM)</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-6 bg-slate-50">
                        {flaggedList.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <div className="bg-slate-200 p-4 rounded-full mb-4">
                                <Flag size={32} className="text-slate-400" />
                                </div>
                                <p className="text-lg font-medium text-slate-500">No Flagged Merchants</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                
                                {viewMode === 'list' && (
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                                <tr>
                                                    <th className="px-4 py-3 border-b border-slate-200">Merchant Name</th>
                                                    <th className="px-4 py-3 border-b border-slate-200">MID</th>
                                                    <th className="px-4 py-3 border-b border-slate-200">Status</th>
                                                    <th className="px-4 py-3 border-b border-slate-200">Channel</th>
                                                    <th className="px-4 py-3 border-b border-slate-200 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredList.map((item, idx) => {
                                                    const keys = Object.keys(item);
                                                    const name = findNameColumn(keys) ? item[findNameColumn(keys)!] : 'Unknown';
                                                    const mid = findMidColumn(keys) ? item[findMidColumn(keys)!] : 'Unknown';
                                                    const statusKey = keys.find(k => normalizeKey(k).includes('status'));
                                                    const channelKey = keys.find(k => ['finalseg', 'final_segment', 'finalsegment', 'channel'].includes(normalizeKey(k)));

                                                    return (
                                                        <tr key={String(item.flagId || idx)} className="hover:bg-slate-50 group transition-colors">
                                                            <td className="px-4 py-3 font-bold text-slate-800">{name}</td>
                                                            <td className="px-4 py-3 font-mono text-slate-600">{mid}</td>
                                                            <td className="px-4 py-3">
                                                                {statusKey && (
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${getStatusColor(String(item[statusKey]))}`}>
                                                                        {item[statusKey]}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-500">{channelKey ? item[channelKey] : '-'}</td>
                                                            <td className="px-4 py-3 text-right">
                                                                <button onClick={() => handleDelete(item.flagId as number)} className="text-slate-300 hover:text-red-600 transition-colors">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {viewMode === 'group' && Object.entries(groupedList).map(([groupName, items]) => (
                                    <div key={groupName} className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">
                                            <ChevronDown size={14} /> {groupName} <span className="bg-slate-200 text-slate-600 px-1.5 rounded text-[10px]">{(items as MerchantRecord[]).length}</span>
                                        </div>
                                        {(items as MerchantRecord[]).map((item: any, idx) => {
                                            const keys = Object.keys(item);
                                            const midKey = findMidColumn(keys);
                                            const nameKey = findNameColumn(keys);
                                            const midVal = midKey ? String(item[midKey]) : 'Unknown ID';
                                            const nameVal = nameKey ? item[nameKey] : 'Unknown Name';
                                            const statusKey = keys.find(k => normalizeKey(k).includes('status'));

                                            return (
                                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-brand-300 shadow-sm flex items-center justify-between">
                                                    <div>
                                                        <div className="font-bold text-slate-800">{nameVal}</div>
                                                        <div className="text-xs font-mono text-slate-500">{midVal}</div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {statusKey && (
                                                            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${getStatusColor(String(item[statusKey]))}`}>
                                                                {item[statusKey]}
                                                            </span>
                                                        )}
                                                        <button onClick={() => handleDelete(item.flagId)} className="text-slate-300 hover:text-red-600">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}

                                {viewMode === 'card' && filteredList.map((item: any, idx) => {
                                    // ... EXISTING CARD LOGIC WITH NEW COLOR UPDATES ...
                                    const keys = Object.keys(item);
                                    const midKey = findMidColumn(keys);
                                    const nameKey = findNameColumn(keys);
                                    const midVal = midKey ? String(item[midKey]) : 'Unknown ID';
                                    const nameVal = nameKey ? item[nameKey] : 'Unknown Name';
                                    const statusKey = keys.find(k => normalizeKey(k).includes('status'));
                                    const rmKey = keys.find(k => ['rmname', 'rm', 'relationshipmanager'].includes(normalizeKey(k)));
                                    const holdAmtKey = keys.find(k => normalizeKey(k).includes('holdamount'));
                                    const isExpanded = expandedId === (item.flagId || idx);
                                    const normId = normalizeKey(midVal);
                                    const isDuplicate = midFrequencies[normId] > 1;

                                    return (
                                        <div key={String(item.flagId || idx)} className={`bg-white rounded-xl border transition-all duration-200 shadow-sm overflow-hidden group ${isExpanded ? 'border-brand-300 ring-1 ring-brand-100 shadow-md' : 'border-slate-200 hover:border-brand-200'}`}>
                                            <div className="p-5 flex flex-col md:flex-row items-start gap-5 cursor-pointer" onClick={() => toggleExpand(item.flagId || idx)}>
                                                <div className={`mt-1 p-3 rounded-xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600'}`}>
                                                    <Briefcase size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
                                                        <h4 className="font-bold text-slate-900 text-lg truncate leading-snug">{nameVal}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{midVal}</span>
                                                            {isDuplicate && <span className="text-[10px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5"><Layers size={8} /> DUPLICATE</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {statusKey && item[statusKey] && (
                                                            <span className={`text-[10px] px-2.5 py-1 rounded border font-bold uppercase tracking-wide shadow-sm ${getStatusColor(String(item[statusKey]))}`}>
                                                                {formatValue(statusKey, item[statusKey])}
                                                            </span>
                                                        )}
                                                        {rmKey && item[rmKey] && (
                                                            <span className="text-[10px] bg-purple-50 text-purple-700 px-2.5 py-1 rounded border border-purple-100 font-bold flex items-center gap-1 shadow-sm">
                                                                <User size={10} /> {formatValue(rmKey, item[rmKey])}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end justify-between self-stretch pl-4 border-l border-slate-100 ml-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.flagId); }} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                                    <div className="mt-auto text-slate-400">{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="bg-slate-50/80 border-t border-slate-200 p-6 animate-in slide-in-from-top-2">
                                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={14} /> Full Record Details</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {Object.entries(item).map(([key, value]) => {
                                                            if (key.startsWith('_') || key === 'flagId' || key === 'Source_File' || key === 'Flagged_Date') return null;
                                                            if (value === null || value === '') return null;
                                                            const displayValue = formatValue(key, value);
                                                            const uniqueKey = `${item.flagId}-${key}`;
                                                            return (
                                                                <div key={key} className={`bg-white p-3.5 rounded-lg border shadow-sm group/item relative hover:border-brand-300 transition-all border-slate-100`}>
                                                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 truncate pr-6" title={key}>{key}</div>
                                                                    <div className="font-medium text-slate-700 text-sm break-words pr-6">{displayValue}</div>
                                                                    <button onClick={() => handleCopy(displayValue, uniqueKey)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-brand-600 hover:bg-brand-50 rounded-md opacity-0 group-hover/item:opacity-100 transition-all">
                                                                        {copiedKey === uniqueKey ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
)