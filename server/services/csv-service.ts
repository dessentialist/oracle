import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { CsvData, CsvFile } from '@shared/schema';
import { storage } from '../storage';

export interface ParsedCsvInfo {
  headers: string[];
  rowCount: number;
  csvData: CsvData;
}

export class CsvService {
  /**
   * Process an uploaded CSV file
   * @param file The uploaded file buffer
   * @param originalFilename The original filename
   * @returns Information about the parsed CSV
   */
  static async processUploadedCsv(file: Buffer, originalFilename: string): Promise<ParsedCsvInfo> {
    try {
      // Parse the CSV content
      const content = file.toString('utf-8');
      const parsedData = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      
      if (parsedData.length === 0) {
        throw new Error("CSV file is empty or contains only a header row");
      }
      
      // Extract headers from the first row
      const headers = Object.keys(parsedData[0]);
      
      if (headers.length === 0) {
        throw new Error("CSV file has no columns");
      }
      
      // Create CSV data object
      const csvData: CsvData = {
        headers,
        rows: parsedData,
      };
      
      return {
        headers,
        rowCount: parsedData.length,
        csvData,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse CSV: ${error.message}`);
      }
      throw new Error('Failed to parse CSV: Unknown error');
    }
  }
  
  /**
   * Save a processed CSV file and store its metadata
   * @param csvInfo The parsed CSV information
   * @param originalFilename The original filename
   * @returns The stored CSV file metadata
   */
  static async saveCsvFile(csvInfo: ParsedCsvInfo, originalFilename: string): Promise<CsvFile> {
    const timestamp = new Date().toISOString();
    const filename = `${path.parse(originalFilename).name}_${Date.now()}.csv`;
    
    // Store CSV file metadata
    const csvFile = await storage.createCsvFile({
      filename,
      originalFilename,
      headers: csvInfo.headers,
      rowCount: csvInfo.rowCount,
      createdAt: timestamp,
    });
    
    // Store the actual CSV data separately
    await storage.storeCsvData(csvFile.id, csvInfo.csvData);
    
    // Log the successful upload
    await storage.addConsoleMessage(csvFile.id, {
      type: "success",
      message: `CSV file '${originalFilename}' loaded successfully. ${csvInfo.rowCount} rows, ${csvInfo.headers.length} columns detected.`,
      timestamp: new Date().toISOString(),
    });
    
    return csvFile;
  }
  
  /**
   * Generate an enriched CSV with LLM responses
   * @param csvFileId The ID of the original CSV file
   * @param enrichedData The rows with added LLM response columns
   * @returns The enriched CSV content as a string
   */
  static async generateEnrichedCsv(csvFileId: number, enrichedData: Record<string, any>[]): Promise<string> {
    // Get original CSV file metadata
    const csvFile = await storage.getCsvFile(csvFileId);
    
    if (!csvFile) {
      throw new Error("CSV file not found");
    }

    // Get original CSV data
    const csvData = await storage.getCsvData(csvFileId);
    
    if (!csvData) {
      throw new Error("CSV data not found");
    }
    
    // Get the prompt configurations to know which columns were added
    const promptConfigs = await storage.getPromptConfigsByCsvFileId(csvFileId);
    
    // Generate CSV string from enriched data
    const csvString = stringify(enrichedData, {
      header: true,
    });
    
    return csvString;
  }
  
  /**
   * Extract a subset of rows for preview
   * @param csvFileId The ID of the CSV file
   * @param numRows Number of rows to extract (default: 3)
   * @returns The extracted rows
   */
  static async extractRowsForPreview(csvFileId: number, numRows = 3): Promise<Record<string, any>[]> {
    const csvData = await storage.getCsvData(csvFileId);
    
    if (!csvData) {
      throw new Error("CSV data not found");
    }
    
    // Extract the first N rows for preview
    return csvData.rows.slice(0, numRows);
  }
}
