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
 * Setup (no config file):
 * 1. Open the Apps Script editor → Project Settings → Script properties
 * 2. Add required properties: QUANTIVE_API_TOKEN, QUANTIVE_ACCOUNT_ID, SESSIONS
 * 3. Add at least one export target: GOOGLE_DOC_ID or TEXT_FILE_URL/TEXT_FILE_ID
 * 4. Run generateQuantiveReport() to test
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
  executeBatchRequests: (requests, config, chunkSize = 25) => {
    if (!requests || requests.length === 0) return [];
    
    const chunks = BatchProcessor.chunkRequests(requests, chunkSize);
    const allResponses = [];
    
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Convert request objects to the format expected by UrlFetchApp.fetchAll()
        const fetchAllRequests = chunk.map(req => ({
          url: req.url,
          ...req.options
        }));
        
        // Debug: Log the first request to verify format
        
        const chunkResponses = UrlFetchApp.fetchAll(fetchAllRequests);
        
        allResponses.push(...chunkResponses);
        
        // Minimal delay between chunks for performance
        if (i < chunks.length - 1) {
          Utilities.sleep(50);
        }
      } catch (error) {
        // Add null responses for failed chunk
        allResponses.push(...Array(chunk.length).fill(null));
      }
    }
    
    return allResponses;
  }
};

/**
 * Main function - generates a Quantive report
 * Minimal logging; optimized for Apps Script
 */
function generateQuantiveReport() {
  Logger.log('Starting Quantive report generation...');
  const config = getConfig();
  const sessionData = fetchSessionData(config);
  const stats = calculateStats(sessionData, config);
  if (config.googleDocId) {
    writeReport(config.googleDocId, sessionData, stats, config);
  }
  if (config.textFileId) {
    writePlainTextSnapshot(config.textFileId, sessionData, stats, config);
  }
  Logger.log('Report generated.');
}

/**
 * Build a plain text snapshot string (markdown-friendly)
 */
function buildPlainTextSnapshot(data, stats, config) {
  const lines = [];
  const title = data.sessionCount > 1
    ? `# Quantive Snapshot: ${data.sessionNames}`
    : `# Quantive Snapshot: ${data.sessions[0].name}`;
  lines.push(title);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push(`- Overall Progress: ${stats.overallProgress}%`);
  lines.push(`- Total Objectives: ${stats.totalObjectives}`);
  lines.push(`- Total Key Results: ${stats.totalKeyResults}`);
  lines.push(`- Recent Updates: ${stats.recentUpdates} (last ${config.lookbackDays} days)`);
  if (stats.hierarchyStats) {
    lines.push(`- Hierarchy Levels: ${stats.hierarchyStats.totalLevels}`);
    lines.push(`- Root Objectives: ${stats.hierarchyStats.rootObjectives}`);
    lines.push(`- Leaf Objectives: ${stats.hierarchyStats.leafObjectives}`);
  }
  lines.push('');
  lines.push('## Status Breakdown');
  Object.entries(stats.statusCounts || {}).forEach(([status, count]) => {
    const pct = stats.totalKeyResults > 0 ? Math.round((count / stats.totalKeyResults) * 100) : 0;
    lines.push(`- ${status}: ${count} (${pct}%)`);
  });
  lines.push('');
  lines.push('## Objectives & Key Results');
  const objectivesToProcess = data.hierarchicalObjectives || data.objectives.map((obj, i) => ({ ...obj, level: 0, hierarchicalIndex: i + 1 }));
  objectivesToProcess.forEach((objective) => {
    const indent = '  '.repeat(objective.level || 0);
    const objKeyResults = data.keyResults.filter(kr => kr.goalId === objective.id);
    const objProgress = objKeyResults.length > 0
      ? Math.round(objKeyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0) / objKeyResults.length)
      : objective.progress || 0;
    lines.push(`${indent}- ${objective.name} (Progress: ${objProgress}% | Owner: ${objective.ownerName || 'Unassigned'}${data.sessionCount > 1 ? ` | Session: ${objective.sessionName}` : ''})`);
    if (objective.description && objective.description.trim()) {
      lines.push(`${indent}  - Description: ${objective.description}`);
    }
    if (objKeyResults.length > 0) {
      objKeyResults.forEach((kr) => {
        const krProgress = kr.progress || kr.attainment * 100 || 0;
        const krOwner = kr.ownerName || kr.objectiveOwner || 'Unassigned';
        lines.push(`${indent}  - KR: ${kr.name} (Progress: ${Math.round(krProgress)}% | Owner: ${krOwner})`);
        if (kr.description && kr.description.trim()) {
          lines.push(`${indent}    - Note: ${kr.description}`);
        }
        if (kr.tasks && kr.tasks.length > 0) {
          kr.tasks.forEach(task => {
            const taskOwner = task.ownerName || 'Unassigned';
            const taskStatus = task.status || task.state || 'Unknown';
            lines.push(`${indent}    - Task: ${task.name || task.title} (Owner: ${taskOwner} | Status: ${taskStatus})`);
          });
        }
      });
    } else {
      lines.push(`${indent}  - Key Results: None`);
    }
  });
  lines.push('');
  return lines.join('\n');
}

/**
 * Overwrite a Drive text file with the snapshot content
 */
function writePlainTextSnapshot(fileId, data, stats, config) {
  try {
    const content = buildPlainTextSnapshot(data, stats, config);
    const file = DriveApp.getFileById(fileId);
    file.setContent(content);
    file.setName('quantive-snapshot.md');
    Logger.log(`Plain text snapshot written to file ID: ${fileId}`);
  } catch (e) {
    Logger.log(`Failed to write plain text snapshot: ${e.message}`);
    throw e;
  }
}

/**
 * Get configuration from Script Properties (no config.gs)
  * Required properties (Script Properties):
 *  - QUANTIVE_API_TOKEN
 *  - QUANTIVE_ACCOUNT_ID
 *  - SESSIONS (CSV or JSON array)
  *  - At least one export target: GOOGLE_DOC_ID or TEXT_FILE_URL/TEXT_FILE_ID
 * Optional:
 *  - QUANTIVE_BASE_URL (default https://app.us.quantive.com/results/api/v1)
 *  - LOOKBACK_DAYS (default 7)
 *  - TEXT_FILE_URL or TEXT_FILE_ID (for plain-text export)
 */
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  const get = (key) => (props.getProperty(key) || '').trim();

  const errors = [];

  const apiToken = get('QUANTIVE_API_TOKEN');
  if (!apiToken) errors.push('- QUANTIVE_API_TOKEN is missing');

  const accountId = get('QUANTIVE_ACCOUNT_ID');
  if (!accountId) errors.push('- QUANTIVE_ACCOUNT_ID is missing');

  const sessionsRaw = get('SESSIONS');
  let sessions = [];
  if (!sessionsRaw) {
    errors.push('- SESSIONS is missing (provide comma-separated names/UUIDs or a JSON array)');
  } else {
    try {
      if (sessionsRaw.trim().startsWith('[')) {
        const parsed = JSON.parse(sessionsRaw);
        if (Array.isArray(parsed)) sessions = parsed.map(String).map(s => s.trim()).filter(Boolean);
      } else {
        sessions = sessionsRaw.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch (e) {
      errors.push('- SESSIONS could not be parsed; use CSV or JSON array');
    }
  }

  const googleDocId = get('GOOGLE_DOC_ID');

  // Optional values
  const baseUrlStr = get('QUANTIVE_BASE_URL');
  const baseUrl = baseUrlStr || 'https://app.us.quantive.com/results/api/v1';
  if (baseUrlStr && !/^https?:\/\//i.test(baseUrlStr)) {
    errors.push('- QUANTIVE_BASE_URL must start with http(s)://');
  }

  const lookbackDaysStr = get('LOOKBACK_DAYS');
  let lookbackDays = 7;
  if (lookbackDaysStr) {
    if (!/^\d+$/.test(lookbackDaysStr)) {
      errors.push('- LOOKBACK_DAYS must be an integer');
    } else {
      lookbackDays = parseInt(lookbackDaysStr, 10);
      if (lookbackDays <= 0 || lookbackDays > 365) {
        errors.push('- LOOKBACK_DAYS must be between 1 and 365');
      }
    }
  }

  // Optional plain-text export support
  let textFileId = null;
  const textFileUrl = get('TEXT_FILE_URL');
  const textFileIdProp = get('TEXT_FILE_ID');
  if (textFileUrl) {
    textFileId = deriveDriveFileIdFromUrl(textFileUrl);
    if (!textFileId) {
      errors.push('- TEXT_FILE_URL could not be parsed into a Drive file ID. Use a standard sharing URL or set TEXT_FILE_ID directly');
    }
  }
  if (!textFileId && textFileIdProp) textFileId = textFileIdProp;
  if (textFileIdProp && !/^[A-Za-z0-9_-]{10,}$/.test(textFileIdProp)) {
    errors.push('- TEXT_FILE_ID does not look like a valid Drive file ID');
  }

  if (googleDocId && !/^[A-Za-z0-9_-]{10,}$/.test(googleDocId)) {
    errors.push('- GOOGLE_DOC_ID does not look like a valid Google Doc ID');
  }

  // Ensure at least one export target is configured
  if (!googleDocId && !textFileId) {
    errors.push('- Provide at least one export target: GOOGLE_DOC_ID or TEXT_FILE_URL/TEXT_FILE_ID');
  }

  if (errors.length > 0) {
    const help = [
      'Missing required configuration. Set Script Properties in Apps Script:',
      '  - Open Extensions → Apps Script',
      '  - In the editor, go to Project Settings → Script properties → Add property',
      '  - Required: QUANTIVE_API_TOKEN, QUANTIVE_ACCOUNT_ID, SESSIONS',
      '  - Also required: at least one export target (GOOGLE_DOC_ID or TEXT_FILE_URL/TEXT_FILE_ID)',
      '  - Optional: QUANTIVE_BASE_URL, LOOKBACK_DAYS',
      'Example values:',
      '  SESSIONS: Q3 2025, RHELBU Annual 2025  (CSV)  OR  ["Q3 2025","RHELBU Annual 2025"] (JSON)'
    ].join('\n');
    throw new Error(`${errors.join('\n')}
${help}`);
  }

  return {
    apiToken,
    accountId,
    sessions,
    googleDocId: googleDocId || null,
    baseUrl,
    lookbackDays,
    textFileId: textFileId || null
  };
}

/**
 * Derive Drive file ID from a sharing URL or return as-is if it's already an ID
 */
function deriveDriveFileIdFromUrl(urlOrId) {
  if (!urlOrId) return null;
  // If it looks like a bare ID (no slashes), return it
  if (!/\//.test(urlOrId) && /^[A-Za-z0-9_-]{10,}$/.test(urlOrId)) {
    return urlOrId;
  }
  // Common Drive URL formats
  // 1) https://drive.google.com/file/d/<ID>/view?usp=sharing
  let m = urlOrId.match(/\/file\/d\/([A-Za-z0-9_-]+)\//);
  if (m && m[1]) return m[1];
  // 2) https://drive.google.com/open?id=<ID>
  m = urlOrId.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (m && m[1]) return m[1];
  // 3) Any URL where the last path segment is the ID (fallback)
  try {
    const url = UrlFetchApp ? urlOrId : urlOrId; // keep linter happy
  } catch (e) {}
  const parts = urlOrId.split(/[/?#&=]/).filter(Boolean);
  const candidate = parts.find(p => /^[A-Za-z0-9_-]{10,}$/.test(p));
  return candidate || null;
}

/**
 * Fetch user display name by user ID
 * Now supports batch-fetched user map for better performance
 */
function fetchUserDisplayName(userId, config, userMap = null) {
  if (!userId) return 'Unassigned';
  
  // Check existing cache first
  if (USER_NAME_CACHE[userId]) {
    return USER_NAME_CACHE[userId];
  }
  
  // Use batch-fetched user map if available
  if (userMap && userMap[userId]) {
    USER_NAME_CACHE[userId] = userMap[userId];
    return userMap[userId];
  }
  
  const headers = {
    'Authorization': `Bearer ${config.apiToken}`,
    'Gtmhub-AccountId': config.accountId,
    'Content-Type': 'application/json'
  };
  
  try {
    const userUrl = `${config.baseUrl}/users/${userId}`;
    
    const userResponse = UrlFetchApp.fetch(userUrl, { 
      headers: headers,
      muteHttpExceptions: true 
    });
    
    const responseCode = userResponse.getResponseCode();
    const responseText = userResponse.getContentText();
    
    if (responseCode === 200) {
      const userData = JSON.parse(responseText);
      
      const displayName = userData.displayName || userData.name || userData.email || userData.firstName + ' ' + userData.lastName || `User ${userId}`;
      USER_NAME_CACHE[userId] = displayName;
      return displayName;
    } else {
      const fallbackName = `User ${userId}`;
      USER_NAME_CACHE[userId] = fallbackName;
      return fallbackName;
    }
  } catch (error) {
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
        } else {
          userMap[userId] = `User ${userId}`;
        }
      } catch (error) {
        userMap[userId] = `User ${userId}`;
      }
    } else {
      userMap[userId] = `User ${userId}`;
    }
  });
  
  Logger.log(`✅ Batch user fetching complete: ${Object.keys(userMap).length}/${uniqueUserIds.length} users resolved`);
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
        return [];
      }
      
      // Transform entries to standardized format
      const standardizedHistory = progressEntries.map(entry => ({
        date: entry.date || entry.createdDate || entry.timestamp,
        progress: entry.progress || entry.value || entry.percentage || 0
      })).filter(entry => entry.date); // Only include entries with valid dates
      
      return standardizedHistory;
      
    } else if (historyResponse.getResponseCode() === 404) {
      // No history found - this is normal for new metrics
      return [];
    } else {
      return [];
    }
  } catch (error) {
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
        } else {
          progressMap[metricId] = [];
        }
      } catch (error) {
        progressMap[metricId] = [];
      }
    } else if (response && response.getResponseCode() === 404) {
      // No history found - this is normal for new metrics
      progressMap[metricId] = [];
    } else {
      progressMap[metricId] = [];
    }
  });
  
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
    return [];
  }
  
  return tasks;
}

/**
 * Batch fetch tasks for multiple metric IDs
 * Now uses /metrics/{metricId} endpoint instead of problematic /tasks?metricId={metricId}
 */
function batchFetchTasks(metricIds, config) {
  if (!metricIds || metricIds.length === 0) return {};
  
  const uniqueMetricIds = [...new Set(metricIds.filter(id => id))];
  
  const requests = uniqueMetricIds.map(metricId => ({
    url: `${config.baseUrl}/metrics/${metricId}?expand=tasks`,
    options: { 
      headers: BatchProcessor.buildHeaders(config),
      muteHttpExceptions: true 
    }
  }));
  
  
  const responses = BatchProcessor.executeBatchRequests(requests, config);
  const tasksMap = {};
  
  responses.forEach((response, index) => {
    const metricId = uniqueMetricIds[index];
    if (response && response.getResponseCode() === 200) {
      try {
        const responseText = response.getContentText();
        if (!responseText.trim().startsWith('<!DOCTYPE') && !responseText.trim().startsWith('<html')) {
          const metricData = JSON.parse(responseText);
          
          // Extract tasks from metric response
          let tasks = [];
          if (metricData.tasks && Array.isArray(metricData.tasks)) {
            tasks = metricData.tasks;
          } else if (metricData.links && metricData.links.expanded && metricData.links.expanded.tasks && Array.isArray(metricData.links.expanded.tasks)) {
            tasks = metricData.links.expanded.tasks;
          } else {
            // If no tasks found, check tasksCount
            const taskCount = metricData.tasksCount || 0;
          }
          
          // Process tasks (similar to processTasks function)
          tasksMap[metricId] = tasks.map(task => ({
            ...task,
            ownerName: task.assignee?.name || task.assignee?.displayName || task.assignee?.email || 
                      task.owner?.name || task.owner?.displayName || task.owner?.email || 'Unassigned'
          }));
          
          const taskCount = tasksMap[metricId].length;
        } else {
          Logger.log(`⚠️ Received HTML error page for metric ${metricId}`);
          tasksMap[metricId] = [];
        }
      } catch (error) {
        Logger.log(`⚠️ Error parsing metric data for ${metricId}: ${error.message}`);
        tasksMap[metricId] = [];
      }
    } else {
      Logger.log(`⚠️ Could not fetch metric data for ${metricId}: ${response ? response.getResponseCode() : 'no response'}`);
      tasksMap[metricId] = [];
    }
  });
  
  return tasksMap;
}

/**
 * Fetch tasks for a given metric (key result)
 * Now uses /metrics/{metricId} endpoint instead of problematic /tasks?metricId={metricId}
 */
function fetchTasksForMetric(metricId, config) {
  if (!metricId) return [];
  
  const headers = {
    'Authorization': `Bearer ${config.apiToken}`,
    'Gtmhub-AccountId': config.accountId,
    'Content-Type': 'application/json'
  };
  
  try {
    // Try to get tasks from the metric endpoint with expand parameter
    const metricUrl = `${config.baseUrl}/metrics/${metricId}?expand=tasks`;
    
    const metricResponse = UrlFetchApp.fetch(metricUrl, { 
      headers: headers,
      muteHttpExceptions: true 
    });
    
    if (metricResponse.getResponseCode() === 200) {
      const metricResponseText = metricResponse.getContentText();
      const metricData = JSON.parse(metricResponseText);
      
      // First check if expand=tasks worked and tasks are included directly
      let tasks = [];
      if (metricData.tasks && Array.isArray(metricData.tasks)) {
        tasks = metricData.tasks;
      } else if (metricData.links && metricData.links.expanded && metricData.links.expanded.tasks && Array.isArray(metricData.links.expanded.tasks)) {
        tasks = metricData.links.expanded.tasks;
      } else {
        // If no tasks found, check tasksCount to see if we should expect any
        const taskCount = metricData.tasksCount || 0;
        
        if (taskCount > 0) {
          // Try the direct /metrics/{metricId} endpoint without expand
          const simpleMetricUrl = `${config.baseUrl}/metrics/${metricId}`;
          const simpleMetricResponse = UrlFetchApp.fetch(simpleMetricUrl, { 
            headers: headers,
            muteHttpExceptions: true 
          });
          
          if (simpleMetricResponse.getResponseCode() === 200) {
            const simpleMetricData = JSON.parse(simpleMetricResponse.getContentText());
            if (simpleMetricData.tasks && Array.isArray(simpleMetricData.tasks)) {
              tasks = simpleMetricData.tasks;
            }
          }
        }
      }
      
      // Process task owner names
      for (const task of tasks) {
        if (task.assignee && typeof task.assignee === 'object') {
          task.ownerName = task.assignee.name || task.assignee.displayName || task.assignee.email || 'Unassigned';
        } else if (task.owner && typeof task.owner === 'object') {
          task.ownerName = task.owner.name || task.owner.displayName || task.owner.email || 'Unassigned';
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
      Logger.log(`⚠️ Could not fetch metric data for ${metricId}: ${metricResponse.getResponseCode()}`);
      return [];
    }
  } catch (error) {
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
    
    // PERFORMANCE OPTIMIZATION: Skip task fetching entirely for speed
    // Tasks can be fetched later if needed via separate function
    const keyResultTasksMap = {};
    // Initialize all key results with empty task arrays for performance
    keyResultIds.forEach(krId => {
      keyResultTasksMap[krId] = []; // Empty arrays - tasks not fetched for performance
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
        
        const hierarchyFields = [];
        const sampleObj = sessionObjectives[0];
        ['parentId', 'parentGoalId', 'parentObjectiveId', 'parent', 'parentGoal'].forEach(field => {
          if (sampleObj.hasOwnProperty(field)) {
            hierarchyFields.push(field);
          }
        });
        
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
          
          // Update objective with detailed goal data using correct field names
          objective.name = goalData.name || objective.name;
          objective.description = goalData.description || objective.description || '';
          objective.progress = Math.round((goalData.attainment || 0) * 100); // attainment is 0-1, convert to percentage
          objective.status = goalData.closedStatus || objective.status;
          
          // Extract owner information - try embedded first, then fetch user display name
          if (goalData.assignee && typeof goalData.assignee === 'object') {
            objective.ownerName = goalData.assignee.name || goalData.assignee.displayName || goalData.assignee.email || 'Unassigned';
          } else if (goalData.owner && typeof goalData.owner === 'object') {
            objective.ownerName = goalData.owner.name || goalData.owner.displayName || goalData.owner.email || 'Unassigned';
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
          objective.progressHistory = fetchProgressHistory(objective.id, config);
          objective.sparkline = generateSparkline(objective.progressHistory);
          
          // Extract metrics from the correct field name
          if (goalData.metrics && Array.isArray(goalData.metrics)) {
            keyResults = goalData.metrics;
            
          } else {
            Logger.log(`⚠️ No metrics array found for objective "${objective.name}"`);
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
      } else if (kr.assignee && typeof kr.assignee === 'object') {
        kr.ownerName = kr.assignee.name || kr.assignee.displayName || kr.assignee.email || 'Unassigned';
      } else if (kr.ownerId) {
        kr.ownerName = fetchUserDisplayName(kr.ownerId, config);
      } else if (!kr.ownerName) {
        kr.ownerName = kr.objectiveOwner || 'Unassigned'; // Fallback to objective owner
      }
      
      // Check if this key result has tasks before fetching
      const taskCount = kr.taskCount || kr.tasksCount || 0;
      if (taskCount > 0) {
        kr.tasks = fetchTasksForMetric(kr.id, config);
      } else {
        kr.tasks = [];
      }
      
      // Fetch progress history and generate sparkline
      kr.progressHistory = fetchProgressHistory(kr.id, config);
      kr.sparkline = generateSparkline(kr.progressHistory);
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
  
  // Detect hierarchy field(s) used in this dataset
  const hierarchyField = detectHierarchyField(objectives);
  
  if (!hierarchyField) {
    return objectives.map(obj => ({
      ...obj,
      level: 0,
      children: [],
      hierarchicalIndex: objectives.indexOf(obj) + 1
    }));
  }
  
  
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
  let attempt = 0;
  const maxAttempts = 3;
  const retryDelay = 2000; // 2 seconds, to be safer

  while (attempt < maxAttempts) {
    try {
      doc = DocumentApp.openById(docId);
      Logger.log(`✅ Successfully opened document: ${doc.getName()} on attempt ${attempt + 1}`);
      body = doc.getBody();
      break; // Success, exit loop
    } catch (docError) {
      attempt++;
      Logger.log(`❌ Failed to open document with ID: ${docId} on attempt ${attempt}`);
      Logger.log(`   Error details: ${docError.message}`);
      if (attempt < maxAttempts) {
        Logger.log(`   Retrying in ${retryDelay / 1000} second(s)...`);
        Utilities.sleep(retryDelay);
      } else {
        Logger.log(`💡 Max retries reached. Troubleshooting suggestions:`);
        Logger.log(`   1. Verify the document ID in your config.gs file`);
        Logger.log(`   2. Check that the document exists and is accessible`);
        Logger.log(`   3. Ensure the Apps Script has permission to access the document`);
        Logger.log(`   4. Create a new Google Doc and update the GOOGLE_DOC_ID in your config`);
        throw new Error(`Cannot access document ${docId} after ${maxAttempts} attempts. ${docError.message}`);
      }
    }
  }
  
  // Ensure the document doesn't end with a list item before clearing
  body.appendParagraph('');
  
  // Clear existing content properly - now works because we don't end with a list item
  body.clear();
  
  // Title for multi-session reports
  const title = data.sessionCount > 1 
    ? `Quantive Report: ${data.sessionNames}`
    : `Quantive Report: ${data.sessions[0].name}`;
  const titleParagraph = body.appendParagraph(title);
  titleParagraph.setHeading(DocumentApp.ParagraphHeading.TITLE);
  
  body.appendParagraph(''); // Empty line
  
  // Generated timestamp
  const generatedParagraph = body.appendParagraph(`Generated: ${new Date().toLocaleString()}`);
  generatedParagraph.editAsText().setBold(0, 9, true); // Make "Generated:" bold
  
  // Sessions included
  const sessionText = data.sessionCount > 1 
    ? `Sessions Included: ${data.sessionNames}`
    : `Sessions Included: ${data.sessions[0].name}`;
  const sessionParagraph = body.appendParagraph(sessionText);
  sessionParagraph.editAsText().setBold(0, 17, true); // Make "Sessions Included:" bold
  
  body.appendParagraph(''); // Empty line
  
  // Horizontal rule (use underline for visual separation)
  const hrParagraph = body.appendParagraph('_______________________________________________________________________________');
  hrParagraph.setForegroundColor('#cccccc');
  
  body.appendParagraph(''); // Empty line
  
  // Summary section
  body.appendParagraph('Executive Summary').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  body.appendParagraph(''); // Empty line
  
  // Create bullet points with bold labels
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
    const summaryItem = body.appendListItem(`${label}: ${value}`);
    summaryItem.setGlyphType(DocumentApp.GlyphType.BULLET);
    // Make the label bold - using label.length + 1 to include the colon
    summaryItem.editAsText().setBold(0, label.length, true);
  });
  
  // Add detailed hierarchy breakdown if available
  if (stats.hierarchyStats) {
    body.appendParagraph(''); // Empty line
    body.appendParagraph('Hierarchy Breakdown').setHeading(DocumentApp.ParagraphHeading.HEADING3);
    
    body.appendParagraph(''); // Empty line
    
    Object.entries(stats.hierarchyStats.levels).forEach(([level, count]) => {
      const levelName = level === '0' ? 'Strategic' : level === '1' ? 'Tactical' : level === '2' ? 'Operational' : `Level ${level}`;
      const hierarchyItem = body.appendListItem(`${levelName} (Level ${level}): ${count} objectives`);
      hierarchyItem.setGlyphType(DocumentApp.GlyphType.BULLET);
      // Make the level name bold - be careful with index bounds
      if (levelName && levelName.length > 0) {
        hierarchyItem.editAsText().setBold(0, levelName.length - 1, true);
      }
    });
    
    // Add orphan information if there are any
    if (stats.hierarchyStats.orphanObjectives && stats.hierarchyStats.orphanObjectives.length > 0) {
      body.appendParagraph(''); // Empty line
      body.appendParagraph('Cross-Session References').setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(''); // Empty line
      
      const orphanItem = body.appendListItem(`${stats.hierarchyStats.orphanObjectives.length} objectives reference parents outside this session`);
      orphanItem.setGlyphType(DocumentApp.GlyphType.BULLET);
      orphanItem.setForegroundColor('#ff8500');
      orphanItem.setItalic(true);
      
      const noteItem = body.appendListItem('(These are shown as root-level objectives but may be children in the broader organizational hierarchy)');
      noteItem.setGlyphType(DocumentApp.GlyphType.BULLET);
      noteItem.setForegroundColor('#999999');
      noteItem.setFontSize(9);
      noteItem.setItalic(true);
    }
  }
  
  body.appendParagraph(''); // Empty line
  
  // Status breakdown
  body.appendParagraph('Status Breakdown').setHeading(DocumentApp.ParagraphHeading.HEADING3);
  
  body.appendParagraph(''); // Empty line
  
  if (Object.keys(stats.statusCounts).length > 0) {
    Object.entries(stats.statusCounts).forEach(([status, count]) => {
      const percentage = Math.round((count / stats.totalKeyResults) * 100);
      const statusItem = body.appendListItem(`${status}: ${count} (${percentage}%)`);
      statusItem.setGlyphType(DocumentApp.GlyphType.BULLET);
      // Make the status name bold - be careful with index bounds
      if (status && status.length > 0) {
        statusItem.editAsText().setBold(0, status.length - 1, true);
      }
      
      // Add color coding based on status
      if (status.toLowerCase().includes('track') || status.toLowerCase().includes('completed')) {
        statusItem.setForegroundColor('#0d7377'); // Green
      } else if (status.toLowerCase().includes('risk')) {
        statusItem.setForegroundColor('#ff8500'); // Orange
      } else if (status.toLowerCase().includes('behind')) {
        statusItem.setForegroundColor('#d62828'); // Red
      }
    });
  } else {
    const noStatusItem = body.appendListItem('No status information available');
    noStatusItem.setGlyphType(DocumentApp.GlyphType.BULLET);
    noStatusItem.setItalic(true);
    noStatusItem.setForegroundColor('#999999');
  }
  
  body.appendParagraph(''); // Empty line
  
  // Horizontal rule (use underline for visual separation)
  const hrParagraph2 = body.appendParagraph('_______________________________________________________________________________');
  hrParagraph2.setForegroundColor('#cccccc');
  
  body.appendParagraph(''); // Empty line
  
  // Objectives list - using hierarchical structure
  body.appendParagraph('Objectives & Key Results').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  
  // Use hierarchical objectives if available, otherwise fall back to flat list
  const objectivesToProcess = data.hierarchicalObjectives || data.objectives.map(obj => ({ ...obj, level: 0, hierarchicalIndex: data.objectives.indexOf(obj) + 1 }));
  
  
  body.appendParagraph(''); // Empty line
  
  objectivesToProcess.forEach((objective, index) => {
    // Simple and correct: filter by goalId (the actual API field)
    const objKeyResults = data.keyResults.filter(kr => kr.goalId === objective.id);
    
    const objProgress = objKeyResults.length > 0 
      ? Math.round(objKeyResults.reduce((sum, kr) => sum + (kr.progress || 0), 0) / objKeyResults.length)
      : objective.progress || 0;
    
    // Create objective as H3 heading
    const objHeading = body.appendParagraph(objective.name);
    objHeading.setHeading(DocumentApp.ParagraphHeading.HEADING3);
    
    // Add metadata as bullet points
    const ownerItem = body.appendListItem(`Owner: ${objective.ownerName || 'Unassigned'}`);
    ownerItem.setGlyphType(DocumentApp.GlyphType.BULLET);
    ownerItem.editAsText().setBold(0, 5, true); // Make "Owner:" bold
    
    if (data.sessionCount > 1) {
      const sessionItem = body.appendListItem(`Session: ${objective.sessionName}`);
      sessionItem.setGlyphType(DocumentApp.GlyphType.BULLET);
      sessionItem.editAsText().setBold(0, 6, true); // Make "Session:" bold
    }
    
    const progressItem = body.appendListItem(`Progress: ${objProgress}%`);
    progressItem.setGlyphType(DocumentApp.GlyphType.BULLET);
    progressItem.editAsText().setBold(0, 7, true); // Make "Progress:" bold
    
    // Add description if available
    if (objective.description && objective.description.trim()) {
      const descriptionItem = body.appendListItem(`Description: ${objective.description}`);
      descriptionItem.setGlyphType(DocumentApp.GlyphType.BULLET);
      descriptionItem.editAsText().setBold(0, 10, true); // Make "Description:" bold
    }
    
    // Key Results section
    if (objKeyResults.length > 0) {
      const keyResultsItem = body.appendListItem('Key Results:');
      keyResultsItem.setGlyphType(DocumentApp.GlyphType.BULLET);
      keyResultsItem.editAsText().setBold(0, 10, true); // Make "Key Results:" bold
      
      objKeyResults.forEach((kr, krIndex) => {
        const krProgress = kr.progress || kr.attainment * 100 || 0;
        const krOwner = kr.ownerName || kr.objectiveOwner || 'Unassigned';
        
        // Key Result as nested bullet
        const krItem = body.appendListItem(`${kr.name}`);
        krItem.setGlyphType(DocumentApp.GlyphType.BULLET);
        krItem.setNestingLevel(1);
        // Make KR name bold - check bounds to avoid errors
        if (kr.name && kr.name.length > 0) {
          krItem.editAsText().setBold(0, kr.name.length - 1, true);
        }
        
        // KR Owner
        const krOwnerItem = body.appendListItem(`Owner: ${krOwner}`);
        krOwnerItem.setGlyphType(DocumentApp.GlyphType.BULLET);
        krOwnerItem.setNestingLevel(2);
        krOwnerItem.editAsText().setBold(0, 5, true); // Make "Owner:" bold
        
        // KR Progress
        const krProgressItem = body.appendListItem(`Progress: ${Math.round(krProgress)}%`);
        krProgressItem.setGlyphType(DocumentApp.GlyphType.BULLET);
        krProgressItem.setNestingLevel(2);
        krProgressItem.editAsText().setBold(0, 7, true); // Make "Progress:" bold
        
        // KR Description/Note if available
        if (kr.description && kr.description.trim()) {
          const krNoteItem = body.appendListItem(`Note: ${kr.description}`);
          krNoteItem.setGlyphType(DocumentApp.GlyphType.BULLET);
          krNoteItem.setNestingLevel(2);
          krNoteItem.editAsText().setBold(0, 3, true); // Make "Note:" bold
        }
        
        // Tasks as sub-bullets under each key result (if any)
        if (kr.tasks && kr.tasks.length > 0) {
          kr.tasks.forEach((task, taskIndex) => {
            const taskOwner = task.ownerName || 'Unassigned';
            const taskStatus = task.status || task.state || 'Unknown';
            const taskDescription = task.description ? ` - ${task.description}` : '';
            const taskText = `${task.name || task.title} (Owner: ${taskOwner} | Status: ${taskStatus})${taskDescription}`;
            
            const taskItem = body.appendListItem(taskText);
            taskItem.setGlyphType(DocumentApp.GlyphType.BULLET);
            taskItem.setNestingLevel(3);
            taskItem.setFontSize(9);
            taskItem.setForegroundColor('#666666');
          });
        }
      });
    } else {
      const noKrItem = body.appendListItem('Key Results: None');
      noKrItem.setGlyphType(DocumentApp.GlyphType.BULLET);
      noKrItem.editAsText().setBold(0, 10, true); // Make "Key Results:" bold
    }
    
    body.appendParagraph(''); // Empty line after each objective
  });
  
  
  const docUrl = doc.getUrl();
  const documentId = doc.getId();
  Logger.log(`📄 Report written to Google Doc:`);
  Logger.log(`   Document ID: ${documentId}`);
  Logger.log(`   Document URL: ${docUrl}`);
}

/**
 * Setup function - run this once to configure the script
 */
function setup() {
  Logger.log('🔧 Setup Instructions (no config files):');
  Logger.log('');
  Logger.log('1. Open Project Settings → Script properties and add:');
  Logger.log('   - QUANTIVE_API_TOKEN: Your API token from Quantive');
  Logger.log('   - QUANTIVE_ACCOUNT_ID: Your account ID');
  Logger.log('   - SESSIONS: CSV or JSON array of session names/UUIDs');
  Logger.log('   - Export target: GOOGLE_DOC_ID or TEXT_FILE_URL/TEXT_FILE_ID');
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