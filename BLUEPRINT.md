# Oracle Application Blueprint

## Project Overview

Oracle is a web application for enriching CSV data using the Perplexity LLM (Large Language Model) via prompt templates. The application follows a Test-Driven Development (TDD) approach with a focus on solid test coverage for all core services.

## Core Value Proposition

Oracle allows users to:
- Upload CSV files
- Configure multiple LLM prompts with dynamic templates
- Process rows with Perplexity AI to generate enriched data
- Control processing in real-time (pause, resume, stop)
- Preview results before full processing
- Download enriched CSV files with added AI-generated columns

## Technical Architecture

### Frontend (React + TypeScript)
- **Client-Side Routing**: Using Wouter for lightweight routing
- **State Management**: React Query for server state, React hooks for local state
- **UI Components**: ShadCN UI components with TailwindCSS
- **Form Handling**: React Hook Form with Zod schema validation

### Backend (Node.js + Express)
- **API Server**: Express.js with RESTful endpoints
- **Real-time Updates**: WebSocket server for live processing status
- **CSV Processing**: csv-parse/csv-stringify for CSV manipulation
- **LLM Integration**: Perplexity API integration via their HTTP API
- **Storage**: In-memory storage with MemStorage implementation

### Testing
- **Unit Tests**: Vitest for service and component unit testing
- **BDD Tests**: Behavior-Driven Development tests for end-to-end workflows
- **Mock Services**: Mocked API responses and services for deterministic testing

## Core Features

### 1. CSV File Upload and Validation
- Supports CSV file upload with validation
- Extracts headers and data for processing
- Validates file format and content

### 2. Prompt Configuration
- Dynamic prompt templates with column references (e.g., `{{column_name}}`)
- Multiple prompts can be configured for a single CSV
- Output column name configuration
- Column name autocomplete for easy template creation

### 3. LLM Integration (Perplexity API)
- Uses Perplexity API for generating enriched content
- Dynamic template filling with row data
- Configurable model selection
- Error handling for API failures

### 4. Real-time Processing Control
- Start/pause/resume/stop processing
- Real-time progress tracking
- WebSocket-based status updates
- Detailed console messages for monitoring

### 5. Preview Functionality
- Preview LLM responses for first few rows
- Test prompts before full processing
- Immediate feedback on prompt effectiveness

### 6. Enriched CSV Download
- Download button always visible for easy access
- Automatic saving of processed files to "enriched" folder
- Proper file naming and content-type headers
- Loading states during download

## Data Flow

1. **File Upload**: User uploads CSV → Backend validates and stores → Frontend displays file metadata
2. **Prompt Configuration**: User configures prompts → Backend validates → Frontend stores configurations
3. **Preview**: User requests preview → Backend processes sample rows → Frontend displays results
4. **Processing**: User starts processing → Backend processes all rows → WebSocket provides real-time updates
5. **Download**: User downloads result → Backend generates file → Frontend triggers browser download

## UI Components

### File Upload Component
- Drag-and-drop or click-to-upload interface
- File type validation
- Upload progress indication

### Prompt Configuration Component
- Dynamic adding/removing of prompts
- Template input with autocomplete for column names
- Output column name configuration
- Validation for duplicate output names

### Process Control Component
- Start/pause/resume/stop buttons
- Progress bar showing completion percentage
- Download button (always visible)
- Preview button for testing prompts

### Console View Component
- Real-time log messages during processing
- Color-coded message types (info, success, error, warning)
- Automatic scrolling with manual override

### Preview Modal Component
- Table view of preview results
- Original columns and new AI-generated columns
- Loading states during preview generation

## Error Handling

### API-Level Errors
- Invalid API keys
- Rate limiting
- Network failures
- Timeout handling

### Data-Level Errors
- Invalid CSV formats
- Missing required columns
- Invalid prompt templates
- Duplicate output column names

### Process-Level Errors
- Failed row processing
- Paused/interrupted workflows
- Resource limitations

## Performance Considerations

- Throttled API calls to respect rate limits
- Incremental processing for large files
- Efficient memory usage for CSV data
- WebSocket efficiency for real-time updates

## Security Considerations

- API key management via environment variables
- Input validation on all user inputs
- Content validation for uploads
- Error message sanitization

## Future Enhancements

1. **Database Integration**: Replace in-memory storage with persistent database
2. **User Authentication**: Add multi-user support with authentication
3. **Advanced Templating**: More complex template options with conditional logic
4. **Batch Processing**: Support for processing multiple files in batch
5. **Export Options**: Additional export formats (JSON, Excel)
6. **Column Filtering**: Select which columns to include in output
7. **Template Library**: Save and reuse prompt templates
8. **Custom Models**: Support for additional LLM providers

## Development Workflow

1. Write tests first (TDD approach)
2. Implement features to pass tests
3. Refactor code while maintaining test coverage
4. Document changes and update this blueprint

---

*Last Updated: May 10, 2025*