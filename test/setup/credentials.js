const path = require('path');
const fs = require('fs');

/**
 * Credential Management for Testing
 * 
 * Securely loads and validates test credentials from config.gs file
 * Provides safe defaults and skip mechanisms when credentials unavailable
 * This ensures integration tests use the same credential source as production
 */
class CredentialManager {
  constructor() {
    this.credentials = {};
    this.isLoaded = false;
    this.hasValidCredentials = false;
    
    this.loadCredentials();
    this.validateCredentials();
  }

  loadCredentials() {
    const configPath = path.join(__dirname, '../../config.gs');
    
    if (!fs.existsSync(configPath)) {
      console.warn('⚠️  config.gs file not found. Integration tests will be skipped.');
      console.warn('   Create config.gs from config.example.gs template');
      this.isLoaded = false;
      return;
    }

    try {
      // Load and evaluate config.gs file
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Execute the config file to get CONFIG object
      const configCode = new Function(`${configContent}; return CONFIG;`);
      const config = configCode();
      
      if (!config) {
        throw new Error('CONFIG object not found in config.gs');
      }
      
      this.credentials = {
        apiToken: config.QUANTIVE_API_TOKEN,
        accountId: config.QUANTIVE_ACCOUNT_ID,
        baseUrl: 'https://app.us.quantive.com/results/api/v1', // Use consistent test URL
        testSessionName: config.SESSION_ID, // Use SESSION_ID as test session
        testSessionUuid: null, // Will be resolved dynamically
        invalidSessionName: 'NonexistentTestSession',
        skipApiTests: false, // Always run integration tests when config.gs exists
        apiTestTimeout: 10000
      };
      
      this.isLoaded = true;
      console.log('✅ Credentials loaded from config.gs');
      
    } catch (error) {
      console.error('❌ Error loading credentials:', error.message);
      this.isLoaded = false;
    }
  }

  validateCredentials() {
    if (!this.isLoaded) {
      this.hasValidCredentials = false;
      return;
    }

    const required = ['apiToken', 'accountId'];
    const missing = required.filter(key => !this.credentials[key] || this.credentials[key].includes('_here'));
    
    if (missing.length > 0) {
      console.warn(`⚠️  Missing or placeholder credentials: ${missing.join(', ')}`);
      console.warn('   Integration tests will be skipped.');
      this.hasValidCredentials = false;
      return;
    }

    // Basic format validation
    if (this.credentials.apiToken.length < 10) {
      console.warn('⚠️  API token appears invalid (too short)');
      this.hasValidCredentials = false;
      return;
    }

    if (this.credentials.skipApiTests) {
      console.log('🚫 API tests disabled via skipApiTests flag');
      this.hasValidCredentials = false;
      return;
    }

    this.hasValidCredentials = true;
    console.log('✅ Credentials validated for integration testing');
  }

  getCredentials() {
    return { ...this.credentials };
  }

  requireRealCredentials() {
    if (!this.hasValidCredentials) {
      throw new Error(
        'Real credentials required for this test. ' +
        'Please set up config.gs with valid credentials from config.example.gs template'
      );
    }
    return this.getCredentials();
  }

  canRunIntegrationTests() {
    return this.hasValidCredentials;
  }

  // Create a test-safe API client configuration
  getApiClientConfig() {
    if (!this.hasValidCredentials) {
      throw new Error('No valid credentials available for API client');
    }

    return {
      apiToken: this.credentials.apiToken,
      accountId: this.credentials.accountId,
      baseUrl: this.credentials.baseUrl,
      timeout: this.credentials.apiTestTimeout
    };
  }

  // Get test session data for tests
  getTestSessionData() {
    return {
      validSessionName: this.credentials.testSessionName,
      validSessionUuid: this.credentials.testSessionUuid,
      invalidSessionName: this.credentials.invalidSessionName || 'NonexistentTestSession'
    };
  }

  // Safety check to ensure we're not using production credentials
  validateTestEnvironment() {
    // Add checks to ensure we're using test account
    if (this.credentials.accountId && this.credentials.accountId.includes('prod')) {
      throw new Error('SAFETY: Production account detected! Use test account only.');
    }
    
    if (this.credentials.baseUrl && this.credentials.baseUrl.includes('production')) {
      throw new Error('SAFETY: Production URL detected! Use test environment only.');
    }
  }
}

// Singleton instance
let credentialManager = null;

function getCredentialManager() {
  if (!credentialManager) {
    credentialManager = new CredentialManager();
  }
  return credentialManager;
}

module.exports = {
  CredentialManager,
  getCredentialManager,
  
  // Convenience functions
  requireRealCredentials: () => getCredentialManager().requireRealCredentials(),
  canRunIntegrationTests: () => getCredentialManager().canRunIntegrationTests(),
  getApiClientConfig: () => getCredentialManager().getApiClientConfig(),
  getTestSessionData: () => getCredentialManager().getTestSessionData()
};