/**
 * Global Setup for Jest
 * 
 * This runs once before all tests and sets up the global environment
 * including loading Google Apps Script mocks and Code.gs classes
 */

// Import gas-mock-globals to provide Google Apps Script mocks
require('gas-mock-globals');

console.log('🚀 Global test environment initialized');