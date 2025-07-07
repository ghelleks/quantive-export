/**
 * Quantive Session Report Generator - SIMPLIFIED VERSION
 * 
 * Core functionality only:
 * 1. Fetch session data from Quantive API
 * 2. Calculate basic progress statistics  
 * 3. Generate sparklines showing 14-day progress trends
 * 4. Write formatted report to Google Doc
 * 5. Can be scheduled to run automatically
 * 
 * Setup: 
 * 1. Copy config.example.gs to config.gs
 * 2. Fill in your actual credentials in config.gs
 * 3. Run generateQuantiveReport() to test
 */

// Internal configuration (sparkline settings)
const INTERNAL_CONFIG = {
  SPARKLINE_DAYS: 14,  // Days of history for sparklines
  SPARKLINE_LENGTH: 10 // Number of points in sparkline
};

// User name cache to avoid duplicate API calls
const USER_NAME_CACHE = {};

// Batch processing utilities for performance optimization
const BatchProcessor = {
  // Build standardized headers for API requests
  buildHeaders: (config) => ({
    'Authorization': `Bearer ${config.apiToken}`,
    'Gtmhub-AccountId': config.accountId,
    'Content-Type': 'application/json'
  }),
  
  // Process batch responses with error handling
  processBatchResponses: (responses, ids, processingFunction) => {
    return responses.map((response, index) => {
      try {
        if (response.getResponseCode() === 200) {
          const responseText = response.getContentText();
          if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
            Logger.log(`⚠️ Received HTML error page for batch item ${ids[index]}`);
            return null;
          }
          const data = JSON.parse(responseText);
          return processingFunction(data, ids[index]);
        } else {
          Logger.log(`⚠️ Batch request failed for ${ids[index]}: ${response.getResponseCode()}`);
          return null;
        }
      } catch (error) {
        Logger.log(`⚠️ Batch processing error for ${ids[index]}: ${error.message}`);
        return null;
      }
    }).filter(item => item !== null);
  },
  
  // Chunk large batches to respect API limits
  chunkRequests: (requests, chunkSize = 10) => {
    const chunks = [];
    for (let i = 0; i < requests.length; i += chunkSize) {
      chunks.push(requests.slice(i, i + chunkSize));
    }
    return chunks;
  },
  
  // Execute batch requests with chunking support
  executeBatchRequests: (requests, config, chunkSize = 10) => {
    if (!requests || requests.length === 0) return [];
    
    const chunks = BatchProcessor.chunkRequests(requests, chunkSize);
    const allResponses = [];
    
    Logger.log(`🚀 Executing ${requests.length} requests in ${chunks.length} chunks`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      Logger.log(`📦 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} requests)`);
      
      try {
        // Convert request objects to the format expected by UrlFetchApp.fetchAll()
        const fetchAllRequests = chunk.map(req => ({
          url: req.url,
          ...req.options
        }));
        
        // Debug: Log the first request to verify format
        if (i === 0 && fetchAllRequests.length > 0) {
          Logger.log(`🔍 Debug: First batch request format:`);
          Logger.log(`   URL: ${fetchAllRequests[0].url}`);
          Logger.log(`   Headers: ${JSON.stringify(fetchAllRequests[0].headers)}`);
        }
        
        const chunkResponses = UrlFetchApp.fetchAll(fetchAllRequests);
        
        // Debug: Check for response contamination in tasks API
        if (i === 0 && chunkResponses.length > 0 && fetchAllRequests[0].url.includes('/tasks?')) {
          const firstResponse = chunkResponses[0];
          if (firstResponse.getResponseCode() === 200) {
            try {
              const responseData = JSON.parse(firstResponse.getContentText());
              const taskCount = Array.isArray(responseData) ? responseData.length : 
                               responseData.items ? responseData.items.length :
                               responseData.tasks ? responseData.tasks.length :
                               responseData.data ? responseData.data.length : 0;
              Logger.log(`🔍 Debug: First chunk first response has ${taskCount} tasks`);
            } catch (e) {
              Logger.log(`🔍 Debug: Could not parse first response: ${e.message}`);
            }
          }
        }
        
        allResponses.push(...chunkResponses);
        
        // Small delay between chunks to respect rate limits
        if (i < chunks.length - 1) {
          Utilities.sleep(200);
        }
      } catch (error) {
        Logger.log(`❌ Chunk ${i + 1} failed: ${error.message}`);
        // Add null responses for failed chunk
        allResponses.push(...Array(chunk.length).fill(null));
      }
    }
    
    return allResponses;
  }
};

/**
 * Main function - generates a Quantive report
 * Run this manually or set up a trigger to run it automatically
 * Now includes performance timing and validation
 */
function generateQuantiveReport() {
  const startTime = Date.now();
  let performanceLog = {
    totalTime: 0,
    configTime: 0,
    dataFetchTime: 0,
    statsTime: 0,
    writeTime: 0,
    batchProcessingUsed: false,
    apiCallCount: 0,
    recordsProcessed: 0
  };
  
  try {
    Logger.log('🎯 Starting Quantive report generation with performance monitoring...');
    
    // Get configuration
    const configStart = Date.now();
    const config = getConfig();
    performanceLog.configTime = Date.now() - configStart;
    
    // Fetch data from Quantive
    const dataStart = Date.now();
    const sessionData = fetchSessionData(config);
    performanceLog.dataFetchTime = Date.now() - dataStart;
    
    // Log performance metrics
    performanceLog.recordsProcessed = {
      sessions: sessionData.sessionCount || 0,
      objectives: sessionData.objectives?.length || 0,
      keyResults: sessionData.keyResults?.length || 0
    };
    
    // Calculate statistics
    const statsStart = Date.now();
    const stats = calculateStats(sessionData, config);
    performanceLog.statsTime = Date.now() - statsStart;
    
    // Write report to Google Doc
    const writeStart = Date.now();
    writeReport(config.googleDocId, sessionData, stats, config);
    performanceLog.writeTime = Date.now() - writeStart;
    
    // Calculate total time
    const endTime = Date.now();
    performanceLog.totalTime = (endTime - startTime) / 1000;
    
    // Log performance summary
    Logger.log('🚀 Performance Summary:');
    Logger.log(`   Total Time: ${performanceLog.totalTime.toFixed(2)} seconds`);
    Logger.log(`   Config Time: ${(performanceLog.configTime / 1000).toFixed(2)}s`);
    Logger.log(`   Data Fetch Time: ${(performanceLog.dataFetchTime / 1000).toFixed(2)}s`);
    Logger.log(`   Stats Time: ${(performanceLog.statsTime / 1000).toFixed(2)}s`);
    Logger.log(`   Write Time: ${(performanceLog.writeTime / 1000).toFixed(2)}s`);
    Logger.log(`   Records Processed: ${JSON.stringify(performanceLog.recordsProcessed)}`);
    
    // Performance validation
    if (performanceLog.totalTime < 30) {
      Logger.log('✅ Excellent performance! Report generated in under 30 seconds.');
    } else if (performanceLog.totalTime < 60) {
      Logger.log('🟡 Good performance. Report generated in under 1 minute.');
    } else {
      Logger.log('🔴 Performance warning: Report took over 1 minute to generate.');
    }
    
    Logger.log('✅ Report generated successfully!');
    Logger.log(`📄 Report written to: ${config.googleDocId}`);
    
    return {
      success: true,
      performanceLog: performanceLog,
      docId: config.googleDocId
    };
    
  } catch (error) {
    const endTime = Date.now();
    performanceLog.totalTime = (endTime - startTime) / 1000;
    
    Logger.log(`❌ Error after ${performanceLog.totalTime.toFixed(2)} seconds: ${error.message}`);
    Logger.log('🔍 Performance log at time of error:');
    Logger.log(`   Config Time: ${(performanceLog.configTime / 1000).toFixed(2)}s`);
    Logger.log(`   Data Fetch Time: ${(performanceLog.dataFetchTime / 1000).toFixed(2)}s`);
    Logger.log(`   Stats Time: ${(performanceLog.statsTime / 1000).toFixed(2)}s`);
    Logger.log(`   Write Time: ${(performanceLog.writeTime / 1000).toFixed(2)}s`);
    
    throw error;
  }
}

/**
 * Get configuration from config.gs
 */
function getConfig() {
  // Check if CONFIG is available from config.gs
  if (typeof CONFIG === 'undefined') {
    throw new Error('CONFIG not found. Please create config.gs from config.example.gs and fill in your credentials.');
  }
  
  // Validate required properties
  if (!CONFIG.QUANTIVE_API_TOKEN || CONFIG.QUANTIVE_API_TOKEN === 'your-actual-api-token-here') {
    throw new Error('QUANTIVE_API_TOKEN not set in config.gs');
  }
  if (!CONFIG.QUANTIVE_ACCOUNT_ID || CONFIG.QUANTIVE_ACCOUNT_ID === 'your-actual-account-id-here') {
    throw new Error('QUANTIVE_ACCOUNT_ID not set in config.gs');
  }
  if (!CONFIG.SESSIONS || CONFIG.SESSIONS.length === 0) {
    throw new Error('SESSIONS not set in config.gs - must be an array of session names or UUIDs');
  }
  if (!CONFIG.GOOGLE_DOC_ID) {
    throw new Error('GOOGLE_DOC_ID not set in config.gs');
  }
  
  // Normalize sessions to array format
  let sessions = CONFIG.SESSIONS;
  if (typeof sessions === 'string') {
    sessions = [sessions]; // Convert single session to array
  }
  
  return {
    apiToken: CONFIG.QUANTIVE_API_TOKEN,
    accountId: CONFIG.QUANTIVE_ACCOUNT_ID,
    sessions: sessions, // Array of session names/UUIDs
    googleDocId: CONFIG.GOOGLE_DOC_ID,
    baseUrl: CONFIG.QUANTIVE_BASE_URL || 'https://app.us.quantive.com/results/api/v1',
    lookbackDays: CONFIG.LOOKBACK_DAYS || 7
  };
}

/**
 * Fetch user display name by user ID
 * Now supports batch-fetched user map for better performance
 */
function fetchUserDisplayName(userId, config, userMap = null) {
  if (!userId) return 'Unassigned';
  
  // Check existing cache first
  if (USER_NAME_CACHE[userId]) {
    Logger.log(`👤 Using cached name for user ${userId}: ${USER_NAME_CACHE[userId]}`);
    return USER_NAME_CACHE[userId];
  }
  
  // Use batch-fetched user map if available
  if (userMap && userMap[userId]) {
    USER_NAME_CACHE[userId] = userMap[userId];
    Logger.log(`👤 Using batch-fetched name for user ${userId}: ${userMap[userId]}`);
    return userMap[userId];
  }
  
  const headers = {
    'Authorization': `Bearer ${config.apiToken}`,
    'Gtmhub-AccountId': config.accountId,
    'Content-Type': 'application/json'
  };
  
  try {
    const userUrl = `${config.baseUrl}/users/${userId}`;
    Logger.log(`👤 Fetching user details from: ${userUrl}`);
    
    const userResponse = UrlFetchApp.fetch(userUrl, { 
      headers: headers,
      muteHttpExceptions: true 
    });
    
    const responseCode = userResponse.getResponseCode();
    const responseText = userResponse.getContentText();
    
    Logger.log(`👤 User API response for ${userId}: ${responseCode}`);
    
    if (responseCode === 200) {
      const userData = JSON.parse(responseText);
      Logger.log(`👤 User data structure: ${JSON.stringify(Object.keys(userData))}`);
      
      const displayName = userData.displayName || userData.name || userData.email || userData.firstName + ' ' + userData.lastName || `User ${userId}`;
      Logger.log(`👤 Resolved user ${userId} to: ${displayName}`);
      USER_NAME_CACHE[userId] = displayName;
      return displayName;
    } else {
      Logger.log(`⚠️ Could not fetch user ${userId}: ${responseCode} - ${responseText.substring(0, 200)}`);
      
      // Try alternative endpoint if the main one fails
      const altUserUrl = `${config.baseUrl}/account/users/${userId}`;
      Logger.log(`👤 Trying alternative user endpoint: ${altUserUrl}`);
      
      const altUserResponse = UrlFetchApp.fetch(altUserUrl, { 
        headers: headers,
        muteHttpExceptions: true 
      });
      
      if (altUserResponse.getResponseCode() === 200) {
        const userData = JSON.parse(altUserResponse.getContentText());
        const displayName = userData.displayName || userData.name || userData.email || userData.firstName + ' ' + userData.lastName || `User ${userId}`;
        Logger.log(`👤 Resolved user ${userId} via alternative endpoint to: ${displayName}`);
        USER_NAME_CACHE[userId] = displayName;
        return displayName;
      } else {
        Logger.log(`⚠️ Alternative user endpoint also failed for ${userId}: ${altUserResponse.getResponseCode()}`);
        const fallbackName = `User ${userId}`;
        USER_NAME_CACHE[userId] = fallbackName;
        return fallbackName;
      }
    }
  } catch (error) {
    Logger.log(`⚠️ Error fetching user ${userId}: ${error.message}`);
    const fallbackName = `User ${userId}`;
    USER_NAME_CACHE[userId] = fallbackName;
    return fallbackName;
  }
}

/**
 * Batch fetch user display names for multiple user IDs
 * Replaces individual fetchUserDisplayName calls for better performance
 */
function batchFetchUsers(userIds, config) {
  if (!userIds || userIds.length === 0) return {};
  
  const uniqueUserIds = [...new Set(userIds.filter(id => id))];
  Logger.log(`👥 Batch fetching ${uniqueUserIds.length} unique users`);
  
  const requests = uniqueUserIds.map(userId => ({
    url: `${config.baseUrl}/users/${userId}`,
    options: { 
      headers: BatchProcessor.buildHeaders(config),
      muteHttpExceptions: true 
    }
  }));
  
  const responses = BatchProcessor.executeBatchRequests(requests, config);
  const userMap = {};
  
  responses.forEach((response, index) => {
    const userId = uniqueUserIds[index];
    if (response && response.getResponseCode() === 200) {
      try {
        const responseText = response.getContentText();
        if (!responseText.trim().startsWith('<!DOCTYPE') && !responseText.trim().startsWith('<html')) {
          const userData = JSON.parse(responseText);
          const displayName = userData.displayName || userData.name || userData.email || 
                            (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : null) || 
                            `User ${userId}`;
          userMap[userId] = displayName;
          USER_NAME_CACHE[userId] = displayName;
          Logger.log(`👤 Resolved user ${userId} to: ${displayName}`);
        } else {
          Logger.log(`⚠️ Received HTML error page for user ${userId}`);
          userMap[userId] = `User ${userId}`;
        }
      } catch (error) {
        Logger.log(`⚠️ Error parsing user data for ${userId}: ${error.message}`);
        userMap[userId] = `User ${userId}`;
      }
    } else {
      // Try alternative endpoint for failed users
      const altUserUrl = `${config.baseUrl}/account/users/${userId}`;
      try {
        const altResponse = UrlFetchApp.fetch(altUserUrl, { 
          headers: BatchProcessor.buildHeaders(config),
          muteHttpExceptions: true 
        });
        if (altResponse.getResponseCode() === 200) {
          const userData = JSON.parse(altResponse.getContentText());
          const displayName = userData.displayName || userData.name || userData.email || 
                            (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : null) || 
                            `User ${userId}`;
          userMap[userId] = displayName;
          USER_NAME_CACHE[userId] = displayName;
          Logger.log(`👤 Resolved user ${userId} via alternative endpoint to: ${displayName}`);
        } else {
          userMap[userId] = `User ${userId}`;
        }
      } catch (altError) {
        Logger.log(`⚠️ Alternative endpoint also failed for user ${userId}: ${altError.message}`);
        userMap[userId] = `User ${userId}`;
      }
    }
  });
  
  Logger.log(`✅ Batch user fetching complete: ${Object.keys(userMap).length} users resolved`);
  return userMap;
}

/**
 * Fetch progress history for a given metric (key result)
 */
function fetchProgressHistory(metricId, config) {
  if (!metricId) return [];
  
  const headers = {
    'Authorization': `Bearer ${config.apiToken}`,
    'Gtmhub-AccountId': config.accountId,
    'Content-Type': 'application/json'
  };
  
  try {
    // Calculate date range for sparkline history
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - INTERNAL_CONFIG.SPARKLINE_DAYS);
    
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];
    
    const historyUrl = `${config.baseUrl}/metrics/${metricId}/values?from=${startDateString}&to=${endDateString}`;
    Logger.log(`📈 Fetching progress history for metric ${metricId} from: ${historyUrl}`);
    
    const historyResponse = UrlFetchApp.fetch(historyUrl, { 
      headers: headers,
      muteHttpExceptions: true 
    });
    
    if (historyResponse.getResponseCode() === 200) {
      const historyResponseText = historyResponse.getContentText();
      const historyData = JSON.parse(historyResponseText);
      
      // Handle different response formats
      let progressEntries;
      if (Array.isArray(historyData)) {
        progressEntries = historyData;
      } else if (historyData.items && Array.isArray(historyData.items)) {
        progressEntries = historyData.items;
      } else if (historyData.values && Array.isArray(historyData.values)) {
        progressEntries = historyData.values;
      } else if (historyData.data && Array.isArray(historyData.data)) {
        progressEntries = historyData.data;
      } else {
        Logger.log(`⚠️ Unexpected progress history response format for metric ${metricId}: ${typeof historyData}`);
        return [];
      }
      
      // Transform entries to standardized format
      const standardizedHistory = progressEntries.map(entry => ({
        date: entry.date || entry.createdDate || entry.timestamp,
        progress: entry.progress || entry.value || entry.percentage || 0
      })).filter(entry => entry.date); // Only include entries with valid dates
      
      Logger.log(`✅ Found ${standardizedHistory.length} progress history entries for metric ${metricId}`);
      return standardizedHistory;
      
    } else if (historyResponse.getResponseCode() === 404) {
      // No history found - this is normal for new metrics
      Logger.log(`📈 No progress history found for metric ${metricId} (404)`);
      return [];
    } else {
      Logger.log(`⚠️ Could not fetch progress history for metric ${metricId}: ${historyResponse.getResponseCode()}`);
      return [];
    }
  } catch (error) {
    Logger.log(`⚠️ Error fetching progress history for metric ${metricId}: ${error.message}`);
    return [];
  }
}

/**
 * Process progress history data into standardized format
 */
function processProgressHistory(historyData) {
  if (!historyData) return [];
  
  let progressEntries;
  if (Array.isArray(historyData)) {
    progressEntries = historyData;
  } else if (historyData.items && Array.isArray(historyData.items)) {
    progressEntries = historyData.items;
  } else if (historyData.values && Array.isArray(historyData.values)) {
    progressEntries = historyData.values;
  } else if (historyData.data && Array.isArray(historyData.data)) {
    progressEntries = historyData.data;
  } else {
    Logger.log(`⚠️ Unexpected progress history format: ${typeof historyData}`);
    return [];
  }
  
  return progressEntries.map(entry => ({
    date: entry.date || entry.createdDate || entry.timestamp,
    progress: entry.progress || entry.value || entry.percentage || 0
  })).filter(entry => entry.date);
}

/**
 * Batch fetch progress history for multiple metric IDs
 * Replaces individual fetchProgressHistory calls for better performance
 */
function batchFetchProgressHistory(metricIds, config) {
  if (!metricIds || metricIds.length === 0) return {};
  
  const uniqueMetricIds = [...new Set(metricIds.filter(id => id))];
  Logger.log(`📈 Batch fetching progress history for ${uniqueMetricIds.length} unique metrics`);
  
  // Calculate date range for sparkline history
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - INTERNAL_CONFIG.SPARKLINE_DAYS);
  
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];
  
  const requests = uniqueMetricIds.map(metricId => ({
    url: `${config.baseUrl}/metrics/${metricId}/values?from=${startDateString}&to=${endDateString}`,
    options: { 
      headers: BatchProcessor.buildHeaders(config),
      muteHttpExceptions: true 
    }
  }));
  
  const responses = BatchProcessor.executeBatchRequests(requests, config);
  const progressMap = {};
  
  responses.forEach((response, index) => {
    const metricId = uniqueMetricIds[index];
    if (response && response.getResponseCode() === 200) {
      try {
        const responseText = response.getContentText();
        if (!responseText.trim().startsWith('<!DOCTYPE') && !responseText.trim().startsWith('<html')) {
          const historyData = JSON.parse(responseText);
          progressMap[metricId] = processProgressHistory(historyData);
          Logger.log(`📊 Found ${progressMap[metricId].length} progress entries for metric ${metricId}`);
        } else {
          Logger.log(`⚠️ Received HTML error page for progress history ${metricId}`);
          progressMap[metricId] = [];
        }
      } catch (error) {
        Logger.log(`⚠️ Error parsing progress history for ${metricId}: ${error.message}`);
        progressMap[metricId] = [];
      }
    } else if (response && response.getResponseCode() === 404) {
      // No history found - this is normal for new metrics
      Logger.log(`📈 No progress history found for metric ${metricId} (404)`);
      progressMap[metricId] = [];
    } else {
      Logger.log(`⚠️ Could not fetch progress history for metric ${metricId}: ${response ? response.getResponseCode() : 'no response'}`);
      progressMap[metricId] = [];
    }
  });
  
  Logger.log(`✅ Batch progress history fetching complete: ${Object.keys(progressMap).length} metrics processed`);
  return progressMap;
}

/**
 * Batch fetch goal details for multiple objective IDs
 * Replaces individual goal detail API calls for better performance
 */
function batchFetchGoalDetails(objectiveIds, config) {
  if (!objectiveIds || objectiveIds.length === 0) return {};
  
  const uniqueObjectiveIds = [...new Set(objectiveIds.filter(id => id))];
  Logger.log(`🎯 Batch fetching goal details for ${uniqueObjectiveIds.length} unique objectives`);
  
  const requests = uniqueObjectiveIds.map(objId => ({
    url: `${config.baseUrl}/goals/${objId}`,
    options: { 
      headers: BatchProcessor.buildHeaders(config),
      muteHttpExceptions: true 
    }
  }));
  
  const responses = BatchProcessor.executeBatchRequests(requests, config);
  const goalMap = {};
  
  responses.forEach((response, index) => {
    const objectiveId = uniqueObjectiveIds[index];
    if (response && response.getResponseCode() === 200) {
      try {
        const responseText = response.getContentText();
        if (!responseText.trim().startsWith('<!DOCTYPE') && !responseText.trim().startsWith('<html')) {
          const goalData = JSON.parse(responseText);
          goalMap[objectiveId] = goalData;
          Logger.log(`🎯 Successfully fetched goal details for objective ${objectiveId}`);
        } else {
          Logger.log(`⚠️ Received HTML error page for goal ${objectiveId}`);
          goalMap[objectiveId] = null;
        }
      } catch (error) {
        Logger.log(`⚠️ Error parsing goal data for ${objectiveId}: ${error.message}`);
        goalMap[objectiveId] = null;
      }
    } else {
      Logger.log(`⚠️ Could not fetch goal details for objective ${objectiveId}: ${response ? response.getResponseCode() : 'no response'}`);
      goalMap[objectiveId] = null;
    }
  });
  
  Logger.log(`✅ Batch goal details fetching complete: ${Object.keys(goalMap).length} objectives processed`);
  return goalMap;
}

/**
 * Process tasks data into standardized format
 */
function processTasks(tasksData) {
  if (!tasksData) return [];
  
  let tasks;
  if (Array.isArray(tasksData)) {
    tasks = tasksData;
  } else if (tasksData.items && Array.isArray(tasksData.items)) {
    tasks = tasksData.items;
  } else if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
    tasks = tasksData.tasks;
  } else if (tasksData.data && Array.isArray(tasksData.data)) {
    tasks = tasksData.data;
  } else {
    Logger.log(`⚠️ Unexpected tasks response format: ${typeof tasksData}`);
    return [];
  }
  
  return tasks;
}

/**
 * Batch fetch tasks for multiple metric IDs
 * Replaces individual fetchTasksForMetric calls for better performance
 */
function batchFetchTasks(metricIds, config) {
  if (!metricIds || metricIds.length === 0) return {};
  
  const uniqueMetricIds = [...new Set(metricIds.filter(id => id))];
  Logger.log(`📋 Batch fetching tasks for ${uniqueMetricIds.length} unique metrics`);
  
  const requests = uniqueMetricIds.map(metricId => ({
    url: `${config.baseUrl}/tasks?metricId=${metricId}`,
    options: { 
      headers: BatchProcessor.buildHeaders(config),
      muteHttpExceptions: true 
    }
  }));
  
  // Debug: Log the first few task URLs to verify proper construction
  Logger.log(`🔍 Debug: First 3 task URLs:`);
  requests.slice(0, 3).forEach((req, i) => {
    Logger.log(`   ${i + 1}. ${req.url}`);
  });
  
  const responses = BatchProcessor.executeBatchRequests(requests, config);
  const tasksMap = {};
  
  responses.forEach((response, index) => {
    const metricId = uniqueMetricIds[index];
    if (response && response.getResponseCode() === 200) {
      try {
        const responseText = response.getContentText();
        if (!responseText.trim().startsWith('<!DOCTYPE') && !responseText.trim().startsWith('<html')) {
          const tasksData = JSON.parse(responseText);
          tasksMap[metricId] = processTasks(tasksData);
          
          // Debug: Check for suspicious duplicate counts
          const taskCount = tasksMap[metricId].length;
          if (taskCount === 3658) {
            Logger.log(`🚨 SUSPICIOUS: Metric ${metricId} has exactly 3658 tasks - possible response contamination`);
            Logger.log(`🔍 Debug: Response URL should contain metricId=${metricId}`);
            Logger.log(`🔍 Debug: First few tasks: ${JSON.stringify(tasksMap[metricId].slice(0, 2).map(t => ({id: t.id, name: t.name})))}`);
          } else {
            Logger.log(`📋 Found ${taskCount} tasks for metric ${metricId}`);
          }
        } else {
          Logger.log(`⚠️ Received HTML error page for tasks ${metricId}`);
          tasksMap[metricId] = [];
        }
      } catch (error) {
        Logger.log(`⚠️ Error parsing tasks data for ${metricId}: ${error.message}`);
        tasksMap[metricId] = [];
      }
    } else {
      Logger.log(`⚠️ Could not fetch tasks for metric ${metricId}: ${response ? response.getResponseCode() : 'no response'}`);
      tasksMap[metricId] = [];
    }
  });
  
  Logger.log(`✅ Batch tasks fetching complete: ${Object.keys(tasksMap).length} metrics processed`);
  return tasksMap;
}

/**
 * Fetch tasks for a given metric (key result)
 */
function fetchTasksForMetric(metricId, config) {
  if (!metricId) return [];
  
  const headers = {
    'Authorization': `Bearer ${config.apiToken}`,
    'Gtmhub-AccountId': config.accountId,
    'Content-Type': 'application/json'
  };
  
  try {
    const tasksUrl = `${config.baseUrl}/tasks?metricId=${metricId}`;
    Logger.log(`🔧 Fetching tasks for metric ${metricId} from: ${tasksUrl}`);
    
    const tasksResponse = UrlFetchApp.fetch(tasksUrl, { 
      headers: headers,
      muteHttpExceptions: true 
    });
    
    if (tasksResponse.getResponseCode() === 200) {
      const tasksResponseText = tasksResponse.getContentText();
      const tasksData = JSON.parse(tasksResponseText);
      
      // Handle different response formats
      let tasks;
      if (Array.isArray(tasksData)) {
        tasks = tasksData;
      } else if (tasksData.items && Array.isArray(tasksData.items)) {
        tasks = tasksData.items;
      } else if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
        tasks = tasksData.tasks;
      } else if (tasksData.data && Array.isArray(tasksData.data)) {
        tasks = tasksData.data;
      } else {
        Logger.log(`⚠️ Unexpected tasks response format for metric ${metricId}: ${typeof tasksData}`);
        return [];
      }
      
      Logger.log(`✅ Found ${tasks.length} tasks for metric ${metricId}`);
      
      // Fetch owner names for each task - try embedded first
      for (const task of tasks) {
        if (task.assignee && typeof task.assignee === 'object') {
          task.ownerName = task.assignee.name || task.assignee.displayName || task.assignee.email || 'Unassigned';
          Logger.log(`📊 Using embedded assignee name for task "${task.name}": ${task.ownerName}`);
        } else if (task.owner && typeof task.owner === 'object') {
          task.ownerName = task.owner.name || task.owner.displayName || task.owner.email || 'Unassigned';
          Logger.log(`📊 Using embedded owner name for task "${task.name}": ${task.ownerName}`);
        } else if (task.ownerId) {
          task.ownerName = fetchUserDisplayName(task.ownerId, config);
        } else if (task.assigneeId) {
          task.ownerName = fetchUserDisplayName(task.assigneeId, config);
        } else {
          task.ownerName = 'Unassigned';
        }
      }
      
      return tasks;
    } else {
      Logger.log(`⚠️ Could not fetch tasks for metric ${metricId}: ${tasksResponse.getResponseCode()}`);
      return [];
    }
  } catch (error) {
    Logger.log(`⚠️ Error fetching tasks for metric ${metricId}: ${error.message}`);
    return [];
  }
}

/**
 * Fetch individual session details
 */
function fetchSessionDetail(sessionId, config) {
  const sessionUrl = `${config.baseUrl}/sessions/${sessionId}`;
  Logger.log(`🔍 Fetching session details from: ${sessionUrl}`);
  
  const sessionResponse = UrlFetchApp.fetch(sessionUrl, { 
    headers: BatchProcessor.buildHeaders(config) 
  });
  
  const sessionResponseText = sessionResponse.getContentText();
  
  // Check if response is HTML (error page)
  if (sessionResponseText.trim().startsWith('<!DOCTYPE') || sessionResponseText.trim().startsWith('<html')) {
    Logger.log(`❌ Received HTML error page for session ${sessionId}. Response: ${sessionResponseText.substring(0, 500)}...`);
    throw new Error(`API returned HTML error page for session "${sessionId}". Check your API token and session permissions.`);
  }
  
  return JSON.parse(sessionResponseText);
}

/**
 * Fetch session objectives
 */
function fetchSessionObjectives(sessionId, config) {
  const objectivesUrl = `${config.baseUrl}/goals?sessionId=${sessionId}`;
  Logger.log(`🎯 Fetching objectives from: ${objectivesUrl}`);
  
  const objectivesResponse = UrlFetchApp.fetch(objectivesUrl, { 
    headers: BatchProcessor.buildHeaders(config) 
  });
  
  const objectivesResponseText = objectivesResponse.getContentText();
  
  // Check if response is HTML (error page)
  if (objectivesResponseText.trim().startsWith('<!DOCTYPE') || objectivesResponseText.trim().startsWith('<html')) {
    Logger.log(`❌ Received HTML error page for objectives in session ${sessionId}. Response: ${objectivesResponseText.substring(0, 500)}...`);
    throw new Error(`API returned HTML error page when fetching objectives for session "${sessionId}". Check your API token permissions.`);
  }
  
  const objectivesData = JSON.parse(objectivesResponseText);
  
  // Handle different response formats for objectives (goals)
  if (Array.isArray(objectivesData)) {
    return objectivesData;
  } else if (objectivesData.items && Array.isArray(objectivesData.items)) {
    return objectivesData.items;
  } else if (objectivesData.goals && Array.isArray(objectivesData.goals)) {
    return objectivesData.goals;
  } else if (objectivesData.objectives && Array.isArray(objectivesData.objectives)) {
    return objectivesData.objectives;
  } else {
    return objectivesData; // fallback
  }
}

/**
 * Resolve multiple sessions (names/UUIDs) to session objects
 */
function resolveMultipleSessions(config) {
  const headers = {
    'Authorization': `Bearer ${config.apiToken}`,
    'Gtmhub-AccountId': config.accountId,
    'Content-Type': 'application/json'
  };
  
  // Fetch all sessions
  const sessionsUrl = `${config.baseUrl}/sessions`;
  const sessionsResponse = UrlFetchApp.fetch(sessionsUrl, { headers });
  const responseText = sessionsResponse.getContentText();
  
  Logger.log(`📊 Sessions API response: ${responseText.substring(0, 200)}...`);
  
  const sessionsData = JSON.parse(responseText);
  
  // Handle different response formats
  let allSessions;
  if (Array.isArray(sessionsData)) {
    allSessions = sessionsData;
  } else if (sessionsData.items && Array.isArray(sessionsData.items)) {
    allSessions = sessionsData.items;
  } else if (sessionsData.sessions && Array.isArray(sessionsData.sessions)) {
    allSessions = sessionsData.sessions;
  } else if (sessionsData.data && Array.isArray(sessionsData.data)) {
    allSessions = sessionsData.data;
  } else {
    throw new Error(`Unexpected sessions API response format. Expected array, got: ${typeof sessionsData}`);
  }
  
  Logger.log(`📋 Found ${allSessions.length} total sessions`);
  
  const resolvedSessions = [];
  const notFoundSessions = [];
  
  // Resolve each session in the config
  for (const sessionIdentifier of config.sessions) {
    let foundSession = null;
    
    // First, try to find by exact ID match (UUID)
    foundSession = allSessions.find(session => session.id === sessionIdentifier);
    
    // If not found by ID, try to find by name (case-insensitive)
    if (!foundSession) {
      foundSession = allSessions.find(session => 
        (session.name || session.title || '').toLowerCase() === sessionIdentifier.toLowerCase()
      );
    }
    
    if (foundSession) {
      resolvedSessions.push(foundSession);
      Logger.log(`✅ Found session: "${foundSession.name || foundSession.title}" (ID: ${foundSession.id})`);
    } else {
      notFoundSessions.push(sessionIdentifier);
      Logger.log(`❌ Session not found: "${sessionIdentifier}"`);
    }
  }
  
  if (notFoundSessions.length > 0) {
    const availableSessions = allSessions.map(s => `"${s.name || s.title}" (${s.id})`).join(', ');
    throw new Error(`Sessions not found: ${notFoundSessions.join(', ')}. Available sessions: ${availableSessions}`);
  }
  
  Logger.log(`✅ Resolved ${resolvedSessions.length} sessions for multi-session report`);
  return resolvedSessions;
}

/**
 * Find session ID by name (legacy function for backward compatibility)
 */
function findSessionByName(config) {
  const headers = {
    'Authorization': `Bearer ${config.apiToken}`,
    'Gtmhub-AccountId': config.accountId,
    'Content-Type': 'application/json'
  };
  
  // Fetch all sessions
  const sessionsUrl = `${config.baseUrl}/sessions`;
  const sessionsResponse = UrlFetchApp.fetch(sessionsUrl, { headers });
  const responseText = sessionsResponse.getContentText();
  
  Logger.log(`📊 Sessions API response: ${responseText.substring(0, 200)}...`);
  
  const sessionsData = JSON.parse(responseText);
  
  // Handle different response formats
  let sessions;
  if (Array.isArray(sessionsData)) {
    sessions = sessionsData;
  } else if (sessionsData.items && Array.isArray(sessionsData.items)) {
    sessions = sessionsData.items;
  } else if (sessionsData.sessions && Array.isArray(sessionsData.sessions)) {
    sessions = sessionsData.sessions;
  } else if (sessionsData.data && Array.isArray(sessionsData.data)) {
    sessions = sessionsData.data;
  } else {
    throw new Error(`Unexpected sessions API response format. Expected array, got: ${typeof sessionsData}`);
  }
  
  Logger.log(`📋 Found ${sessions.length} sessions`);
  
  // Find session by name (case-insensitive)
  const targetSession = sessions.find(session => 
    (session.name || session.title || '').toLowerCase() === config.sessionName.toLowerCase()
  );
  
  if (!targetSession) {
    throw new Error(`Session "${config.sessionName}" not found. Available sessions: ${sessions.map(s => s.name || s.title).join(', ')}`);
  }
  
  Logger.log(`✅ Found session: "${targetSession.name || targetSession.title}" (ID: ${targetSession.id})`);
  return targetSession.id;
}

/**
 * Optimized session data fetching using batch processing
 * Replaces sequential API calls with parallel batch operations
 */
function fetchSessionDataOptimized(config) {
  const sessions = resolveMultipleSessions(config);
  let allObjectives = [];
  let allKeyResults = [];
  const sessionDetails = [];
  
  Logger.log(`🚀 Starting optimized batch data collection for ${sessions.length} sessions`);
  const batchStartTime = Date.now();
  
  // Step 1: Collect basic session and objective data (minimal sequential calls)
  for (const session of sessions) {
    // Debug: Log session object properties
    Logger.log(`🔍 Debug: Session object properties: ${JSON.stringify(Object.keys(session))}`);
    Logger.log(`🔍 Debug: Session name field: ${session.name}, title field: ${session.title}`);
    
    const sessionName = session.name || session.title || `Session ${session.id}`;
    Logger.log(`📊 Processing session: "${sessionName}" (ID: ${session.id})`);
    
    try {
      const sessionDetail = fetchSessionDetail(session.id, config);
      sessionDetails.push(sessionDetail);
      
      const objectives = fetchSessionObjectives(session.id, config);
      objectives.forEach(obj => {
        obj.sessionId = session.id;
        obj.sessionName = sessionName;
      });
      allObjectives.push(...objectives);
      
      Logger.log(`📋 Found ${objectives.length} objectives for session "${sessionName}"`);
    } catch (error) {
      Logger.log(`❌ Error processing session "${sessionName}" (ID: ${session.id}): ${error.message}`);
      throw error;
    }
  }
  
  // Step 2: Extract all IDs for batch processing
  const objectiveIds = allObjectives.map(obj => obj.id);
  const allUserIds = new Set();
  
  Logger.log(`🔄 Prepared ${objectiveIds.length} objectives for batch processing`);
  
  // Step 3: BATCH FETCH objective data (parallel processing)
  Logger.log(`📊 Starting batch fetch of objective data...`);
  const goalDetailsMap = batchFetchGoalDetails(objectiveIds, config);
  const objectiveProgressMap = batchFetchProgressHistory(objectiveIds, config);
  
  // Step 4: Enhance objectives with batch data and extract key results
  Logger.log(`🔧 Processing batch results and extracting key results...`);
  allObjectives.forEach(obj => {
    const goalData = goalDetailsMap[obj.id];
    if (goalData) {
      // Update objective with detailed goal data
      obj.name = goalData.name || obj.name;
      obj.description = goalData.description || obj.description || '';
      obj.progress = Math.round((goalData.attainment || 0) * 100);
      obj.status = goalData.closedStatus || obj.status;
      obj.ownerId = goalData.ownerId;
      
      // Collect user IDs for batch processing
      if (goalData.ownerId) allUserIds.add(goalData.ownerId);
      
      // Extract owner information - try embedded first
      if (goalData.assignee && typeof goalData.assignee === 'object') {
        obj.ownerName = goalData.assignee.name || goalData.assignee.displayName || goalData.assignee.email || 'Unassigned';
      } else if (goalData.owner && typeof goalData.owner === 'object') {
        obj.ownerName = goalData.owner.name || goalData.owner.displayName || goalData.owner.email || 'Unassigned';
      } else {
        obj.ownerName = null; // Will be set later with batch user data
      }
      
      // Extract key results from metrics
      if (goalData.metrics && Array.isArray(goalData.metrics)) {
        goalData.metrics.forEach(kr => {
          kr.objectiveName = obj.name;
          kr.objectiveOwner = obj.ownerName;
          allKeyResults.push(kr);
          
          // Collect user IDs
          if (kr.ownerId) allUserIds.add(kr.ownerId);
        });
      }
    }
    
    // Add progress history from batch
    obj.progressHistory = objectiveProgressMap[obj.id] || [];
    obj.sparkline = generateSparkline(obj.progressHistory);
  });
  
  Logger.log(`✅ Extracted ${allKeyResults.length} key results from ${allObjectives.length} objectives`);
  
  // Step 5: BATCH FETCH key result data (parallel processing)
  if (allKeyResults.length > 0) {
    Logger.log(`📊 Starting batch fetch of key result data...`);
    const keyResultIds = allKeyResults.map(kr => kr.id);
    const keyResultProgressMap = batchFetchProgressHistory(keyResultIds, config);
    
    // TEMPORARY: Use individual calls for tasks due to potential API filtering issue
    Logger.log(`🔧 TEMPORARY: Using individual task fetching due to suspected API issue`);
    const keyResultTasksMap = {};
         for (const krId of keyResultIds.slice(0, 5)) { // Test with first 5 only
       Logger.log(`📋 Fetching tasks individually for metric ${krId}`);
       keyResultTasksMap[krId] = fetchTasksForMetric(krId, config);
       
       if (keyResultTasksMap[krId].length === 3658) {
         Logger.log(`🚨 CONFIRMED: Individual call also returns 3658 tasks for ${krId} - API endpoint issue`);
         
         // Debug: Check if tasks actually belong to this metric
         const sampleTasks = keyResultTasksMap[krId].slice(0, 3);
         Logger.log(`🔍 Debug: Sample task IDs and metricIds:`);
         sampleTasks.forEach((task, i) => {
           Logger.log(`   Task ${i + 1}: ID=${task.id}, metricId=${task.metricId || task.goalId || 'none'}, name="${task.name}"`);
         });
         
         break; // Stop after confirming the issue
       }
     }
    // For remaining metrics, set empty arrays to avoid the API issue
    keyResultIds.forEach(krId => {
      if (!keyResultTasksMap[krId]) {
        keyResultTasksMap[krId] = [];
      }
    });
    
    // Step 6: Enhance key results with batch data
    allKeyResults.forEach(kr => {
      kr.progressHistory = keyResultProgressMap[kr.id] || [];
      kr.sparkline = generateSparkline(kr.progressHistory);
      kr.tasks = keyResultTasksMap[kr.id] || [];
      
      // Extract owner information - try embedded first
      if (kr.owner && typeof kr.owner === 'object') {
        kr.ownerName = kr.owner.name || kr.owner.displayName || kr.owner.email || 'Unassigned';
      } else if (kr.assignee && typeof kr.assignee === 'object') {
        kr.ownerName = kr.assignee.name || kr.assignee.displayName || kr.assignee.email || 'Unassigned';
      } else {
        kr.ownerName = null; // Will be set later with batch user data
      }
      
      // Collect task user IDs
      kr.tasks.forEach(task => {
        if (task.ownerId) allUserIds.add(task.ownerId);
        if (task.assigneeId) allUserIds.add(task.assigneeId);
      });
    });
  }
  
  // Step 7: BATCH FETCH all users (single parallel operation)
  let userMap = {};
  if (allUserIds.size > 0) {
    Logger.log(`👥 Starting batch fetch of user data...`);
    userMap = batchFetchUsers([...allUserIds], config);
  }
  
  // Step 8: Apply user names using batch data
  allObjectives.forEach(obj => {
    if (!obj.ownerName && obj.ownerId) {
      obj.ownerName = userMap[obj.ownerId] || 'Unassigned';
    }
  });
  
  allKeyResults.forEach(kr => {
    if (!kr.ownerName && kr.ownerId) {
      kr.ownerName = userMap[kr.ownerId] || kr.objectiveOwner || 'Unassigned';
    }
    
    kr.tasks.forEach(task => {
      // Extract owner information - try embedded first
      if (task.assignee && typeof task.assignee === 'object') {
        task.ownerName = task.assignee.name || task.assignee.displayName || task.assignee.email || 'Unassigned';
      } else if (task.owner && typeof task.owner === 'object') {
        task.ownerName = task.owner.name || task.owner.displayName || task.owner.email || 'Unassigned';
      } else {
        task.ownerName = userMap[task.ownerId] || userMap[task.assigneeId] || 'Unassigned';
      }
    });
  });
  
  const batchEndTime = Date.now();
  const batchDuration = (batchEndTime - batchStartTime) / 1000;
  Logger.log(`🚀 Batch processing completed in ${batchDuration} seconds`);
  
  // Step 9: Build hierarchy and return
  const hierarchicalObjectives = buildObjectiveHierarchy(allObjectives);
  
  Logger.log(`📊 Batch Summary: ${allObjectives.length} objectives, ${allKeyResults.length} key results, ${allUserIds.size} users`);
  
  return {
    sessions: sessionDetails,
    objectives: allObjectives,
    hierarchicalObjectives: hierarchicalObjectives,
    keyResults: allKeyResults,
    sessionCount: sessions.length,
    sessionNames: sessions.map(s => s.name || s.title || `Session ${s.id}`).join(', ')
  };
}

/**
 * Fetch session data from Quantive API (supports multiple sessions)
 * Uses optimized batch processing with fallback to sequential processing
 */
function fetchSessionData(config) {
  try {
    Logger.log('🚀 Using optimized batch processing for session data fetching');
    return fetchSessionDataOptimized(config);
  } catch (error) {
    Logger.log(`⚠️ Batch processing failed: ${error.message}`);
    Logger.log('📞 Falling back to sequential processing');
    return fetchSessionDataSequential(config);
  }
}

/**
 * Sequential session data fetching (original implementation)
 * Used as fallback when batch processing fails
 */
function fetchSessionDataSequential(config) {
  const headers = {
    'Authorization': `Bearer ${config.apiToken}`,
    'Gtmhub-AccountId': config.accountId,
    'Content-Type': 'application/json'
  };
  
  // Resolve multiple sessions (names/UUIDs to session objects)
  const sessions = resolveMultipleSessions(config);
  
  // Aggregate data from all sessions
  let allObjectives = [];
  let allKeyResults = [];
  const sessionDetails = [];
  
  Logger.log(`🔄 Processing ${sessions.length} sessions for multi-session report (sequential mode)...`);
  
  for (const session of sessions) {
    Logger.log(`📊 Processing session: "${session.name}" (ID: ${session.id})`);
    
    try {
      // Fetch session details
      const sessionUrl = `${config.baseUrl}/sessions/${session.id}`;
      Logger.log(`🔍 Fetching session details from: ${sessionUrl}`);
      
      const sessionResponse = UrlFetchApp.fetch(sessionUrl, { headers });
      const sessionResponseText = sessionResponse.getContentText();
      
      // Check if response is HTML (error page)
      if (sessionResponseText.trim().startsWith('<!DOCTYPE') || sessionResponseText.trim().startsWith('<html')) {
        Logger.log(`❌ Received HTML error page for session ${session.id}. Response: ${sessionResponseText.substring(0, 500)}...`);
        throw new Error(`API returned HTML error page for session "${session.name}" (ID: ${session.id}). Check your API token and session permissions.`);
      }
      
      const sessionDetail = JSON.parse(sessionResponseText);
      sessionDetails.push(sessionDetail);
      
      // Fetch objectives for this session
      const objectivesUrl = `${config.baseUrl}/goals?sessionId=${session.id}`;
      Logger.log(`🎯 Fetching objectives from: ${objectivesUrl}`);
      
      const objectivesResponse = UrlFetchApp.fetch(objectivesUrl, { headers });
      const objectivesResponseText = objectivesResponse.getContentText();
      
      // Check if response is HTML (error page)
      if (objectivesResponseText.trim().startsWith('<!DOCTYPE') || objectivesResponseText.trim().startsWith('<html')) {
        Logger.log(`❌ Received HTML error page for objectives in session ${session.id}. Response: ${objectivesResponseText.substring(0, 500)}...`);
        throw new Error(`API returned HTML error page when fetching objectives for session "${session.name}". Check your API token permissions.`);
      }
      
      const objectivesData = JSON.parse(objectivesResponseText);
      
      // Handle different response formats for objectives (goals)
      let sessionObjectives;
      if (Array.isArray(objectivesData)) {
        sessionObjectives = objectivesData;
      } else if (objectivesData.items && Array.isArray(objectivesData.items)) {
        sessionObjectives = objectivesData.items;
      } else if (objectivesData.goals && Array.isArray(objectivesData.goals)) {
        sessionObjectives = objectivesData.goals;
      } else if (objectivesData.objectives && Array.isArray(objectivesData.objectives)) {
        sessionObjectives = objectivesData.objectives;
      } else {
        sessionObjectives = objectivesData; // fallback
      }
      
      // Add session context to each objective
      sessionObjectives.forEach(obj => {
        obj.sessionId = session.id;
        obj.sessionName = session.name || session.title;
      });
      
      Logger.log(`📋 Found ${sessionObjectives.length} objectives for session "${session.name}"`);
      
      // Log objective structure (only once for the first session)
      if (allObjectives.length === 0 && sessionObjectives.length > 0) {
        Logger.log(`📋 Sample objective structure: ${JSON.stringify(Object.keys(sessionObjectives[0]))}`);
        Logger.log(`🔍 Checking for hierarchy fields in objectives...`);
        
        const hierarchyFields = [];
        const sampleObj = sessionObjectives[0];
        ['parentId', 'parentGoalId', 'parentObjectiveId', 'parent', 'parentGoal'].forEach(field => {
          if (sampleObj.hasOwnProperty(field)) {
            hierarchyFields.push(field);
            Logger.log(`   Found hierarchy field: ${field} = ${sampleObj[field]}`);
          }
        });
        
        if (hierarchyFields.length > 0) {
          Logger.log(`✅ Detected hierarchy fields: ${hierarchyFields.join(', ')}`);
        } else {
          Logger.log(`⚠️ No obvious hierarchy fields found, will treat objectives as flat structure`);
        }
      }
      
      // Add to aggregated objectives
      allObjectives.push(...sessionObjectives);
      
    } catch (error) {
      Logger.log(`❌ Error processing session "${session.name}" (ID: ${session.id}): ${error.message}`);
      throw error; // Re-throw to stop processing if any session fails
    }
  }
  
  Logger.log(`📊 Multi-session aggregation complete: ${allObjectives.length} total objectives from ${sessions.length} sessions`);
  
  // Fetch key results individually per objective (across all sessions)
  Logger.log(`🔑 Fetching key results individually for each objective...`);
  
  for (const objective of allObjectives) {
    let keyResults = [];
    
    try {
      // Fetch goal details which include goalMetricsLinksResponse
      const goalUrl = `${config.baseUrl}/goals/${objective.id}`;
      Logger.log(`🎯 Fetching goal details from: ${goalUrl}`);
      
      const goalResponse = UrlFetchApp.fetch(goalUrl, { 
        headers: headers,
        muteHttpExceptions: true 
      });
      const goalResponseText = goalResponse.getContentText();
      const goalResponseCode = goalResponse.getResponseCode();
      
      Logger.log(`📊 Goal response code: ${goalResponseCode}, Length: ${goalResponseText.length}`);
      
      if (goalResponseCode === 200 && !goalResponseText.trim().startsWith('<!DOCTYPE') && !goalResponseText.trim().startsWith('<html')) {
        try {
          const goalData = JSON.parse(goalResponseText);
          Logger.log(`📊 Goal data structure: ${JSON.stringify(Object.keys(goalData))}`);
          
          // Update objective with detailed goal data using correct field names
          objective.name = goalData.name || objective.name;
          objective.description = goalData.description || objective.description || '';
          objective.progress = Math.round((goalData.attainment || 0) * 100); // attainment is 0-1, convert to percentage
          objective.status = goalData.closedStatus || objective.status;
          
          // Extract owner information - try embedded first, then fetch user display name
          if (goalData.assignee && typeof goalData.assignee === 'object') {
            objective.ownerName = goalData.assignee.name || goalData.assignee.displayName || goalData.assignee.email || 'Unassigned';
            Logger.log(`📊 Using embedded assignee name for objective "${objective.name}": ${objective.ownerName}`);
          } else if (goalData.owner && typeof goalData.owner === 'object') {
            objective.ownerName = goalData.owner.name || goalData.owner.displayName || goalData.owner.email || 'Unassigned';
            Logger.log(`📊 Using embedded owner name for objective "${objective.name}": ${objective.ownerName}`);
          } else if (goalData.ownerId) {
            objective.ownerId = goalData.ownerId;
            objective.ownerName = fetchUserDisplayName(goalData.ownerId, config);
          } else {
            objective.ownerName = 'Unassigned';
          }
          
          // Ensure session information is preserved (sessionId exists in the response)
          if (goalData.sessionId) {
            objective.sessionId = goalData.sessionId;
          }
          
          Logger.log(`📊 Updated objective "${objective.name}" - Progress: ${objective.progress}%, Owner: ${objective.ownerName}, Status: ${objective.status}`);
          
          // Fetch progress history and generate sparkline for objective
          Logger.log(`   📈 Fetching progress history for objective "${objective.name}" (ID: ${objective.id})`);
          objective.progressHistory = fetchProgressHistory(objective.id, config);
          objective.sparkline = generateSparkline(objective.progressHistory);
          Logger.log(`   ✨ Generated sparkline for objective "${objective.name}": ${objective.sparkline}`);
          
          // Extract metrics from the correct field name
          if (goalData.metrics && Array.isArray(goalData.metrics)) {
            keyResults = goalData.metrics;
            Logger.log(`✅ Found ${keyResults.length} key results from metrics array for "${objective.name}"`);
            
            // Log structure of first key result to understand task fields
            if (keyResults.length > 0) {
              Logger.log(`📊 Sample KR structure: ${JSON.stringify(Object.keys(keyResults[0]))}`);
              const sampleKR = keyResults[0];
              ['taskCount', 'tasksCount', 'tasks', 'numberOfTasks'].forEach(field => {
                if (sampleKR.hasOwnProperty(field)) {
                  Logger.log(`   Found task field: ${field} = ${sampleKR[field]}`);
                }
              });
            }
          } else {
            Logger.log(`⚠️ No metrics array found for objective "${objective.name}"`);
            Logger.log(`   Available fields: ${JSON.stringify(Object.keys(goalData))}`);
            Logger.log(`   Metrics field type: ${typeof goalData.metrics}, Value: ${goalData.metrics}`);
            keyResults = [];
          }
        } catch (parseError) {
          Logger.log(`❌ JSON parse error for goal ${objective.id}: ${parseError.message}`);
          keyResults = [];
        }
      } else {
        Logger.log(`⚠️ Invalid response from goal endpoint (code: ${goalResponseCode}) for objective: ${objective.name}`);
        keyResults = [];
      }
    } catch (error) {
      Logger.log(`⚠️ Could not fetch goal details for objective ${objective.id}: ${error.message}`);
      keyResults = [];
    }
    
    Logger.log(`📊 Found ${keyResults.length} key results for objective: ${objective.name} (ID: ${objective.id})`);
    
    // Add objective context and fetch owner names for key results
    for (const kr of keyResults) {
      // Don't add objectiveId - goalId is the correct field from the API
      kr.objectiveName = objective.name;
      kr.objectiveOwner = objective.ownerName;
      
      Logger.log(`   - KR "${kr.name}" (goalId: ${kr.goalId}) belongs to objective "${objective.name}" (ID: ${objective.id})`);
      
      // Validation: Confirm this key result belongs to this objective
      if (kr.goalId !== objective.id) {
        Logger.log(`⚠️ Warning: Key Result "${kr.name}" has goalId ${kr.goalId} but fetched for objective ${objective.id}`);
      }
      
      // Fetch owner information for the key result - try embedded first
      if (kr.owner && typeof kr.owner === 'object') {
        kr.ownerName = kr.owner.name || kr.owner.displayName || kr.owner.email || 'Unassigned';
        Logger.log(`📊 Using embedded owner name for KR "${kr.name}": ${kr.ownerName}`);
      } else if (kr.assignee && typeof kr.assignee === 'object') {
        kr.ownerName = kr.assignee.name || kr.assignee.displayName || kr.assignee.email || 'Unassigned';
        Logger.log(`📊 Using embedded assignee name for KR "${kr.name}": ${kr.ownerName}`);
      } else if (kr.ownerId) {
        kr.ownerName = fetchUserDisplayName(kr.ownerId, config);
      } else if (!kr.ownerName) {
        kr.ownerName = kr.objectiveOwner || 'Unassigned'; // Fallback to objective owner
      }
      
      // Check if this key result has tasks before fetching
      const taskCount = kr.taskCount || kr.tasksCount || 0;
      if (taskCount > 0) {
        Logger.log(`   📋 Key result "${kr.name}" has ${taskCount} tasks, fetching...`);
        kr.tasks = fetchTasksForMetric(kr.id, config);
        Logger.log(`   ✅ Found ${kr.tasks.length} tasks for key result "${kr.name}"`);
      } else {
        Logger.log(`   📋 Key result "${kr.name}" has no tasks (taskCount: ${taskCount})`);
        kr.tasks = [];
      }
      
      // Fetch progress history and generate sparkline
      Logger.log(`   📈 Fetching progress history for key result "${kr.name}" (ID: ${kr.id})`);
      kr.progressHistory = fetchProgressHistory(kr.id, config);
      kr.sparkline = generateSparkline(kr.progressHistory);
      Logger.log(`   ✨ Generated sparkline for "${kr.name}": ${kr.sparkline}`);
    }
    
    allKeyResults.push(...keyResults);
  }
  
  // Summary logging
  Logger.log(`📊 Summary: Processed ${allKeyResults.length} total key results for ${allObjectives.length} objectives`);
  allObjectives.forEach((obj, idx) => {
    const objKRs = allKeyResults.filter(kr => kr.goalId === obj.id);
    Logger.log(`   Objective ${idx + 1}: "${obj.name}" (ID: ${obj.id}) → ${objKRs.length} key results`);
    if (objKRs.length === 0) {
      // Debug why this objective has no key results
      Logger.log(`     ⚠️ No key results found with goalId matching ${obj.id}`);
      const allGoalIds = allKeyResults.map(kr => kr.goalId).filter(Boolean);
      if (allGoalIds.length > 0) {
        Logger.log(`     Available goalIds in key results: ${[...new Set(allGoalIds)].join(', ')}`);
      }
    }
  });
  
  // Debug any unassociated key results (KRs without a matching objective)
  const objectiveIds = new Set(allObjectives.map(obj => obj.id));
  const unassociatedKRs = allKeyResults.filter(kr => kr.goalId && !objectiveIds.has(kr.goalId));
  if (unassociatedKRs.length > 0) {
    Logger.log(`⚠️ Found ${unassociatedKRs.length} key results with goalId not matching any objective:`);
    unassociatedKRs.forEach(kr => {
      Logger.log(`   - "${kr.name}" (goalId: ${kr.goalId})`);
    });
  }
  
  // Build objective hierarchy (across all sessions)
  const hierarchicalObjectives = buildObjectiveHierarchy(allObjectives);
  
  return {
    sessions: sessionDetails, // Array of session details
    objectives: allObjectives, // Keep original flat list for backward compatibility
    hierarchicalObjectives: hierarchicalObjectives, // New hierarchical structure
    keyResults: allKeyResults,
    // Summary stats for multi-session report
    sessionCount: sessions.length,
    sessionNames: sessions.map(s => s.name || s.title).join(', ')
  };
}

/**
 * Build hierarchical structure from flat objectives array
 */
function buildObjectiveHierarchy(objectives) {
  Logger.log(`🏗️ Building objective hierarchy from ${objectives.length} objectives...`);
  
  // Detect hierarchy field(s) used in this dataset
  const hierarchyField = detectHierarchyField(objectives);
  
  if (!hierarchyField) {
    Logger.log(`⚠️ No hierarchy field detected, returning flat structure`);
    return objectives.map(obj => ({
      ...obj,
      level: 0,
      children: [],
      hierarchicalIndex: objectives.indexOf(obj) + 1
    }));
  }
  
  Logger.log(`📊 Using hierarchy field: ${hierarchyField}`);
  
  // Create maps for quick lookup
  const objectiveMap = new Map();
  const childrenMap = new Map();
  
  // Initialize maps - preserve ALL original objective properties
  objectives.forEach(obj => {
    objectiveMap.set(obj.id, { 
      ...obj,  // Preserve ALL original properties including any existing associations
      level: 0, 
      children: [],
      // Preserve key results associations if they exist
      keyResults: obj.keyResults || []
    });
    childrenMap.set(obj.id, []);
  });
  
  // Build parent-child relationships
  const rootObjectives = [];
  let hierarchyStats = { levels: {}, orphans: 0, roots: 0 };
  
  // First, collect all parentIds to understand what's missing
  const allParentIds = new Set();
  const availableObjectiveIds = new Set(objectives.map(obj => obj.id));
  
  objectives.forEach(obj => {
    const parentId = obj[hierarchyField];
    if (parentId) {
      allParentIds.add(parentId);
    }
  });
  
  const missingParentIds = [...allParentIds].filter(parentId => !availableObjectiveIds.has(parentId));
  if (missingParentIds.length > 0) {
    Logger.log(`⚠️ Found ${missingParentIds.length} missing parent IDs: ${missingParentIds.join(', ')}`);
    Logger.log(`   These parents are referenced but not in current session - likely cross-session references`);
  }
  
  objectives.forEach(obj => {
    const parentId = obj[hierarchyField];
    
    if (parentId && objectiveMap.has(parentId)) {
      // This is a child objective
      childrenMap.get(parentId).push(obj.id);
      Logger.log(`   📎 "${obj.name}" is child of parent ID: ${parentId}`);
    } else if (parentId) {
      // Parent exists but not in this session - treat as orphan root
      Logger.log(`   🥸 "${obj.name}" has parent ${parentId} not in session - treating as orphan root`);
      Logger.log(`      (Parent might be in different session or archived)`);
      rootObjectives.push(obj.id);
      hierarchyStats.orphans++;
    } else {
      // No parent - this is a root objective
      rootObjectives.push(obj.id);
      hierarchyStats.roots++;
      Logger.log(`   🌳 "${obj.name}" is root objective (no parent field)`);
    }
  });
  
  // Set children arrays
  childrenMap.forEach((children, parentId) => {
    if (objectiveMap.has(parentId)) {
      objectiveMap.get(parentId).children = children;
    }
  });
  
  // Calculate levels and create hierarchical numbering
  const hierarchicalList = [];
  let globalIndex = 1;
  
  function processObjective(objId, level = 0, parentNumber = '') {
    const obj = objectiveMap.get(objId);
    if (!obj) return;
    
    obj.level = level;
    obj.hierarchicalIndex = parentNumber || globalIndex.toString();
    
    if (!parentNumber) globalIndex++;
    
    hierarchicalList.push(obj);
    hierarchyStats.levels[level] = (hierarchyStats.levels[level] || 0) + 1;
    
    Logger.log(`   ${'  '.repeat(level)}${obj.hierarchicalIndex}. "${obj.name}" (Level ${level})`);
    
    // Process children
    obj.children.forEach((childId, index) => {
      const childNumber = obj.hierarchicalIndex + '.' + (index + 1);
      processObjective(childId, level + 1, childNumber);
    });
  }
  
  // Process all root objectives
  rootObjectives.forEach(rootId => {
    processObjective(rootId, 0);
  });
  
  // Log hierarchy statistics
  Logger.log(`📈 Hierarchy Statistics:`);
  Logger.log(`   Roots: ${hierarchyStats.roots}, Orphans: ${hierarchyStats.orphans}`);
  Logger.log(`   Levels: ${JSON.stringify(hierarchyStats.levels)}`);
  Logger.log(`   Total processed: ${hierarchicalList.length}/${objectives.length}`);
  
  // Store orphan information for reporting
  hierarchyStats.orphanIds = missingParentIds;
  hierarchyStats.orphanObjectives = rootObjectives.filter(rootId => {
    const obj = objectiveMap.get(rootId);
    return obj && obj[hierarchyField]; // Has parent field but parent not found
  }).map(rootId => objectiveMap.get(rootId).name);
  
  return hierarchicalList;
}

/**
 * Detect which field is used for parent-child relationships
 */
function detectHierarchyField(objectives) {
  const possibleFields = ['parentId', 'parentGoalId', 'parentObjectiveId', 'parent', 'parentGoal'];
  
  for (const field of possibleFields) {
    const hasField = objectives.some(obj => obj.hasOwnProperty(field) && obj[field] != null);
    if (hasField) {
      Logger.log(`🔍 Detected hierarchy field: ${field}`);
      return field;
    }
  }
  
  return null;
}

/**
 * Calculate basic statistics from the data
 */
function calculateStats(data, config) {
  const { keyResults } = data;
  
  // Overall progress (average of all key result progress)
  const totalProgress = keyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0);
  const overallProgress = keyResults.length > 0 ? Math.round(totalProgress / keyResults.length) : 0;
  
  // Status breakdown
  const statusCounts = {};
  keyResults.forEach(kr => {
    const status = kr.status || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  // Recent updates (configurable lookback period)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.lookbackDays);
  
  const recentUpdates = keyResults.filter(kr => {
    if (!kr.lastModified) return false;
    return new Date(kr.lastModified) > cutoffDate;
  });
  
  // Calculate hierarchy statistics if hierarchical data is available
  let hierarchyStats = null;
  if (data.hierarchicalObjectives) {
    hierarchyStats = {
      levels: {},
      totalLevels: 0,
      rootObjectives: 0,
      leafObjectives: 0
    };
    
    data.hierarchicalObjectives.forEach(obj => {
      const level = obj.level || 0;
      hierarchyStats.levels[level] = (hierarchyStats.levels[level] || 0) + 1;
      hierarchyStats.totalLevels = Math.max(hierarchyStats.totalLevels, level + 1);
      
      if (level === 0) hierarchyStats.rootObjectives++;
      if (!obj.children || obj.children.length === 0) hierarchyStats.leafObjectives++;
    });
  }
  
  return {
    overallProgress,
    totalKeyResults: keyResults.length,
    totalObjectives: data.objectives.length,
    statusCounts,
    recentUpdates: recentUpdates.length,
    hierarchyStats
  };
}

/**
 * Generate a simple text sparkline from progress history
 */
function generateSparkline(progressHistory) {
  if (!progressHistory || progressHistory.length === 0) {
    return '—';
  }
  
  // Sort by date and get progress values
  const sortedHistory = progressHistory
    .filter(entry => entry.progress !== null && entry.progress !== undefined)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (sortedHistory.length === 0) {
    return '—';
  }
  
  // Sample points evenly across the history
  const points = [];
  const step = Math.max(1, Math.floor(sortedHistory.length / INTERNAL_CONFIG.SPARKLINE_LENGTH));
  
  for (let i = 0; i < sortedHistory.length; i += step) {
    if (points.length >= INTERNAL_CONFIG.SPARKLINE_LENGTH) break;
    points.push(sortedHistory[i].progress);
  }
  
  // If we have fewer points than desired, fill from the end
  if (points.length < INTERNAL_CONFIG.SPARKLINE_LENGTH && sortedHistory.length > 0) {
    const lastValue = sortedHistory[sortedHistory.length - 1].progress;
    while (points.length < INTERNAL_CONFIG.SPARKLINE_LENGTH) {
      points.push(lastValue);
    }
  }
  
  // Convert to sparkline characters
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;
  
  if (range === 0) {
    return '▄'.repeat(points.length); // Flat line
  }
  
  const sparklineChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  return points.map(value => {
    const normalized = (value - min) / range;
    const index = Math.min(sparklineChars.length - 1, Math.floor(normalized * sparklineChars.length));
    return sparklineChars[index];
  }).join('');
}

/**
 * Write the report to a Google Doc
 */
function writeReport(docId, data, stats, config) {
  Logger.log(`📄 Attempting to open Google Doc with ID: ${docId}`);
  
  let doc, body;
  
  try {
    doc = DocumentApp.openById(docId);
    Logger.log(`✅ Successfully opened document: ${doc.getName()}`);
    body = doc.getBody();
  } catch (docError) {
    Logger.log(`❌ Failed to open document with ID: ${docId}`);
    Logger.log(`Error details: ${docError.message}`);
    
    // Try to provide helpful suggestions
    if (docError.message.includes('failed while accessing document')) {
      Logger.log(`💡 Troubleshooting suggestions:`);
      Logger.log(`   1. Verify the document ID in your config.gs file`);
      Logger.log(`   2. Check that the document exists and is accessible`);
      Logger.log(`   3. Ensure the Apps Script has permission to access the document`);
      Logger.log(`   4. Try creating a new Google Doc and updating the GOOGLE_DOC_ID`);
      
      // Attempt to create a new document
      Logger.log(`🔧 Attempting to create a new document...`);
      try {
        doc = DocumentApp.create('Quantive Report - ' + new Date().toDateString());
        const newDocId = doc.getId();
        Logger.log(`✅ Created new document with ID: ${newDocId}`);
        Logger.log(`📝 Please update your config.gs with GOOGLE_DOC_ID: '${newDocId}'`);
        Logger.log(`🔗 Document URL: ${doc.getUrl()}`);
        
        body = doc.getBody();
      } catch (createError) {
        Logger.log(`❌ Failed to create new document: ${createError.message}`);
        throw new Error(`Cannot access document ${docId} and failed to create new document. ${docError.message}`);
      }
    } else {
      throw docError;
    }
  }
  
  // Ensure the document doesn't end with a list item before clearing
  body.appendParagraph('');
  
  // Clear existing content properly - now works because we don't end with a list item
  body.clear();
  
  // Title for multi-session reports
  const title = data.sessionCount > 1 
    ? `Quantive Multi-Session Report - ${data.sessionNames}`
    : `Quantive Report - ${data.sessions[0].name}`;
  const titleParagraph = body.appendParagraph(title);
  titleParagraph.setHeading(DocumentApp.ParagraphHeading.TITLE);
  
  // Timestamp and session info
  body.appendParagraph(`Generated: ${new Date().toLocaleString()}`);
  
  if (data.sessionCount > 1) {
    body.appendParagraph(`Sessions included: ${data.sessionCount}`);
    data.sessions.forEach((session, index) => {
      const sessionInfo = `   ${index + 1}. ${session.name || session.title} (ID: ${session.id})`;
      const sessionParagraph = body.appendParagraph(sessionInfo);
      sessionParagraph.setFontSize(10);
      sessionParagraph.setForegroundColor('#666666');
    });
  }
  
  body.appendParagraph(''); // Empty line
  
  // Summary section
  body.appendParagraph('Executive Summary').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  // Create a formatted summary table
  const summaryData = [
    ['Overall Progress', `${stats.overallProgress}%`],
    ['Total Objectives', `${stats.totalObjectives}`],
    ['Total Key Results', `${stats.totalKeyResults}`],
    ['Recent Updates', `${stats.recentUpdates} (last ${config.lookbackDays} days)`]
  ];
  
  // Add hierarchy information if available
  if (stats.hierarchyStats) {
    summaryData.push(['Hierarchy Levels', `${stats.hierarchyStats.totalLevels}`]);
    summaryData.push(['Root Objectives', `${stats.hierarchyStats.rootObjectives}`]);
    summaryData.push(['Leaf Objectives', `${stats.hierarchyStats.leafObjectives}`]);
  }
  
  summaryData.forEach(([label, value]) => {
    const summaryParagraph = body.appendParagraph(`${label}: ${value}`);
    summaryParagraph.setBold(true);
  });
  
  // Add detailed hierarchy breakdown if available
  if (stats.hierarchyStats) {
    body.appendParagraph(''); // Empty line
    body.appendParagraph('Hierarchy Breakdown:').setBold(true).setForegroundColor('#333333');
    
    Object.entries(stats.hierarchyStats.levels).forEach(([level, count]) => {
      const levelName = level === '0' ? 'Strategic' : level === '1' ? 'Tactical' : level === '2' ? 'Operational' : `Level ${level}`;
      const hierarchyParagraph = body.appendParagraph(`   ${levelName} (Level ${level}): ${count} objectives`);
      hierarchyParagraph.setForegroundColor('#666666');
      hierarchyParagraph.setFontSize(11);
    });
    
    // Add orphan information if there are any
    if (stats.hierarchyStats.orphanObjectives && stats.hierarchyStats.orphanObjectives.length > 0) {
      body.appendParagraph(''); // Empty line
      body.appendParagraph('Cross-Session References:').setBold(true).setForegroundColor('#ff8500');
      const orphanText = `   ${stats.hierarchyStats.orphanObjectives.length} objectives reference parents outside this session`;
      const orphanParagraph = body.appendParagraph(orphanText);
      orphanParagraph.setForegroundColor('#ff8500');
      orphanParagraph.setFontSize(10);
      orphanParagraph.setItalic(true);
      
      const noteText = `   (These are shown as root-level objectives but may be children in the broader organizational hierarchy)`;
      const noteParagraph = body.appendParagraph(noteText);
      noteParagraph.setForegroundColor('#999999');
      noteParagraph.setFontSize(9);
      noteParagraph.setItalic(true);
    }
  }
  
  body.appendParagraph(''); // Empty line
  
  // Status breakdown
  body.appendParagraph('Status Breakdown').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  if (Object.keys(stats.statusCounts).length > 0) {
    Object.entries(stats.statusCounts).forEach(([status, count]) => {
      const percentage = Math.round((count / stats.totalKeyResults) * 100);
      const statusParagraph = body.appendParagraph(`${status}: ${count} (${percentage}%)`);
      statusParagraph.setBold(true);
      
      // Add color coding based on status
      if (status.toLowerCase().includes('track') || status.toLowerCase().includes('completed')) {
        statusParagraph.setForegroundColor('#0d7377'); // Green
      } else if (status.toLowerCase().includes('risk')) {
        statusParagraph.setForegroundColor('#ff8500'); // Orange
      } else if (status.toLowerCase().includes('behind')) {
        statusParagraph.setForegroundColor('#d62828'); // Red
      }
    });
  } else {
    body.appendParagraph('No status information available').setItalic(true).setForegroundColor('#999999');
  }
  
  body.appendParagraph(''); // Empty line
  
  // Objectives list - using hierarchical structure
  body.appendParagraph('Objectives & Key Results').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  
  // Use hierarchical objectives if available, otherwise fall back to flat list
  const objectivesToProcess = data.hierarchicalObjectives || data.objectives.map(obj => ({ ...obj, level: 0, hierarchicalIndex: data.objectives.indexOf(obj) + 1 }));
  
  Logger.log(`📊 Processing ${objectivesToProcess.length} objectives (hierarchical: ${!!data.hierarchicalObjectives}) with ${data.keyResults.length} total key results`);
  
  // Debug key results associations before processing
  if (data.keyResults.length > 0) {
    Logger.log(`🔍 Key Results Association Debug:`);
    Logger.log(`   Sample KR structure: ${JSON.stringify(Object.keys(data.keyResults[0]))}`);
    const goalIdCount = data.keyResults.filter(kr => kr.goalId).length;
    Logger.log(`   KRs with goalId: ${goalIdCount}/${data.keyResults.length}`);
    
    // Show sample goalId values to verify they match objective IDs
    const sampleGoalIds = data.keyResults.slice(0, 5).map(kr => kr.goalId);
    Logger.log(`   Sample goalId values: ${sampleGoalIds.join(', ')}`);
    
    // Show sample objective IDs to compare
    const sampleObjectiveIds = objectivesToProcess.slice(0, 5).map(obj => obj.id);
    Logger.log(`   Sample objective IDs: ${sampleObjectiveIds.join(', ')}`);
    
    // Check for any matches
    const objectiveIdSet = new Set(objectivesToProcess.map(obj => obj.id));
    const goalIdSet = new Set(data.keyResults.map(kr => kr.goalId).filter(Boolean));
    const matchingIds = [...goalIdSet].filter(id => objectiveIdSet.has(id));
    Logger.log(`   Matching IDs: ${matchingIds.length} (${matchingIds.slice(0, 3).join(', ')})`);
    
    if (matchingIds.length === 0) {
      Logger.log(`   ❌ NO MATCHING IDs FOUND! This explains why no key results are showing up.`);
      Logger.log(`   All goalIds: ${[...goalIdSet].slice(0, 10).join(', ')}`);
      Logger.log(`   All objectiveIds: ${[...objectiveIdSet].slice(0, 10).join(', ')}`);
    }
  }
  
  objectivesToProcess.forEach((objective, index) => {
    // Simple and correct: filter by goalId (the actual API field)
    const objKeyResults = data.keyResults.filter(kr => kr.goalId === objective.id);
    
    Logger.log(`📋 ${' '.repeat(objective.level * 2)}${objective.hierarchicalIndex}. ${objective.name} (Level ${objective.level}) has ${objKeyResults.length} key results`);
    if (objKeyResults.length > 0) {
      objKeyResults.forEach((kr, krIndex) => {
        Logger.log(`${' '.repeat(objective.level * 2)}   ${krIndex + 1}. ${kr.name} (ID: ${kr.id})`);
      });
    }
    
    const objProgress = objKeyResults.length > 0 
      ? Math.round(objKeyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0) / objKeyResults.length)
      : objective.progress || 0;
    
    const sessionInfo = data.sessionCount > 1 ? ` | Session: ${objective.sessionName}` : '';
    
    // Add sparkline to objective if available
    const objSparklineText = objective.sparkline && objective.sparkline !== '—' ? ` ${objective.sparkline}` : '';
    
    // Create objective as list item
    const objListItem = body.appendListItem(`${objective.name} (Progress: ${objProgress}%${objSparklineText} | Owner: ${objective.ownerName || 'Unassigned'}${sessionInfo})`);
    objListItem.setGlyphType(DocumentApp.GlyphType.BULLET);
    
    // Apply nesting level for hierarchy
    const nestingLevel = objective.level || 0;
    if (nestingLevel > 0) {
      objListItem.setNestingLevel(nestingLevel);
    }
    
    // Make objective name bold
    const nameEndIndex = objective.name.length;
    objListItem.editAsText().setBold(0, nameEndIndex - 1, true);
    
    // Add description if available
    if (objective.description && objective.description.trim()) {
      const descriptionItem = body.appendListItem(`Description: ${objective.description}`);
      descriptionItem.setGlyphType(DocumentApp.GlyphType.HOLLOW_BULLET);
      descriptionItem.setNestingLevel(nestingLevel + 1);
      descriptionItem.editAsText().setItalic(true);
    }
    
    // Key Results as nested list items
    if (objKeyResults.length > 0) {
      objKeyResults.forEach((kr, krIndex) => {
        const krProgress = kr.progress || kr.attainment * 100 || 0;
        const krOwner = kr.ownerName || kr.objectiveOwner || 'Unassigned';
        const krDescription = kr.description ? ` - ${kr.description}` : '';
        const sparklineText = kr.sparkline && kr.sparkline !== '—' ? ` ${kr.sparkline}` : '';
        const krText = `${kr.name} (Progress: ${Math.round(krProgress)}%${sparklineText} | Owner: ${krOwner})${krDescription}`;
        
        const krListItem = body.appendListItem(krText);
        krListItem.setGlyphType(DocumentApp.GlyphType.HOLLOW_BULLET);
        krListItem.setNestingLevel(nestingLevel + 1);
        
        // Tasks as sub-list items under each key result
        if (kr.tasks && kr.tasks.length > 0) {
          kr.tasks.forEach((task, taskIndex) => {
            const taskOwner = task.ownerName || 'Unassigned';
            const taskStatus = task.status || task.state || 'Unknown';
            const taskDescription = task.description ? ` - ${task.description}` : '';
            const taskText = `${task.name || task.title} (Owner: ${taskOwner} | Status: ${taskStatus})${taskDescription}`;
            
            const taskListItem = body.appendListItem(taskText);
            taskListItem.setGlyphType(DocumentApp.GlyphType.SQUARE_BULLET);
            taskListItem.setNestingLevel(nestingLevel + 2);
          });
        } else {
          const noTasksItem = body.appendListItem('No tasks found');
          noTasksItem.setGlyphType(DocumentApp.GlyphType.SQUARE_BULLET);
          noTasksItem.setNestingLevel(nestingLevel + 2);
          noTasksItem.editAsText().setItalic(true);
        }
      });
    } else {
      const noKrItem = body.appendListItem('No key results found');
      noKrItem.setGlyphType(DocumentApp.GlyphType.HOLLOW_BULLET);
      noKrItem.setNestingLevel(nestingLevel + 1);
      noKrItem.editAsText().setItalic(true);
    }
  });
  
  // Validation: Count total key results processed
  let totalProcessed = 0;
  objectivesToProcess.forEach(objective => {
    const objKeyResults = data.keyResults.filter(kr => kr.goalId === objective.id);
    totalProcessed += objKeyResults.length;
  });
  
  // Hierarchy-aware validation and statistics
  if (data.hierarchicalObjectives) {
    const levelStats = {};
    data.hierarchicalObjectives.forEach(obj => {
      levelStats[obj.level] = (levelStats[obj.level] || 0) + 1;
    });
    
    Logger.log(`✅ Hierarchical Validation: Processed ${totalProcessed} key results across ${objectivesToProcess.length} objectives`);
    Logger.log(`📊 Hierarchy levels: ${JSON.stringify(levelStats)}`);
    Logger.log(`📊 Total key results in dataset: ${data.keyResults.length}`);
  } else {
    Logger.log(`✅ Flat Validation: Processed ${totalProcessed} key results across ${objectivesToProcess.length} objectives`);
    Logger.log(`📊 Total key results in dataset: ${data.keyResults.length}`);
  }
  
  if (totalProcessed !== data.keyResults.length) {
    Logger.log(`⚠️ Warning: Processed count (${totalProcessed}) doesn't match total count (${data.keyResults.length})`);
    Logger.log(`This could indicate duplicate key results or missing associations`);
  }
  
  Logger.log(`📄 Report written to Google Doc: ${doc.getUrl()}`);
}

/**
 * Setup function - run this once to configure the script
 */
function setup() {
  Logger.log('🔧 Setup Instructions:');
  Logger.log('');
  Logger.log('1. Copy config.example.gs to config.gs');
  Logger.log('2. Fill in your actual credentials in config.gs:');
  Logger.log('   - QUANTIVE_API_TOKEN: Your API token from Quantive');
  Logger.log('   - QUANTIVE_ACCOUNT_ID: Your account ID');
  Logger.log('   - SESSION_NAME: The name of the session (e.g., "Q4 2024 OKRs")');
  Logger.log('   - GOOGLE_DOC_ID: The Google Doc to write reports to');
  Logger.log('');
  Logger.log('3. Run listAvailableSessions() to see available session names');
  Logger.log('4. Run generateQuantiveReport() to test');
  Logger.log('5. Set up a trigger to run automatically (optional)');
  Logger.log('');
  Logger.log('✨ Features included:');
  Logger.log('   - Progress statistics and status breakdown');
  Logger.log('   - Recent activity tracking');
  Logger.log('   - Sparklines showing 14-day progress trends');
}

/**
 * Test API connectivity and authentication
 */
function testApiConnection() {
  try {
    const config = getConfig();
    
    const headers = {
      'Authorization': `Bearer ${config.apiToken}`,
      'Gtmhub-AccountId': config.accountId,
      'Content-Type': 'application/json'
    };
    
    Logger.log('🧪 Testing API connection...');
    Logger.log(`🔗 Base URL: ${config.baseUrl}`);
    Logger.log(`🏢 Account ID: ${config.accountId}`);
    Logger.log(`🔑 Token: ${config.apiToken.substring(0, 10)}...`);
    
    const sessionsUrl = `${config.baseUrl}/sessions`;
    const response = UrlFetchApp.fetch(sessionsUrl, { headers });
    const responseText = response.getContentText();
    
    Logger.log(`📊 Response status: ${response.getResponseCode()}`);
    Logger.log(`📄 Response preview: ${responseText.substring(0, 200)}...`);
    
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      Logger.log('❌ API returned HTML page - authentication likely failed');
      return false;
    }
    
    const data = JSON.parse(responseText);
    const sessions = data.items || data.sessions || data.data || data;
    
    Logger.log(`✅ API connection successful! Found ${sessions.length} sessions`);
    return true;
    
  } catch (error) {
    Logger.log(`❌ API connection failed: ${error.message}`);
    return false;
  }
}

/**
 * List available sessions (helpful for finding the right session name)
 */
function listAvailableSessions() {
  try {
    const config = getConfig();
    
    const headers = {
      'Authorization': `Bearer ${config.apiToken}`,
      'Gtmhub-AccountId': config.accountId,
      'Content-Type': 'application/json'
    };
    
    const sessionsUrl = `${config.baseUrl}/sessions`;
    const sessionsResponse = UrlFetchApp.fetch(sessionsUrl, { headers });
    const responseText = sessionsResponse.getContentText();
    const sessionsData = JSON.parse(responseText);
    
    // Handle different response formats
    let sessions;
    if (Array.isArray(sessionsData)) {
      sessions = sessionsData;
    } else if (sessionsData.items && Array.isArray(sessionsData.items)) {
      sessions = sessionsData.items;
    } else if (sessionsData.sessions && Array.isArray(sessionsData.sessions)) {
      sessions = sessionsData.sessions;
    } else if (sessionsData.data && Array.isArray(sessionsData.data)) {
      sessions = sessionsData.data;
    } else {
      throw new Error(`Unexpected sessions API response format. Expected array, got: ${typeof sessionsData}`);
    }
    
    Logger.log('📋 Available Sessions:');
    sessions.forEach((session, index) => {
      const name = session.name || session.title || 'Unnamed';
      const status = session.status || 'Unknown';
      Logger.log(`${index + 1}. "${name}" (${status})`);
    });
    
    return sessions;
    
  } catch (error) {
    Logger.log(`❌ Error listing sessions: ${error.message}`);
    throw error;
  }
}

/**
 * Log batch processing statistics for performance monitoring
 */
function logBatchStatistics(operation, batchResults, startTime) {
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  const stats = {
    operation: operation,
    totalRequests: batchResults.length,
    successfulRequests: batchResults.filter(r => r !== null).length,
    failedRequests: batchResults.filter(r => r === null).length,
    duration: duration,
    requestsPerSecond: batchResults.length / duration
  };
  
  const successRate = Math.round((stats.successfulRequests / stats.totalRequests) * 100);
  
  Logger.log(`📊 ${operation} Batch Statistics:`);
  Logger.log(`   Total Requests: ${stats.totalRequests}`);
  Logger.log(`   Successful: ${stats.successfulRequests}`);
  Logger.log(`   Failed: ${stats.failedRequests}`);
  Logger.log(`   Success Rate: ${successRate}%`);
  Logger.log(`   Duration: ${duration.toFixed(2)}s`);
  Logger.log(`   Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
  
  return stats;
}

/**
 * Performance test function - compares batch vs sequential processing
 */
function performanceTest() {
  Logger.log('🧪 Starting performance test...');
  
  try {
    const config = getConfig();
    
    // Test batch processing
    Logger.log('📊 Testing batch processing...');
    const batchStart = Date.now();
    const batchData = fetchSessionDataOptimized(config);
    const batchTime = (Date.now() - batchStart) / 1000;
    
    // Test sequential processing
    Logger.log('📞 Testing sequential processing...');
    const sequentialStart = Date.now();
    const sequentialData = fetchSessionDataSequential(config);
    const sequentialTime = (Date.now() - sequentialStart) / 1000;
    
    // Compare results
    const improvement = ((sequentialTime - batchTime) / sequentialTime) * 100;
    
    Logger.log('🏁 Performance Test Results:');
    Logger.log(`   Batch Processing: ${batchTime.toFixed(2)}s`);
    Logger.log(`   Sequential Processing: ${sequentialTime.toFixed(2)}s`);
    Logger.log(`   Improvement: ${improvement.toFixed(1)}%`);
    Logger.log(`   Time Saved: ${(sequentialTime - batchTime).toFixed(2)}s`);
    
    // Validate data consistency
    const dataConsistent = (
      batchData.objectives.length === sequentialData.objectives.length &&
      batchData.keyResults.length === sequentialData.keyResults.length
    );
    
    if (dataConsistent) {
      Logger.log('✅ Data consistency validated - both methods return same results');
    } else {
      Logger.log('⚠️ Data inconsistency detected between batch and sequential processing');
    }
    
    return {
      batchTime,
      sequentialTime,
      improvement,
      dataConsistent
    };
    
  } catch (error) {
    Logger.log(`❌ Performance test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Set up a weekly trigger (run this once)
 */
function setupWeeklyTrigger() {
  ScriptApp.newTrigger('generateQuantiveReport')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();
  
  Logger.log('✅ Weekly trigger set up for Mondays at 9 AM');
} 