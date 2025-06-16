# Configuration Templates

This document provides sample configuration templates for different deployment scenarios of the Quantive Session Snapshot & Summary Google Apps Script.

## ⚠️ SECURITY NOTICE

**NEVER use actual API tokens or credentials in configuration templates!** All examples below use placeholder values that must be replaced with your actual credentials. Always use Google Apps Script's PropertiesService for secure storage.

**New in v2.0**: Enhanced configuration management with environment support, validation, and security features.

## Basic Configuration Template

### Required Properties
```javascript
// Copy these properties to your Google Apps Script Project Settings > Script Properties
// IMPORTANT: Replace placeholder values with your actual credentials

// Quantive API Credentials (REQUIRED)
QUANTIVE_API_TOKEN = "your-quantive-api-token-here"     // Replace with actual API token
QUANTIVE_ACCOUNT_ID = "your-quantive-account-id-here"   // Replace with actual account ID

// Target Session (REQUIRED)
SESSION_ID = "your-session-id-here"                     // Replace with actual session UUID

// Environment Configuration (RECOMMENDED)
ENVIRONMENT = "production"                              // development, staging, or production

// Output Destination (choose one or both)
GOOGLE_DOC_ID = "your-google-doc-id-here"              // Optional: for formatted reports
GOOGLE_SHEET_ID = "your-google-sheet-id-here"          // Optional: for historical data

// Activity Tracking
LOOKBACK_DAYS = "7"                                     // Optional: defaults to 7 days

// Environment-Specific Settings (Optional)
PRODUCTION_API_RATE_LIMIT_DELAY = "1500"               // Slower for production
DEVELOPMENT_API_RATE_LIMIT_DELAY = "500"               // Faster for development
PRODUCTION_LOG_LEVEL = "WARN"                           // Less verbose for production
DEVELOPMENT_LOG_LEVEL = "DEBUG"                         // More verbose for development
```

### Enhanced Setup Function (v2.0)
```javascript
// NEW: Use the enhanced import function with validation
function setupMyConfiguration() {
  const config = {
    'QUANTIVE_API_TOKEN': 'your-actual-api-token',    // REPLACE with real token
    'QUANTIVE_ACCOUNT_ID': 'your-actual-account-id',  // REPLACE with real account ID
    'SESSION_ID': 'your-actual-session-uuid',         // REPLACE with real session ID
    'ENVIRONMENT': 'production',                      // development, staging, production
    'GOOGLE_DOC_ID': 'your-google-doc-id',           // Optional
    'GOOGLE_SHEET_ID': 'your-google-sheet-id',       // Optional
    'LOOKBACK_DAYS': '7'                             // Optional
  };
  
  try {
    // NEW: Import with validation
    importConfiguration(config);
    Logger.log('✅ Configuration imported and validated successfully');
    
    // NEW: Test the configuration
    if (testConfiguration()) {
      Logger.log('✅ Configuration test passed');
    } else {
      Logger.log('❌ Configuration test failed - check your credentials');
    }
  } catch (error) {
    Logger.log('❌ Configuration setup failed: ' + error.toString());
  }
}
```

## Environment-Specific Templates

### Development Environment (Enhanced)
```javascript
// Development/Testing Configuration with Environment-Specific Settings
const DEV_CONFIG = {
  'QUANTIVE_API_TOKEN': 'dev-api-token-here',              // REPLACE with dev token
  'QUANTIVE_ACCOUNT_ID': 'dev-account-id-here',            // REPLACE with dev account
  'SESSION_ID': 'test-session-id-here',                    // REPLACE with test session
  'ENVIRONMENT': 'development',                            // NEW: Environment setting
  'GOOGLE_DOC_ID': 'test-doc-id-here',
  'GOOGLE_SHEET_ID': 'test-sheet-id-here',
  'LOOKBACK_DAYS': '3',                                    // Shorter lookback for testing
  
  // NEW: Development-specific settings
  'DEVELOPMENT_API_RATE_LIMIT_DELAY': '500',              // Faster API calls
  'DEVELOPMENT_LOG_LEVEL': 'DEBUG',                       // Verbose logging
  'DEVELOPMENT_MAX_RETRIES': '2'                          // Fewer retries for faster feedback
};

function setupDevelopmentConfig() {
  try {
    importConfiguration(DEV_CONFIG);  // NEW: Use import with validation
    Logger.log('✅ Development configuration applied and validated');
    
    // NEW: Verify environment settings
    const config = ConfigManager.getConfig();
    Logger.log(`Environment: ${config.environment}`);
    Logger.log(`Rate limit delay: ${config.apiRateLimitDelay}ms`);
    Logger.log(`Log level: ${config.logLevel}`);
  } catch (error) {
    Logger.log('❌ Development setup failed: ' + error.toString());
  }
}
```

### Production Environment (Enhanced)
```javascript
// Production Configuration with Security and Performance Optimizations
const PROD_CONFIG = {
  'QUANTIVE_API_TOKEN': 'prod-api-token-here',             // REPLACE with production token
  'QUANTIVE_ACCOUNT_ID': 'prod-account-id-here',           // REPLACE with production account
  'SESSION_ID': 'current-quarter-session-id',              // REPLACE with current session
  'ENVIRONMENT': 'production',                             // NEW: Environment setting
  'GOOGLE_DOC_ID': 'executive-report-doc-id',              // REPLACE with real doc ID
  'GOOGLE_SHEET_ID': 'historical-data-sheet-id',          // REPLACE with real sheet ID
  'LOOKBACK_DAYS': '7',
  
  // NEW: Production-specific settings
  'PRODUCTION_API_RATE_LIMIT_DELAY': '1500',              // Conservative rate limiting
  'PRODUCTION_LOG_LEVEL': 'WARN',                         // Minimal logging
  'PRODUCTION_MAX_RETRIES': '3',                          // More retries for reliability
  'PRODUCTION_RETRY_DELAY': '3000'                        // Longer retry delays
};

function setupProductionConfig() {
  try {
    // NEW: Enhanced security validation for production
    Logger.log('Setting up production configuration...');
    
    importConfiguration(PROD_CONFIG);  // NEW: Import with validation
    Logger.log('✅ Production configuration imported');
    
    // NEW: Comprehensive validation for production
    if (testConfiguration()) {
      Logger.log('✅ Production configuration validated');
    } else {
      throw new Error('Production configuration validation failed');
    }
    
    // NEW: Test API connectivity
    if (testApiConnection()) {
      Logger.log('✅ Production API connection verified');
    } else {
      throw new Error('Production API connection test failed');
    }
    
    // NEW: Verify environment settings
    const config = ConfigManager.getConfig();
    Logger.log(`Environment: ${config.environment}`);
    Logger.log(`Rate limit delay: ${config.apiRateLimitDelay}ms`);
    Logger.log('🎉 Production setup completed successfully');
    
  } catch (error) {
    Logger.log('❌ Production setup failed: ' + error.toString());
    throw error;  // Re-throw for production safety
  }
}
```

### Staging Environment (Enhanced)
```javascript
// Staging/UAT Configuration with Balanced Settings
const STAGING_CONFIG = {
  'QUANTIVE_API_TOKEN': 'staging-api-token-here',          // REPLACE with staging token
  'QUANTIVE_ACCOUNT_ID': 'staging-account-id-here',        // REPLACE with staging account
  'SESSION_ID': 'uat-session-id-here',                     // REPLACE with UAT session
  'ENVIRONMENT': 'staging',                                // NEW: Environment setting
  'GOOGLE_DOC_ID': 'staging-doc-id-here',                  // REPLACE with staging doc ID
  'GOOGLE_SHEET_ID': 'staging-sheet-id-here',              // REPLACE with staging sheet ID
  'LOOKBACK_DAYS': '14',                                   // Longer lookback for validation
  
  // NEW: Staging-specific settings (balanced between dev and prod)
  'STAGING_API_RATE_LIMIT_DELAY': '1000',                 // Moderate rate limiting
  'STAGING_LOG_LEVEL': 'INFO',                            // Balanced logging
  'STAGING_MAX_RETRIES': '3'                              // Production-like retry behavior
};

function setupStagingConfig() {
  try {
    importConfiguration(STAGING_CONFIG);  // NEW: Import with validation
    Logger.log('✅ Staging configuration applied and validated');
    
    // NEW: Validate staging environment
    const config = ConfigManager.getConfig();
    Logger.log(`Environment: ${config.environment}`);
    Logger.log(`Rate limit delay: ${config.apiRateLimitDelay}ms`);
    
    // NEW: Optional staging-specific tests
    if (testConfiguration()) {
      Logger.log('✅ Staging configuration test passed');
    }
  } catch (error) {
    Logger.log('❌ Staging setup failed: ' + error.toString());
  }
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

## Security-Enhanced Templates (v2.0)

### Enterprise Production with Maximum Security
```javascript
// NEW: Enterprise-grade production configuration with comprehensive security
function setupEnterpriseProductionConfig() {
  const config = {
    'QUANTIVE_API_TOKEN': 'your-prod-token-here',           // REPLACE with production token
    'QUANTIVE_ACCOUNT_ID': 'your-prod-account-here',        // REPLACE with production account
    'SESSION_ID': 'prod-session-id-here',                   // REPLACE with production session
    'ENVIRONMENT': 'production',                            // NEW: Environment setting
    'GOOGLE_DOC_ID': 'secure-report-doc-id',                // REPLACE with secure doc ID
    'GOOGLE_SHEET_ID': 'secure-data-sheet-id',              // REPLACE with secure sheet ID
    'LOOKBACK_DAYS': '7',
    
    // NEW: Enhanced security settings
    'PRODUCTION_API_RATE_LIMIT_DELAY': '2000',             // Extra conservative rate limiting
    'PRODUCTION_LOG_LEVEL': 'ERROR',                       // Minimal logging for security
    'PRODUCTION_MAX_RETRIES': '5',                         // More retries for reliability
    'PRODUCTION_RETRY_DELAY': '5000'                       // Longer delays between retries
  };
  
  // NEW: Comprehensive security validation pipeline
  try {
    Logger.log('🔒 Initiating enterprise security setup...');
    
    // Step 1: Validate configuration structure
    if (!config.QUANTIVE_API_TOKEN || config.QUANTIVE_API_TOKEN.includes('your-')) {
      throw new Error('Security Error: API token contains placeholder values');
    }
    
    if (!config.QUANTIVE_ACCOUNT_ID || config.QUANTIVE_ACCOUNT_ID.includes('your-')) {
      throw new Error('Security Error: Account ID contains placeholder values');
    }
    
    if (!config.SESSION_ID || config.SESSION_ID.includes('your-')) {
      throw new Error('Security Error: Session ID contains placeholder values');
    }
    
    Logger.log('✅ Pre-validation security checks passed');
    
    // Step 2: Import with enhanced validation
    importConfiguration(config);
    Logger.log('✅ Configuration imported with validation');
    
    // Step 3: Comprehensive configuration testing
    if (!testConfiguration()) {
      throw new Error('Configuration validation failed - check credentials');
    }
    Logger.log('✅ Configuration validation passed');
    
    // Step 4: API connectivity verification
    if (!testApiConnection()) {
      throw new Error('API connection test failed - check network and credentials');
    }
    Logger.log('✅ API connectivity verified');
    
    // Step 5: Test report generation (dry run)
    Logger.log('🧪 Running test report generation...');
    const testResult = generateQuantiveReport();
    if (testResult && (testResult.docUrl || testResult.sheetUrl)) {
      Logger.log('✅ Test report generation successful');
    } else {
      Logger.log('⚠️ Test report generation completed with warnings');
    }
    
    // Step 6: Verify environment settings
    const finalConfig = ConfigManager.getConfig();
    Logger.log(`Environment: ${finalConfig.environment}`);
    Logger.log(`Security Level: Enterprise`);
    Logger.log(`Rate Limit: ${finalConfig.apiRateLimitDelay}ms`);
    Logger.log(`Log Level: ${finalConfig.logLevel}`);
    
    Logger.log('🔒🎉 Enterprise production configuration setup completed successfully!');
    Logger.log('📊 System ready for automated report generation');
    
  } catch (error) {
    Logger.log('🚨 Enterprise setup failed: ' + error.toString());
    Logger.log('🔧 Please review configuration and try again');
    throw error;  // Re-throw for enterprise safety
  }
}
```

### Secure Development Environment
```javascript
// NEW: Development environment with security best practices
function setupSecureDevelopmentConfig() {
  const config = {
    'QUANTIVE_API_TOKEN': 'dev-token-here',                 // REPLACE with dev token
    'QUANTIVE_ACCOUNT_ID': 'dev-account-here',              // REPLACE with dev account
    'SESSION_ID': 'dev-session-here',                       // REPLACE with dev session
    'ENVIRONMENT': 'development',                           // Development environment
    'GOOGLE_DOC_ID': 'dev-test-doc-id',                     // REPLACE with test doc ID
    'GOOGLE_SHEET_ID': 'dev-test-sheet-id',                 // REPLACE with test sheet ID
    'LOOKBACK_DAYS': '3',
    
    // Development-specific security settings
    'DEVELOPMENT_API_RATE_LIMIT_DELAY': '1000',            // Moderate rate limiting
    'DEVELOPMENT_LOG_LEVEL': 'DEBUG',                      // Full logging for debugging
    'DEVELOPMENT_MAX_RETRIES': '2'                         // Fewer retries for faster feedback
  };
  
  try {
    Logger.log('🔒 Setting up secure development environment...');
    
    // Basic security validation
    if (config.QUANTIVE_API_TOKEN.includes('your-') || 
        config.QUANTIVE_ACCOUNT_ID.includes('your-') ||
        config.SESSION_ID.includes('your-')) {
      throw new Error('Security Error: Replace all placeholder values before setup');
    }
    
    importConfiguration(config);
    Logger.log('✅ Secure development configuration applied');
    
    // Validate setup
    if (testConfiguration()) {
      Logger.log('✅ Development configuration validated');
      Logger.log('🚀 Ready for development and testing');
    } else {
      Logger.log('❌ Configuration validation failed');
    }
    
  } catch (error) {
    Logger.log('❌ Secure development setup failed: ' + error.toString());
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

## Configuration Reference (v2.0)

### Required Values
| Property | Description | Validation | Example |
|----------|-------------|------------|---------|
| `QUANTIVE_API_TOKEN` | Your Quantive API authentication token | Length > 10, no placeholders | `qtv_1234567890abcdef...` |
| `QUANTIVE_ACCOUNT_ID` | Your Quantive account identifier | Non-empty, no placeholders | `12345678-1234-1234-1234-123456789012` |
| `SESSION_ID` | Target session UUID to analyze | Valid UUID format | `87654321-4321-4321-4321-210987654321` |

### Core Optional Values  
| Property | Description | Default | Example |
|----------|-------------|---------|---------|
| `ENVIRONMENT` | **NEW**: Environment setting | `production` | `development`, `staging`, `production` |
| `GOOGLE_DOC_ID` | Google Doc ID for formatted reports | None | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GOOGLE_SHEET_ID` | Google Sheet ID for data tracking | None | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `LOOKBACK_DAYS` | Days to look back for recent activity | `7` | `14` |

### Environment-Specific Settings (NEW in v2.0)
| Property Pattern | Description | Environment | Default |
|------------------|-------------|-------------|---------|
| `{ENV}_API_RATE_LIMIT_DELAY` | API call delay in milliseconds | Any | `1000` |
| `{ENV}_LOG_LEVEL` | Logging verbosity level | Any | `INFO` |
| `{ENV}_MAX_RETRIES` | Maximum retry attempts | Any | `3` |
| `{ENV}_RETRY_DELAY` | Delay between retries (ms) | Any | `2000` |

**Examples:**
- `DEVELOPMENT_API_RATE_LIMIT_DELAY=500`
- `PRODUCTION_LOG_LEVEL=WARN`
- `STAGING_MAX_RETRIES=3`

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

## Security Best Practices (NEW in v2.0)

### ✅ DO
- **Use Google Apps Script Properties** for all sensitive configuration
- **Replace ALL placeholder values** with actual credentials before setup
- **Use environment-specific configurations** for development vs production
- **Run validation functions** (`testConfiguration()`, `testApiConnection()`) after setup
- **Use the `importConfiguration()` function** for automated validation
- **Export configurations without sensitive data** when sharing examples
- **Review the `config.example.js` file** for comprehensive setup guidance

### ❌ DON'T  
- **Never hardcode API tokens** in script files
- **Never commit real credentials** to version control
- **Never use placeholder values** like `'your-api-token-here'` in production
- **Never share configurations** that include actual API tokens
- **Never skip validation steps** when setting up production environments

### 🔒 Enhanced Security Features (v2.0)
- **Automatic placeholder detection** and prevention
- **API token format validation** with length and character checks  
- **UUID validation** for session IDs
- **Environment-specific security settings** 
- **Comprehensive error handling** with security-focused messages
- **Configuration import/export** with sensitive data protection

---

## Migration from v1.0 to v2.0

If you're upgrading from a previous version:

1. **Review your existing configuration** using `exportConfiguration()`
2. **Add the `ENVIRONMENT` property** to specify your deployment environment
3. **Consider adding environment-specific settings** for rate limiting and logging
4. **Test your configuration** using the enhanced validation functions
5. **Update any automation scripts** to use the new `importConfiguration()` function

---

*Choose the template that best matches your use case and customize the values according to your specific requirements. Always prioritize security by using actual credentials only in Google Apps Script properties, never in template files.*