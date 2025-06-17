/**
 * Unit Tests for Session Name Resolution
 * 
 * Tests the core session name to UUID resolution functionality
 * Uses mocked Google Apps Script services and API responses
 */

const mockSessions = require('../fixtures/mock-sessions.json');
const mockResponses = require('../fixtures/mock-responses.json');

// Create a mock for UrlFetchApp.fetch that can be controlled per test
let mockFetchResponse = null;

// Override the global UrlFetchApp mock to use our controlled response
global.UrlFetchApp = {
  fetch: jest.fn((url, options) => {
    if (mockFetchResponse) {
      return {
        getResponseCode: () => mockFetchResponse.status || 200,
        getContentText: () => typeof mockFetchResponse.data === 'string' 
          ? mockFetchResponse.data 
          : JSON.stringify(mockFetchResponse.data || {}),
        getHeaders: () => ({}),
        getAllHeaders: () => ({})
      };
    }
    
    // Default successful response
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify(mockSessions),
      getHeaders: () => ({}),
      getAllHeaders: () => ({})
    };
  })
};

describe('ConfigManager.resolveSessionId() - Unit Tests', () => {
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
    mockFetchResponse = null;
    
    // Set up basic configuration properties
    global.PropertiesService.getScriptProperties().setProperties({
      'QUANTIVE_API_TOKEN': 'test-token-123',
      'QUANTIVE_ACCOUNT_ID': 'test-account-456'
    });
  });

  describe('UUID Detection and Pass-through', () => {
    test('should detect UUID format and return unchanged', () => {
      const uuid = '12345678-abcd-1234-efgh-123456789012';
      const result = ConfigManager.resolveSessionId(uuid);
      
      expect(result).toBe(uuid);
      expect(global.UrlFetchApp.fetch).not.toHaveBeenCalled();
    });

    test('should handle UUID with different casing', () => {
      const uuid = '12345678-ABCD-1234-EFGH-123456789012';
      const result = ConfigManager.resolveSessionId(uuid);
      
      expect(result).toBe(uuid);
      expect(global.UrlFetchApp.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Session Name Resolution', () => {
    test('should resolve session name to UUID successfully', () => {
      // Set up mock response with sessions
      mockFetchResponse = { data: mockSessions };
      
      const result = ConfigManager.resolveSessionId('Q4 2024 OKRs');
      
      expect(result).toBe('12345678-abcd-1234-efgh-123456789012');
      expect(global.UrlFetchApp.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sessions'),
        expect.any(Object)
      );
    });

    test('should handle case-insensitive session name matching', () => {
      mockFetchResponse = { data: mockSessions };
      
      const result = ConfigManager.resolveSessionId('q4 2024 okrs');
      
      expect(result).toBe('12345678-abcd-1234-efgh-123456789012');
    });

    test('should resolve session name with special characters', () => {
      mockFetchResponse = { data: mockSessions };
      
      const result = ConfigManager.resolveSessionId('Special Characters & Symbols!');
      
      expect(result).toBe('99999999-8888-7777-6666-555555555555');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for empty session identifier', () => {
      expect(() => {
        ConfigManager.resolveSessionId('');
      }).toThrow('Session identifier must be a non-empty string');
    });

    test('should throw error for null session identifier', () => {
      expect(() => {
        ConfigManager.resolveSessionId(null);
      }).toThrow('Session identifier must be a non-empty string');
    });

    test('should throw error for placeholder values', () => {
      expect(() => {
        ConfigManager.resolveSessionId('your-session-name-here');
      }).toThrow('Please replace the placeholder session identifier');
    });

    test('should throw error when session name not found', () => {
      mockFetchResponse = { data: mockSessions };
      
      expect(() => {
        ConfigManager.resolveSessionId('Nonexistent Session');
      }).toThrow('Session with name "Nonexistent Session" not found');
    });

    test('should provide available session names when session not found', () => {
      mockFetchResponse = { data: mockSessions.slice(0, 3) }; // Limit for readable error
      
      try {
        ConfigManager.resolveSessionId('Nonexistent Session');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Available session names:');
        expect(error.message).toContain('Q4 2024 OKRs');
        expect(error.message).toContain('Development Goals');
      }
    });

    test('should handle session without ID field', () => {
      mockFetchResponse = {
        data: [
          { name: 'Session Without ID' }
        ]
      };
      
      expect(() => {
        ConfigManager.resolveSessionId('Session Without ID');
      }).toThrow('Found session "Session Without ID" but it has no ID field');
    });
  });

  describe('API Configuration Validation', () => {
    test('should throw error when API token missing', () => {
      // Clear the API token
      global.PropertiesService.getScriptProperties().deleteProperty('QUANTIVE_API_TOKEN');
      
      expect(() => {
        ConfigManager.resolveSessionId('Test Session');
      }).toThrow('API token and account ID must be configured');
    });

    test('should throw error when account ID missing', () => {
      // Clear the account ID
      global.PropertiesService.getScriptProperties().deleteProperty('QUANTIVE_ACCOUNT_ID');
      
      expect(() => {
        ConfigManager.resolveSessionId('Test Session');
      }).toThrow('API token and account ID must be configured');
    });
  });

  describe('API Response Handling', () => {
    test('should handle empty sessions array', () => {
      mockFetchResponse = { data: [] };
      
      try {
        ConfigManager.resolveSessionId('Any Session');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Session with name "Any Session" not found');
        expect(error.message).toContain('No sessions with names found');
      }
    });

    test('should handle null API response', () => {
      mockFetchResponse = { data: null };
      
      expect(() => {
        ConfigManager.resolveSessionId('Test Session');
      }).toThrow('Failed to retrieve sessions list from Quantive API');
    });

    test('should handle non-array API response', () => {
      mockFetchResponse = { data: 'invalid response' };
      
      expect(() => {
        ConfigManager.resolveSessionId('Test Session');
      }).toThrow('Failed to retrieve sessions list from Quantive API');
    });

    test('should filter out sessions without names in error message', () => {
      mockFetchResponse = {
        data: [
          { id: '1', name: 'Valid Session 1' },
          { id: '2' }, // No name
          { id: '3', name: 'Valid Session 2' },
          { id: '4', name: '' } // Empty name
        ]
      };
      
      try {
        ConfigManager.resolveSessionId('Nonexistent');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Valid Session 1');
        expect(error.message).toContain('Valid Session 2');
        expect(error.message).not.toContain('id');
      }
    });
  });

  describe('API Client Creation', () => {
    test('should create QuantiveApiClient with correct configuration', () => {
      mockFetchResponse = { data: mockSessions };
      
      // Spy on the QuantiveApiClient constructor
      const originalApiClient = global.QuantiveApiClient;
      global.QuantiveApiClient = jest.fn().mockImplementation(() => ({
        getSessions: jest.fn().mockReturnValue(mockSessions)
      }));
      
      ConfigManager.resolveSessionId('Q4 2024 OKRs');
      
      expect(global.QuantiveApiClient).toHaveBeenCalledWith(
        'test-token-123',
        'test-account-456'
      );
      
      // Restore original
      global.QuantiveApiClient = originalApiClient;
    });
  });
});