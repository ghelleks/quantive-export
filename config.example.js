/**
 * Quantive Export Configuration Template
 * 
 * This file contains example configuration values for the Quantive Export system.
 * Copy this file to create your own configuration and replace the placeholder values
 * with your actual API credentials and settings.
 * 
 * SECURITY NOTE: Never commit actual API tokens or secrets to version control.
 * Keep your real configuration separate and secure.
 */

// =============================================================================
// CORE API CREDENTIALS
// =============================================================================

const CONFIG_TEMPLATE = {
  // Quantive API Configuration
  QUANTIVE_API_TOKEN: 'your-quantive-api-token-here',
  QUANTIVE_ACCOUNT_ID: 'your-account-id-here',
  
  // Session Configuration
  SESSION_ID: 'your-session-uuid-here',
  
  // Google Services Configuration (Optional)
  GOOGLE_DOC_ID: 'your-google-doc-id-here',
  GOOGLE_SHEET_ID: 'your-google-sheet-id-here',
  
  // Environment Settings
  ENVIRONMENT: 'development', // development, staging, production
  
  // Rate Limiting
  API_RATE_LIMIT_DELAY: 1000, // milliseconds between API calls
  
  // Retry Configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // milliseconds
  
  // Logging Level
  LOG_LEVEL: 'INFO' // DEBUG, INFO, WARN, ERROR
};

// =============================================================================
// ENVIRONMENT-SPECIFIC CONFIGURATIONS
// =============================================================================

const ENVIRONMENT_CONFIGS = {
  development: {
    ...CONFIG_TEMPLATE,
    API_RATE_LIMIT_DELAY: 500,
    LOG_LEVEL: 'DEBUG'
  },
  
  staging: {
    ...CONFIG_TEMPLATE,
    API_RATE_LIMIT_DELAY: 1000,
    LOG_LEVEL: 'INFO'
  },
  
  production: {
    ...CONFIG_TEMPLATE,
    API_RATE_LIMIT_DELAY: 1500,
    LOG_LEVEL: 'WARN'
  }
};

// =============================================================================
// CONFIGURATION SETUP INSTRUCTIONS
// =============================================================================

/*
TO SET UP YOUR CONFIGURATION:

1. Open Google Apps Script Editor
2. Go to Project Settings (gear icon)
3. Scroll to "Script Properties"
4. Add the following properties with your actual values:

   Property Name: QUANTIVE_API_TOKEN
   Property Value: [Your actual Quantive API token]
   
   Property Name: QUANTIVE_ACCOUNT_ID
   Property Value: [Your actual account ID]
   
   Property Name: SESSION_ID
   Property Value: [Your target session UUID]
   
   Property Name: GOOGLE_DOC_ID (optional)
   Property Value: [Your Google Doc ID if exporting to Docs]
   
   Property Name: GOOGLE_SHEET_ID (optional)
   Property Value: [Your Google Sheet ID if exporting to Sheets]
   
   Property Name: ENVIRONMENT
   Property Value: development|staging|production

5. Save the properties
6. Test your configuration using the testConfiguration() function

SECURITY BEST PRACTICES:
- Never hardcode API tokens in your scripts
- Use Google Apps Script's Script Properties for secure storage
- Regularly rotate your API tokens
- Use different credentials for different environments
- Monitor API usage and access logs

For detailed setup instructions, see the USER_GUIDE.md file.
*/