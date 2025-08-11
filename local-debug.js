#!/usr/bin/env node

/**
 * Local debugging wrapper for Quantive Export Google Apps Script
 * 
 * This file provides minimal mocks for Google Apps Script services
 * to enable local debugging and development without changing Code.gs
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import node-fetch for HTTP requests
const fetch = require('node-fetch');

// Global mock implementations for Google Apps Script services
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => process.env[key] || null
  })
};

// Synchronous wrapper for fetch to match Google Apps Script behavior
function syncFetch(url, options = {}) {
  const { execSync } = require('child_process');
  
  // Create curl command for synchronous HTTP request
  const headers = options.headers || {};
  const method = options.method || 'GET';
  
  let curlCmd = `curl -s -X ${method}`;
  
  // Add headers
  for (const [key, value] of Object.entries(headers)) {
    curlCmd += ` -H "${key}: ${value}"`;
  }
  
  // Add body if present
  if (options.payload || options.body) {
    curlCmd += ` -d '${options.payload || options.body}'`;
  }
  
  curlCmd += ` "${url}"`;
  
  try {
    const result = execSync(curlCmd, { encoding: 'utf8', timeout: 30000 });
    return {
      status: 200, // Simplified - curl would exit with error code on HTTP errors
      text: result
    };
  } catch (error) {
    return {
      status: 500,
      text: `Error: ${error.message}`
    };
  }
}

global.UrlFetchApp = {
  fetch: (url, options = {}) => {
    const response = syncFetch(url, options);
    return {
      getResponseCode: () => response.status,
      getContentText: () => response.text,
      getHeaders: () => ({})
    };
  },
  
  fetchAll: (requests) => {
    return requests.map(req => {
      const response = syncFetch(req.url, {
        method: req.method || 'GET',
        headers: req.headers || {},
        payload: req.payload || req.body
      });
      
      return {
        getResponseCode: () => response.status,
        getContentText: () => response.text,
        getHeaders: () => ({})
      };
    });
  }
};

global.Logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }
};

global.Utilities = {
  sleep: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

global.DocumentApp = {
  openById: (docId) => {
    console.log(`📄 Mock: Would open Google Doc with ID: ${docId}`);
    return {
      getName: () => 'Mock Document',
      getId: () => docId,
      getUrl: () => `https://docs.google.com/document/d/${docId}/edit`,
      getBody: () => ({
        clear: () => console.log('📄 Mock: Document cleared'),
        appendParagraph: (text) => {
          console.log(`📄 Mock: Paragraph: ${text}`);
          return {
            setHeading: () => {},
            editAsText: () => ({ setBold: () => {} }),
            setForegroundColor: () => {}
          };
        },
        appendListItem: (text) => {
          console.log(`📄 Mock: List item: ${text}`);
          return {
            setGlyphType: () => {},
            setNestingLevel: () => {},
            editAsText: () => ({ setBold: () => {} }),
            setForegroundColor: () => {},
            setItalic: () => {},
            setFontSize: () => {}
          };
        }
      })
    };
  },
  ParagraphHeading: {
    TITLE: 'TITLE',
    HEADING1: 'HEADING1',
    HEADING2: 'HEADING2',
    HEADING3: 'HEADING3'
  },
  GlyphType: {
    BULLET: 'BULLET'
  }
};

global.DriveApp = {
  getFileById: (fileId) => {
    console.log(`💾 Mock: Would access Drive file with ID: ${fileId}`);
    return {
      setContent: (content) => {
        // Write to local file for debugging
        const outputDir = path.join(__dirname, 'debug-output');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir);
        }
        const outputFile = path.join(outputDir, `snapshot-${fileId}.md`);
        fs.writeFileSync(outputFile, content);
        console.log(`💾 Mock: Content written to ${outputFile}`);
      },
      setName: (name) => {
        console.log(`💾 Mock: File renamed to: ${name}`);
      }
    };
  }
};

global.ScriptApp = {
  newTrigger: () => ({
    timeBased: () => ({
      everyWeeks: () => ({
        onWeekDay: () => ({
          atHour: () => ({
            create: () => console.log('⏰ Mock: Trigger created')
          })
        })
      })
    })
  }),
  WeekDay: {
    MONDAY: 'MONDAY'
  }
};

// Load and execute the Google Apps Script code
function loadGASCode() {
  const gasCodePath = path.join(__dirname, 'Code.gs');
  const gasCode = fs.readFileSync(gasCodePath, 'utf8');
  
  // Create a module-like wrapper that makes functions available globally
  const moduleWrapper = `
    ${gasCode}
    
    // Export main functions to global scope
    if (typeof generateQuantiveReport !== 'undefined') global.generateQuantiveReport = generateQuantiveReport;
    if (typeof testApiConnection !== 'undefined') global.testApiConnection = testApiConnection;
    if (typeof listAvailableSessions !== 'undefined') global.listAvailableSessions = listAvailableSessions;
    if (typeof performanceTest !== 'undefined') global.performanceTest = performanceTest;
    if (typeof setup !== 'undefined') global.setup = setup;
  `;
  
  // Use Function constructor instead of eval for better error handling
  try {
    const moduleFunction = new Function(moduleWrapper);
    moduleFunction();
  } catch (error) {
    console.error('❌ Failed to load Google Apps Script code:', error.message);
    throw error;
  }
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);
  
  console.log('🚀 Quantive Export Local Debugger');
  console.log('=====================================');
  
  try {
    // Load the Google Apps Script code
    loadGASCode();
    
    // Check which command to run
    if (args.includes('--test-api')) {
      console.log('🧪 Testing API connection...');
      await global.testApiConnection();
    } else if (args.includes('--list-sessions')) {
      console.log('📋 Listing available sessions...');
      await global.listAvailableSessions();
    } else if (args.includes('--performance-test')) {
      console.log('⚡ Running performance test...');
      await global.performanceTest();
    } else {
      console.log('📊 Generating Quantive report...');
      await global.generateQuantiveReport();
    }
    
    console.log('✅ Execution completed successfully');
    
  } catch (error) {
    console.error('❌ Execution failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };