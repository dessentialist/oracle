import { randomUUID } from "crypto";
import {
  users,
  type User,
  type InsertUser,
  csvFiles,
  type CsvFile,
  type InsertCsvFile,
  promptConfigs,
  type PromptConfig,
  type InsertPromptConfig,
  type CsvData,
  type ProcessingStatus,
  type ConsoleMessage
} from "@shared/schema";

// Extend the storage interface to include Oracle-specific methods
export interface IStorage {
  // User methods (kept from template)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // CSV file methods
  createCsvFile(fileData: InsertCsvFile): Promise<CsvFile>;
  getCsvFile(id: number): Promise<CsvFile | undefined>;
  getCsvData(id: number): Promise<CsvData | undefined>;
  
  // Prompt config methods
  createPromptConfig(config: InsertPromptConfig): Promise<PromptConfig>;
  getPromptConfigsByCsvFileId(csvFileId: number): Promise<PromptConfig[]>;
  deletePromptConfig(id: number): Promise<boolean>;
  
  // Processing status methods
  getProcessingStatus(csvFileId: number): Promise<ProcessingStatus>;
  updateProcessingStatus(csvFileId: number, status: ProcessingStatus): Promise<ProcessingStatus>;
  
  // Console message methods
  addConsoleMessage(csvFileId: number, message: Omit<ConsoleMessage, "id">): Promise<ConsoleMessage>;
  getConsoleMessages(csvFileId: number): Promise<ConsoleMessage[]>;
  clearConsoleMessages(csvFileId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private csvFiles: Map<number, CsvFile>;
  private csvData: Map<number, CsvData>;
  private promptConfigs: Map<number, PromptConfig>;
  private processingStatuses: Map<number, ProcessingStatus>;
  private consoleMessages: Map<number, ConsoleMessage[]>;
  
  private currentUserId: number;
  private currentCsvFileId: number;
  private currentPromptConfigId: number;

  constructor() {
    this.users = new Map();
    this.csvFiles = new Map();
    this.csvData = new Map();
    this.promptConfigs = new Map();
    this.processingStatuses = new Map();
    this.consoleMessages = new Map();
    
    this.currentUserId = 1;
    this.currentCsvFileId = 1;
    this.currentPromptConfigId = 1;
  }

  // User methods (kept from template)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // CSV file methods
  async createCsvFile(fileData: InsertCsvFile): Promise<CsvFile> {
    const id = this.currentCsvFileId++;
    const csvFile: CsvFile = { ...fileData, id };
    this.csvFiles.set(id, csvFile);
    
    // Initialize processing status
    this.processingStatuses.set(id, {
      status: "idle",
      progress: 0,
      processedRows: 0,
      totalRows: csvFile.rowCount,
    });
    
    // Initialize console messages
    this.consoleMessages.set(id, []);
    
    return csvFile;
  }
  
  async getCsvFile(id: number): Promise<CsvFile | undefined> {
    return this.csvFiles.get(id);
  }
  
  async getCsvData(id: number): Promise<CsvData | undefined> {
    return this.csvData.get(id);
  }
  
  // Method to store CSV data separately (since it could be large)
  async storeCsvData(id: number, data: CsvData): Promise<void> {
    this.csvData.set(id, data);
  }
  
  // Prompt config methods
  async createPromptConfig(config: InsertPromptConfig): Promise<PromptConfig> {
    const id = this.currentPromptConfigId++;
    const promptConfig: PromptConfig = { ...config, id };
    this.promptConfigs.set(id, promptConfig);
    return promptConfig;
  }
  
  async getPromptConfigsByCsvFileId(csvFileId: number): Promise<PromptConfig[]> {
    return Array.from(this.promptConfigs.values()).filter(
      (config) => config.csvFileId === csvFileId
    );
  }
  
  async deletePromptConfig(id: number): Promise<boolean> {
    return this.promptConfigs.delete(id);
  }
  
  // Processing status methods
  async getProcessingStatus(csvFileId: number): Promise<ProcessingStatus> {
    return (
      this.processingStatuses.get(csvFileId) || {
        status: "idle",
        progress: 0,
        processedRows: 0,
        totalRows: 0,
      }
    );
  }
  
  async updateProcessingStatus(csvFileId: number, status: ProcessingStatus): Promise<ProcessingStatus> {
    this.processingStatuses.set(csvFileId, status);
    return status;
  }
  
  // Console message methods
  async addConsoleMessage(csvFileId: number, message: Omit<ConsoleMessage, "id">): Promise<ConsoleMessage> {
    const messages = this.consoleMessages.get(csvFileId) || [];
    const newMessage: ConsoleMessage = {
      ...message,
      id: randomUUID(),
    };
    
    messages.push(newMessage);
    this.consoleMessages.set(csvFileId, messages);
    
    return newMessage;
  }
  
  async getConsoleMessages(csvFileId: number): Promise<ConsoleMessage[]> {
    return this.consoleMessages.get(csvFileId) || [];
  }
  
  async clearConsoleMessages(csvFileId: number): Promise<void> {
    this.consoleMessages.set(csvFileId, []);
  }
}

export const storage = new MemStorage();
