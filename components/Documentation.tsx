import React from 'react';
import { Book, Layout, Code, Database, Shield, FileText, Server, Workflow } from 'lucide-react';

export const Documentation: React.FC = () => {
  return (
    <div className="flex-1 h-full bg-slate-50 overflow-hidden flex flex-col font-sans">
       {/* Header */}
       <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Book size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">System Documentation</h1>
        </div>
        <p className="text-slate-500 text-sm max-w-2xl">
            Comprehensive blueprint of the FRMU Dashboard architecture, data models, and workflows.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            
            {/* 1. Overview */}
            <section className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Layout className="text-brand-600" size={20}/> 1. Project Overview
                </h2>
                <div className="prose prose-sm text-slate-600 max-w-none">
                    <p className="mb-4">
                        <strong>Purpose:</strong> A specialized web application designed to automate the management, searching, flagging, and updating of Merchant data (specifically "Held" merchants) and Relationship Manager (RM) details.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wide">Tech Stack</h3>
                            <ul className="list-disc pl-5 space-y-1 text-xs font-mono">
                                <li>React 19, TypeScript</li>
                                <li>Tailwind CSS (via CDN)</li>
                                <li>SheetJS / XLSX (via CDN)</li>
                                <li>IndexedDB (Local Storage)</li>
                                <li>File System Access API (Local Disk Write)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. File Structure */}
             <section className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Code className="text-brand-600" size={20}/> 2. File Structure & Architecture
                </h2>
                <div className="bg-slate-900 text-slate-50 p-6 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed shadow-inner">
{`/
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
│   ├── AdminDashboard.tsx  # Configuration & File Linking
│   └── Documentation.tsx   # System Blueprint (This Page)
└── services/
    ├── excelService.ts     # Excel parsing, formatting, mapping, file writing logic
    └── storageService.ts   # IndexedDB wrapper for persistence`}
                </div>
            </section>

            {/* 3. Core Modules */}
            <section className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Database className="text-brand-600" size={20}/> 3. Core Modules & Functionality
                </h2>
                
                <div className="space-y-8">
                    {/* Search Panel */}
                    <div>
                        <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <span className="bg-brand-100 text-brand-700 p-1 rounded">A</span> Search Held Merchant (SearchPanel.tsx)
                        </h3>
                        <p className="text-slate-600 text-sm mb-3">
                            The primary view for updating merchant data. It enforces strict data safety rules.
                        </p>
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-sm space-y-2">
                            <ul className="list-disc pl-5 text-slate-600 space-y-1">
                                <li><strong>Exclusive Filtering:</strong> Search is strictly limited to databases containing the word "hold" (case-insensitive) in their filename.</li>
                                <li><strong>Safety Mechanism:</strong> If a searched MID is not found in a Hold sheet, form fields are automatically cleared to prevent cross-contamination.</li>
                                <li><strong>Direct Excel Update:</strong> Connects to the <code>updateRowInMasterSheet</code> service to modify local files on disk.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Admin Dashboard */}
                    <div className="border-t border-slate-100 pt-6">
                        <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <span className="bg-brand-100 text-brand-700 p-1 rounded">B</span> Admin Dashboard (AdminDashboard.tsx)
                        </h3>
                        <p className="text-slate-600 text-sm mb-3">
                            Handles system configuration and critical file linking for the "Update in Excel" features.
                        </p>
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-sm space-y-2">
                            <ul className="list-disc pl-5 text-slate-600 space-y-1">
                                <li><strong>File Linking:</strong> Uses the <code>File System Access API</code> (window.showOpenFilePicker) to grant the app Read/Write access to a specific local file.</li>
                                <li><strong>Persistence:</strong> File handles are stored in IndexedDB, allowing the browser to remember permissions (mostly) between sessions.</li>
                                <li><strong>Security:</strong> This feature requires a secure context (HTTPS/Localhost) and user gestures.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Flagged Merchants */}
                    <div className="border-t border-slate-100 pt-6">
                         <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <span className="bg-brand-100 text-brand-700 p-1 rounded">C</span> Flagged Merchants (FlaggedMerchants.tsx)
                        </h3>
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-sm space-y-2">
                            <ul className="list-disc pl-5 text-slate-600 space-y-1">
                                <li><strong>Global Search:</strong> Unlike the Search Panel, this module searches <em>all</em> loaded databases to identify merchants.</li>
                                <li><strong>Verification Modal:</strong> Displays a detailed preview of the merchant record before flagging to ensure accuracy.</li>
                                <li><strong>Duplicate Detection:</strong> Warns the user if the merchant has already been flagged.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

             {/* 4. Services */}
             <section className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Server className="text-brand-600" size={20}/> 4. Services & Utilities
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-bold text-slate-800 mb-2 text-sm">excelService.ts</h3>
                        <p className="text-xs text-slate-500 mb-2">The brain of data operations.</p>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                            <li><strong>normalizeKey(str):</strong> Removes special chars/spaces for fuzzy matching.</li>
                            <li><strong>getStatusColor(status):</strong> Returns Tailwind classes based on keywords.</li>
                            <li><strong>updateRowInMasterSheet:</strong> Reads local file -> finds row by MID -> updates cells -> writes back to disk.</li>
                        </ul>
                    </div>
                    <div className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-bold text-slate-800 mb-2 text-sm">storageService.ts</h3>
                        <p className="text-xs text-slate-500 mb-2">IndexedDB wrapper.</p>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                            <li>Stores loaded Excel data (current_list).</li>
                            <li>Stores User Profiles.</li>
                            <li>Stores File Handles for FS Access API.</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* 5. Workflow */}
            <section className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Workflow className="text-brand-600" size={20}/> 5. Key Workflows
                </h2>
                
                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide mb-3">The "Search Held Merchant" Logic</h3>
                        <ol className="list-decimal pl-5 text-sm text-slate-600 space-y-2">
                            <li>User types in "Search Held Merchant".</li>
                            <li>App filters loaded databases: <code>databases.filter(d =&gt; d.fileName.includes('hold'))</code>.</li>
                            <li>Autosuggestions are populated <strong>only</strong> from these filtered DBs.</li>
                            <li>User selects a suggestion.</li>
                            <li>App finds the record in databases and maps keys using `FIELD_MAPPINGS`.</li>
                            <li>User edits data and clicks "Update in Excel".</li>
                            <li>App retrieves the `HOLD` file handle from IndexedDB and modifies the file on disk.</li>
                        </ol>
                    </div>
                </div>
            </section>

        </div>
      </div>
    </div>
  );
};