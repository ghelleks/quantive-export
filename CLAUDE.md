# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quantive Export is an enterprise-grade Google Apps Script application for automated OKR (Objectives and Key Results) reporting. It integrates with Quantive Results' API to generate comprehensive reports in Google Docs and Sheets formats.

For detailed architectural rationale and technical decisions, see the **[Architecture Decision Records (ADRs)](docs/adr/README.md)**, which document the key design choices that shaped this enterprise-grade solution.

## Core Architecture

The architecture follows key design decisions documented in ADRs. Key architectural choices include:

- **[Single File Architecture](docs/adr/ADR-003-single-file-architecture.md)**: Monolithic Code.gs design for Google Apps Script optimization
- **[Performance Architecture](docs/adr/ADR-001-performance-architecture-batch-processing.md)**: Batch processing strategy for 4-5x speed improvements
- **[Data Processing Architecture](docs/adr/ADR-004-data-processing-architecture.md)**: Efficient data structures and algorithms
- **[Configuration Management](docs/adr/ADR-006-configuration-management.md)**: Environment-agnostic configuration strategy

### System Components
- **Data Acquisition Layer**: Batch API processing, bulk user fetching, intelligent caching (ADR-001)
- **Data Processing Layer**: Map-based lookups, hierarchical objective building, performance optimization (ADR-004)
- **Reporting Layer**: Google Docs formatting, plain text snapshots, multi-session support
- **Performance Layer**: BatchProcessor utility, configurable performance modes, parallel execution (ADR-001)
- **Automation Layer**: Trigger management, comprehensive logging, error handling (ADR-005)

### Key Classes and Components (Code.gs)
- **Configuration System**: Script Properties-based configuration with validation
- **BatchProcessor**: Utility class for parallel API request processing
- **Performance Optimization**: PERFORMANCE_MODE flags for configurable speed vs. detail trade-offs
- **Data Fetching**: Optimized session data fetching with batch processing fallback
- **User Management**: Bulk user fetching with caching to minimize API calls
- **Hierarchy Processing**: Intelligent objective hierarchy building with cross-session support
- **Report Generation**: Google Docs and plain text markdown output formats
- **Progress Tracking**: Sparkline generation and progress history analysis (configurable)

## Session Management System

The application supports flexible session identification:
- **Session Names**: User-friendly names like "Q4 2024 OKRs" 
- **UUID Resolution**: Automatically converts names to Quantive session UUIDs
- **Case-Insensitive Matching**: Handles variations in session name format
- **Multi-Session Support**: Process multiple sessions in single report
- **Cross-Session Hierarchy**: Handle objectives spanning multiple sessions
- **Validation**: Comprehensive session accessibility checking

## Development Commands

For complete local debugging architecture details, see [ADR-002: Local Debugging Environment](docs/adr/ADR-002-local-debugging-environment.md).

### Branch Strategy
- **main**: Production branch - stable, deployed code
- **dev**: Development branch - active development and feature integration

### Local Debugging (Enhanced in v2.2)
```bash
# Install dependencies for local debugging
npm install

# Test API connection locally
npm run test-api

# List available Quantive sessions
npm run list-sessions

# Generate full report (console output + file output)
npm run debug

# Compare batch vs sequential performance (NEW)
npm run performance-test
```

### Local Debugging Commands
```bash
# Core debugging commands
npm run debug             # Generate full report with local output
npm run test-api          # Test API connectivity and authentication
npm run list-sessions     # List all available Quantive sessions
npm run performance-test  # Compare batch vs sequential processing performance

# Performance monitoring
# All commands output timing information and performance metrics
# Use debug-output/ directory to examine generated content locally
```

### Development Workflow
```bash
# Install dependencies
npm install

# Local development iteration cycle:
npm run test-api           # Verify API connectivity
npm run debug             # Test report generation
npm run performance-test   # Compare batch vs sequential performance
# Make changes to Code.gs
npm run debug             # Test again

# Performance monitoring commands:
npm run list-sessions     # List available sessions for testing
npm run performance-test  # Benchmark current optimizations

# Deployment validation
# Test with various session sizes to validate performance targets
```

## Major Performance Improvements (v2.2)

For detailed performance architecture decisions, see [ADR-001: Performance Architecture](docs/adr/ADR-001-performance-architecture-batch-processing.md) and [ADR-004: Data Processing Architecture](docs/adr/ADR-004-data-processing-architecture.md).

### Performance Achievement Summary
Recent optimizations have achieved **90-second execution targets** with **4-5x speed improvements**:

- **Batch API Processing**: Replaced sequential API calls with parallel UrlFetchApp.fetchAll()
- **Bulk User Fetching**: Single API call for all users instead of individual requests
- **Intelligent Caching**: User name cache prevents duplicate API calls
- **Map-Based Data Structures**: O(1) lookups replace O(n) array filtering
- **Configurable Performance Modes**: Skip expensive operations when speed is prioritized
- **Minimal Rate Limiting**: Reduced delays to 50ms between chunks for maximum throughput

### Performance Benchmarks
- **Small Sessions** (<50 KRs): **60-70 seconds** (previously 2+ minutes)
- **Medium Sessions** (50-200 KRs): **70-90 seconds** (previously 3+ minutes)  
- **Large Sessions** (400+ KRs): **Under 3 minutes** (previously 5+ minutes)
- **API Efficiency**: **90% reduction** in total API calls through bulk operations
- **Data Processing**: **50% faster** through optimized data structures

### Implementation Highlights
- **BatchProcessor Utility**: Handles chunked parallel processing with error isolation
- **Performance Mode Flags**: SKIP_PROGRESS_HISTORY, SKIP_SPARKLINES, USE_BULK_USER_FETCH
- **Fallback Strategy**: Automatic degradation to sequential processing when batch fails
- **Memory Optimization**: Efficient Map usage for large dataset processing

## Performance Architecture (v2.2)

### Batch Processing System
The application now uses sophisticated batch processing for maximum performance:

- **Parallel API Calls**: UrlFetchApp.fetchAll() processes multiple requests simultaneously
- **Chunked Execution**: Large batches split into 25-request chunks to respect API limits
- **Intelligent Fallback**: Automatic fallback to sequential processing if batch fails
- **Error Isolation**: Individual request failures don't affect entire batch
- **Minimal Delays**: Only 50ms delays between chunks for optimal throughput

### Performance Mode Configuration
Configurable optimization flags in PERFORMANCE_MODE object:

- **SKIP_PROGRESS_HISTORY**: Disable progress history fetching for major speed boost
- **SKIP_SPARKLINES**: Disable sparkline generation for faster processing
- **SKIP_KR_PROGRESS_HISTORY**: Skip key result progress history specifically
- **USE_BULK_USER_FETCH**: Enable single bulk user API call instead of individual calls

### Caching and Optimization
- **User Name Cache**: Prevents duplicate user API calls within execution
- **Map-Based Lookups**: O(1) data retrieval using Map objects instead of array filters
- **Bulk User Fetching**: Single API call retrieves all users (up to 1000) at once
- **Efficient Data Structures**: Optimized object relationships and hierarchy building

## Local Debugging Architecture (v2.1)

### Overview
The local debugging system allows development and testing of Code.gs without Google Apps Script environment:

- **Zero Code Changes**: Original Code.gs works unchanged in both environments
- **Service Mocking**: Comprehensive mocks for all Google Apps Script services
- **Environment Mapping**: .env file maps to Script Properties seamlessly
- **Console Output**: Real-time debugging with formatted console output
- **File Output**: Debug outputs saved to `debug-output/` directory
- **Performance Testing**: Compare batch vs sequential processing locally

### Mock Services
- **PropertiesService**: Reads from `.env` instead of Script Properties
- **UrlFetchApp**: Synchronous curl-based HTTP with fetchAll() batch support
- **Logger**: Console output with timestamps
- **DocumentApp**: Console output with document structure simulation
- **DriveApp**: File output to `debug-output/` directory for content inspection
- **Utilities.sleep()**: Real delays for batch processing testing
- **ScriptApp**: Mock trigger creation for automation testing

### Local Configuration Setup
1. Create `.env` file with required environment variables
2. Configure credentials (same values as Script Properties)
3. Run `npm run test-api` to verify connectivity
4. Use `npm run debug` for full report generation
5. Use `npm run performance-test` to benchmark optimizations

### Benefits
- **API Testing**: Verify Quantive API integration locally
- **Data Inspection**: See raw API responses and processed data in console
- **Performance Testing**: Compare batch vs sequential processing approaches
- **Batch Debugging**: Test parallel API processing and error handling
- **Quick Iteration**: No deployment needed for testing performance optimizations
- **Full Debugging**: Use Node.js debugging tools and breakpoints
- **Output Validation**: Inspect generated markdown files in debug-output/ directory

## Performance Testing and Monitoring

### Local Performance Testing
The system includes built-in performance testing capabilities:

- **Batch vs Sequential Comparison**: Compare processing methods with identical data
- **Execution Time Tracking**: Detailed timing for each operation phase
- **Throughput Measurement**: Requests per second and success rate monitoring
- **Data Consistency Validation**: Ensure optimization doesn't affect result accuracy
- **Performance Regression Detection**: Identify when changes impact performance

### Performance Metrics
Key metrics tracked during execution:

- **Total Execution Time**: End-to-end processing duration
- **API Call Efficiency**: Batch success rates and timing
- **Memory Usage**: Efficient data structure utilization
- **Cache Hit Rates**: User name cache effectiveness
- **Chunk Processing**: Batch chunk timing and throughput

### Benchmarking Results
Typical performance improvements achieved:

- **4-5x Speed Improvement**: Compared to sequential processing
- **90% Reduction in API Calls**: Through bulk user fetching
- **50% Faster Data Processing**: Using Map-based lookups
- **Consistent Sub-90s Execution**: For most session sizes

## Configuration Management

For complete configuration architecture details, see [ADR-006: Configuration Management](docs/adr/ADR-006-configuration-management.md).

### Environment Support (v2.0)
- **Development**: Local testing with enhanced logging
- **Staging**: Pre-production validation 
- **Production**: Live deployment with optimized performance

### Security Features
- **Credential Validation**: API token format checking, placeholder detection
- **UUID Validation**: Session ID format verification
- **Secure Storage**: Uses Google's encrypted PropertiesService (ADR-006)
- **Git Security**: Comprehensive .gitignore for credential protection

### Configuration Management
- **No Config Files**: All configuration via Script Properties or environment variables (ADR-006)
- **Unified Configuration**: Same settings work for both local debugging and Google Apps Script
- **Validation**: Built-in credential and session validation with detailed error messages
- **Flexible Session Input**: Supports session names, UUIDs, CSV format, or JSON arrays
- **Multiple Export Targets**: Google Docs, text files, or both simultaneously
- **Performance Tuning**: Configurable optimization flags for different use cases

## Configuration and Setup

### Environment Variables
Required environment variables for local debugging (in `.env` file):

- `QUANTIVE_API_TOKEN`: Your Quantive API authentication token
- `QUANTIVE_ACCOUNT_ID`: Your Quantive account identifier
- `SESSIONS`: Session names or UUIDs (comma-separated or JSON array)
- `GOOGLE_DOC_ID`: Target Google Doc ID for report output (optional)
- `TEXT_FILE_ID`: Target text file ID for markdown output (optional)
- `QUANTIVE_BASE_URL`: API base URL (defaults to US endpoint)
- `LOOKBACK_DAYS`: Days for recent activity tracking (default: 7)

### Production Configuration
For Google Apps Script deployment, set identical values in Script Properties:

1. Open Extensions → Apps Script
2. Go to Project Settings → Script properties
3. Add each environment variable as a script property
4. Use the same keys and values as local `.env` file

## Performance Characteristics

### Optimizations
- **Batch API Processing**: Parallel execution using UrlFetchApp.fetchAll() with 25-request chunks
- **Bulk User Fetching**: Single API call for all user data instead of individual requests
- **Performance Mode Flags**: Configurable skipping of expensive operations (sparklines, progress history)
- **Intelligent Caching**: User name cache prevents duplicate API calls
- **Map-Based Lookups**: O(1) data retrieval replacing O(n) filter operations
- **Minimal Rate Limiting**: Reduced delays (50ms) for maximum throughput
- **Memory Optimization**: Efficient data structures for large dataset processing
- **Retry Logic**: Exponential backoff for transient failures

### Execution Targets
- **Small Sessions** (<50 KRs): Under 90 seconds
- **Medium Sessions** (50-200 KRs): Under 2 minutes  
- **Large Sessions** (400+ KRs): Under 3 minutes
- **Performance Achievement**: 4-5x speed improvement through optimizations
- **API Calls**: Intelligent batching with minimal delays (50ms between chunks)

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

For automated deployment strategies, see [ADR-005: Deployment Automation](docs/adr/ADR-005-deployment-automation.md).

### Manual Deployment
1. Copy Code.gs content to Google Apps Script editor
2. Configure Script Properties with same values from local `.env` (ADR-006)
3. Set up triggers using `setupWeeklyTrigger()` function
4. Test with sample session data using `generateQuantiveReport()`
5. Monitor execution time to ensure <90s performance targets are met

### Configuration Validation
- Run `testApiConnection()` to verify credentials and API access
- Run `listAvailableSessions()` to confirm session accessibility
- Use `performanceTest()` to benchmark batch vs sequential performance in GAS environment

### Performance Monitoring
- Monitor Apps Script execution logs for timing information
- Typical execution should complete in 60-90 seconds for most sessions
- Batch processing provides 4-5x improvement over sequential processing

## Key Development Notes

### Code.gs Structure
- Single file architecture optimized for Google Apps Script execution (ADR-003)
- Performance-focused design with configurable optimization flags (ADR-001)
- Batch processing utilities with intelligent chunking and error handling (ADR-001)
- Comprehensive logging for performance monitoring and debugging
- Map-based data structures for efficient large dataset processing (ADR-004)

### Performance Considerations
- **Batch Size Optimization**: 25-request chunks balance throughput with API limits
- **Memory Efficiency**: Map-based data structures for O(1) lookups
- **Cache Strategy**: User name caching prevents redundant API calls
- **Error Isolation**: Individual batch failures don't cascade
- **Fallback Strategy**: Automatic degradation to sequential processing when needed

### Recent Enhancements (v2.0-2.2)
- Enhanced security and configuration management (v2.0)
- Comprehensive testing infrastructure (v2.0)
- Session name to UUID resolution (v2.0)
- Environment-specific settings (v2.0)
- Local debugging environment with service mocking (v2.1)
- Node.js development workflow without Google Apps Script (v2.1)
- Real-time console debugging and file output (v2.1)
- **Major Performance Overhaul (v2.2)**:
  - Batch API processing with UrlFetchApp.fetchAll()
  - 4-5x speed improvement through parallel operations
  - <90s execution for most sessions
  - Bulk user fetching and intelligent caching
  - Configurable performance mode flags
  - Map-based data structures for O(1) lookups

## Development Philosophy

### Testing Approach
- Write the test before you write the feature or user experience
- There should never be a user experience that does not have a corresponding test
- The feature is not complete until the test passes

## Assistant Guidelines

When helping users with this project:

1. **Refer to Structured Documentation**: Direct users to appropriate guides in the docs/ directory
2. **Focus on Current Version**: All guidance should reflect v2.2 architecture and performance features
3. **Troubleshooting First**: For issues, check [Troubleshooting Guide](docs/troubleshooting.md) before diving deep
4. **Performance Context**: Emphasize the performance improvements and optimization options available
5. **Environment Awareness**: Distinguish between local development and Google Apps Script deployment contexts

### Quick Help References
- **Setup Issues**: → [Setup Guide](docs/setup-guide.md)
- **Development Questions**: → [Development Guide](docs/development-guide.md) and [ADR-002](docs/adr/ADR-002-local-debugging-environment.md)
- **Deployment Problems**: → [Deployment Guide](docs/deployment-guide.md) and [ADR-005](docs/adr/ADR-005-deployment-automation.md)
- **Technical Details**: → [Architecture Guide](docs/architecture.md) and [ADR Index](docs/adr/README.md)
- **Performance Questions**: → [ADR-001](docs/adr/ADR-001-performance-architecture-batch-processing.md) and [ADR-004](docs/adr/ADR-004-data-processing-architecture.md)
- **Configuration Issues**: → [ADR-006](docs/adr/ADR-006-configuration-management.md)
- **Troubleshooting**: → [Troubleshooting Guide](docs/troubleshooting.md)

### Important Constraints
- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for achieving the goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested