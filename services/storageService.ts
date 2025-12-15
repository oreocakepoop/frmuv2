import { ParsedDatabase, UserProfile, MerchantRecord } from '../types';

const DB_NAME = 'MerchantMatchDB';
const STORE_NAME = 'active_database';
const STORE_PROFILES = 'user_profiles';
const STORE_FLAGGED = 'flagged_merchants';
const STORE_HANDLES = 'file_handles'; // New store for file handles
const DB_VERSION = 4; // Incremented version for new store

// Initialize the database
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FLAGGED)) {
        db.createObjectStore(STORE_FLAGGED, { keyPath: 'flagId', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        // Simple Key-Value store for handles
        db.createObjectStore(STORE_HANDLES);
      }
    };
  });
};

// --- DATABASE OPERATIONS ---

export const saveDatabase = async (data: ParsedDatabase[]): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, 'current_list');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error("Error saving to IndexedDB:", err);
    throw err;
  }
};

export const loadDatabase = async (): Promise<ParsedDatabase[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current_list');
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result)) {
            resolve(result);
        } else if (result && typeof result === 'object') {
            if ('data' in result) {
                resolve([result as ParsedDatabase]);
            } else {
                resolve([]);
            }
        } else {
            resolve([]);
        }
      };
    });
  } catch (err) {
    console.error("Error loading from IndexedDB:", err);
    return [];
  }
};

export const clearDatabase = async (): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete('current_list');
      store.delete('current');
      
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error("Error clearing IndexedDB:", err);
    throw err;
  }
};

// --- USER PROFILE OPERATIONS ---

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PROFILES, 'readwrite');
      const store = transaction.objectStore(STORE_PROFILES);
      const request = store.put(profile);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error("Error saving user profile:", err);
    throw err;
  }
};

export const getUserProfiles = async (): Promise<UserProfile[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PROFILES, 'readonly');
      const store = transaction.objectStore(STORE_PROFILES);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.error("Error loading user profiles:", err);
    return [];
  }
};

export const deleteUserProfile = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PROFILES, 'readwrite');
      const store = transaction.objectStore(STORE_PROFILES);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error("Error deleting user profile:", err);
    throw err;
  }
};

// --- FILE HANDLE OPERATIONS (For updating local excel) ---

export const saveMasterHandle = async (handle: any, type: 'HOLD' | 'RM'): Promise<void> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_HANDLES, 'readwrite');
            const store = transaction.objectStore(STORE_HANDLES);
            // We store the handle with a type suffix
            const request = store.put(handle, `master_excel_${type}`);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (err) {
        console.error("Error saving master handle:", err);
        throw err;
    }
};

export const getMasterHandle = async (type: 'HOLD' | 'RM'): Promise<any> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_HANDLES, 'readonly');
            const store = transaction.objectStore(STORE_HANDLES);
            const request = store.get(`master_excel_${type}`);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    } catch (err) {
        console.error("Error retrieving master handle:", err);
        return null;
    }
};

// --- FLAGGED MERCHANTS OPERATIONS ---

export const saveFlaggedMerchant = async (record: MerchantRecord): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_FLAGGED, 'readwrite');
      const store = transaction.objectStore(STORE_FLAGGED);
      const recordWithMeta = { ...record, _flaggedAt: new Date().toISOString() };
      const request = store.add(recordWithMeta);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (err) {
    console.error("Error flagging merchant:", err);
    throw err;
  }
};

export const getFlaggedMerchants = async (): Promise<MerchantRecord[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_FLAGGED, 'readonly');
      const store = transaction.objectStore(STORE_FLAGGED);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.error("Error loading flagged merchants:", err);
    return [];
  }
};

export const deleteFlaggedMerchant = async (flagId: number): Promise<void> => {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_FLAGGED, 'readwrite');
        const store = transaction.objectStore(STORE_FLAGGED);
        const request = store.delete(flagId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (err) {
      console.error("Error unflagging merchant:", err);
      throw err;
    }
};

// --- ACTIVE PROFILE HELPERS ---
const ACTIVE_PROFILE_KEY = 'merchant_match_active_profile_id';

export const getActiveProfileId = (): string | null => {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
};

export const setActiveProfileId = (id: string | null): void => {
  if (id) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
};

// --- EXPORT / IMPORT CONFIGURATION ---
export const exportSystemConfig = async (): Promise<Blob> => {
    const profiles = await getUserProfiles();
    const activeId = getActiveProfileId();
    
    const config = {
        version: 1,
        exportedAt: new Date().toISOString(),
        activeProfileId: activeId,
        profiles: profiles
    };
    
    return new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
};

export const importSystemConfig = async (jsonString: string): Promise<boolean> => {
    try {
        const config = JSON.parse(jsonString);
        if (!config.profiles || !Array.isArray(config.profiles)) {
            throw new Error("Invalid Configuration File");
        }

        const db = await initDB();
        const transaction = db.transaction(STORE_PROFILES, 'readwrite');
        const store = transaction.objectStore(STORE_PROFILES);

        // Import all profiles
        for (const profile of config.profiles) {
            store.put(profile);
        }
        
        // Restore active selection if possible
        if (config.activeProfileId) {
            setActiveProfileId(config.activeProfileId);
        }

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });

    } catch (e) {
        console.error("Import failed:", e);
        throw e;
    }
};

export const factoryReset = async (): Promise<void> => {
    // Clear Local Storage
    localStorage.clear();

    // Delete IndexedDB
    return new Promise((resolve, reject) => {
        const req = window.indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => {
             alert("System Reset Blocked: Please close other tabs of this application and try again.");
             reject(new Error("Database Blocked"));
        };
    });
};