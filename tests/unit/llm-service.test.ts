import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMService } from '../../server/services/llm-service';
import { storage } from '../../server/storage';

// Mock the storage and fetch functions
vi.mock('../../server/storage', () => ({
  storage: {
    addConsoleMessage: vi.fn().mockResolvedValue({}),
    getProcessingStatus: vi.fn(),
    updateProcessingStatus: vi.fn(),
  }
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('LLMService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('PERPLEXITY_API_KEY', 'mock-api-key');
  });

  describe('query', () => {
    it('should make API call to Perplexity and return response', async () => {
      // Arrange
      const prompt = 'Analyze the sentiment of this text: "I love this product!"';
      const csvFileId = 1;
      
      // Mock fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Positive sentiment'
              }
            }
          ]
        })
      });

      // Act
      const result = await LLMService.query(prompt, csvFileId);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.perplexity.ai/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
      expect(result).toBe('Positive sentiment');
      expect(storage.addConsoleMessage).toHaveBeenCalledWith(
        csvFileId,
        expect.objectContaining({
          type: "info",
          message: expect.stringContaining("Prompt sent to Perplexity API")
        })
      );
    });

    it('should handle API errors and throw with descriptive message', async () => {
      // Arrange
      const prompt = 'Invalid prompt';
      const csvFileId = 1;
      
      // Mock fetch response with error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid input' })
      });

      // Act & Assert
      await expect(LLMService.query(prompt, csvFileId))
        .rejects.toThrow(/failed.*400.*bad request/i);
      
      expect(storage.addConsoleMessage).toHaveBeenCalledWith(
        csvFileId,
        expect.objectContaining({
          type: "error"
        })
      );
    });
  });

  describe('processRows', () => {
    it('should process multiple rows with the specified prompt templates', async () => {
      // Arrange
      const rows = [
        { name: 'John', age: '30', bio: 'Software engineer who loves coding' },
        { name: 'Jane', age: '25', bio: 'Marketing specialist with creative skills' }
      ];
      const promptTemplates = [
        'Analyze the career of {{name}} who is {{age}} years old with bio: {{bio}}',
        'Identify key skills for {{name}} based on: {{bio}}'
      ];
      const outputColumnNames = ['career_analysis', 'skills'];
      const csvFileId = 1;

      // Mock LLMService.query to return predetermined responses
      vi.spyOn(LLMService, 'query')
        .mockResolvedValueOnce('Would succeed as a senior developer')
        .mockResolvedValueOnce('Coding, problem-solving, analytical thinking')
        .mockResolvedValueOnce('Would do well in creative marketing')
        .mockResolvedValueOnce('Creativity, communication, marketing');

      // Mock storage.getProcessingStatus to return initial status
      vi.mocked(storage.getProcessingStatus).mockResolvedValue({
        status: 'processing',
        progress: 0,
        processedRows: 0,
        totalRows: 2
      });

      // Act
      const result = await LLMService.processRows(rows, promptTemplates, outputColumnNames, csvFileId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'John',
        age: '30',
        bio: 'Software engineer who loves coding',
        career_analysis: 'Would succeed as a senior developer',
        skills: 'Coding, problem-solving, analytical thinking'
      });
      expect(result[1]).toEqual({
        name: 'Jane',
        age: '25',
        bio: 'Marketing specialist with creative skills',
        career_analysis: 'Would do well in creative marketing',
        skills: 'Creativity, communication, marketing'
      });
      
      // Check that LLMService.query was called with the correct prompts
      expect(LLMService.query).toHaveBeenCalledTimes(4);
      expect(LLMService.query).toHaveBeenCalledWith(
        'Analyze the career of John who is 30 years old with bio: Software engineer who loves coding',
        csvFileId
      );
      
      // Check that processing status was updated
      expect(storage.updateProcessingStatus).toHaveBeenCalledTimes(4); // Initial, two progress updates, and complete
    });

    it('should handle errors during row processing', async () => {
      // Arrange
      const rows = [
        { name: 'John', age: '30', bio: 'Software engineer' },
        { name: 'Jane', age: '25', bio: 'Marketing specialist' }
      ];
      const promptTemplates = ['Generate career advice for {{name}}'];
      const outputColumnNames = ['career_advice'];
      const csvFileId = 1;

      // First query succeeds, second fails
      vi.spyOn(LLMService, 'query')
        .mockResolvedValueOnce('Great career ahead')
        .mockRejectedValueOnce(new Error('API rate limit exceeded'));

      // Mock storage.getProcessingStatus
      vi.mocked(storage.getProcessingStatus).mockResolvedValue({
        status: 'processing',
        progress: 0,
        processedRows: 0,
        totalRows: 2
      });

      // Act & Assert
      await expect(LLMService.processRows(rows, promptTemplates, outputColumnNames, csvFileId))
        .rejects.toThrow('API rate limit exceeded');
      
      // Check error was logged
      expect(storage.addConsoleMessage).toHaveBeenCalledWith(
        csvFileId,
        expect.objectContaining({
          type: "error",
          message: expect.stringContaining("API rate limit exceeded")
        })
      );
      
      // Check status was updated to error
      expect(storage.updateProcessingStatus).toHaveBeenCalledWith(
        csvFileId,
        expect.objectContaining({
          status: 'error'
        })
      );
    });
  });

  describe('fillPromptTemplate', () => {
    it('should replace placeholders with values from the row', () => {
      // Arrange
      const template = 'Analyze the sentiment of "{{text}}" written by {{author}} on {{date}}';
      const row = {
        text: 'I love this product!',
        author: 'John Doe',
        date: '2023-05-15'
      };

      // Act
      const result = LLMService.fillPromptTemplate(template, row);

      // Assert
      expect(result).toBe('Analyze the sentiment of "I love this product!" written by John Doe on 2023-05-15');
    });

    it('should handle missing placeholders without error', () => {
      // Arrange
      const template = 'Analyze {{text}} by {{author}}';
      const row = {
        text: 'Sample text',
        // author is missing
      };

      // Act
      const result = LLMService.fillPromptTemplate(template, row);

      // Assert
      expect(result).toBe('Analyze Sample text by ');
    });
  });

  describe('getAutocompleteSuggestions', () => {
    it('should return matching column names for a partial input', () => {
      // Arrange
      const partialInput = 'na';
      const availableHeaders = ['name', 'nationality', 'age', 'email'];

      // Act
      const result = LLMService.getAutocompleteSuggestions(partialInput, availableHeaders);

      // Assert
      expect(result).toEqual(['name', 'nationality']);
    });

    it('should return all headers when partial input is empty', () => {
      // Arrange
      const partialInput = '';
      const availableHeaders = ['name', 'age', 'email'];

      // Act
      const result = LLMService.getAutocompleteSuggestions(partialInput, availableHeaders);

      // Assert
      expect(result).toEqual(['name', 'age', 'email']);
    });

    it('should return empty array when no matches found', () => {
      // Arrange
      const partialInput = 'xyz';
      const availableHeaders = ['name', 'age', 'email'];

      // Act
      const result = LLMService.getAutocompleteSuggestions(partialInput, availableHeaders);

      // Assert
      expect(result).toEqual([]);
    });
  });
});