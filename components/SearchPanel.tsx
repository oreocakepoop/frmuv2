import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, Building2, Save, Eraser, Settings, Check, LayoutGrid, ArrowRightLeft, User, Info, Clock, ChevronDown, X, Search, AlertCircle, Keyboard, FileSpreadsheet, Calendar, PenTool } from 'lucide-react';
import { ParsedDatabase, MatchStatus, MerchantRecord, UserProfile } from '../types';
import { findMidColumn, findNameColumn, normalizeKey, parseExcelDate, getUniqueValues, formatCurrency, getStatusColor, updateRowInMasterSheet } from '../services/excelService';
import { saveUserProfile } from '../services/storageService';

interface SearchPanelProps {
  databases: ParsedDatabase[];
  activeProfile: UserProfile | null;
  onUpdateProfile: (p: UserProfile) => void;
}

// --- CONFIGURATION ---

interface FieldConfig {
    key: string;
    label: string;
    type: string;
    readonly?: boolean;
}

const FIELD_GROUPS: {
    id: string;
    title: string;
    icon: React.ReactNode;
    fields: FieldConfig[];
}[] = [
  {
    id: 'status',
    title: 'Status & Classification',
    icon: <Info size={18} />,
    fields: [
      { key: 'Current Status', label: 'Current Status', type: 'select' },
      { key: 'Account / Settlement Hold', label: 'Account / Settlement Hold', type: 'select' },
      { key: 'Date of Hold', label: 'Date of Hold', type: 'date' },
      { key: 'Held By', label: 'Held By', type: 'select' },
      { key: 'POS/ECOM', label: 'POS / ECOM', type: 'text' },
      { key: 'RM Name', label: 'Relationship Manager', type: 'text' },
      { key: 'Channel SME/KEY/GOV', label: 'Channel', type: 'text' },
      { key: 'Reason of hold', label: 'Reason for Hold', type: 'text' },
      { key: 'FMU Remarks', label: 'FMU Remarks', type: 'textarea' },
    ]
  },
  {
    id: 'release',
    title: 'Release & Financial Details',
    icon: <Clock size={18} />,
    fields: [
      { key: 'Date Of Relase', label: 'Date of Release', type: 'date' },
      { key: 'Released By', label: 'Released By', type: 'select' },
      { key: 'Closed Date', label: 'Closed Date', type: 'date' },
      { key: 'Hold Amount', label: 'Hold Amount', type: 'text' },
      { key: 'Release Amount', label: 'Release Amount', type: 'text' },
      { key: 'Aging of Hold', label: 'Aging of Hold (Days)', type: 'text' },
      { key: 'Aging between Hold & Release', label: 'Duration (Hold-Release)', type: 'text' },
      { key: 'added By', label: 'Added By', type: 'select' },
    ]
  }
];

const ALL_FORM_FIELDS = FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key));

// Specific column aliases for auto-mapping
const FIELD_ALIASES: Record<string, string[]> = {
  'Channel SME/KEY/GOV': ['finalseg', 'segment', 'channel'],
  'RM Name': ['rm', 'rmname', 'relationshipmanager', 'manager'],
};

// --- HELPERS ---

// Highlight matching text component
const HighlightedText: React.FC<{ text: string; highlight: string; className?: string }> = ({ text, highlight, className = "" }) => {
  if (!highlight || !highlight.trim()) return <span className={className}>{text}</span>;
  
  // Escape regex special characters in highlight string
  const safeHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${safeHighlight})`, 'gi'));
  
  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 text-slate-900 font-bold px-0.5 rounded-[2px] shadow-sm">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

// --- SUB-COMPONENTS ---

// Hybrid Date Input Component (Text + Picker) with Floating Label
const HybridDateInput: React.FC<{
    value: string;
    onChange: (val: string) => void;
    label: string;
    className?: string;
}> = ({ value, onChange, label, className = "" }) => {
    const [isPicker, setIsPicker] = useState(false);

    // Helper to extract YYYY-MM-DD for the picker
    const getPickerValue = () => {
        if (!value) return '';
        
        // 1. If it's MM/DD/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
            const parts = value.split('/');
            const m = parts[0].padStart(2, '0');
            const d = parts[1].padStart(2, '0');
            const y = parts[2];
            return `${y}-${m}-${d}`;
        }

        // 2. Fallback for other strings (attempt to parse)
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
             const y = d.getFullYear();
             const m = String(d.getMonth() + 1).padStart(2, '0');
             const da = String(d.getDate()).padStart(2, '0');
             return `${y}-${m}-${da}`;
        }
        return '';
    };

    const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value; // YYYY-MM-DD
        if (val) {
             const parts = val.split('-');
             // Store as MM/DD/YYYY
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
                    id={`date-${label}`}
                    value={getPickerValue()} 
                    onChange={handlePickerChange}
                    className="block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent"
                    placeholder=" "
                />
             ) : (
                <input 
                    type="text"
                    id={`text-${label}`}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent"
                    placeholder=" "
                />
             )}
             
             <label
                htmlFor={isPicker ? `date-${label}` : `text-${label}`}
                className="absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2 pointer-events-none"
             >
                {label}
             </label>

             <div className="absolute right-1 top-1.5 bottom-1.5 flex gap-1 bg-white items-center px-1 border-l border-slate-100">
                 <button 
                    type="button"
                    onClick={() => setIsPicker(false)}
                    className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${!isPicker ? 'text-brand-600 bg-brand-50' : 'text-slate-400'}`}
                    title="Manual Text Input"
                 >
                    <Keyboard size={14} />
                 </button>
                 <button 
                    type="button"
                    onClick={() => setIsPicker(true)}
                    className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${isPicker ? 'text-brand-600 bg-brand-50' : 'text-slate-400'}`}
                    title="Open Date Picker"
                 >
                    <Calendar size={14} />
                 </button>
             </div>
        </div>
    );
};

interface AutocompleteProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (record: MerchantRecord) => void;
  suggestions: MerchantRecord[];
  isLoading?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  renderOption: (rec: MerchantRecord, isSelected: boolean) => React.ReactNode;
  disabled?: boolean;
}

const AutocompleteInput: React.FC<AutocompleteProps> = ({
  label,
  value,
  onChange,
  onSelect,
  suggestions,
  isLoading,
  placeholder,
  icon,
  renderOption,
  disabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset navigation when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        onSelect(suggestions[activeIndex]);
        setIsOpen(false);
        inputRef.current?.blur();
      } else if (isOpen && suggestions.length > 0 && activeIndex === -1) {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    if (value && suggestions.length > 0) setIsOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setIsOpen(true);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          id={`autocomplete-${label}`}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder=" "
          className={`block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent
            ${isOpen ? 'border-brand-600 ring-0 rounded-b-none' : 'border-slate-300'}
            ${disabled ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}
            ${icon ? 'pl-10' : ''}
          `}
        />
        
        <label
            htmlFor={`autocomplete-${label}`}
            className={`absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 pointer-events-none
                ${icon ? 'left-9' : 'left-2'}
            `}
        >
            {label}
        </label>

        {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors peer-focus:text-brand-600 text-slate-400">
                {icon}
            </div>
        )}
        
        {value && !disabled && (
          <button 
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-300 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        )}
        
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center bg-white">
            <div className="animate-spin h-4 w-4 border-2 border-brand-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* DROPDOWN */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 bg-white border border-t-0 border-brand-600 rounded-b-md shadow-xl max-h-80 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map((item, index) => (
                <li 
                  key={index}
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`px-4 py-3 cursor-pointer border-b border-slate-50 last:border-0 transition-colors flex justify-between items-center
                    ${index === activeIndex ? 'bg-brand-50' : 'bg-white hover:bg-slate-50'}
                  `}
                >
                  {renderOption(item, index === activeIndex)}
                </li>
              ))}
            </ul>
          ) : (
            value.trim() && !isLoading && (
              <div className="px-4 py-8 text-center text-slate-400 bg-slate-50/50">
                <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No matching records in Hold sheets</p>
              </div>
            )
          )}
          {suggestions.length > 0 && (
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
               Showing top {suggestions.length} results
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SmartInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: string[];
  type: string;
  label: string;
  readOnly?: boolean;
}> = ({ value, onChange, options, type, label, readOnly }) => {
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

  const isSelect = type === 'select';
  
  // Apply smart color if this is Current Status
  const statusColorClass = label === 'Current Status' && value ? getStatusColor(value) : '';

  return (
    <div className="relative group" ref={wrapperRef}>
      <div className="relative">
        <input
          type={type === 'date' ? 'date' : 'text'}
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

        {isSelect && options.length > 0 && !readOnly && (
          <div 
            className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-slate-400 hover:text-brand-600"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDown size={14} />
          </div>
        )}
      </div>

      {isSelect && isOpen && options.length > 0 && !readOnly && (
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

// --- MAIN COMPONENT ---

interface DbConfig {
    midCol: string;
    nameCol: string;
    mappings: Record<string, string>;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ databases, activeProfile, onUpdateProfile }) => {
  const [mid, setMid] = useState('');
  const [status, setStatus] = useState<MatchStatus>(MatchStatus.IDLE);
  const [formData, setFormData] = useState<MerchantRecord>({});
  
  // Multi-DB Configuration Store
  // We keep a config for each filename
  const [dbConfigs, setDbConfigs] = useState<Record<string, DbConfig>>({});
  
  const [showConfig, setShowConfig] = useState(false);
  const [configTargetDb, setConfigTargetDb] = useState<string>(''); // Filename of DB being configured

  // Suggestions State
  const [midSuggestions, setMidSuggestions] = useState<MerchantRecord[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<MerchantRecord[]>([]);

  // Update State
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // --- PERSISTENCE & INIT ---

  // Re-calculate configs when databases or profile change
  useEffect(() => {
    const newConfigs: Record<string, DbConfig> = {};
    let firstDb = '';

    databases.forEach(db => {
        if (!firstDb) firstDb = db.fileName;
        
        // 1. Detect Columns or use Profile Mappings
        const profileMappings = activeProfile?.mappings?.[db.fileName] || {};
        
        // Find MID/Name based on profile mapping OR detection
        const detectedMid = findMidColumn(db.columns);
        const detectedName = findNameColumn(db.columns);
        
        const generateAutoMap = () => {
            const autoMap: Record<string, string> = {};
            ALL_FORM_FIELDS.forEach(field => {
                const normField = normalizeKey(field);
                let match = db.columns.find(col => normalizeKey(col) === normField);
                if (!match && FIELD_ALIASES[field]) {
                    match = db.columns.find(col => FIELD_ALIASES[field].includes(normalizeKey(col)));
                }
                if (match) autoMap[field] = match;
            });
            return autoMap;
        };

        newConfigs[db.fileName] = {
            midCol: detectedMid || db.columns[0] || '',
            nameCol: detectedName || db.columns[1] || '',
            mappings: Object.keys(profileMappings).length > 0 ? profileMappings : generateAutoMap()
        };
    });

    setDbConfigs(newConfigs);
    
    // Default config target
    if (!configTargetDb && firstDb) {
        setConfigTargetDb(firstDb);
    } else if (configTargetDb && !databases.find(d => d.fileName === configTargetDb)) {
        setConfigTargetDb(firstDb);
    }

  }, [databases, activeProfile]);

  // SEARCH LOGIC
  const searchRecords = useCallback((query: string, type: 'mid' | 'name'): MerchantRecord[] => {
    if (databases.length === 0 || !query.trim()) return [];
    
    const searchKey = normalizeKey(query);
    const results: MerchantRecord[] = [];

    // Filter to only prioritize "Hold" sheets if available
    // STRICT FILTER: Only databases with "hold" in the name
    const holdDatabases = databases.filter(d => 
        d.fileName.toLowerCase().includes('hold')
    );

    // Limit global results to 20
    for (const db of holdDatabases) {
        if (results.length >= 20) break;
        
        const config = dbConfigs[db.fileName];
        if (!config) continue;

        const col = type === 'mid' ? config.midCol : config.nameCol;
        if (!col) continue;

        const matches = db.data.filter(row => {
            const rowVal = normalizeKey(String(row[col] || ''));
            return rowVal.includes(searchKey);
        });

        // Add source info to record for UI display
        for (const match of matches) {
            if (results.length >= 20) break;
            results.push({ ...match, __sourceFile: db.fileName });
        }
    }

    return results;
  }, [databases, dbConfigs]);

  // HANDLERS
  const handleMidChange = (val: string) => {
    setMid(val);
    setStatus(MatchStatus.SEARCHING);
    const suggestions = searchRecords(val, 'mid');
    setMidSuggestions(suggestions);
    
    if (!val) setStatus(MatchStatus.IDLE);
    
    // Clear form if user is typing and nothing selected yet
    // This satisfies "if cannot find data ... leave fields blank"
    if (suggestions.length === 0) {
        setFormData({});
    }
  };

  const handleNameChange = (val: string) => {
    setFormData(prev => ({ ...prev, 'Merchant Name': val }));
    const suggestions = searchRecords(val, 'name');
    setNameSuggestions(suggestions);
  };

  const handleSelectRecord = (record: MerchantRecord) => {
    setUpdateMsg(null);
    const sourceFile = record.__sourceFile as string;
    const config = dbConfigs[sourceFile];
    
    if (!config) return;

    const val = String(record[config.midCol] || '');
    setMid(val);
    
    const newForm: MerchantRecord = {};
    if (config.nameCol) newForm['Merchant Name'] = record[config.nameCol];

    ALL_FORM_FIELDS.forEach(fieldLabel => {
      const mappedCol = config.mappings[fieldLabel];
      let val = mappedCol ? record[mappedCol] : record[fieldLabel];
      
      if (val === undefined) {
         // Fallback to fuzzy search within the record keys if explicit mapping failed
         // But strictly restricted to the record provided (which comes from a Hold sheet)
         const fuzzyKey = Object.keys(record).find(k => normalizeKey(k) === normalizeKey(fieldLabel));
         if (fuzzyKey) val = record[fuzzyKey];
      }

      // Check field type for special formatting
      const isDateField = FIELD_GROUPS.some(g => g.fields.some(f => f.key === fieldLabel && f.type === 'date'));
      
      if (isDateField && val) {
        val = parseExcelDate(val);
      }
      
      // Auto-format currency fields on retrieval
      if ((fieldLabel === 'Hold Amount' || fieldLabel === 'Release Amount') && val) {
          val = formatCurrency(val);
      }

      if (val !== undefined) newForm[fieldLabel] = val;
    });

    if (activeProfile) {
      if (!newForm['Held By'] && activeProfile.defaultHeldBy) newForm['Held By'] = activeProfile.defaultHeldBy;
      if (!newForm['POS/ECOM'] && activeProfile.defaultPosEcom) newForm['POS/ECOM'] = activeProfile.defaultPosEcom;
    }

    setFormData(newForm);
    setStatus(MatchStatus.FOUND);
    setMidSuggestions([]);
    setNameSuggestions([]);
  };

  const handleUpdateExcel = async () => {
      setUpdateMsg(null);
      if (!mid) {
          setUpdateMsg({ type: 'error', text: 'No Merchant ID selected.' });
          return;
      }

      setIsUpdating(true);
      try {
          // Assuming we are updating the HOLD sheet based on context
          const success = await updateRowInMasterSheet('HOLD', mid, formData);
          
          if (success) {
              setUpdateMsg({ type: 'success', text: 'Excel Record Updated Successfully.' });
          } else {
              setUpdateMsg({ type: 'error', text: 'Update Failed. Ensure Hold File is linked in Admin.' });
          }
      } catch (e: any) {
          setUpdateMsg({ type: 'error', text: e.message || 'Unknown error occurred.' });
      } finally {
          setIsUpdating(false);
      }
  };

  const updateMapping = async (field: string, column: string) => {
    if (!configTargetDb) return;

    const currentConfig = dbConfigs[configTargetDb];
    if (!currentConfig) return;

    const newMappings = { ...currentConfig.mappings, [field]: column };
    
    setDbConfigs(prev => ({
        ...prev,
        [configTargetDb]: { ...prev[configTargetDb], mappings: newMappings }
    }));
    
    if (activeProfile) {
       const updatedProfile = { 
         ...activeProfile, 
         mappings: { ...activeProfile.mappings, [configTargetDb]: newMappings }
       };
       await saveUserProfile(updatedProfile);
       onUpdateProfile(updatedProfile);
    }
  };
  
  const updateIdCols = (type: 'mid' | 'name', col: string) => {
      if (!configTargetDb) return;
      setDbConfigs(prev => ({
          ...prev,
          [configTargetDb]: { ...prev[configTargetDb], [type === 'mid' ? 'midCol' : 'nameCol']: col }
      }));
  };

  const getDropdownOptions = (key: string) => {
    let opts: Set<string> = new Set();
    
    // Only pull options from HOLD databases to be consistent with search
    const holdDatabases = databases.filter(d => d.fileName.toLowerCase().includes('hold'));

    holdDatabases.forEach(db => {
        const config = dbConfigs[db.fileName];
        if (config) {
            const col = config.mappings[key] || db.columns.find(c => normalizeKey(c) === normalizeKey(key)) || key;
            const dbOpts = getUniqueValues(db.data, col);
            dbOpts.forEach(o => opts.add(o));
        }
    });

    if (activeProfile?.customOptions?.[key]) {
      activeProfile.customOptions[key].forEach(o => opts.add(o));
    }
    return Array.from(opts).sort();
  };

  const targetDbObj = databases.find(d => d.fileName === configTargetDb);

  return (
    <div className="bg-white h-full flex flex-col font-sans">
      
      {/* HEADER */}
      {databases.length > 0 && (
        <div className="px-8 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Sources</span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">{databases.length}</span>
            </div>
            
            <div className="h-4 w-px bg-slate-200"></div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Profile</span> 
              {activeProfile ? (
                 <div className="flex items-center gap-1.5 text-brand-700 bg-brand-50 px-2 py-0.5 rounded font-bold border border-brand-100 text-xs">
                   <User size={12} /> {activeProfile.name}
                 </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-0.5 rounded font-medium border border-slate-200 text-xs">
                  Guest
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${showConfig ? 'bg-brand-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {showConfig ? <X size={14} /> : <Settings size={14} />}
            <span>{showConfig ? 'Close Mapping' : 'Map Columns'}</span>
          </button>
        </div>
      )}

      {/* MAPPING OVERLAY */}
      {showConfig && databases.length > 0 ? (
        <div className="flex-1 overflow-auto bg-slate-50 p-6 animate-in fade-in slide-in-from-bottom-2">
           <div className="max-w-6xl mx-auto">
             <div className="flex items-center justify-between mb-6">
                <div>
                   <h3 className="text-lg font-bold text-slate-900">Column Mapping</h3>
                   <p className="text-sm text-slate-500">Configure how columns match for each database.</p>
                </div>
                
                {/* DB Selector for Mapping */}
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-500 uppercase px-2">Configuring:</span>
                    <select 
                        value={configTargetDb} 
                        onChange={e => setConfigTargetDb(e.target.value)}
                        className="text-sm font-bold text-slate-800 bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
                    >
                        {databases.map(db => (
                            <option key={db.fileName} value={db.fileName}>{db.fileName}</option>
                        ))}
                    </select>
                </div>
             </div>

             {targetDbObj && dbConfigs[configTargetDb] && (
                 <>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                            <label className="text-xs uppercase font-bold text-slate-500 mb-2 block">Unique Identifier (MID)</label>
                            <select 
                                value={dbConfigs[configTargetDb].midCol} 
                                onChange={e => updateIdCols('mid', e.target.value)} 
                                className="w-full text-sm border-slate-300 rounded-lg p-2.5 bg-slate-50 font-medium"
                            >
                                {targetDbObj.columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            </div>
                            <div>
                            <label className="text-xs uppercase font-bold text-slate-500 mb-2 block">Merchant Name</label>
                            <select 
                                value={dbConfigs[configTargetDb].nameCol} 
                                onChange={e => updateIdCols('name', e.target.value)} 
                                className="w-full text-sm border-slate-300 rounded-lg p-2.5 bg-slate-50 font-medium"
                            >
                                {targetDbObj.columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                        {ALL_FORM_FIELDS.map(field => (
                        <div key={field} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-600 flex justify-between items-center">
                            {field}
                            {dbConfigs[configTargetDb].mappings[field] && <Check size={12} className="text-green-500" />}
                            </label>
                            <select
                            value={dbConfigs[configTargetDb].mappings[field] || ''}
                            onChange={(e) => updateMapping(field, e.target.value)}
                            className={`block w-full text-sm border rounded-lg p-2 focus:ring-brand-500 focus:border-brand-500 ${dbConfigs[configTargetDb].mappings[field] ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-slate-50 border-slate-200'}`}
                            >
                            <option value="">-- Auto Match --</option>
                            {targetDbObj.columns.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                            </select>
                        </div>
                        ))}
                    </div>
                 </>
             )}
             
             <div className="fixed bottom-6 right-8">
               <button onClick={() => setShowConfig(false)} className="px-6 py-3 bg-brand-600 text-white rounded-full text-sm font-bold hover:bg-brand-700 shadow-lg flex items-center gap-2">
                  <Check size={16} /> Done Mapping
               </button>
             </div>
           </div>
        </div>
      ) : (
        <>
          {/* SEARCH HEADER */}
          <div className="p-8 bg-white border-b border-slate-100 z-30 relative shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] shrink-0">
             <div className="flex items-center gap-2 mb-4 text-brand-600 font-bold text-sm uppercase tracking-widest">
                <Search size={14} /> Search Held Merchant
             </div>
             <div className="flex flex-col md:flex-row gap-6">
                {/* MID Search */}
                <div className="flex-1">
                  <AutocompleteInput 
                    label="Merchant MID"
                    value={mid}
                    onChange={handleMidChange}
                    onSelect={handleSelectRecord}
                    suggestions={midSuggestions}
                    placeholder=""
                    disabled={databases.length === 0}
                    icon={<CreditCard className={`h-5 w-5 ${status === MatchStatus.NOT_FOUND && mid ? 'text-red-400' : 'text-brand-500'}`} />}
                    renderOption={(rec, isSelected) => {
                        const source = rec.__sourceFile as string;
                        const config = dbConfigs[source];
                        const name = config?.nameCol ? String(rec[config.nameCol] || '') : 'Unknown';
                        const id = config?.midCol ? String(rec[config.midCol] || '') : 'Unknown';
                        const isHoldSheet = source.toLowerCase().includes('hold');
                        
                        return (
                        <div className="w-full flex justify-between items-center group">
                            <div className="flex-1 min-w-0">
                            <div className={`font-mono text-sm font-bold ${isSelected ? 'text-brand-700' : 'text-slate-900'}`}>
                                <HighlightedText text={id} highlight={mid} />
                            </div>
                            <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                                <FileSpreadsheet size={10} className={isHoldSheet ? "text-green-500" : "text-slate-400"} />
                                <span className={`truncate max-w-[100px] ${isHoldSheet ? 'text-green-600 font-semibold' : 'text-slate-400'}`}>{source}</span>
                                <span className="text-slate-300">•</span>
                                <span className="truncate">{name}</span>
                            </div>
                            </div>
                            <ArrowRightLeft size={14} className={`shrink-0 ml-2 ${isSelected ? 'text-brand-500' : 'text-slate-300'}`} />
                        </div>
                        );
                    }}
                  />
                </div>

                {/* Merchant Name Search */}
                <div className="flex-[1.5]">
                   <AutocompleteInput 
                    label="Merchant Name"
                    value={String(formData['Merchant Name'] || '')}
                    onChange={handleNameChange}
                    onSelect={handleSelectRecord}
                    suggestions={nameSuggestions}
                    placeholder=""
                    disabled={databases.length === 0}
                    icon={<Building2 className="h-5 w-5 text-slate-400" />}
                    renderOption={(rec, isSelected) => {
                        const source = rec.__sourceFile as string;
                        const config = dbConfigs[source];
                        const name = config?.nameCol ? String(rec[config.nameCol] || '') : 'Unknown';
                        const id = config?.midCol ? String(rec[config.midCol] || '') : 'Unknown';
                        const isHoldSheet = source.toLowerCase().includes('hold');

                        return (
                        <div className="w-full flex justify-between items-center group">
                            <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold ${isSelected ? 'text-brand-700' : 'text-slate-900'}`}>
                                <HighlightedText text={name} highlight={String(formData['Merchant Name'] || '')} />
                            </div>
                            <div className="text-xs font-mono text-slate-500 truncate flex items-center gap-1.5">
                                 <FileSpreadsheet size={10} className={isHoldSheet ? "text-green-500" : "text-slate-400"} />
                                <span className={`truncate max-w-[100px] ${isHoldSheet ? 'text-green-600 font-semibold' : 'text-slate-400'}`}>{source}</span>
                                <span className="text-slate-300">•</span>
                                {id}
                            </div>
                            </div>
                            <ArrowRightLeft size={14} className={`shrink-0 ml-2 ${isSelected ? 'text-brand-500' : 'text-slate-300'}`} />
                        </div>
                        );
                    }}
                  />
                </div>
             </div>
          </div>

          {/* FORM BODY */}
          <div className="flex-1 overflow-auto bg-slate-50 p-8">
            {databases.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <LayoutGrid className="w-16 h-16 mb-4 text-slate-300" />
                  <p className="text-lg font-medium text-slate-500">No Sources Loaded</p>
                  <p className="text-sm">Use "Upload Data" or "Manual Entry" in the sidebar</p>
               </div>
            ) : (
              <div className="w-full space-y-8 pb-6 max-w-7xl mx-auto">
                
                {updateMsg && (
                    <div className={`p-4 rounded-lg border flex items-center gap-3 font-bold animate-in fade-in slide-in-from-top-2 ${updateMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {updateMsg.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                        {updateMsg.text}
                    </div>
                )}

                {FIELD_GROUPS.map(group => (
                  <div key={group.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
                    <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-3">
                       <div className="text-brand-600 bg-brand-50 p-1.5 rounded-lg">{group.icon}</div>
                       <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{group.title}</h3>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6">
                      {group.fields.map(field => (
                        <div key={field.key} className={field.key === 'FMU Remarks' ? 'col-span-full' : ''}>
                          {field.type === 'date' ? (
                              <HybridDateInput 
                                  value={String(formData[field.key] || '')}
                                  onChange={(val) => setFormData({...formData, [field.key]: val})}
                                  label={field.label}
                              />
                          ) : (
                              <SmartInput
                                type={field.type}
                                label={field.label}
                                value={String(formData[field.key] || '')}
                                onChange={(val) => setFormData({...formData, [field.key]: val})}
                                options={field.type === 'select' ? getDropdownOptions(field.key) : []}
                                readOnly={field.readonly}
                              />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center z-10 shrink-0">
            <button 
              onClick={() => { setMid(''); setFormData({}); setStatus(MatchStatus.IDLE); setUpdateMsg(null); }}
              className="px-6 py-2.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full text-sm font-bold transition-colors flex items-center gap-2 border border-transparent hover:border-red-100"
            >
              <Eraser size={16} /> Reset
            </button>
            <button 
                onClick={handleUpdateExcel}
                disabled={isUpdating || !mid}
                className="px-8 py-2.5 bg-brand-600 text-white rounded-full hover:bg-brand-700 shadow-lg shadow-brand-900/20 font-bold text-sm flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> : <PenTool size={16} />} 
              Update in Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
};