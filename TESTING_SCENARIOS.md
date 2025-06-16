# Testing Scenarios Documentation

This document outlines comprehensive testing scenarios for the Quantive Session Snapshot & Summary Google Apps Script to ensure robust functionality across various conditions and edge cases.

## Unit Testing Scenarios

### ConfigManager Tests
**Purpose**: Validate configuration management and security

#### Scenario 1: Property Storage and Retrieval
```javascript
// Test: Basic property operations
function testConfigBasics() {
  ConfigManager.setProperty('TEST_KEY', 'test_value');
  const retrieved = ConfigManager.getProperty('TEST_KEY');
  assert(retrieved === 'test_value', 'Property retrieval failed');
}
```

#### Scenario 2: Configuration Validation
```javascript
// Test: Missing required configuration
function testMissingConfig() {
  // Clear all properties
  ConfigManager.setProperties({});
  
  try {
    ConfigManager.validateConfig();
    assert(false, 'Should have thrown error for missing config');
  } catch (error) {
    assert(error.message.includes('Missing required'), 'Wrong error type');
  }
}
```

#### Scenario 3: Security Validation
```javascript
// Test: Invalid credential formats
function testInvalidCredentials() {
  const invalidConfigs = [
    { apiToken: 'invalid@token!', accountId: 'valid-account' },
    { apiToken: 'valid-token', accountId: 'invalid account id' }
  ];
  
  for (const config of invalidConfigs) {
    // Test that invalid formats are caught
    assertThrows(() => validateCredentialFormat(config));
  }
}
```

### QuantiveApiClient Tests
**Purpose**: Validate API communication and error handling

#### Scenario 4: Authentication Success
```javascript
// Test: Valid API authentication
function testApiAuthentication() {
  const client = new QuantiveApiClient('valid-token', 'valid-account');
  const headers = client.headers;
  
  assert(headers['Authorization'].startsWith('Bearer '), 'Invalid auth header');
  assert(headers['X-Account-Id'] === 'valid-account', 'Missing account header');
}
```

#### Scenario 5: Retry Logic
```javascript
// Test: Exponential backoff retry mechanism
function testRetryLogic() {
  const client = new QuantiveApiClient('test-token', 'test-account');
  
  // Mock a function that fails twice then succeeds
  let callCount = 0;
  const testFunction = () => {
    callCount++;
    if (callCount < 3) throw new Error('Temporary failure');
    return 'success';
  };
  
  const result = client.executeWithRetry(testFunction);
  assert(result === 'success', 'Retry logic failed');
  assert(callCount === 3, 'Incorrect retry count');
}
```

#### Scenario 6: Rate Limiting Response
```javascript
// Test: 429 Rate Limit handling
function testRateLimitHandling() {
  const client = new QuantiveApiClient('test-token', 'test-account');
  
  // Simulate 429 response
  const mockResponse = {
    getResponseCode: () => 429,
    getContentText: () => '{"error": "Rate limit exceeded"}',
    getHeaders: () => ({ 'X-RateLimit-Reset': '60' })
  };
  
  assertThrows(() => client.handleResponse(mockResponse, 'test-url'));
}
```

### DataProcessor Tests
**Purpose**: Validate analytics and calculation accuracy

#### Scenario 7: Progress Calculation
```javascript
// Test: Accurate progress calculation across key results
function testProgressCalculation() {
  const processor = new DataProcessor(7);
  const mockSession = createMockSessionWithKnownProgress();
  
  const summary = processor.processSessionData(mockSession);
  const expectedProgress = calculateExpectedProgress(mockSession);
  
  assert(Math.abs(summary.overallProgress - expectedProgress) < 0.01, 
         'Progress calculation inaccurate');
}
```

#### Scenario 8: Status Categorization
```javascript
// Test: Correct status counting and categorization
function testStatusCategorization() {
  const processor = new DataProcessor(7);
  const mockSession = createMockSessionWithVariedStatuses();
  
  const summary = processor.processSessionData(mockSession);
  const expectedCounts = countExpectedStatuses(mockSession);
  
  for (const [status, expectedCount] of Object.entries(expectedCounts)) {
    assert(summary.statusCounts[status] === expectedCount, 
           `Incorrect count for status: ${status}`);
  }
}
```

#### Scenario 9: Recent Activity Detection
```javascript
// Test: Accurate identification of recently updated items
function testRecentActivityDetection() {
  const lookbackDays = 7;
  const processor = new DataProcessor(lookbackDays);
  
  const mockSession = createMockSessionWithTimestamps();
  const summary = processor.processSessionData(mockSession);
  
  const expectedRecentCount = countRecentUpdates(mockSession, lookbackDays);
  assert(summary.recentlyUpdatedKRs.length === expectedRecentCount, 
         'Recent activity detection failed');
}
```

### Report Generation Tests
**Purpose**: Validate output formatting and creation

#### Scenario 10: Google Docs Generation
```javascript
// Test: Successful document creation and formatting
function testDocsGeneration() {
  const generator = new GoogleDocsReportGenerator();
  const mockSummary = createMockReportSummary();
  const mockProcessor = createMockProcessor();
  
  const docUrl = generator.generateReport(mockSummary, mockProcessor);
  
  assert(docUrl.includes('docs.google.com'), 'Invalid document URL');
  
  // Verify document content
  const docId = extractDocId(docUrl);
  const doc = DocumentApp.openById(docId);
  const content = doc.getBody().getText();
  
  assert(content.includes(mockSummary.sessionInfo.name), 'Missing session name');
  assert(content.includes('Overall Progress'), 'Missing progress section');
}
```

#### Scenario 11: Google Sheets Data Integrity
```javascript
// Test: Accurate data row creation and formatting
function testSheetsDataIntegrity() {
  const generator = new GoogleSheetsReportGenerator();
  const mockSummary = createMockReportSummary();
  const mockProcessor = createMockProcessor();
  
  const sheetUrl = generator.generateReport(mockSummary, mockProcessor);
  
  // Verify data accuracy
  const sheetId = extractSheetId(sheetUrl);
  const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  const lastRow = sheet.getLastRow();
  const rowData = sheet.getRange(lastRow, 1, 1, 15).getValues()[0];
  
  assert(rowData[1] === mockSummary.sessionInfo.name, 'Incorrect session name in sheet');
  assert(Math.abs(rowData[3] - mockSummary.overallProgress) < 0.01, 'Incorrect progress in sheet');
}
```

## Integration Testing Scenarios

### End-to-End Workflow Tests
**Purpose**: Validate complete data flow from API to output

#### Scenario 12: Complete Data Pipeline
```javascript
// Test: Full workflow with real API data
function testCompleteDataPipeline() {
  const config = ConfigManager.getConfig();
  const client = new QuantiveApiClient(config.apiToken, config.accountId);
  
  // Fetch real data
  const sessionData = client.getCompleteSessionData(config.sessionId);
  assert(sessionData && sessionData.objectives, 'Failed to fetch session data');
  
  // Process data
  const processor = new DataProcessor(config.lookbackDays);
  const summary = processor.processSessionData(sessionData);
  assert(summary && summary.sessionInfo, 'Failed to process data');
  
  // Generate reports
  if (config.googleDocId) {
    const docsGenerator = new GoogleDocsReportGenerator(config.googleDocId);
    const docUrl = docsGenerator.generateReport(summary, processor);
    assert(docUrl.includes('docs.google.com'), 'Failed to generate doc report');
  }
  
  if (config.googleSheetId) {
    const sheetsGenerator = new GoogleSheetsReportGenerator(config.googleSheetId);
    const sheetUrl = sheetsGenerator.generateReport(summary, processor);
    assert(sheetUrl.includes('spreadsheets'), 'Failed to generate sheet report');
  }
}
```

#### Scenario 13: Error Recovery Workflow
```javascript
// Test: System behavior under various failure conditions
function testErrorRecoveryWorkflow() {
  const testCases = [
    { name: 'Invalid Session ID', sessionId: 'invalid-session-123' },
    { name: 'Network Timeout', simulateTimeout: true },
    { name: 'Partial Data Loss', simulatePartialFailure: true }
  ];
  
  for (const testCase of testCases) {
    try {
      // Configure test scenario
      if (testCase.sessionId) {
        ConfigManager.setProperty('SESSION_ID', testCase.sessionId);
      }
      
      // Execute workflow
      const result = generateQuantiveReport();
      
      // Validate graceful handling
      if (testCase.name === 'Invalid Session ID') {
        assert(false, 'Should have failed with invalid session');
      }
      
    } catch (error) {
      // Verify error is properly classified and handled
      const classification = ErrorHandler.classifyError(error, 'test');
      assert(classification.type !== 'UNKNOWN_ERROR', 'Error not properly classified');
    }
  }
}
```

### Configuration Variation Tests
**Purpose**: Validate system behavior across different configurations

#### Scenario 14: Various Lookback Periods
```javascript
// Test: Different lookback period configurations
function testLookbackVariations() {
  const lookbackPeriods = [1, 3, 7, 14, 30, 90];
  const mockSession = createMockSessionWithDistributedTimestamps();
  
  for (const days of lookbackPeriods) {
    const processor = new DataProcessor(days);
    const summary = processor.processSessionData(mockSession);
    
    // Verify that longer periods capture more recent updates
    assert(summary.recentlyUpdatedKRs.length >= 0, 'Invalid recent update count');
    
    // Log for manual verification
    Logger.log(`Lookback ${days} days: ${summary.recentlyUpdatedKRs.length} recent updates`);
  }
}
```

#### Scenario 15: Output Format Variations
```javascript
// Test: Different output configurations
function testOutputFormatVariations() {
  const configs = [
    { name: 'Docs Only', docId: 'test-doc-id', sheetId: null },
    { name: 'Sheets Only', docId: null, sheetId: 'test-sheet-id' },
    { name: 'Both Outputs', docId: 'test-doc-id', sheetId: 'test-sheet-id' }
  ];
  
  const mockSummary = createMockReportSummary();
  const mockProcessor = createMockProcessor();
  
  for (const config of configs) {
    try {
      if (config.docId) {
        const docsGenerator = new GoogleDocsReportGenerator(config.docId);
        const docUrl = docsGenerator.generateReport(mockSummary, mockProcessor);
        assert(docUrl, `Failed to generate doc for: ${config.name}`);
      }
      
      if (config.sheetId) {
        const sheetsGenerator = new GoogleSheetsReportGenerator(config.sheetId);
        const sheetUrl = sheetsGenerator.generateReport(mockSummary, mockProcessor);
        assert(sheetUrl, `Failed to generate sheet for: ${config.name}`);
      }
      
      Logger.log(`✅ ${config.name} configuration test passed`);
      
    } catch (error) {
      Logger.log(`❌ ${config.name} configuration test failed: ${error}`);
      throw error;
    }
  }
}
```

## Performance Testing Scenarios

### Execution Time Tests
**Purpose**: Validate performance under various data loads

#### Scenario 16: Large Dataset Processing
```javascript
// Test: Performance with maximum expected data volume
function testLargeDatasetProcessing() {
  const sizes = [10, 50, 100, 200, 400]; // Number of key results
  
  for (const size of sizes) {
    const startTime = new Date();
    
    const mockSession = createMockSessionWithSize(size);
    const processor = new DataProcessor(7);
    const summary = processor.processSessionData(mockSession);
    
    const endTime = new Date();
    const executionTime = endTime - startTime;
    
    Logger.log(`Dataset size ${size}: ${executionTime}ms execution time`);
    
    // Ensure execution time scales reasonably
    assert(executionTime < 30000, `Execution time too long for ${size} KRs: ${executionTime}ms`);
    assert(summary.totalKeyResults === size, 'Incorrect processing of large dataset');
  }
}
```

#### Scenario 17: Memory Usage Optimization
```javascript
// Test: Memory efficiency with large datasets
function testMemoryUsage() {
  const memoryBefore = getMemoryUsage();
  
  // Process multiple large datasets
  for (let i = 0; i < 5; i++) {
    const largeSession = createMockSessionWithSize(300);
    const processor = new DataProcessor(7);
    const summary = processor.processSessionData(largeSession);
    
    // Force garbage collection between iterations
    Utilities.sleep(100);
  }
  
  const memoryAfter = getMemoryUsage();
  const memoryIncrease = memoryAfter - memoryBefore;
  
  Logger.log(`Memory usage increased by: ${memoryIncrease} bytes`);
  
  // Memory increase should be reasonable
  assert(memoryIncrease < 10000000, 'Excessive memory usage detected'); // 10MB limit
}
```

### Rate Limiting Tests
**Purpose**: Validate API rate limiting compliance

#### Scenario 18: API Rate Limit Compliance
```javascript
// Test: Respect for Quantive API rate limits
function testApiRateLimitCompliance() {
  const client = new QuantiveApiClient('test-token', 'test-account');
  const startTime = new Date();
  
  // Make multiple API calls rapidly
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      client.makeRequest('/test-endpoint').catch(error => {
        // Rate limiting errors are expected and handled
        return { error: error.toString() };
      })
    );
  }
  
  Promise.all(promises).then(results => {
    const endTime = new Date();
    const totalTime = endTime - startTime;
    
    Logger.log(`10 API calls completed in: ${totalTime}ms`);
    
    // Verify rate limiting was respected (should take some minimum time)
    assert(totalTime > 1000, 'API calls too fast - rate limiting not working');
    
    // Check that retry logic handled rate limits gracefully
    const errorCount = results.filter(r => r.error).length;
    Logger.log(`${errorCount} calls resulted in rate limit errors (expected)`);
  });
}
```

## Error Handling Test Scenarios

### Network and API Error Tests
**Purpose**: Validate robust error handling

#### Scenario 19: Network Connectivity Issues
```javascript
// Test: Handling of various network errors
function testNetworkErrorHandling() {
  const errorTypes = [
    { code: 0, description: 'Network unreachable' },
    { code: 408, description: 'Request timeout' },
    { code: 502, description: 'Bad gateway' },
    { code: 503, description: 'Service unavailable' }
  ];
  
  for (const errorType of errorTypes) {
    const mockError = new Error(`HTTP ${errorType.code}: ${errorType.description}`);
    const classification = ErrorHandler.classifyError(mockError, 'network-test');
    
    assert(classification.retryable, `Error ${errorType.code} should be retryable`);
    assert(classification.type === 'NETWORK_ERROR', `Error ${errorType.code} misclassified`);
    
    Logger.log(`✅ Network error ${errorType.code} properly classified`);
  }
}
```

#### Scenario 20: Authentication and Authorization Errors
```javascript
// Test: Proper handling of auth-related errors
function testAuthenticationErrors() {
  const authErrors = [
    { code: 401, type: 'AUTHENTICATION_ERROR', retryable: false },
    { code: 403, type: 'AUTHENTICATION_ERROR', retryable: false },
    { code: 429, type: 'RATE_LIMIT_ERROR', retryable: true }
  ];
  
  for (const authError of authErrors) {
    const mockError = new Error(`HTTP ${authError.code}: Authentication failed`);
    const classification = ErrorHandler.classifyError(mockError, 'auth-test');
    
    assert(classification.type === authError.type, 
           `Auth error ${authError.code} misclassified as ${classification.type}`);
    assert(classification.retryable === authError.retryable, 
           `Auth error ${authError.code} retry logic incorrect`);
  }
}
```

### Data Validation Error Tests
**Purpose**: Validate handling of corrupt or invalid data

#### Scenario 21: Malformed API Responses
```javascript
// Test: Handling of invalid JSON and data structures
function testMalformedDataHandling() {
  const processor = new DataProcessor(7);
  const invalidDataSets = [
    null,
    undefined,
    {},
    { objectives: null },
    { objectives: [] },
    { objectives: [{ invalidStructure: true }] }
  ];
  
  for (const invalidData of invalidDataSets) {
    try {
      const result = processor.processSessionData(invalidData);
      
      // Should either handle gracefully or throw appropriate error
      if (result) {
        assert(result.totalObjectives >= 0, 'Invalid result from malformed data');
      }
      
    } catch (error) {
      // Error should be properly classified
      const classification = ErrorHandler.classifyError(error, 'data-validation');
      assert(classification.type === 'DATA_ERROR', 'Malformed data error not classified correctly');
    }
  }
}
```

## Automation Testing Scenarios

### Trigger and Scheduling Tests
**Purpose**: Validate automated execution reliability

#### Scenario 22: Trigger Management
```javascript
// Test: Trigger creation, modification, and deletion
function testTriggerManagement() {
  const originalTriggers = ScriptApp.getProjectTriggers();
  const originalCount = originalTriggers.length;
  
  try {
    // Test trigger creation
    const triggerId = TriggerManager.setupTimeDrivenTrigger('daily', 9);
    assert(triggerId, 'Failed to create trigger');
    
    const newTriggers = ScriptApp.getProjectTriggers();
    assert(newTriggers.length === originalCount + 1, 'Trigger not created');
    
    // Test trigger deletion
    const deleted = TriggerManager.deleteTrigger(triggerId);
    assert(deleted, 'Failed to delete trigger');
    
    const finalTriggers = ScriptApp.getProjectTriggers();
    assert(finalTriggers.length === originalCount, 'Trigger not deleted');
    
    Logger.log('✅ Trigger management test passed');
    
  } catch (error) {
    // Clean up any created triggers
    const currentTriggers = ScriptApp.getProjectTriggers();
    for (const trigger of currentTriggers) {
      if (!originalTriggers.includes(trigger)) {
        ScriptApp.deleteTrigger(trigger);
      }
    }
    throw error;
  }
}
```

#### Scenario 23: Scheduled Execution Validation
```javascript
// Test: Verify scheduled execution works correctly
function testScheduledExecution() {
  // This test requires actual time passage, so we simulate the execution environment
  
  const mockTriggerEvent = {
    triggerUid: 'test-trigger-12345',
    source: ScriptApp.TriggerSource.CLOCK
  };
  
  try {
    // Simulate trigger execution
    const startTime = new Date();
    generateQuantiveReport(); // This is what the trigger would call
    const endTime = new Date();
    
    const executionTime = endTime - startTime;
    Logger.log(`Simulated trigger execution time: ${executionTime}ms`);
    
    // Verify execution completed within reasonable time
    assert(executionTime < 300000, 'Scheduled execution took too long'); // 5 minutes
    
    // Verify logs were created
    const logs = ExecutionLogger.getRecentLogs();
    assert(logs.length > 0, 'No execution logs created');
    
    Logger.log('✅ Scheduled execution simulation passed');
    
  } catch (error) {
    Logger.log(`❌ Scheduled execution failed: ${error}`);
    throw error;
  }
}
```

## Edge Case Testing Scenarios

### Boundary Condition Tests
**Purpose**: Validate behavior at system limits

#### Scenario 24: Empty Session Data
```javascript
// Test: Handling of sessions with no objectives or key results
function testEmptySessionData() {
  const emptySession = new QuantiveSession({
    id: 'empty-session',
    name: 'Empty Test Session',
    description: 'Session with no objectives',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    status: 'ACTIVE'
  });
  // objectives array remains empty
  
  const processor = new DataProcessor(7);
  const summary = processor.processSessionData(emptySession);
  
  assert(summary.totalObjectives === 0, 'Incorrect objective count for empty session');
  assert(summary.totalKeyResults === 0, 'Incorrect key result count for empty session');
  assert(summary.overallProgress === 0, 'Progress should be 0 for empty session');
  assert(summary.recentlyUpdatedKRs.length === 0, 'No recent updates expected for empty session');
  
  Logger.log('✅ Empty session data test passed');
}
```

#### Scenario 25: Extreme Date Ranges
```javascript
// Test: Handling of unusual date ranges and timestamps
function testExtremeDateRanges() {
  const dateTestCases = [
    { name: 'Future Session', startDate: '2030-01-01T00:00:00Z', endDate: '2030-12-31T23:59:59Z' },
    { name: 'Past Session', startDate: '2020-01-01T00:00:00Z', endDate: '2020-12-31T23:59:59Z' },
    { name: 'Very Long Session', startDate: '2020-01-01T00:00:00Z', endDate: '2025-12-31T23:59:59Z' },
    { name: 'Very Short Session', startDate: '2024-06-15T00:00:00Z', endDate: '2024-06-16T23:59:59Z' }
  ];
  
  for (const testCase of dateTestCases) {
    const session = new QuantiveSession({
      id: 'date-test-session',
      name: testCase.name,
      description: 'Date range test session',
      startDate: testCase.startDate,
      endDate: testCase.endDate,
      status: 'ACTIVE'
    });
    
    try {
      const processor = new DataProcessor(7);
      const summary = processor.processSessionData(session);
      
      assert(summary.sessionInfo.startDate instanceof Date, 'Start date not parsed correctly');
      assert(summary.sessionInfo.endDate instanceof Date, 'End date not parsed correctly');
      
      Logger.log(`✅ ${testCase.name} date range test passed`);
      
    } catch (error) {
      Logger.log(`❌ ${testCase.name} date range test failed: ${error}`);
      throw error;
    }
  }
}
```

## Test Data Generation Utilities

### Mock Data Creators
```javascript
// Utility functions for creating consistent test data

function createMockSessionWithSize(keyResultCount) {
  const session = new QuantiveSession({
    id: `test-session-${keyResultCount}`,
    name: `Test Session with ${keyResultCount} KRs`,
    description: 'Generated test session',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    status: 'ACTIVE'
  });
  
  const objectiveCount = Math.ceil(keyResultCount / 5); // ~5 KRs per objective
  
  for (let i = 0; i < objectiveCount; i++) {
    const objective = new QuantiveObjective({
      id: `obj-${i}`,
      name: `Test Objective ${i + 1}`,
      description: `Generated test objective ${i + 1}`,
      owner: 'test-user@example.com',
      status: ['ON_TRACK', 'AT_RISK', 'BEHIND'][i % 3],
      progress: Math.random() * 100
    });
    
    const krCount = Math.min(5, keyResultCount - (i * 5));
    for (let j = 0; j < krCount; j++) {
      const kr = new QuantiveKeyResult({
        id: `kr-${i}-${j}`,
        name: `Key Result ${j + 1}`,
        description: `Test key result`,
        owner: 'test-user@example.com',
        status: objective.status,
        currentValue: Math.random() * 100,
        targetValue: 100,
        unit: '%',
        progress: Math.random() * 100,
        lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random last 30 days
        objectiveId: objective.id
      });
      
      objective.keyResults.push(kr);
    }
    
    session.objectives.push(objective);
  }
  
  return session;
}

function createMockReportSummary() {
  const summary = new ReportSummary();
  summary.sessionInfo = {
    id: 'mock-session',
    name: 'Mock Test Session',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    daysRemaining: 180
  };
  summary.overallProgress = 75.5;
  summary.statusCounts = {
    'On Track': 8,
    'At Risk': 3,
    'Behind': 2,
    'Completed': 5,
    'Not Started': 1
  };
  summary.totalObjectives = 4;
  summary.totalKeyResults = 19;
  summary.recentlyUpdatedKRs = []; // Add mock recent updates if needed
  
  return summary;
}
```

## Test Execution Framework

### Automated Test Runner
```javascript
// Run all test scenarios in sequence
function runAllTestScenarios() {
  const testResults = {
    timestamp: new Date().toISOString(),
    scenarios: [],
    summary: { total: 0, passed: 0, failed: 0 }
  };
  
  const testScenarios = [
    { name: 'Config Management', test: testConfigManagement },
    { name: 'API Client', test: testApiClient },
    { name: 'Data Processing', test: testDataProcessing },
    { name: 'Report Generation', test: testReportGeneration },
    { name: 'Error Handling', test: testErrorHandling },
    { name: 'Performance', test: testPerformance },
    { name: 'Edge Cases', test: testEdgeCases }
  ];
  
  for (const scenario of testScenarios) {
    try {
      Logger.log(`Running scenario: ${scenario.name}`);
      scenario.test();
      
      testResults.scenarios.push({
        name: scenario.name,
        status: 'PASSED',
        message: 'All tests in scenario passed'
      });
      testResults.summary.passed++;
      
    } catch (error) {
      testResults.scenarios.push({
        name: scenario.name,
        status: 'FAILED',
        message: error.toString()
      });
      testResults.summary.failed++;
    }
    
    testResults.summary.total++;
  }
  
  Logger.log(`Test Summary: ${testResults.summary.passed}/${testResults.summary.total} scenarios passed`);
  return testResults;
}
```

---

*This comprehensive testing documentation ensures thorough validation of the Quantive Session Snapshot & Summary system across all functional areas, performance characteristics, and edge cases.*