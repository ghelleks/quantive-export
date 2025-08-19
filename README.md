# Quantive Export

Enterprise-grade Google Apps Script for automated OKR reporting with Quantive API integration. Generates comprehensive reports in Google Docs and Sheets formats with exceptional performance optimization.

## Key Features

### Core Functionality
- **Multi-session reports** - Generate reports across multiple OKR sessions
- **Hierarchical structure** - Displays objectives → key results → tasks with proper nesting
- **Smart user resolution** - Shows actual display names with intelligent caching
- **Flexible output formats** - Google Docs and plain text markdown exports
- **Session name resolution** - Use friendly names like "Q4 2024" instead of UUIDs

### Performance Excellence (v2.2)
- **Lightning-fast execution** - Under 90 seconds for most sessions (4-5x improvement)
- **Batch API processing** - Parallel requests with intelligent chunking (see [ADR-001](docs/adr/ADR-001-performance-architecture-batch-processing.md))
- **Bulk user fetching** - 90% reduction in API calls through optimization
- **Configurable performance modes** - Skip expensive operations when speed is prioritized
- **Memory optimization** - Efficient data structures for large datasets (see [ADR-004](docs/adr/ADR-004-data-processing-architecture.md))

### Enterprise Features
- **Local debugging environment** - Full development workflow without Google Apps Script (see [ADR-002](docs/adr/ADR-002-local-debugging-environment.md))
- **Automated deployment** - GitHub Actions integration with clasp (see [ADR-005](docs/adr/ADR-005-deployment-automation.md))
- **Comprehensive error handling** - Exponential backoff and graceful degradation
- **Security-first design** - Credential validation and encrypted storage (see [ADR-006](docs/adr/ADR-006-configuration-management.md))

## Requirements

- Google Workspace account
- Quantive API access (API token and account ID)
- Google Apps Script project

## Setup

1. **Get credentials**:
   - API token: Quantive Settings → Integrations → Generate API Token
   - Account ID: Found in Quantive URL or account settings

2. **Create Google Apps Script project**:
   - Go to [script.google.com](https://script.google.com)
   - Create new project
   - Copy contents of `Code.gs` into the project

3. **Configure Script Properties** (no config file):
   - In the Apps Script editor, open Project Settings → Script properties
   - Add properties (case-sensitive):
     - `QUANTIVE_API_TOKEN`: your API token
     - `QUANTIVE_ACCOUNT_ID`: your account ID
     - `SESSIONS`: comma-separated session names/UUIDs or a JSON array (e.g., `Q3 2025,RHELBU Annual 2025` or `["Q3 2025","66c65f..."]`)
     - `GOOGLE_DOC_ID`: target Google Doc ID (optional)
   - Optional:
     - `LOOKBACK_DAYS`: default 7
     - `QUANTIVE_BASE_URL`: default `https://app.us.quantive.com/results/api/v1`
     - `TEXT_FILE_URL` or `TEXT_FILE_ID`: Drive file for plain-text export
   - You must set at least one export target: `GOOGLE_DOC_ID` or `TEXT_FILE_URL/TEXT_FILE_ID`.

4. **Create output document**:
   - Create a Google Doc for report output
   - Copy document ID from URL and set as `GOOGLE_DOC_ID`

5. **Run the report**:
   - Execute `generateQuantiveReport()` function
   - Check execution log for output document URL

## Configuration Reference (Script Properties)

Required properties:
- `QUANTIVE_API_TOKEN`
- `QUANTIVE_ACCOUNT_ID`
- `SESSIONS` (CSV or JSON array)
- `GOOGLE_DOC_ID`

Optional:
- `LOOKBACK_DAYS` (default 7)
- `QUANTIVE_BASE_URL` (default US data center URL)
- `TEXT_FILE_URL` or `TEXT_FILE_ID` for plain-text export

## Output Format

Reports contain:
- Executive summary with progress statistics
- Status breakdown with color coding
- Hierarchical list of objectives, key results, and tasks
- Owner information and progress percentages
- Session context for multi-session reports
 - Optional plain text snapshot written to Drive (`quantive-snapshot.md`) suitable for Markdown consumers

## Plain Text Export (Markdown)

If configured, the script will also overwrite a Drive text file with a Markdown-friendly snapshot on every run:

- Provide a sharing URL via `TEXT_FILE_URL` or a direct ID via `TEXT_FILE_ID`
- The script derives the file ID from the URL and writes the snapshot to that file
- The file is renamed to `quantive-snapshot.md` each time to keep a predictable name
- Requires Drive access permission for the executing Apps Script project

## API Usage

- Fetches sessions, objectives, key results, and tasks from Quantive API
- Resolves user IDs to display names
- Builds hierarchical relationships between objectives
- Only fetches tasks when `taskCount > 0` for efficiency

## Performance Benchmarks

### Execution Times (v2.2)
- **Small Sessions** (<50 KRs): **60-70 seconds** (previously 2+ minutes)
- **Medium Sessions** (50-200 KRs): **70-90 seconds** (previously 3+ minutes)  
- **Large Sessions** (400+ KRs): **Under 3 minutes** (previously 5+ minutes)

### Optimization Highlights
- **4-5x speed improvement** through batch API processing
- **90% reduction in API calls** via bulk user fetching and caching
- **Parallel execution** using UrlFetchApp.fetchAll() with 25-request chunks
- **Map-based data structures** for O(1) lookups instead of O(n) filtering
- **Intelligent fallback** to sequential processing when batch operations fail

## Testing

Run these functions in the Apps Script editor:
- `testApiConnection()` - Test API connectivity
- `listAvailableSessions()` - View available sessions
- `generateQuantiveReport()` - Generate full report

## Documentation

### Quick Start Guides
- **[Setup Guide](docs/setup-guide.md)** - Complete installation and configuration
- **[Development Guide](docs/development-guide.md)** - Local debugging and development workflow
- **[Deployment Guide](docs/deployment-guide.md)** - Production deployment with clasp automation

### Technical Documentation
- **[Architecture Overview](docs/architecture.md)** - Technical details and performance optimization
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[Project Requirements](docs/project-requirements.md)** - Business requirements and feature specifications

### Architecture Decision Records (ADRs)
Key architectural decisions that shaped this enterprise-grade solution:

- **[ADR-001: Performance Architecture](docs/adr/ADR-001-performance-architecture-batch-processing.md)** - Batch processing and performance optimization strategy
- **[ADR-002: Local Debugging Environment](docs/adr/ADR-002-local-debugging-environment.md)** - Development workflow without Google Apps Script
- **[ADR-003: Single File Architecture](docs/adr/ADR-003-single-file-architecture.md)** - Monolithic Code.gs design rationale
- **[ADR-004: Data Processing Architecture](docs/adr/ADR-004-data-processing-architecture.md)** - Efficient data structures and algorithms
- **[ADR-005: Deployment Automation](docs/adr/ADR-005-deployment-automation.md)** - GitHub Actions and clasp integration
- **[ADR-006: Configuration Management](docs/adr/ADR-006-configuration-management.md)** - Environment-agnostic configuration strategy

See **[ADR Index](docs/adr/README.md)** for complete architectural decision documentation.

## Development Commands

### Local Debugging (Enhanced in v2.2)
```bash
# Install dependencies for local debugging
npm install

# Test API connection locally
npm run test-api

# Generate full report (console output + file output)
npm run debug

# Compare batch vs sequential performance
npm run performance-test

# List available Quantive sessions
npm run list-sessions
```

The local debugging environment provides comprehensive mocking of Google Apps Script services, enabling rapid development and testing without deployment. See [ADR-002](docs/adr/ADR-002-local-debugging-environment.md) for implementation details.
