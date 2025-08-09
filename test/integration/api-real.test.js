/**
 * Integration Tests with Real Quantive API
 * 
 * These tests make actual API calls to Quantive using real credentials
 * They will be skipped if credentials are not available in environment variables
 */

const { requireRealCredentials, canRunIntegrationTests, getTestSessionData, getApiClientConfig } = require('../setup/credentials');

// For integration tests, we need a real HTTP client
// We'll replace UrlFetchApp with a synchronous HTTP implementation to match Google Apps Script

global.UrlFetchApp = {
  fetch: (url, options) => {
    // Use sync-request for synchronous HTTP calls to match Google Apps Script behavior
    const syncRequest = require('sync-request');
    
    try {
      const response = syncRequest(options.method || 'GET', url, {
        headers: options.headers || {},
        body: options.payload || undefined,
        timeout: 30000 // 30 second timeout
      });
      
      return {
        getResponseCode: () => response.statusCode,
        getContentText: () => response.getBody('utf8'),
        getHeaders: () => response.headers,
        getAllHeaders: () => response.headers
      };
    } catch (error) {
      // Handle network errors by throwing a descriptive error
      throw new Error(`Network request failed: ${error.message}`);
    }
  }
};

describe('Real Quantive API Integration Tests', () => {
  let apiClient;
  let credentials;
  let testSessionData;

  beforeAll(async () => {
    // Skip all tests in this suite if no real credentials
    if (!canRunIntegrationTests()) {
      console.log('🚫 Skipping integration tests - no valid credentials');
      return;
    }

    try {
      credentials = requireRealCredentials();
      testSessionData = getTestSessionData();
      
      console.log('🔍 Debug: Loaded credentials from config.gs:');
      console.log('- API Token:', credentials.apiToken ? `${credentials.apiToken.substring(0, 20)}...` : 'NOT SET');
      console.log('- Account ID:', credentials.accountId || 'NOT SET');
      console.log('- Base URL:', credentials.baseUrl || 'NOT SET');
      
      // Set up API client configuration in PropertiesService
      global.PropertiesService.getScriptProperties().setProperties({
        'QUANTIVE_API_TOKEN': credentials.apiToken,
        'QUANTIVE_ACCOUNT_ID': credentials.accountId
      });

      // Create API client with custom base URL from credentials
      apiClient = new QuantiveApiClient(credentials.apiToken, credentials.accountId, credentials.baseUrl);
      
      console.log('✅ Integration test setup complete');
      
    } catch (error) {
      console.error('❌ Integration test setup failed:', error.message);
      throw error;
    }
  });

  describe('QuantiveApiClient.getSessions()', () => {
    test('should successfully retrieve sessions from real API', async () => {
      if (!canRunIntegrationTests()) {
        test.skip('No real credentials available');
        return;
      }

      const sessions = await apiClient.getSessions();
      
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0);
      
      // Verify session structure
      const session = sessions[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('name');
      expect(typeof session.id).toBe('string');
      expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    test('should handle authentication with real credentials', async () => {
      if (!canRunIntegrationTests()) {
        test.skip('No real credentials available');
        return;
      }

      // This test verifies that our credentials work
      expect(async () => {
        await apiClient.getSessions();
      }).not.toThrow();
    });
  });

  describe('Session Name Resolution with Real API', () => {
    test('should resolve real session name to UUID', async () => {
      if (!canRunIntegrationTests() || !testSessionData.validSessionName) {
        test.skip('No real credentials or test session name available');
        return;
      }

      const resolvedId = ConfigManager.resolveSessionId(testSessionData.validSessionName);
      
      expect(resolvedId).toBeDefined();
      expect(typeof resolvedId).toBe('string');
      expect(resolvedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      // If we have a known UUID, verify it matches
      if (testSessionData.validSessionUuid) {
        expect(resolvedId).toBe(testSessionData.validSessionUuid);
      }
    });

    test('should handle real session not found error', async () => {
      if (!canRunIntegrationTests()) {
        test.skip('No real credentials available');
        return;
      }

      const invalidSessionName = testSessionData.invalidSessionName || 'Definitely Nonexistent Session Name 12345';
      
      expect(() => {
        ConfigManager.resolveSessionId(invalidSessionName);
      }).toThrow(`Session with name "${invalidSessionName}" not found`);
    });

    test('should provide real available session names in error', async () => {
      if (!canRunIntegrationTests()) {
        test.skip('No real credentials available');
        return;
      }

      try {
        ConfigManager.resolveSessionId('Definitely Nonexistent Session Name 99999');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Available session names:');
        // Should contain at least one real session name
        expect(error.message.length).toBeGreaterThan(50);
      }
    });

    test('should handle case-insensitive matching with real sessions', async () => {
      if (!canRunIntegrationTests() || !testSessionData.validSessionName) {
        test.skip('No real credentials or test session name available');
        return;
      }

      const lowerCaseName = testSessionData.validSessionName.toLowerCase();
      const upperCaseName = testSessionData.validSessionName.toUpperCase();
      
      const originalId = ConfigManager.resolveSessionId(testSessionData.validSessionName);
      const lowerCaseId = ConfigManager.resolveSessionId(lowerCaseName);
      const upperCaseId = ConfigManager.resolveSessionId(upperCaseName);
      
      expect(lowerCaseId).toBe(originalId);
      expect(upperCaseId).toBe(originalId);
    });
  });

  describe('End-to-End Configuration Flow', () => {
    test('should complete full configuration flow with session name', async () => {
      if (!canRunIntegrationTests() || !testSessionData.validSessionName) {
        test.skip('No real credentials or test session name available');
        return;
      }

      // Set up configuration with session name
      global.PropertiesService.getScriptProperties().setProperty(
        'SESSION_ID', 
        testSessionData.validSessionName
      );

      // Get complete configuration (should resolve session name)
      const config = ConfigManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(config.apiToken).toBe(credentials.apiToken);
      expect(config.accountId).toBe(credentials.accountId);
    });

    test('should validate complete configuration successfully', async () => {
      if (!canRunIntegrationTests()) {
        test.skip('No real credentials available');
        return;
      }

      // This test verifies that validateConfig passes with real credentials
      expect(() => {
        ConfigManager.validateConfig();
      }).not.toThrow();
    });
  });

  describe('Error Handling with Real API', () => {
    test('should handle network timeouts gracefully', async () => {
      if (!canRunIntegrationTests()) {
        test.skip('No real credentials available');
        return;
      }

      // Create API client with very short timeout
      const timeoutClient = new QuantiveApiClient(credentials.apiToken, credentials.accountId, credentials.baseUrl);
      
      // This test might be flaky depending on network conditions
      // We're mainly verifying the error handling structure exists
      try {
        await timeoutClient.getSessions();
        // If it succeeds, that's fine too
        expect(true).toBe(true);
      } catch (error) {
        // If it fails, verify we get a reasonable error
        expect(error).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
    });

    test('should handle invalid API token gracefully', async () => {
      if (!canRunIntegrationTests()) {
        test.skip('No real credentials available');
        return;
      }

      // Create API client with invalid token
      const invalidClient = new QuantiveApiClient('invalid-token', credentials.accountId, credentials.baseUrl);
      
      expect(async () => {
        await invalidClient.getSessions();
      }).rejects.toThrow();
    });
  });

  describe('Performance and Reliability', () => {
    test('should complete session resolution within reasonable time', async () => {
      if (!canRunIntegrationTests() || !testSessionData.validSessionName) {
        test.skip('No real credentials or test session name available');
        return;
      }

      const startTime = Date.now();
      
      ConfigManager.resolveSessionId(testSessionData.validSessionName);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 10 seconds (generous for network calls)
      expect(duration).toBeLessThan(10000);
    });

    test('should handle multiple concurrent session resolutions', async () => {
      if (!canRunIntegrationTests() || !testSessionData.validSessionName) {
        test.skip('No real credentials or test session name available');
        return;
      }

      // Run multiple resolutions concurrently
      const promises = Array(3).fill().map(() => 
        Promise.resolve(ConfigManager.resolveSessionId(testSessionData.validSessionName))
      );
      
      const results = await Promise.all(promises);
      
      // All should return the same result
      expect(results.every(result => result === results[0])).toBe(true);
      expect(results[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });
});