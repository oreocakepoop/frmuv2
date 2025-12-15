import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, User, FileText, Plus, CheckCircle, Database, Calculator, Calendar, Search, CreditCard, ChevronDown, Building2, Sparkles, ArrowRight, Keyboard, FileSpreadsheet, Download, List, LayoutGrid, Info, Clock } from 'lucide-react';
import { MerchantRecord, ParsedDatabase, UserProfile } from '../types';
import { findMidColumn, findNameColumn, normalizeKey, parseExcelDate, formatCurrency, updateMasterSheet, getStatusColor, getUniqueValues } from '../services/excelService';

interface AddManualEntryProps {
  onSave: (type: 'HOLD' | 'RM', data: MerchantRecord) => void;
  databases: ParsedDatabase[];
  activeProfile: UserProfile | null;
}

// Field Aliases for intelligent dropdown population (Matching SearchPanel logic)
const FIELD_ALIASES: Record<string, string[]> = {
  'Channel SME/KEY/GOV': ['finalseg', 'segment', 'channel', 'seg'],
  'RM Name': ['rm', 'rmname', 'relationshipmanager', 'manager', 'relationship_manager'],
  'Current Status': ['status', 'currentstatus'],
  'Account / Settlement Hold': ['holdtype', 'hold_type'],
  'Held By': ['heldby', 'held_by'],
  'Released By': ['releasedby', 'released_by'],
  'added By': ['addedby', 'added_by', 'createdby']
};

// --- SUB-COMPONENTS ---

// 1. Hybrid Date Input (Text + Picker)
const HybridDateInput: React.FC<{
    value: string;
    onChange: (val: string) => void;
    label: string;
    className?: string;
}> = ({ value, onChange, label, className = "" }) => {
    const [isPicker, setIsPicker] = useState(false);

    const getPickerValue = () => {
        if (!value) return '';
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
            const parts = value.split('/');
            return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
             return d.toISOString().split('T')[0];
        }
        return '';
    };

    const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value; 
        if (val) {
             const parts = val.split('-');
             onChange(`${parts[1]}/${parts[2]}/${parts[0]}`);
        } else {
             onChange('');
        }
    };

    return (
        <div className={`relative group ${className}`}>
             {isPicker ? (
                <input 
                    type="date"
                    id={`date-hybrid-${label}`}
                    value={getPickerValue()} 
                    onChange={handlePickerChange}
                    className="block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent"
                    placeholder=" "
                />
             ) : (
                <input 
                    type="text"
                    id={`text-hybrid-${label}`}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent"
                    placeholder=" "
                />
             )}
             <label className="absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2 pointer-events-none">
                {label}
             </label>
             <div className="absolute right-1 top-1.5 bottom-1.5 flex gap-1 bg-white items-center px-1 border-l border-slate-100">
                 <button type="button" onClick={() => setIsPicker(false)} className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${!isPicker ? 'text-brand-600 bg-brand-50' : 'text-slate-400'}`}><Keyboard size={14} /></button>
                 <button type="button" onClick={() => setIsPicker(true)} className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${isPicker ? 'text-brand-600 bg-brand-50' : 'text-slate-400'}`}><Calendar size={14} /></button>
             </div>
        </div>
    );
};

// 2. Search Input (For MID/Name with Record Suggestions)
const SearchInput: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    label: string;
    suggestions?: MerchantRecord[];
    onSelectSuggestion?: (record: MerchantRecord) => void;
    required?: boolean;
    icon?: React.ReactNode;
}> = ({ value, onChange, label, suggestions = [], onSelectSuggestion, required, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const hasSuggestions = suggestions.length > 0;

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input 
                    type="text"
                    value={value}
                    onChange={e => { onChange(e.target.value); if(onSelectSuggestion) setIsOpen(true); }}
                    onFocus={() => { if(hasSuggestions) setIsOpen(true); }}
                    className={`block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent ${icon ? 'pl-10' : ''}`}
                    placeholder=" "
                />
                <label className={`absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 pointer-events-none flex items-center gap-1 ${icon ? 'left-9' : 'left-2'}`}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">{icon}</div>}
            </div>
            {isOpen && hasSuggestions && (
                <div className="absolute z-[100] left-0 w-full min-w-[400px] mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm px-4 py-2.5 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 z-10"><Sparkles size={12} className="text-brand-600" /> Smart Suggestions</div>
                    {suggestions.map((rec, idx) => {
                        const midKey = findMidColumn(Object.keys(rec));
                        const nameKey = findNameColumn(Object.keys(rec));
                        const id = midKey ? rec[midKey] : '??';
                        const name = nameKey ? rec[nameKey] : 'Unknown';
                        const source = rec.__sourceFile || 'Unknown Source';
                        return (
                            <div key={idx} onClick={() => { if(onSelectSuggestion) onSelectSuggestion(rec); setIsOpen(false); }} className="px-4 py-3.5 hover:bg-brand-50 cursor-pointer border-b border-slate-100 last:border-0 group transition-all relative">
                                <div className="font-bold text-slate-800 text-sm group-hover:text-brand-700">{name}</div>
                                <div className="flex items-center gap-2 mt-1"><span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{id}</span><span className="text-[10px] text-slate-400">{source}</span></div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// 3. Form Input (Supports Dropdowns via options prop)
const FormInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options?: string[];
  type?: string;
  label: string;
  readOnly?: boolean;
}> = ({ value, onChange, options = [], type = "text", label, readOnly }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (type === 'textarea') {
    return (
       <div className="relative">
            <textarea
                id={`textarea-${label}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                readOnly={readOnly}
                className="block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent resize-none"
                placeholder=" "
            />
            <label
                htmlFor={`textarea-${label}`}
                className="absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-6 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2 pointer-events-none"
            >
                {label}
            </label>
       </div>
    );
  }

  const isSelect = options.length > 0;
  // Apply smart color if this is Current Status
  const statusColorClass = label === 'Current Status' && value ? getStatusColor(value) : '';

  return (
    <div className="relative group" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          id={`smart-${label}`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (isSelect) setIsOpen(true);
          }}
          onFocus={() => isSelect && setIsOpen(true)}
          readOnly={readOnly}
          className={`block px-4 py-3 w-full text-sm text-gray-900 border rounded-md appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent 
            ${statusColorClass ? statusColorClass : 'bg-white border-slate-300'}
            ${readOnly ? 'bg-slate-50 border-slate-200 text-slate-500 font-mono cursor-not-allowed' : ''}
          `}
          placeholder=" "
        />
        <label
            htmlFor={`smart-${label}`}
            className="absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2 pointer-events-none"
        >
            {label}
        </label>

        {isSelect && !readOnly && (
          <div 
            className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-slate-400 hover:text-brand-600"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDown size={14} />
          </div>
        )}
      </div>

      {isSelect && isOpen && !readOnly && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl max-h-60 overflow-auto animate-in fade-in slide-in-from-top-1">
          {options.map((opt, idx) => (
            <div
              key={idx}
              className={`px-3 py-2 text-sm cursor-pointer border-b border-slate-50 last:border-0 font-medium ${label === 'Current Status' ? getStatusColor(opt) : 'text-slate-700 bg-white hover:bg-brand-50 hover:text-brand-700'}`}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AddManualEntry: React.FC<AddManualEntryProps> = ({ onSave, databases, activeProfile }) => {
  const [activeTab, setActiveTab] = useState<'HOLD' | 'RM'>('HOLD');
  const [showList, setShowList] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [midSuggestions, setMidSuggestions] = useState<MerchantRecord[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<MerchantRecord[]>([]);

  // FULL HOLD FORM STATE
  const [holdForm, setHoldForm] = useState({
    mid: '', 
    name: '', 
    posEcom: activeProfile?.defaultPosEcom || '', 
    rmName: '', 
    channel: '',
    currentStatus: 'Active', 
    accountHold: 'Account Hold', 
    dateHold: '',
    heldBy: activeProfile?.defaultHeldBy || '', 
    holdAmount: '',
    dateRelease: '', 
    releasedBy: '', 
    releaseAmount: '',
    closedDate: '', 
    reason: '', 
    fmuRemarks: '', 
    addedBy: ''
  });
  const [agingHold, setAgingHold] = useState<string>('');
  const [agingDuration, setAgingDuration] = useState<string>('');

  // FULL RM FORM STATE
  const [rmForm, setRmForm] = useState({
    orgMid: '', chainId: '', name: '', tl: '',
    groupName: '', seg: '', finalSeg: '', rm: ''
  });

  // Updated Helper to fetch options (Matches SearchPanel Logic)
  const getDropdownOptions = (key: string) => {
    let opts: Set<string> = new Set();
    
    // Default hardcoded for Status/Hold Type if DB is empty
    if (key === 'Current Status' && databases.length === 0) return ['Active', 'Closed', 'Terminated', 'On Hold'];
    if (key === 'Account / Settlement Hold' && databases.length === 0) return ['Account Hold', 'Settlement Hold'];

    // Pull from DB
    databases.forEach(db => {
        // 1. Try Profile Mapping
        let col = activeProfile?.mappings?.[db.fileName]?.[key];
        
        // 2. Try Exact Name Match
        if (!col) {
            col = db.columns.find(c => normalizeKey(c) === normalizeKey(key));
        }

        // 3. Try Aliases (Strict match to SearchPanel behavior)
        if (!col && FIELD_ALIASES[key]) {
             col = db.columns.find(c => FIELD_ALIASES[key].includes(normalizeKey(c)));
        }
        
        if (col) {
            const dbOpts = getUniqueValues(db.data, col);
            dbOpts.forEach(o => opts.add(o));
        }
    });

    // Pull from Profile Custom Options
    if (activeProfile?.customOptions?.[key]) {
      activeProfile.customOptions[key].forEach(o => opts.add(o));
    }
    return Array.from(opts).sort();
  };

  // Get Saved Data for List View
  const savedEntries = useMemo(() => {
      const manualDb = databases.find(d => d.fileName === 'System_Manual_Entry.xlsx');
      if (!manualDb) return [];
      return manualDb.data.filter(r => r._type === activeTab);
  }, [databases, activeTab]);

  // Search Logic
  const searchDatabases = (query: string, type: 'mid' | 'name') => {
      if (!query || query.length < 2) return [];
      const normalizedQuery = normalizeKey(query);
      const matches: MerchantRecord[] = [];
      for (const db of databases) {
          if (matches.length > 10) break;
          const midCol = findMidColumn(db.columns);
          const nameCol = findNameColumn(db.columns);
          const targetCol = type === 'mid' ? midCol : nameCol;
          if (!targetCol) continue;
          const found = db.data.filter(row => {
              const val = normalizeKey(String(row[targetCol]));
              return val.includes(normalizedQuery);
          }).map(row => ({ ...row, __sourceFile: db.fileName }));
          matches.push(...found);
      }
      return matches.slice(0, 10);
  };

  const handleMidSearch = (val: string) => {
      if (activeTab === 'HOLD') setHoldForm(p => ({ ...p, mid: val }));
      else setRmForm(p => ({ ...p, orgMid: val }));
      setMidSuggestions(searchDatabases(val, 'mid'));
  };

  const handleNameSearch = (val: string) => {
      if (activeTab === 'HOLD') setHoldForm(p => ({ ...p, name: val }));
      else setRmForm(p => ({ ...p, name: val }));
      setNameSuggestions(searchDatabases(val, 'name'));
  };

  const populateFields = (initialRecord: MerchantRecord) => {
      const allMatches: MerchantRecord[] = [initialRecord];
      const midKey = findMidColumn(Object.keys(initialRecord));
      if (midKey) {
          const mid = String(initialRecord[midKey]);
          const normalizedMid = normalizeKey(mid);
          databases.forEach(db => {
               if (initialRecord.__sourceFile === db.fileName) return;
               const dbMidKey = findMidColumn(db.columns);
               if (dbMidKey) {
                   const match = db.data.find(row => normalizeKey(String(row[dbMidKey])) === normalizedMid);
                   if (match) allMatches.push(match);
               }
          });
      }

      const findVal = (keys: string[]) => {
          for (const record of allMatches) {
             for (const k of keys) {
                const normK = normalizeKey(k);
                // Direct key match
                if (record[k] !== undefined && String(record[k]).trim() !== '') return String(record[k]);
                // Normalized match
                const matchKey = Object.keys(record).find(rk => normalizeKey(rk) === normK);
                if (matchKey && record[matchKey] !== undefined && String(record[matchKey]).trim() !== '') return String(record[matchKey]);
             }
          }
          return '';
      };

      const midVal = findVal(['mid', 'merchantid', 'orgmid']) || (activeTab === 'HOLD' ? holdForm.mid : rmForm.orgMid);
      const nameVal = findVal(['name', 'merchantname']) || (activeTab === 'HOLD' ? holdForm.name : rmForm.name);

      if (activeTab === 'HOLD') {
          setHoldForm(prev => ({
              ...prev,
              mid: midVal, 
              name: nameVal, 
              posEcom: findVal(['pos', 'posecom', 'type']) || (activeProfile?.defaultPosEcom || ''),
              rmName: findVal(['rm', 'rmname', 'relationshipmanager']), 
              channel: findVal(['channel', 'segment', 'finalseg']),
              currentStatus: findVal(['current status', 'status']) || 'Active',
              accountHold: findVal(['account / settlement hold', 'hold type']) || 'Account Hold',
              dateHold: parseExcelDate(findVal(['date of hold', 'hold date'])),
              heldBy: findVal(['held by']) || (activeProfile?.defaultHeldBy || ''),
              holdAmount: formatCurrency(findVal(['hold amount', 'amount'])),
              dateRelease: parseExcelDate(findVal(['date of relase', 'release date', 'released date'])),
              releasedBy: findVal(['released by']),
              releaseAmount: formatCurrency(findVal(['release amount'])),
              closedDate: parseExcelDate(findVal(['closed date'])),
              reason: findVal(['reason', 'hold reason']), 
              fmuRemarks: findVal(['remarks', 'fmu remarks']),
              addedBy: findVal(['added by', 'created by'])
          }));
          setAgingHold(findVal(['aging of hold', 'aging']));
          setAgingDuration(findVal(['aging between hold & release', 'duration']));
      } else {
          setRmForm(prev => ({
              ...prev,
              orgMid: midVal, 
              name: nameVal, 
              chainId: findVal(['chain id', 'chain']),
              tl: findVal(['tl', 'team lead']), 
              groupName: findVal(['group name', 'group']),
              seg: findVal(['seg', 'segment']), 
              finalSeg: findVal(['final seg', 'final segment']),
              rm: findVal(['rm', 'rmname', 'relationshipmanager']),
          }));
      }
      setMidSuggestions([]);
      setNameSuggestions([]);
  };

  const handleHoldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdForm.mid || !holdForm.name) return;
    const record: MerchantRecord = {
      'Merchant ID': holdForm.mid, 'Merchant Name': holdForm.name, 'POS/ECOM': holdForm.posEcom,
      'RM Name': holdForm.rmName, 'Channel SME/KEY/GOV': holdForm.channel, 
      'Current Status': holdForm.currentStatus, 'Account / Settlement Hold': holdForm.accountHold, 
      'Date of Hold': holdForm.dateHold, 'Held By': holdForm.heldBy, 'Hold Amount': holdForm.holdAmount, 
      'Date Of Relase': holdForm.dateRelease, 'Released By': holdForm.releasedBy, 'Release Amount': holdForm.releaseAmount, 
      'Closed Date': holdForm.closedDate, 'Reason of hold': holdForm.reason, 'FMU Remarks': holdForm.fmuRemarks, 
      'Aging of Hold': agingHold, 'Aging between Hold & Release': agingDuration, 'added By': holdForm.addedBy,
      'Source': 'System Entry', 'Entry Date': new Date().toLocaleDateString(), '_type': 'HOLD'
    };
    onSave('HOLD', record);
    setSuccessMsg('Hold entry added to queue.');
    setHoldForm({
        mid: '', name: '', 
        posEcom: activeProfile?.defaultPosEcom || '', 
        rmName: '', channel: '', 
        currentStatus: 'Active', accountHold: 'Account Hold', dateHold: '', 
        heldBy: activeProfile?.defaultHeldBy || '', 
        holdAmount: '', dateRelease: '', releasedBy: '', releaseAmount: '', 
        closedDate: '', reason: '', fmuRemarks: '', addedBy: ''
    });
    setAgingHold('');
    setAgingDuration('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmForm.orgMid) return;
    const record: MerchantRecord = {
      'Org + MID': rmForm.orgMid, 'Chain ID': rmForm.chainId, 'Merchant Name': rmForm.name,
      'TL': rmForm.tl, 'Group Name': rmForm.groupName, 'Seg': rmForm.seg,
      'Final Seg': rmForm.finalSeg, 'RM': rmForm.rm,
      'Source': 'System Entry', 'Entry Date': new Date().toLocaleDateString(), '_type': 'RM'
    };
    onSave('RM', record);
    setSuccessMsg('RM details added to queue.');
    setRmForm({ orgMid: '', chainId: '', name: '', tl: '', groupName: '', seg: '', finalSeg: '', rm: '' });
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleUpdateHold = async () => {
    const success = await updateMasterSheet('Hold_Entries', databases);
    if(success) setSuccessMsg('Master Excel Updated Successfully!');
  };

  const handleUpdateRM = async () => {
    const success = await updateMasterSheet('RM_Entries', databases);
    if(success) setSuccessMsg('Master Excel Updated Successfully!');
  };

  return (
    <div className="flex-1 h-full bg-slate-50 overflow-hidden flex flex-col font-sans">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 shadow-sm z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-xl shadow-lg shadow-brand-500/20">
                <Plus size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Add Manual Entry</h1>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Database size={12} />
                    <span>Indexing {databases.length} databases for smart suggestions</span>
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
            
            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button onClick={() => { setActiveTab('HOLD'); setShowList(false); setSuccessMsg(''); }} className={`flex-1 py-5 rounded-2xl border transition-all relative overflow-hidden group ${activeTab === 'HOLD' ? 'border-brand-500 bg-white shadow-lg shadow-brand-900/5 ring-1 ring-brand-100' : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 text-slate-400'}`}>
                    <div className="flex flex-col items-center gap-2 relative z-10">
                        <div className={`p-2 rounded-lg ${activeTab === 'HOLD' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-brand-500'}`}><FileText size={24} /></div>
                        <span className={`font-bold text-sm ${activeTab === 'HOLD' ? 'text-brand-800' : 'text-slate-500'}`}>Merchant Hold Entry</span>
                    </div>
                </button>
                <button onClick={() => { setActiveTab('RM'); setShowList(false); setSuccessMsg(''); }} className={`flex-1 py-5 rounded-2xl border transition-all relative overflow-hidden group ${activeTab === 'RM' ? 'border-brand-500 bg-white shadow-lg shadow-brand-900/5 ring-1 ring-brand-100' : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 text-slate-400'}`}>
                    <div className="flex flex-col items-center gap-2 relative z-10">
                         <div className={`p-2 rounded-lg ${activeTab === 'RM' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-brand-500'}`}><User size={24} /></div>
                        <span className={`font-bold text-sm ${activeTab === 'RM' ? 'text-brand-800' : 'text-slate-500'}`}>RM Sheet Entry</span>
                    </div>
                </button>
            </div>

            {successMsg && (
                <div className="mb-8 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 flex items-center gap-3 font-bold shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="bg-emerald-100 p-1 rounded-full"><CheckCircle size={16} /></div>
                    {successMsg}
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        {activeTab === 'HOLD' ? <FileText size={18} className="text-brand-600"/> : <User size={18} className="text-brand-600"/>}
                        {activeTab === 'HOLD' ? 'Hold Entry Form' : 'RM Entry Form'}
                    </h3>
                    <button onClick={() => setShowList(!showList)} className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 border ${showList ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                        {showList ? ( <> <Plus size={16} /> New Entry </> ) : ( <> <List size={16} /> View Saved Data <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] ml-1">{savedEntries.length}</span></> )}
                    </button>
                </div>

                <div className="p-8 lg:p-10">
                    {showList ? (
                        <div className="space-y-4">
                            {savedEntries.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">
                                    <LayoutGrid size={48} className="mx-auto mb-4 opacity-20" />
                                    <p className="font-medium">No saved entries found for {activeTab}.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                            <tr>
                                                <th className="px-4 py-3 border-b">MID</th>
                                                <th className="px-4 py-3 border-b">Name</th>
                                                {activeTab === 'HOLD' ? (
                                                    <>
                                                        <th className="px-4 py-3 border-b">Status</th>
                                                        <th className="px-4 py-3 border-b">Hold Date</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th className="px-4 py-3 border-b">RM</th>
                                                        <th className="px-4 py-3 border-b">Team Lead</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {savedEntries.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono text-slate-600">{String(row['Merchant ID'] || row['Org + MID'] || '-')}</td>
                                                    <td className="px-4 py-3 font-bold text-slate-800">{String(row['Merchant Name'] || '-')}</td>
                                                    {activeTab === 'HOLD' ? (
                                                        <>
                                                            <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${getStatusColor(String(row['Current Status']))}`}>{String(row['Current Status'] || '-')}</span></td>
                                                            <td className="px-4 py-3 text-slate-500">{String(row['Date of Hold'] || '-')}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-4 py-3 text-slate-600">{String(row['RM'] || '-')}</td>
                                                            <td className="px-4 py-3 text-slate-500">{String(row['TL'] || '-')}</td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <button 
                                    onClick={activeTab === 'HOLD' ? handleUpdateHold : handleUpdateRM}
                                    disabled={savedEntries.length === 0}
                                    className="px-6 py-2.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-full text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <FileSpreadsheet size={16} /> 
                                    {activeTab === 'HOLD' ? 'Update Linked Hold Excel' : 'Update Linked RM Excel'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'HOLD' ? (
                                <form onSubmit={handleHoldSubmit} className="space-y-8">
                                    {/* GLOBAL IDENTIFIERS (Always visible at top) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <SearchInput label="Merchant ID" required icon={<CreditCard size={14} />} value={holdForm.mid} onChange={handleMidSearch} suggestions={midSuggestions} onSelectSuggestion={populateFields} />
                                        <SearchInput label="Merchant Name" required icon={<Building2 size={14} />} value={holdForm.name} onChange={handleNameSearch} suggestions={nameSuggestions} onSelectSuggestion={populateFields} />
                                    </div>

                                    {/* GROUP 1: STATUS & CLASSIFICATION */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
                                        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-3">
                                            <div className="text-brand-600 bg-brand-50 p-1.5 rounded-lg"><Info size={18} /></div>
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Status & Classification</h3>
                                        </div>
                                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            <FormInput label="Current Status" value={holdForm.currentStatus} onChange={v => setHoldForm({...holdForm, currentStatus: v})} options={getDropdownOptions('Current Status')} />
                                            <FormInput label="Account / Settlement Hold" value={holdForm.accountHold} onChange={v => setHoldForm({...holdForm, accountHold: v})} options={getDropdownOptions('Account / Settlement Hold')} />
                                            <HybridDateInput label="Date of Hold" value={holdForm.dateHold} onChange={v => setHoldForm({...holdForm, dateHold: v})} />
                                            <FormInput label="Held By" value={holdForm.heldBy} onChange={v => setHoldForm({...holdForm, heldBy: v})} options={getDropdownOptions('Held By')} />
                                            
                                            <FormInput label="POS / ECOM" value={holdForm.posEcom} onChange={v => setHoldForm({...holdForm, posEcom: v})} />
                                            <FormInput label="Relationship Manager" value={holdForm.rmName} onChange={v => setHoldForm({...holdForm, rmName: v})} options={getDropdownOptions('RM Name')} />
                                            <FormInput label="Channel SME/KEY/GOV" value={holdForm.channel} onChange={v => setHoldForm({...holdForm, channel: v})} options={getDropdownOptions('Channel SME/KEY/GOV')} />
                                            <FormInput label="Reason for Hold" value={holdForm.reason} onChange={v => setHoldForm({...holdForm, reason: v})} options={getDropdownOptions('Reason of hold')} />
                                            
                                            <div className="col-span-full">
                                                <FormInput type="textarea" label="FMU Remarks" value={holdForm.fmuRemarks} onChange={v => setHoldForm({...holdForm, fmuRemarks: v})} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* GROUP 2: RELEASE & FINANCIAL */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
                                        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-3">
                                            <div className="text-brand-600 bg-brand-50 p-1.5 rounded-lg"><Clock size={18} /></div>
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Release & Financial Details</h3>
                                        </div>
                                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            <HybridDateInput label="Date of Release" value={holdForm.dateRelease} onChange={v => setHoldForm({...holdForm, dateRelease: v})} />
                                            <FormInput label="Released By" value={holdForm.releasedBy} onChange={v => setHoldForm({...holdForm, releasedBy: v})} options={getDropdownOptions('Released By')} />
                                            <HybridDateInput label="Closed Date" value={holdForm.closedDate} onChange={v => setHoldForm({...holdForm, closedDate: v})} />
                                            <FormInput label="Hold Amount" value={holdForm.holdAmount} onChange={v => setHoldForm({...holdForm, holdAmount: v})} />
                                            
                                            <FormInput label="Release Amount" value={holdForm.releaseAmount} onChange={v => setHoldForm({...holdForm, releaseAmount: v})} />
                                            <FormInput label="Aging of Hold (Days)" value={agingHold} onChange={setAgingHold} />
                                            <FormInput label="Duration (Hold-Release)" value={agingDuration} onChange={setAgingDuration} />
                                            <FormInput label="Added By" value={holdForm.addedBy} onChange={v => setHoldForm({...holdForm, addedBy: v})} options={getDropdownOptions('added By')} />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                                        <div className="flex gap-3 ml-auto">
                                            <button type="button" onClick={handleUpdateHold} className="px-6 py-3.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-full text-sm font-bold flex items-center gap-2"><FileSpreadsheet size={18} /> Update Linked Excel</button>
                                            <button type="submit" className="px-8 py-3.5 bg-brand-600 text-white font-bold rounded-full hover:bg-brand-700 flex items-center gap-2"><Save size={18} /> Add to Queue</button>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleRmSubmit} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <SearchInput label="Org + MID" required icon={<CreditCard size={14} />} value={rmForm.orgMid} onChange={handleMidSearch} suggestions={midSuggestions} onSelectSuggestion={populateFields} />
                                        <SearchInput label="Merchant Name" icon={<Building2 size={14} />} value={rmForm.name} onChange={handleNameSearch} suggestions={nameSuggestions} onSelectSuggestion={populateFields} />
                                        <FormInput label="Chain ID" value={rmForm.chainId} onChange={v => setRmForm(p => ({...p, chainId: v}))} />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FormInput label="Group Name" value={rmForm.groupName} onChange={v => setRmForm(p => ({...p, groupName: v}))} options={getDropdownOptions('Group Name')} />
                                        <FormInput label="Team Lead (TL)" value={rmForm.tl} onChange={v => setRmForm(p => ({...p, tl: v}))} options={getDropdownOptions('Team Lead (TL)')} />
                                        <FormInput label="RM" value={rmForm.rm} onChange={v => setRmForm(p => ({...p, rm: v}))} options={getDropdownOptions('RM')} />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormInput label="Seg" value={rmForm.seg} onChange={v => setRmForm(p => ({...p, seg: v}))} />
                                        <FormInput label="Final Seg" value={rmForm.finalSeg} onChange={v => setRmForm(p => ({...p, finalSeg: v}))} />
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                                        <button type="button" onClick={handleUpdateRM} className="px-6 py-3.5 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-full text-sm font-bold flex items-center gap-2"><FileSpreadsheet size={18} /> Update Linked Excel</button>
                                        <button className="px-8 py-3.5 bg-brand-600 text-white font-bold rounded-full hover:bg-brand-700 flex items-center gap-2"><Save size={18} /> Add to Queue</button>
                                    </div>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};