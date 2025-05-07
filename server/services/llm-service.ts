import axios from 'axios';
import { ConsoleMessage } from '@shared/schema';
import { storage } from '../storage';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

export class LLMService {
  private static API_KEY = process.env.PERPLEXITY_API_KEY || '';
  private static MODEL = 'llama-3.1-sonar-small-128k-online';
  
  /**
   * Send a query to the Perplexity LLM
   * @param prompt The prompt to send to the LLM
   * @param csvFileId The CSV file ID for console logging
   * @returns The LLM response
   */
  static async query(prompt: string, csvFileId: number): Promise<string> {
    // Log the prompt to the console
    await storage.addConsoleMessage(csvFileId, {
      type: 'info',
      message: `Prompt sent to Perplexity API: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Prepare messages for the LLM API
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: 'Be precise and concise.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];
      
      // Make request to Perplexity API
      const response = await fetch(
        'https://api.perplexity.ai/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.MODEL,
            messages,
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 1000,
            stream: false,
            frequency_penalty: 1
          })
        }
      );
      
      if (!response.ok) {
        const statusText = response.statusText;
        const status = response.status;
        let errorData = '';
        
        try {
          errorData = JSON.stringify(await response.json());
        } catch (e) {
          // Ignore JSON parse errors
        }
        
        throw new Error(`API request failed with status ${status} ${statusText}. ${errorData}`);
      }
      
      // Extract response content
      const result = await response.json();
      const responseContent = result.choices[0]?.message?.content || '';
      
      // Log the response to the console
      await storage.addConsoleMessage(csvFileId, {
        type: 'success',
        message: `Received response: ${responseContent.substring(0, 100)}${responseContent.length > 100 ? '...' : ''}`,
        timestamp: new Date().toISOString()
      });
      
      return responseContent;
    } catch (error) {
      let errorMessage = 'Unknown error occurred while querying LLM';
      
      if (error instanceof Error) {
        errorMessage = `LLM error: ${error.message}`;
      }
      
      // Log the error to the console
      await storage.addConsoleMessage(csvFileId, {
        type: 'error',
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Process a batch of rows with configured prompts
   * @param rows The rows to process
   * @param promptTemplates The prompt templates to use
   * @param outputColumnNames The names for the output columns
   * @param csvFileId The CSV file ID for console logging
   * @returns The rows with LLM-generated columns added
   */
  static async processRows(
    rows: Record<string, any>[],
    promptTemplates: string[],
    outputColumnNames: string[],
    csvFileId: number
  ): Promise<Record<string, any>[]> {
    const enrichedRows: Record<string, any>[] = [];
    const totalRows = rows.length;
    let processedRows = 0;
    let errorCount = 0;
    let noResponseCount = 0;
    
    // Get initial processing status
    const status = await storage.getProcessingStatus(csvFileId);
    
    // Update status to start processing
    await storage.updateProcessingStatus(csvFileId, {
      ...status,
      status: 'processing',
      processedRows: 0,
      totalRows
    });
    
    try {
      for (const row of rows) {
        // Before processing each row, check current status for pause/stop requests
        const currentStatus = await storage.getProcessingStatus(csvFileId);
        
        // If processing was paused or stopped by the user, respect that
        if (currentStatus.status === 'paused') {
          await storage.addConsoleMessage(csvFileId, {
            type: 'info',
            message: 'Processing paused by user.',
            timestamp: new Date().toISOString()
          });
          
          // Return the rows processed so far
          return enrichedRows;
        }
        
        if (currentStatus.status === 'idle' || currentStatus.status === 'error') {
          await storage.addConsoleMessage(csvFileId, {
            type: 'info',
            message: 'Processing stopped by user or due to an error.',
            timestamp: new Date().toISOString()
          });
          
          // Return the rows processed so far
          return enrichedRows;
        }
        
        const enrichedRow = { ...row };
        
        for (let i = 0; i < promptTemplates.length; i++) {
          const template = promptTemplates[i];
          const outputName = outputColumnNames[i];
          
          try {
            // Generate the actual prompt by replacing placeholders with values
            const filledPrompt = this.fillPromptTemplate(template, row);
            
            // Query the LLM and get the response
            const response = await this.query(filledPrompt, csvFileId);
            
            // Add the response to the row
            enrichedRow[outputName] = response;
          } catch (error) {
            // Check for auth/API key errors which should halt processing
            if (error instanceof Error && 
                (error.message.includes('401 Unauthorized') || 
                 error.message.includes('Invalid API key'))) {
              
              await storage.addConsoleMessage(csvFileId, {
                type: 'error',
                message: 'Critical Error: Perplexity API Key is invalid or revoked. Processing halted.',
                timestamp: new Date().toISOString()
              });
              
              // Update status to error
              await storage.updateProcessingStatus(csvFileId, {
                ...status,
                status: 'error',
                progress: Math.round((processedRows / totalRows) * 100),
                processedRows,
                totalRows,
                error: 'API key is invalid or has been revoked'
              });
              
              throw new Error('API request failed with status 401 Unauthorized. {"error": "Invalid API key"}');
            }
            
            // Check for rate limit errors which should pause processing
            if (error instanceof Error && error.message.includes('API rate limit')) {
              await storage.addConsoleMessage(csvFileId, {
                type: 'warning',
                message: 'Rate limit hit. Pausing processing.',
                timestamp: new Date().toISOString()
              });
              
              // Update status to paused
              await storage.updateProcessingStatus(csvFileId, {
                ...status,
                status: 'paused',
                progress: Math.round((processedRows / totalRows) * 100),
                processedRows,
                totalRows
              });
              
              return enrichedRows;
            }
            
            // If an error occurs for a specific prompt, log it and continue
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // Determine if it's a no-response error or a different API error
            if (errorMessage.includes('No response') || errorMessage.includes('timeout')) {
              noResponseCount++;
              
              await storage.addConsoleMessage(csvFileId, {
                type: 'warning',
                message: `Warning: No response for row ${processedRows + 1}, query ${i + 1}. Moving to next.`,
                timestamp: new Date().toISOString()
              });
              
              // Mark as NO_RESPONSE in the output
              enrichedRow[outputName] = 'NO_RESPONSE';
            } else {
              errorCount++;
              
              await storage.addConsoleMessage(csvFileId, {
                type: 'error',
                message: `Error: LLM API error for row ${processedRows + 1}, query ${i + 1}. Details: ${errorMessage}. Moving to next.`,
                timestamp: new Date().toISOString()
              });
              
              // Mark as API_ERROR in the output
              enrichedRow[outputName] = 'API_ERROR';
            }
          }
        }
        
        enrichedRows.push(enrichedRow);
        processedRows++;
        
        // Update progress
        await storage.updateProcessingStatus(csvFileId, {
          ...status,
          status: 'processing',
          progress: Math.round((processedRows / totalRows) * 100),
          processedRows,
          totalRows
        });
      }
      
      // Construct completion message with error/no-response counts
      let completionMessage = `Processing complete. ${processedRows} rows processed.`;
      
      if (errorCount > 0 || noResponseCount > 0) {
        completionMessage += ` (${errorCount > 0 ? `${errorCount} with LLM error` : ''}${
          errorCount > 0 && noResponseCount > 0 ? ', ' : ''
        }${noResponseCount > 0 ? `${noResponseCount} with no LLM response` : ''})`;
      }
      
      // Log completion
      await storage.addConsoleMessage(csvFileId, {
        type: 'success',
        message: completionMessage,
        timestamp: new Date().toISOString()
      });
      
      // Update status to completed
      await storage.updateProcessingStatus(csvFileId, {
        ...status,
        status: 'completed',
        progress: 100,
        processedRows: totalRows,
        totalRows
      });
      
      return enrichedRows;
    } catch (error) {
      // Handle critical errors that prevent further processing
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await storage.addConsoleMessage(csvFileId, {
        type: 'error',
        message: `Processing failed: ${errorMessage}`,
        timestamp: new Date().toISOString()
      });
      
      // Update status to error
      await storage.updateProcessingStatus(csvFileId, {
        ...status,
        status: 'error',
        progress: Math.round((processedRows / totalRows) * 100),
        processedRows,
        totalRows,
        error: errorMessage
      });
      
      throw error;
    }
  }
  
  /**
   * Fill a prompt template with values from a row
   * @param template The prompt template with {{column_name}} placeholders
   * @param row The row with values to inject
   * @returns The filled prompt
   */
  static fillPromptTemplate(template: string, row: Record<string, any>): string {
    let filledPrompt = template;
    
    // Replace all {{column_name}} instances with the actual values
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    let match;
    
    while ((match = placeholderRegex.exec(template)) !== null) {
      const placeholder = match[0];
      const columnName = match[1].trim();
      
      if (row[columnName] !== undefined) {
        // Replace the placeholder with the actual value
        filledPrompt = filledPrompt.replace(placeholder, String(row[columnName]));
      } else {
        // If the column doesn't exist, replace with an empty string
        filledPrompt = filledPrompt.replace(placeholder, '');
      }
    }
    
    return filledPrompt;
  }
  
  /**
   * Get autocomplete suggestions for column names
   * @param partialInput The partial input (after "{{"")
   * @param availableHeaders The available column headers
   * @returns Matching column names
   */
  static getAutocompleteSuggestions(partialInput: string, availableHeaders: string[]): string[] {
    // If partialInput is empty or undefined, return all headers
    if (!partialInput || partialInput.trim() === '') {
      return [...availableHeaders];
    }
    
    const normalizedInput = partialInput.trim().toLowerCase();
    
    // Start with exact matches (case-insensitive)
    let matches = availableHeaders.filter(header => 
      header.toLowerCase() === normalizedInput
    );
    
    // Then add headers that start with the input
    matches = [...matches, ...availableHeaders.filter(header => 
      header.toLowerCase().startsWith(normalizedInput) && 
      !matches.includes(header)
    )];
    
    // Then add headers that contain the input as a substring
    matches = [...matches, ...availableHeaders.filter(header => 
      header.toLowerCase().includes(normalizedInput) && 
      !matches.includes(header)
    )];
    
    return matches;
  }
}
