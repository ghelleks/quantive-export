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
  constructor(lookbackDays = CONFIG.DEFAULT_LOOKBACK_DAYS) {
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
      const mappedStatus = CONFIG.STATUS_MAPPING[kr.status] || 'Not Started';
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
      status: CONFIG.STATUS_MAPPING[kr.status] || kr.status,
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
 * Utility functions for data transformation
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
    const statusList = this.body.appendList();
    
    for (const [status, count] of Object.entries(reportSummary.statusCounts)) {
      if (count > 0) {
        const statusEmoji = this.getStatusEmoji(status);
        statusList.appendListItem(`${statusEmoji} ${status}: ${count} key results`);
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
    
    const statusList = this.body.appendList();
    const sortedStatuses = Object.entries(reportSummary.statusCounts)
      .sort(([,a], [,b]) => b - a); // Sort by count descending
    
    for (const [status, count] of sortedStatuses) {
      const emoji = this.getStatusEmoji(status);
      const percentage = reportSummary.totalKeyResults > 0 
        ? Math.round((count / reportSummary.totalKeyResults) * 100) 
        : 0;
      statusList.appendListItem(`${emoji} ${status}: ${count} (${percentage}%)`);
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
    
    const activityList = this.body.appendList();
    
    for (const kr of sortedKRs.slice(0, 10)) { // Limit to top 10
      const statusEmoji = this.getStatusEmoji(kr.status);
      const progress = DataTransformUtils.formatProgress(kr.progress);
      const lastUpdated = DataTransformUtils.formatDate(new Date(kr.lastUpdated));
      
      activityList.appendListItem(
        `${statusEmoji} ${DataTransformUtils.truncateText(kr.name, 60)} (${progress}) - Updated ${lastUpdated}`
      );
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
    
    const insightsList = this.body.appendList();
    
    for (const insight of insights) {
      insightsList.appendListItem(insight);
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
    const keyInsights = insights.slice(0, 3).join(' | '); // Take first 3 insights
    
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
  archiveOldData(maxRows = 100) {
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
    
    // Fetch session data
    const sessionData = apiClient.getCompleteSessionData(config.sessionId);
    Logger.log('Session data fetched successfully');
    
    // Process data and generate summary
    const processor = new DataProcessor(config.lookbackDays);
    const reportSummary = processor.processSessionData(sessionData);
    Logger.log('Report summary generated successfully');
    
    // Generate Google Docs report
    if (config.googleDocId || !config.googleSheetId) {
      const docsGenerator = new GoogleDocsReportGenerator(config.googleDocId);
      const docUrl = docsGenerator.generateReport(reportSummary, processor);
      Logger.log(`Google Docs report generated: ${docUrl}`);
      
      // Update config with new doc ID if it was created
      if (!config.googleDocId) {
        ConfigManager.setProperty(CONFIG.PROPERTIES.GOOGLE_DOC_ID, docsGenerator.getDocumentId());
        Logger.log('Saved new Google Doc ID to configuration');
      }
    }
    
    // Generate Google Sheets report
    if (config.googleSheetId || !config.googleDocId) {
      const sheetsGenerator = new GoogleSheetsReportGenerator(config.googleSheetId);
      const sheetUrl = sheetsGenerator.generateReport(reportSummary, processor);
      Logger.log(`Google Sheets report generated: ${sheetUrl}`);
      
      // Update config with new sheet ID if it was created
      if (!config.googleSheetId) {
        ConfigManager.setProperty(CONFIG.PROPERTIES.GOOGLE_SHEET_ID, sheetsGenerator.getSpreadsheetId());
        Logger.log('Saved new Google Sheet ID to configuration');
      }
      
      // Optional: Archive old data to keep sheet manageable
      sheetsGenerator.archiveOldData(100);
    }
    
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