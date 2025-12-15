
export interface MerchantRecord {
  [key: string]: string | number | boolean | null;
}

export interface SearchState {
  mid: string;
  merchantName: string;
}

export interface ParsedDatabase {
  fileName: string;
  rowCount: number;
  data: MerchantRecord[];
  columns: string[];
}

export enum MatchStatus {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  FOUND = 'FOUND',
  NOT_FOUND = 'NOT_FOUND',
}

export interface UserProfile {
  id: string;
  name: string;
  defaultHeldBy: string;
  defaultPosEcom: string;
  masterFilename?: string; // Configuration for the single export file
  // Mappings keyed by filename to allow different mappings per file
  mappings: Record<string, Record<string, string>>; 
  customOptions: Record<string, string[]>;
}