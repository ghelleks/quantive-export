# Configuration Templates

This document provides sample configuration templates for different deployment scenarios of the Quantive Session Snapshot & Summary Google Apps Script.

## Basic Configuration Template

### Required Properties
```javascript
// Copy these properties to your Google Apps Script Project Settings > Script Properties

// Quantive API Credentials
QUANTIVE_API_TOKEN = "your-quantive-api-token-here"
QUANTIVE_ACCOUNT_ID = "your-quantive-account-id-here"

// Target Session
SESSION_ID = "your-session-id-here"

// Output Destination (choose one or both)
GOOGLE_DOC_ID = "your-google-doc-id-here"        // Optional: for formatted reports
GOOGLE_SHEET_ID = "your-google-sheet-id-here"    // Optional: for historical data

// Activity Tracking
LOOKBACK_DAYS = "7"                               // Optional: defaults to 7 days
```

### Setup Function Configuration
```javascript
// Alternative: Use the built-in setup function
function setupMyConfiguration() {
  ConfigManager.setProperties({
    'QUANTIVE_API_TOKEN': 'your-api-token-here',
    'QUANTIVE_ACCOUNT_ID': 'your-account-id-here',
    'SESSION_ID': 'your-session-id-here',
    'GOOGLE_DOC_ID': 'your-google-doc-id',      // Optional
    'GOOGLE_SHEET_ID': 'your-google-sheet-id',  // Optional
    'LOOKBACK_DAYS': '7'                        // Optional
  });
  
  Logger.log('Configuration saved successfully');
}
```

## Environment-Specific Templates

### Development Environment
```javascript
// Development/Testing Configuration
const DEV_CONFIG = {
  'QUANTIVE_API_TOKEN': 'dev-api-token-here',
  'QUANTIVE_ACCOUNT_ID': 'dev-account-id-here',
  'SESSION_ID': 'test-session-id-here',
  'GOOGLE_DOC_ID': 'test-doc-id-here',
  'GOOGLE_SHEET_ID': 'test-sheet-id-here',
  'LOOKBACK_DAYS': '3'  // Shorter lookback for testing
};

function setupDevelopmentConfig() {
  ConfigManager.setProperties(DEV_CONFIG);
  Logger.log('Development configuration applied');
}
```

### Production Environment
```javascript
// Production Configuration
const PROD_CONFIG = {
  'QUANTIVE_API_TOKEN': 'prod-api-token-here',
  'QUANTIVE_ACCOUNT_ID': 'prod-account-id-here',
  'SESSION_ID': 'current-quarter-session-id',
  'GOOGLE_DOC_ID': 'executive-report-doc-id',
  'GOOGLE_SHEET_ID': 'historical-data-sheet-id',
  'LOOKBACK_DAYS': '7'
};

function setupProductionConfig() {
  ConfigManager.setProperties(PROD_CONFIG);
  Logger.log('Production configuration applied');
}
```

### Staging Environment
```javascript
// Staging/UAT Configuration
const STAGING_CONFIG = {
  'QUANTIVE_API_TOKEN': 'staging-api-token-here',
  'QUANTIVE_ACCOUNT_ID': 'staging-account-id-here',
  'SESSION_ID': 'uat-session-id-here',
  'GOOGLE_DOC_ID': 'staging-doc-id-here',
  'GOOGLE_SHEET_ID': 'staging-sheet-id-here',
  'LOOKBACK_DAYS': '14'  // Longer lookback for validation
};

function setupStagingConfig() {
  ConfigManager.setProperties(STAGING_CONFIG);
  Logger.log('Staging configuration applied');
}
```

## Use Case-Specific Templates

### Executive Summary Reports (Google Docs Only)
```javascript
// Configuration for formatted executive reports
const EXECUTIVE_CONFIG = {
  'QUANTIVE_API_TOKEN': 'your-api-token',
  'QUANTIVE_ACCOUNT_ID': 'your-account-id',
  'SESSION_ID': 'q4-2024-session',
  'GOOGLE_DOC_ID': 'executive-summary-doc-id',
  // No GOOGLE_SHEET_ID - only formatted docs
  'LOOKBACK_DAYS': '7'
};

function setupExecutiveReports() {
  ConfigManager.setProperties(EXECUTIVE_CONFIG);
  Logger.log('Executive reporting configuration applied');
}
```

### Data Analytics (Google Sheets Only)
```javascript
// Configuration for historical data tracking and analysis
const ANALYTICS_CONFIG = {
  'QUANTIVE_API_TOKEN': 'your-api-token',
  'QUANTIVE_ACCOUNT_ID': 'your-account-id',
  'SESSION_ID': 'current-session-id',
  'GOOGLE_SHEET_ID': 'analytics-dashboard-sheet-id',
  // No GOOGLE_DOC_ID - only data collection
  'LOOKBACK_DAYS': '14'  // Longer lookback for trend analysis
};

function setupAnalyticsDashboard() {
  ConfigManager.setProperties(ANALYTICS_CONFIG);
  Logger.log('Analytics configuration applied');
}
```

### Multi-Team Reporting
```javascript
// Configuration for comprehensive team reporting
const TEAM_CONFIG = {
  'QUANTIVE_API_TOKEN': 'your-api-token',
  'QUANTIVE_ACCOUNT_ID': 'your-account-id',
  'SESSION_ID': 'team-okrs-session',
  'GOOGLE_DOC_ID': 'team-status-report-doc',
  'GOOGLE_SHEET_ID': 'team-metrics-tracking-sheet',
  'LOOKBACK_DAYS': '5'  // Weekly cycle focus
};

function setupTeamReporting() {
  ConfigManager.setProperties(TEAM_CONFIG);
  Logger.log('Team reporting configuration applied');
}
```

## Automation Configuration Templates

### Daily Reports
```javascript
// Setup for daily morning reports
function setupDailyReporting() {
  // Set configuration
  ConfigManager.setProperties({
    'QUANTIVE_API_TOKEN': 'your-api-token',
    'QUANTIVE_ACCOUNT_ID': 'your-account-id',
    'SESSION_ID': 'daily-tracking-session',
    'GOOGLE_SHEET_ID': 'daily-metrics-sheet',
    'LOOKBACK_DAYS': '1'  // Only yesterday's updates
  });
  
  // Setup daily trigger at 8 AM
  TriggerManager.setupTimeDrivenTrigger('daily', 8);
  
  Logger.log('Daily reporting configured - reports at 8 AM daily');
}
```

### Weekly Reports
```javascript
// Setup for weekly Monday reports
function setupWeeklyReporting() {
  // Set configuration
  ConfigManager.setProperties({
    'QUANTIVE_API_TOKEN': 'your-api-token',
    'QUANTIVE_ACCOUNT_ID': 'your-account-id',
    'SESSION_ID': 'weekly-review-session',
    'GOOGLE_DOC_ID': 'weekly-status-doc',
    'GOOGLE_SHEET_ID': 'weekly-trends-sheet',
    'LOOKBACK_DAYS': '7'  // Full week review
  });
  
  // Setup weekly trigger - Mondays at 9 AM
  TriggerManager.setupTimeDrivenTrigger('weekly', 9, 1);
  
  Logger.log('Weekly reporting configured - reports Monday 9 AM');
}
```

### Monthly Reports
```javascript
// Setup for monthly executive reports
function setupMonthlyReporting() {
  // Set configuration
  ConfigManager.setProperties({
    'QUANTIVE_API_TOKEN': 'your-api-token',
    'QUANTIVE_ACCOUNT_ID': 'your-account-id',
    'SESSION_ID': 'monthly-review-session',
    'GOOGLE_DOC_ID': 'monthly-executive-report',
    'GOOGLE_SHEET_ID': 'monthly-kpi-tracking',
    'LOOKBACK_DAYS': '30'  // Full month review
  });
  
  // Setup monthly trigger - 1st of month at 10 AM
  TriggerManager.setupTimeDrivenTrigger('monthly', 10, null, 1);
  
  Logger.log('Monthly reporting configured - reports 1st of month 10 AM');
}
```

## Security-Enhanced Templates

### Production with Enhanced Security
```javascript
// Production configuration with additional security validations
function setupSecureProductionConfig() {
  const config = {
    'QUANTIVE_API_TOKEN': 'your-prod-token-here',
    'QUANTIVE_ACCOUNT_ID': 'your-prod-account-here',
    'SESSION_ID': 'prod-session-id-here',
    'GOOGLE_DOC_ID': 'secure-report-doc-id',
    'GOOGLE_SHEET_ID': 'secure-data-sheet-id',
    'LOOKBACK_DAYS': '7'
  };
  
  // Validate configuration before saving
  try {
    ConfigManager.setProperties(config);
    
    // Test configuration immediately
    const testResult = testConfiguration();
    if (testResult.success) {
      Logger.log('Secure production configuration validated and applied');
    } else {
      throw new Error('Configuration validation failed: ' + testResult.message);
    }
  } catch (error) {
    Logger.log('Configuration setup failed: ' + error.toString());
    throw error;
  }
}
```

## Configuration Validation Template

### Complete Setup and Validation
```javascript
// Comprehensive setup with full validation
function setupAndValidateConfiguration() {
  try {
    // Step 1: Set configuration
    const config = {
      'QUANTIVE_API_TOKEN': 'your-api-token-here',
      'QUANTIVE_ACCOUNT_ID': 'your-account-id-here',
      'SESSION_ID': 'your-session-id-here',
      'GOOGLE_DOC_ID': 'your-doc-id-here',
      'GOOGLE_SHEET_ID': 'your-sheet-id-here',
      'LOOKBACK_DAYS': '7'
    };
    
    ConfigManager.setProperties(config);
    Logger.log('✅ Configuration properties set');
    
    // Step 2: Validate configuration
    const validationResult = testConfiguration();
    if (!validationResult.success) {
      throw new Error('Configuration validation failed: ' + validationResult.message);
    }
    Logger.log('✅ Configuration validated successfully');
    
    // Step 3: Test report generation
    const reportResult = generateQuantiveReport();
    Logger.log('✅ Test report generated successfully');
    
    // Step 4: Setup automation (optional)
    const setupAutomation = false; // Set to true to enable
    if (setupAutomation) {
      TriggerManager.setupTimeDrivenTrigger('weekly', 9, 1);
      Logger.log('✅ Weekly automation configured');
    }
    
    Logger.log('🎉 Complete setup and validation successful!');
    
  } catch (error) {
    Logger.log('❌ Setup failed: ' + error.toString());
    throw error;
  }
}
```

## Quick Start Template

### Minimal Configuration for Testing
```javascript
// Fastest way to get started - minimal required configuration
function quickStartSetup() {
  // Replace these values with your actual credentials and IDs
  ConfigManager.setProperties({
    'QUANTIVE_API_TOKEN': 'REPLACE_WITH_YOUR_API_TOKEN',
    'QUANTIVE_ACCOUNT_ID': 'REPLACE_WITH_YOUR_ACCOUNT_ID',
    'SESSION_ID': 'REPLACE_WITH_YOUR_SESSION_ID',
    'GOOGLE_DOC_ID': 'REPLACE_WITH_YOUR_DOC_ID'  // or use GOOGLE_SHEET_ID
  });
  
  // Test the setup
  Logger.log('Testing configuration...');
  const testResult = testConfiguration();
  
  if (testResult.success) {
    Logger.log('✅ Quick start setup successful! You can now run generateQuantiveReport()');
  } else {
    Logger.log('❌ Setup failed: ' + testResult.message);
  }
}
```

## Configuration Reference

### Required Values
| Property | Description | Example |
|----------|-------------|---------|
| `QUANTIVE_API_TOKEN` | Your Quantive API authentication token | `qtv_1234567890abcdef...` |
| `QUANTIVE_ACCOUNT_ID` | Your Quantive account identifier | `12345678-1234-1234-1234-123456789012` |
| `SESSION_ID` | Target session UUID to analyze | `87654321-4321-4321-4321-210987654321` |

### Optional Values
| Property | Description | Default | Example |
|----------|-------------|---------|---------|
| `GOOGLE_DOC_ID` | Google Doc ID for formatted reports | None | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GOOGLE_SHEET_ID` | Google Sheet ID for data tracking | None | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `LOOKBACK_DAYS` | Days to look back for recent activity | `7` | `14` |

### How to Find Your IDs

#### Quantive API Token & Account ID
1. Log in to your Quantive account
2. Go to Settings > Integrations
3. Generate or copy your API token
4. Find your Account ID in account settings or URL

#### Google Document ID
1. Open your Google Doc
2. Copy the ID from the URL: `https://docs.google.com/document/d/[DOCUMENT_ID]/edit`

#### Google Sheet ID
1. Open your Google Sheet
2. Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

#### Session ID
1. Open the session in Quantive
2. Copy the ID from the URL or session settings

---

*Choose the template that best matches your use case and customize the values according to your specific requirements.*