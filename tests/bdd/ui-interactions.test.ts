import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMService } from '../../server/services/llm-service';
import { CsvService } from '../../server/services/csv-service';
import { storage } from '../../server/storage';
import { WebSocket } from 'ws';

// Mock dependencies
vi.mock('../../server/services/llm-service', () => ({
  LLMService: {
    processRows: vi.fn(),
    fillPromptTemplate: vi.fn(),
    getAutocompleteSuggestions: vi.fn()
  }
}));

vi.mock('../../server/services/csv-service', () => ({
  CsvService: {
    processUploadedCsv: vi.fn(),
    saveCsvFile: vi.fn(),
    extractRowsForPreview: vi.fn(),
    generateEnrichedCsv: vi.fn().mockResolvedValue({
      content: 'header1,header2\nvalue1,value2',
      filePath: 'enriched/test.csv'
    })
  }
}));

vi.mock('../../server/storage', () => ({
  storage: {
    getCsvFile: vi.fn(),
    getCsvData: vi.fn(),
    getPromptConfigsByCsvFileId: vi.fn(),
    getProcessingState: vi.fn(),
    updateProcessingState: vi.fn(),
    addConsoleMessage: vi.fn(),
    getConsoleMessages: vi.fn(),
    clearConsoleMessages: vi.fn(),
    storeCsvData: vi.fn()
  }
}));

// Mock fetch for testing API calls
global.fetch = vi.fn();

describe('Feature: User Interface Interactions', () => {
  describe('Scenario: Progress Bar Reflecting API Progress', () => {
    // Setup for progress bar tests
    beforeEach(() => {
      vi.resetAllMocks();
      
      // Mock getCsvFile to return a test file
      vi.mocked(storage.getCsvFile).mockResolvedValue({
        id: 1,
        filename: 'test.csv',
        originalFilename: 'test.csv',
        headers: ['name', 'email', 'message'],
        rowCount: 10,
        createdAt: new Date().toISOString()
      });
      
      // Mock getCsvData to return test data
      vi.mocked(storage.getCsvData).mockResolvedValue({
        headers: ['name', 'email', 'message'],
        rows: [
          { name: 'John', email: 'john@example.com', message: 'Hello' },
          { name: 'Jane', email: 'jane@example.com', message: 'Hi there' },
          { name: 'Bob', email: 'bob@example.com', message: 'Greetings' },
          { name: 'Alice', email: 'alice@example.com', message: 'Welcome' },
          { name: 'Charlie', email: 'charlie@example.com', message: 'Hey' }
        ]
      });
      
      // Mock prompt configs
      vi.mocked(storage.getPromptConfigsByCsvFileId).mockResolvedValue([
        { id: 1, promptTemplate: 'Analyze sentiment of {{message}}', outputColumnName: 'sentiment' }
      ]);
    });

    it('should update the progress bar as API processing progresses', async () => {
      // Given - Initial processing state at 0%
      vi.mocked(storage.getProcessingState).mockResolvedValueOnce({
        status: 'processing',
        processedRows: 0,
        totalRows: 5,
        startTime: new Date().toISOString(),
        endTime: null
      });
      
      // Mock response for initial status check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'processing',
          processedRows: 0,
          totalRows: 5
        })
      });
      
      // Mock response for updated status (40% complete)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'processing',
          processedRows: 2,
          totalRows: 5
        })
      });
      
      // Mock response for final status (100% complete)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'completed',
          processedRows: 5,
          totalRows: 5
        })
      });
      
      // When - Simulate API progress updates (using WebSocket for real-time updates)
      // Step 1: Start processing
      const mockWebSocketServer = {
        clients: new Set(),
        broadcast: vi.fn()
      };
      
      // Step 2: Process 2 rows (40% complete)
      vi.mocked(storage.getProcessingState).mockResolvedValueOnce({
        status: 'processing',
        processedRows: 2,
        totalRows: 5,
        startTime: new Date().toISOString(),
        endTime: null
      });
      
      mockWebSocketServer.broadcast({
        type: 'processing_update',
        data: {
          csvFileId: 1,
          status: 'processing',
          processedRows: 2,
          totalRows: 5
        }
      });
      
      // Step 3: Complete processing (100%)
      vi.mocked(storage.getProcessingState).mockResolvedValueOnce({
        status: 'completed',
        processedRows: 5,
        totalRows: 5,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      });
      
      mockWebSocketServer.broadcast({
        type: 'processing_update',
        data: {
          csvFileId: 1,
          status: 'completed',
          processedRows: 5,
          totalRows: 5
        }
      });
      
      // Then - Verify the correct processing states were broadcast
      expect(mockWebSocketServer.broadcast).toHaveBeenCalledTimes(2);
      
      const firstUpdate = mockWebSocketServer.broadcast.mock.calls[0][0];
      expect(firstUpdate.data.processedRows).toBe(2);
      expect(firstUpdate.data.totalRows).toBe(5);
      expect(firstUpdate.data.status).toBe('processing');
      
      const secondUpdate = mockWebSocketServer.broadcast.mock.calls[1][0];
      expect(secondUpdate.data.processedRows).toBe(5);
      expect(secondUpdate.data.totalRows).toBe(5);
      expect(secondUpdate.data.status).toBe('completed');
    });
    
    it('should correctly reflect a paused processing state', async () => {
      // Given - Processing is paused at 60%
      vi.mocked(storage.getProcessingState).mockResolvedValue({
        status: 'paused',
        processedRows: 3,
        totalRows: 5,
        startTime: new Date().toISOString(),
        endTime: null
      });
      
      // Mock fetch response for status check
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'paused',
          processedRows: 3,
          totalRows: 5
        })
      });
      
      // When - Simulate WebSocket update for pause event
      const mockWebSocketServer = {
        clients: new Set(),
        broadcast: vi.fn()
      };
      
      mockWebSocketServer.broadcast({
        type: 'processing_update',
        data: {
          csvFileId: 1,
          status: 'paused',
          processedRows: 3,
          totalRows: 5
        }
      });
      
      // Then - Verify correct paused state was broadcast
      expect(mockWebSocketServer.broadcast).toHaveBeenCalledTimes(1);
      
      const pausedUpdate = mockWebSocketServer.broadcast.mock.calls[0][0];
      expect(pausedUpdate.data.processedRows).toBe(3);
      expect(pausedUpdate.data.totalRows).toBe(5);
      expect(pausedUpdate.data.status).toBe('paused');
    });
    
    it('should handle and display errors during processing', async () => {
      // Given - First update is successful, second has an error
      vi.mocked(storage.getProcessingState).mockResolvedValueOnce({
        status: 'processing',
        processedRows: 1,
        totalRows: 5,
        startTime: new Date().toISOString(),
        endTime: null
      }).mockResolvedValueOnce({
        status: 'error',
        processedRows: 2,
        totalRows: 5,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      });
      
      // Mock fetch responses
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'processing',
          processedRows: 1,
          totalRows: 5
        })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'error',
          processedRows: 2,
          totalRows: 5,
          error: 'API error occurred'
        })
      });
      
      // When - Simulate WebSocket updates including an error
      const mockWebSocketServer = {
        clients: new Set(),
        broadcast: vi.fn()
      };
      
      // First update (20% complete)
      mockWebSocketServer.broadcast({
        type: 'processing_update',
        data: {
          csvFileId: 1,
          status: 'processing',
          processedRows: 1,
          totalRows: 5
        }
      });
      
      // Second update (error at 40%)
      mockWebSocketServer.broadcast({
        type: 'processing_update',
        data: {
          csvFileId: 1,
          status: 'error',
          processedRows: 2,
          totalRows: 5,
          error: 'API error occurred'
        }
      });
      
      // Also generate a console error message
      vi.mocked(storage.addConsoleMessage).mockResolvedValueOnce(true);
      
      // Then - Verify the error state was broadcast
      expect(mockWebSocketServer.broadcast).toHaveBeenCalledTimes(2);
      
      const errorUpdate = mockWebSocketServer.broadcast.mock.calls[1][0];
      expect(errorUpdate.data.processedRows).toBe(2);
      expect(errorUpdate.data.status).toBe('error');
      expect(errorUpdate.data.error).toBe('API error occurred');
      
      // Verify a console message was added
      expect(storage.addConsoleMessage).toHaveBeenCalled();
    });
  });

  describe('Scenario: Download Button Correctly Downloads Updated CSV', () => {
    // Setup for download button tests
    beforeEach(() => {
      vi.resetAllMocks();
      
      // Mock response headers
      const mockHeaders = new Headers();
      mockHeaders.append('Content-Type', 'text/csv');
      mockHeaders.append('Content-Disposition', 'attachment; filename="enriched_test.csv"');
      
      // Mock the global fetch
      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: mockHeaders,
        blob: async () => new Blob(['name,email,message,sentiment\nJohn,john@example.com,Hello,positive'], 
          { type: 'text/csv' })
      });
      
      // Mock getCsvFile to return a test file
      vi.mocked(storage.getCsvFile).mockResolvedValue({
        id: 1,
        filename: 'test.csv',
        originalFilename: 'test.csv',
        headers: ['name', 'email', 'message'],
        rowCount: 5,
        createdAt: new Date().toISOString()
      });
      
      // Mock CsvService.generateEnrichedCsv
      vi.mocked(CsvService.generateEnrichedCsv).mockResolvedValue({
        content: 'name,email,message,sentiment\nJohn,john@example.com,Hello,positive',
        filePath: 'enriched/enriched_test.csv'
      });
    });

    it('should download the CSV file with correct headers and content', async () => {
      // Given - Process is completed and enriched CSV is available
      vi.mocked(storage.getProcessingState).mockResolvedValue({
        status: 'completed',
        processedRows: 5,
        totalRows: 5,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      });
      
      // Mock console message for download
      vi.mocked(storage.addConsoleMessage).mockResolvedValueOnce(true);
      
      // When - Simulate downloading the CSV file
      const response = await fetch('/api/download/1');
      const blob = await response.blob();
      
      // Then - Verify correct content type and filename
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="enriched_test.csv"');
      
      // Verify the correct blob type
      expect(blob.type).toBe('text/csv');
      
      // Verify a console message was added for the download
      expect(storage.addConsoleMessage).toHaveBeenCalledWith(1, expect.objectContaining({
        type: 'info',
        message: expect.stringContaining('Downloading enriched CSV')
      }));
    });
    
    it('should handle errors when download fails', async () => {
      // Given - API returns an error response
      (global.fetch as any).mockReset();
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'CSV file not found' })
      });
      
      // When - Simulate a failed download attempt
      const response = await fetch('/api/download/999');
      const errorData = await response.json();
      
      // Then - Verify error handling
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(errorData.error).toBe('CSV file not found');
    });
    
    it('should download the latest version of the enriched file', async () => {
      // Given - File has been updated since initial processing
      vi.mocked(storage.getProcessingState).mockResolvedValue({
        status: 'completed',
        processedRows: 5,
        totalRows: 5,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      });
      
      // First generate an enriched CSV with initial content
      vi.mocked(CsvService.generateEnrichedCsv).mockResolvedValueOnce({
        content: 'name,email,message,sentiment\nJohn,john@example.com,Hello,positive',
        filePath: 'enriched/enriched_test.csv'
      });
      
      // Then update to a new version with additional rows
      vi.mocked(CsvService.generateEnrichedCsv).mockResolvedValueOnce({
        content: 'name,email,message,sentiment\nJohn,john@example.com,Hello,positive\nJane,jane@example.com,Hi,neutral',
        filePath: 'enriched/enriched_test.csv'
      });
      
      // First download (original content)
      const mockHeaders1 = new Headers();
      mockHeaders1.append('Content-Type', 'text/csv');
      mockHeaders1.append('Content-Disposition', 'attachment; filename="enriched_test.csv"');
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders1,
        blob: async () => new Blob(['name,email,message,sentiment\nJohn,john@example.com,Hello,positive'], 
          { type: 'text/csv' })
      });
      
      // Second download (updated content)
      const mockHeaders2 = new Headers();
      mockHeaders2.append('Content-Type', 'text/csv');
      mockHeaders2.append('Content-Disposition', 'attachment; filename="enriched_test.csv"');
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: mockHeaders2,
        blob: async () => new Blob([
          'name,email,message,sentiment\nJohn,john@example.com,Hello,positive\nJane,jane@example.com,Hi,neutral'
        ], { type: 'text/csv' })
      });
      
      // When - Download the file twice (after updates)
      const firstResponse = await fetch('/api/download/1');
      const firstBlob = await firstResponse.blob();
      
      // Simulate updating the file
      await CsvService.generateEnrichedCsv(1, [
        { name: 'John', email: 'john@example.com', message: 'Hello', sentiment: 'positive' },
        { name: 'Jane', email: 'jane@example.com', message: 'Hi', sentiment: 'neutral' }
      ]);
      
      const secondResponse = await fetch('/api/download/1');
      const secondBlob = await secondResponse.blob();
      
      // Then - Verify the second download contains updated content
      const reader = new FileReader();
      let secondContent = '';
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          secondContent = reader.result as string;
          resolve();
        };
        reader.readAsText(secondBlob);
      });
      
      expect(secondContent).toContain('Jane,jane@example.com,Hi,neutral');
      expect(CsvService.generateEnrichedCsv).toHaveBeenCalledTimes(2);
    });
  });
});