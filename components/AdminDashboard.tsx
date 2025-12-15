import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Users, List, Plus, Trash2, Check, User, Save, Search, LayoutGrid, FileSpreadsheet, Link, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { saveUserProfile, deleteUserProfile, saveMasterHandle, getMasterHandle } from '../services/storageService';

interface AdminDashboardProps {
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  onProfileChange: (profile: UserProfile | null) => void;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  onProfileDelete: (id: string) => void;
  onProfileCreate: (newProfile: UserProfile) => void;
}

// Robust ID Generator compatible with older environments
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  profiles,
  activeProfile,
  onProfileChange,
  onProfileUpdate,
  onProfileDelete,
  onProfileCreate
}) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'lists'>('profiles');
  
  // Profile Creation State
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileHeldBy, setNewProfileHeldBy] = useState('');
  const [newProfilePos, setNewProfilePos] = useState('');

  // List Management State
  const [selectedListKey, setSelectedListKey] = useState<string>('Current Status');
  const [newListItem, setNewListItem] = useState('');

  // Master File State
  const [isHoldLinked, setIsHoldLinked] = useState(false);
  const [isRmLinked, setIsRmLinked] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
      checkLinkStatus();
  }, []);

  const checkLinkStatus = async () => {
      const holdHandle = await getMasterHandle('HOLD');
      setIsHoldLinked(!!holdHandle);
      
      const rmHandle = await getMasterHandle('RM');
      setIsRmLinked(!!rmHandle);
  };

  const handleLinkFile = async (type: 'HOLD' | 'RM') => {
      setLinkError(null);
      
      // Check if API is supported
      if (!('showOpenFilePicker' in window)) {
          alert("Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera on a desktop.");
          return;
      }

      try {
          const [handle] = await (window as any).showOpenFilePicker({
              types: [{
                  description: 'Excel Files',
                  accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
              }],
              multiple: false
          });
          
          if (handle) {
              await saveMasterHandle(handle, type);
              if (type === 'HOLD') setIsHoldLinked(true);
              else setIsRmLinked(true);
              
              alert(`Successfully linked: ${handle.name} for ${type} Sheet.`);
          }
      } catch (err: any) {
          if (err.name === 'AbortError') return;

          console.error("File Linking Error:", err);
          
          // Specific handling for Cross-Origin/Iframe issues
          // Catches both "SecurityError" name and specific message text regarding cross origin
          if (err.name === 'SecurityError' || err.message?.includes('Cross origin sub frames') || err.message?.includes('user gesture')) {
              const errorMsg = "Browser Security Restriction: File System Access is blocked inside this preview window.";
              setLinkError(errorMsg);
              
              const shouldOpenNew = confirm(
                  "Security Restriction Detected.\n\n" +
                  "The browser blocked access to your files because this app is running inside a preview frame/sandbox.\n\n" +
                  "To use the File Linking feature, please open this app in its own tab.\n\n" +
                  "Open in new tab now?"
              );
              if (shouldOpenNew) {
                  window.open(window.location.href, '_blank');
              }
          } else {
              setLinkError(`Failed to link file: ${err.message}`);
              alert(`Failed to link file: ${err.message}`);
          }
      }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    
    const newProfile: UserProfile = {
      id: generateId(),
      name: newProfileName.trim(),
      defaultHeldBy: newProfileHeldBy.trim(),
      defaultPosEcom: newProfilePos.trim(),
      masterFilename: 'Master_Database.xlsx',
      mappings: {},
      customOptions: {}
    };

    try {
      await saveUserProfile(newProfile);
      onProfileCreate(newProfile);
      setNewProfileName('');
      setNewProfileHeldBy('');
      setNewProfilePos('');
    } catch (e) {
      console.error("Failed to create profile", e);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile? This cannot be undone.')) return;
    try {
      await deleteUserProfile(id);
      onProfileDelete(id);
    } catch (e) {
      console.error("Failed to delete profile", e);
    }
  };

  const handleAddListItem = async () => {
    if (!activeProfile) {
      alert("Please select or create a profile to manage lists.");
      return;
    }
    if (!newListItem.trim()) return;

    const currentList = activeProfile.customOptions?.[selectedListKey] || [];
    if (currentList.includes(newListItem.trim())) return;

    const updatedOptions = {
      ...activeProfile.customOptions,
      [selectedListKey]: [...currentList, newListItem.trim()].sort()
    };

    const updatedProfile = { ...activeProfile, customOptions: updatedOptions };
    
    try {
      await saveUserProfile(updatedProfile);
      onProfileUpdate(updatedProfile);
      setNewListItem('');
    } catch (e) {
      console.error("Failed to update list", e);
    }
  };

  const handleRemoveListItem = async (itemToRemove: string) => {
    if (!activeProfile) return;
    
    const currentList = activeProfile.customOptions?.[selectedListKey] || [];
    const updatedOptions = {
      ...activeProfile.customOptions,
      [selectedListKey]: currentList.filter(i => i !== itemToRemove)
    };

    const updatedProfile = { ...activeProfile, customOptions: updatedOptions };
    
    try {
      await saveUserProfile(updatedProfile);
      onProfileUpdate(updatedProfile);
    } catch (e) {
      console.error("Failed to update list", e);
    }
  };

  const CONFIGURABLE_LISTS = [
    'Current Status', 'Account / Settlement Hold', 'Held By', 
    'Released By', 'added By', 'Reason of hold'
  ];

  // Check if we are likely in an iframe to show a warning hint
  const isEmbedded = window.self !== window.top;

  return (
    <div className="flex-1 h-full bg-slate-50 overflow-hidden flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <h1 className="text-2xl font-bold text-slate-800">System Administration</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage user profiles, system defaults, and global configurations.</p>
        
        <div className="flex gap-4 mt-6">
          <button 
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'profiles' ? 'bg-brand-600 text-white shadow-md shadow-brand-900/10' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <Users size={16} /> User Profiles
          </button>
          <button 
            onClick={() => setActiveTab('lists')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'lists' ? 'bg-brand-600 text-white shadow-md shadow-brand-900/10' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <List size={16} /> Dropdown Lists
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        
        {/* PROFILES TAB */}
        {activeTab === 'profiles' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 max-w-7xl mx-auto">
            {/* Create Profile Card */}
            <div className="xl:col-span-4 space-y-6">
              
              {/* MASTER FILE LINKING - DUAL BUTTONS */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <FileSpreadsheet size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Linked Excel Files</h3>
                </div>
                
                {isEmbedded && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                         <ExternalLink size={14} className="shrink-0 mt-0.5" />
                         <div>
                             Running in preview mode? File Linking requires opening the app in a new tab to bypass browser security blocks.
                         </div>
                    </div>
                )}
                
                {linkError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 flex items-start gap-2">
                         <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                         <div>{linkError}</div>
                    </div>
                )}

                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Link local Excel files to allow direct updating. When you click update in the manual entry form, data will be appended to these files.
                </p>
                
                <div className="space-y-4">
                    {/* HOLD SHEET LINK */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                            <span>Hold Sheet</span>
                            {isHoldLinked && <span className="text-green-600 flex items-center gap-1"><Check size={10} /> Linked</span>}
                        </div>
                        <button 
                            onClick={() => handleLinkFile('HOLD')}
                            className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                                isHoldLinked 
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <FileText size={16} />
                            {isHoldLinked ? 'Change Hold File' : 'Link Hold File'}
                        </button>
                    </div>

                    {/* RM SHEET LINK */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                            <span>RM Sheet</span>
                            {isRmLinked && <span className="text-green-600 flex items-center gap-1"><Check size={10} /> Linked</span>}
                        </div>
                        <button 
                            onClick={() => handleLinkFile('RM')}
                            className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 border ${
                                isRmLinked 
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <User size={16} />
                            {isRmLinked ? 'Change RM File' : 'Link RM File'}
                        </button>
                    </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                    <User size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">New Profile</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="relative">
                    <input 
                      type="text"
                      id="profileName"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      className="block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent"
                      placeholder=" "
                    />
                    <label htmlFor="profileName" className="absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2 pointer-events-none">
                        Profile Name
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input 
                        type="text"
                        id="defaultHeldBy"
                        value={newProfileHeldBy}
                        onChange={(e) => setNewProfileHeldBy(e.target.value)}
                        className="block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent"
                        placeholder=" "
                      />
                      <label htmlFor="defaultHeldBy" className="absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2 pointer-events-none">
                          Default Held By
                      </label>
                    </div>
                    <div className="relative">
                      <input 
                        type="text"
                        id="defaultSegment"
                        value={newProfilePos}
                        onChange={(e) => setNewProfilePos(e.target.value)}
                        className="block px-4 py-3 w-full text-sm text-gray-900 bg-white rounded-md border border-slate-300 appearance-none focus:outline-none focus:ring-0 focus:border-brand-600 peer placeholder-transparent"
                        placeholder=" "
                      />
                      <label htmlFor="defaultSegment" className="absolute text-sm text-slate-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-brand-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2 pointer-events-none">
                          Default Segment
                      </label>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleCreateProfile}
                    disabled={!newProfileName}
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-full font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <Plus size={16} /> Create Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Profile List */}
            <div className="xl:col-span-8 space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Existing Profiles</h3>
              
              {profiles.length === 0 && (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed text-slate-400">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No profiles found. Create one to get started.</p>
                </div>
              )}

              {profiles.map(profile => (
                <div key={profile.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-brand-300 transition-colors">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold border border-brand-100">
                      {profile.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{profile.name}</h4>
                        {activeProfile?.id === profile.id && (
                          <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-green-200 uppercase tracking-wide">Active</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex gap-4">
                        <span><span className="font-semibold text-slate-700">Defaults:</span> {profile.defaultHeldBy || '-'} / {profile.defaultPosEcom || '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {activeProfile?.id !== profile.id ? (
                      <button 
                        onClick={() => onProfileChange(profile)}
                        className="px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50 rounded-lg border border-brand-200 hover:border-brand-300 transition-all"
                      >
                        Set Active
                      </button>
                    ) : (
                       <button 
                        disabled
                        className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 rounded-lg border border-green-200 opacity-70 cursor-default"
                      >
                        Currently Active
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Profile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LISTS TAB */}
        {activeTab === 'lists' && (
          <div className="max-w-5xl mx-auto">
             {!activeProfile ? (
               <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
                 <div className="bg-amber-50 text-amber-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900">No Active Profile</h3>
                 <p className="text-slate-500 max-w-md mx-auto mt-2">Dropdown lists are stored within a user profile. Please select or create a profile in the Profiles tab to manage these lists.</p>
                 <button 
                   onClick={() => setActiveTab('profiles')}
                   className="mt-6 px-6 py-2 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700"
                 >
                   Go to Profiles
                 </button>
               </div>
             ) : (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
                 {/* Sidebar selector */}
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                   <div className="p-4 bg-slate-50 border-b border-slate-200">
                     <h4 className="text-xs font-bold text-slate-500 uppercase">Target Field</h4>
                   </div>
                   <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {CONFIGURABLE_LISTS.map(listName => (
                        <button
                          key={listName}
                          onClick={() => setSelectedListKey(listName)}
                          className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                            selectedListKey === listName 
                              ? 'bg-brand-50 text-brand-700 border border-brand-100' 
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {listName}
                          {selectedListKey === listName && <Check size={14} />}
                        </button>
                      ))}
                   </div>
                 </div>

                 {/* Editor */}
                 <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                       <div>
                         <h3 className="font-bold text-slate-800">{selectedListKey}</h3>
                         <p className="text-xs text-slate-500 mt-1">Managing options for {activeProfile.name}</p>
                       </div>
                       <div className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-mono">
                         {(activeProfile.customOptions?.[selectedListKey] || []).length} items
                       </div>
                    </div>
                    
                    {/* Add New */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-2">
                       <input 
                         type="text" 
                         value={newListItem}
                         onChange={e => setNewListItem(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && handleAddListItem()}
                         placeholder={`Add new option for ${selectedListKey}...`}
                         className="flex-1 px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none placeholder:text-slate-400"
                       />
                       <button 
                         onClick={handleAddListItem}
                         disabled={!newListItem}
                         className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 disabled:opacity-50"
                       >
                         Add
                       </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2">
                       {(activeProfile.customOptions?.[selectedListKey] || []).length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400">
                           <LayoutGrid size={32} className="mb-2 opacity-50" />
                           <p className="text-sm">No custom options defined</p>
                           <p className="text-xs">Standard options from Excel will still appear</p>
                         </div>
                       ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                           {(activeProfile.customOptions?.[selectedListKey] || []).map(item => (
                             <div key={item} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 shadow-sm group">
                                <span className="text-sm text-slate-700 font-medium">{item}</span>
                                <button 
                                  onClick={() => handleRemoveListItem(item)}
                                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                 </div>
               </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
};