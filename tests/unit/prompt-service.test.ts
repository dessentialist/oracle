import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptService } from '../../server/services/prompt-service';
import { LLMService } from '../../server/services/llm-service';
import { storage } from '../../server/storage';

// Mock dependencies
vi.mock('../../server/services/llm-service', () => ({
  LLMService: {
    processRows: vi.fn(),
    fillPromptTemplate: vi.fn(),
    getAutocompleteSuggestions: vi.fn()
  }
}));

vi.mock('../../server/storage', () => ({
  storage: {
    getCsvFile: vi.fn(),
    getCsvData: vi.fn(),
    getPromptConfigsByCsvFileId: vi.fn(),
    addConsoleMessage: vi.fn()
  }
}));

describe('PromptService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('validatePromptTemplate', () => {
    it('should return true for valid prompt templates', () => {
      // Arrange
      const template = 'Analyze the sentiment of {{text}} written by {{author}}';
      const availableHeaders = ['text', 'author', 'date', 'category'];

      // Act
      const result = PromptService.validatePromptTemplate(template, availableHeaders);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if template uses unavailable headers', () => {
      // Arrange
      const template = 'Analyze the sentiment of {{text}} with {{rating}}';
      const availableHeaders = ['text', 'author', 'date'];

      // Act
      const result = PromptService.validatePromptTemplate(template, availableHeaders);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for templates without any placeholders', () => {
      // Arrange
      const template = 'Analyze the sentiment of this text';
      const availableHeaders = ['text', 'author'];

      // Act
      const result = PromptService.validatePromptTemplate(template, availableHeaders);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('validateOutputColumnName', () => {
    it('should return true for valid output column names', () => {
      // Arrange
      const name = 'sentiment_analysis';
      const existingHeaders = ['text', 'author', 'date'];
      const otherOutputNames: string[] = [];

      // Act
      const result = PromptService.validateOutputColumnName(name, existingHeaders, otherOutputNames);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if name conflicts with existing headers', () => {
      // Arrange
      const name = 'text';
      const existingHeaders = ['text', 'author', 'date'];
      const otherOutputNames: string[] = [];

      // Act
      const result = PromptService.validateOutputColumnName(name, existingHeaders, otherOutputNames);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false if name conflicts with other output names', () => {
      // Arrange
      const name = 'sentiment';
      const existingHeaders = ['text', 'author', 'date'];
      const otherOutputNames = ['tone', 'sentiment'];

      // Act
      const result = PromptService.validateOutputColumnName(name, existingHeaders, otherOutputNames);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false if name is empty', () => {
      // Arrange
      const name = '';
      const existingHeaders = ['text', 'author', 'date'];
      const otherOutputNames: string[] = [];

      // Act
      const result = PromptService.validateOutputColumnName(name, existingHeaders, otherOutputNames);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('previewPrompts', () => {
    it('should generate preview data for the specified rows', async () => {
      // Arrange
      const csvFileId = 1;
      const promptTemplates = ['Analyze {{text}}', 'Summarize {{text}}'];
      const outputColumnNames = ['analysis', 'summary'];
      const numRows = 2;

      // Mock data
      const mockRows = [
        { text: 'Sample text 1', author: 'John' },
        { text: 'Sample text 2', author: 'Jane' }
      ];
      const mockEnrichedRows = [
        { text: 'Sample text 1', author: 'John', analysis: 'Analysis 1', summary: 'Summary 1' },
        { text: 'Sample text 2', author: 'Jane', analysis: 'Analysis 2', summary: 'Summary 2' }
      ];

      // Mock dependencies
      vi.mocked(storage.getCsvData).mockResolvedValue({
        headers: ['text', 'author'],
        rows: mockRows
      });
      
      vi.mocked(LLMService.processRows).mockResolvedValue(mockEnrichedRows);

      // Act
      const result = await PromptService.previewPrompts(csvFileId, promptTemplates, outputColumnNames, numRows);

      // Assert
      expect(storage.getCsvData).toHaveBeenCalledWith(csvFileId);
      expect(LLMService.processRows).toHaveBeenCalledWith(
        mockRows.slice(0, numRows),
        promptTemplates,
        outputColumnNames,
        csvFileId
      );
      expect(result).toEqual(mockEnrichedRows);
    });

    it('should throw an error when CSV data is not found', async () => {
      // Arrange
      const csvFileId = 999;
      const promptTemplates = ['Analyze {{text}}'];
      const outputColumnNames = ['analysis'];
      
      // Mock dependencies to return no data
      vi.mocked(storage.getCsvData).mockResolvedValue(undefined);

      // Act & Assert
      await expect(PromptService.previewPrompts(csvFileId, promptTemplates, outputColumnNames, 2))
        .rejects.toThrow('CSV data not found');
    });
  });

  describe('processFile', () => {
    it('should process all rows with the configured prompts', async () => {
      // Arrange
      const csvFileId = 1;
      const promptConfigIds = [1, 2];

      // Mock data
      const mockCsvData = {
        headers: ['text', 'author'],
        rows: [
          { text: 'Sample text 1', author: 'John' },
          { text: 'Sample text 2', author: 'Jane' }
        ]
      };
      
      const mockPromptConfigs = [
        { id: 1, promptTemplate: 'Analyze {{text}}', outputColumnName: 'analysis' },
        { id: 2, promptTemplate: 'Summarize {{text}}', outputColumnName: 'summary' }
      ];
      
      const mockEnrichedRows = [
        { text: 'Sample text 1', author: 'John', analysis: 'Analysis 1', summary: 'Summary 1' },
        { text: 'Sample text 2', author: 'Jane', analysis: 'Analysis 2', summary: 'Summary 2' }
      ];

      // Mock dependencies
      vi.mocked(storage.getCsvData).mockResolvedValue(mockCsvData);
      vi.mocked(storage.getPromptConfigsByCsvFileId).mockResolvedValue(mockPromptConfigs);
      vi.mocked(LLMService.processRows).mockResolvedValue(mockEnrichedRows);

      // Act
      const result = await PromptService.processFile(csvFileId, promptConfigIds);

      // Assert
      expect(storage.getCsvData).toHaveBeenCalledWith(csvFileId);
      expect(storage.getPromptConfigsByCsvFileId).toHaveBeenCalledWith(csvFileId);
      expect(LLMService.processRows).toHaveBeenCalledWith(
        mockCsvData.rows,
        ['Analyze {{text}}', 'Summarize {{text}}'],
        ['analysis', 'summary'],
        csvFileId
      );
      expect(result).toEqual(mockEnrichedRows);
    });

    it('should filter prompt configs by the provided IDs', async () => {
      // Arrange
      const csvFileId = 1;
      const promptConfigIds = [2]; // Only using the second config

      // Mock data
      const mockCsvData = {
        headers: ['text', 'author'],
        rows: [{ text: 'Sample text', author: 'John' }]
      };
      
      const mockPromptConfigs = [
        { id: 1, promptTemplate: 'Analyze {{text}}', outputColumnName: 'analysis' },
        { id: 2, promptTemplate: 'Summarize {{text}}', outputColumnName: 'summary' }
      ];
      
      const mockEnrichedRows = [
        { text: 'Sample text', author: 'John', summary: 'Summary' }
      ];

      // Mock dependencies
      vi.mocked(storage.getCsvData).mockResolvedValue(mockCsvData);
      vi.mocked(storage.getPromptConfigsByCsvFileId).mockResolvedValue(mockPromptConfigs);
      vi.mocked(LLMService.processRows).mockResolvedValue(mockEnrichedRows);

      // Act
      const result = await PromptService.processFile(csvFileId, promptConfigIds);

      // Assert
      expect(LLMService.processRows).toHaveBeenCalledWith(
        mockCsvData.rows,
        ['Summarize {{text}}'], // Only the second template
        ['summary'], // Only the second output column
        csvFileId
      );
      expect(result).toEqual(mockEnrichedRows);
    });

    it('should throw an error when no prompt configs are found', async () => {
      // Arrange
      const csvFileId = 1;
      const promptConfigIds = [1, 2];
      
      // Mock data
      const mockCsvData = {
        headers: ['text', 'author'],
        rows: [{ text: 'Sample text', author: 'John' }]
      };
      
      // Mock dependencies to return no configs
      vi.mocked(storage.getCsvData).mockResolvedValue(mockCsvData);
      vi.mocked(storage.getPromptConfigsByCsvFileId).mockResolvedValue([]);

      // Act & Assert
      await expect(PromptService.processFile(csvFileId, promptConfigIds))
        .rejects.toThrow('No prompt configurations found');
    });
  });

  describe('getAutocompleteSuggestions', () => {
    it('should delegate to LLMService.getAutocompleteSuggestions', () => {
      // Arrange
      const partialInput = 'te';
      const availableHeaders = ['text', 'title', 'author'];
      const expectedSuggestions = ['text', 'title'];
      
      // Mock dependencies
      vi.mocked(LLMService.getAutocompleteSuggestions).mockReturnValue(expectedSuggestions);

      // Act
      const result = PromptService.getAutocompleteSuggestions(partialInput, availableHeaders);

      // Assert
      expect(LLMService.getAutocompleteSuggestions).toHaveBeenCalledWith(partialInput, availableHeaders);
      expect(result).toEqual(expectedSuggestions);
    });
  });
});