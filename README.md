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
- No config files are used; configuration is set via Script Properties
- `test/` - Test files and fixtures
- `CLAUDE.md` - Development documentation