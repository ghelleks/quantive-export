# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quantive Export is an enterprise-grade Google Apps Script application for automated OKR (Objectives and Key Results) reporting. It integrates with Quantive Results' API to generate comprehensive reports in Google Docs and Sheets formats.

## Core Architecture

### System Components
- **Data Acquisition Layer**: QuantiveApiClient, ConfigManager, Authentication
- **Data Processing Layer**: DataProcessor, DataTransformUtils, Business Logic  
- **Reporting Layer**: GoogleDocsReportGenerator, GoogleSheetsReportGenerator
- **Automation Layer**: TriggerManager, ExecutionLogger, ErrorHandler

### Key Classes (Code.gs)
- `ConfigManager`: Environment-aware configuration with session name resolution
- `QuantiveApiClient`: REST API client with retry logic and rate limiting
- `DataProcessor`: Transforms raw API data into report-ready formats
- `GoogleDocsReportGenerator`: Creates formatted Word-style reports
- `GoogleSheetsReportGenerator`: Generates structured spreadsheet reports
- `TriggerManager`: Handles scheduled execution and automation

## Session Management System

The application supports flexible session identification:
- **Session Names**: User-friendly names like "Q4 2024 OKRs" 
- **UUID Resolution**: Automatically converts names to Quantive session UUIDs
- **Case-Insensitive Matching**: Handles variations in session name format
- **Validation**: Comprehensive session accessibility checking

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

## Testing Architecture

### Node.js Testing for Google Apps Script
- **Framework**: Jest with `gas-mock-globals` for Google Apps Script simulation
- **Code Loader**: Custom system in `test/setup/code-loader.js` to execute Code.gs in Node.js
- **Environment**: Mocks PropertiesService, UrlFetchApp, Logger, and other GAS services

### Test Structure
- **Unit Tests** (`test/unit/`): Isolated component testing with mocks
- **Integration Tests** (`test/integration/`): Real API calls with live credentials
- **Fixtures** (`test/fixtures/`): Mock data for consistent testing
- **Setup** (`test/setup/`): Test environment configuration and utilities

### Coverage Requirements
- **Branches**: 80%
- **Functions**: 85%
- **Lines**: 85%
- **Statements**: 85%

## Configuration Management

### Environment Support (v2.0)
- **Development**: Local testing with enhanced logging
- **Staging**: Pre-production validation 
- **Production**: Live deployment with optimized performance

### Security Features
- **Credential Validation**: API token format checking, placeholder detection
- **UUID Validation**: Session ID format verification
- **Secure Storage**: Uses Google's encrypted PropertiesService
- **Git Security**: Comprehensive .gitignore for credential protection

### Configuration Files
- `config.example.js`: Template with security best practices
- `.env.test.example`: Testing credential template
- Configuration loaded via `ConfigManager.getConfig()`

## Real API Testing

### Credential Setup
1. Copy `.env.test.example` to `.env.test`
2. Add real Quantive API credentials
3. Set `SKIP_API_TESTS=false` to enable integration tests
4. Integration tests automatically skip when credentials unavailable

### Test Session Configuration
Set these in `.env.test` for comprehensive testing:
- `TEST_SESSION_NAME`: Known session name for resolution testing
- `TEST_SESSION_UUID`: Corresponding UUID for validation
- `TEST_INVALID_SESSION_NAME`: Non-existent session for error testing

## Performance Characteristics

### Optimizations
- **Rate Limiting**: Intelligent delays between API calls
- **Retry Logic**: Exponential backoff for transient failures
- **Batch Processing**: Efficient handling of large datasets
- **Memory Management**: Streaming for 400+ key results processing

### Execution Targets
- **Small Sessions** (<50 KRs): Under 2 minutes
- **Large Sessions** (400+ KRs): Under 5 minutes
- **API Calls**: Throttled to respect Quantive rate limits

## Error Handling Strategy

### Error Classification
- **Network Errors**: Connectivity, timeouts, DNS issues
- **Authentication Errors**: Invalid tokens, expired credentials
- **Rate Limit Errors**: API quota exceeded
- **Server Errors**: Quantive API issues
- **Data Errors**: Invalid session IDs, missing objectives

### Recovery Mechanisms
- **Automatic Retry**: Exponential backoff for transient failures
- **Partial Recovery**: Preserve completed data on non-critical failures
- **Graceful Degradation**: Continue processing when possible
- **Comprehensive Logging**: Detailed error context for debugging

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

### Recent Enhancements (v2.0)
- Enhanced security and configuration management
- Comprehensive testing infrastructure 
- Session name to UUID resolution
- Environment-specific settings
- Performance optimizations for large datasets