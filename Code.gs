/**
 * Quantive Session Snapshot & Summary Generator
 * Google Apps Script for generating periodic reports from Quantive API
 * 
 * @version 1.0
 * @author Generated with Claude Code
 */

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const CONFIG = {
  // Quantive API Configuration
  QUANTIVE_BASE_URL: 'https://api.quantive.com/v1',
  API_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Report Configuration
  DEFAULT_LOOKBACK_DAYS: 7,
  MAX_EXECUTION_TIME: 300000, // 5 minutes (under 6 minute limit)
  
  // Property Keys for PropertiesService
  PROPERTIES: {
    QUANTIVE_API_TOKEN: 'QUANTIVE_API_TOKEN',
    QUANTIVE_ACCOUNT_ID: 'QUANTIVE_ACCOUNT_ID',
    SESSION_ID: 'SESSION_ID',
    GOOGLE_DOC_ID: 'GOOGLE_DOC_ID',
    GOOGLE_SHEET_ID: 'GOOGLE_SHEET_ID',
    LOOKBACK_DAYS: 'LOOKBACK_DAYS'
  },
  
  // Status mappings
  STATUS_MAPPING: {
    'ON_TRACK': 'On Track',
    'AT_RISK': 'At Risk',
    'BEHIND': 'Behind',
    'COMPLETED': 'Completed',
    'NOT_STARTED': 'Not Started'
  }
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * Quantive Session Data Structure
 */
class QuantiveSession {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.startDate = new Date(data.startDate);
    this.endDate = new Date(data.endDate);
    this.status = data.status;
    this.objectives = [];
  }
}

/**
 * Quantive Objective Data Structure
 */
class QuantiveObjective {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.owner = data.owner;
    this.status = data.status;
    this.progress = data.progress || 0;
    this.keyResults = [];
    this.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : null;
  }
}

/**
 * Quantive Key Result Data Structure
 */
class QuantiveKeyResult {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.owner = data.owner;
    this.status = data.status;
    this.currentValue = data.currentValue || 0;
    this.targetValue = data.targetValue || 0;
    this.unit = data.unit || '';
    this.progress = data.progress || 0;
    this.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : null;
    this.objectiveId = data.objectiveId;
  }
  
  /**
   * Check if this KR was updated within the lookback period
   * @param {number} lookbackDays - Number of days to look back
   * @returns {boolean}
   */
  isRecentlyUpdated(lookbackDays = CONFIG.DEFAULT_LOOKBACK_DAYS) {
    if (!this.lastUpdated) return false;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
    return this.lastUpdated > cutoffDate;
  }
}

/**
 * Report Summary Data Structure
 */
class ReportSummary {
  constructor() {
    this.sessionInfo = null;
    this.overallProgress = 0;
    this.statusCounts = {
      'On Track': 0,
      'At Risk': 0,
      'Behind': 0,
      'Completed': 0,
      'Not Started': 0
    };
    this.totalObjectives = 0;
    this.totalKeyResults = 0;
    this.recentlyUpdatedKRs = [];
    this.generatedAt = new Date();
  }
}

// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================

/**
 * Configuration Manager for handling script properties
 */
class ConfigManager {
  
  /**
   * Get a property value from PropertiesService
   * @param {string} key - Property key
   * @param {string} defaultValue - Default value if property not found
   * @returns {string}
   */
  static getProperty(key, defaultValue = '') {
    const properties = PropertiesService.getScriptProperties();
    return properties.getProperty(key) || defaultValue;
  }
  
  /**
   * Set a property value in PropertiesService
   * @param {string} key - Property key
   * @param {string} value - Property value
   */
  static setProperty(key, value) {
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty(key, value);
  }
  
  /**
   * Set multiple properties at once
   * @param {Object} properties - Object with key-value pairs
   */
  static setProperties(properties) {
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperties(properties);
  }
  
  /**
   * Get all required configuration values
   * @returns {Object} Configuration object
   */
  static getConfig() {
    return {
      apiToken: this.getProperty(CONFIG.PROPERTIES.QUANTIVE_API_TOKEN),
      accountId: this.getProperty(CONFIG.PROPERTIES.QUANTIVE_ACCOUNT_ID),
      sessionId: this.getProperty(CONFIG.PROPERTIES.SESSION_ID),
      googleDocId: this.getProperty(CONFIG.PROPERTIES.GOOGLE_DOC_ID),
      googleSheetId: this.getProperty(CONFIG.PROPERTIES.GOOGLE_SHEET_ID),
      lookbackDays: parseInt(this.getProperty(CONFIG.PROPERTIES.LOOKBACK_DAYS, CONFIG.DEFAULT_LOOKBACK_DAYS.toString()))
    };
  }
  
  /**
   * Validate that all required configuration is present
   * @throws {Error} If required configuration is missing
   */
  static validateConfig() {
    const config = this.getConfig();
    const required = ['apiToken', 'accountId', 'sessionId'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }
    
    if (!config.googleDocId && !config.googleSheetId) {
      throw new Error('Either googleDocId or googleSheetId must be configured');
    }
    
    return config;
  }
}

// ============================================================================
// API CLIENT & AUTHENTICATION
// ============================================================================

/**
 * Quantive API Client for handling authentication and HTTP requests
 */
class QuantiveApiClient {
  
  /**
   * Constructor
   * @param {string} apiToken - Quantive API token
   * @param {string} accountId - Quantive account ID
   */
  constructor(apiToken, accountId) {
    this.apiToken = apiToken;
    this.accountId = accountId;
    this.baseUrl = CONFIG.QUANTIVE_BASE_URL;
    this.headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Account-Id': accountId
    };
  }
  
  /**
   * Make authenticated HTTP request to Quantive API
   * @param {string} endpoint - API endpoint (relative to base URL)
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {Object} payload - Request payload for POST/PUT requests
   * @returns {Object} API response
   * @throws {Error} If request fails after retries
   */
  makeRequest(endpoint, method = 'GET', payload = null) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options = {
      method: method,
      headers: this.headers,
      muteHttpExceptions: true
    };
    
    if (payload && (method === 'POST' || method === 'PUT')) {
      options.payload = JSON.stringify(payload);
    }
    
    return this.executeWithRetry(() => {
      Logger.log(`Making ${method} request to: ${url}`);
      const response = UrlFetchApp.fetch(url, options);
      return this.handleResponse(response, url);
    });
  }
  
  /**
   * Execute function with retry logic
   * @param {Function} fn - Function to execute
   * @returns {Object} Function result
   * @throws {Error} If all retries fail
   */
  executeWithRetry(fn) {
    let lastError;
    
    for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      try {
        return fn();
      } catch (error) {
        lastError = error;
        Logger.log(`Attempt ${attempt} failed: ${error.toString()}`);
        
        if (attempt < CONFIG.MAX_RETRIES) {
          const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
          Logger.log(`Retrying in ${delay}ms...`);
          Utilities.sleep(delay);
        }
      }
    }
    
    throw new Error(`API request failed after ${CONFIG.MAX_RETRIES} attempts. Last error: ${lastError.toString()}`);
  }
  
  /**
   * Handle HTTP response
   * @param {HTTPResponse} response - HTTP response object
   * @param {string} url - Request URL for logging
   * @returns {Object} Parsed response data
   * @throws {Error} If response indicates error
   */
  handleResponse(response, url) {
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log(`Response from ${url}: ${statusCode}`);
    
    // Handle rate limiting
    if (statusCode === 429) {
      const retryAfter = response.getHeaders()['Retry-After'] || '60';
      const delay = parseInt(retryAfter) * 1000;
      Logger.log(`Rate limited. Waiting ${delay}ms before retry...`);
      Utilities.sleep(delay);
      throw new Error('Rate limited - will retry');
    }
    
    // Handle authentication errors
    if (statusCode === 401) {
      throw new Error('Authentication failed. Check API token and account ID.');
    }
    
    // Handle forbidden access
    if (statusCode === 403) {
      throw new Error('Access forbidden. Check permissions for the requested resource.');
    }
    
    // Handle not found
    if (statusCode === 404) {
      throw new Error('Resource not found. Check the session ID or endpoint.');
    }
    
    // Handle other client errors
    if (statusCode >= 400 && statusCode < 500) {
      throw new Error(`Client error ${statusCode}: ${responseText}`);
    }
    
    // Handle server errors
    if (statusCode >= 500) {
      throw new Error(`Server error ${statusCode}: ${responseText}`);
    }
    
    // Parse successful response
    if (statusCode >= 200 && statusCode < 300) {
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        Logger.log(`Failed to parse response: ${responseText}`);
        throw new Error(`Invalid JSON response: ${parseError.toString()}`);
      }
    }
    
    throw new Error(`Unexpected response code ${statusCode}: ${responseText}`);
  }
  
  /**
   * Test API connectivity and authentication
   * @returns {boolean} True if connection successful
   * @throws {Error} If connection fails
   */
  testConnection() {
    try {
      // Test with a simple endpoint - account info or sessions list
      const response = this.makeRequest('/sessions', 'GET');
      Logger.log('API connection test successful');
      return true;
    } catch (error) {
      Logger.log(`API connection test failed: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Get session data by ID
   * @param {string} sessionId - Session ID
   * @returns {Object} Session data
   */
  getSession(sessionId) {
    return this.makeRequest(`/sessions/${sessionId}`, 'GET');
  }
  
  /**
   * Get objectives for a session
   * @param {string} sessionId - Session ID
   * @returns {Array} Array of objectives
   */
  getObjectives(sessionId) {
    return this.makeRequest(`/sessions/${sessionId}/objectives`, 'GET');
  }
  
  /**
   * Get key results for an objective
   * @param {string} objectiveId - Objective ID
   * @returns {Array} Array of key results
   */
  getKeyResults(objectiveId) {
    return this.makeRequest(`/objectives/${objectiveId}/key-results`, 'GET');
  }
  
  /**
   * Get all objectives and key results for a session
   * @param {string} sessionId - Session ID
   * @returns {Object} Complete session data with objectives and key results
   */
  getCompleteSessionData(sessionId) {
    try {
      Logger.log(`Fetching complete session data for session: ${sessionId}`);
      
      // Get session info
      const sessionData = this.getSession(sessionId);
      const session = new QuantiveSession(sessionData);
      
      // Get objectives
      const objectivesData = this.getObjectives(sessionId);
      
      // Get key results for each objective
      for (const objData of objectivesData) {
        const objective = new QuantiveObjective(objData);
        
        try {
          const keyResultsData = this.getKeyResults(objective.id);
          objective.keyResults = keyResultsData.map(kr => new QuantiveKeyResult(kr));
        } catch (error) {
          Logger.log(`Warning: Could not fetch key results for objective ${objective.id}: ${error.toString()}`);
          objective.keyResults = [];
        }
        
        session.objectives.push(objective);
      }
      
      Logger.log(`Successfully fetched session data: ${session.objectives.length} objectives, ${session.objectives.reduce((total, obj) => total + obj.keyResults.length, 0)} key results`);
      return session;
      
    } catch (error) {
      Logger.log(`Error fetching complete session data: ${error.toString()}`);
      throw error;
    }
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main function to generate Quantive session report
 * This is the function that should be called by triggers
 */
function generateQuantiveReport() {
  try {
    Logger.log('Starting Quantive report generation...');
    
    // Validate configuration
    const config = ConfigManager.validateConfig();
    Logger.log('Configuration validated successfully');
    
    // Initialize API client
    const apiClient = new QuantiveApiClient(config.apiToken, config.accountId);
    
    // Test API connectivity
    apiClient.testConnection();
    Logger.log('API connectivity test passed');
    
    // TODO: Fetch session data
    // TODO: Generate report summary
    // TODO: Output to Google Docs/Sheets
    
    Logger.log('Quantive report generation completed successfully');
    
  } catch (error) {
    Logger.log('Error generating Quantive report: ' + error.toString());
    throw error;
  }
}

/**
 * Setup function to initialize configuration
 * Run this once to set up your credentials and settings
 */
function setupConfiguration() {
  // Example configuration - replace with your actual values
  const exampleConfig = {
    [CONFIG.PROPERTIES.QUANTIVE_API_TOKEN]: 'your-api-token-here',
    [CONFIG.PROPERTIES.QUANTIVE_ACCOUNT_ID]: 'your-account-id-here',
    [CONFIG.PROPERTIES.SESSION_ID]: 'your-session-id-here',
    [CONFIG.PROPERTIES.GOOGLE_DOC_ID]: 'your-google-doc-id-here', // Optional
    [CONFIG.PROPERTIES.GOOGLE_SHEET_ID]: 'your-google-sheet-id-here', // Optional
    [CONFIG.PROPERTIES.LOOKBACK_DAYS]: '7'
  };
  
  Logger.log('To configure this script, use ConfigManager.setProperties() with your actual values');
  Logger.log('Example: ConfigManager.setProperties({...})');
  Logger.log('Required properties: ' + JSON.stringify(Object.keys(exampleConfig)));
}

/**
 * Test function to verify configuration and API connectivity
 */
function testConfiguration() {
  try {
    const config = ConfigManager.validateConfig();
    Logger.log('Configuration test passed!');
    Logger.log('Config: ' + JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    Logger.log('Configuration test failed: ' + error.toString());
    return false;
  }
}

/**
 * Test API connectivity
 */
function testApiConnection() {
  try {
    const config = ConfigManager.validateConfig();
    const apiClient = new QuantiveApiClient(config.apiToken, config.accountId);
    
    Logger.log('Testing API connection...');
    const result = apiClient.testConnection();
    Logger.log('API connection test successful!');
    return result;
    
  } catch (error) {
    Logger.log('API connection test failed: ' + error.toString());
    return false;
  }
}