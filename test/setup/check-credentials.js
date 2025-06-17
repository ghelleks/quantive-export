#!/usr/bin/env node

/**
 * Pre-test credential checker
 * 
 * Runs before tests to validate credential setup and provide helpful guidance
 */

const { getCredentialManager } = require('./credentials');
const path = require('path');
const fs = require('fs');

function checkCredentialSetup() {
  console.log('🔍 Checking test credential setup...\n');

  const credManager = getCredentialManager();
  
  // Check if .env.test file exists
  const envPath = path.join(__dirname, '../../.env.test');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.test file not found');
    console.log('   📝 Run: npm run setup:test');
    console.log('   📝 Then edit .env.test with real credentials\n');
    
    console.log('ℹ️  Unit tests will run with mocked data');
    console.log('ℹ️  Integration tests will be skipped\n');
    return;
  }

  console.log('✅ .env.test file found');

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
      console.log('   - SKIP_API_TESTS=true in .env.test');
    }
    
    console.log('\n📝 To enable integration tests:');
    console.log('   1. Edit .env.test with real test credentials');
    console.log('   2. Set SKIP_API_TESTS=false');
    console.log('   3. Ensure you have test sessions in your Quantive account');
  }

  console.log('\n🚀 Test setup check complete\n');
}

// Run the check
if (require.main === module) {
  checkCredentialSetup();
}

module.exports = { checkCredentialSetup };