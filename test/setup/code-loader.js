/**
 * Code Loader for Google Apps Script
 * 
 * Loads and evaluates Code.gs file with proper Google Apps Script mocks
 * Makes classes and functions available in test environment
 */

const fs = require('fs');
const path = require('path');

/**
 * Load and evaluate the Code.gs file with Google Apps Script mocks
 */
function loadGoogleAppsScriptCode() {
  // Check if already loaded by looking for a flag in global scope
  if (global.__CODE_GS_LOADED__) {
    console.log('📝 Code.gs already loaded, skipping...');
    return {};
  }
  
  // Set the flag to prevent double loading
  global.__CODE_GS_LOADED__ = true;
  
  // Path to the Code.gs file
  const codeGsPath = path.join(__dirname, '../../Code.gs');
  
  if (!fs.existsSync(codeGsPath)) {
    throw new Error(`Code.gs file not found at ${codeGsPath}`);
  }
  
  // Read the Code.gs content
  const codeGsContent = fs.readFileSync(codeGsPath, 'utf8');
  
  try {
    // Execute the code directly in the global context using Function constructor
    // This ensures classes are defined in the global scope
    
    // Wrap the code to handle potential redeclaration of CONFIG and export classes
    const wrappedCode = `
      try {
        ${codeGsContent}
        
        // Explicitly make classes available in global scope
        if (typeof QuantiveSession !== 'undefined') global.QuantiveSession = QuantiveSession;
        if (typeof QuantiveObjective !== 'undefined') global.QuantiveObjective = QuantiveObjective;
        if (typeof QuantiveKeyResult !== 'undefined') global.QuantiveKeyResult = QuantiveKeyResult;
        if (typeof ReportSummary !== 'undefined') global.ReportSummary = ReportSummary;
        if (typeof ConfigManager !== 'undefined') global.ConfigManager = ConfigManager;
        if (typeof QuantiveApiClient !== 'undefined') global.QuantiveApiClient = QuantiveApiClient;
        if (typeof DataProcessor !== 'undefined') global.DataProcessor = DataProcessor;
        if (typeof DataTransformUtils !== 'undefined') global.DataTransformUtils = DataTransformUtils;
        if (typeof GoogleDocsReportGenerator !== 'undefined') global.GoogleDocsReportGenerator = GoogleDocsReportGenerator;
        if (typeof GoogleSheetsReportGenerator !== 'undefined') global.GoogleSheetsReportGenerator = GoogleSheetsReportGenerator;
        if (typeof TriggerManager !== 'undefined') global.TriggerManager = TriggerManager;
        if (typeof ExecutionLogger !== 'undefined') global.ExecutionLogger = ExecutionLogger;
        if (typeof ErrorHandler !== 'undefined') global.ErrorHandler = ErrorHandler;
        if (typeof ResilientExecutor !== 'undefined') global.ResilientExecutor = ResilientExecutor;
        if (typeof TestSuite !== 'undefined') global.TestSuite = TestSuite;
        if (typeof IntegrationTestSuite !== 'undefined') global.IntegrationTestSuite = IntegrationTestSuite;
        if (typeof PerformanceTestSuite !== 'undefined') global.PerformanceTestSuite = PerformanceTestSuite;
        
        console.log('🔍 Code.gs executed successfully with explicit global exports');
      } catch (e) {
        if (e.message.includes('has already been declared')) {
          console.log('⚠️  CONFIG already declared, ignoring redeclaration error');
        } else {
          console.error('🔍 Error during Code.gs execution:', e.message);
          throw e;
        }
      }
    `;
    
    // Execute using Function constructor which runs in global scope
    const executeCode = new Function(wrappedCode);
    executeCode();
    
    // List all the classes we expect to find
    const expectedClasses = [
      'QuantiveSession',
      'QuantiveObjective', 
      'QuantiveKeyResult',
      'ReportSummary',
      'ConfigManager',
      'QuantiveApiClient',
      'DataProcessor',
      'DataTransformUtils',
      'GoogleDocsReportGenerator',
      'GoogleSheetsReportGenerator',
      'TriggerManager',
      'ExecutionLogger',
      'ErrorHandler',
      'ResilientExecutor',
      'TestSuite',
      'IntegrationTestSuite',
      'PerformanceTestSuite'
    ];
    
    const exportedClasses = {};
    const missingClasses = [];
    
    expectedClasses.forEach(className => {
      try {
        // Check if the class exists in the execution context
        const classRef = eval(className);
        if (typeof classRef === 'function') {
          // Make sure it's available in global scope
          global[className] = classRef;
          exportedClasses[className] = classRef;
          console.log(`✅ Loaded ${className}`);
        } else {
          console.log(`🔍 ${className} found but not a function: ${typeof classRef}`);
          missingClasses.push(className);
        }
      } catch (e) {
        // If eval fails, check global scope
        if (typeof global[className] === 'function') {
          exportedClasses[className] = global[className];
          console.log(`✅ Loaded ${className} from global`);
        } else {
          console.log(`🔍 ${className} not found: ${e.message}`);
          missingClasses.push(className);
        }
      }
    });
    
    if (missingClasses.length > 0) {
      console.warn(`⚠️  Missing classes: ${missingClasses.join(', ')}`);
    }
    
    console.log(`✅ Code.gs loaded successfully - ${Object.keys(exportedClasses).length} classes available`);
    
    return exportedClasses;
    
  } catch (error) {
    console.error('❌ Error loading Code.gs:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

module.exports = {
  loadGoogleAppsScriptCode
};