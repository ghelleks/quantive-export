# Architecture Guide

This guide provides comprehensive technical documentation of the Quantive Export system architecture, focusing on performance optimization, data processing, and enterprise-grade design patterns.

## Architecture Decision Records (ADRs)

This architecture is guided by documented architectural decisions. Key ADRs that shaped the system design:

- **[ADR-001: Performance Architecture](adr/ADR-001-performance-architecture-batch-processing.md)** - Batch processing strategy for 4-5x speed improvements
- **[ADR-003: Single File Architecture](adr/ADR-003-single-file-architecture.md)** - Monolithic Code.gs design rationale  
- **[ADR-004: Data Processing Architecture](adr/ADR-004-data-processing-architecture.md)** - Efficient data structures and algorithms
- **[ADR-006: Configuration Management](adr/ADR-006-configuration-management.md)** - Environment-agnostic configuration strategy

See the complete [ADR Index](adr/README.md) for all architectural decisions.

## System Overview

Quantive Export is a high-performance Google Apps Script application designed for enterprise-scale OKR reporting. The system integrates with Quantive's REST API to generate comprehensive reports with exceptional performance optimization.

### Core Design Principles
- **Performance First**: Sub-90 second execution for most workloads
- **Enterprise Scale**: Handle 400+ key results efficiently
- **Fault Tolerance**: Graceful degradation and comprehensive error handling
- **Security Focus**: Encrypted credential storage and validation
- **Developer Experience**: Local debugging environment and comprehensive testing

## Architecture Components

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    Quantive Export System                   │
├─────────────────────────────────────────────────────────────┤
│  Configuration Layer                                        │
│  ├─ Script Properties (Production)                          │
│  ├─ Environment Variables (Local Debug)                     │
│  └─ Credential Validation & Security                        │
├─────────────────────────────────────────────────────────────┤
│  Data Acquisition Layer                                     │
│  ├─ BatchProcessor (Parallel API Processing)                │
│  ├─ QuantiveApiClient (REST Integration)                    │
│  ├─ User Name Cache (Performance Optimization)              │
│  └─ Session Resolution (Name → UUID)                        │
├─────────────────────────────────────────────────────────────┤
│  Data Processing Layer                                      │
│  ├─ Map-based Data Structures (O(1) Lookups)                │
│  ├─ Hierarchical Objective Building                         │
│  ├─ Progress Calculation Engine                             │
│  └─ Performance Mode Configuration                          │
├─────────────────────────────────────────────────────────────┤
│  Report Generation Layer                                    │
│  ├─ Google Docs Formatter                                   │
│  ├─ Markdown Generator                                       │
│  ├─ Multi-format Output                                     │
│  └─ Template Management                                      │
├─────────────────────────────────────────────────────────────┤
│  Automation & Monitoring Layer                             │
│  ├─ Trigger Management                                       │
│  ├─ Execution Logging                                       │
│  ├─ Performance Monitoring                                  │
│  └─ Error Handling & Recovery                               │
└─────────────────────────────────────────────────────────────┘
```

## Performance Architecture (v2.2)

For complete batch processing architecture rationale, see [ADR-001: Performance Architecture - Batch Processing](adr/ADR-001-performance-architecture-batch-processing.md).

### Batch Processing System

The v2.2 release introduced sophisticated batch processing for exceptional performance:

#### Core Components
```javascript
const BatchProcessor = {
  // Parallel API request processing
  processBatch: (requests, chunkSize = 25) => {
    // Split large batches into manageable chunks
    // Use UrlFetchApp.fetchAll() for parallel execution
    // Handle individual failures without affecting batch
  },
  
  // Intelligent fallback mechanisms
  processWithFallback: (requests) => {
    // Attempt batch processing first
    // Fall back to sequential processing if batch fails
    // Preserve completed data on partial failures
  }
};
```

#### Performance Characteristics
- **Parallel Processing**: UrlFetchApp.fetchAll() enables concurrent API calls
- **Chunk Optimization**: 25-request chunks balance throughput with API limits
- **Error Isolation**: Individual request failures don't cascade
- **Minimal Delays**: 50ms delays between chunks for maximum throughput
- **Intelligent Fallback**: Automatic degradation to sequential processing

### Performance Mode Configuration

Configurable optimization flags provide fine-tuned control:

```javascript
const PERFORMANCE_MODE = {
  SKIP_PROGRESS_HISTORY: true,     // Major speedup by skipping detailed history
  SKIP_SPARKLINES: true,           // Disable sparkline generation
  SKIP_KR_PROGRESS_HISTORY: true,  // Skip key result progress details
  USE_BULK_USER_FETCH: true       // Single bulk user API call
};
```

#### Performance Impact
| Mode | API Call Reduction | Time Savings | Use Case |
|------|-------------------|---------------|-----------|
| `SKIP_PROGRESS_HISTORY` | 60-80% | 30-50 seconds | Fast status snapshots |
| `SKIP_SPARKLINES` | 20-30% | 10-20 seconds | Text-only reports |
| `USE_BULK_USER_FETCH` | 90% | 20-40 seconds | Large user datasets |

### Data Processing Optimization

For detailed data structure and algorithm decisions, see [ADR-004: Data Processing Architecture](adr/ADR-004-data-processing-architecture.md).

#### Map-Based Data Structures
Traditional O(n) array operations replaced with O(1) Map lookups:

```javascript
// Before: O(n) array filtering
const user = users.find(u => u.id === userId);

// After: O(1) Map lookup
const userMap = new Map(users.map(u => [u.id, u]));
const user = userMap.get(userId);
```

#### Bulk User Fetching
Single API call replaces hundreds of individual requests:

```javascript
// Before: Individual user requests (400+ API calls)
for (const kr of keyResults) {
  const user = await fetchUser(kr.ownerId);
}

// After: Bulk user fetch (1 API call)
const allUsers = await fetchAllUsers(); // Up to 1000 users
const userMap = new Map(allUsers.map(u => [u.id, u]));
```

#### Intelligent Caching
User name cache prevents duplicate API calls within execution:

```javascript
const USER_NAME_CACHE = {};

function getUserName(userId) {
  if (USER_NAME_CACHE[userId]) {
    return USER_NAME_CACHE[userId]; // Cache hit
  }
  
  const user = userMap.get(userId);
  const displayName = user ? user.displayName : `User ${userId}`;
  USER_NAME_CACHE[userId] = displayName; // Cache store
  return displayName;
}
```

## Data Flow Architecture

### End-to-End Processing Pipeline
```
1. Configuration Loading & Validation
   ├─ Load from Script Properties or .env
   ├─ Validate API tokens and credentials
   ├─ Resolve session names to UUIDs
   └─ Configure performance optimizations

2. Data Acquisition (Batch Processing)
   ├─ Fetch session metadata
   ├─ Bulk fetch all users (single API call)
   ├─ Batch fetch objectives (parallel)
   ├─ Batch fetch key results (parallel)
   └─ Conditional task fetching (when taskCount > 0)

3. Data Processing & Transformation
   ├─ Build user lookup maps (O(1) access)
   ├─ Construct objective hierarchies
   ├─ Calculate progress metrics
   └─ Generate progress history (if enabled)

4. Report Generation
   ├─ Format Google Docs output
   ├─ Generate markdown content
   ├─ Apply templates and styling
   └─ Handle multi-format export

5. Output & Delivery
   ├─ Write to Google Docs
   ├─ Save markdown to Drive
   ├─ Log execution metrics
   └─ Handle errors and cleanup
```

### Session Management Architecture

#### Session Resolution System
```javascript
// Flexible session input handling
const sessionInput = "Q4 2024,Annual Planning,uuid-123";

// Automatic resolution process
const sessions = await resolveSessionInput(sessionInput);
// Returns: [
//   {name: "Q4 2024", uuid: "abc-123-def"},
//   {name: "Annual Planning", uuid: "ghi-456-jkl"},
//   {name: "uuid-123", uuid: "uuid-123"}
// ]
```

#### Multi-Session Processing
- **Cross-session hierarchy building**: Handle objectives spanning multiple sessions
- **Consolidated reporting**: Unified output across multiple planning periods
- **Session-specific context**: Maintain session metadata throughout processing
- **Validation**: Comprehensive session accessibility checking

## Error Handling & Recovery

### Error Classification System

```javascript
const ErrorTypes = {
  NETWORK_ERROR: 'Network connectivity or timeout',
  AUTH_ERROR: 'Authentication or authorization failure', 
  RATE_LIMIT_ERROR: 'API quota exceeded',
  SERVER_ERROR: 'Quantive API issues',
  DATA_ERROR: 'Invalid session IDs or missing data',
  CONFIG_ERROR: 'Invalid configuration or setup'
};
```

### Recovery Mechanisms

#### Exponential Backoff Strategy
```javascript
async function retryWithBackoff(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await Utilities.sleep(delay);
    }
  }
}
```

#### Graceful Degradation
- **Partial processing**: Continue with available data when possible
- **Feature fallbacks**: Disable non-critical features on errors
- **Progressive enhancement**: Add features based on available data
- **User communication**: Clear error messages and recovery suggestions

### Fault Tolerance Patterns

#### Circuit Breaker Pattern
```javascript
const CircuitBreaker = {
  state: 'CLOSED',
  failureCount: 0,
  lastFailureTime: null,
  
  call: async (operation) => {
    if (this.state === 'OPEN' && this.shouldTryReset()) {
      this.state = 'HALF_OPEN';
    }
    
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
};
```

## Performance Benchmarks

### Execution Time Analysis

#### v2.2 Performance Improvements
| Session Size | v2.1 (Sequential) | v2.2 (Batch) | Improvement |
|--------------|------------------|---------------|-------------|
| Small (<50 KRs) | 2-3 minutes | 60-70 seconds | 3-4x faster |
| Medium (50-200 KRs) | 3-4 minutes | 70-90 seconds | 4-5x faster |
| Large (400+ KRs) | 5+ minutes | 2-3 minutes | 2-3x faster |

#### API Efficiency Gains
- **User Fetching**: 90% reduction in API calls (400+ → 1 call)
- **Batch Processing**: 80% reduction in total execution time
- **Cache Hit Rate**: 95%+ for user name lookups
- **Parallel Execution**: 4-5x throughput improvement

### Memory Usage Optimization

#### Data Structure Efficiency
```javascript
// Memory-efficient Map usage for large datasets
const objectiveMap = new Map(); // O(1) lookups vs O(n) array.find()
const userMap = new Map();      // Efficient user data storage
const keyResultMap = new Map(); // Fast key result access

// Streaming processing for large datasets
function processInChunks(items, chunkSize = 100, processor) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    processor(chunk);
    // Allow garbage collection between chunks
  }
}
```

#### Memory Management
- **Chunked Processing**: Process large datasets in manageable chunks
- **Garbage Collection**: Strategic object cleanup between operations
- **Streaming**: Avoid loading entire datasets into memory simultaneously
- **Efficient Data Structures**: Use Maps and Sets for optimal performance

## Security Architecture

### Credential Management System

#### Multi-Layer Security
```javascript
const SecurityManager = {
  validateApiToken: (token) => {
    if (!token || token.includes('your-token-here')) {
      throw new Error('Invalid or placeholder API token');
    }
    if (token.length < 20 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
      throw new Error('API token format invalid');
    }
  },
  
  validateAccountId: (accountId) => {
    if (!accountId || accountId.includes('your-account')) {
      throw new Error('Invalid or placeholder account ID');
    }
  },
  
  sanitizeForLogging: (data) => {
    return JSON.stringify(data).replace(/Bearer\s+[^\s"]+/g, 'Bearer [REDACTED]');
  }
};
```

#### Secure Storage
- **Google Apps Script**: Encrypted PropertiesService for production
- **Local Development**: Environment variables with .gitignore protection
- **No Hardcoding**: All sensitive data externalized
- **Validation**: Format checking and placeholder detection

### Access Control & Auditing

#### Permission Management
- **Principle of Least Privilege**: Read-only API access where possible
- **Scope Limitation**: Restrict to necessary Quantive sessions only
- **Audit Trail**: Comprehensive logging of all operations
- **Access Monitoring**: Track authentication and authorization events

## Local Development Architecture

### Service Mocking Framework

The local debugging environment provides comprehensive Google Apps Script service mocking:

#### Core Mock Services
```javascript
// PropertiesService Mock
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => process.env[key],
    getProperties: () => process.env
  })
};

// UrlFetchApp Mock with batch support
global.UrlFetchApp = {
  fetch: (url, options) => curlRequest(url, options),
  fetchAll: (requests) => parallelCurlRequests(requests)
};

// Logger Mock with timestamps
global.Logger = {
  log: (message) => console.log(`[${new Date().toISOString()}] ${message}`)
};
```

#### Development Workflow Integration
- **Zero Code Changes**: Original Code.gs works unchanged
- **Real API Testing**: Actual Quantive API integration
- **Performance Testing**: Batch vs sequential comparison
- **File Output**: Generated content saved to debug-output/
- **Console Debugging**: Real-time processing visualization

### Testing Framework Architecture

#### Multi-Environment Testing
```javascript
const TestEnvironment = {
  local: {
    configSource: '.env',
    mockServices: true,
    realApiCalls: true
  },
  
  googleAppsScript: {
    configSource: 'PropertiesService',
    mockServices: false,
    realApiCalls: true
  },
  
  unittest: {
    configSource: 'fixtures',
    mockServices: true,
    realApiCalls: false
  }
};
```

## Integration Patterns

### External System Integration

#### API Integration Pattern
```javascript
class QuantiveApiClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.headers = {
      'Authorization': `Bearer ${config.apiToken}`,
      'Gtmhub-AccountId': config.accountId
    };
  }
  
  async batchRequest(requests) {
    const responses = await UrlFetchApp.fetchAll(requests);
    return responses.map(this.parseResponse);
  }
  
  parseResponse(response) {
    if (response.getResponseCode() !== 200) {
      throw new Error(`API error: ${response.getResponseCode()}`);
    }
    return JSON.parse(response.getContentText());
  }
}
```

#### Output Integration Pattern
```javascript
class OutputManager {
  constructor(config) {
    this.googleDocId = config.googleDocId;
    this.textFileId = config.textFileId;
  }
  
  async generateReports(data) {
    const promises = [];
    
    if (this.googleDocId) {
      promises.push(this.generateGoogleDocReport(data));
    }
    
    if (this.textFileId) {
      promises.push(this.generateMarkdownReport(data));
    }
    
    return Promise.all(promises);
  }
}
```

## Deployment Architecture

### Multi-Environment Strategy

#### Environment Configuration
```javascript
const EnvironmentConfig = {
  development: {
    performanceOptimizations: false,
    detailedLogging: true,
    mockExternalServices: true
  },
  
  staging: {
    performanceOptimizations: true,
    detailedLogging: true,
    mockExternalServices: false
  },
  
  production: {
    performanceOptimizations: true,
    detailedLogging: false,
    mockExternalServices: false
  }
};
```

#### Deployment Pipeline
1. **Local Development**: Real-time debugging and testing
2. **Staging Validation**: Full integration testing with production-like data
3. **Production Deployment**: Automated via GitHub Actions or manual
4. **Monitoring & Alerting**: Performance tracking and error notification

## Performance Monitoring

### Execution Metrics Collection

#### Built-in Performance Tracking
```javascript
const PerformanceMonitor = {
  startTime: null,
  metrics: {},
  
  start: (operation) => {
    PerformanceMonitor.startTime = new Date().getTime();
    Logger.log(`Starting ${operation}...`);
  },
  
  end: (operation) => {
    const duration = new Date().getTime() - PerformanceMonitor.startTime;
    Logger.log(`Completed ${operation} in ${duration}ms`);
    PerformanceMonitor.metrics[operation] = duration;
  },
  
  summary: () => {
    const total = Object.values(PerformanceMonitor.metrics).reduce((a, b) => a + b, 0);
    Logger.log(`Total execution time: ${total}ms`);
    return PerformanceMonitor.metrics;
  }
};
```

#### Key Performance Indicators
- **Total Execution Time**: End-to-end processing duration
- **API Call Efficiency**: Batch success rates and timing
- **Cache Hit Rates**: User name cache effectiveness
- **Memory Usage**: Efficient data structure utilization
- **Error Rates**: Success vs failure ratios

## Scaling Considerations

### Horizontal Scaling Patterns

#### Session-Based Partitioning
- **Split Large Sessions**: Process multiple sessions in separate executions
- **Time-Based Partitioning**: Distribute processing across time windows
- **Parallel Session Processing**: Handle independent sessions simultaneously

#### Vertical Scaling Optimizations
- **Memory Optimization**: Efficient data structures and garbage collection
- **CPU Optimization**: Batch processing and parallel operations
- **I/O Optimization**: Minimize API calls and maximize batch efficiency

### Enterprise Scale Considerations

#### Multi-Tenant Architecture
- **Account Isolation**: Separate configurations per Quantive account
- **Resource Allocation**: Fair sharing of API quotas and execution time
- **Security Boundaries**: Isolated credential storage per tenant

#### Monitoring & Observability
- **Execution Logging**: Comprehensive operation tracking
- **Performance Metrics**: Real-time performance monitoring  
- **Alert Systems**: Automated notification of issues or failures
- **Capacity Planning**: Proactive scaling based on usage patterns

This architecture enables the Quantive Export system to handle enterprise-scale OKR reporting requirements while maintaining exceptional performance, security, and reliability standards.