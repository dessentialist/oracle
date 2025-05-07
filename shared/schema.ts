import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema (kept from template)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Oracle schemas
export const csvFiles = pgTable("csv_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  headers: text("headers").array().notNull(),
  rowCount: integer("row_count").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertCsvFileSchema = createInsertSchema(csvFiles).omit({
  id: true,
});

export type InsertCsvFile = z.infer<typeof insertCsvFileSchema>;
export type CsvFile = typeof csvFiles.$inferSelect;

export const promptConfigs = pgTable("prompt_configs", {
  id: serial("id").primaryKey(),
  csvFileId: integer("csv_file_id").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  outputColumnName: text("output_column_name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertPromptConfigSchema = createInsertSchema(promptConfigs).omit({
  id: true,
});

export type InsertPromptConfig = z.infer<typeof insertPromptConfigSchema>;
export type PromptConfig = typeof promptConfigs.$inferSelect;

// Zod schema for CSV upload validation
export const csvUploadSchema = z.object({
  file: z.any(),
});

// Zod schema for prompt configuration
export const promptTemplateSchema = z.object({
  promptTemplate: z.string().min(1, "Prompt template cannot be empty"),
  outputColumnName: z.string().min(1, "Output column name cannot be empty"),
});

// Zod schema for multiple prompt configurations
export const promptConfigsSchema = z.object({
  promptConfigs: z.array(promptTemplateSchema),
  csvFileId: z.number(),
});

// Zod schema for preview request
export const previewRequestSchema = z.object({
  csvFileId: z.number(),
  promptConfigs: z.array(promptTemplateSchema),
  numRows: z.number().optional().default(3),
});

// Zod schema for processing control
export const processingControlSchema = z.object({
  csvFileId: z.number(),
  promptConfigIds: z.array(z.number()),
  action: z.enum(["start", "pause", "resume", "stop"]),
});

// API types (not DB schema)
export const csvHeadersSchema = z.object({
  headers: z.array(z.string()),
});

export const csvDataSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.string().nullable())),
});

export type CsvHeaders = z.infer<typeof csvHeadersSchema>;
export type CsvData = z.infer<typeof csvDataSchema>;
export type CsvRow = CsvData["rows"][number];

export const promptConfigSchema = z.object({
  id: z.number().optional(),
  promptTemplate: z.string(),
  outputColumnName: z.string(),
});

export type PromptConfigInput = z.infer<typeof promptConfigSchema>;

export const previewResultSchema = z.object({
  previewData: z.array(z.record(z.string(), z.unknown())),
});

export type PreviewResult = z.infer<typeof previewResultSchema>;

export const processingStatusSchema = z.object({
  status: z.enum(["idle", "processing", "paused", "completed", "error"]),
  progress: z.number(),
  processedRows: z.number(),
  totalRows: z.number(),
  error: z.string().optional(),
});

export type ProcessingStatus = z.infer<typeof processingStatusSchema>;

export const consoleMessageSchema = z.object({
  id: z.string(),
  type: z.enum(["info", "success", "warning", "error"]),
  message: z.string(),
  timestamp: z.string(),
});

export type ConsoleMessage = z.infer<typeof consoleMessageSchema>;
