# Oracle Application Function Documentation

This document provides a comprehensive overview of the directory structure, key functions, and code organization for the Oracle application.

## Directory Structure

```
/
├── client/                     # Frontend code
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities and types
│   │   ├── pages/              # Page components
│   │   ├── App.tsx             # Main app component
│   │   └── main.tsx            # Entry point
│   └── index.html              # HTML template
├── server/                     # Backend code
│   ├── services/               # Core business logic
│   │   ├── csv-service.ts      # CSV file handling
│   │   ├── llm-service.ts      # Perplexity API integration
│   │   └── prompt-service.ts   # Prompt template processing
│   ├── index.ts                # Server entry point
│   ├── routes.ts               # API endpoints
│   ├── storage.ts              # Data storage interface
│   └── vite.ts                 # Vite server setup
├── shared/                     # Shared code
│   └── schema.ts               # TypeScript interfaces and schemas
├── tests/                      # Test files
│   ├── bdd/                    # Behavior-driven tests
│   ├── unit/                   # Unit tests
│   └── setup.ts                # Test setup
└── enriched/                   # Generated CSV files (created at runtime)
```

## Server Functions

### Main Server (`server/index.ts`)

- **`startServer()`**: Initializes the Express server, sets up middleware, and registers routes
- **`createExpressApp()`**: Creates and configures the Express application with essential middleware
- **`setupMiddleware(app)`**: Sets up common middleware for the Express application

### Routes (`server/routes.ts`)

- **`registerRoutes(app)`**: Registers all API endpoints with the Express application
- **`broadcast(data)`**: Broadcasts data to all connected WebSocket clients
- **API Endpoints**:
  - **`/api/upload`**: Handles CSV file uploads
  - **`/api/csv/:id`**: Retrieves CSV file metadata
  - **`/api/prompts`**: Creates and manages prompt configurations
  - **`/api/prompts/:csvFileId`**: Gets prompt configurations for a specific CSV file
  - **`/api/preview`**: Generates preview responses for the first few rows
  - **`/api/process`**: Controls processing (start/pause/resume/stop)
  - **`/api/process/:csvFileId`**: Gets the status of processing
  - **`/api/download/:csvFileId`**: Downloads the enriched CSV file
  - **`/api/console/:csvFileId`**: Gets console messages
  - **`/api/console/:csvFileId/clear`**: Clears console messages
  - **`/api/autocomplete`**: Gets column name autocomplete suggestions

### Storage (`server/storage.ts`)

- **`IStorage`**: Interface defining storage operations
- **`MemStorage`**: In-memory implementation of the storage interface
- **Storage Methods**:
  - **`getUser(id)`**: Gets a user by ID
  - **`getUserByUsername(username)`**: Gets a user by username
  - **`createUser(user)`**: Creates a new user
  - **`createCsvFile(fileData)`**: Creates a new CSV file entry
  - **`getCsvFile(id)`**: Gets a CSV file by ID
  - **`getCsvData(id)`**: Gets CSV data by file ID
  - **`storeCsvData(id, data)`**: Stores CSV data for a file
  - **`createPromptConfig(config)`**: Creates a new prompt configuration
  - **`getPromptConfigsByCsvFileId(csvFileId)`**: Gets prompt configurations for a CSV file
  - **`deletePromptConfig(id)`**: Deletes a prompt configuration
  - **`getProcessingStatus(csvFileId)`**: Gets the processing status for a CSV file
  - **`updateProcessingStatus(csvFileId, status)`**: Updates the processing status
  - **`addConsoleMessage(csvFileId, message)`**: Adds a console message
  - **`getConsoleMessages(csvFileId)`**: Gets console messages for a CSV file
  - **`clearConsoleMessages(csvFileId)`**: Clears console messages for a CSV file

### CSV Service (`server/services/csv-service.ts`)

- **`processUploadedCsv(file, originalFilename)`**: Processes an uploaded CSV file
- **`saveCsvFile(csvInfo, originalFilename)`**: Saves a processed CSV file
- **`generateEnrichedCsv(csvFileId, enrichedData)`**: Generates an enriched CSV with LLM responses
- **`extractRowsForPreview(csvFileId, numRows)`**: Extracts rows for preview

### LLM Service (`server/services/llm-service.ts`)

- **`query(prompt, options)`**: Sends a query to the Perplexity API
- **`fillPromptTemplate(template, row)`**: Fills a prompt template with row data
- **`processRows(rows, promptTemplates, outputColumnNames)`**: Processes rows with prompts
- **`getAutocompleteSuggestions(partial, headers)`**: Gets autocomplete suggestions for column names

### Prompt Service (`server/services/prompt-service.ts`)

- **`validatePromptTemplate(template, headers)`**: Validates a prompt template
- **`validateOutputColumnName(name, headers, existingOutputs)`**: Validates an output column name
- **`extractColumnReferences(template)`**: Extracts column references from a template
- **`previewPrompts(csvFileId, promptTemplates, outputColumnNames, numRows)`**: Previews prompts
- **`processFile(csvFileId, promptConfigIds)`**: Processes a file with prompt configurations

## Client Functions

### React Hooks

#### Processing Hook (`client/src/hooks/use-processing.ts`)

- **`usePreview(csvFileId)`**: Hook for preview functionality
  - **`previewPrompts(promptConfigs)`**: Previews prompt configurations
  
- **`useProcessing(csvFileId)`**: Hook for processing functionality
  - **`startProcessing(promptConfigIds)`**: Starts processing
  - **`pauseProcessing()`**: Pauses processing
  - **`resumeProcessing()`**: Resumes processing
  - **`stopProcessing()`**: Stops processing
  - **`downloadEnrichedCsv()`**: Downloads the enriched CSV file

- **`useConsoleMessages(csvFileId)`**: Hook for console messages
  - **`clearConsole()`**: Clears console messages

#### WebSocket Hook (`client/src/hooks/use-websocket.ts`)

- **`useWebSocket(csvFileId)`**: Hook for WebSocket connections
  - **`subscribe(csvFileId)`**: Subscribes to updates for a CSV file

### Components

#### File Upload (`client/src/components/FileUpload.tsx`)

- **`FileUpload`**: Component for uploading CSV files
  - **`onFileDrop(files)`**: Handles file drop events
  - **`uploadFile(file)`**: Uploads a file to the server

#### Prompt Configuration (`client/src/components/PromptConfig.tsx`)

- **`PromptConfig`**: Component for configuring prompts
  - **`addPrompt()`**: Adds a new prompt
  - **`removePrompt(index)`**: Removes a prompt
  - **`updatePrompt(index, field, value)`**: Updates a prompt field
  - **`savePrompts()`**: Saves prompt configurations

#### Process Control (`client/src/components/ProcessControl.tsx`)

- **`ProcessControl`**: Component for controlling processing
  - **`handlePreview()`**: Handles preview button click
  - Features:
    - Progress bar for tracking completion
    - Start/pause/resume/stop buttons
    - Download button (always visible)
    - Preview button

#### Console View (`client/src/components/ConsoleView.tsx`)

- **`ConsoleView`**: Component for displaying console messages
  - **`clearMessages()`**: Clears console messages
  - **`scrollToBottom()`**: Scrolls to the bottom of the console

#### Preview Modal (`client/src/components/PreviewModal.tsx`)

- **`PreviewModal`**: Modal for displaying preview results
  - **`renderHeaders()`**: Renders table headers
  - **`renderRows()`**: Renders table rows

## Shared Types (`shared/schema.ts`)

- **`User`**: User type
- **`InsertUser`**: Insert schema for users
- **`CsvFile`**: CSV file metadata type
- **`InsertCsvFile`**: Insert schema for CSV files
- **`PromptConfig`**: Prompt configuration type
- **`InsertPromptConfig`**: Insert schema for prompt configurations
- **`CsvData`**: CSV data type
- **`ProcessingStatus`**: Processing status type
- **`ConsoleMessage`**: Console message type

## Test Functions

### Unit Tests

- **`csv-service.test.ts`**: Tests for CSV service
- **`llm-service.test.ts`**: Tests for LLM service
- **`prompt-service.test.ts`**: Tests for prompt service
- **`progress-bar.test.tsx`**: Tests for progress bar component
- **`download-button.test.tsx`**: Tests for download button functionality

### BDD Tests

- **`data-enrichment.test.ts`**: Tests for end-to-end data enrichment workflow
- **`ui-interactions.test.ts`**: Tests for UI interactions

## Key Logic Flows

### CSV Upload Flow

1. User uploads CSV file via FileUpload component
2. File is sent to `/api/upload` endpoint
3. `CsvService.processUploadedCsv()` parses and validates the file
4. `CsvService.saveCsvFile()` stores the file metadata
5. Frontend receives the file ID and metadata
6. User is shown the file details and can proceed to prompt configuration

### Prompt Configuration Flow

1. User configures prompts via PromptConfig component
2. Column autocomplete uses `LLMService.getAutocompleteSuggestions()`
3. Prompts are validated on the frontend
4. Prompt configurations are sent to `/api/prompts` endpoint
5. Backend validates prompt templates with `PromptService.validatePromptTemplate()`
6. Frontend receives confirmation and enables processing

### Processing Flow

1. User starts processing via ProcessControl component
2. Request is sent to `/api/process` endpoint with action "start"
3. Backend initiates processing with `PromptService.processFile()`
4. `LLMService.processRows()` handles the actual API calls
5. Progress updates are sent via WebSocket
6. Frontend updates the UI with progress information
7. When completed, the enriched CSV is saved with `CsvService.generateEnrichedCsv()`

### Download Flow

1. User clicks the download button (visible at all times)
2. Frontend calls `useProcessing().downloadEnrichedCsv()`
3. Request is sent to `/api/download/:csvFileId` endpoint
4. Backend generates the CSV with `CsvService.generateEnrichedCsv()`
5. Response includes the CSV content with proper headers
6. Frontend triggers browser download

---

*Last Updated: May 10, 2025*