# Development Guide

## Local Debugging Setup

This project supports local debugging of the Quantive Export script without requiring the Google Apps Script environment. This enables rapid development, testing, and debugging using standard Node.js tools.

### Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure credentials:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual Quantive API credentials
   ```

3. **Test connection:**
   ```bash
   npm run test-api
   ```

### Available Commands

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run debug` | Run full report generation | Complete functionality testing |
| `npm run test-api` | Test API connection only | Verify credentials and connectivity |
| `npm run list-sessions` | List available sessions | Explore available data |
| `npm run performance-test` | Compare batch vs sequential processing | Optimization testing |

### Configuration

#### Environment Variables (.env file)

All configuration mirrors Google Apps Script properties:

```bash
# Required credentials
QUANTIVE_API_TOKEN=your_api_token_here
QUANTIVE_ACCOUNT_ID=your_account_id_here
SESSIONS=Q4 2024,Annual 2025

# Optional settings
GOOGLE_DOC_ID=your_google_doc_id_here
TEXT_FILE_ID=your_drive_file_id_here
LOOKBACK_DAYS=7
QUANTIVE_BASE_URL=https://app.us.quantive.com/results/api/v1
```

#### Getting Your Credentials

1. **API Token**: Quantive Settings → Integrations → Generate API Token
2. **Account ID**: Found in Quantive URL or account settings
3. **Sessions**: Use session names (e.g., "Q4 2024") or UUIDs
4. **Google Doc ID**: Create a Google Doc and extract ID from URL

### Mock Services Architecture

The local debugger provides comprehensive mocks for Google Apps Script services:

#### PropertiesService Mock
- **Source**: Reads from `.env` file
- **Behavior**: Maps environment variables to `getProperty()` calls
- **Compatibility**: 100% compatible with Google Apps Script implementation

#### UrlFetchApp Mock
- **Implementation**: Uses curl for synchronous HTTP requests
- **Behavior**: Matches Google Apps Script's synchronous behavior exactly
- **Headers**: Supports all standard HTTP headers and methods
- **Error Handling**: Maps curl exit codes to HTTP status codes

#### Logger Mock
- **Output**: Console with timestamps
- **Format**: `[ISO timestamp] message`
- **Level**: All log messages displayed

#### DocumentApp Mock
- **Output**: Formatted console output showing document structure
- **Features**: Shows paragraphs, list items, headings, and formatting
- **Benefit**: View document structure without creating real docs

#### DriveApp Mock
- **Output**: Writes files to `debug-output/` directory
- **Files**: Creates `snapshot-{fileId}.md` for text exports
- **Benefit**: Inspect generated markdown content locally

#### Utilities Mock
- **sleep()**: Real delays for testing rate limiting
- **Other utilities**: No-op implementations for compatibility

### Development Workflow

#### Rapid Iteration Cycle
```bash
# Initial setup
npm install
cp .env.example .env
# Edit .env with your credentials

# Development loop
npm run test-api     # Verify API connectivity
npm run debug        # Test full functionality  
# Make changes to Code.gs
npm run debug        # Test changes immediately
```

#### Debugging Capabilities

##### Console Output
- Real-time API request/response logging
- Document structure visualization
- Error messages with stack traces
- Performance timing information

##### File Output
- Generated markdown saved to `debug-output/`
- API response data (if logging enabled)
- Error logs and debugging information

##### Node.js Debugging
- Use `node --inspect local-debug.js` for debugger
- Set breakpoints in Code.gs classes
- Inspect variables and call stacks
- Step through API request/response cycles

### Benefits for Development

#### API Testing
- **Immediate Feedback**: Test API changes without deployment
- **Request Inspection**: See raw API requests and responses
- **Error Debugging**: Debug authentication and data issues locally
- **Rate Limiting**: Test rate limiting logic with real delays

#### Data Inspection
- **Session Data**: View available sessions and their metadata
- **Objective Hierarchy**: Inspect objective/key result relationships
- **User Resolution**: Test user ID to display name mapping
- **Task Processing**: Verify task fetching optimization logic

#### Performance Testing
- **Batch vs Sequential**: Compare processing approaches
- **Memory Usage**: Monitor Node.js memory consumption
- **API Call Patterns**: Analyze request frequency and timing
- **Large Dataset Testing**: Test with 400+ key results locally

#### Quick Iteration
- **No Deployment**: Test changes instantly without Google Apps Script deployment
- **Version Control**: Debug specific commits and branches locally
- **Multiple Environments**: Test different API endpoints and configurations
- **Parallel Development**: Work on features without affecting production

### Technical Implementation

#### Code Loading
The `local-debug.js` file loads `Code.gs` using a Function constructor approach:
- Preserves all class definitions and inheritance
- Makes functions available in global scope
- Handles Google Apps Script specific syntax
- Provides detailed error messages for loading issues

#### Synchronous HTTP Requests
Uses curl via `child_process.execSync` to match Google Apps Script's synchronous fetch behavior:
- Timeout handling (30 second default)
- Header support for authentication
- POST body support for API requests
- Error handling for network issues

#### Zero Code Changes
The original `Code.gs` file works unchanged because:
- All Google Apps Script services are globally mocked
- Class loading preserves inheritance and method binding
- Mock implementations match original service interfaces
- Environment detection allows conditional behavior if needed

### Important Notes

#### Compatibility
- **100% Code Compatibility**: No changes needed to Code.gs
- **Google Apps Script Deployment**: Still works normally in production
- **Testing Environment**: Separate from production configuration
- **Version Control**: .env files are gitignored for security

#### Limitations
- **Document Generation**: Console output only, no real Google Docs created
- **Drive Operations**: File output only, no real Drive API integration
- **Trigger Management**: No scheduled execution in local environment
- **Authentication**: Uses API tokens only, no OAuth flow testing

#### Security
- **Credential Isolation**: Local .env files never committed to git
- **API Token Scope**: Same security model as Google Apps Script
- **Network Requests**: Only to configured Quantive API endpoints
- **No Side Effects**: Read-only operations against Quantive API

### Troubleshooting

#### Common Issues

##### API Connection Failures
```bash
npm run test-api
# Check output for authentication errors
# Verify QUANTIVE_API_TOKEN and QUANTIVE_ACCOUNT_ID in .env
```

##### Session Not Found Errors
```bash
npm run list-sessions
# Verify session names match available sessions
# Check SESSIONS configuration in .env
```

##### Missing Dependencies
```bash
npm install
# Reinstall if node_modules directory is missing
# Check Node.js version (requires 14+)
```

##### Permission Errors
- Ensure `.env` file is readable
- Check file permissions on `debug-output/` directory
- Verify curl is available in system PATH

#### Debug Output

The `debug-output/` directory contains:
- `snapshot-{fileId}.md`: Generated markdown content
- Console logs show real-time processing
- Error messages include full stack traces
- API responses logged for debugging

### Migration Path

#### Local to Production
1. Test thoroughly with `npm run debug`
2. Copy Code.gs to Google Apps Script editor
3. Configure Script Properties to match .env values
4. Test in Google Apps Script environment
5. Deploy and configure triggers

#### Production to Local
1. Copy Script Properties values to .env
2. Run `npm run test-api` to verify connectivity
3. Use `npm run debug` to replicate production behavior
4. Debug issues locally before deploying fixes

## Development Commands

### Testing Framework
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests (requires real credentials)
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- ConfigManager.test.js

# Watch mode for development
npm test -- --watch
```

### Development Workflow

#### Local Development Approach (Recommended)
```bash
# Setup
npm install
cp .env.example .env
# Edit .env with credentials

# Rapid iteration cycle
npm run test-api          # Verify connectivity
npm run debug             # Test full functionality
# Make changes to Code.gs
npm run debug             # Test again
npm run performance-test  # Verify optimizations

# Deploy to Google Apps Script when ready
```

#### Traditional Workflow  
```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check for security vulnerabilities
npm audit

# Run all checks before deployment
npm run test:coverage && npm run lint
```

## Configuration Management

### Configuration Files
- `config.example.js`: Template with security best practices (legacy)
- `.env.example`: Local debugging credential template
- `.env.test.example`: Testing credential template
- Configuration loaded via `ConfigManager.getConfig()` or environment variables

### Local Development vs Google Apps Script Configuration

| Environment | Configuration Source | Setup Method |
|-------------|---------------------|--------------|
| Local Debug | `.env` file | `cp .env.example .env` |
| Google Apps Script | Script Properties | Manual entry in GAS console |
| Testing | `.env.test` file | `cp .env.test.example .env.test` |

Both environments use identical configuration keys - just different storage mechanisms.

### Real API Testing

#### Credential Setup
1. Copy `.env.test.example` to `.env.test`
2. Add real Quantive API credentials
3. Set `SKIP_API_TESTS=false` to enable integration tests
4. Integration tests automatically skip when credentials unavailable

#### Test Session Configuration
Set these in `.env.test` for comprehensive testing:
- `TEST_SESSION_NAME`: Known session name for resolution testing
- `TEST_SESSION_UUID`: Corresponding UUID for validation
- `TEST_INVALID_SESSION_NAME`: Non-existent session for error testing

## Google Apps Script Deployment

### Manual Deployment
1. Copy Code.gs content to Google Apps Script editor
2. Configure script properties via ConfigManager
3. Set up triggers via TriggerManager
4. Test with sample session data

### Configuration Validation
Run `ConfigManager.validateConfig()` after setup to verify all credentials and settings.

## Key Development Notes

### Code.gs Structure
- All classes defined in single file for Google Apps Script compatibility
- ES6 class syntax with proper inheritance
- Comprehensive JSDoc documentation
- Enterprise-level error handling and logging

### Testing Challenges
- **Class Loading**: Google Apps Script classes need special handling in Node.js
- **Service Mocking**: Comprehensive mocking of Google Apps Script services
- **Async Handling**: Managing async operations in both environments

## Development Philosophy

### Testing Approach
- Write the test before you write the feature or user experience
- There should never be a user experience that does not have a corresponding test
- The feature is not complete until the test passes