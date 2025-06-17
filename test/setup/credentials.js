const path = require('path');
const fs = require('fs');

/**
 * Credential Management for Testing
 * 
 * Securely loads and validates test credentials from .env.test file
 * Provides safe defaults and skip mechanisms when credentials unavailable
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
    const envPath = path.join(__dirname, '../../.env.test');
    
    if (!fs.existsSync(envPath)) {
      console.warn('⚠️  .env.test file not found. Integration tests will be skipped.');
      console.warn('   Run: npm run setup:test');
      this.isLoaded = false;
      return;
    }

    try {
      // Load environment variables from .env.test
      require('dotenv').config({ path: envPath });
      
      this.credentials = {
        apiToken: process.env.QUANTIVE_API_TOKEN,
        accountId: process.env.QUANTIVE_ACCOUNT_ID,
        baseUrl: process.env.QUANTIVE_BASE_URL || 'https://api.quantive.com/v1',
        testSessionName: process.env.TEST_SESSION_NAME,
        testSessionUuid: process.env.TEST_SESSION_UUID,
        invalidSessionName: process.env.INVALID_SESSION_NAME,
        skipApiTests: process.env.SKIP_API_TESTS === 'true',
        apiTestTimeout: parseInt(process.env.API_TEST_TIMEOUT) || 10000
      };
      
      this.isLoaded = true;
      console.log('✅ Credentials loaded from .env.test');
      
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
      console.log('🚫 API tests disabled via SKIP_API_TESTS=true');
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
        'Please set up .env.test with valid credentials and set SKIP_API_TESTS=false'
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