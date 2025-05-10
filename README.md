# Oracle: CSV Data Enrichment with Perplexity LLM

Oracle is a web application that enables users to upload CSV files and enrich them with AI-generated content using the Perplexity Large Language Model.

## Features

- Upload and validate CSV files
- Configure multiple prompts with dynamic column references
- Preview AI-generated content before full processing
- Process CSV data with real-time status updates
- Pause, resume, or stop processing as needed
- Download enriched CSV files with AI-generated columns
- Comprehensive error handling and logging

## Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS, ShadCN UI
- **Backend**: Node.js, Express
- **API Integration**: Perplexity LLM API
- **Real-time Updates**: WebSockets
- **Data Processing**: CSV parsing and generation
- **Testing**: Vitest, React Testing Library

## Project Structure

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
├── enriched/                   # Generated CSV files (created at runtime)
├── BLUEPRINT.md                # Detailed application blueprint
├── FUNCTIONS.md                # Function documentation
└── package.json                # Project dependencies
```

## Core Workflows

### 1. CSV Upload and Exploration

1. User uploads a CSV file
2. System validates the file format and content
3. Headers and sample data are displayed to the user

### 2. Prompt Configuration

1. User creates prompt templates using column references
2. System provides autocomplete for column names
3. User can add, edit, or remove prompts
4. Each prompt has an associated output column name

### 3. Preview and Process

1. User can preview results for the first few rows
2. User initiates full processing
3. Real-time progress is displayed
4. Processing can be paused, resumed, or stopped

### 4. Download and Export

1. Enriched CSV is automatically saved to the "enriched" folder
2. User can download the enriched CSV at any time
3. Download includes original data plus AI-generated columns

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload CSV file |
| `/api/csv/:id` | GET | Get CSV file metadata |
| `/api/prompts` | POST | Save prompt configurations |
| `/api/prompts/:csvFileId` | GET | Get prompt configurations |
| `/api/preview` | POST | Preview prompts on sample rows |
| `/api/process` | POST | Start/pause/resume/stop processing |
| `/api/process/:csvFileId` | GET | Get processing status |
| `/api/download/:csvFileId` | GET | Download enriched CSV |
| `/api/console/:csvFileId` | GET | Get console messages |
| `/api/console/:csvFileId/clear` | POST | Clear console messages |
| `/api/autocomplete` | GET | Get column name autocomplete suggestions |

## WebSocket Events

| Event Type | Direction | Description |
|------------|-----------|-------------|
| `connected` | Server → Client | Connection established |
| `subscription_confirmed` | Server → Client | Subscription to updates confirmed |
| `processing_update` | Server → Client | Real-time processing status update |
| `processing_error` | Server → Client | Error occurred during processing |
| `subscribe` | Client → Server | Subscribe to updates for a CSV file |

## Environment Variables

| Variable Name | Description |
|---------------|-------------|
| `PERPLEXITY_API_KEY` | API key for Perplexity LLM |

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up environment variables (create a `.env` file)
4. Start the development server with `npm run dev`
5. Access the application at http://localhost:5000

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run tests/unit/csv-service.test.ts

# Run tests in watch mode
npm run test:watch
```

### Testing Approach

- **Unit Tests**: Test individual services and components
- **BDD Tests**: Test end-to-end user workflows
- **Component Tests**: Test UI components in isolation

## Documentation

- **[BLUEPRINT.md](BLUEPRINT.md)**: Detailed application blueprint
- **[FUNCTIONS.md](FUNCTIONS.md)**: Function-level documentation

---

*Last Updated: May 10, 2025*