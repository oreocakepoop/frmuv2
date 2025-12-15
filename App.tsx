import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { SearchPanel } from './components/SearchPanel';
import { Sidebar } from './components/Sidebar';
import { AdminDashboard } from './components/AdminDashboard';
import { FlaggedMerchants } from './components/FlaggedMerchants';
import { AddManualEntry } from './components/AddManualEntry';
import { Documentation } from './components/Documentation';
import { SystemSettingsModal } from './components/SystemSettingsModal';
import { Login } from './components/Login';
import { ParsedDatabase, UserProfile, MerchantRecord } from './types';
import { Loader2 } from 'lucide-react';
import { loadDatabase, saveDatabase, clearDatabase, getUserProfiles, getActiveProfileId, setActiveProfileId, saveUserProfile } from './services/storageService';
import { saveManualEntries } from './services/excelService';

export default function App() {
  const [databases, setDatabases] = useState<ParsedDatabase[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  
  // Auth State (Initialize from Session Storage to prevent flash on reload)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
     return sessionStorage.getItem('frmu_auth_token') === 'valid';
  });

  const [currentView, setCurrentView] = useState<'search' | 'upload' | 'add_entry' | 'admin' | 'flagged' | 'documentation'>('search');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    // Only load data if authenticated (security best practice, though mostly UI here)
    if (!isAuthenticated) return;

    const initData = async () => {
      try {
        // Load Databases
        const savedData = await loadDatabase();
        if (savedData && savedData.length > 0) setDatabases(savedData);

        // Load Profiles
        const savedProfiles = await getUserProfiles();
        setProfiles(savedProfiles);

        // Load Active Profile
        const activeId = getActiveProfileId();
        if (activeId) {
          const found = savedProfiles.find(p => p.id === activeId);
          if (found) setActiveProfile(found);
        }

      } catch (e) {
        console.error("Failed to load saved data", e);
      } finally {
        setIsInitializing(false);
      }
    };
    initData();
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
      sessionStorage.setItem('frmu_auth_token', 'valid');
      setIsAuthenticated(true);
  };

  const persistDatabases = async (newData: ParsedDatabase[]) => {
      setIsSaving(true);
      try {
        await saveDatabase(newData);
      } catch (e) {
        console.error("Failed to save database", e);
      } finally {
        setIsSaving(false);
      }
  };

  const handleDataLoaded = async (data: ParsedDatabase | ParsedDatabase[]) => {
    const newItems = Array.isArray(data) ? data : [data];
    
    setDatabases(prev => {
        const currentNames = new Set(prev.map(db => db.fileName));
        const filteredNew = newItems.filter(item => {
            if (currentNames.has(item.fileName)) {
                console.warn(`Database "${item.fileName}" already loaded. Skipping duplicate.`);
                return false;
            }
            return true;
        });
        
        if (filteredNew.length === 0) {
            if (newItems.length === 1) alert(`Database "${newItems[0].fileName}" is already loaded.`);
            return prev;
        }

        const updated = [...prev, ...filteredNew];
        persistDatabases(updated); // Side effect: persist
        return updated;
    });
  };

  const handleRemoveDatabase = async (fileName: string) => {
    if (!confirm(`Remove "${fileName}" from the workspace?`)) return;
    setDatabases(prev => {
        const updated = prev.filter(db => db.fileName !== fileName);
        persistDatabases(updated);
        return updated;
    });
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to unload ALL databases?")) return;
    setDatabases([]);
    await clearDatabase();
  };

  const handleManualEntrySave = (type: 'HOLD' | 'RM', data: MerchantRecord) => {
    // We treat manual entries as a "Virtual File"
    const targetFileName = "System_Manual_Entry.xlsx";
    
    setDatabases(prev => {
      const existingDbIndex = prev.findIndex(db => db.fileName === targetFileName);
      let updatedDbs = [...prev];

      if (existingDbIndex >= 0) {
        // Append to existing
        const existingDb = updatedDbs[existingDbIndex];
        // Merge columns if new keys appear
        const newColumns = Array.from(new Set([...existingDb.columns, ...Object.keys(data)]));
        
        updatedDbs[existingDbIndex] = {
          ...existingDb,
          rowCount: existingDb.rowCount + 1,
          data: [...existingDb.data, data],
          columns: newColumns
        };
      } else {
        // Create new
        updatedDbs.push({
          fileName: targetFileName,
          rowCount: 1,
          data: [data],
          columns: Object.keys(data)
        });
      }

      persistDatabases(updatedDbs);
      return updatedDbs;
    });
  };

  const handleProfileChange = (profile: UserProfile | null) => {
    setActiveProfile(profile);
    setActiveProfileId(profile ? profile.id : null);
  };

  // State Updates passed to children to ensure sync
  const onProfileCreate = (newProfile: UserProfile) => {
    setProfiles(prev => [...prev, newProfile]);
    if (!activeProfile) handleProfileChange(newProfile);
  };

  const onProfileDelete = (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfile?.id === id) handleProfileChange(null);
  };

  const onProfileUpdate = (updated: UserProfile) => {
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (activeProfile?.id === updated.id) setActiveProfile(updated);
  };

  // 1. Check Auth First
  if (!isAuthenticated) {
      return <Login onLogin={handleLoginSuccess} />;
  }

  // 2. Check Initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-400 gap-3">
        <Loader2 className="animate-spin text-brand-600" /> 
        <span className="font-bold tracking-wide text-sm text-slate-500">INITIALIZING SYSTEM...</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <Sidebar 
          currentView={currentView} 
          onChangeView={setCurrentView} 
          onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* VIEW: SEARCH MERCHANT (Previously Workspace) */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${currentView === 'search' ? 'translate-x-0' : '-translate-x-full'}`}>
             <SearchPanel 
                databases={databases} 
                activeProfile={activeProfile} 
                onUpdateProfile={onProfileUpdate}
             />
        </div>

        {/* VIEW: UPLOAD DATA */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${currentView === 'upload' ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="h-full p-8 bg-slate-50 overflow-hidden">
                <FileUpload 
                  onDataLoaded={handleDataLoaded} 
                  onRemoveDatabase={handleRemoveDatabase}
                  onClearAll={handleClearAll}
                  loadedFiles={databases.map(db => ({ name: db.fileName, count: db.rowCount }))}
                />
           </div>
        </div>

        {/* VIEW: MANUAL ENTRY */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${currentView === 'add_entry' ? 'translate-x-0' : 'translate-x-full'}`}>
           <AddManualEntry 
              onSave={handleManualEntrySave}
              databases={databases}
              activeProfile={activeProfile}
           />
        </div>

        {/* VIEW: FLAGGED MERCHANTS */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${currentView === 'flagged' ? 'translate-x-0' : 'translate-x-full'}`}>
           <FlaggedMerchants databases={databases} activeProfile={activeProfile} />
        </div>

        {/* VIEW: ADMIN */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${currentView === 'admin' ? 'translate-x-0' : 'translate-x-full'}`}>
           <AdminDashboard 
              profiles={profiles}
              activeProfile={activeProfile}
              onProfileChange={handleProfileChange}
              onProfileUpdate={onProfileUpdate}
              onProfileDelete={onProfileDelete}
              onProfileCreate={onProfileCreate}
           />
        </div>

        {/* VIEW: DOCUMENTATION */}
        <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${currentView === 'documentation' ? 'translate-x-0' : 'translate-x-full'}`}>
           <Documentation />
        </div>

      </div>

      {/* Global System Settings Modal */}
      <SystemSettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          profiles={profiles}
          activeProfile={activeProfile}
          onProfileChange={handleProfileChange}
      />
    </div>
  );
}