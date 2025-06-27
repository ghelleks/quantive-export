#!/usr/bin/env node

/**
 * Pre-test credential checker
 * 
 * Runs before tests to validate credential setup and provide helpful guidance
 * Now checks config.gs instead of .env.test for unified credential management
 */

const { getCredentialManager } = require('./credentials');
const path = require('path');
const fs = require('fs');

function checkCredentialSetup() {
  console.log('🔍 Checking test credential setup...\n');

  const credManager = getCredentialManager();
  
  // Check if config.gs file exists
  const configPath = path.join(__dirname, '../../config.gs');
  if (!fs.existsSync(configPath)) {
    console.log('❌ config.gs file not found');
    console.log('   📝 Create config.gs from config.example.gs template');
    console.log('   📝 Then edit config.gs with real credentials\n');
    
    console.log('ℹ️  Unit tests will run with mocked data');
    console.log('ℹ️  Integration tests will be skipped\n');
    return;
  }

  console.log('✅ config.gs file found');

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
    console.log('   1. Edit config.gs with real test credentials');
    console.log('   2. Replace placeholder values with actual credentials');
    console.log('   3. Ensure you have test sessions in your Quantive account');
  }

  console.log('\n🚀 Test setup check complete\n');
}

// Run the check
if (require.main === module) {
  checkCredentialSetup();
}

module.exports = { checkCredentialSetup };