import type { Express, Request, Response } from "express";
import type { ParsedQs } from 'qs';
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { CsvService } from "./services/csv-service";
import { PromptService } from "./services/prompt-service";
import { LLMService } from "./services/llm-service";
import { z } from "zod";
import { randomUUID } from "crypto";
import { WebSocket, WebSocketServer } from "ws";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wsServer = new WebSocketServer({ 
    server: httpServer,
    // Handle protocol errors
    handleProtocols: (protocols, request) => {
      // Accept any protocol or null
      return protocols[0] || '';
    }
  });

  const clients = new Map<string, WebSocket>();

  // Helper function to safely handle WebSocket connections
  wsServer.on("connection", (socket: WebSocket) => {
    // Generate a unique client ID
    const clientId = randomUUID();
    console.log(`Client ${clientId} connected`);
    
    // Store the client connection
    clients.set(clientId, socket);

    // Set up error handling for this socket
    socket.on("error", (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error.message);
      
      // Clean up on error
      try {
        socket.terminate();
      } catch (e) {
        // Ignore errors when terminating
      }
      clients.delete(clientId);
    });

    // Handle incoming messages
    socket.on("message", (message: Buffer) => {
      try {
        // Safe conversion to UTF-8 string
        let messageText: string;
        try {
          // Try to convert the buffer to a string safely
          messageText = message.toString('utf-8');
        } catch (e) {
          console.warn(`Invalid UTF-8 sequence from client ${clientId}, ignoring message`);
          return; // Skip this message
        }
        
        // Try to parse the message as JSON
        let data: any;
        try {
          data = JSON.parse(messageText);
        } catch (e) {
          console.warn(`Invalid JSON from client ${clientId}: ${messageText.substring(0, 50)}`);
          return; // Skip this message
        }
        
        // Process valid messages
        if (data.type === "subscribe" && data.csvFileId) {
          console.log(`Client ${clientId} subscribed to updates for CSV file ${data.csvFileId}`);
          
          // Send confirmation back to client
          try {
            socket.send(JSON.stringify({
              type: "subscription_confirmed",
              csvFileId: data.csvFileId
            }));
          } catch (e) {
            console.error(`Error sending confirmation to client ${clientId}:`, e);
          }
        }
      } catch (error) {
        // Log the error but continue processing
        console.error(`Error processing message from client ${clientId}:`, 
          error instanceof Error ? error.message : "Unknown error");
      }
    });

    // Handle disconnection
    socket.on("close", (code, reason) => {
      console.log(`Client ${clientId} disconnected (${code}): ${reason || 'No reason provided'}`);
      clients.delete(clientId);
    });
    
    // Send welcome message
    try {
      socket.send(JSON.stringify({
        type: "connected",
        message: "Connected to Oracle server",
        clientId
      }));
    } catch (e) {
      console.error(`Error sending welcome message to client ${clientId}:`, e);
    }
  });

  // Broadcast to all connected clients
  function broadcast(data: any) {
    try {
      const message = JSON.stringify(data);
      let sent = 0;
      let total = 0;
      
      clients.forEach((client) => {
        total++;
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(message);
            sent++;
          } catch (err) {
            console.error("Error sending message to client:", err);
          }
        }
      });
      
      console.log(`Broadcast: Sent message to ${sent}/${total} clients`);
    } catch (error) {
      console.error("Error broadcasting message:", error);
    }
  }

  // File upload endpoint
  app.post("/api/upload", upload.single("file"), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;

      // Validate file type
      if (file.mimetype !== "text/csv" && !file.originalname.endsWith(".csv")) {
        return res.status(400).json({
          message: "Invalid file type. Only CSV files are accepted.",
        });
      }

      // Process the CSV file
      const csvInfo = await CsvService.processUploadedCsv(
        file.buffer,
        file.originalname
      );

      // Save the CSV file
      const csvFile = await CsvService.saveCsvFile(
        csvInfo,
        file.originalname
      );

      // Store the CSV data
      await storage.storeCsvData(csvFile.id, csvInfo.csvData);

      // Return the CSV file metadata
      return res.status(200).json({
        id: csvFile.id,
        filename: csvFile.originalFilename,
        headers: csvFile.headers,
        rowCount: csvFile.rowCount,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(400).json({ message: errorMessage });
    }
  });

  // Get CSV file metadata
  app.get("/api/csv/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid CSV file ID" });
      }

      const csvFile = await storage.getCsvFile(id);
      if (!csvFile) {
        return res.status(404).json({ message: "CSV file not found" });
      }

      return res.status(200).json({
        id: csvFile.id,
        filename: csvFile.originalFilename,
        headers: csvFile.headers,
        rowCount: csvFile.rowCount,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ message: errorMessage });
    }
  });

  // Get autocomplete suggestions for column names
  app.get("/api/autocomplete", async (req, res) => {
    try {
      const csvFileId = parseInt(req.query.csvFileId as string);
      const partial = req.query.partial as string || "";

      if (isNaN(csvFileId)) {
        return res.status(400).json({ message: "Invalid CSV file ID" });
      }

      const csvFile = await storage.getCsvFile(csvFileId);
      if (!csvFile) {
        return res.status(404).json({ message: "CSV file not found" });
      }

      const suggestions = LLMService.getAutocompleteSuggestions(
        partial,
        csvFile.headers
      );

      return res.status(200).json({ suggestions });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ message: errorMessage });
    }
  });

  // Save prompt configurations
  app.post("/api/prompts", async (req, res) => {
    try {
      const schema = z.object({
        csvFileId: z.number(),
        promptConfigs: z.array(
          z.object({
            promptTemplate: z.string(),
            outputColumnName: z.string(),
          })
        ),
      });

      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.format(),
        });
      }

      const { csvFileId, promptConfigs } = validationResult.data;

      // Get the CSV file to validate against headers
      const csvFile = await storage.getCsvFile(csvFileId);
      if (!csvFile) {
        return res.status(404).json({ message: "CSV file not found" });
      }

      // Validate each prompt config
      const outputColumnNames: string[] = [];
      for (const config of promptConfigs) {
        // Validate prompt template
        if (
          !PromptService.validatePromptTemplate(
            config.promptTemplate,
            csvFile.headers
          )
        ) {
          return res.status(400).json({
            message: `Invalid prompt template: '${config.promptTemplate}'. Ensure all column references are valid.`,
          });
        }

        // Validate output column name
        if (
          !PromptService.validateOutputColumnName(
            config.outputColumnName,
            csvFile.headers,
            outputColumnNames
          )
        ) {
          return res.status(400).json({
            message: `Invalid output column name: '${config.outputColumnName}'. It must be unique and not conflict with existing columns.`,
          });
        }

        outputColumnNames.push(config.outputColumnName);
      }

      // Delete existing prompt configs for this CSV file
      const existingConfigs = await storage.getPromptConfigsByCsvFileId(
        csvFileId
      );
      for (const config of existingConfigs) {
        await storage.deletePromptConfig(config.id);
      }

      // Save the new prompt configs
      const savedConfigs = [];
      for (const config of promptConfigs) {
        const savedConfig = await storage.createPromptConfig({
          csvFileId,
          promptTemplate: config.promptTemplate,
          outputColumnName: config.outputColumnName,
          createdAt: new Date().toISOString(),
        });
        savedConfigs.push(savedConfig);
      }

      // Log to console
      await storage.addConsoleMessage(csvFileId, {
        type: "success",
        message: "Prompt configurations saved successfully.",
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({ promptConfigs: savedConfigs });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ message: errorMessage });
    }
  });

  // Get prompt configurations for a CSV file
  app.get("/api/prompts/:csvFileId", async (req, res) => {
    try {
      const csvFileId = parseInt(req.params.csvFileId);
      if (isNaN(csvFileId)) {
        return res.status(400).json({ message: "Invalid CSV file ID" });
      }

      const promptConfigs = await storage.getPromptConfigsByCsvFileId(
        csvFileId
      );

      return res.status(200).json({ promptConfigs });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ message: errorMessage });
    }
  });

  // Preview prompts
  app.post("/api/preview", async (req, res) => {
    try {
      const schema = z.object({
        csvFileId: z.number(),
        promptConfigs: z.array(
          z.object({
            promptTemplate: z.string(),
            outputColumnName: z.string(),
          })
        ),
        numRows: z.number().optional().default(3),
      });

      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.format(),
        });
      }

      const { csvFileId, promptConfigs, numRows } = validationResult.data;

      // Get prompt templates and output column names
      const promptTemplates = promptConfigs.map(
        (config) => config.promptTemplate
      );
      const outputColumnNames = promptConfigs.map(
        (config) => config.outputColumnName
      );

      // Generate the preview
      const previewData = await PromptService.previewPrompts(
        csvFileId,
        promptTemplates,
        outputColumnNames,
        numRows
      );

      return res.status(200).json({ previewData });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ message: errorMessage });
    }
  });

  // Start/pause/resume/stop processing
  app.post("/api/process", async (req, res) => {
    try {
      const schema = z.object({
        csvFileId: z.number(),
        promptConfigIds: z.array(z.number()),
        action: z.enum(["start", "pause", "resume", "stop"]),
      });

      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.format(),
        });
      }

      const { csvFileId, promptConfigIds, action } = validationResult.data;

      // Get the current processing status
      const status = await storage.getProcessingStatus(csvFileId);

      switch (action) {
        case "start":
          if (status.status === "processing") {
            return res
              .status(400)
              .json({ message: "Processing is already in progress" });
          }

          // Start processing in the background
          PromptService.processFile(csvFileId, promptConfigIds)
            .then(async (enrichedRows) => {
              // Generate the enriched CSV
              const csvContent = await CsvService.generateEnrichedCsv(
                csvFileId,
                enrichedRows
              );

              // Store the enriched CSV data
              const csvFile = await storage.getCsvFile(csvFileId);
              if (csvFile) {
                await storage.addConsoleMessage(csvFileId, {
                  type: "success",
                  message: `Enriched CSV file ready for download: enriched_${csvFile.originalFilename}`,
                  timestamp: new Date().toISOString(),
                });
              }

              // Broadcast completion status
              broadcast({
                type: "processing_status",
                csvFileId,
                status: "completed",
                progress: 100,
                processedRows: status.totalRows,
                totalRows: status.totalRows,
              });
            })
            .catch(async (error) => {
              const errorMessage =
                error instanceof Error ? error.message : "Unknown error";

              // Log the error
              await storage.addConsoleMessage(csvFileId, {
                type: "error",
                message: `Processing failed: ${errorMessage}`,
                timestamp: new Date().toISOString(),
              });

              // Broadcast error status
              broadcast({
                type: "processing_status",
                csvFileId,
                status: "error",
                progress: 0,
                processedRows: 0,
                totalRows: status.totalRows,
                error: errorMessage,
              });
            });

          // Update status to "processing"
          await storage.updateProcessingStatus(csvFileId, {
            ...status,
            status: "processing",
          });

          return res.status(200).json({ status: "processing" });

        case "pause":
          if (status.status !== "processing") {
            return res
              .status(400)
              .json({ message: "Processing is not in progress" });
          }

          // Update status to "paused"
          await storage.updateProcessingStatus(csvFileId, {
            ...status,
            status: "paused",
          });

          // Log pause action
          await storage.addConsoleMessage(csvFileId, {
            type: "warning",
            message: "Processing paused by user.",
            timestamp: new Date().toISOString(),
          });

          return res.status(200).json({ status: "paused" });

        case "resume":
          if (status.status !== "paused") {
            return res
              .status(400)
              .json({ message: "Processing is not paused" });
          }

          // Update status to "processing"
          await storage.updateProcessingStatus(csvFileId, {
            ...status,
            status: "processing",
          });

          // Log resume action
          await storage.addConsoleMessage(csvFileId, {
            type: "info",
            message: "Processing resumed.",
            timestamp: new Date().toISOString(),
          });

          return res.status(200).json({ status: "processing" });

        case "stop":
          if (
            status.status !== "processing" &&
            status.status !== "paused"
          ) {
            return res
              .status(400)
              .json({ message: "Processing is not active" });
          }

          // Update status to "idle"
          await storage.updateProcessingStatus(csvFileId, {
            ...status,
            status: "idle",
          });

          // Log stop action
          await storage.addConsoleMessage(csvFileId, {
            type: "error",
            message: `Processing stopped by user. Processed rows: ${status.processedRows}/${status.totalRows}`,
            timestamp: new Date().toISOString(),
          });

          return res.status(200).json({ status: "idle" });

        default:
          return res.status(400).json({ message: "Invalid action" });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ message: errorMessage });
    }
  });

  // Get processing status
  app.get("/api/process/:csvFileId", async (req, res) => {
    try {
      const csvFileId = parseInt(req.params.csvFileId);
      if (isNaN(csvFileId)) {
        return res.status(400).json({ message: "Invalid CSV file ID" });
      }

      const status = await storage.getProcessingStatus(csvFileId);

      return res.status(200).json(status);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ message: errorMessage });
    }
  });

  // Get console messages
  app.get("/api/console/:csvFileId", async (req, res) => {
    try {
      const csvFileId = parseInt(req.params.csvFileId);
      if (isNaN(csvFileId)) {
        return res.status(400).json({ message: "Invalid CSV file ID" });
      }

      const messages = await storage.getConsoleMessages(csvFileId);

      return res.status(200).json({ messages });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ message: errorMessage });
    }
  });

  // Clear console messages
  app.post("/api/console/:csvFileId/clear", async (req, res) => {
    try {
      const csvFileId = parseInt(req.params.csvFileId);
      if (isNaN(csvFileId)) {
        return res.status(400).json({ message: "Invalid CSV file ID" });
      }

      await storage.clearConsoleMessages(csvFileId);
      await storage.addConsoleMessage(csvFileId, {
        type: "info",
        message: "--- Console cleared ---",
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ message: errorMessage });
    }
  });

  // Download enriched CSV
  app.get("/api/download/:csvFileId", async (req, res) => {
    try {
      const csvFileId = parseInt(req.params.csvFileId);
      if (isNaN(csvFileId)) {
        return res.status(400).json({ message: "Invalid CSV file ID" });
      }

      const csvFile = await storage.getCsvFile(csvFileId);
      if (!csvFile) {
        return res.status(404).json({ message: "CSV file not found" });
      }

      const status = await storage.getProcessingStatus(csvFileId);
      // If no data has been processed yet, return empty CSV with just headers
      const noProcessedData = status.processedRows === 0;

      // In a real implementation, we'd retrieve the enriched CSV content
      // For now, we'll generate it from the stored data
      const csvData = await storage.getCsvData(csvFileId);
      if (!csvData) {
        return res.status(404).json({ message: "CSV data not found" });
      }

      const promptConfigs = await storage.getPromptConfigsByCsvFileId(
        csvFileId
      );
      const promptTemplates = promptConfigs.map(
        (config) => config.promptTemplate
      );
      const outputColumnNames = promptConfigs.map(
        (config) => config.outputColumnName
      );

      // Generate enriched CSV (this would typically be retrieved from storage)
      const enrichedRows = await LLMService.processRows(
        csvData.rows,
        promptTemplates,
        outputColumnNames,
        csvFileId
      );
      const csvContent = await CsvService.generateEnrichedCsv(
        csvFileId,
        enrichedRows
      );

      // Set headers for download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="enriched_${csvFile.originalFilename}"`
      );

      // Log download action
      await storage.addConsoleMessage(csvFileId, {
        type: "info",
        message: "Downloading enriched CSV...",
        timestamp: new Date().toISOString(),
      });

      return res.status(200).send(csvContent);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ message: errorMessage });
    }
  });

  return httpServer;
}
