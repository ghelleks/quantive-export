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
    
    // TODO: Implement API client and data fetching
    // TODO: Implement report generation
    // TODO: Implement output to Google Docs/Sheets
    
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
 * Test function to verify configuration
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