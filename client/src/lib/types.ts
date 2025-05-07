// CSV file type
export interface CsvFile {
  id: number;
  filename: string;
  headers: string[];
  rowCount: number;
  size?: number;
}

// Prompt configuration type
export interface PromptConfigType {
  id?: number;
  promptTemplate: string;
  outputColumnName: string;
}

// Processing status type
export type ProcessingStatus = "idle" | "processing" | "paused" | "completed" | "error";

// Console message type
export interface ConsoleMessage {
  id: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
}

// Preview data type
export interface PreviewResult {
  previewData: Record<string, any>[];
}
