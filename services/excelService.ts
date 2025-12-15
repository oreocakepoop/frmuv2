import { ParsedDatabase, MerchantRecord } from '../types';
import { getMasterHandle } from './storageService';

// We are using the CDN version of XLSX exposed via window
declare global {
  interface Window {
    XLSX: any;
  }
}

// Utility to safely trim strings
export const safeTrim = (str: any): string => {
  if (str === null || str === undefined) return '';
  return String(str).trim();
};

// Helper to normalize keys for searching (e.g., "Merchant ID" -> "mid")
export const normalizeKey = (key: string): string => {
  return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
};

// --- COLOR FORMATTING ---
export const getStatusColor = (status: string): string => {
    const s = String(status || '').toLowerCase();
    
    // Terminated / Closed -> RED
    if (s.includes('term') || s.includes('close') || s.includes('block')) {
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-100';
    }
    
    // Settlement Hold -> PURPLE
    if (s.includes('settlement') || s.includes('pay') || s.includes('funds')) {
        return 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-100';
    }
    
    // Active -> GREEN
    if (s === 'active' || s.includes('live') || s.includes('open')) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100';
    }
    
    // Released -> BLUE
    if (s.includes('release') || s.includes('free')) {
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-100';
    }
    
    // On Hold / Account Hold -> AMBER/ORANGE
    if (s.includes('hold') || s.includes('susp')) {
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100';
    }

    // Default -> SLATE
    return 'bg-slate-50 text-slate-600 border-slate-200';
};

// Currency Formatter: 1,234.56
export const formatCurrency = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';
    const strVal = String(val);
    if (strVal.includes(',') && strVal.includes('.') && strVal.split('.')[1].length === 2) return strVal;
    const cleanStr = strVal.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleanStr);
    if (isNaN(num)) return strVal;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Parse Excel Date
export const parseExcelDate = (value: any): string => {
  if (value === null || value === undefined) return '';
  const strVal = String(value).trim();
  if (strVal === '') return '';
  
  if (!isNaN(Number(strVal)) && Number(strVal) > 30000 && Number(strVal) < 60000) {
     const num = Number(strVal);
     const date = new Date(Math.round((num - 25569) * 86400 * 1000) + 43200000);
     if (!isNaN(date.getTime())) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${m}/${d}/${y}`;
     }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
      const parts = strVal.split('-');
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  if (/^[A-Za-z]{3}\/\d{1,2}\/\d{4}$/.test(strVal)) {
      const date = new Date(strVal);
      if (!isNaN(date.getTime())) {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${m}/${d}/${y}`;
      }
  }
  return strVal;
};

export const formatDateForDisplay = (val: string): string => {
    return parseExcelDate(val);
};

export const getUniqueValues = (data: MerchantRecord[], key: string): string[] => {
  const values = new Set<string>();
  data.forEach(row => {
    const val = row[key];
    if (val !== undefined && val !== null && val !== '') {
      values.add(String(val).trim());
    }
  });
  return Array.from(values).sort();
};

export const findMidColumn = (columns: string[]): string | null => {
  const candidates = [
      'mid', 'merchantid', 'merch_id', 'id', 'merchant_id', 'merchant_mid', 'accountid', 'account_id', 
      'outletid', 'outlet_id', 'outlet_number', 'card_acceptor_id', 'merchant_no', 'mid_no', 'midnumber',
      'partyid', 'party_id', 'orgmid', 'org_mid', 'accountnumber', 'cardacceptor', 'merchnum'
  ];
  for (const col of columns) {
    if (candidates.includes(normalizeKey(col))) {
      return col;
    }
  }
  return null;
};

export const findNameColumn = (columns: string[]): string | null => {
  const candidates = ['merchantname', 'name', 'merchant', 'legalname', 'dba', 'doingbusinessas', 'mname', 'business_name', 'merchant_legal_name', 'outletname'];
  for (const col of columns) {
    if (candidates.includes(normalizeKey(col))) {
      return col;
    }
  }
  return null;
};

const processWorkbook = (workbook: any, fileName: string): ParsedDatabase => {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    let headerRowIndex = 0;
    let foundHeader = false;
    for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
        const row = (rawRows[i] as any[]).map(cell => String(cell));
        const normalizedRow = row.map(cell => normalizeKey(cell));
        if (normalizedRow.some(cell => ['merchantid', 'mid', 'merchantname', 'rmname', 'status', 'accountid', 'orgmid', 'dateofhold'].includes(cell))) {
            headerRowIndex = i;
            foundHeader = true;
            break;
        }
    }
    const range = window.XLSX.utils.decode_range(sheet['!ref']);
    range.s.r = headerRowIndex;
    const newRange = window.XLSX.utils.encode_range(range);
    const jsonData: MerchantRecord[] = window.XLSX.utils.sheet_to_json(sheet, { range: newRange, defval: "", raw: true });
    let columns: string[] = [];
    if (jsonData.length > 0) columns = Object.keys(jsonData[0]);
    else if (foundHeader) columns = (rawRows[headerRowIndex] as any[]).map(c => safeTrim(c));
    return { fileName, rowCount: jsonData.length, data: jsonData, columns };
};

export const parseExcelFile = async (file: File): Promise<ParsedDatabase> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!window.XLSX) { 
            reject(new Error("XLSX library not loaded. Check internet connection.")); 
            return; 
        }
        // Use type: 'array' for ArrayBuffer, which is more robust for production
        const workbook = window.XLSX.read(data, { type: 'array' });
        resolve(processWorkbook(workbook, file.name));
      } catch (error) { reject(error); }
    };
    reader.onerror = (error) => reject(error);
    // Read as ArrayBuffer instead of BinaryString to avoid encoding issues
    reader.readAsArrayBuffer(file);
  });
};

export const parseExcelFromUrl = async (url: string): Promise<ParsedDatabase> => {
    if (!window.XLSX) throw new Error("XLSX library not loaded.");
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch file`);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
        let fileName = 'remote_database.xlsx';
        try { fileName = new URL(url).pathname.split('/').pop() || fileName; } catch(e){}
        return processWorkbook(workbook, fileName);
    } catch (error) { throw error; }
};

export const exportToExcel = (data: MerchantRecord[], fileName: string = 'flagged_merchants.xlsx') => {
    if (!window.XLSX) return;
    const cleanData = data.map(row => {
        const newRow: MerchantRecord = {};
        Object.keys(row).forEach(key => {
            if (!key.startsWith('_') && key !== 'flagId') newRow[key] = row[key];
        });
        return newRow;
    });
    const worksheet = window.XLSX.utils.json_to_sheet(cleanData);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    window.XLSX.writeFile(workbook, fileName);
};

// Map internal form keys to Excel columns
const FIELD_MAPPINGS: Record<string, string[]> = {
    'Merchant ID': ['mid', 'merchantid', 'orgmid', 'merchant_id'],
    'Merchant Name': ['merchantname', 'name', 'merchant'],
    'POS/ECOM': ['pos', 'posecom', 'type'],
    'RM Name': ['rm', 'rmname', 'relationshipmanager'],
    'Channel SME/KEY/GOV': ['finalseg', 'final_segment', 'finalsegment', 'segment', 'channel', 'seg', 'sub_segment'],
    'Current Status': ['status', 'currentstatus'],
    'Date of Hold': ['dateofhold', 'holddate'],
    'Held By': ['heldby', 'held_by'],
    'Hold Amount': ['holdamount', 'amount', 'hold_amount', 'amt'],
    'Date Of Relase': ['releasedate', 'dateofrelease', 'daterelease', 'release_date', 'released_date'],
    'Released By': ['releasedby', 'released_by', 'rel_by'],
    'Release Amount': ['releaseamount', 'release_amount'],
    'Reason of hold': ['reason', 'holdreason', 'reason_code'],
    'FMU Remarks': ['remarks', 'fmuremarks', 'comments'],
    'Closed Date': ['closeddate', 'dateclosed', 'closed_date'],
    'Aging of Hold': ['agingofhold', 'aging_hold', 'hold_aging', 'aging'],
    'Aging between Hold & Release': ['agingduration', 'aging_between', 'duration'],
    'Chain ID': ['chainid', 'chain', 'chain_id'],
    'Group Name': ['group', 'groupname', 'group_name'],
    'Team Lead (TL)': ['tl', 'teamlead', 'team_lead'],
    'Final Seg': ['finalseg', 'final_segment', 'final_seg', 'channel'],
    'Org + MID': ['orgmid', 'mid', 'org_mid'],
    'RM': ['rm', 'relationshipmanager', 'relationship_manager']
};

/**
 * DIRECTLY UPDATES A ROW IN THE MASTER FILE USING FILE SYSTEM ACCESS API
 */
export const updateRowInMasterSheet = async (targetSheetType: 'HOLD' | 'RM', midToFind: string, updatedData: MerchantRecord): Promise<boolean> => {
    if (!window.XLSX) {
        alert("System Error: Excel library not loaded.");
        return false;
    }
    if (!midToFind) {
        alert("Cannot update record without a Merchant ID.");
        return false;
    }

    // 1. Get Handle
    const fileHandle = await getMasterHandle(targetSheetType);
    if (!fileHandle) {
        alert(`No Linked File for ${targetSheetType} Sheet. Go to Admin Dashboard to link a file.`);
        return false;
    }

    try {
        // 2. Verify Permission
        const opts = { mode: 'readwrite' };
        if ((await fileHandle.queryPermission(opts)) !== 'granted') {
            if ((await fileHandle.requestPermission(opts)) !== 'granted') {
                alert("Permission denied. Cannot update file.");
                return false;
            }
        }

        // 3. Read File
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(arrayBuffer);

        // 4. Find Sheet
        let sheetName = "";
        const existingNames = workbook.SheetNames;
        const fuzzyMatch = existingNames.find((n: string) => normalizeKey(n).includes(targetSheetType.toLowerCase()));
        if (fuzzyMatch) sheetName = fuzzyMatch;
        else sheetName = existingNames[0];

        const worksheet = workbook.Sheets[sheetName];
        
        // 5. Parse to JSON (with headers) to find the row index
        const jsonData: any[] = window.XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        // 6. Find the row index
        let rowIndex = -1;
        const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
        const midCol = findMidColumn(columns);

        if (!midCol) {
            alert("Could not identify a Merchant ID column in the linked file.");
            return false;
        }

        // Find match (normalize both sides)
        rowIndex = jsonData.findIndex(row => {
            return normalizeKey(String(row[midCol])) === normalizeKey(midToFind);
        });

        if (rowIndex === -1) {
            alert(`Record with MID "${midToFind}" not found in the linked file.`);
            return false;
        }

        // 7. Update Data
        const rowToUpdate = jsonData[rowIndex];

        // Iterate through form fields and map them to the excel columns
        Object.keys(updatedData).forEach(formKey => {
            if (updatedData[formKey] === undefined || updatedData[formKey] === null) return;
            
            let targetCol = "";

            // Try exact match in excel columns
            if (columns.includes(formKey)) targetCol = formKey;
            
            // Try normalized match
            if (!targetCol) {
                targetCol = columns.find(c => normalizeKey(c) === normalizeKey(formKey)) || "";
            }

            // Try field mapping
            if (!targetCol && FIELD_MAPPINGS[formKey]) {
                targetCol = columns.find(c => FIELD_MAPPINGS[formKey].includes(normalizeKey(c))) || "";
            }

            if (targetCol) {
                rowToUpdate[targetCol] = updatedData[formKey];
            }
        });

        // 8. Write back to workbook
        const newWorksheet = window.XLSX.utils.json_to_sheet(jsonData);
        workbook.Sheets[sheetName] = newWorksheet;

        const outBuffer = window.XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        
        const writable = await fileHandle.createWritable();
        await writable.write(outBuffer);
        await writable.close();

        return true;

    } catch (e: any) {
        console.error("Update Error:", e);
        alert(`Failed to update Excel file: ${e.message}`);
        return false;
    }
};

/**
 * DIRECTLY UPDATES THE LOCAL MASTER FILE USING FILE SYSTEM ACCESS API
 */
export const updateMasterSheet = async (targetSheetName: 'Hold_Entries' | 'RM_Entries', databases: ParsedDatabase[]): Promise<boolean> => {
    if (!window.XLSX) {
        alert("System Error: Excel library not loaded.");
        return false;
    }

    // 1. Get New Data from "Virtual" DB
    const manualDb = databases.find(d => d.fileName === 'System_Manual_Entry.xlsx');
    if (!manualDb || manualDb.data.length === 0) {
        alert("No new entries found to update.");
        return false;
    }

    // Determine Type and Handle Key
    const type = targetSheetName === 'Hold_Entries' ? 'HOLD' : 'RM';
    const newRecords = manualDb.data.filter(r => r._type === type);

    if (newRecords.length === 0) {
        alert(`No new ${type} entries to add.`);
        return false;
    }

    // 2. Get Correct Handle
    const fileHandle = await getMasterHandle(type);
    if (!fileHandle) {
        alert(`No Linked File for ${type} Sheet. Please go to Admin Dashboard and link the target Excel file.`);
        return false;
    }

    try {
        // 3. Verify Permission (Browser will prompt user if needed)
        // We verify readwrite permission
        const opts = { mode: 'readwrite' };
        if ((await fileHandle.queryPermission(opts)) !== 'granted') {
            if ((await fileHandle.requestPermission(opts)) !== 'granted') {
                alert("Permission denied. Cannot update file.");
                return false;
            }
        }

        // 4. Read Existing File
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(arrayBuffer);

        // 5. Check or Create Sheet
        let sheetName = targetSheetName;
        if (!workbook.Sheets[sheetName]) {
             const existingNames = workbook.SheetNames;
             const fuzzyMatch = existingNames.find((n: string) => normalizeKey(n).includes(type.toLowerCase()));
             if (fuzzyMatch) sheetName = fuzzyMatch;
             else {
                 if (existingNames.length === 1) {
                     sheetName = existingNames[0];
                 } else {
                     window.XLSX.utils.book_append_sheet(workbook, window.XLSX.utils.json_to_sheet([]), sheetName);
                 }
             }
        }

        const worksheet = workbook.Sheets[sheetName];
        
        // 6. Parse existing sheet to JSON to determine columns
        const existingData = window.XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        let columns: string[] = [];
        if (existingData.length > 0) {
            columns = Object.keys(existingData[0]);
        } else {
            // New Sheet or Empty: use keys from new data
            columns = Object.keys(newRecords[0]).filter(k => !k.startsWith('_'));
        }

        // 7. Map New Records to Existing Columns
        const dataToAppend = newRecords.map(entry => {
            const row: any = {};
            // First, fill based on existing columns
            columns.forEach(col => {
                let val: any = '';
                const normCol = normalizeKey(col);
                
                // Try exact match
                if (entry[col] !== undefined) val = entry[col];
                else {
                    // Try mapping
                    const matchedInternalKey = Object.keys(FIELD_MAPPINGS).find(internalKey => 
                        FIELD_MAPPINGS[internalKey].includes(normCol)
                    );
                    if (matchedInternalKey && entry[matchedInternalKey] !== undefined) {
                         val = entry[matchedInternalKey];
                    } else {
                         // Try fuzzy match
                         const entryKey = Object.keys(entry).find(k => normalizeKey(k) === normCol);
                         if (entryKey) val = entry[entryKey];
                    }
                }
                row[col] = val;
            });

            // If existing sheet has no columns (empty), populate with all fields
            if (columns.length === 0) {
                 Object.keys(entry).forEach(k => {
                    if (!k.startsWith('_')) row[k] = entry[k];
                });
            }
            
            return row;
        });

        // 8. Append Data
        const combinedData = [...existingData, ...dataToAppend];
        const newWorksheet = window.XLSX.utils.json_to_sheet(combinedData);
        workbook.Sheets[sheetName] = newWorksheet;

        // 9. Write Back to File
        const outBuffer = window.XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        
        const writable = await fileHandle.createWritable();
        await writable.write(outBuffer);
        await writable.close();

        alert(`Successfully appended ${newRecords.length} rows to sheet "${sheetName}" in file "${fileHandle.name}".`);
        return true;

    } catch (e: any) {
        console.error("File System Access Error:", e);
        // Improved error message for production users
        if (e.name === 'NotAllowedError') {
             alert("Permission to write to file was denied.");
        } else if (e.name === 'NotFoundError') {
             alert("The linked file was moved or deleted. Please link the file again in Admin Dashboard.");
        } else {
             alert(`Error updating file: ${e.message}. Ensure the file is not open in another program.`);
        }
        return false;
    }
};

// Legacy fallback
export const saveManualEntries = () => {};