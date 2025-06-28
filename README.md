# Quantive Export

Google Apps Script tool that generates OKR reports from Quantive API data. Ideal for providing Quantive data to Gemini or Claude without the fuss of an MCP server.

## Features

- **Multi-session reports** - Generate reports across multiple OKR sessions
- **Hierarchical structure** - Displays objectives → key results → tasks with proper nesting
- **Google Docs output** - Creates formatted reports with native list structures
- **User name resolution** - Shows actual display names instead of user IDs
- **Task integration** - Includes tasks as sub-items under key results
- **Performance optimization** - Only fetches tasks when needed (checks taskCount)

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

3. **Configure credentials**:
   - Copy `config.example.gs` to `config.gs` in your project
   - Replace placeholder values with actual credentials
   - Set session names/UUIDs in `SESSIONS` array

4. **Create output document**:
   - Create a Google Doc for report output
   - Copy document ID from URL and set as `GOOGLE_DOC_ID`

5. **Run the report**:
   - Execute `generateQuantiveReport()` function
   - Check execution log for output document URL

## Configuration

Key settings in `config.gs`:

```javascript
const CONFIG = {
  QUANTIVE_API_TOKEN: 'your-api-token',
  QUANTIVE_ACCOUNT_ID: 'your-account-id',
  SESSIONS: ['Session Name'] or ['session-uuid'],
  GOOGLE_DOC_ID: 'document-id',
  QUANTIVE_BASE_URL: 'https://app.us.quantive.com/results/api/v1',
  LOOKBACK_DAYS: 7
};
```

## Output Format

Reports contain:
- Executive summary with progress statistics
- Status breakdown with color coding
- Hierarchical list of objectives, key results, and tasks
- Owner information and progress percentages
- Session context for multi-session reports

## API Usage

- Fetches sessions, objectives, key results, and tasks from Quantive API
- Resolves user IDs to display names
- Builds hierarchical relationships between objectives
- Only fetches tasks when `taskCount > 0` for efficiency

## Performance

- Handles large sessions (400+ key results)
- Optimized API calls with conditional task fetching
- Execution time under 5 minutes (Google Apps Script limit)
- Proper error handling and retry logic

## Testing

Run these functions to validate setup:
- `testApiConnection()` - Test API connectivity
- `listAvailableSessions()` - View available sessions
- `generateQuantiveReport()` - Generate full report

## File Structure

- `Code.gs` - Main application code
- `config.gs` - User configuration (not included, copy from example)
- `config.example.gs` - Configuration template
- `test/` - Test files and fixtures
- `CLAUDE.md` - Development documentation