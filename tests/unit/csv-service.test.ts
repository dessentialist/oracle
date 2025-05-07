import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsvService } from '../../server/services/csv-service';
import { storage } from '../../server/storage';

// Mock the storage to avoid actual data persistence during tests
vi.mock('../../server/storage', () => ({
  storage: {
    createCsvFile: vi.fn(),
    storeCsvData: vi.fn(),
    getCsvFile: vi.fn(),
    getCsvData: vi.fn(),
    addConsoleMessage: vi.fn(),
    getPromptConfigsByCsvFileId: vi.fn().mockResolvedValue([])
  }
}));

describe('CsvService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('processUploadedCsv', () => {
    it('should parse CSV data correctly', async () => {
      // Arrange
      const csvBuffer = Buffer.from('name,age,city\nJohn,30,New York\nJane,25,San Francisco');
      const filename = 'test.csv';

      // Act
      const result = await CsvService.processUploadedCsv(csvBuffer, filename);

      // Assert
      expect(result).toBeDefined();
      expect(result.headers).toEqual(['name', 'age', 'city']);
      expect(result.rowCount).toBe(2);
      expect(result.csvData.rows).toHaveLength(2);
      expect(result.csvData.rows[0]).toEqual({
        name: 'John',
        age: '30',
        city: 'New York'
      });
      expect(result.csvData.rows[1]).toEqual({
        name: 'Jane',
        age: '25',
        city: 'San Francisco'
      });
    });

    it('should throw an error when CSV is invalid', async () => {
      // Arrange
      const invalidCsvBuffer = Buffer.from('invalid,csv\ndata,missing,column');
      const filename = 'invalid.csv';

      // Act & Assert
      await expect(CsvService.processUploadedCsv(invalidCsvBuffer, filename))
        .rejects.toThrow();
    });
  });

  describe('saveCsvFile', () => {
    it('should save the CSV file metadata to storage', async () => {
      // Arrange
      const csvInfo = {
        headers: ['name', 'age', 'city'],
        rowCount: 2,
        csvData: {
          headers: ['name', 'age', 'city'],
          rows: [
            { name: 'John', age: '30', city: 'New York' },
            { name: 'Jane', age: '25', city: 'San Francisco' }
          ]
        }
      };
      const filename = 'test.csv';
      const mockCsvFile = { id: 1, originalFilename: filename, headers: csvInfo.headers, rowCount: csvInfo.rowCount };
      
      // Mock storage.createCsvFile to return the mock CSV file
      vi.mocked(storage.createCsvFile).mockResolvedValue(mockCsvFile);

      // Act
      const result = await CsvService.saveCsvFile(csvInfo, filename);

      // Assert
      expect(storage.createCsvFile).toHaveBeenCalledWith(
        expect.objectContaining({
          originalFilename: filename,
          headers: csvInfo.headers,
          rowCount: csvInfo.rowCount,
          createdAt: expect.any(String),
          filename: expect.any(String) // Generated filename
        })
      );
      expect(result).toEqual(mockCsvFile);
    });
  });

  describe('extractRowsForPreview', () => {
    it('should extract the specified number of rows for preview', async () => {
      // Arrange
      const csvFileId = 1;
      const mockCsvData = {
        headers: ['name', 'age', 'city'],
        rows: [
          { name: 'John', age: '30', city: 'New York' },
          { name: 'Jane', age: '25', city: 'San Francisco' },
          { name: 'Bob', age: '40', city: 'Chicago' },
          { name: 'Alice', age: '35', city: 'Boston' }
        ]
      };
      
      // Mock storage.getCsvData to return the mock CSV data
      vi.mocked(storage.getCsvData).mockResolvedValue(mockCsvData);

      // Act
      const result = await CsvService.extractRowsForPreview(csvFileId, 2);

      // Assert
      expect(storage.getCsvData).toHaveBeenCalledWith(csvFileId);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockCsvData.rows[0]);
      expect(result[1]).toEqual(mockCsvData.rows[1]);
    });

    it('should return all rows if numRows is larger than available rows', async () => {
      // Arrange
      const csvFileId = 1;
      const mockCsvData = {
        headers: ['name', 'age', 'city'],
        rows: [
          { name: 'John', age: '30', city: 'New York' },
          { name: 'Jane', age: '25', city: 'San Francisco' }
        ]
      };
      
      // Mock storage.getCsvData to return the mock CSV data
      vi.mocked(storage.getCsvData).mockResolvedValue(mockCsvData);

      // Act
      const result = await CsvService.extractRowsForPreview(csvFileId, 5);

      // Assert
      expect(storage.getCsvData).toHaveBeenCalledWith(csvFileId);
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockCsvData.rows);
    });

    it('should throw an error when CSV data is not found', async () => {
      // Arrange
      const csvFileId = 999; // Non-existent ID
      
      // Mock storage.getCsvData to return undefined (not found)
      vi.mocked(storage.getCsvData).mockResolvedValue(undefined);

      // Act & Assert
      await expect(CsvService.extractRowsForPreview(csvFileId, 3))
        .rejects.toThrow('CSV data not found');
    });
  });

  describe('generateEnrichedCsv', () => {
    it('should generate an enriched CSV with the additional columns', async () => {
      // Arrange
      const csvFileId = 1;
      const mockCsvFile = {
        id: csvFileId,
        originalFilename: 'test.csv',
        headers: ['name', 'age', 'city'],
        rowCount: 2
      };
      const mockCsvData = {
        headers: ['name', 'age', 'city'],
        rows: [
          { name: 'John', age: '30', city: 'New York' },
          { name: 'Jane', age: '25', city: 'San Francisco' }
        ]
      };
      const enrichedData = [
        { name: 'John', age: '30', city: 'New York', sentiment: 'positive' },
        { name: 'Jane', age: '25', city: 'San Francisco', sentiment: 'neutral' }
      ];
      
      // Mock storage functions
      vi.mocked(storage.getCsvFile).mockResolvedValue(mockCsvFile);
      vi.mocked(storage.getCsvData).mockResolvedValue(mockCsvData);

      // Mock the fs/promises module
      vi.mock('fs/promises', async () => {
        const actual = await vi.importActual('fs/promises');
        return {
          ...actual,
          mkdir: vi.fn().mockResolvedValue(undefined),
          writeFile: vi.fn().mockResolvedValue(undefined)
        };
      });
      
      // Mock getPromptConfigsByCsvFileId
      vi.mocked(storage.getPromptConfigsByCsvFileId).mockResolvedValue([]);
      
      // Act
      const { content, filePath } = await CsvService.generateEnrichedCsv(csvFileId, enrichedData);

      // Assert
      expect(storage.getCsvFile).toHaveBeenCalledWith(csvFileId);
      expect(storage.getCsvData).toHaveBeenCalledWith(csvFileId);
      expect(content).toContain('name,age,city,sentiment');
      expect(content).toContain('John,30,New York,positive');
      expect(content).toContain('Jane,25,San Francisco,neutral');
      expect(filePath).toContain('enriched/');
    });

    it('should throw an error when CSV file is not found', async () => {
      // Arrange
      const csvFileId = 999; // Non-existent ID
      const enrichedData = [{ name: 'Test', sentiment: 'positive' }];
      
      // Mock storage.getCsvFile to return undefined (not found)
      vi.mocked(storage.getCsvFile).mockResolvedValue(undefined);

      // Act & Assert
      await expect(CsvService.generateEnrichedCsv(csvFileId, enrichedData))
        .rejects.toThrow('CSV file not found');
    });
  });
});