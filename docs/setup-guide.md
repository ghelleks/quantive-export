# Setup Guide

This guide provides complete setup instructions for the Quantive Export tool, from credential acquisition to first report generation.

## Prerequisites

Before starting, ensure you have:
- **Google Workspace account** with Google Apps Script access
- **Quantive account** with API access permissions
- **Admin access** to your Quantive workspace (for API token generation)

## Step 1: Obtain Quantive Credentials

### API Token Generation
1. Log into your Quantive account
2. Navigate to **Settings → Integrations** 
3. Click **Generate API Token**
4. Copy and securely store the token (it won't be shown again)

### Account ID Location
Your Account ID can be found in:
- **Quantive URL**: `https://app.us.quantive.com/results/[YOUR_ACCOUNT_ID]/...`
- **Account Settings**: Look for "Organization ID" or "Account ID"
- **API responses**: Found in most API endpoint responses

### Session Identification
You can use either:
- **Session Names**: User-friendly names like "Q4 2024", "Annual Planning 2025"
- **Session UUIDs**: Direct UUID identifiers from Quantive

The tool automatically resolves session names to UUIDs, making configuration more user-friendly.

## Step 2: Google Apps Script Setup

### Create Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Replace default code with contents of `Code.gs` from this repository
4. Give your project a descriptive name (e.g., "Quantive OKR Reports")

### Alternative: Use Clasp for Automated Deployment
If you prefer automated deployment from GitHub:
1. See [Deployment Guide](deployment-guide.md) for clasp setup
2. This enables automatic updates when code changes

## Step 3: Configuration

For detailed configuration architecture and security considerations, see [ADR-006: Configuration Management](adr/ADR-006-configuration-management.md).

### Script Properties Configuration
In the Apps Script editor:
1. Go to **Project Settings** (gear icon)
2. Scroll to **Script properties**
3. Add the following properties:

#### Required Properties

| Property | Value | Description |
|----------|--------|-------------|
| `QUANTIVE_API_TOKEN` | `your-api-token-here` | API token from Step 1 |
| `QUANTIVE_ACCOUNT_ID` | `your-account-id` | Account ID from Step 1 |
| `SESSIONS` | `Q4 2024,Annual 2025` | Comma-separated session names or UUIDs |

#### Output Target (Choose at least one)

| Property | Value | Description |
|----------|--------|-------------|
| `GOOGLE_DOC_ID` | `1ABC...xyz` | Google Doc ID for formatted reports |
| `TEXT_FILE_ID` | `1DEF...uvw` | Google Drive file ID for markdown export |
| `TEXT_FILE_URL` | `https://drive.google.com/...` | Google Drive sharing URL for text export |

#### Optional Properties

| Property | Default | Description |
|----------|---------|-------------|
| `LOOKBACK_DAYS` | `7` | Days to look back for recent activity |
| `QUANTIVE_BASE_URL` | `https://app.us.quantive.com/results/api/v1` | API base URL (change for other regions) |

### Configuration Examples

#### Single Session Setup
```
SESSIONS = Q4 2024 OKRs
```

#### Multiple Sessions Setup
```
SESSIONS = Q3 2024,Q4 2024,Annual Planning
```

#### JSON Array Format (Alternative)
```
SESSIONS = ["Q4 2024", "66c65f12-1234-5678-9abc-def012345678"]
```

### Output Document Setup

#### Google Docs Output
1. Create a new Google Doc for your reports
2. Copy the document ID from the URL: `https://docs.google.com/document/d/[DOCUMENT_ID]/edit`
3. Set `GOOGLE_DOC_ID` to this ID
4. Ensure the Apps Script has edit access to this document

#### Plain Text/Markdown Output
1. Create a new Google Drive text file or use existing
2. Either:
   - Get sharing URL and set `TEXT_FILE_URL`
   - Or get file ID and set `TEXT_FILE_ID`
3. The tool will rename the file to `quantive-snapshot.md` automatically

## Step 4: Testing and Validation

### Test API Connection
1. In Apps Script editor, run function `testApiConnection()`
2. Check execution log for success message
3. Fix any authentication issues before proceeding

### List Available Sessions
1. Run function `listAvailableSessions()`
2. Verify your target sessions are accessible
3. Note exact session names for configuration

### Generate First Report
1. Run function `generateQuantiveReport()`
2. Monitor execution log for progress and timing
3. Check output document(s) for generated content
4. Typical execution should complete in 60-90 seconds

## Step 5: Automation Setup

### Weekly Trigger (Recommended)
1. In Apps Script editor, run function `setupWeeklyTrigger()`
2. This creates a trigger to run every Monday at 9 AM
3. Customize timing by modifying the function if needed

### Manual Trigger Configuration
1. Go to **Triggers** (clock icon) in Apps Script editor
2. Click **Add Trigger**
3. Configure:
   - **Function**: `generateQuantiveReport`
   - **Event source**: Time-driven
   - **Type**: Week timer
   - **Day/Time**: Your preferred schedule

### Monitoring Automated Runs
- Check **Executions** tab for run history and logs
- Set up email notifications for failures in trigger settings
- Monitor execution time to ensure it stays under limits

## Performance Optimization

### Performance Mode Configuration
The tool includes configurable performance optimizations in `Code.gs`:

```javascript
const PERFORMANCE_MODE = {
  SKIP_PROGRESS_HISTORY: true,     // Major speedup by skipping detailed progress history
  SKIP_SPARKLINES: true,           // Skip sparkline generation for faster processing
  SKIP_KR_PROGRESS_HISTORY: true,  // Skip key result progress details
  USE_BULK_USER_FETCH: true       // Use bulk user API calls (90% API reduction)
};
```

### Execution Time Expectations

Based on session size:
- **Small sessions** (<50 KRs): 60-70 seconds
- **Medium sessions** (50-200 KRs): 70-90 seconds  
- **Large sessions** (400+ KRs): 2-3 minutes

If execution times exceed expectations:
1. Enable more performance optimizations
2. Reduce number of sessions processed simultaneously
3. Check API rate limiting and network connectivity

## Security Best Practices

### Credential Management
- **Never hardcode** API tokens in the script
- **Use Script Properties** for all sensitive configuration
- **Regularly rotate** API tokens per your security policy
- **Limit API token permissions** to read-only access

### Access Control
- **Restrict Apps Script project** access to authorized users only
- **Use dedicated Google account** for automation if possible
- **Monitor execution logs** for unusual activity
- **Set up alerting** for execution failures

### Git Repository Security
If using version control:
- **Never commit** `.env` files or credential files
- **Use `.gitignore`** to exclude sensitive files
- **Review commits** before pushing to ensure no credentials leaked
- **Use repository security features** like secret scanning

## Troubleshooting Common Setup Issues

### Authentication Errors
**Symptom**: "Invalid API token" or "Unauthorized" errors

**Solutions**:
1. Verify API token is copied correctly (no extra spaces)
2. Check token hasn't expired (regenerate if needed)
3. Confirm account ID matches your Quantive workspace
4. Ensure API access is enabled in Quantive settings

### Session Not Found Errors
**Symptom**: "Session not accessible" or "Session not found"

**Solutions**:
1. Run `listAvailableSessions()` to see available sessions
2. Use exact session names (case-sensitive matching)
3. Verify you have access to the target sessions in Quantive
4. Try using session UUIDs instead of names

### Permission Errors
**Symptom**: Cannot write to Google Doc or Drive file

**Solutions**:
1. Ensure the Apps Script has necessary OAuth permissions
2. Check that target documents exist and are accessible
3. Verify Google Doc ID is extracted correctly from URL
4. For Drive files, ensure sharing permissions are correct

### Performance Issues
**Symptom**: Execution timeout or very slow processing

**Solutions**:
1. Enable performance optimizations in `PERFORMANCE_MODE`
2. Reduce number of sessions processed simultaneously
3. Check network connectivity and API response times
4. Consider processing large sessions separately

### Configuration Validation Errors
**Symptom**: "Invalid configuration" or setup validation failures

**Solutions**:
1. Double-check all required properties are set in Script Properties
2. Verify property names are exactly as specified (case-sensitive)
3. Ensure at least one output target (Doc or Drive file) is configured
4. Test each configuration component individually

## Advanced Configuration

### Multiple Environment Support
For development/staging/production environments:

1. Use different Apps Script projects for each environment
2. Configure separate Quantive accounts or sessions
3. Use environment-specific output documents
4. Consider different performance optimization settings

### Custom Session Filtering
To process specific types of sessions:

1. Use session name patterns (e.g., all sessions containing "2024")
2. Filter by session metadata in code customization
3. Set up separate configurations for different team/department sessions

### Integration with Other Tools
The markdown export feature enables integration with:

- **AI assistants** (Claude, ChatGPT) for analysis
- **Documentation systems** that consume markdown
- **Reporting dashboards** via file-based integration
- **Version control** for historical tracking of OKR progress

## Next Steps

After successful setup:

1. **[Development Guide](development-guide.md)** - Set up local debugging environment
2. **[Deployment Guide](deployment-guide.md)** - Automate deployments with GitHub Actions
3. **[Architecture Guide](architecture.md)** - Understand technical implementation details
4. **[Troubleshooting Guide](troubleshooting.md)** - Solutions for common operational issues

## Support and Maintenance

### Regular Maintenance Tasks
- **Monitor execution logs** weekly for any errors or performance degradation
- **Update API tokens** according to your security policy
- **Review output quality** to ensure data accuracy and completeness
- **Test backup/restore** procedures for your configuration

### Performance Monitoring
- Track execution times and optimize if they increase
- Monitor API usage to stay within rate limits
- Check output document sizes for very large sessions
- Validate data accuracy against Quantive interface periodically

### Updates and Upgrades
- Review release notes when updating Code.gs
- Test in development environment before production updates
- Back up current configuration before major changes
- Consider performance impact of new features