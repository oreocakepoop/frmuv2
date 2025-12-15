# FRMU Dashboard (Merchant Match Automator) - Application Blueprint

## 1. Project Overview
**Name:** FRMU Dashboard / Merchant Match Automator
**Purpose:** A specialized web application designed to automate the management, searching, flagging, and updating of Merchant data (specifically "Held" merchants) and Relationship Manager (RM) details.
**Tech Stack:**
- **Core:** React 19, TypeScript
- **Styling:** Tailwind CSS (via CDN)
- **Data Processing:** SheetJS (xlsx) (via CDN)
- **Persistence:** IndexedDB (Browser Local Storage)
- **File System:** File System Access API (for direct local Excel updates)
- **Icons:** Lucide React

---

## 2. File Structure & Architecture

The application assumes a flat structure in the source directory but logically organizes components and services.

```
/
├── index.html              # Entry point, imports libraries (Tailwind, XLSX)
├── index.tsx               # React Root mounting
├── App.tsx                 # Main Layout & State Container
├── types.ts                # TypeScript Interfaces & Data Models
├── metadata.json           # Project metadata & permissions
├── components/
│   ├── Sidebar.tsx         # Left navigation menu
│   ├── SearchPanel.tsx     # Main module: Search & Update Held Merchants
│   ├── FileUpload.tsx      # Data ingestion module
│   ├── FlaggedMerchants.tsx# Flagging, Analytics, & Export module
│   ├── AddManualEntry.tsx  # Manual data entry forms
│   └── AdminDashboard.tsx  # Configuration & File Linking
└── services/
    ├── excelService.ts     # Excel parsing, formatting, mapping, file writing logic
    └── storageService.ts   # IndexedDB wrapper for persistence
```

---

## 3. Data Models (`types.ts`)

### `MerchantRecord`
A flexible key-value object representing a row from an Excel sheet.
```typescript
interface MerchantRecord {
  [key: string]: string | number | boolean | null;
  // Special keys:
  // __sourceFile: string (added during parsing)
  // _flaggedAt: string (added when flagging)
}
```

### `ParsedDatabase`
Represents a loaded Excel file.
```typescript
interface ParsedDatabase {
  fileName: string;
  rowCount: number;
  data: MerchantRecord[];
  columns: string[];
}
```

### `UserProfile`
Stores user preferences and configuration.
```typescript
interface UserProfile {
  id: string;
  name: string;
  defaultHeldBy: string;
  defaultPosEcom: string;
  mappings: Record<string, Record<string, string>>; // Maps standard fields to specific CSV headers
  customOptions: Record<string, string[]>; // Custom dropdown lists
}
```

---

## 4. Core Modules & Functionality

### A. Data Ingestion (`components/FileUpload.tsx` & `services/excelService.ts`)
- **Functionality:**
  - Drag-and-drop Excel file upload (.xlsx, .xls).
  - Fetch Excel file from a URL.
- **Process:**
  1.  `parseExcelFile` reads the file as an ArrayBuffer.
  2.  Uses `XLSX.read` to parse the workbook.
  3.  Identifies the header row (intelligent scan of first 20 rows looking for keywords like 'mid', 'status').
  4.  Converts sheet to JSON.
  5.  Persists data to IndexedDB via `saveDatabase`.

### B. Search Held Merchant (`components/SearchPanel.tsx`)
**Primary View for updating merchant data.**
- **Exclusive Filtering:**
  - Search is strictly limited to databases containing the word "hold" (case-insensitive) in their filename.
- **Features:**
  - **Autocomplete:** Smart suggestions for Merchant ID (MID) and Name.
  - **Column Mapping:**
    - Auto-detects columns based on fuzzy matching (e.g., maps "Merchant ID" to "mid", "merch_id", etc.).
    - Allows manual re-mapping via a "Map Columns" overlay.
  - **Form:** Displays ~20 fields organized into "Status & Classification" and "Release & Financial Details".
  - **Data Safety:** If a searched MID is not found in a Hold sheet, form fields are cleared to prevent cross-contamination.
  - **Update in Excel:**
    - Connects to `updateRowInMasterSheet` service.
    - Edits the *actual* local Excel file on the user's disk if linked via Admin.

### C. Flagged Merchants (`components/FlaggedMerchants.tsx`)
**Workflow for flagging suspicious or specific merchants.**
- **Verification:**
  - Users search for a MID across *all* loaded databases.
  - A modal appears showing the merchant details for verification before flagging.
  - Checks for duplicates (shows warning if merchant is already flagged).
- **Views:**
  - **Card View:** Rich detail cards with expandable sections.
  - **List View:** Dense table for quick scanning.
  - **Group View:** Groups records by Channel or Type (POS/ECOM).
  - **Analytics View:** Visualization (Bar charts) of Status distribution and Hold Amounts.
- **Export:** Exports the flagged list to a new Excel file.

### D. Manual Entry (`components/AddManualEntry.tsx`)
**Forms for creating new records.**
- **Two Modes:** "Merchant Hold Entry" and "RM Sheet Entry".
- **Smart Population:**
  - Typing a MID searches existing databases to auto-fill known details (Name, RM, Channel, etc.).
- **Queue System:** Entries are saved to a "virtual" database file in memory/IndexedDB.
- **Bulk Update:** Can append queued entries to the linked Master Excel file.

### E. Admin Dashboard (`components/AdminDashboard.tsx`)
**System Configuration.**
- **Profile Management:** Create/Delete user profiles with default values.
- **Dropdown Management:** Add/Remove options for fields like "Current Status", "Held By", etc.
- **File Linking (Critical):**
  - Uses the **File System Access API**.
  - Allows the user to select a local file (e.g., `C:\Work\Hold_Sheet.xlsx`) and grant "Read/Write" permissions.
  - Stores the file handle in IndexedDB.
  - Used by other modules to write data back to disk.

---

## 5. Services & Utilities

### `excelService.ts`
The brain of the data operations.
- **`normalizeKey(str)`**: Removes special chars/spaces and lowercases strings for fuzzy matching.
- **`getStatusColor(status)`**: Returns Tailwind class strings based on keywords (e.g., 'active' -> green, 'term' -> red).
- **`updateRowInMasterSheet`**:
  - Requires a file handle (from Admin).
  - Reads the file -> finds the row by MID -> updates specific cells based on the form data -> writes back to disk.
- **`updateMasterSheet`**:
  - Appends new rows to the end of a sheet (used for Manual Entry).

### `storageService.ts`
Handles persistent storage using IndexedDB.
- **Stores:**
  - `current_list`: The loaded Excel databases.
  - `user_profiles`: User configurations.
  - `flagged_merchants`: List of flagged items.
  - `file_handles`: Stores the references to local files for the File System Access API.

---

## 6. UI/UX Design System

- **Font:** Gotham (via CDN) or Sans-serif fallback.
- **Color Palette:**
  - **Brand Blue (Network Blue):** `#0066cc` (Primary actions, active states).
  - **Backgrounds:** Slate-50 `#f8fafc` for app background, White `#ffffff` for panels.
  - **Text:** Slate-800 `#1e293b` (Primary), Slate-500 `#64748b` (Secondary).
  - **Status Colors:**
    - Active: Emerald
    - Hold: Amber
    - Terminated: Rose
    - Settlement Hold: Purple
- **Components:**
  - Rounded corners (`rounded-xl` for cards, `rounded-lg` for inputs).
  - Shadows (`shadow-sm` generally, `shadow-lg` for active elements/modals).
  - Transitions (`transition-all duration-200`) on buttons and interactions.

---

## 7. Key Workflows Implementation Details

### The "Search Held Merchant" Logic
1. User types in "Search Held Merchant".
2. App filters loaded databases: `databases.filter(d => d.fileName.toLowerCase().includes('hold'))`.
3. Autosuggestions are populated *only* from these filtered DBs.
4. User selects a suggestion.
5. App finds the record in `databases`.
6. App maps record keys to form fields using `FIELD_MAPPINGS` (e.g., maps 'merch_id' column to 'Merchant ID' field).
7. User edits data and clicks "Update in Excel".
8. App retrieves `HOLD` file handle from IndexedDB.
9. App modifies the file on disk.

### The File Linking Logic
1. User goes to Admin Dashboard.
2. Clicks "Link Hold File".
3. Browser invokes `window.showOpenFilePicker()`.
4. User selects file.
5. Handle is stored in IndexedDB (`file_handles` store).
6. **Note:** This requires a secure context (HTTPS or localhost) and cannot run inside sandboxed iframes without specific permissions.

---

## 8. Dependencies
- **React:** UI Framework.
- **Lucide React:** Iconography.
- **XLSX (SheetJS):** Excel processing (loaded via `<script>` tag in `index.html` to reduce bundle size/complexity for this specific build).
- **Tailwind CSS:** Styling (loaded via `<script>` CDN for instant prototyping/no-build setup).
