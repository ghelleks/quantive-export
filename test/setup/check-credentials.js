#!/usr/bin/env node

/**
 * Pre-test credential checker
 * 
 * Runs before tests to validate credential setup and provide helpful guidance
 * Checks environment variables for unified credential management
 */

const { getCredentialManager } = require('./credentials');
const path = require('path');
const fs = require('fs');

function checkCredentialSetup() {
  console.log('🔍 Checking test credential setup...\n');

  const credManager = getCredentialManager();
  
  // Check environment-based credentials
  if (!process.env.QUANTIVE_API_TOKEN || !process.env.QUANTIVE_ACCOUNT_ID) {
    console.log('❌ Missing test credentials in environment');
    console.log('   📝 Set QUANTIVE_API_TOKEN and QUANTIVE_ACCOUNT_ID');
    console.log('   📝 Optionally set TEST_SESSION_NAME');
    console.log('\nℹ️  Unit tests will run with mocked data');
    console.log('ℹ️  Integration tests will be skipped\n');
    return;
  }

  console.log('✅ Test credentials found in environment');

  // Check credential validity
  if (credManager.canRunIntegrationTests()) {
    console.log('✅ Valid credentials detected');
    console.log('✅ Integration tests will run against real API');
    
    try {
      credManager.validateTestEnvironment();
      console.log('✅ Test environment safety checks passed');
    } catch (error) {
      console.error('❌ SAFETY ERROR:', error.message);
      process.exit(1);
    }
    
  } else {
    console.log('⚠️  Integration tests will be skipped because:');
    
    const creds = credManager.getCredentials();
    
    if (!creds.apiToken || creds.apiToken.includes('_here')) {
      console.log('   - API token not set or still placeholder');
    }
    
    if (!creds.accountId || creds.accountId.includes('_here')) {
      console.log('   - Account ID not set or still placeholder');
    }
    
    if (creds.skipApiTests) {
      console.log('   - API tests disabled via skipApiTests flag');
    }
    
    console.log('\n📝 To enable integration tests:');
    console.log('   1. Set QUANTIVE_API_TOKEN and QUANTIVE_ACCOUNT_ID env variables');
    console.log('   2. Ensure the account has accessible sessions for testing');
  }

  console.log('\n🚀 Test setup check complete\n');
}

// Run the check
if (require.main === module) {
  checkCredentialSetup();
}

module.exports = { checkCredentialSetup };