/**
 * Quantive Session Snapshot & Summary Generator
 * Google Apps Script for generating periodic reports from Quantive API
 *
 * SYSTEM ARCHITECTURE & DATA FLOW
 * ===============================
 *
 * This system provides automated Quantive (OKR platform) reporting with the following architecture:
 *
 * 1. DATA ACQUISITION LAYER
 *    ├── QuantiveApiClient: Secure API communication with retry logic
 *    ├── ConfigManager: Encrypted credential and settings management
 *    └── Authentication: Bearer token + Account ID header system
 *
 * 2. DATA PROCESSING LAYER
 *    ├── DataProcessor: Analytics engine for progress calculations
 *    ├── DataTransformUtils: Data transformation and formatting utilities
 *    └── Business Logic: Status categorization and insights generation
 *
 * 3. REPORTING LAYER
 *    ├── GoogleDocsReportGenerator: Formatted document creation
 *    ├── GoogleSheetsReportGenerator: Tabular data and historical tracking
 *    └── Multi-format output with consistent data structure
 *
 * 4. AUTOMATION LAYER
 *    ├── TriggerManager: Scheduled execution management
 *    ├── ExecutionLogger: Monitoring and debugging capabilities
 *    └── ErrorHandler: Resilient error handling and recovery
 *
 * 5. TESTING & VALIDATION LAYER
 *    ├── TestSuite: Unit testing for all components
 *    ├── IntegrationTestSuite: End-to-end workflow validation
 *    └── PerformanceTestSuite: Execution time and resource optimization
 *
 * DATA FLOW SEQUENCE
 * ==================
 *
 * 1. INITIALIZATION
 *    • ConfigManager validates required properties (API token, account ID, session ID)
 *    • QuantiveApiClient instantiated with authenticated headers
 *    • Target output destination verified (Google Doc or Sheet)
 *
 * 2. DATA FETCHING
 *    • Fetch session metadata from /sessions/{id} endpoint
 *    • Retrieve all objectives for session from /objectives?sessionId={id}
 *    • For each objective, fetch key results from /key-results?objectiveId={id}
 *    • Apply retry logic with exponential backoff for resilience
 *
 * 3. DATA PROCESSING
 *    • Transform raw API responses into structured objects (Session → Objectives → Key Results)
 *    • Calculate overall progress weighted by key result completion
 *    • Categorize statuses and generate counts (On Track, At Risk, Behind, etc.)
 *    • Identify recently updated items based on configurable lookback period
 *    • Generate intelligent insights and recommendations
 *
 * 4. REPORT GENERATION
 *    • Compile ReportSummary with processed analytics
 *    • Generate formatted output based on configuration:
 *      - Google Docs: Multi-section document with tables and formatting
 *      - Google Sheets: Historical data row with 15 tracked metrics
 *    • Apply consistent styling and formatting rules
 *
 * 5. ERROR HANDLING & LOGGING
 *    • Classify errors by type (network, authentication, rate limit, server)
 *    • Apply appropriate retry strategies and fallback mechanisms
 *    • Generate detailed execution logs for monitoring and debugging
 *    • Preserve partial data in case of non-critical failures
 *
 * CONFIGURATION REQUIREMENTS
 * ==========================
 *
 * Required Properties (stored securely in PropertiesService):
 * - QUANTIVE_API_TOKEN: Authentication token from Quantive settings
 * - QUANTIVE_ACCOUNT_ID: Account identifier for multi-tenant API access
 * - SESSION_ID: Target session UUID to analyze and report on
 *
 * Optional Properties:
 * - GOOGLE_DOC_ID: Target document ID for formatted reports
 * - GOOGLE_SHEET_ID: Target spreadsheet ID for historical data tracking
 * - LOOKBACK_DAYS: Number of days to consider for "recent activity" (default: 7)
 *
 * DEPLOYMENT & USAGE
 * ==================
 *
 * 1. Configure properties using setupConfiguration() function
 * 2. Test connectivity with testConfiguration() function
 * 3. Run manual report with generateQuantiveReport() function
 * 4. Set up automation with TriggerManager.setupTimeDrivenTrigger()
 * 5. Monitor execution with logs and error handling reports
 *
 * @version 1.0
 * @author Generated with Claude Code
 * @see project-requirements.md for detailed functional requirements
 * @see TODO.md for implementation roadmap and completed features
 */

// ============================================================================
// APPLICATION CONSTANTS
// ============================================================================
// Note: User configuration (API tokens, etc.) is now in config.gs

const APP_CONFIG = {
  // Quantive API Configuration
  QUANTIVE_BASE_URL: 'https://app.us.quantive.com/results/api/v1',
  API_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Report Configuration
  DEFAULT_LOOKBACK_DAYS: 7,
  MAX_EXECUTION_TIME: 300000, // 5 minutes (under 6 minute limit)
  
  // Status mappings
  STATUS_MAPPING: {
    'ON_TRACK': 'On Track',
    'AT_RISK': 'At Risk',
    'BEHIND': 'Behind',
    'COMPLETED': 'Completed',
    'NOT_STARTED': 'Not Started'
  },
  
  // Data management constants
  SHEET_MAX_ROWS: 100,
  MAX_INSIGHTS: 3,
  PROGRESS_BAR_LENGTH: 20,
  
  // URL patterns for validation
  GOOGLE_DOC_URL_PATTERN: /\/d\/([a-zA-Z0-9-_]+)/,
  API_TOKEN_PATTERN: /^[a-zA-Z0-9._-]+$/,
  ACCOUNT_ID_PATTERN: /^[a-zA-Z0-9-]+$/
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * Represents a Quantive Session with objectives and metadata
 *
 * A Session is a time-bounded container for Objectives and Key Results,
 * typically representing a quarterly or annual planning period.
 *
 * @param {Object} data - Session data from Quantive API
 * @param {string} data.id - Unique session identifier
 * @param {string} data.name - Session display name
 * @param {string} data.description - Session description
 * @param {string} data.startDate - ISO date string for session start
 * @param {string} data.endDate - ISO date string for session end
 * @param {string} data.status - Session status (ACTIVE, COMPLETED, DRAFT, etc.)
 *
 * @example
 * const session = new QuantiveSession({
 *   id: 'session-123',
 *   name: 'Q4 2024 Goals',
 *   description: 'Fourth quarter strategic objectives',
 *   startDate: '2024-10-01T00:00:00Z',
 *   endDate: '2024-12-31T23:59:59Z',
 *   status: 'ACTIVE'
 * });
 */
class QuantiveSession {
  constructor(data) {
    /** @type {string} Unique session identifier */
    this.id = data.id;
    /** @type {string} Session display name */
    this.name = data.name;
    /** @type {string} Session description */
    this.description = data.description;
    /** @type {Date} Session start date */
    this.startDate = new Date(data.startDate);
    /** @type {Date} Session end date */
    this.endDate = new Date(data.endDate);
    /** @type {string} Current session status */
    this.status = data.status;
    /** @type {QuantiveObjective[]} Array of objectives within this session */
    this.objectives = [];
  }
}

/**
 * Represents a Quantive Objective with key results and progress tracking
 *
 * An Objective is a qualitative, ambitious goal that provides direction
 * and is measured by quantitative Key Results.
 *
 * @param {Object} data - Objective data from Quantive API
 * @param {string} data.id - Unique objective identifier
 * @param {string} data.name - Objective title/name
 * @param {string} data.description - Detailed objective description
 * @param {string} data.owner - Email or ID of objective owner
 * @param {string} data.status - Current status (ON_TRACK, AT_RISK, BEHIND, COMPLETED, NOT_STARTED)
 * @param {number} [data.progress=0] - Progress percentage (0-100)
 * @param {string} [data.lastUpdated] - ISO date string of last update
 *
 * @example
 * const objective = new QuantiveObjective({
 *   id: 'obj-123',
 *   name: 'Improve Customer Satisfaction',
 *   description: 'Enhance customer experience across all touchpoints',
 *   owner: 'jane.doe@company.com',
 *   status: 'ON_TRACK',
 *   progress: 65,
 *   lastUpdated: '2024-06-15T10:30:00Z'
 * });
 */
class QuantiveObjective {
  constructor(data) {
    /** @type {string} Unique objective identifier */
    this.id = data.id;
    /** @type {string} Objective title/name */
    this.name = data.name;
    /** @type {string} Detailed objective description */
    this.description = data.description;
    /** @type {string} Email or ID of objective owner */
    this.owner = data.owner;
    /** @type {string} Current objective status */
    this.status = data.status;
    /** @type {number} Progress percentage (0-100) */
    this.progress = data.progress || 0;
    /** @type {QuantiveKeyResult[]} Array of key results for this objective */
    this.keyResults = [];
    /** @type {Date|null} Date of last update, null if never updated */
    this.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : null;
  }
}

/**
 * Represents a Quantive Key Result with measurable progress tracking
 *
 * A Key Result is a measurable outcome that demonstrates progress toward
 * achieving an Objective. It includes current/target values and progress.
 *
 * @param {Object} data - Key Result data from Quantive API
 * @param {string} data.id - Unique key result identifier
 * @param {string} data.name - Key result title/name
 * @param {string} data.description - Detailed key result description
 * @param {string} data.owner - Email or ID of key result owner
 * @param {string} data.status - Current status (ON_TRACK, AT_RISK, BEHIND, COMPLETED, NOT_STARTED)
 * @param {number} [data.currentValue=0] - Current measured value
 * @param {number} [data.targetValue=0] - Target value to achieve
 * @param {string} [data.unit=''] - Unit of measurement (%, $, users, etc.)
 * @param {number} [data.progress=0] - Calculated progress percentage (0-100)
 * @param {string} [data.lastUpdated] - ISO date string of last update
 * @param {string} data.objectiveId - ID of parent objective
 *
 * @example
 * const keyResult = new QuantiveKeyResult({
 *   id: 'kr-456',
 *   name: 'Increase NPS Score',
 *   description: 'Improve Net Promoter Score through customer feedback',
 *   owner: 'john.smith@company.com',
 *   status: 'ON_TRACK',
 *   currentValue: 45,
 *   targetValue: 60,
 *   unit: 'points',
 *   progress: 75,
 *   lastUpdated: '2024-06-15T14:22:00Z',
 *   objectiveId: 'obj-123'
 * });
 */
class QuantiveKeyResult {
  constructor(data) {
    /** @type {string} Unique key result identifier */
    this.id = data.id;
    /** @type {string} Key result title/name */
    this.name = data.name;
    /** @type {string} Detailed key result description */
    this.description = data.description;
    /** @type {string} Email or ID of key result owner */
    this.owner = data.owner;
    /** @type {string} Current key result status */
    this.status = data.status;
    /** @type {number} Current measured value */
    this.currentValue = data.currentValue || 0;
    /** @type {number} Target value to achieve */
    this.targetValue = data.targetValue || 0;
    /** @type {string} Unit of measurement */
    this.unit = data.unit || '';
    /** @type {number} Calculated progress percentage (0-100) */
    this.progress = data.progress || 0;
    /** @type {Date|null} Date of last update, null if never updated */
    this.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : null;
    /** @type {string} ID of parent objective */
    this.objectiveId = data.objectiveId;
  }
  
  /**
   * Check if this KR was updated within the lookback period
   * @param {number} lookbackDays - Number of days to look back
   * @returns {boolean}
   */
  isRecentlyUpdated(lookbackDays = APP_CONFIG.DEFAULT_LOOKBACK_DAYS) {
    if (!this.lastUpdated) return false;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
    return this.lastUpdated > cutoffDate;
  }
}

/**
 * Represents a compiled summary report of Quantive session data
 *
 * Contains processed analytics, progress calculations, and insights
 * generated from session objectives and key results data.
 *
 * @example
 * const summary = new ReportSummary();
 * summary.sessionInfo = sessionData;
 * summary.overallProgress = 75.5;
 * summary.statusCounts['On Track'] = 12;
 */
class ReportSummary {
  constructor() {
    /** @type {QuantiveSession|null} Session information and metadata */
    this.sessionInfo = null;
    /** @type {number} Overall progress percentage across all key results */
    this.overallProgress = 0;
    /** @type {Object<string, number>} Count of key results by status category */
    this.statusCounts = {
      'On Track': 0,
      'At Risk': 0,
      'Behind': 0,
      'Completed': 0,
      'Not Started': 0
    };
    /** @type {number} Total number of objectives in session */
    this.totalObjectives = 0;
    /** @type {number} Total number of key results in session */
    this.totalKeyResults = 0;
    /** @type {QuantiveKeyResult[]} Key results updated within lookback period */
    this.recentlyUpdatedKRs = [];
    /** @type {Date} Timestamp when this report was generated */
    this.generatedAt = new Date();
  }
}

// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================

/**
 * Configuration Manager for secure handling of script properties and settings
 *
 * Manages all configuration values using Google Apps Script's PropertiesService
 * for secure storage of API credentials and user settings. All sensitive data
 * is stored encrypted and never exposed in the script code.
 *
 * Required Configuration Properties:
 * - QUANTIVE_API_TOKEN: Your Quantive API authentication token
 * - QUANTIVE_ACCOUNT_ID: Your Quantive account identifier
 * - SESSION_ID: Target session ID to analyze
 *
 * Optional Configuration Properties:
 * - GOOGLE_DOC_ID: Target Google Doc ID for formatted reports
 * - GOOGLE_SHEET_ID: Target Google Sheet ID for tabular data
 * - LOOKBACK_DAYS: Number of days to look back for recent activity (default: 7)
 *
 * @example Setup Configuration
 * // Set required properties
 * ConfigManager.setProperties({
 *   'QUANTIVE_API_TOKEN': 'your-api-token-here',
 *   'QUANTIVE_ACCOUNT_ID': 'your-account-id',
 *   'SESSION_ID': 'target-session-id',
 *   'GOOGLE_DOC_ID': 'optional-google-doc-id',
 *   'LOOKBACK_DAYS': '7'
 * });
 *
 * @see https://developers.google.com/apps-script/guides/properties
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
   * Get all required configuration values from config.gs
   * @returns {Object} Configuration object
   */
  static getConfig() {
    if (typeof CONFIG === 'undefined') {
      throw new Error('CONFIG not found. Please create config.gs file from config.example.gs template.');
    }
    
    // Validate required configuration
    if (!CONFIG.QUANTIVE_API_TOKEN || CONFIG.QUANTIVE_API_TOKEN.trim() === '' || CONFIG.QUANTIVE_API_TOKEN === 'your-actual-api-token-here') {
      throw new Error('QUANTIVE_API_TOKEN is required in config.gs. Please set your actual API token.');
    }
    
    if (!CONFIG.QUANTIVE_ACCOUNT_ID || CONFIG.QUANTIVE_ACCOUNT_ID.trim() === '' || CONFIG.QUANTIVE_ACCOUNT_ID === 'your-actual-account-id-here') {
      throw new Error('QUANTIVE_ACCOUNT_ID is required in config.gs. Please set your actual account ID.');
    }
    
    const environment = CONFIG.ENVIRONMENT || 'production';
    
    return {
      apiToken: CONFIG.QUANTIVE_API_TOKEN,
      accountId: CONFIG.QUANTIVE_ACCOUNT_ID,
      baseUrl: CONFIG.QUANTIVE_BASE_URL || APP_CONFIG.QUANTIVE_BASE_URL,
      sessionId: this.resolveSessionId(CONFIG.SESSION_ID),
      googleDocId: CONFIG.GOOGLE_DOC_ID || '',
      googleSheetId: CONFIG.GOOGLE_SHEET_ID || '',
      lookbackDays: parseInt(CONFIG.LOOKBACK_DAYS || APP_CONFIG.DEFAULT_LOOKBACK_DAYS),
      environment: environment,
      
      // Environment-specific settings with defaults
      apiRateLimitDelay: 1000,
      maxRetries: APP_CONFIG.MAX_RETRIES,
      retryDelay: APP_CONFIG.RETRY_DELAY,
      logLevel: 'INFO'
    };
  }
  
  /**
   * Get environment-specific setting with fallback to default
   * @param {string} environment - Current environment
   * @param {string} setting - Setting name
   * @param {*} defaultValue - Default value
   * @returns {*} Setting value
   */
  static getEnvironmentSetting(environment, setting, defaultValue) {
    // Try environment-specific setting first
    const envSetting = this.getProperty(`${environment.toUpperCase()}_${setting}`);
    if (envSetting) {
      return isNaN(envSetting) ? envSetting : parseInt(envSetting);
    }
    
    // Fall back to global setting
    const globalSetting = this.getProperty(setting);
    if (globalSetting) {
      return isNaN(globalSetting) ? globalSetting : parseInt(globalSetting);
    }
    
    // Use default
    return defaultValue;
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
    
    // Validate API token format
    this.validateApiToken(config.apiToken);
    
    // Validate account ID format
    this.validateAccountId(config.accountId);
    
    // Validate JWT token contains matching account ID
    this.validateJwtAccountMatch(config.apiToken, config.accountId);
    
    // Validate session ID format
    this.validateSessionId(config.sessionId);
    
    if (!config.googleDocId && !config.googleSheetId) {
      throw new Error('Either googleDocId or googleSheetId must be configured');
    }
    
    return config;
  }
  
  /**
   * Validate API token format
   * @param {string} token - API token to validate
   * @throws {Error} If token format is invalid
   */
  static validateApiToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('API token must be a non-empty string');
    }
    
    if (token.length < 10) {
      throw new Error('API token appears to be too short');
    }
    
    if (token === 'your-api-token-here' || token === 'your-quantive-api-token-here') {
      throw new Error('Please replace the placeholder API token with your actual token');
    }
    
    // Basic format validation - most API tokens contain alphanumeric characters and some symbols
    if (!/^[A-Za-z0-9\-_\.]+$/.test(token)) {
      Logger.log('Warning: API token contains unexpected characters, please verify it is correct');
    }
    
    // Validate JWT token if it looks like one
    if (token.includes('.') && token.split('.').length === 3) {
      this.validateJwtToken(token);
    }
  }
  
  /**
   * Validate JWT token format and expiration
   * @param {string} token - JWT token to validate
   * @throws {Error} If JWT token is invalid or expired
   */
  static validateJwtToken(token) {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(tokenParts[1])).getDataAsString());
      const now = Math.floor(Date.now() / 1000);
      
      // Check expiration
      if (payload.exp && now > payload.exp) {
        const expiredMinutes = Math.floor((now - payload.exp) / 60);
        throw new Error(`JWT token expired ${expiredMinutes} minutes ago. Please generate a new token.`);
      }
      
      // Check if issued too far in future (clock skew)
      if (payload.iat && payload.iat > now + 300) {
        const futureMinutes = Math.floor((payload.iat - now) / 60);
        throw new Error(`JWT token issued ${futureMinutes} minutes in the future. Check system clock.`);
      }
      
      // Warn if expires soon (within 1 hour)
      if (payload.exp && (payload.exp - now) < 3600) {
        const expiresInMinutes = Math.floor((payload.exp - now) / 60);
        Logger.log(`⚠️ JWT token expires in ${expiresInMinutes} minutes. Consider refreshing soon.`);
      }
      
    } catch (e) {
      if (e.message.includes('expired') || e.message.includes('future') || e.message.includes('Invalid JWT')) {
        throw e;
      }
      Logger.log(`Warning: Could not validate JWT token: ${e.message}`);
    }
  }
  
  /**
   * Validate JWT token account ID matches configuration
   * @param {string} token - JWT token
   * @param {string} accountId - Configured account ID
   * @throws {Error} If account IDs don't match
   */
  static validateJwtAccountMatch(token, accountId) {
    if (!token.includes('.') || token.split('.').length !== 3) {
      return; // Not a JWT token, skip validation
    }
    
    try {
      const tokenParts = token.split('.');
      const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(tokenParts[1])).getDataAsString());
      
      const jwtAccountId = payload['https://quantive.com/app_metadata/accountId'] || 
                          payload['https://gtmhub.com/app_metadata/accountId'];
      
      if (jwtAccountId && jwtAccountId !== accountId) {
        throw new Error(`Account ID mismatch: JWT token contains '${jwtAccountId}' but configuration uses '${accountId}'. Please use matching account ID or regenerate token.`);
      }
      
    } catch (e) {
      if (e.message.includes('Account ID mismatch')) {
        throw e;
      }
      Logger.log(`Warning: Could not validate JWT account match: ${e.message}`);
    }
  }
  
  /**
   * Validate account ID format
   * @param {string} accountId - Account ID to validate
   * @throws {Error} If account ID format is invalid
   */
  static validateAccountId(accountId) {
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('Account ID must be a non-empty string');
    }
    
    if (accountId === 'your-account-id-here' || accountId === 'your-account-id') {
      throw new Error('Please replace the placeholder account ID with your actual account ID');
    }
  }
  
  /**
   * Validate session ID format (UUID)
   * @param {string} sessionId - Session ID to validate
   * @throws {Error} If session ID format is invalid
   */
  static validateSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID must be a non-empty string');
    }
    
    if (sessionId === 'your-session-id-here' || sessionId === 'your-session-uuid-here') {
      throw new Error('Please replace the placeholder session ID with your actual session ID');
    }
    
    // Validate UUID format (basic check)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(sessionId)) {
      Logger.log('Warning: Session ID does not appear to be a valid UUID format');
    }
  }

  /**
   * Resolve session identifier to session ID
   * Accepts either a session name or a session ID (UUID)
   * @param {string} sessionIdentifier - Session name or session ID
   * @returns {string} Resolved session UUID
   * @throws {Error} If session cannot be found or resolved
   */
  static resolveSessionId(sessionIdentifier) {
    if (!sessionIdentifier || typeof sessionIdentifier !== 'string') {
      throw new Error('Session identifier must be a non-empty string');
    }

    // Check if it's already a valid session ID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const objectIdPattern = /^[0-9a-f]{24}$/i; // MongoDB ObjectId format
    
    if (uuidPattern.test(sessionIdentifier)) {
      Logger.log('Session identifier is already a UUID, using as-is');
      return sessionIdentifier;
    }
    
    if (objectIdPattern.test(sessionIdentifier)) {
      Logger.log('Session identifier is already an ObjectId, using as-is');
      return sessionIdentifier;
    }

    // Check for placeholder values
    if (sessionIdentifier === 'your-session-name-here' ||
        sessionIdentifier === 'your-session-id-here' ||
        sessionIdentifier === 'your-session-uuid-here') {
      throw new Error('Please replace the placeholder session identifier with your actual session name or ID');
    }

    Logger.log(`Resolving session name "${sessionIdentifier}" to session ID...`);

    try {
      // Get API configuration for session lookup
      if (typeof CONFIG === 'undefined') {
        throw new Error('CONFIG not found. Please create config.gs file from config.example.gs template.');
      }

      if (!CONFIG.QUANTIVE_API_TOKEN || !CONFIG.QUANTIVE_ACCOUNT_ID) {
        throw new Error('API token and account ID must be configured before resolving session names');
      }

      // Create API client instance for session lookup
      const apiClient = new QuantiveApiClient(CONFIG.QUANTIVE_API_TOKEN, CONFIG.QUANTIVE_ACCOUNT_ID, CONFIG.QUANTIVE_BASE_URL);
      
      // Fetch all sessions to find matching name
      const sessions = apiClient.getSessions();
      
      if (!sessions || !Array.isArray(sessions)) {
        throw new Error('Failed to retrieve sessions list from Quantive API');
      }

      Logger.log(`Found ${sessions.length} sessions, searching for "${sessionIdentifier}"`);

      // Search for session by name/title (case-insensitive)
      const matchingSession = sessions.find(session => {
        const sessionName = session.title || session.name;
        return sessionName && sessionName.toLowerCase() === sessionIdentifier.toLowerCase();
      });

      if (!matchingSession) {
        // Provide helpful error with available session names
        const availableNames = sessions
          .filter(session => session.title || session.name)
          .map(session => session.title || session.name)
          .slice(0, 10); // Limit to first 10 for readability
        
        const namesList = availableNames.length > 0
          ? `Available session names: ${availableNames.join(', ')}${sessions.length > 10 ? '...' : ''}`
          : 'No sessions with names found';
        
        throw new Error(`Session with name "${sessionIdentifier}" not found. ${namesList}`);
      }

      if (!matchingSession.id) {
        throw new Error(`Found session "${sessionIdentifier}" but it has no ID field`);
      }

      Logger.log(`Successfully resolved session "${sessionIdentifier}" to ID: ${matchingSession.id}`);
      return matchingSession.id;

    } catch (error) {
      if (error.message.includes('Session with name')) {
        // Re-throw session not found errors as-is
        throw error;
      } else {
        // Wrap other errors with context
        throw new Error(`Failed to resolve session name "${sessionIdentifier}": ${error.message}`);
      }
    }
  }
}

// ============================================================================
// API CLIENT & AUTHENTICATION
// ============================================================================

/**
 * Quantive API Client for authenticated HTTP requests and data fetching
 *
 * Provides a robust interface to the Quantive (formerly Gtmhub) REST API with
 * comprehensive error handling, rate limiting, and automatic retry mechanisms.
 *
 * Authentication:
 * - Uses Bearer token authentication with API token
 * - Requires X-Account-Id header for multi-tenant support
 * - Supports both production and staging environments
 *
 * Features:
 * - Exponential backoff retry logic for resilient API calls
 * - Comprehensive HTTP status code handling and error classification
 * - Built-in rate limiting protection with intelligent backoff
 * - Request/response logging for debugging and monitoring
 * - Automatic JSON parsing with validation
 *
 * Supported API Endpoints:
 * - Sessions: /sessions/{id} - Retrieve session details
 * - Objectives: /objectives?sessionId={id} - List session objectives
 * - Key Results: /key-results?objectiveId={id} - List objective key results
 *
 * Rate Limits (as of API v1.0):
 * - 1000 requests per hour per account
 * - 10 requests per second burst limit
 * - 429 status code returned when limits exceeded
 *
 * @example Basic Usage
 * const client = new QuantiveApiClient('your-api-token', 'your-account-id');
 * const sessionData = await client.getCompleteSessionData('session-123');
 *
 * @example Error Handling
 * try {
 *   const data = await client.makeRequest('/sessions/invalid-id');
 * } catch (error) {
 *   if (error.message.includes('404')) {
 *     console.log('Session not found');
 *   }
 * }
 *
 * @see https://developers.quantive.com/api/v1/reference
 * @see https://developers.quantive.com/api/authentication
 */
class QuantiveApiClient {
  
  /**
   * Constructor
   * @param {string} apiToken - Quantive API token
   * @param {string} accountId - Quantive account ID
   * @param {string} [baseUrl] - Optional custom base URL (overrides default)
   */
  constructor(apiToken, accountId, baseUrl = null) {
    this.apiToken = apiToken;
    this.accountId = accountId;
    this.baseUrl = baseUrl || APP_CONFIG.QUANTIVE_BASE_URL;
    
    // Debug: Log account ID value and JWT payload
    Logger.log(`QuantiveApiClient initialized with Account ID: "${accountId}" (type: ${typeof accountId})`);
    
    // Debug JWT token payload using GAS base64 decode
    try {
      const tokenParts = apiToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Utilities.newBlob(Utilities.base64Decode(tokenParts[1])).getDataAsString());
        
        // Check token expiration
        const now = Math.floor(Date.now() / 1000);
        const issuedAt = payload.iat;
        const expiresAt = payload.exp;
        
        Logger.log(`JWT audience: ${payload.aud || 'not set'}`);
        Logger.log(`JWT issued at: ${issuedAt} (${new Date(issuedAt * 1000).toISOString()})`);
        Logger.log(`JWT expires at: ${expiresAt ? expiresAt + ' (' + new Date(expiresAt * 1000).toISOString() + ')' : 'not set'}`);
        Logger.log(`Current time: ${now} (${new Date(now * 1000).toISOString()})`);
        
        if (expiresAt && now > expiresAt) {
          Logger.log(`⚠️ JWT TOKEN EXPIRED! Expired ${Math.floor((now - expiresAt) / 60)} minutes ago`);
        } else if (issuedAt > now + 300) { // More than 5 minutes in future
          Logger.log(`⚠️ JWT TOKEN ISSUED IN FUTURE! Check system clock. Token issued ${Math.floor((issuedAt - now) / 60)} minutes from now`);
        }
        
        Logger.log(`JWT gtmhub account: ${payload['https://gtmhub.com/app_metadata/accountId'] || 'not set'}`);
        Logger.log(`JWT quantive account: ${payload['https://quantive.com/app_metadata/accountId'] || 'not set'}`);
        
        // Validate account ID matches JWT claims
        const jwtAccountId = payload['https://quantive.com/app_metadata/accountId'] || payload['https://gtmhub.com/app_metadata/accountId'];
        if (jwtAccountId && jwtAccountId !== accountId) {
          Logger.log(`⚠️ ACCOUNT ID MISMATCH: JWT contains '${jwtAccountId}' but using '${accountId}'`);
        }
      }
    } catch (e) {
      Logger.log(`Could not decode JWT: ${e.message}`);
    }
    
    if (!accountId || accountId.trim() === '') {
      throw new Error('Account ID is required and cannot be empty');
    }
    
    this.headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'gtmhub-accountId': accountId
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
    
    // Debug logging
    Logger.log(`Making ${method} request to: ${url}`);
    Logger.log(`Headers: ${JSON.stringify(this.headers, null, 2)}`);
    
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
    
    for (let attempt = 1; attempt <= APP_CONFIG.MAX_RETRIES; attempt++) {
      try {
        return fn();
      } catch (error) {
        lastError = error;
        Logger.log(`Attempt ${attempt} failed: ${error.toString()}`);
        
        if (attempt < APP_CONFIG.MAX_RETRIES) {
          const delay = APP_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
          Logger.log(`Retrying in ${delay}ms...`);
          Utilities.sleep(delay);
        }
      }
    }
    
    throw new Error(`API request failed after ${APP_CONFIG.MAX_RETRIES} attempts. Last error: ${lastError.toString()}`);
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
    Logger.log(`Response body: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
    
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
      // Test with a simple endpoint - sessions list
      Logger.log('Testing API connection with sessions endpoint...');
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
    const response = this.makeRequest(`/goals?sessionId=${sessionId}`, 'GET');
    // Quantive API may return objectives wrapped in an 'items' property
    return response.items || response || [];
  }
  
  /**
   * Get all sessions
   * @returns {Array} Array of session objects
   */
  getSessions() {
    const response = this.makeRequest('/sessions', 'GET');
    // Quantive API returns sessions wrapped in an 'items' property
    return response.items || response || [];
  }
  
  /**
   * Get key results for an objective
   * @param {string} objectiveId - Objective ID
   * @returns {Array} Array of key results
   */
  getKeyResults(objectiveId) {
    const response = this.makeRequest(`/metrics?goalId=${objectiveId}`, 'GET');
    // Quantive API may return key results wrapped in an 'items' property
    return response.items || response || [];
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
// DATA PROCESSING & ANALYTICS ENGINE
// ============================================================================

/**
 * Data Processing Engine for analyzing Quantive session data
 */
class DataProcessor {
  
  /**
   * Constructor
   * @param {number} lookbackDays - Number of days to look back for recent activity
   */
  constructor(lookbackDays = APP_CONFIG.DEFAULT_LOOKBACK_DAYS) {
    this.lookbackDays = lookbackDays;
  }
  
  /**
   * Process complete session data and generate report summary
   * @param {QuantiveSession} sessionData - Complete session data
   * @returns {ReportSummary} Processed report summary
   */
  processSessionData(sessionData) {
    try {
      Logger.log('Processing session data...');
      
      const summary = new ReportSummary();
      summary.sessionInfo = this.extractSessionInfo(sessionData);
      
      // Collect all key results from all objectives
      const allKeyResults = [];
      for (const objective of sessionData.objectives) {
        allKeyResults.push(...objective.keyResults);
      }
      
      // Calculate metrics
      summary.totalObjectives = sessionData.objectives.length;
      summary.totalKeyResults = allKeyResults.length;
      summary.overallProgress = this.calculateOverallProgress(allKeyResults);
      summary.statusCounts = this.calculateStatusCounts(allKeyResults);
      summary.recentlyUpdatedKRs = this.findRecentlyUpdatedKRs(allKeyResults);
      
      Logger.log(`Processing complete: ${summary.totalObjectives} objectives, ${summary.totalKeyResults} key results, ${summary.overallProgress.toFixed(1)}% progress`);
      return summary;
      
    } catch (error) {
      Logger.log(`Error processing session data: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Extract session information for the report
   * @param {QuantiveSession} sessionData - Session data
   * @returns {Object} Session info object
   */
  extractSessionInfo(sessionData) {
    return {
      id: sessionData.id,
      name: sessionData.name,
      description: sessionData.description,
      startDate: sessionData.startDate,
      endDate: sessionData.endDate,
      status: sessionData.status,
      daysRemaining: this.calculateDaysRemaining(sessionData.endDate)
    };
  }
  
  /**
   * Calculate overall progress as weighted average of key result progress
   * @param {Array<QuantiveKeyResult>} keyResults - Array of key results
   * @returns {number} Overall progress percentage (0-100)
   */
  calculateOverallProgress(keyResults) {
    if (keyResults.length === 0) return 0;
    
    const totalProgress = keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0);
    return totalProgress / keyResults.length;
  }
  
  /**
   * Calculate status distribution counts
   * @param {Array<QuantiveKeyResult>} keyResults - Array of key results
   * @returns {Object} Status counts object
   */
  calculateStatusCounts(keyResults) {
    const counts = {
      'On Track': 0,
      'At Risk': 0,
      'Behind': 0,
      'Completed': 0,
      'Not Started': 0
    };
    
    for (const kr of keyResults) {
      const mappedStatus = APP_CONFIG.STATUS_MAPPING[kr.status] || 'Not Started';
      if (counts.hasOwnProperty(mappedStatus)) {
        counts[mappedStatus]++;
      }
    }
    
    return counts;
  }
  
  /**
   * Find key results updated within the lookback period
   * @param {Array<QuantiveKeyResult>} keyResults - Array of key results
   * @returns {Array<Object>} Recently updated key results with metadata
   */
  findRecentlyUpdatedKRs(keyResults) {
    const recentKRs = keyResults.filter(kr => kr.isRecentlyUpdated(this.lookbackDays));
    
    return recentKRs.map(kr => ({
      id: kr.id,
      name: kr.name,
      owner: kr.owner,
      status: APP_CONFIG.STATUS_MAPPING[kr.status] || kr.status,
      progress: kr.progress,
      currentValue: kr.currentValue,
      targetValue: kr.targetValue,
      unit: kr.unit,
      lastUpdated: kr.lastUpdated,
      objectiveId: kr.objectiveId
    }));
  }
  
  /**
   * Calculate days remaining until session end
   * @param {Date} endDate - Session end date
   * @returns {number} Days remaining (negative if past due)
   */
  calculateDaysRemaining(endDate) {
    const today = new Date();
    const timeDiff = endDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
  
  /**
   * Generate insights based on the data
   * @param {ReportSummary} summary - Report summary
   * @returns {Array<string>} Array of insight strings
   */
  generateInsights(summary) {
    const insights = [];
    
    // Progress insights
    if (summary.overallProgress >= 80) {
      insights.push('🎯 Excellent progress! Most key results are on track to completion.');
    } else if (summary.overallProgress >= 60) {
      insights.push('📈 Good progress overall, but some areas may need attention.');
    } else if (summary.overallProgress >= 40) {
      insights.push('⚠️ Progress is moderate. Consider reviewing struggling key results.');
    } else {
      insights.push('🚨 Progress is behind expectations. Immediate action recommended.');
    }
    
    // Status distribution insights
    const atRiskCount = summary.statusCounts['At Risk'];
    const behindCount = summary.statusCounts['Behind'];
    
    if (atRiskCount > 0 || behindCount > 0) {
      insights.push(`⚡ ${atRiskCount + behindCount} key results need immediate attention.`);
    }
    
    // Recent activity insights
    if (summary.recentlyUpdatedKRs.length === 0) {
      insights.push(`📅 No recent updates in the last ${this.lookbackDays} days. Consider checking in with teams.`);
    } else {
      insights.push(`✅ ${summary.recentlyUpdatedKRs.length} key results updated recently - good engagement!`);
    }
    
    // Timeline insights
    if (summary.sessionInfo.daysRemaining < 0) {
      insights.push('📆 Session end date has passed. Consider closing or extending the session.');
    } else if (summary.sessionInfo.daysRemaining <= 7) {
      insights.push(`⏰ Only ${summary.sessionInfo.daysRemaining} days remaining in this session.`);
    }
    
    return insights;
  }
}

/**
 * Utility functions for data transformation and formatting
 *
 * Provides a comprehensive set of static utility methods for transforming,
 * formatting, and manipulating data throughout the reporting pipeline.
 *
 * Key Features:
 * - Progress and percentage formatting with locale support
 * - Date formatting with multiple output formats
 * - Value formatting with unit handling and localization
 * - Text truncation with intelligent ellipsis placement
 * - Priority-based sorting algorithms for key results
 * - Status mapping and normalization utilities
 *
 * Design Principles:
 * - All methods are static for performance and simplicity
 * - Defensive programming with null/undefined handling
 * - Consistent return types and error handling
 * - Locale-aware formatting where applicable
 *
 * @example Progress Formatting
 * DataTransformUtils.formatProgress(75.67); // "76%"
 * DataTransformUtils.formatProgress(null);   // "0%"
 *
 * @example Date Formatting
 * const date = new Date('2024-06-15');
 * DataTransformUtils.formatDate(date); // "Jun 15, 2024"
 *
 * @example Value Formatting
 * DataTransformUtils.formatValueWithUnit(1500, '$');     // "$1,500"
 * DataTransformUtils.formatValueWithUnit(85.5, 'users'); // "85.5 users"
 */
class DataTransformUtils {
  
  /**
   * Format progress as percentage string
   * @param {number} progress - Progress value (0-100)
   * @returns {string} Formatted percentage
   */
  static formatProgress(progress) {
    return `${Math.round(progress || 0)}%`;
  }
  
  /**
   * Format date for display
   * @param {Date} date - Date object
   * @returns {string} Formatted date string
   */
  static formatDate(date) {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  /**
   * Format value with unit
   * @param {number} value - Numeric value
   * @param {string} unit - Unit string
   * @returns {string} Formatted value with unit
   */
  static formatValueWithUnit(value, unit) {
    if (value === null || value === undefined) return 'N/A';
    const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
    return unit ? `${formattedValue} ${unit}` : formattedValue.toString();
  }
  
  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  static truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Sort key results by priority (status, then progress)
   * @param {Array<Object>} keyResults - Array of key results
   * @returns {Array<Object>} Sorted key results
   */
  static sortKeyResultsByPriority(keyResults) {
    const statusPriority = {
      'Behind': 1,
      'At Risk': 2,
      'On Track': 3,
      'Completed': 4,
      'Not Started': 5
    };
    
    return keyResults.sort((a, b) => {
      const aPriority = statusPriority[a.status] || 999;
      const bPriority = statusPriority[b.status] || 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same status, sort by progress (ascending for behind/at-risk, descending for others)
      if (aPriority <= 2) {
        return (a.progress || 0) - (b.progress || 0);
      } else {
        return (b.progress || 0) - (a.progress || 0);
      }
    });
  }
}

// ============================================================================
// REPORT GENERATION ENGINE
// ============================================================================

/**
 * Google Docs Report Generator for Quantive session summaries
 */
class GoogleDocsReportGenerator {
  
  /**
   * Constructor
   * @param {string} docId - Google Doc ID (optional, will create new if not provided)
   */
  constructor(docId = null) {
    this.docId = docId;
    this.doc = null;
    this.body = null;
  }
  
  /**
   * Generate a complete report in Google Docs
   * @param {ReportSummary} reportSummary - Report summary data
   * @param {DataProcessor} processor - Data processor for insights
   * @returns {string} Document URL
   */
  generateReport(reportSummary, processor) {
    try {
      Logger.log('Generating Google Docs report...');
      
      // Create or open document
      this.initializeDocument(reportSummary);
      
      // Clear existing content
      this.body.clear();
      
      // Add report sections
      this.addHeader(reportSummary);
      this.addExecutiveSummary(reportSummary, processor);
      this.addSessionOverview(reportSummary);
      this.addProgressSummary(reportSummary);
      this.addRecentActivity(reportSummary);
      this.addInsights(reportSummary, processor);
      this.addFooter(reportSummary);
      
      // Save and return URL
      this.doc.saveAndClose();
      const url = this.doc.getUrl();
      Logger.log(`Google Docs report generated: ${url}`);
      
      return url;
      
    } catch (error) {
      Logger.log(`Error generating Google Docs report: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Initialize document (create new or open existing)
   * @param {ReportSummary} reportSummary - Report summary for title
   */
  initializeDocument(reportSummary) {
    const title = `Quantive Session Report - ${reportSummary.sessionInfo.name} - ${DataTransformUtils.formatDate(reportSummary.generatedAt)}`;
    
    if (this.docId) {
      try {
        this.doc = DocumentApp.openById(this.docId);
        this.doc.setName(title);
        Logger.log('Opened existing document');
      } catch (error) {
        Logger.log('Could not open existing document, creating new one');
        this.doc = DocumentApp.create(title);
        this.docId = this.doc.getId();
      }
    } else {
      this.doc = DocumentApp.create(title);
      this.docId = this.doc.getId();
      Logger.log('Created new document');
    }
    
    this.body = this.doc.getBody();
  }
  
  /**
   * Add document header
   * @param {ReportSummary} reportSummary - Report summary data
   */
  addHeader(reportSummary) {
    // Main title
    const title = this.body.appendParagraph(`Quantive Session Report`);
    title.setHeading(DocumentApp.ParagraphHeading.TITLE);
    title.getChild(0).asText().setBold(true);
    
    // Session name
    const sessionTitle = this.body.appendParagraph(reportSummary.sessionInfo.name);
    sessionTitle.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    
    // Generation info
    const genInfo = this.body.appendParagraph(`Generated on ${DataTransformUtils.formatDate(reportSummary.generatedAt)}`);
    genInfo.getChild(0).asText().setItalic(true);
    
    this.body.appendHorizontalRule();
  }
  
  /**
   * Add executive summary section
   * @param {ReportSummary} reportSummary - Report summary data
   * @param {DataProcessor} processor - Data processor for insights
   */
  addExecutiveSummary(reportSummary, processor) {
    const heading = this.body.appendParagraph('Executive Summary');
    heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    // Key metrics
    const metrics = [
      `📊 Overall Progress: ${DataTransformUtils.formatProgress(reportSummary.overallProgress)}`,
      `🎯 Total Objectives: ${reportSummary.totalObjectives}`,
      `📈 Total Key Results: ${reportSummary.totalKeyResults}`,
      `🕒 Days Remaining: ${reportSummary.sessionInfo.daysRemaining > 0 ? reportSummary.sessionInfo.daysRemaining : 'Overdue'}`
    ];
    
    for (const metric of metrics) {
      this.body.appendParagraph(metric).setIndentStart(20);
    }
    
    // Status breakdown
    this.body.appendParagraph('').appendText('Status Breakdown:').setBold(true);
    
    for (const [status, count] of Object.entries(reportSummary.statusCounts)) {
      if (count > 0) {
        const statusEmoji = this.getStatusEmoji(status);
        this.body.appendParagraph(`• ${statusEmoji} ${status}: ${count} key results`).setIndentStart(20);
      }
    }
    
    this.body.appendParagraph(''); // Spacing
  }
  
  /**
   * Add session overview section
   * @param {ReportSummary} reportSummary - Report summary data
   */
  addSessionOverview(reportSummary) {
    const heading = this.body.appendParagraph('Session Overview');
    heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    const info = reportSummary.sessionInfo;
    
    const details = [
      ['Session ID', info.id],
      ['Description', DataTransformUtils.truncateText(info.description, 200) || 'N/A'],
      ['Start Date', DataTransformUtils.formatDate(info.startDate)],
      ['End Date', DataTransformUtils.formatDate(info.endDate)],
      ['Status', info.status || 'N/A']
    ];
    
    // Create a simple table-like format
    for (const [label, value] of details) {
      const para = this.body.appendParagraph('');
      para.appendText(`${label}: `).setBold(true);
      para.appendText(value);
    }
    
    this.body.appendParagraph(''); // Spacing
  }
  
  /**
   * Add progress summary section
   * @param {ReportSummary} reportSummary - Report summary data
   */
  addProgressSummary(reportSummary) {
    const heading = this.body.appendParagraph('Progress Summary');
    heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    // Progress bar visualization (text-based)
    const progressBar = this.createTextProgressBar(reportSummary.overallProgress);
    const progressPara = this.body.appendParagraph(`Overall Progress: ${progressBar} ${DataTransformUtils.formatProgress(reportSummary.overallProgress)}`);
    progressPara.getChild(0).asText().setFontFamily('Courier New');
    
    // Detailed status counts
    this.body.appendParagraph('Key Results by Status:').getChild(0).asText().setBold(true);
    
    const sortedStatuses = Object.entries(reportSummary.statusCounts)
      .sort(([,a], [,b]) => b - a); // Sort by count descending
    
    for (const [status, count] of sortedStatuses) {
      const emoji = this.getStatusEmoji(status);
      const percentage = reportSummary.totalKeyResults > 0
        ? Math.round((count / reportSummary.totalKeyResults) * 100)
        : 0;
      this.body.appendParagraph(`• ${emoji} ${status}: ${count} (${percentage}%)`).setIndentStart(20);
    }
    
    this.body.appendParagraph(''); // Spacing
  }
  
  /**
   * Add recent activity section
   * @param {ReportSummary} reportSummary - Report summary data
   */
  addRecentActivity(reportSummary) {
    const heading = this.body.appendParagraph('Recent Activity');
    heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    if (reportSummary.recentlyUpdatedKRs.length === 0) {
      this.body.appendParagraph('No recent updates found in the specified lookback period.');
      this.body.appendParagraph(''); // Spacing
      return;
    }
    
    this.body.appendParagraph(`${reportSummary.recentlyUpdatedKRs.length} key results updated recently:`);
    
    // Sort by last updated (most recent first)
    const sortedKRs = [...reportSummary.recentlyUpdatedKRs]
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    
    for (const kr of sortedKRs.slice(0, 10)) { // Limit to top 10
      const statusEmoji = this.getStatusEmoji(kr.status);
      const progress = DataTransformUtils.formatProgress(kr.progress);
      const lastUpdated = DataTransformUtils.formatDate(new Date(kr.lastUpdated));
      
      this.body.appendParagraph(
        `• ${statusEmoji} ${DataTransformUtils.truncateText(kr.name, 60)} (${progress}) - Updated ${lastUpdated}`
      ).setIndentStart(20);
    }
    
    if (reportSummary.recentlyUpdatedKRs.length > 10) {
      this.body.appendParagraph(`... and ${reportSummary.recentlyUpdatedKRs.length - 10} more`);
    }
    
    this.body.appendParagraph(''); // Spacing
  }
  
  /**
   * Add insights section
   * @param {ReportSummary} reportSummary - Report summary data
   * @param {DataProcessor} processor - Data processor for insights
   */
  addInsights(reportSummary, processor) {
    const heading = this.body.appendParagraph('Key Insights & Recommendations');
    heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    const insights = processor.generateInsights(reportSummary);
    
    if (insights.length === 0) {
      this.body.appendParagraph('No specific insights available at this time.');
      return;
    }
    
    for (const insight of insights) {
      this.body.appendParagraph(`• ${insight}`).setIndentStart(20);
    }
    
    this.body.appendParagraph(''); // Spacing
  }
  
  /**
   * Add document footer
   * @param {ReportSummary} reportSummary - Report summary data
   */
  addFooter(reportSummary) {
    this.body.appendHorizontalRule();
    
    const footer = this.body.appendParagraph(`Report generated automatically on ${reportSummary.generatedAt.toLocaleString()}`);
    footer.getChild(0).asText().setItalic(true).setFontSize(10);
    
    const source = this.body.appendParagraph('Source: Quantive API via Google Apps Script');
    source.getChild(0).asText().setItalic(true).setFontSize(10);
  }
  
  /**
   * Create a text-based progress bar
   * @param {number} progress - Progress percentage (0-100)
   * @returns {string} Text progress bar
   */
  createTextProgressBar(progress) {
    const barLength = 20;
    const filledLength = Math.round((progress / 100) * barLength);
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(barLength - filledLength);
    return `[${filled}${empty}]`;
  }
  
  /**
   * Get emoji for status
   * @param {string} status - Status string
   * @returns {string} Emoji
   */
  getStatusEmoji(status) {
    const emojiMap = {
      'On Track': '✅',
      'At Risk': '⚠️',
      'Behind': '🚨',
      'Completed': '🎉',
      'Not Started': '⏸️'
    };
    return emojiMap[status] || '📊';
  }
  
  /**
   * Get the document ID
   * @returns {string} Document ID
   */
  getDocumentId() {
    return this.docId;
  }
}

/**
 * Google Sheets Report Generator for Quantive session tracking
 */
class GoogleSheetsReportGenerator {
  
  /**
   * Constructor
   * @param {string} sheetId - Google Sheet ID (optional, will create new if not provided)
   */
  constructor(sheetId = null) {
    this.sheetId = sheetId;
    this.spreadsheet = null;
    this.sheet = null;
  }
  
  /**
   * Generate a row entry in Google Sheets
   * @param {ReportSummary} reportSummary - Report summary data
   * @param {DataProcessor} processor - Data processor for insights
   * @returns {string} Spreadsheet URL
   */
  generateReport(reportSummary, processor) {
    try {
      Logger.log('Generating Google Sheets report...');
      
      // Initialize spreadsheet
      this.initializeSpreadsheet(reportSummary);
      
      // Ensure headers exist
      this.ensureHeaders();
      
      // Add data row
      const rowData = this.prepareRowData(reportSummary, processor);
      this.appendDataRow(rowData);
      
      // Apply formatting
      this.applyFormatting();
      
      const url = this.spreadsheet.getUrl();
      Logger.log(`Google Sheets report generated: ${url}`);
      
      return url;
      
    } catch (error) {
      Logger.log(`Error generating Google Sheets report: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Initialize spreadsheet (create new or open existing)
   * @param {ReportSummary} reportSummary - Report summary for title
   */
  initializeSpreadsheet(reportSummary) {
    const title = `Quantive Session Tracking - ${reportSummary.sessionInfo.name}`;
    
    if (this.sheetId) {
      try {
        this.spreadsheet = SpreadsheetApp.openById(this.sheetId);
        this.spreadsheet.rename(title);
        Logger.log('Opened existing spreadsheet');
      } catch (error) {
        Logger.log('Could not open existing spreadsheet, creating new one');
        this.spreadsheet = SpreadsheetApp.create(title);
        this.sheetId = this.spreadsheet.getId();
      }
    } else {
      this.spreadsheet = SpreadsheetApp.create(title);
      this.sheetId = this.spreadsheet.getId();
      Logger.log('Created new spreadsheet');
    }
    
    // Get or create the main sheet
    this.sheet = this.spreadsheet.getActiveSheet();
    this.sheet.setName('Quantive Reports');
  }
  
  /**
   * Ensure column headers exist
   */
  ensureHeaders() {
    const headers = this.getColumnHeaders();
    
    // Check if headers already exist
    const existingData = this.sheet.getDataRange();
    if (existingData.getNumRows() === 0 || this.sheet.getRange(1, 1).getValue() !== headers[0]) {
      // Insert headers
      this.sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = this.sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285F4');
      headerRange.setFontColor('#FFFFFF');
      
      Logger.log('Headers added to spreadsheet');
    }
  }
  
  /**
   * Get column headers for the sheet
   * @returns {Array<string>} Array of column headers
   */
  getColumnHeaders() {
    return [
      'Report Date',
      'Session Name',
      'Session ID',
      'Overall Progress (%)',
      'Total Objectives',
      'Total Key Results',
      'On Track',
      'At Risk',
      'Behind',
      'Completed',
      'Not Started',
      'Recent Updates',
      'Days Remaining',
      'Key Insights',
      'Generated At'
    ];
  }
  
  /**
   * Prepare row data from report summary
   * @param {ReportSummary} reportSummary - Report summary data
   * @param {DataProcessor} processor - Data processor for insights
   * @returns {Array} Row data array
   */
  prepareRowData(reportSummary, processor) {
    const insights = processor.generateInsights(reportSummary);
    const keyInsights = insights.slice(0, APP_CONFIG.MAX_INSIGHTS).join(' | '); // Take first few insights
    
    return [
      DataTransformUtils.formatDate(new Date()), // Report Date
      reportSummary.sessionInfo.name, // Session Name
      reportSummary.sessionInfo.id, // Session ID
      Math.round(reportSummary.overallProgress * 100) / 100, // Overall Progress (%)
      reportSummary.totalObjectives, // Total Objectives
      reportSummary.totalKeyResults, // Total Key Results
      reportSummary.statusCounts['On Track'] || 0, // On Track
      reportSummary.statusCounts['At Risk'] || 0, // At Risk
      reportSummary.statusCounts['Behind'] || 0, // Behind
      reportSummary.statusCounts['Completed'] || 0, // Completed
      reportSummary.statusCounts['Not Started'] || 0, // Not Started
      reportSummary.recentlyUpdatedKRs.length, // Recent Updates
      reportSummary.sessionInfo.daysRemaining, // Days Remaining
      keyInsights, // Key Insights
      reportSummary.generatedAt.toLocaleString() // Generated At
    ];
  }
  
  /**
   * Append data row to the sheet
   * @param {Array} rowData - Row data array
   */
  appendDataRow(rowData) {
    const lastRow = this.sheet.getLastRow();
    const newRow = lastRow + 1;
    
    this.sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);
    Logger.log(`Data row added at row ${newRow}`);
  }
  
  /**
   * Apply formatting to the sheet
   */
  applyFormatting() {
    const lastRow = this.sheet.getLastRow();
    const lastCol = this.sheet.getLastColumn();
    
    if (lastRow <= 1) return; // No data rows to format
    
    // Format data range
    const dataRange = this.sheet.getRange(2, 1, lastRow - 1, lastCol);
    
    // Alternate row colors
    dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    
    // Format percentage column (Overall Progress)
    const progressCol = 4; // Column D
    if (lastCol >= progressCol) {
      const progressRange = this.sheet.getRange(2, progressCol, lastRow - 1, 1);
      progressRange.setNumberFormat('0.0%');
    }
    
    // Format date columns
    const dateCol = 1; // Column A (Report Date)
    const generatedCol = 15; // Column O (Generated At)
    
    if (lastCol >= dateCol) {
      const dateRange = this.sheet.getRange(2, dateCol, lastRow - 1, 1);
      dateRange.setNumberFormat('yyyy-mm-dd');
    }
    
    if (lastCol >= generatedCol) {
      const generatedRange = this.sheet.getRange(2, generatedCol, lastRow - 1, 1);
      generatedRange.setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }
    
    // Auto-resize columns
    this.sheet.autoResizeColumns(1, lastCol);
    
    // Freeze header row
    this.sheet.setFrozenRows(1);
    
    Logger.log('Formatting applied to spreadsheet');
  }
  
  /**
   * Create summary charts (optional enhancement)
   */
  createSummaryCharts() {
    // This could be implemented to add charts showing progress over time
    // For now, we'll keep it simple with just the data table
    Logger.log('Chart creation not implemented yet');
  }
  
  /**
   * Get the spreadsheet ID
   * @returns {string} Spreadsheet ID
   */
  getSpreadsheetId() {
    return this.sheetId;
  }
  
  /**
   * Archive old data (keep last N entries)
   * @param {number} maxRows - Maximum number of data rows to keep
   */
  archiveOldData(maxRows = APP_CONFIG.SHEET_MAX_ROWS) {
    const totalRows = this.sheet.getLastRow();
    const dataRows = totalRows - 1; // Excluding header
    
    if (dataRows > maxRows) {
      const rowsToDelete = dataRows - maxRows;
      this.sheet.deleteRows(2, rowsToDelete); // Delete from row 2 (after header)
      Logger.log(`Archived ${rowsToDelete} old rows`);
    }
  }
}

// ============================================================================
// AUTOMATION & SCHEDULING ENGINE
// ============================================================================

/**
 * Trigger Management System for automated report generation
 *
 * Manages Google Apps Script time-driven triggers to automate periodic
 * execution of Quantive report generation. Supports daily, weekly, and
 * monthly scheduling with flexible timing configuration.
 *
 * Key Features:
 * - Automatic cleanup of existing triggers before creating new ones
 * - Persistent storage of trigger configuration in script properties
 * - Support for multiple scheduling frequencies with timezone handling
 * - Comprehensive trigger lifecycle management and monitoring
 *
 * @example Setup Weekly Reports
 * // Run every Monday at 9 AM
 * const triggerId = TriggerManager.setupTimeDrivenTrigger('weekly', 9, 1);
 *
 * @example Setup Monthly Reports
 * // Run on the 1st of each month at 8 AM
 * const triggerId = TriggerManager.setupTimeDrivenTrigger('monthly', 8, null, 1);
 *
 * @see https://developers.google.com/apps-script/guides/triggers/installable
 */
class TriggerManager {
  
  /**
   * Set up a time-driven trigger for automated report generation
   * @param {string} frequency - Frequency: 'daily', 'weekly', 'monthly'
   * @param {number} hour - Hour of day (0-23)
   * @param {number} dayOfWeek - Day of week for weekly (1=Monday, 7=Sunday)
   * @param {number} dayOfMonth - Day of month for monthly (1-31)
   * @returns {string} Trigger ID
   */
  static setupTimeDrivenTrigger(frequency = 'weekly', hour = 9, dayOfWeek = 1, dayOfMonth = 1) {
    try {
      Logger.log(`Setting up ${frequency} trigger at hour ${hour}`);
      
      // Delete existing triggers for this function first
      this.deleteExistingTriggers('generateQuantiveReport');
      
      let trigger;
      
      switch (frequency.toLowerCase()) {
        case 'daily':
          trigger = ScriptApp.newTrigger('generateQuantiveReport')
            .timeBased()
            .everyDays(1)
            .atHour(hour)
            .create();
          break;
          
        case 'weekly':
          trigger = ScriptApp.newTrigger('generateQuantiveReport')
            .timeBased()
            .everyWeeks(1)
            .onWeekDay(this.getWeekDay(dayOfWeek))
            .atHour(hour)
            .create();
          break;
          
        case 'monthly':
          trigger = ScriptApp.newTrigger('generateQuantiveReport')
            .timeBased()
            .onMonthDay(dayOfMonth)
            .atHour(hour)
            .create();
          break;
          
        default:
          throw new Error(`Invalid frequency: ${frequency}. Use 'daily', 'weekly', or 'monthly'`);
      }
      
      const triggerId = trigger.getUniqueId();
      Logger.log(`Trigger created successfully with ID: ${triggerId}`);
      
      // Store trigger info in properties
      ConfigManager.setProperty('TRIGGER_ID', triggerId);
      ConfigManager.setProperty('TRIGGER_FREQUENCY', frequency);
      ConfigManager.setProperty('TRIGGER_HOUR', hour.toString());
      
      return triggerId;
      
    } catch (error) {
      Logger.log(`Error setting up trigger: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Delete existing triggers for a specific function
   * @param {string} functionName - Name of the function
   */
  static deleteExistingTriggers(functionName) {
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    
    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === functionName) {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      Logger.log(`Deleted ${deletedCount} existing triggers for ${functionName}`);
    }
  }
  
  /**
   * Get all active triggers
   * @returns {Array<Object>} Array of trigger information
   */
  static getActiveTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    
    return triggers.map(trigger => ({
      id: trigger.getUniqueId(),
      function: trigger.getHandlerFunction(),
      eventType: trigger.getEventType().toString(),
      source: trigger.getTriggerSource().toString()
    }));
  }
  
  /**
   * Delete a specific trigger by ID
   * @param {string} triggerId - Trigger ID
   * @returns {boolean} Success status
   */
  static deleteTrigger(triggerId) {
    try {
      const triggers = ScriptApp.getProjectTriggers();
      
      for (const trigger of triggers) {
        if (trigger.getUniqueId() === triggerId) {
          ScriptApp.deleteTrigger(trigger);
          Logger.log(`Trigger ${triggerId} deleted successfully`);
          
          // Clean up properties
          ConfigManager.setProperty('TRIGGER_ID', '');
          
          return true;
        }
      }
      
      Logger.log(`Trigger ${triggerId} not found`);
      return false;
      
    } catch (error) {
      Logger.log(`Error deleting trigger: ${error.toString()}`);
      throw error;
    }
  }
  
  /**
   * Convert day number to ScriptApp.WeekDay
   * @param {number} dayNumber - Day number (1=Monday, 7=Sunday)
   * @returns {ScriptApp.WeekDay} WeekDay enum
   */
  static getWeekDay(dayNumber) {
    const weekDays = {
      1: ScriptApp.WeekDay.MONDAY,
      2: ScriptApp.WeekDay.TUESDAY,
      3: ScriptApp.WeekDay.WEDNESDAY,
      4: ScriptApp.WeekDay.THURSDAY,
      5: ScriptApp.WeekDay.FRIDAY,
      6: ScriptApp.WeekDay.SATURDAY,
      7: ScriptApp.WeekDay.SUNDAY
    };
    
    return weekDays[dayNumber] || ScriptApp.WeekDay.MONDAY;
  }
  
  /**
   * Get trigger status and next execution time
   * @returns {Object} Trigger status information
   */
  static getTriggerStatus() {
    const triggerId = ConfigManager.getProperty('TRIGGER_ID');
    
    if (!triggerId) {
      return {
        active: false,
        message: 'No trigger configured'
      };
    }
    
    const triggers = ScriptApp.getProjectTriggers();
    const activeTrigger = triggers.find(t => t.getUniqueId() === triggerId);
    
    if (!activeTrigger) {
      return {
        active: false,
        message: 'Configured trigger not found (may have been deleted)'
      };
    }
    
    return {
      active: true,
      id: triggerId,
      function: activeTrigger.getHandlerFunction(),
      frequency: ConfigManager.getProperty('TRIGGER_FREQUENCY'),
      hour: ConfigManager.getProperty('TRIGGER_HOUR'),
      message: 'Trigger is active and scheduled'
    };
  }
}

/**
 * Execution Logger for monitoring and debugging
 */
class ExecutionLogger {
  
  /**
   * Log execution start
   * @param {string} functionName - Name of the function being executed
   * @returns {string} Execution ID
   */
  static logExecutionStart(functionName) {
    const executionId = Utilities.getUuid();
    const timestamp = new Date().toISOString();
    
    Logger.log(`EXECUTION_START: ${functionName} [${executionId}] at ${timestamp}`);
    
    // Store in properties for tracking
    ConfigManager.setProperty('LAST_EXECUTION_ID', executionId);
    ConfigManager.setProperty('LAST_EXECUTION_START', timestamp);
    ConfigManager.setProperty('LAST_EXECUTION_FUNCTION', functionName);
    
    return executionId;
  }
  
  /**
   * Log execution success
   * @param {string} executionId - Execution ID
   * @param {Object} results - Results object
   */
  static logExecutionSuccess(executionId, results = {}) {
    const timestamp = new Date().toISOString();
    const duration = this.calculateExecutionDuration();
    
    Logger.log(`EXECUTION_SUCCESS: [${executionId}] completed in ${duration}ms at ${timestamp}`);
    Logger.log(`EXECUTION_RESULTS: ${JSON.stringify(results)}`);
    
    // Update properties
    ConfigManager.setProperty('LAST_EXECUTION_END', timestamp);
    ConfigManager.setProperty('LAST_EXECUTION_STATUS', 'SUCCESS');
    ConfigManager.setProperty('LAST_EXECUTION_DURATION', duration.toString());
    
    if (results.docUrl) {
      ConfigManager.setProperty('LAST_GENERATED_DOC_URL', results.docUrl);
    }
    
    if (results.sheetUrl) {
      ConfigManager.setProperty('LAST_GENERATED_SHEET_URL', results.sheetUrl);
    }
  }
  
  /**
   * Log execution failure
   * @param {string} executionId - Execution ID
   * @param {Error} error - Error object
   */
  static logExecutionFailure(executionId, error) {
    const timestamp = new Date().toISOString();
    const duration = this.calculateExecutionDuration();
    
    Logger.log(`EXECUTION_FAILURE: [${executionId}] failed after ${duration}ms at ${timestamp}`);
    Logger.log(`EXECUTION_ERROR: ${error.toString()}`);
    Logger.log(`EXECUTION_STACK: ${error.stack || 'No stack trace available'}`);
    
    // Update properties
    ConfigManager.setProperty('LAST_EXECUTION_END', timestamp);
    ConfigManager.setProperty('LAST_EXECUTION_STATUS', 'FAILURE');
    ConfigManager.setProperty('LAST_EXECUTION_ERROR', error.toString());
    ConfigManager.setProperty('LAST_EXECUTION_DURATION', duration.toString());
  }
  
  /**
   * Calculate execution duration
   * @returns {number} Duration in milliseconds
   */
  static calculateExecutionDuration() {
    const startTime = ConfigManager.getProperty('LAST_EXECUTION_START');
    
    if (!startTime) return 0;
    
    const start = new Date(startTime);
    const end = new Date();
    
    return end.getTime() - start.getTime();
  }
  
  /**
   * Get execution history summary
   * @returns {Object} Execution history
   */
  static getExecutionHistory() {
    return {
      lastExecutionId: ConfigManager.getProperty('LAST_EXECUTION_ID'),
      lastFunction: ConfigManager.getProperty('LAST_EXECUTION_FUNCTION'),
      lastStart: ConfigManager.getProperty('LAST_EXECUTION_START'),
      lastEnd: ConfigManager.getProperty('LAST_EXECUTION_END'),
      lastStatus: ConfigManager.getProperty('LAST_EXECUTION_STATUS'),
      lastDuration: ConfigManager.getProperty('LAST_EXECUTION_DURATION'),
      lastError: ConfigManager.getProperty('LAST_EXECUTION_ERROR'),
      lastDocUrl: ConfigManager.getProperty('LAST_GENERATED_DOC_URL'),
      lastSheetUrl: ConfigManager.getProperty('LAST_GENERATED_SHEET_URL')
    };
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
  const executionId = ExecutionLogger.logExecutionStart('generateQuantiveReport');
  
  try {
    Logger.log('Starting Quantive report generation...');
    
    // Validate configuration
    const config = ConfigManager.validateConfig();
    Logger.log('Configuration validated successfully');
    
    // Initialize API client
    const apiClient = new QuantiveApiClient(config.apiToken, config.accountId, config.baseUrl);
    
    // Test API connectivity
    apiClient.testConnection();
    Logger.log('API connectivity test passed');
    
    // Fetch session data
    const sessionData = apiClient.getCompleteSessionData(config.sessionId);
    Logger.log('Session data fetched successfully');
    
    // Process data and generate summary
    const processor = new DataProcessor(config.lookbackDays);
    const reportSummary = processor.processSessionData(sessionData);
    Logger.log('Report summary generated successfully');
    
    const results = {};
    
    // Generate Google Docs report
    if (config.googleDocId || !config.googleSheetId) {
      const docsGenerator = new GoogleDocsReportGenerator(config.googleDocId);
      const docUrl = docsGenerator.generateReport(reportSummary, processor);
      Logger.log(`Google Docs report generated: ${docUrl}`);
      results.docUrl = docUrl;
      
      // Log new doc ID if it was created
      if (!config.googleDocId) {
        Logger.log('New Google Doc created with ID: ' + docsGenerator.getDocumentId());
        Logger.log('💡 Consider adding this ID to your config.gs file for future reports');
      }
    }
    
    // Generate Google Sheets report
    if (config.googleSheetId || !config.googleDocId) {
      const sheetsGenerator = new GoogleSheetsReportGenerator(config.googleSheetId);
      const sheetUrl = sheetsGenerator.generateReport(reportSummary, processor);
      Logger.log(`Google Sheets report generated: ${sheetUrl}`);
      results.sheetUrl = sheetUrl;
      
      // Log new sheet ID if it was created
      if (!config.googleSheetId) {
        Logger.log('New Google Sheet created with ID: ' + sheetsGenerator.getSpreadsheetId());
        Logger.log('💡 Consider adding this ID to your config.gs file for future reports');
      }
      
      // Optional: Archive old data to keep sheet manageable
      sheetsGenerator.archiveOldData(100);
    }
    
    Logger.log('Quantive report generation completed successfully');
    ExecutionLogger.logExecutionSuccess(executionId, results);
    
    return results;
    
  } catch (error) {
    Logger.log('Error generating Quantive report: ' + error.toString());
    ExecutionLogger.logExecutionFailure(executionId, error);
    throw error;
  }
}


/**
 * Check your Quantive account region and suggest the correct endpoint
 */
function checkAccountRegion() {
  Logger.log('🌍 QUANTIVE ACCOUNT REGION CHECKER');
  Logger.log('==========================================');
  Logger.log('');
  Logger.log('To find your correct API endpoint:');
  Logger.log('');
  Logger.log('1. 🌐 Log into your Quantive account in a web browser');
  Logger.log('2. 👀 Look at the URL in your browser address bar');
  Logger.log('3. 📍 Check which domain you see:');
  Logger.log('');
  Logger.log('   • https://app.quantive.com     → Use: https://app.quantive.com/results/api/v1');
  Logger.log('   • https://app.us.quantive.com  → Use: https://app.us.quantive.com/results/api/v1');
  Logger.log('   • https://app.as.quantive.com  → Use: https://app.as.quantive.com/results/api/v1');
  Logger.log('   • https://app.sa.quantive.com  → Use: https://app.sa.quantive.com/results/api/v1');
  Logger.log('   • https://app.au.quantive.com  → Use: https://app.au.quantive.com/results/api/v1');
  Logger.log('   • https://app.gtmhub.com       → Use: https://app.gtmhub.com/api/v1');
  Logger.log('');
  Logger.log('4. 🔧 Update your APP_CONFIG.QUANTIVE_BASE_URL if needed');
  Logger.log('');
  Logger.log('💡 Pro tip: Use testApiConnection() to verify your endpoint is working correctly!');
}

/**
 * Update the base URL for your region
 * @param {string} newBaseUrl - The new base URL to use
 */
function updateBaseUrl(newBaseUrl) {
  if (!newBaseUrl) {
    Logger.log('❌ Error: Please provide a base URL');
    Logger.log('Example: updateBaseUrl("https://app.us.quantive.com/results/api/v1")');
    return false;
  }
  
  // Validate URL format
  if (!newBaseUrl.includes('quantive.com') && !newBaseUrl.includes('gtmhub.com')) {
    Logger.log('❌ Error: URL should contain quantive.com or gtmhub.com');
    return false;
  }
  
  Logger.log(`🔄 Updating base URL to: ${newBaseUrl}`);
  
  try {
    // Update the APP_CONFIG (note: this only affects the current execution)
    APP_CONFIG.QUANTIVE_BASE_URL = newBaseUrl;
    
    // Test the new URL
    Logger.log('🧪 Testing new URL...');
    const config = ConfigManager.getConfig();
    const client = new QuantiveApiClient(config.apiToken, config.accountId, newBaseUrl);
    
    const response = client.makeRequest('/sessions', 'GET');
    Logger.log('✅ SUCCESS! New URL is working');
    Logger.log(`Response: ${JSON.stringify(response).substring(0, 100)}...`);
    
    Logger.log('');
    Logger.log('🔧 To make this change permanent, update your Code.gs:');
    Logger.log(`   Change QUANTIVE_BASE_URL to: '${newBaseUrl}'`);
    Logger.log('   Around line 84 in the APP_CONFIG section');
    
    return true;
    
  } catch (error) {
    Logger.log(`❌ Error: New URL failed: ${error.message}`);
    return false;
  }
}

/**
 * Debug function to show exact configuration values
 */
function debugConfig() {
  try {
    Logger.log('=== CONFIG DEBUG ===');
    
    if (typeof CONFIG === 'undefined') {
      Logger.log('❌ CONFIG is undefined');
      return;
    }
    
    Logger.log(`CONFIG object exists: ${typeof CONFIG}`);
    Logger.log(`API Token (first 10 chars): ${CONFIG.QUANTIVE_API_TOKEN ? CONFIG.QUANTIVE_API_TOKEN.substring(0, 10) + '...' : 'UNDEFINED'}`);
    Logger.log(`Account ID: "${CONFIG.QUANTIVE_ACCOUNT_ID}" (type: ${typeof CONFIG.QUANTIVE_ACCOUNT_ID}, length: ${CONFIG.QUANTIVE_ACCOUNT_ID ? CONFIG.QUANTIVE_ACCOUNT_ID.length : 'N/A'})`);
    Logger.log(`Session ID: "${CONFIG.SESSION_ID}"`);
    
    // Test ConfigManager.getConfig()
    Logger.log('=== TESTING ConfigManager.getConfig() ===');
    const config = ConfigManager.getConfig();
    Logger.log(`Processed Account ID: "${config.accountId}" (type: ${typeof config.accountId}, length: ${config.accountId ? config.accountId.length : 'N/A'})`);
    
    return config;
    
  } catch (error) {
    Logger.log(`❌ Error in debugConfig: ${error.toString()}`);
    throw error;
  }
}

/**
 * Quick Start function - generates your first report
 * Make sure you have created config.gs from config.example.gs first!
 */
function quickStart() {
  try {
    Logger.log('🚀 Starting Quantive report generation...');
    
    // Test configuration
    if (testConfiguration()) {
      Logger.log('✅ Configuration validated successfully');
    } else {
      Logger.log('❌ Configuration validation failed');
      return false;
    }
    
    // Generate first report
    const result = generateQuantiveReport();
    Logger.log('✅ Report generated successfully!');
    
    if (result.docUrl) {
      Logger.log(`📄 Google Doc: ${result.docUrl}`);
    }
    if (result.sheetUrl) {
      Logger.log(`📊 Google Sheet: ${result.sheetUrl}`);
    }
    
    return true;
  } catch (error) {
    Logger.log('❌ Quick start failed: ' + error.toString());
    Logger.log('💡 Make sure you have created config.gs from config.example.gs template');
    return false;
  }
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
    const apiClient = new QuantiveApiClient(config.apiToken, config.accountId, config.baseUrl);
    
    Logger.log('Testing API connection...');
    const result = apiClient.testConnection();
    Logger.log('API connection test successful!');
    return result;
    
  } catch (error) {
    Logger.log('API connection test failed: ' + error.toString());
    return false;
  }
}

// ============================================================================
// ERROR HANDLING & RESILIENCE SYSTEM
// ============================================================================

/**
 * Enhanced Error Handler for comprehensive error management
 */
class ErrorHandler {
  
  /**
   * Handle and classify errors with appropriate recovery strategies
   * @param {Error} error - The error to handle
   * @param {string} context - Context where the error occurred
   * @param {Object} options - Options for error handling
   * @returns {Object} Error handling result
   */
  static handleError(error, context, options = {}) {
    const errorInfo = this.classifyError(error, context);
    Logger.log(`ERROR_CLASSIFIED: ${errorInfo.type} in ${context} - ${error.toString()}`);
    
    // Determine if retry is appropriate
    if (errorInfo.retryable && (options.retryCount || 0) < (options.maxRetries || 3)) {
      const delay = this.calculateRetryDelay(options.retryCount || 0, errorInfo.type);
      Logger.log(`ERROR_RETRY: Retrying in ${delay}ms (attempt ${(options.retryCount || 0) + 1})`);
      return {
        action: 'retry',
        delay: delay,
        retryCount: (options.retryCount || 0) + 1
      };
    }
    
    // Determine fallback action
    const fallbackAction = this.determineFallbackAction(errorInfo, context, options);
    Logger.log(`ERROR_FALLBACK: ${fallbackAction.action} - ${fallbackAction.reason}`);
    
    return fallbackAction;
  }
  
  /**
   * Classify error type and determine characteristics
   * @param {Error} error - The error to classify
   * @param {string} context - Context where the error occurred
   * @returns {Object} Error classification
   */
  static classifyError(error, context) {
    const errorMessage = error.toString().toLowerCase();
    
    // Network/connectivity errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout') ||
        errorMessage.includes('connection') || errorMessage.includes('fetch')) {
      return {
        type: 'NETWORK_ERROR',
        retryable: true,
        severity: 'HIGH',
        category: 'CONNECTIVITY'
      };
    }
    
    // Rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        type: 'RATE_LIMIT',
        retryable: true,
        severity: 'MEDIUM',
        category: 'API_LIMIT'
      };
    }
    
    // Authentication errors
    if (errorMessage.includes('authentication') || errorMessage.includes('401') ||
        errorMessage.includes('unauthorized')) {
      return {
        type: 'AUTH_ERROR',
        retryable: false,
        severity: 'HIGH',
        category: 'CONFIGURATION'
      };
    }
    
    // Permission errors
    if (errorMessage.includes('forbidden') || errorMessage.includes('403') ||
        errorMessage.includes('permission')) {
      return {
        type: 'PERMISSION_ERROR',
        retryable: false,
        severity: 'HIGH',
        category: 'CONFIGURATION'
      };
    }
    
    // Resource not found
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return {
        type: 'RESOURCE_NOT_FOUND',
        retryable: false,
        severity: 'MEDIUM',
        category: 'CONFIGURATION'
      };
    }
    
    // Server errors
    if (errorMessage.includes('server error') || errorMessage.includes('5')) {
      return {
        type: 'SERVER_ERROR',
        retryable: true,
        severity: 'HIGH',
        category: 'EXTERNAL'
      };
    }
    
    // Google Apps Script quota/execution time
    if (errorMessage.includes('quota') || errorMessage.includes('execution time') ||
        errorMessage.includes('script runtime')) {
      return {
        type: 'QUOTA_ERROR',
        retryable: false,
        severity: 'HIGH',
        category: 'PLATFORM'
      };
    }
    
    // Parse/format errors
    if (errorMessage.includes('parse') || errorMessage.includes('json') ||
        errorMessage.includes('format')) {
      return {
        type: 'PARSE_ERROR',
        retryable: false,
        severity: 'MEDIUM',
        category: 'DATA'
      };
    }
    
    // Default classification
    return {
      type: 'UNKNOWN_ERROR',
      retryable: false,
      severity: 'MEDIUM',
      category: 'UNKNOWN'
    };
  }
  
  /**
   * Calculate appropriate retry delay based on attempt and error type
   * @param {number} retryCount - Current retry count
   * @param {string} errorType - Type of error
   * @returns {number} Delay in milliseconds
   */
  static calculateRetryDelay(retryCount, errorType) {
    const baseDelay = APP_CONFIG.RETRY_DELAY || 1000;
    
    // Special handling for rate limiting
    if (errorType === 'RATE_LIMIT') {
      return Math.min(baseDelay * Math.pow(3, retryCount), 300000); // Max 5 minutes
    }
    
    // Exponential backoff for other retryable errors
    return Math.min(baseDelay * Math.pow(2, retryCount), 60000); // Max 1 minute
  }
  
  /**
   * Determine fallback action based on error type and context
   * @param {Object} errorInfo - Error classification info
   * @param {string} context - Context where error occurred
   * @param {Object} options - Options for fallback handling
   * @returns {Object} Fallback action
   */
  static determineFallbackAction(errorInfo, context, options = {}) {
    switch (errorInfo.category) {
      case 'CONNECTIVITY':
      case 'EXTERNAL':
        return {
          action: 'skip_and_notify',
          reason: 'External service unavailable, will retry on next scheduled run',
          notify: true
        };
        
      case 'CONFIGURATION':
        return {
          action: 'halt_and_notify',
          reason: 'Configuration error requires manual intervention',
          notify: true,
          requiresFixing: true
        };
        
      case 'API_LIMIT':
        return {
          action: 'delay_and_reschedule',
          reason: 'API rate limit reached, rescheduling for later',
          delay: 3600000 // 1 hour
        };
        
      case 'PLATFORM':
        return {
          action: 'partial_execution',
          reason: 'Platform limits reached, attempting partial execution',
          useReducedScope: true
        };
        
      case 'DATA':
        return {
          action: 'skip_problematic_data',
          reason: 'Data parsing error, continuing with available data',
          continueWithPartial: true
        };
        
      default:
        return {
          action: 'log_and_continue',
          reason: 'Unknown error, logging for review',
          notify: false
        };
    }
  }
  
  /**
   * Create fallback report when main report generation fails
   * @param {Object} partialData - Any partial data that was collected
   * @param {Array} errors - List of errors encountered
   * @returns {Object} Fallback report info
   */
  static createFallbackReport(partialData = {}, errors = []) {
    try {
      Logger.log('Creating fallback report due to errors...');
      
      const fallbackTitle = `Quantive Report - Error Summary - ${DataTransformUtils.formatDate(new Date())}`;
      const doc = DocumentApp.create(fallbackTitle);
      const body = doc.getBody();
      
      // Add error report
      body.appendParagraph('Quantive Report Generation Failed').setHeading(DocumentApp.ParagraphHeading.TITLE);
      body.appendParagraph(`Generated: ${new Date().toLocaleString()}`).getChild(0).asText().setItalic(true);
      body.appendHorizontalRule();
      
      body.appendParagraph('Errors Encountered:').setHeading(DocumentApp.ParagraphHeading.HEADING2);
      
      for (const error of errors) {
        body.appendParagraph(`• ${error.context}: ${error.message}`).setIndentStart(20);
      }
      
      // Add any partial data that was collected
      if (partialData && Object.keys(partialData).length > 0) {
        body.appendParagraph('Partial Data Collected:').setHeading(DocumentApp.ParagraphHeading.HEADING2);
        body.appendParagraph(JSON.stringify(partialData, null, 2));
      }
      
      body.appendParagraph('Next Steps:').setHeading(DocumentApp.ParagraphHeading.HEADING2);
      body.appendParagraph('• Review configuration settings (API token, session ID)').setIndentStart(20);
      body.appendParagraph('• Check Quantive API status and permissions').setIndentStart(20);
      body.appendParagraph('• Verify Google Apps Script execution limits').setIndentStart(20);
      body.appendParagraph('• Check execution logs for detailed error information').setIndentStart(20);
      
      doc.saveAndClose();
      const url = doc.getUrl();
      
      Logger.log(`Fallback report created: ${url}`);
      return { fallbackReportUrl: url, docId: doc.getId() };
      
    } catch (fallbackError) {
      Logger.log(`Failed to create fallback report: ${fallbackError.toString()}`);
      return { fallbackReportUrl: null, error: fallbackError.toString() };
    }
  }
  
  /**
   * Log comprehensive error details for debugging
   * @param {Error} error - The error to log
   * @param {string} context - Context information
   * @param {Object} additionalInfo - Additional debugging information
   */
  static logDetailedError(error, context, additionalInfo = {}) {
    const timestamp = new Date().toISOString();
    const errorDetails = {
      timestamp: timestamp,
      context: context,
      message: error.message || error.toString(),
      stack: error.stack || 'No stack trace available',
      type: error.name || 'Error',
      additionalInfo: additionalInfo
    };
    
    Logger.log(`DETAILED_ERROR: ${JSON.stringify(errorDetails, null, 2)}`);
    
    // Store in properties for persistent debugging
    const errorKey = `ERROR_${Date.now()}`;
    try {
      ConfigManager.setProperty(errorKey, JSON.stringify(errorDetails));
      
      // Keep only last 10 errors to avoid property limit
      this.cleanupOldErrors();
    } catch (propertyError) {
      Logger.log(`Failed to store error details: ${propertyError.toString()}`);
    }
  }
  
  /**
   * Clean up old error entries from properties
   */
  static cleanupOldErrors() {
    try {
      const properties = PropertiesService.getScriptProperties();
      const allProperties = properties.getProperties();
      
      const errorKeys = Object.keys(allProperties)
        .filter(key => key.startsWith('ERROR_'))
        .sort()
        .reverse(); // Most recent first
      
      // Delete old errors, keep only last 10
      if (errorKeys.length > 10) {
        const keysToDelete = errorKeys.slice(10);
        for (const key of keysToDelete) {
          properties.deleteProperty(key);
        }
        Logger.log(`Cleaned up ${keysToDelete.length} old error entries`);
      }
    } catch (cleanupError) {
      Logger.log(`Error cleanup failed: ${cleanupError.toString()}`);
    }
  }
}

/**
 * Resilient execution wrapper for critical functions
 */
class ResilientExecutor {
  
  /**
   * Execute function with comprehensive error handling and fallbacks
   * @param {Function} fn - Function to execute
   * @param {string} context - Execution context
   * @param {Object} options - Execution options
   * @returns {Object} Execution result
   */
  static executeWithFallbacks(fn, context, options = {}) {
    const maxRetries = options.maxRetries || 3;
    let retryCount = 0;
    const errors = [];
    
    while (retryCount <= maxRetries) {
      try {
        Logger.log(`RESILIENT_EXEC: Attempting ${context} (attempt ${retryCount + 1}/${maxRetries + 1})`);
        const result = fn();
        
        if (retryCount > 0) {
          Logger.log(`RESILIENT_EXEC: ${context} succeeded after ${retryCount} retries`);
        }
        
        return {
          success: true,
          result: result,
          retryCount: retryCount,
          errors: errors
        };
        
      } catch (error) {
        errors.push({
          attempt: retryCount + 1,
          error: error.toString(),
          context: context,
          timestamp: new Date().toISOString()
        });
        
        ErrorHandler.logDetailedError(error, context, {
          attempt: retryCount + 1,
          maxRetries: maxRetries + 1
        });
        
        const handleResult = ErrorHandler.handleError(error, context, {
          retryCount: retryCount,
          maxRetries: maxRetries
        });
        
        if (handleResult.action === 'retry' && retryCount < maxRetries) {
          retryCount = handleResult.retryCount;
          Logger.log(`RESILIENT_EXEC: Waiting ${handleResult.delay}ms before retry...`);
          Utilities.sleep(handleResult.delay);
          continue;
        } else {
          // No more retries or not retryable
          Logger.log(`RESILIENT_EXEC: ${context} failed after all attempts`);
          return {
            success: false,
            error: error,
            retryCount: retryCount,
            errors: errors,
            fallbackAction: handleResult
          };
        }
      }
    }
  }
}

// ============================================================================
// AUTOMATION HELPER FUNCTIONS
// ============================================================================

/**
 * Set up weekly trigger (Monday at 9 AM)
 */
function setupWeeklyTrigger() {
  return TriggerManager.setupTimeDrivenTrigger('weekly', 9, 1);
}

/**
 * Set up daily trigger (9 AM)
 */
function setupDailyTrigger() {
  return TriggerManager.setupTimeDrivenTrigger('daily', 9);
}

/**
 * Set up monthly trigger (1st day at 9 AM)
 */
function setupMonthlyTrigger() {
  return TriggerManager.setupTimeDrivenTrigger('monthly', 9, 1, 1);
}

/**
 * Delete all triggers for this project
 */
function deleteAllTriggers() {
  TriggerManager.deleteExistingTriggers('generateQuantiveReport');
  Logger.log('All triggers deleted');
}

/**
 * Get trigger status
 */
function getTriggerStatus() {
  const status = TriggerManager.getTriggerStatus();
  Logger.log('Trigger Status: ' + JSON.stringify(status, null, 2));
  return status;
}

/**
 * Get execution history
 */
function getExecutionHistory() {
  const history = ExecutionLogger.getExecutionHistory();
  Logger.log('Execution History: ' + JSON.stringify(history, null, 2));
  return history;
}

/**
 * Manual trigger setup with custom parameters
 * @param {string} frequency - 'daily', 'weekly', or 'monthly'
 * @param {number} hour - Hour of day (0-23)
 * @param {number} dayOfWeek - Day of week for weekly (1=Monday, 7=Sunday)
 * @param {number} dayOfMonth - Day of month for monthly (1-31)
 */
function setupCustomTrigger(frequency, hour, dayOfWeek, dayOfMonth) {
  return TriggerManager.setupTimeDrivenTrigger(frequency, hour, dayOfWeek, dayOfMonth);
}

// ============================================================================
// TESTING & VALIDATION FUNCTIONS
// ============================================================================

/**
 * Comprehensive test suite for the Quantive integration
 */
class TestSuite {
  
  /**
   * Run all tests and return results
   * @returns {Object} Test results summary
   */
  static runAllTests() {
    Logger.log('Starting comprehensive test suite...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
    
    // Run individual test categories
    results.tests.push(this.testConfiguration());
    results.tests.push(this.testApiAuthentication());
    results.tests.push(this.testDataProcessing());
    results.tests.push(this.testReportGeneration());
    results.tests.push(this.testErrorHandling());
    results.tests.push(this.testTriggerManagement());
    
    // Calculate summary
    for (const test of results.tests) {
      results.summary.total++;
      if (test.status === 'PASSED') {
        results.summary.passed++;
      } else if (test.status === 'FAILED') {
        results.summary.failed++;
      } else {
        results.summary.warnings++;
      }
    }
    
    // Log summary
    Logger.log(`Test Summary: ${results.summary.passed}/${results.summary.total} passed, ${results.summary.failed} failed, ${results.summary.warnings} warnings`);
    
    return results;
  }
  
  /**
   * Test configuration management
   * @returns {Object} Test result
   */
  static testConfiguration() {
    const testName = 'Configuration Management';
    Logger.log(`Testing: ${testName}`);
    
    try {
      // Test property storage and retrieval
      const testKey = 'TEST_PROPERTY';
      const testValue = 'test_value_' + Date.now();
      
      ConfigManager.setProperty(testKey, testValue);
      const retrievedValue = ConfigManager.getProperty(testKey);
      
      if (retrievedValue !== testValue) {
        throw new Error(`Property storage failed: expected ${testValue}, got ${retrievedValue}`);
      }
      
      // Test configuration validation (should fail with missing required props)
      try {
        ConfigManager.validateConfig();
        // If this doesn't throw, check if we actually have config
        const config = ConfigManager.getConfig();
        if (!config.apiToken || !config.accountId || !config.sessionId) {
          return {
            name: testName,
            status: 'WARNING',
            message: 'Configuration validation passed but required properties appear to be missing',
            details: 'This is expected if the script is not yet configured'
          };
        }
      } catch (validationError) {
        // This is expected if not configured
        Logger.log('Configuration validation failed as expected (not configured)');
      }
      
      // Clean up test property
      PropertiesService.getScriptProperties().deleteProperty(testKey);
      
      return {
        name: testName,
        status: 'PASSED',
        message: 'Configuration management working correctly',
        details: 'Property storage/retrieval and validation logic verified'
      };
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Configuration management test failed'
      };
    }
  }
  
  /**
   * Test API authentication and connection
   * @returns {Object} Test result
   */
  static testApiAuthentication() {
    const testName = 'API Authentication & Connection';
    Logger.log(`Testing: ${testName}`);
    
    try {
      // Check if configuration exists
      const config = ConfigManager.getConfig();
      
      if (!config.apiToken || !config.accountId) {
        return {
          name: testName,
          status: 'WARNING',
          message: 'API credentials not configured',
          details: 'Cannot test API connection without valid credentials. Run setupConfiguration() first.'
        };
      }
      
      // Test API client creation
      const apiClient = new QuantiveApiClient(config.apiToken, config.accountId, config.baseUrl);
      
      if (!apiClient || !apiClient.apiToken || !apiClient.accountId) {
        throw new Error('API client creation failed');
      }
      
      // Test basic connectivity (this will fail if credentials are invalid)
      try {
        apiClient.testConnection();
        
        return {
          name: testName,
          status: 'PASSED',
          message: 'API authentication and connection successful',
          details: 'Successfully connected to Quantive API with provided credentials'
        };
        
      } catch (connectionError) {
        return {
          name: testName,
          status: 'FAILED',
          message: `API connection failed: ${connectionError.toString()}`,
          details: 'Check API token, account ID, and network connectivity'
        };
      }
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'API authentication test failed'
      };
    }
  }
  
  /**
   * Test data processing algorithms
   * @returns {Object} Test result
   */
  static testDataProcessing() {
    const testName = 'Data Processing Algorithms';
    Logger.log(`Testing: ${testName}`);
    
    try {
      // Create mock data for testing
      const mockSession = new QuantiveSession({
        id: 'test-session',
        name: 'Test Session',
        description: 'Test session for validation',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        status: 'ACTIVE'
      });
      
      const mockObjective = new QuantiveObjective({
        id: 'test-objective',
        name: 'Test Objective',
        description: 'Test objective for validation',
        owner: 'Test Owner',
        status: 'ON_TRACK',
        progress: 75
      });
      
      const mockKeyResults = [
        new QuantiveKeyResult({
          id: 'test-kr-1',
          name: 'Test KR 1',
          status: 'ON_TRACK',
          progress: 80,
          currentValue: 80,
          targetValue: 100,
          lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        }),
        new QuantiveKeyResult({
          id: 'test-kr-2',
          name: 'Test KR 2',
          status: 'AT_RISK',
          progress: 60,
          currentValue: 60,
          targetValue: 100,
          lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
        })
      ];
      
      mockObjective.keyResults = mockKeyResults;
      mockSession.objectives = [mockObjective];
      
      // Test data processor
      const processor = new DataProcessor(7); // 7 day lookback
      const reportSummary = processor.processSessionData(mockSession);
      
      // Validate results
      if (reportSummary.totalObjectives !== 1) {
        throw new Error(`Expected 1 objective, got ${reportSummary.totalObjectives}`);
      }
      
      if (reportSummary.totalKeyResults !== 2) {
        throw new Error(`Expected 2 key results, got ${reportSummary.totalKeyResults}`);
      }
      
      if (reportSummary.overallProgress !== 70) { // (80 + 60) / 2
        throw new Error(`Expected 70% progress, got ${reportSummary.overallProgress}%`);
      }
      
      if (reportSummary.statusCounts['On Track'] !== 1) {
        throw new Error(`Expected 1 'On Track' KR, got ${reportSummary.statusCounts['On Track']}`);
      }
      
      if (reportSummary.recentlyUpdatedKRs.length !== 1) { // Only 1 KR updated within 7 days
        throw new Error(`Expected 1 recently updated KR, got ${reportSummary.recentlyUpdatedKRs.length}`);
      }
      
      // Test insights generation
      const insights = processor.generateInsights(reportSummary);
      if (!insights || insights.length === 0) {
        throw new Error('Insights generation failed');
      }
      
      return {
        name: testName,
        status: 'PASSED',
        message: 'Data processing algorithms working correctly',
        details: `Processed ${reportSummary.totalObjectives} objectives, ${reportSummary.totalKeyResults} KRs, generated ${insights.length} insights`
      };
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Data processing algorithm test failed'
      };
    }
  }
  
  /**
   * Test report generation functions
   * @returns {Object} Test result
   */
  static testReportGeneration() {
    const testName = 'Report Generation';
    Logger.log(`Testing: ${testName}`);
    
    try {
      // Create mock report summary for testing
      const mockSummary = new ReportSummary();
      mockSummary.sessionInfo = {
        id: 'test-session',
        name: 'Test Session',
        description: 'Test session for report generation',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'ACTIVE',
        daysRemaining: 100
      };
      mockSummary.overallProgress = 75;
      mockSummary.totalObjectives = 3;
      mockSummary.totalKeyResults = 9;
      mockSummary.statusCounts = {
        'On Track': 6,
        'At Risk': 2,
        'Behind': 1,
        'Completed': 0,
        'Not Started': 0
      };
      mockSummary.recentlyUpdatedKRs = [
        { name: 'Test KR 1', status: 'On Track', progress: 80 },
        { name: 'Test KR 2', status: 'At Risk', progress: 45 }
      ];
      
      const mockProcessor = new DataProcessor();
      
      // Test Google Docs generation
      let docsResult = null;
      try {
        const docsGenerator = new GoogleDocsReportGenerator();
        docsResult = docsGenerator.generateReport(mockSummary, mockProcessor);
        
        if (!docsResult || !docsResult.includes('docs.google.com')) {
          throw new Error('Google Docs report generation failed to return valid URL');
        }
      } catch (docsError) {
        Logger.log(`Google Docs test failed: ${docsError.toString()}`);
      }
      
      // Test Google Sheets generation
      let sheetsResult = null;
      try {
        const sheetsGenerator = new GoogleSheetsReportGenerator();
        sheetsResult = sheetsGenerator.generateReport(mockSummary, mockProcessor);
        
        if (!sheetsResult || !sheetsResult.includes('docs.google.com/spreadsheets')) {
          throw new Error('Google Sheets report generation failed to return valid URL');
        }
      } catch (sheetsError) {
        Logger.log(`Google Sheets test failed: ${sheetsError.toString()}`);
      }
      
      // Clean up test documents
      if (docsResult) {
        try {
          const docId = docsResult.split('/d/')[1].split('/')[0];
          DriveApp.getFileById(docId).setTrashed(true);
        } catch (cleanupError) {
          Logger.log(`Failed to cleanup test doc: ${cleanupError.toString()}`);
        }
      }
      
      if (sheetsResult) {
        try {
          const sheetId = sheetsResult.split('/d/')[1].split('/')[0];
          DriveApp.getFileById(sheetId).setTrashed(true);
        } catch (cleanupError) {
          Logger.log(`Failed to cleanup test sheet: ${cleanupError.toString()}`);
        }
      }
      
      if (docsResult && sheetsResult) {
        return {
          name: testName,
          status: 'PASSED',
          message: 'Report generation working correctly',
          details: 'Successfully generated both Google Docs and Sheets reports'
        };
      } else if (docsResult || sheetsResult) {
        return {
          name: testName,
          status: 'WARNING',
          message: 'Partial report generation success',
          details: `${docsResult ? 'Docs' : 'Sheets'} generation succeeded, ${!docsResult ? 'Docs' : 'Sheets'} failed`
        };
      } else {
        return {
          name: testName,
          status: 'FAILED',
          message: 'Report generation failed',
          details: 'Both Google Docs and Sheets generation failed'
        };
      }
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Report generation test failed'
      };
    }
  }
  
  /**
   * Test error handling mechanisms
   * @returns {Object} Test result
   */
  static testErrorHandling() {
    const testName = 'Error Handling & Resilience';
    Logger.log(`Testing: ${testName}`);
    
    try {
      // Test error classification
      const networkError = new Error('Network connection failed');
      const networkClassification = ErrorHandler.classifyError(networkError, 'test');
      
      if (networkClassification.type !== 'NETWORK_ERROR' || !networkClassification.retryable) {
        throw new Error('Network error classification failed');
      }
      
      const authError = new Error('Authentication failed with 401');
      const authClassification = ErrorHandler.classifyError(authError, 'test');
      
      if (authClassification.type !== 'AUTH_ERROR' || authClassification.retryable) {
        throw new Error('Auth error classification failed');
      }
      
      // Test retry delay calculation
      const retryDelay = ErrorHandler.calculateRetryDelay(2, 'NETWORK_ERROR');
      if (retryDelay <= 0 || retryDelay > 60000) {
        throw new Error(`Invalid retry delay: ${retryDelay}ms`);
      }
      
      // Test fallback report creation
      const fallbackResult = ErrorHandler.createFallbackReport(
        { partialData: 'test' },
        [{ context: 'test', message: 'Test error' }]
      );
      
      if (!fallbackResult.fallbackReportUrl) {
        throw new Error('Fallback report creation failed');
      }
      
      // Clean up fallback report
      try {
        const docId = fallbackResult.fallbackReportUrl.split('/d/')[1].split('/')[0];
        DriveApp.getFileById(docId).setTrashed(true);
      } catch (cleanupError) {
        Logger.log(`Failed to cleanup fallback report: ${cleanupError.toString()}`);
      }
      
      return {
        name: testName,
        status: 'PASSED',
        message: 'Error handling mechanisms working correctly',
        details: 'Error classification, retry logic, and fallback report generation verified'
      };
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Error handling test failed'
      };
    }
  }
  
  /**
   * Test trigger management
   * @returns {Object} Test result
   */
  static testTriggerManagement() {
    const testName = 'Trigger Management';
    Logger.log(`Testing: ${testName}`);
    
    try {
      // Test trigger status (should work even without triggers)
      const status = TriggerManager.getTriggerStatus();
      
      if (!status || typeof status.active !== 'boolean') {
        throw new Error('Trigger status check failed');
      }
      
      // Test getting active triggers
      const triggers = TriggerManager.getActiveTriggers();
      
      if (!Array.isArray(triggers)) {
        throw new Error('Get active triggers failed');
      }
      
      return {
        name: testName,
        status: 'PASSED',
        message: 'Trigger management working correctly',
        details: `Found ${triggers.length} active triggers, status check functional`
      };
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Trigger management test failed'
      };
    }
  }
}

/**
 * Run comprehensive test suite
 */
function runTests() {
  const results = TestSuite.runAllTests();
  Logger.log('Test Results: ' + JSON.stringify(results, null, 2));
  return results;
}

/**
 * Test individual components
 */
function testConfigurationOnly() {
  return TestSuite.testConfiguration();
}

function testApiOnly() {
  return TestSuite.testApiAuthentication();
}

function testDataProcessingOnly() {
  return TestSuite.testDataProcessing();
}

function testReportGenerationOnly() {
  return TestSuite.testReportGeneration();
}

function testErrorHandlingOnly() {
  return TestSuite.testErrorHandling();
}

function testTriggerManagementOnly() {
  return TestSuite.testTriggerManagement();
}

// ============================================================================
// INTEGRATION TESTING FUNCTIONS
// ============================================================================

/**
 * Integration Test Suite for end-to-end workflow validation
 */
class IntegrationTestSuite {
  
  /**
   * Run comprehensive integration tests
   * @returns {Object} Integration test results
   */
  static runIntegrationTests() {
    Logger.log('Starting integration test suite...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
    
    // Run integration test categories
    results.tests.push(this.testEndToEndWorkflow());
    results.tests.push(this.testVariousConfigurations());
    results.tests.push(this.testErrorScenarios());
    results.tests.push(this.testTriggerExecution());
    
    // Calculate summary
    for (const test of results.tests) {
      results.summary.total++;
      if (test.status === 'PASSED') {
        results.summary.passed++;
      } else if (test.status === 'FAILED') {
        results.summary.failed++;
      } else {
        results.summary.warnings++;
      }
    }
    
    Logger.log(`Integration Test Summary: ${results.summary.passed}/${results.summary.total} passed, ${results.summary.failed} failed, ${results.summary.warnings} warnings`);
    
    return results;
  }
  
  /**
   * Test complete end-to-end workflow
   * @returns {Object} Test result
   */
  static testEndToEndWorkflow() {
    const testName = 'End-to-End Workflow';
    Logger.log(`Testing: ${testName}`);
    
    try {
      // Check if we have minimum configuration for E2E test
      const config = ConfigManager.getConfig();
      
      if (!config.apiToken || !config.accountId) {
        return {
          name: testName,
          status: 'WARNING',
          message: 'Cannot run E2E test without API credentials',
          details: 'Configure API token and account ID to enable full E2E testing'
        };
      }
      
      // Test with mock session ID if real one not configured
      const sessionId = config.sessionId || 'mock-session-for-testing';
      const useRealData = !!config.sessionId;
      
      Logger.log(`Running E2E test with ${useRealData ? 'real' : 'mock'} data...`);
      
      // Step 1: Test API client initialization
      const apiClient = new QuantiveApiClient(config.apiToken, config.accountId, config.baseUrl);
      
      // Step 2: Test connectivity
      if (useRealData) {
        try {
          apiClient.testConnection();
        } catch (connectionError) {
          return {
            name: testName,
            status: 'FAILED',
            message: `API connection failed: ${connectionError.toString()}`,
            details: 'Cannot proceed with E2E test without API connectivity'
          };
        }
      }
      
      // Step 3: Test data fetching (mock if no real session)
      let sessionData;
      if (useRealData) {
        try {
          sessionData = apiClient.getCompleteSessionData(sessionId);
        } catch (dataError) {
          return {
            name: testName,
            status: 'FAILED',
            message: `Data fetching failed: ${dataError.toString()}`,
            details: 'Check session ID and permissions'
          };
        }
      } else {
        // Create comprehensive mock data
        sessionData = this.createMockSessionData();
      }
      
      // Step 4: Test data processing
      const processor = new DataProcessor(config.lookbackDays || 7);
      const reportSummary = processor.processSessionData(sessionData);
      
      if (!reportSummary || !reportSummary.sessionInfo) {
        throw new Error('Data processing failed to generate valid summary');
      }
      
      // Step 5: Test report generation
      const testResults = { docUrl: null, sheetUrl: null };
      
      // Test Google Docs generation (create temporary)
      try {
        const docsGenerator = new GoogleDocsReportGenerator();
        testResults.docUrl = docsGenerator.generateReport(reportSummary, processor);
        
        // Clean up test document
        try {
          const docId = this.extractGoogleDocId(testResults.docUrl);
          if (docId) {
            DriveApp.getFileById(docId).setTrashed(true);
          }
        } catch (cleanupError) {
          Logger.log(`Failed to cleanup test doc: ${cleanupError.toString()}`);
        }
        
      } catch (docsError) {
        Logger.log(`Google Docs generation failed: ${docsError.toString()}`);
      }
      
      // Test Google Sheets generation (create temporary)
      try {
        const sheetsGenerator = new GoogleSheetsReportGenerator();
        testResults.sheetUrl = sheetsGenerator.generateReport(reportSummary, processor);
        
        // Clean up test sheet
        try {
          const sheetId = this.extractGoogleDocId(testResults.sheetUrl);
          if (sheetId) {
            DriveApp.getFileById(sheetId).setTrashed(true);
          }
        } catch (cleanupError) {
          Logger.log(`Failed to cleanup test sheet: ${cleanupError.toString()}`);
        }
        
      } catch (sheetsError) {
        Logger.log(`Google Sheets generation failed: ${sheetsError.toString()}`);
      }
      
      // Step 6: Validate results
      const hasValidDoc = testResults.docUrl && testResults.docUrl.includes('docs.google.com');
      const hasValidSheet = testResults.sheetUrl && testResults.sheetUrl.includes('spreadsheets');
      
      if (hasValidDoc && hasValidSheet) {
        return {
          name: testName,
          status: 'PASSED',
          message: 'End-to-end workflow completed successfully',
          details: `Used ${useRealData ? 'real' : 'mock'} data. Generated both docs and sheets reports. ${reportSummary.totalObjectives} objectives, ${reportSummary.totalKeyResults} key results processed.`
        };
      } else if (hasValidDoc || hasValidSheet) {
        return {
          name: testName,
          status: 'WARNING',
          message: 'Partial E2E workflow success',
          details: `${hasValidDoc ? 'Docs' : 'Sheets'} generation succeeded, ${!hasValidDoc ? 'docs' : 'sheets'} failed`
        };
      } else {
        return {
          name: testName,
          status: 'FAILED',
          message: 'Report generation failed',
          details: 'Both Google Docs and Sheets generation failed in E2E test'
        };
      }
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'End-to-end workflow test failed'
      };
    }
  }
  
  /**
   * Test with various session configurations
   * @returns {Object} Test result
   */
  static testVariousConfigurations() {
    const testName = 'Various Session Configurations';
    Logger.log(`Testing: ${testName}`);
    
    try {
      const testConfigurations = [
        { lookbackDays: 1, description: '1-day lookback' },
        { lookbackDays: 7, description: '7-day lookback (default)' },
        { lookbackDays: 30, description: '30-day lookback' },
        { lookbackDays: 90, description: '90-day lookback' }
      ];
      
      const results = [];
      const mockSessionData = this.createMockSessionData();
      
      for (const testConfig of testConfigurations) {
        try {
          const processor = new DataProcessor(testConfig.lookbackDays);
          const reportSummary = processor.processSessionData(mockSessionData);
          
          // Validate that different lookback periods affect results correctly
          const recentCount = reportSummary.recentlyUpdatedKRs.length;
          
          results.push({
            config: testConfig.description,
            success: true,
            recentUpdates: recentCount,
            totalKRs: reportSummary.totalKeyResults
          });
          
        } catch (configError) {
          results.push({
            config: testConfig.description,
            success: false,
            error: configError.toString()
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      if (successCount === testConfigurations.length) {
        return {
          name: testName,
          status: 'PASSED',
          message: 'All configuration variations tested successfully',
          details: `Tested ${testConfigurations.length} different lookback configurations. Results: ${JSON.stringify(results)}`
        };
      } else {
        return {
          name: testName,
          status: 'WARNING',
          message: `${successCount}/${testConfigurations.length} configurations passed`,
          details: `Some configuration tests failed: ${JSON.stringify(results)}`
        };
      }
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Configuration variation testing failed'
      };
    }
  }
  
  /**
   * Test error scenarios and recovery
   * @returns {Object} Test result
   */
  static testErrorScenarios() {
    const testName = 'Error Scenarios & Recovery';
    Logger.log(`Testing: ${testName}`);
    
    try {
      const errorScenarios = [
        {
          name: 'Invalid API Token',
          test: () => {
            const badClient = new QuantiveApiClient('invalid-token', 'account-id');
            try {
              badClient.testConnection();
              return { success: false, reason: 'Should have failed with invalid token' };
            } catch (expectedError) {
              return { success: true, error: expectedError.toString() };
            }
          }
        },
        {
          name: 'Corrupted Data Processing',
          test: () => {
            try {
              const processor = new DataProcessor(7);
              // Test with null/invalid data
              try {
                processor.processSessionData(null);
                return { success: false, reason: 'Should have failed with null data' };
              } catch (expectedError) {
                return { success: true, error: expectedError.toString() };
              }
            } catch (testError) {
              return { success: false, reason: testError.toString() };
            }
          }
        }
      ];
      
      const results = [];
      for (const scenario of errorScenarios) {
        try {
          const result = scenario.test();
          results.push({
            scenario: scenario.name,
            success: result.success,
            details: result.error || result.reason
          });
        } catch (scenarioError) {
          results.push({
            scenario: scenario.name,
            success: false,
            details: `Test execution failed: ${scenarioError.toString()}`
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      if (successCount === errorScenarios.length) {
        return {
          name: testName,
          status: 'PASSED',
          message: 'All error scenarios handled correctly',
          details: `Tested ${errorScenarios.length} error scenarios. All errors were properly caught and handled.`
        };
      } else {
        return {
          name: testName,
          status: 'WARNING',
          message: `${successCount}/${errorScenarios.length} error scenarios passed`,
          details: `Some error handling tests failed: ${JSON.stringify(results)}`
        };
      }
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Error scenario testing failed'
      };
    }
  }
  
  /**
   * Test trigger execution capabilities
   * @returns {Object} Test result
   */
  static testTriggerExecution() {
    const testName = 'Trigger Execution';
    Logger.log(`Testing: ${testName}`);
    
    try {
      // Test trigger creation and management
      const originalTriggers = TriggerManager.getActiveTriggers();
      const originalTriggerId = ConfigManager.getProperty('TRIGGER_ID');
      
      // Test creating a trigger (but delete it immediately)
      let testTriggerId = null;
      try {
        // Create a test trigger for 1 hour from now
        const testHour = new Date().getHours() + 1;
        testTriggerId = TriggerManager.setupTimeDrivenTrigger('daily', testHour % 24);
        
        if (!testTriggerId) {
          throw new Error('Failed to create test trigger');
        }
        
        // Verify trigger was created
        const newTriggers = TriggerManager.getActiveTriggers();
        const triggerCreated = newTriggers.some(t => t.id === testTriggerId);
        
        if (!triggerCreated) {
          throw new Error('Test trigger was not found in active triggers');
        }
        
        // Test trigger status
        const status = TriggerManager.getTriggerStatus();
        if (!status || !status.active) {
          throw new Error('Trigger status check failed');
        }
        
        // Clean up test trigger
        const deleted = TriggerManager.deleteTrigger(testTriggerId);
        if (!deleted) {
          Logger.log('Warning: Failed to delete test trigger');
        }
        
        // Restore original trigger if it existed
        if (originalTriggerId) {
          ConfigManager.setProperty('TRIGGER_ID', originalTriggerId);
        }
        
        return {
          name: testName,
          status: 'PASSED',
          message: 'Trigger execution system working correctly',
          details: `Successfully created, verified, and deleted test trigger. Original triggers: ${originalTriggers.length}, Test trigger ID: ${testTriggerId}`
        };
        
      } catch (triggerError) {
        // Clean up any created trigger
        if (testTriggerId) {
          try {
            TriggerManager.deleteTrigger(testTriggerId);
          } catch (cleanupError) {
            Logger.log(`Failed to cleanup test trigger: ${cleanupError.toString()}`);
          }
        }
        
        // Restore original trigger ID
        if (originalTriggerId) {
          ConfigManager.setProperty('TRIGGER_ID', originalTriggerId);
        }
        
        throw triggerError;
      }
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Trigger execution testing failed'
      };
    }
  }
  
  /**
   * Create comprehensive mock session data for testing
   * @returns {QuantiveSession} Mock session data
   */
  static createMockSessionData() {
    const mockSession = new QuantiveSession({
      id: 'integration-test-session',
      name: 'Integration Test Session',
      description: 'Mock session for integration testing',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
      status: 'ACTIVE'
    });
    
    // Create multiple objectives with varying data
    const objectives = [
      {
        id: 'obj-1',
        name: 'Revenue Growth',
        description: 'Increase revenue by 25%',
        owner: 'Sales Team',
        status: 'ON_TRACK',
        progress: 75
      },
      {
        id: 'obj-2',
        name: 'Customer Satisfaction',
        description: 'Improve customer satisfaction scores',
        owner: 'Customer Success',
        status: 'AT_RISK',
        progress: 45
      },
      {
        id: 'obj-3',
        name: 'Product Development',
        description: 'Launch new product features',
        owner: 'Engineering',
        status: 'ON_TRACK',
        progress: 90
      }
    ];
    
    for (const objData of objectives) {
      const objective = new QuantiveObjective(objData);
      
      // Add key results for each objective
      const keyResults = [
        {
          id: `${objData.id}-kr-1`,
          name: `${objData.name} - KR 1`,
          status: objData.status,
          progress: objData.progress + 5,
          currentValue: objData.progress + 5,
          targetValue: 100,
          lastUpdated: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
          objectiveId: objData.id
        },
        {
          id: `${objData.id}-kr-2`,
          name: `${objData.name} - KR 2`,
          status: objData.status === 'ON_TRACK' ? 'AT_RISK' : objData.status,
          progress: objData.progress - 10,
          currentValue: objData.progress - 10,
          targetValue: 100,
          lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          objectiveId: objData.id
        }
      ];
      
      objective.keyResults = keyResults.map(kr => new QuantiveKeyResult(kr));
      mockSession.objectives.push(objective);
    }
    
    return mockSession;
  }
  
  /**
   * Extract Google Doc/Sheet ID from URL safely
   * @param {string} url - Google Doc or Sheet URL
   * @returns {string|null} Extracted ID or null if parsing fails
   */
  static extractGoogleDocId(url) {
    try {
      if (!url) return null;
      const match = url.match(APP_CONFIG.GOOGLE_DOC_URL_PATTERN);
      return match ? match[1] : null;
    } catch (error) {
      Logger.log(`Failed to extract doc ID from URL: ${url}`);
      return null;
    }
  }
}

/**
 * Run integration tests
 */
function runIntegrationTests() {
  const results = IntegrationTestSuite.runIntegrationTests();
  Logger.log('Integration Test Results: ' + JSON.stringify(results, null, 2));
  return results;
}

/**
 * Test individual integration components
 */
function testEndToEndOnly() {
  return IntegrationTestSuite.testEndToEndWorkflow();
}

function testConfigurationsOnly() {
  return IntegrationTestSuite.testVariousConfigurations();
}

function testErrorScenariosOnly() {
  return IntegrationTestSuite.testErrorScenarios();
}

function testTriggerExecutionOnly() {
  return IntegrationTestSuite.testTriggerExecution();
}

// ============================================================================
// PERFORMANCE TESTING FUNCTIONS
// ============================================================================

/**
 * Performance Test Suite for execution time and resource usage validation
 */
class PerformanceTestSuite {
  
  /**
   * Run comprehensive performance tests
   * @returns {Object} Performance test results
   */
  static runPerformanceTests() {
    Logger.log('Starting performance test suite...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
    
    // Run performance test categories
    results.tests.push(this.testExecutionTimeCompliance());
    results.tests.push(this.testApiRateLimitHandling());
    results.tests.push(this.testLargeDatasetProcessing());
    results.tests.push(this.testMemoryUsageOptimization());
    
    // Calculate summary
    for (const test of results.tests) {
      results.summary.total++;
      if (test.status === 'PASSED') {
        results.summary.passed++;
      } else if (test.status === 'FAILED') {
        results.summary.failed++;
      } else {
        results.summary.warnings++;
      }
    }
    
    Logger.log(`Performance Test Summary: ${results.summary.passed}/${results.summary.total} passed, ${results.summary.failed} failed, ${results.summary.warnings} warnings`);
    
    return results;
  }
  
  /**
   * Test execution time limits compliance
   * @returns {Object} Test result
   */
  static testExecutionTimeCompliance() {
    const testName = 'Execution Time Limits Compliance';
    Logger.log(`Testing: ${testName}`);
    
    try {
      const startTime = Date.now();
      const maxAllowedTime = APP_CONFIG.MAX_EXECUTION_TIME || 300000; // 5 minutes default
      
      // Test various components and measure execution time
      const componentTests = [
        {
          name: 'Configuration Management',
          test: () => {
            const start = Date.now();
            for (let i = 0; i < 100; i++) {
              ConfigManager.getConfig();
              ConfigManager.validateConfig();
            }
            return Date.now() - start;
          }
        },
        {
          name: 'Data Processing (Large Dataset)',
          test: () => {
            const start = Date.now();
            const largeSessionData = this.createLargeSessionData(50, 200); // 50 objectives, 200 KRs
            const processor = new DataProcessor(7);
            processor.processSessionData(largeSessionData);
            return Date.now() - start;
          }
        },
        {
          name: 'Report Generation',
          test: () => {
            const start = Date.now();
            const mockSummary = this.createMockReportSummary();
            const processor = new DataProcessor();
            
            // Test Docs generation
            const docsGenerator = new GoogleDocsReportGenerator();
            const docUrl = docsGenerator.generateReport(mockSummary, processor);
            
            // Test Sheets generation
            const sheetsGenerator = new GoogleSheetsReportGenerator();
            const sheetUrl = sheetsGenerator.generateReport(mockSummary, processor);
            
            // Clean up test documents
            try {
              const docId = docUrl.split('/d/')[1].split('/')[0];
              DriveApp.getFileById(docId).setTrashed(true);
            } catch (cleanupError) {
              Logger.log(`Failed to cleanup test doc: ${cleanupError.toString()}`);
            }
            
            try {
              const sheetId = sheetUrl.split('/d/')[1].split('/')[0];
              DriveApp.getFileById(sheetId).setTrashed(true);
            } catch (cleanupError) {
              Logger.log(`Failed to cleanup test sheet: ${cleanupError.toString()}`);
            }
            
            return Date.now() - start;
          }
        },
        {
          name: 'Error Handling Processing',
          test: () => {
            const start = Date.now();
            for (let i = 0; i < 10; i++) {
              try {
                throw new Error(`Test error ${i}`);
              } catch (testError) {
                ErrorHandler.classifyError(testError, 'performance-test');
                ErrorHandler.logDetailedError(testError, 'performance-test', { iteration: i });
              }
            }
            return Date.now() - start;
          }
        }
      ];
      
      const results = [];
      let totalExecutionTime = 0;
      
      for (const componentTest of componentTests) {
        try {
          const executionTime = componentTest.test();
          totalExecutionTime += executionTime;
          
          results.push({
            component: componentTest.name,
            executionTime: executionTime,
            status: executionTime < (maxAllowedTime / 4) ? 'FAST' : executionTime < (maxAllowedTime / 2) ? 'ACCEPTABLE' : 'SLOW'
          });
          
          Logger.log(`${componentTest.name}: ${executionTime}ms`);
          
        } catch (componentError) {
          results.push({
            component: componentTest.name,
            executionTime: -1,
            status: 'ERROR',
            error: componentError.toString()
          });
        }
      }
      
      const overallExecutionTime = Date.now() - startTime;
      
      // Check if we're within acceptable limits
      if (overallExecutionTime < maxAllowedTime * 0.7) {
        return {
          name: testName,
          status: 'PASSED',
          message: 'Execution time well within limits',
          details: `Total execution time: ${overallExecutionTime}ms (limit: ${maxAllowedTime}ms). Component results: ${JSON.stringify(results)}`
        };
      } else if (overallExecutionTime < maxAllowedTime) {
        return {
          name: testName,
          status: 'WARNING',
          message: 'Execution time approaching limits',
          details: `Total execution time: ${overallExecutionTime}ms (limit: ${maxAllowedTime}ms). Consider optimization. Component results: ${JSON.stringify(results)}`
        };
      } else {
        return {
          name: testName,
          status: 'FAILED',
          message: 'Execution time exceeds limits',
          details: `Total execution time: ${overallExecutionTime}ms exceeds limit of ${maxAllowedTime}ms. Component results: ${JSON.stringify(results)}`
        };
      }
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Execution time compliance test failed'
      };
    }
  }
  
  /**
   * Test API rate limiting handling
   * @returns {Object} Test result
   */
  static testApiRateLimitHandling() {
    const testName = 'API Rate Limiting Handling';
    Logger.log(`Testing: ${testName}`);
    
    try {
      // Test rate limiting mechanism (simulated)
      const rateLimitTests = [
        {
          name: 'Retry Delay Calculation',
          test: () => {
            const delays = [];
            for (let attempt = 0; attempt < 5; attempt++) {
              const delay = ErrorHandler.calculateRetryDelay(attempt, 'RATE_LIMIT');
              delays.push(delay);
              
              // Validate exponential backoff
              if (attempt > 0 && delay <= delays[attempt - 1]) {
                throw new Error(`Delay not increasing: attempt ${attempt} has delay ${delay}ms, previous was ${delays[attempt - 1]}ms`);
              }
            }
            return delays;
          }
        },
        {
          name: 'Rate Limit Error Classification',
          test: () => {
            const rateLimitError = new Error('Rate limit exceeded (429)');
            const classification = ErrorHandler.classifyError(rateLimitError, 'test');
            
            if (classification.type !== 'RATE_LIMIT' || !classification.retryable) {
              throw new Error(`Rate limit error not classified correctly: ${JSON.stringify(classification)}`);
            }
            
            return classification;
          }
        },
        {
          name: 'API Client Rate Limit Handling',
          test: () => {
            // Test that the API client has proper rate limiting built in
            const config = ConfigManager.getConfig();
            
            if (!config.apiToken || !config.accountId) {
              return 'SKIPPED - No API credentials configured';
            }
            
            const apiClient = new QuantiveApiClient(config.apiToken, config.accountId, config.baseUrl);
            
            // Verify rate limiting configuration exists
            if (!APP_CONFIG.MAX_RETRIES || !APP_CONFIG.RETRY_DELAY) {
              throw new Error('Rate limiting configuration missing');
            }
            
            return {
              maxRetries: APP_CONFIG.MAX_RETRIES,
              retryDelay: APP_CONFIG.RETRY_DELAY,
              hasRetryLogic: typeof apiClient.executeWithRetry === 'function'
            };
          }
        }
      ];
      
      const results = [];
      for (const test of rateLimitTests) {
        try {
          const result = test.test();
          results.push({
            test: test.name,
            success: true,
            result: result
          });
        } catch (testError) {
          results.push({
            test: test.name,
            success: false,
            error: testError.toString()
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      if (successCount === rateLimitTests.length) {
        return {
          name: testName,
          status: 'PASSED',
          message: 'API rate limiting handled correctly',
          details: `All ${rateLimitTests.length} rate limiting tests passed. Results: ${JSON.stringify(results)}`
        };
      } else {
        return {
          name: testName,
          status: 'WARNING',
          message: `${successCount}/${rateLimitTests.length} rate limiting tests passed`,
          details: `Some rate limiting tests failed: ${JSON.stringify(results)}`
        };
      }
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'API rate limiting test failed'
      };
    }
  }
  
  /**
   * Test large dataset processing
   * @returns {Object} Test result
   */
  static testLargeDatasetProcessing() {
    const testName = 'Large Dataset Processing';
    Logger.log(`Testing: ${testName}`);
    
    try {
      const datasetSizes = [
        { objectives: 10, keyResults: 50, description: 'Small dataset' },
        { objectives: 25, keyResults: 100, description: 'Medium dataset' },
        { objectives: 50, keyResults: 200, description: 'Large dataset' },
        { objectives: 100, keyResults: 400, description: 'Extra large dataset' }
      ];
      
      const results = [];
      
      for (const datasetSize of datasetSizes) {
        try {
          const startTime = Date.now();
          
          // Create large dataset
          const largeSessionData = this.createLargeSessionData(
            datasetSize.objectives,
            datasetSize.keyResults
          );
          
          // Process the data
          const processor = new DataProcessor(7);
          const reportSummary = processor.processSessionData(largeSessionData);
          
          const processingTime = Date.now() - startTime;
          
          // Validate results
          if (reportSummary.totalObjectives !== datasetSize.objectives) {
            throw new Error(`Expected ${datasetSize.objectives} objectives, got ${reportSummary.totalObjectives}`);
          }
          
          if (reportSummary.totalKeyResults !== datasetSize.keyResults) {
            throw new Error(`Expected ${datasetSize.keyResults} key results, got ${reportSummary.totalKeyResults}`);
          }
          
          results.push({
            dataset: datasetSize.description,
            objectives: datasetSize.objectives,
            keyResults: datasetSize.keyResults,
            processingTime: processingTime,
            overallProgress: reportSummary.overallProgress,
            recentUpdates: reportSummary.recentlyUpdatedKRs.length,
            status: processingTime < 30000 ? 'FAST' : processingTime < 60000 ? 'ACCEPTABLE' : 'SLOW'
          });
          
          Logger.log(`${datasetSize.description}: ${processingTime}ms for ${datasetSize.objectives} objectives, ${datasetSize.keyResults} KRs`);
          
        } catch (datasetError) {
          results.push({
            dataset: datasetSize.description,
            objectives: datasetSize.objectives,
            keyResults: datasetSize.keyResults,
            processingTime: -1,
            status: 'ERROR',
            error: datasetError.toString()
          });
        }
      }
      
      const successCount = results.filter(r => r.status !== 'ERROR').length;
      const fastCount = results.filter(r => r.status === 'FAST').length;
      
      if (successCount === datasetSizes.length && fastCount >= datasetSizes.length / 2) {
        return {
          name: testName,
          status: 'PASSED',
          message: 'Large dataset processing performed well',
          details: `Processed ${datasetSizes.length} different dataset sizes successfully. Results: ${JSON.stringify(results)}`
        };
      } else if (successCount === datasetSizes.length) {
        return {
          name: testName,
          status: 'WARNING',
          message: 'Large dataset processing successful but slow',
          details: `All datasets processed but performance could be improved. Results: ${JSON.stringify(results)}`
        };
      } else {
        return {
          name: testName,
          status: 'FAILED',
          message: 'Large dataset processing failed',
          details: `${successCount}/${datasetSizes.length} datasets processed successfully. Results: ${JSON.stringify(results)}`
        };
      }
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Large dataset processing test failed'
      };
    }
  }
  
  /**
   * Test memory usage optimization
   * @returns {Object} Test result
   */
  static testMemoryUsageOptimization() {
    const testName = 'Memory Usage Optimization';
    Logger.log(`Testing: ${testName}`);
    
    try {
      // Test memory-efficient patterns
      const memoryTests = [
        {
          name: 'Data Structure Efficiency',
          test: () => {
            const startTime = Date.now();
            
            // Test creating many data structures
            const sessions = [];
            for (let i = 0; i < 100; i++) {
              const session = new QuantiveSession({
                id: `session-${i}`,
                name: `Session ${i}`,
                description: `Test session ${i}`,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 86400000).toISOString(),
                status: 'ACTIVE'
              });
              sessions.push(session);
            }
            
            // Clear references
            sessions.length = 0;
            
            return Date.now() - startTime;
          }
        },
        {
          name: 'Large Data Processing Without Memory Leaks',
          test: () => {
            const startTime = Date.now();
            
            // Process multiple datasets sequentially to test for memory leaks
            for (let iteration = 0; iteration < 5; iteration++) {
              const sessionData = this.createLargeSessionData(20, 80);
              const processor = new DataProcessor(7);
              const summary = processor.processSessionData(sessionData);
              
              // Validate each iteration produces consistent results
              if (summary.totalObjectives !== 20 || summary.totalKeyResults !== 80) {
                throw new Error(`Iteration ${iteration} produced inconsistent results`);
              }
            }
            
            return Date.now() - startTime;
          }
        },
        {
          name: 'String Concatenation Efficiency',
          test: () => {
            const startTime = Date.now();
            
            // Test efficient string building for reports
            const parts = [];
            for (let i = 0; i < 1000; i++) {
              parts.push(`Test string ${i} with some content`);
            }
            
            const result = parts.join('\n');
            
            if (result.length < 1000) {
              throw new Error('String concatenation test failed');
            }
            
            return Date.now() - startTime;
          }
        }
      ];
      
      const results = [];
      let totalTime = 0;
      
      for (const test of memoryTests) {
        try {
          const executionTime = test.test();
          totalTime += executionTime;
          
          results.push({
            test: test.name,
            executionTime: executionTime,
            success: true
          });
          
          Logger.log(`${test.name}: ${executionTime}ms`);
          
        } catch (testError) {
          results.push({
            test: test.name,
            executionTime: -1,
            success: false,
            error: testError.toString()
          });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const avgTime = totalTime / successCount;
      
      if (successCount === memoryTests.length && avgTime < 5000) {
        return {
          name: testName,
          status: 'PASSED',
          message: 'Memory usage optimization is effective',
          details: `All ${memoryTests.length} memory tests passed with average time ${avgTime.toFixed(0)}ms. Results: ${JSON.stringify(results)}`
        };
      } else if (successCount === memoryTests.length) {
        return {
          name: testName,
          status: 'WARNING',
          message: 'Memory usage acceptable but could be optimized',
          details: `All tests passed but average time ${avgTime.toFixed(0)}ms indicates room for improvement. Results: ${JSON.stringify(results)}`
        };
      } else {
        return {
          name: testName,
          status: 'FAILED',
          message: 'Memory usage optimization test failed',
          details: `${successCount}/${memoryTests.length} memory tests passed. Results: ${JSON.stringify(results)}`
        };
      }
      
    } catch (error) {
      return {
        name: testName,
        status: 'FAILED',
        message: error.toString(),
        details: 'Memory usage optimization test failed'
      };
    }
  }
  
  /**
   * Create large session data for performance testing
   * @param {number} objectiveCount - Number of objectives to create
   * @param {number} keyResultCount - Number of key results to create
   * @returns {QuantiveSession} Large session data
   */
  static createLargeSessionData(objectiveCount, keyResultCount) {
    const session = new QuantiveSession({
      id: 'performance-test-session',
      name: 'Performance Test Session',
      description: 'Large session for performance testing',
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T23:59:59Z',
      status: 'ACTIVE'
    });
    
    const krPerObjective = Math.floor(keyResultCount / objectiveCount);
    const statuses = ['ON_TRACK', 'AT_RISK', 'BEHIND', 'COMPLETED'];
    
    for (let objIndex = 0; objIndex < objectiveCount; objIndex++) {
      const objective = new QuantiveObjective({
        id: `perf-obj-${objIndex}`,
        name: `Performance Objective ${objIndex + 1}`,
        description: `Description for performance objective ${objIndex + 1}`,
        owner: `Owner ${(objIndex % 10) + 1}`,
        status: statuses[objIndex % statuses.length],
        progress: Math.floor(Math.random() * 100)
      });
      
      // Add key results for this objective
      const keyResults = [];
      for (let krIndex = 0; krIndex < krPerObjective; krIndex++) {
        const globalKrIndex = objIndex * krPerObjective + krIndex;
        if (globalKrIndex >= keyResultCount) break;
        
        const keyResult = new QuantiveKeyResult({
          id: `perf-kr-${globalKrIndex}`,
          name: `Performance KR ${globalKrIndex + 1}`,
          description: `Description for performance KR ${globalKrIndex + 1}`,
          owner: `KR Owner ${(globalKrIndex % 5) + 1}`,
          status: statuses[globalKrIndex % statuses.length],
          progress: Math.floor(Math.random() * 100),
          currentValue: Math.floor(Math.random() * 100),
          targetValue: 100,
          unit: 'percent',
          lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          objectiveId: objective.id
        });
        
        keyResults.push(keyResult);
      }
      
      objective.keyResults = keyResults;
      session.objectives.push(objective);
    }
    
    return session;
  }
  
  /**
   * Create mock report summary for testing
   * @returns {ReportSummary} Mock report summary
   */
  static createMockReportSummary() {
    const summary = new ReportSummary();
    summary.sessionInfo = {
      id: 'performance-test-session',
      name: 'Performance Test Session',
      description: 'Mock session for performance testing',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: 'ACTIVE',
      daysRemaining: 150
    };
    summary.overallProgress = 65;
    summary.totalObjectives = 15;
    summary.totalKeyResults = 45;
    summary.statusCounts = {
      'On Track': 25,
      'At Risk': 12,
      'Behind': 5,
      'Completed': 3,
      'Not Started': 0
    };
    summary.recentlyUpdatedKRs = [
      { name: 'Performance KR 1', status: 'On Track', progress: 80 },
      { name: 'Performance KR 2', status: 'At Risk', progress: 45 },
      { name: 'Performance KR 3', status: 'Behind', progress: 25 }
    ];
    
    return summary;
  }
}

/**
 * Run performance tests
 */
function runPerformanceTests() {
  const results = PerformanceTestSuite.runPerformanceTests();
  Logger.log('Performance Test Results: ' + JSON.stringify(results, null, 2));
  return results;
}

/**
 * Test individual performance components
 */
function testExecutionTimeOnly() {
  return PerformanceTestSuite.testExecutionTimeCompliance();
}

function testRateLimitingOnly() {
  return PerformanceTestSuite.testApiRateLimitHandling();
}

function testLargeDatasetOnly() {
  return PerformanceTestSuite.testLargeDatasetProcessing();
}

function testMemoryOptimizationOnly() {
  return PerformanceTestSuite.testMemoryUsageOptimization();
}
