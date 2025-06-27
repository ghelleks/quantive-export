/**
 * Configuration File Template
 * 
 * SETUP INSTRUCTIONS:
 * 1. Copy this file to config.gs in your Google Apps Script project
 * 2. Replace all placeholder values with your actual credentials
 * 3. Never share or commit the config.gs file with real credentials
 * 
 * REQUIRED CREDENTIALS:
 * - Get your API token from Quantive Settings → Integrations → Generate API Token
 * - Find your Account ID in your Quantive URL or account settings
 * - Use either a session name (e.g., "Q4 2024 OKRs") or UUID
 * - Set the correct API endpoint for your region (see examples below)
 */

const CONFIG = {
  // Required Quantive API Credentials
  QUANTIVE_API_TOKEN: 'your-actual-api-token-here',
  QUANTIVE_ACCOUNT_ID: 'your-actual-account-id-here',
  
  // API Endpoint Configuration
  // Choose the correct endpoint for your region:
  // - Europe: 'https://app.quantive.com/results/api/v1'
  // - US: 'https://app.us.quantive.com/results/api/v1'
  // - Asia: 'https://app.as.quantive.com/results/api/v1'
  // - Australia: 'https://app.au.quantive.com/results/api/v1'
  // - Legacy GTMHub: 'https://app.gtmhub.com/api/v1'
  QUANTIVE_BASE_URL: 'https://app.us.quantive.com/results/api/v1',
  
  // Target Session (name or UUID)
  SESSION_ID: 'Q4 2024 OKRs',
  
  // Optional: Output Document IDs (leave empty to auto-create)
  GOOGLE_DOC_ID: '',      // Document ID from Google Docs URL
  GOOGLE_SHEET_ID: '',    // Spreadsheet ID from Google Sheets URL
  
  // Configuration Settings
  ENVIRONMENT: 'production',
  LOOKBACK_DAYS: 7
};