import { storage } from '../storage';
import { CsvData, PromptConfig } from '@shared/schema';
import { LLMService } from './llm-service';
import { CsvService } from './csv-service';

export class PromptService {
  /**
   * Validate a prompt template against available headers
   * @param promptTemplate The template to validate
   * @param availableHeaders The headers available in the CSV
   * @returns Whether the template is valid
   */
  static validatePromptTemplate(promptTemplate: string, availableHeaders: string[]): boolean {
    if (!promptTemplate.trim()) {
      return false;
    }
    
    // Extract all {{column_name}} patterns
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = placeholderRegex.exec(promptTemplate)) !== null) {
      const columnName = match[1].trim();
      
      // Check if the column name exists in available headers
      if (!availableHeaders.includes(columnName)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate an output column name
   * @param name The output column name to validate
   * @param existingHeaders The existing CSV headers
   * @param otherOutputNames Other output column names in the same batch
   * @returns Whether the name is valid
   */
  static validateOutputColumnName(
    name: string,
    existingHeaders: string[],
    otherOutputNames: string[]
  ): boolean {
    // Check if name is empty or only whitespace
    if (!name.trim()) {
      return false;
    }
    
    // Check if name conflicts with existing CSV headers
    if (existingHeaders.includes(name)) {
      return false;
    }
    
    // Check if name duplicates another output column name
    if (otherOutputNames.includes(name)) {
      return false;
    }
    
    // Check for invalid characters (simplified check)
    if (name.includes(',') || name.includes('"') || name.includes('\n')) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Preview prompts on a subset of rows
   * @param csvFileId The CSV file ID
   * @param promptTemplates Array of prompt templates
   * @param outputColumnNames Array of output column names
   * @param numRows Number of rows to preview
   * @returns The enriched preview rows
   */
  static async previewPrompts(
    csvFileId: number,
    promptTemplates: string[],
    outputColumnNames: string[],
    numRows = 3
  ): Promise<Record<string, any>[]> {
    // Get the CSV data
    const csvData = await storage.getCsvData(csvFileId);
    
    if (!csvData) {
      throw new Error("CSV data not found");
    }
    
    // Log preview request
    await storage.addConsoleMessage(csvFileId, {
      type: 'info',
      message: `Preview requested. Processing first ${numRows} rows...`,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Extract the first N rows for preview
      const previewRows = csvData.rows.slice(0, numRows);
      
      // Process the preview rows with the LLM
      const enrichedRows = await LLMService.processRows(
        previewRows,
        promptTemplates,
        outputColumnNames,
        csvFileId
      );
      
      // Automatically save the preview data to the enriched folder
      const { filePath } = await CsvService.generateEnrichedCsv(
        csvFileId,
        enrichedRows
      );
      
      // Log completion
      await storage.addConsoleMessage(csvFileId, {
        type: 'success',
        message: `Preview generated successfully. Preview CSV saved to ${filePath}`,
        timestamp: new Date().toISOString()
      });
      
      return enrichedRows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      await storage.addConsoleMessage(csvFileId, {
        type: 'error',
        message: `Preview generation failed: ${errorMessage}`,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Process all rows in a CSV file with the configured prompts
   * @param csvFileId The CSV file ID
   * @param promptConfigIds Array of prompt configuration IDs
   * @returns The enriched rows
   */
  static async processFile(csvFileId: number, promptConfigIds: number[]): Promise<Record<string, any>[]> {
    // Get the CSV data
    const csvData = await storage.getCsvData(csvFileId);
    
    if (!csvData) {
      throw new Error("CSV data not found");
    }
    
    // Get the prompt configurations
    const allPromptConfigs = await storage.getPromptConfigsByCsvFileId(csvFileId);
    const promptConfigs = allPromptConfigs.filter(config => 
      promptConfigIds.includes(config.id)
    );
    
    if (promptConfigs.length === 0) {
      throw new Error("No prompt configurations found");
    }
    
    // Extract templates and output column names
    const promptTemplates = promptConfigs.map(config => config.promptTemplate);
    const outputColumnNames = promptConfigs.map(config => config.outputColumnName);
    
    // Log start of processing
    await storage.addConsoleMessage(csvFileId, {
      type: 'info',
      message: 'Starting processing...',
      timestamp: new Date().toISOString()
    });
    
    try {
      // Process all rows with the LLM service
      const enrichedRows = await LLMService.processRows(
        csvData.rows,
        promptTemplates,
        outputColumnNames,
        csvFileId
      );
      
      // Automatically save the enriched CSV file
      const { filePath } = await CsvService.generateEnrichedCsv(
        csvFileId,
        enrichedRows
      );
      
      // Log completion
      await storage.addConsoleMessage(csvFileId, {
        type: 'success',
        message: `Processing completed successfully! All rows processed. Enriched CSV saved to ${filePath}`,
        timestamp: new Date().toISOString()
      });
      
      return enrichedRows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error
      await storage.addConsoleMessage(csvFileId, {
        type: 'error',
        message: `Processing failed: ${errorMessage}`,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Get autocomplete suggestions for column names
   * @param partialInput The partial input (after "{{"")
   * @param availableHeaders The available column headers
   * @returns Matching column names
   */
  static getAutocompleteSuggestions(partialInput: string, availableHeaders: string[]): string[] {
    // Delegate to LLMService for consistency with our tests
    return LLMService.getAutocompleteSuggestions(partialInput, availableHeaders);
  }
}
