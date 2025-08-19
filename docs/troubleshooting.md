# Troubleshooting Guide

This guide provides solutions for common issues encountered with the Quantive Export tool, organized by category with step-by-step resolution procedures.

## Quick Diagnostic Commands

Before diving into specific issues, run these diagnostic commands to gather information:

### Google Apps Script Environment
```javascript
// Test API connectivity
testApiConnection()

// List available sessions  
listAvailableSessions()

// Validate configuration
// Check execution logs for configuration validation results
```

### Local Development Environment
```bash
# Test API connection
npm run test-api

# List available sessions
npm run list-sessions

# Run performance test
npm run performance-test

# Generate debug output
npm run debug
```

## Authentication & Configuration Issues

### Issue: "Invalid API token" or "Unauthorized" errors

#### Symptoms
- Error messages containing "401 Unauthorized"
- "Invalid API token format" messages
- API requests failing immediately

#### Root Causes
- API token copied incorrectly (extra spaces, truncation)
- API token expired or revoked
- Incorrect Account ID
- API access disabled in Quantive

#### Resolution Steps
1. **Verify API Token Format**:
   ```javascript
   // API token should be alphanumeric with dashes/underscores
   // Length should be 20+ characters
   // Should NOT contain "your-token-here" or similar placeholders
   ```

2. **Re-generate API Token**:
   - Log into Quantive
   - Go to Settings → Integrations
   - Generate new API token
   - Copy entire token without extra spaces

3. **Verify Account ID**:
   - Check Quantive URL: `https://app.us.quantive.com/results/[ACCOUNT_ID]/...`
   - Ensure Account ID doesn't contain placeholder text
   - Account ID should be UUID format or alphanumeric string

4. **Update Configuration**:
   ```javascript
   // Google Apps Script: Update Script Properties
   // QUANTIVE_API_TOKEN: [new token]
   // QUANTIVE_ACCOUNT_ID: [verified account ID]
   
   // Local Development: Update .env file
   QUANTIVE_API_TOKEN=your_new_token_here
   QUANTIVE_ACCOUNT_ID=your_account_id_here
   ```

5. **Test Configuration**:
   ```javascript
   // Run testApiConnection() to verify fixes
   testApiConnection()
   ```

### Issue: "Session not found" or "Session not accessible"

#### Symptoms
- "Session with name 'X' not found"
- "No accessible sessions found"
- Empty session list

#### Root Causes
- Session name typos or case mismatches
- User lacks access permissions to specified sessions
- Session names changed in Quantive
- Sessions are archived or deleted

#### Resolution Steps
1. **List Available Sessions**:
   ```javascript
   // Google Apps Script
   listAvailableSessions()
   
   // Local Development
   npm run list-sessions
   ```

2. **Verify Session Names**:
   - Check exact spelling and capitalization
   - Look for special characters or extra spaces
   - Note that session name resolution is case-insensitive but exact matching is preferred

3. **Update Session Configuration**:
   ```javascript
   // Use exact session names from listAvailableSessions()
   // Script Properties or .env:
   SESSIONS=Q4 2024 OKRs,Annual Planning 2025
   
   // Alternative: Use UUIDs directly
   SESSIONS=66c65f12-1234-5678-9abc-def012345678,another-uuid
   ```

4. **Check Permissions**:
   - Verify you have read access to target sessions in Quantive
   - Contact Quantive admin if sessions should be accessible but aren't listed

### Issue: Configuration validation failures

#### Symptoms
- "Invalid configuration" errors during startup
- Missing required properties warnings
- Placeholder detection errors

#### Resolution Steps
1. **Check Required Properties**:
   ```javascript
   // Required in Script Properties or .env:
   QUANTIVE_API_TOKEN=actual_token_here
   QUANTIVE_ACCOUNT_ID=actual_account_id
   SESSIONS=session_name_or_uuid
   
   // At least one output target:
   GOOGLE_DOC_ID=document_id_here
   // OR
   TEXT_FILE_ID=drive_file_id_here
   // OR  
   TEXT_FILE_URL=drive_sharing_url_here
   ```

2. **Verify Property Names**:
   - Property names are case-sensitive
   - No typos in property names
   - No leading/trailing spaces

3. **Check for Placeholders**:
   - Remove any placeholder text like "your-token-here"
   - Replace with actual values

## Performance & Execution Issues

### Issue: Execution timeout or very slow processing

#### Symptoms
- Google Apps Script execution timeout (6-minute limit exceeded)
- Processing takes much longer than expected
- "Script timed out" errors

#### Root Causes
- Large sessions without performance optimizations enabled
- Network connectivity issues
- API rate limiting
- Inefficient processing configuration

#### Resolution Steps
1. **Enable Performance Optimizations**:
   ```javascript
   // In Code.gs, verify PERFORMANCE_MODE settings:
   const PERFORMANCE_MODE = {
     SKIP_PROGRESS_HISTORY: true,     // Major speedup
     SKIP_SPARKLINES: true,           // Skip sparkline generation  
     SKIP_KR_PROGRESS_HISTORY: true, // Skip detailed progress history
     USE_BULK_USER_FETCH: true       // Use bulk user API calls
   };
   ```

2. **Reduce Session Scope**:
   - Process fewer sessions simultaneously
   - Split large sessions across multiple executions
   - Use time-based filtering if available

3. **Check Network Connectivity**:
   ```bash
   # Local testing
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        -H "Gtmhub-AccountId: YOUR_ACCOUNT_ID" \
        https://app.us.quantive.com/results/api/v1/accounts/YOUR_ACCOUNT_ID/sessions
   ```

4. **Monitor API Rate Limits**:
   - Check execution logs for rate limit warnings
   - Increase delays between API calls if needed
   - Consider processing during off-peak hours

### Issue: Memory or resource errors

#### Symptoms
- "Exceeded maximum execution time"
- "Script exceeded memory limit"
- Incomplete processing with partial results

#### Resolution Steps
1. **Optimize Data Processing**:
   - Enable bulk user fetching to reduce API calls
   - Process data in smaller chunks
   - Clear unnecessary variables during processing

2. **Use Progressive Processing**:
   ```javascript
   // Process objectives in batches
   const BATCH_SIZE = 50;
   for (let i = 0; i < objectives.length; i += BATCH_SIZE) {
     const batch = objectives.slice(i, i + BATCH_SIZE);
     processBatch(batch);
     // Allow garbage collection between batches
   }
   ```

## Output & Reporting Issues

### Issue: Cannot write to Google Docs or Drive files

#### Symptoms
- "Permission denied" errors when writing to documents
- "File not found" errors
- Output documents not being updated

#### Root Causes
- Incorrect document/file IDs
- Missing permissions to target documents
- Documents moved or deleted
- Apps Script lacking necessary OAuth permissions

#### Resolution Steps
1. **Verify Document IDs**:
   ```javascript
   // Google Doc ID from URL:
   // https://docs.google.com/document/d/[DOCUMENT_ID]/edit
   
   // Drive File ID from URL:
   // https://drive.google.com/file/d/[FILE_ID]/view
   ```

2. **Check Document Permissions**:
   - Ensure the Google account running the script has edit access
   - For shared documents, verify sharing settings
   - Test opening documents in browser with same account

3. **Update OAuth Permissions**:
   - In Apps Script editor, go to Project Settings
   - Review OAuth scopes
   - Re-authorize if prompted during execution

4. **Test Document Access**:
   ```javascript
   // Test Google Doc access
   const doc = DocumentApp.openById('YOUR_DOCUMENT_ID');
   Logger.log('Document title: ' + doc.getName());
   
   // Test Drive file access
   const file = DriveApp.getFileById('YOUR_FILE_ID');
   Logger.log('File name: ' + file.getName());
   ```

### Issue: Malformed or incomplete report output

#### Symptoms
- Missing sections in generated reports
- Formatting issues in Google Docs
- Empty or truncated markdown files
- Data inconsistencies

#### Resolution Steps
1. **Check Data Processing**:
   - Verify all sessions are being processed
   - Check for partial failures in execution logs
   - Ensure all required data is available

2. **Review Output Configuration**:
   - Confirm output targets are properly configured
   - Check template formatting in code
   - Verify data transformation logic

3. **Enable Debug Logging**:
   ```javascript
   // Add temporary logging to identify issues
   Logger.log('Processing session: ' + sessionName);
   Logger.log('Found objectives: ' + objectives.length);
   Logger.log('Generated content length: ' + content.length);
   ```

## Deployment Issues

### Issue: GitHub Actions deployment failures

#### Symptoms
- GitHub Actions workflow failing
- "Authentication failed" in Actions logs
- "Permission denied" during deployment

#### Root Causes
- Invalid or expired GitHub secrets
- Incorrect clasp configuration
- Missing permissions in Google Apps Script project

#### Resolution Steps
1. **Update GitHub Secrets**:
   ```bash
   # Get fresh authentication files
   clasp logout
   clasp login
   
   # Copy updated files to GitHub secrets
   cat ~/.clasprc.json  # Copy to CLASPRC_JSON secret
   cat .clasp.json      # Copy to CLASP_JSON secret
   ```

2. **Verify Clasp Configuration**:
   ```bash
   # Test clasp locally
   clasp status
   clasp push --dry-run
   ```

3. **Check Apps Script Permissions**:
   - Ensure Google account has edit access to target project
   - Verify Apps Script API is enabled
   - Check project sharing settings

### Issue: Manual deployment problems

#### Symptoms
- Copy/paste errors when updating Code.gs
- Configuration issues after deployment
- Performance regression after updates

#### Resolution Steps
1. **Systematic Deployment Process**:
   - Copy entire Code.gs content (check for truncation)
   - Verify all functions are present after pasting
   - Test with `testApiConnection()` immediately after deployment

2. **Configuration Backup and Restore**:
   ```javascript
   // Before deployment, document current Script Properties
   // After deployment, verify all properties are still configured
   ```

3. **Gradual Testing**:
   - Test with single small session first
   - Gradually increase complexity
   - Monitor execution times and logs

## API Integration Issues

### Issue: Rate limiting errors

#### Symptoms
- "Rate limit exceeded" errors
- 429 HTTP status codes
- Intermittent API failures

#### Resolution Steps
1. **Implement Proper Rate Limiting**:
   ```javascript
   // Increase delays between API calls
   const delay = 100; // milliseconds between requests
   Utilities.sleep(delay);
   ```

2. **Use Batch Processing Effectively**:
   - Ensure batch processing is enabled
   - Use appropriate chunk sizes (25 requests per batch)
   - Implement exponential backoff for retries

3. **Monitor API Usage**:
   - Track API call patterns in logs
   - Identify peak usage periods
   - Consider processing during off-peak hours

### Issue: Inconsistent API responses

#### Symptoms
- Varying data structure in API responses
- Missing fields or properties
- Unexpected null values

#### Resolution Steps
1. **Implement Robust Data Validation**:
   ```javascript
   function validateApiResponse(data) {
     if (!data || typeof data !== 'object') {
       throw new Error('Invalid API response format');
     }
     // Add specific field validation
   }
   ```

2. **Handle Optional Fields Gracefully**:
   ```javascript
   const displayName = user.displayName || user.name || `User ${user.id}`;
   const progress = objective.progress?.percentage || 0;
   ```

3. **Log Unexpected Data Structures**:
   ```javascript
   if (!expectedField) {
     Logger.log('Warning: Expected field missing in: ' + JSON.stringify(data));
   }
   ```

## Local Development Issues

### Issue: Local debugging environment not working

#### Symptoms
- npm commands failing
- Mock services not functioning
- API calls not working locally

#### Resolution Steps
1. **Check Node.js Installation**:
   ```bash
   node --version  # Should be 14+
   npm --version
   ```

2. **Verify Environment Setup**:
   ```bash
   # Check .env file exists and has correct format
   cat .env
   
   # Verify required dependencies
   npm list
   ```

3. **Test Individual Components**:
   ```bash
   # Test API connectivity
   npm run test-api
   
   # Test session listing
   npm run list-sessions
   
   # Check curl availability
   which curl
   ```

### Issue: Environment variable issues

#### Symptoms
- "Environment variable not found" errors
- Configuration values not being read
- Inconsistent behavior between local and production

#### Resolution Steps
1. **Verify .env File Format**:
   ```bash
   # Correct format (no spaces around =)
   QUANTIVE_API_TOKEN=your_token_here
   QUANTIVE_ACCOUNT_ID=your_account_id
   
   # Incorrect format
   QUANTIVE_API_TOKEN = your_token_here  # No spaces!
   ```

2. **Check File Permissions**:
   ```bash
   ls -la .env
   # Should be readable by current user
   ```

3. **Test Environment Loading**:
   ```bash
   node -e "require('dotenv').config(); console.log(process.env.QUANTIVE_API_TOKEN);"
   ```

## Data Quality Issues

### Issue: Missing or incorrect user names

#### Symptoms
- User IDs displayed instead of names
- "User not found" messages
- Inconsistent user information

#### Resolution Steps
1. **Verify Bulk User Fetching**:
   ```javascript
   // Ensure USE_BULK_USER_FETCH is enabled
   const PERFORMANCE_MODE = {
     USE_BULK_USER_FETCH: true
   };
   ```

2. **Check User API Responses**:
   - Verify users API endpoint is accessible
   - Check for pagination issues with large user lists
   - Ensure user objects contain expected fields

3. **Implement Fallback Logic**:
   ```javascript
   function resolveUserName(userId, userMap) {
     const user = userMap.get(userId);
     if (user) {
       return user.displayName || user.name || user.email;
     }
     return `User ${userId}`;  // Fallback display
   }
   ```

## Performance Optimization

### Issue: Suboptimal performance despite optimizations

#### Symptoms
- Execution times longer than benchmarks
- High API call counts
- Memory usage warnings

#### Diagnostic Steps
1. **Run Performance Comparison**:
   ```bash
   # Local environment
   npm run performance-test
   ```

2. **Analyze Execution Logs**:
   - Check batch processing success rates
   - Monitor API call patterns
   - Identify bottlenecks in processing pipeline

3. **Profile Data Processing**:
   ```javascript
   const startTime = new Date().getTime();
   // ... processing logic ...
   const duration = new Date().getTime() - startTime;
   Logger.log(`Operation took ${duration}ms`);
   ```

#### Optimization Steps
1. **Enable All Performance Features**:
   - Bulk user fetching
   - Progress history skipping
   - Batch API processing

2. **Optimize Data Structures**:
   - Use Map objects for lookups
   - Minimize array iterations
   - Clear unnecessary variables

3. **Tune Batch Sizes**:
   - Test different chunk sizes for your data
   - Monitor success rates vs performance
   - Adjust delays between batches

## Escalation Procedures

### When to Escalate Issues

#### Critical Issues (Immediate Escalation)
- Security vulnerabilities or credential exposure
- Complete system failure affecting production
- Data integrity issues or corruption

#### High Priority Issues (Escalate within 24 hours)
- Performance degradation > 50% from baseline
- Authentication failures affecting multiple users
- Output generation completely failing

#### Medium Priority Issues (Escalate within 72 hours)
- Intermittent failures or reliability issues
- Minor data quality problems
- Non-critical feature malfunctions

### Escalation Information to Gather

Before escalating, collect:
1. **Error Messages**: Exact text of error messages
2. **Execution Logs**: Complete logs from failed executions
3. **Configuration**: Sanitized configuration details (no credentials)
4. **Environment**: Google Apps Script vs local development
5. **Data Scope**: Session sizes and types being processed
6. **Timing**: When issue started, frequency, patterns

### Support Contacts

For issues requiring escalation:
1. **GitHub Issues**: Create detailed issue in project repository
2. **Documentation Updates**: Submit pull requests for documentation improvements
3. **Feature Requests**: Use GitHub discussions for enhancement requests

Remember to sanitize all logs and information before sharing - remove API tokens, account IDs, and other sensitive data.

## Preventive Maintenance

### Regular Health Checks

#### Weekly Checks
- Review execution logs for any warnings or errors
- Monitor execution times for performance degradation
- Verify output quality in generated reports

#### Monthly Checks
- Update API tokens according to security policy
- Review and optimize Script Properties configuration
- Test disaster recovery procedures

#### Quarterly Checks
- Performance benchmark testing
- Security audit of configurations and permissions
- Documentation updates for any changes

### Monitoring Best Practices

1. **Set up email notifications** for execution failures
2. **Monitor execution time trends** to detect degradation
3. **Review output documents** periodically for data accuracy
4. **Keep track of API usage** to avoid rate limits

By following this troubleshooting guide, most common issues can be resolved quickly and effectively. For complex or persistent problems, gather diagnostic information and escalate following the procedures outlined above.