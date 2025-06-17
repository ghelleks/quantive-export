/**
 * Unit Tests for ConfigManager Class
 * 
 * Tests configuration management, property handling, and validation
 * Uses mocked Google Apps Script services
 */

// Set up a simple mock for UrlFetchApp for these tests
global.UrlFetchApp = {
  fetch: jest.fn(() => ({
    getResponseCode: () => 200,
    getContentText: () => JSON.stringify([]),
    getHeaders: () => ({}),
    getAllHeaders: () => ({})
  }))
};

describe('ConfigManager - Unit Tests', () => {
  
  beforeEach(() => {
    // Reset mocks and clear properties before each test
    jest.resetAllMocks();
    global.PropertiesService.getScriptProperties().deleteAllProperties();
  });

  describe('Property Management', () => {
    test('should set and get individual properties', () => {
      ConfigManager.setProperty('TEST_KEY', 'test_value');
      const result = ConfigManager.getProperty('TEST_KEY');
      
      expect(result).toBe('test_value');
    });

    test('should return default value for missing property', () => {
      const result = ConfigManager.getProperty('MISSING_KEY', 'default_value');
      
      expect(result).toBe('default_value');
    });

    test('should set multiple properties at once', () => {
      const properties = {
        'KEY1': 'value1',
        'KEY2': 'value2',
        'KEY3': 'value3'
      };
      
      ConfigManager.setProperties(properties);
      
      expect(ConfigManager.getProperty('KEY1')).toBe('value1');
      expect(ConfigManager.getProperty('KEY2')).toBe('value2');
      expect(ConfigManager.getProperty('KEY3')).toBe('value3');
    });
  });

  describe('Configuration Retrieval', () => {
    test('should return complete configuration object', () => {
      // Set up test properties
      global.PropertiesService.getScriptProperties().setProperties({
        'QUANTIVE_API_TOKEN': 'test-token',
        'QUANTIVE_ACCOUNT_ID': 'test-account',
        'SESSION_ID': '12345678-abcd-1234-efgh-123456789012', // UUID format to skip resolution
        'GOOGLE_DOC_ID': 'doc-123',
        'GOOGLE_SHEET_ID': 'sheet-456',
        'LOOKBACK_DAYS': '7',
        'ENVIRONMENT': 'development'
      });

      const config = ConfigManager.getConfig();

      expect(config).toEqual({
        apiToken: 'test-token',
        accountId: 'test-account',
        sessionId: '12345678-abcd-1234-efgh-123456789012',
        googleDocId: 'doc-123',
        googleSheetId: 'sheet-456',
        lookbackDays: 7,
        environment: 'development',
        apiRateLimitDelay: expect.any(Number),
        maxRetries: expect.any(Number),
        retryDelay: expect.any(Number),
        logLevel: expect.any(String)
      });
    });

    test('should use default values for missing properties', () => {
      // Only set required properties
      global.PropertiesService.getScriptProperties().setProperties({
        'QUANTIVE_API_TOKEN': 'test-token',
        'QUANTIVE_ACCOUNT_ID': 'test-account',
        'SESSION_ID': '12345678-abcd-1234-efgh-123456789012'
      });

      const config = ConfigManager.getConfig();

      expect(config.environment).toBe('production'); // Default
      expect(config.lookbackDays).toBe(7); // Default
      expect(config.googleDocId).toBe(''); // Default empty
    });
  });

  describe('Environment-Specific Settings', () => {
    test('should return environment-specific setting', () => {
      global.PropertiesService.getScriptProperties().setProperties({
        'DEVELOPMENT_API_RATE_LIMIT_DELAY': '500',
        'PRODUCTION_API_RATE_LIMIT_DELAY': '1500'
      });

      const devSetting = ConfigManager.getEnvironmentSetting('development', 'API_RATE_LIMIT_DELAY', 1000);
      const prodSetting = ConfigManager.getEnvironmentSetting('production', 'API_RATE_LIMIT_DELAY', 1000);

      expect(devSetting).toBe(500);
      expect(prodSetting).toBe(1500);
    });

    test('should return default value when environment setting missing', () => {
      const result = ConfigManager.getEnvironmentSetting('development', 'MISSING_SETTING', 999);
      
      expect(result).toBe(999);
    });
  });

  describe('Validation Methods', () => {
    describe('validateApiToken', () => {
      test('should accept valid API token', () => {
        expect(() => {
          ConfigManager.validateApiToken('qtv_1234567890abcdef');
        }).not.toThrow();
      });

      test('should reject empty API token', () => {
        expect(() => {
          ConfigManager.validateApiToken('');
        }).toThrow('API token must be a non-empty string');
      });

      test('should reject placeholder API token', () => {
        expect(() => {
          ConfigManager.validateApiToken('your-api-token-here');
        }).toThrow('Please replace the placeholder API token');
      });

      test('should reject short API token', () => {
        expect(() => {
          ConfigManager.validateApiToken('short');
        }).toThrow('API token appears to be invalid');
      });
    });

    describe('validateAccountId', () => {
      test('should accept valid account ID', () => {
        expect(() => {
          ConfigManager.validateAccountId('acc_1234567890');
        }).not.toThrow();
      });

      test('should reject empty account ID', () => {
        expect(() => {
          ConfigManager.validateAccountId('');
        }).toThrow('Account ID must be a non-empty string');
      });

      test('should reject placeholder account ID', () => {
        expect(() => {
          ConfigManager.validateAccountId('your-account-id-here');
        }).toThrow('Please replace the placeholder account ID');
      });
    });

    describe('validateSessionId', () => {
      test('should accept valid UUID', () => {
        expect(() => {
          ConfigManager.validateSessionId('12345678-abcd-1234-efgh-123456789012');
        }).not.toThrow();
      });

      test('should reject empty session ID', () => {
        expect(() => {
          ConfigManager.validateSessionId('');
        }).toThrow('Session ID must be a non-empty string');
      });

      test('should reject placeholder session ID', () => {
        expect(() => {
          ConfigManager.validateSessionId('your-session-id-here');
        }).toThrow('Please replace the placeholder session ID');
      });

      test('should warn about non-UUID format but not throw', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        expect(() => {
          ConfigManager.validateSessionId('not-a-uuid');
        }).not.toThrow();
        
        // Check that a warning was logged
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('Warning: Session ID does not appear to be a valid UUID format')
        );
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Full Configuration Validation', () => {
    test('should validate complete valid configuration', () => {
      global.PropertiesService.getScriptProperties().setProperties({
        'QUANTIVE_API_TOKEN': 'qtv_1234567890abcdef',
        'QUANTIVE_ACCOUNT_ID': 'acc_1234567890',
        'SESSION_ID': '12345678-abcd-1234-efgh-123456789012'
      });

      expect(() => {
        ConfigManager.validateConfig();
      }).not.toThrow();
    });

    test('should throw error for missing API token', () => {
      global.PropertiesService.getScriptProperties().setProperties({
        'QUANTIVE_ACCOUNT_ID': 'acc_1234567890',
        'SESSION_ID': '12345678-abcd-1234-efgh-123456789012'
      });

      expect(() => {
        ConfigManager.validateConfig();
      }).toThrow('API token must be a non-empty string');
    });

    test('should throw error for invalid configuration combination', () => {
      global.PropertiesService.getScriptProperties().setProperties({
        'QUANTIVE_API_TOKEN': 'your-api-token-here', // Placeholder
        'QUANTIVE_ACCOUNT_ID': 'acc_1234567890',
        'SESSION_ID': '12345678-abcd-1234-efgh-123456789012'
      });

      expect(() => {
        ConfigManager.validateConfig();
      }).toThrow('Please replace the placeholder API token');
    });
  });

  describe('Configuration Integration', () => {
    test('getConfig should trigger session resolution for session names', () => {
      // Set up properties with a session name (not UUID)
      global.PropertiesService.getScriptProperties().setProperties({
        'QUANTIVE_API_TOKEN': 'qtv_1234567890abcdef',
        'QUANTIVE_ACCOUNT_ID': 'acc_1234567890',
        'SESSION_ID': 'Test Session Name' // This should trigger resolution
      });

      // Mock the UrlFetchApp to return sessions
      global.UrlFetchApp.fetch.mockReturnValue({
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify([
          { id: '12345678-abcd-1234-efgh-123456789012', name: 'Test Session Name' }
        ]),
        getHeaders: () => ({}),
        getAllHeaders: () => ({})
      });

      const config = ConfigManager.getConfig();

      expect(config.sessionId).toBe('12345678-abcd-1234-efgh-123456789012');
      expect(global.UrlFetchApp.fetch).toHaveBeenCalled();
    });
  });
});