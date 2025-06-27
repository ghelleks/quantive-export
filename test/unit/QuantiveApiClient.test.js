/**
 * Unit Tests for QuantiveApiClient
 * 
 * Tests the API client functionality with mocked HTTP responses
 */

const mockResponses = require('../fixtures/mock-responses.json');

// Override UrlFetchApp mock (replaces gas-mock-globals version)
beforeAll(() => {
  global.UrlFetchApp = {
    fetch: jest.fn((url, options) => {
      // Check for test-specific mock response
      if (global.mockResponse) {
        return {
          getResponseCode: () => global.mockResponse.status || 200,
          getContentText: () => typeof global.mockResponse.data === 'string' 
            ? global.mockResponse.data 
            : JSON.stringify(global.mockResponse.data || []),
          getHeaders: () => global.mockResponse.headers || {},
          getAllHeaders: () => global.mockResponse.headers || {}
        };
      }
      
      // Default successful response for unit tests
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify([]),
        getHeaders: () => ({}),
        getAllHeaders: () => ({})
      };
    })
  };
});

describe('QuantiveApiClient - Unit Tests', () => {
  let apiClient;

  beforeEach(() => {
    jest.resetAllMocks();
    global.mockResponse = null;
    
    // Reset the UrlFetchApp mock
    global.UrlFetchApp.fetch.mockClear();
    
    // Create API client instance
    apiClient = new QuantiveApiClient('test-token-123', 'test-account-456');
  });

  describe('Constructor and Configuration', () => {
    test('should create client with correct configuration', () => {
      expect(apiClient.apiToken).toBe('test-token-123');
      expect(apiClient.accountId).toBe('test-account-456');
      expect(apiClient.baseUrl).toBe('https://app.us.quantive.com/results/api/v1');
    });

    test('should set up request headers correctly', () => {
      // Set up a mock response to avoid API call errors
      global.mockResponse = mockResponses.successfulSessionsList;
      
      // Call a method to trigger request setup
      apiClient.getSessions();
      
      const lastCall = global.UrlFetchApp.fetch.mock.calls[0];
      const options = lastCall[1];
      
      expect(options.headers).toEqual({
        'Authorization': 'Bearer test-token-123',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'gtmhub-accountId': 'test-account-456'
      });
    });
  });

  describe('getSessions() method', () => {
    test('should make correct API call for sessions', () => {
      global.mockResponse = mockResponses.successfulSessionsList;
      
      const result = apiClient.getSessions();
      
      expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
        'https://app.us.quantive.com/results/api/v1/sessions',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      );
      
      expect(result).toEqual(mockResponses.successfulSessionsList.data);
    });

    test('should return empty array for empty response', () => {
      global.mockResponse = mockResponses.emptySessionsList;
      
      const result = apiClient.getSessions();
      
      expect(result).toEqual([]);
    });

    test('should handle successful response with multiple sessions', () => {
      global.mockResponse = mockResponses.successfulSessionsList;
      
      const result = apiClient.getSessions();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });
  });

  describe('Error Handling', () => {
    test('should handle 401 unauthorized error', () => {
      global.mockResponse = mockResponses.unauthorizedError;
      
      expect(() => {
        apiClient.getSessions();
      }).toThrow();
    });

    test('should handle 404 not found error', () => {
      global.mockResponse = mockResponses.notFoundError;
      
      expect(() => {
        apiClient.getSessions();
      }).toThrow();
    });

    test('should handle 500 server error', () => {
      global.mockResponse = mockResponses.serverError;
      
      expect(() => {
        apiClient.getSessions();
      }).toThrow();
    });

    test('should handle malformed JSON response', () => {
      global.mockResponse = {
        status: 200,
        data: 'invalid json {'
      };
      
      expect(() => {
        apiClient.getSessions();
      }).toThrow();
    });
  });

  describe('getSession() method', () => {
    test('should make correct API call for individual session', () => {
      const sessionId = '12345678-abcd-1234-efgh-123456789012';
      global.mockResponse = {
        status: 200,
        data: { id: sessionId, name: 'Test Session' }
      };
      
      const result = apiClient.getSession(sessionId);
      
      expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
        `https://app.us.quantive.com/results/api/v1/sessions/${sessionId}`,
        expect.objectContaining({
          method: 'GET'
        })
      );
      
      expect(result).toEqual({ id: sessionId, name: 'Test Session' });
    });
  });

  describe('getObjectives() method', () => {
    test('should make correct API call for session objectives', () => {
      const sessionId = '12345678-abcd-1234-efgh-123456789012';
      global.mockResponse = {
        status: 200,
        data: [
          { id: 'obj1', title: 'Objective 1' },
          { id: 'obj2', title: 'Objective 2' }
        ]
      };
      
      const result = apiClient.getObjectives(sessionId);
      
      expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
        `https://app.us.quantive.com/results/api/v1/sessions/${sessionId}/objectives`,
        expect.objectContaining({
          method: 'GET'
        })
      );
      
      expect(result).toEqual([
        { id: 'obj1', title: 'Objective 1' },
        { id: 'obj2', title: 'Objective 2' }
      ]);
    });
  });

  describe('Request Configuration', () => {
    test('should include all required headers', () => {
      apiClient.getSessions();
      
      const lastCall = global.UrlFetchApp.fetch.mock.calls[0];
      const options = lastCall[1];
      
      expect(options.headers['Authorization']).toBe('Bearer test-token-123');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['gtmhub-accountId']).toBe('test-account-456');
    });

    test('should use correct base URL', () => {
      apiClient.getSessions();
      
      const lastCall = global.UrlFetchApp.fetch.mock.calls[0];
      const url = lastCall[0];
      
      expect(url).toStartWith('https://app.us.quantive.com/results/api/v1/');
    });

    test('should set correct HTTP method', () => {
      apiClient.getSessions();
      
      const lastCall = global.UrlFetchApp.fetch.mock.calls[0];
      const options = lastCall[1];
      
      expect(options.method).toBe('GET');
    });
  });

  describe('Response Processing', () => {
    test('should parse JSON response correctly', () => {
      const testData = [{ id: '1', name: 'Test' }];
      global.mockResponse = {
        status: 200,
        data: testData
      };
      
      const result = apiClient.getSessions();
      
      expect(result).toEqual(testData);
    });

    test('should handle empty response data', () => {
      global.mockResponse = {
        status: 200,
        data: null
      };
      
      const result = apiClient.getSessions();
      
      expect(result).toBeNull();
    });
  });

  describe('API Method Validation', () => {
    test('should have all required API methods', () => {
      expect(typeof apiClient.getSessions).toBe('function');
      expect(typeof apiClient.getSession).toBe('function');
      expect(typeof apiClient.getObjectives).toBe('function');
      expect(typeof apiClient.getKeyResults).toBe('function');
    });

    test('should handle getKeyResults method', () => {
      const objectiveId = 'obj-123';
      global.mockResponse = {
        status: 200,
        data: [{ id: 'kr1', title: 'Key Result 1' }]
      };
      
      const result = apiClient.getKeyResults(objectiveId);
      
      expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
        `https://app.us.quantive.com/results/api/v1/objectives/${objectiveId}/key-results`,
        expect.objectContaining({
          method: 'GET'
        })
      );
      
      expect(result).toEqual([{ id: 'kr1', title: 'Key Result 1' }]);
    });
  });
});