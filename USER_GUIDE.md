# Quantive Session Snapshot & Summary - User Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation & Setup](#installation--setup)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Automation](#automation)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [Limitations](#limitations)
10. [Support](#support)

## Overview

The Quantive Session Snapshot & Summary Google Apps Script automatically generates periodic reports from your Quantive (formerly Gtmhub) OKR data. It fetches session data, calculates progress metrics, and creates formatted reports in Google Docs or Google Sheets.

### Key Features
- **Automated Data Fetching**: Connects securely to Quantive API
- **Progress Analytics**: Calculates overall progress and status distributions
- **Recent Activity Tracking**: Identifies updates within configurable timeframes
- **Multiple Output Formats**: Google Docs for formatted reports, Google Sheets for historical data
- **Scheduled Execution**: Automatic daily, weekly, or monthly report generation
- **Error Handling**: Robust retry mechanisms and fallback strategies
- **Secure Configuration Management**: Environment support with encrypted credential storage
- **Configuration Templates**: Easy setup with comprehensive examples and validation

## Prerequisites

Before setting up the script, ensure you have:

### Quantive Account Requirements
- ✅ Active Quantive account with API access
- ✅ Quantive API token (obtainable from Quantive Settings > Integrations)
- ✅ Quantive Account ID (visible in your Quantive URL or account settings)
- ✅ Read permissions for the target session and its objectives/key results

### Google Account Requirements
- ✅ Google account with Google Apps Script access
- ✅ Google Drive permissions for document/sheet creation
- ✅ Basic familiarity with Google Apps Script interface

### Technical Requirements
- ✅ **Target Quantive Session ID to analyze**
  - **What it is**: A unique UUID that identifies a specific OKR session (quarter, cycle, planning period) in Quantive
  - **Format**: UUID like `12345678-abcd-1234-efgh-123456789012`
  - **How to find it**: 
    1. Log into your Quantive account
    2. Navigate to the OKR session you want to analyze
    3. Look at the URL - the session ID is the UUID after `/sessions/`
    4. Example: `https://app.quantive.com/sessions/12345678-abcd-1234-efgh-123456789012`
    5. Alternatively, go to the session's settings/details page to copy the ID
- ✅ Google Doc ID (for formatted reports) OR Google Sheet ID (for data tracking)
- ✅ Internet connectivity for API calls

## Installation & Setup

### Step 1: Create Google Apps Script Project

1. **Open Google Apps Script**
   - Navigate to [script.google.com](https://script.google.com)
   - Click "New Project"

2. **Replace Default Code**
   - Delete the default `function myFunction() {}` code
   - Copy and paste the entire contents of `Code.gs` from this repository

3. **Save the Project**
   - Click the save icon or press `Ctrl+S` (Windows) / `Cmd+S` (Mac)
   - Give your project a meaningful name like "Quantive Report Generator"

### Step 2: Set Up API Permissions

1. **Review Required Permissions**
   The script requires the following Google Apps Script permissions:
   - `https://www.googleapis.com/auth/script.external_request` (for Quantive API calls)
   - `https://www.googleapis.com/auth/documents` (for Google Docs)
   - `https://www.googleapis.com/auth/spreadsheets` (for Google Sheets)
   - `https://www.googleapis.com/auth/script.scriptapp` (for triggers)

2. **Authorize the Script**
   - Click "Run" on any function (like `setupConfiguration`)
   - Google will prompt for authorization
   - Review and accept the required permissions

## Configuration

### Step 3: Secure Configuration Setup

The script now includes enhanced configuration management with environment support and security validation. Choose your preferred setup method:

#### Option A: Using Configuration Template (Recommended)

1. **Review Configuration Template**
   - Open `config.example.js` to see the complete configuration structure
   - Review security best practices and setup instructions
   - Note the environment-specific settings available

2. **Configure Script Properties**
   - In Apps Script editor, go to "Project Settings" (gear icon)
   - Scroll to "Script Properties" section
   - Add the following **required** properties:

   ```
   Property Name: QUANTIVE_API_TOKEN
   Value: [Your actual Quantive API token]
   
   Property Name: QUANTIVE_ACCOUNT_ID  
   Value: [Your actual account ID]
   
   Property Name: SESSION_ID
   Value: [Your target session UUID - the specific OKR session to analyze]
   Example: 12345678-abcd-1234-efgh-123456789012
   
   ⚠️ IMPORTANT: This must be the UUID from your Quantive session URL or settings page.
   The script will analyze ONLY the objectives and key results from this session.
   
   Property Name: ENVIRONMENT
   Value: development|staging|production
   ```

3. **Optional Environment-Specific Settings**
   ```
   Property Name: DEVELOPMENT_API_RATE_LIMIT_DELAY
   Value: 500
   
   Property Name: PRODUCTION_API_RATE_LIMIT_DELAY  
   Value: 1500
   
   Property Name: DEVELOPMENT_LOG_LEVEL
   Value: DEBUG
   ```

#### Option B: Using Import Function

1. **Prepare Configuration Object**
   ```javascript
   const myConfig = {
     'QUANTIVE_API_TOKEN': 'your-actual-token',
     'QUANTIVE_ACCOUNT_ID': 'your-actual-account-id',
     'SESSION_ID': 'your-session-uuid',
     'ENVIRONMENT': 'production'
   };
   ```

2. **Import Configuration**
   - Run: `importConfiguration(myConfig)` in the Apps Script console
   - The function validates required properties and imports them securely

#### Option C: Legacy Setup Function

1. **Run Setup Function**
   - Select `setupConfiguration` from the function dropdown
   - Click "Run" to see example configuration structure
   - Follow the displayed instructions for manual property setup

### Step 4: Configure Output Destination

Choose ONE of the following output formats:

#### Google Docs Output
```
Property Name: GOOGLE_DOC_ID
Value: your-google-doc-id-here
```

To get a Google Doc ID:
1. Create a new Google Doc or open an existing one
2. Copy the ID from the URL: `https://docs.google.com/document/d/[DOC_ID]/edit`

#### Google Sheets Output  
```
Property Name: GOOGLE_SHEET_ID
Value: your-google-sheet-id-here
```

To get a Google Sheet ID:
1. Create a new Google Sheet or open an existing one
2. Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`

### Step 5: Optional Configuration

```
Property Name: LOOKBACK_DAYS
Value: 7
Description: Number of days to look back for "recent activity" (default: 7)
```

### Enhanced Configuration Features

#### Environment Management
The script now supports multiple environments with different settings:

- **Development**: Faster API calls, verbose logging
- **Staging**: Balanced settings, moderate logging  
- **Production**: Conservative rate limiting, minimal logging

#### Configuration Validation
The script automatically validates:
- ✅ API token format and length
- ✅ Account ID presence and format
- ✅ Session ID UUID format validation
- ✅ Prevention of placeholder value usage

#### Security Features
- ✅ All credentials stored in Google Apps Script's encrypted PropertiesService
- ✅ No sensitive data in source code or logs
- ✅ Configuration export function excludes sensitive data by default
- ✅ Comprehensive security best practices documentation

## Usage

### Manual Report Generation

1. **Test Configuration**
   - Select `testConfiguration` from the function dropdown
   - Click "Run" to verify your setup
   - The enhanced validation will check:
     - ✅ All required properties are present
     - ✅ API token format is valid
     - ✅ Account ID is not a placeholder
     - ✅ Session ID follows UUID format
   - Check execution logs for any validation errors

2. **Test API Connection** (Optional)
   - Select `testApiConnection` from the function dropdown
   - Click "Run" to verify Quantive API connectivity
   - This tests actual API authentication before generating reports

3. **Generate Report**
   - Select `generateQuantiveReport` from the function dropdown  
   - Click "Run" to create a report
   - Check your configured Google Doc or Sheet for the output

### Configuration Management Functions

#### Export Configuration
```javascript
// Export configuration (excludes sensitive data)
const config = exportConfiguration();
console.log(config);

// Export with sensitive data (use with caution)
const configWithSecrets = exportConfiguration(true);
```

#### Import Configuration
```javascript
// Import a complete configuration
const newConfig = {
  'QUANTIVE_API_TOKEN': 'your-token',
  'QUANTIVE_ACCOUNT_ID': 'your-account-id',
  'SESSION_ID': 'your-session-id',
  'ENVIRONMENT': 'production'
};
importConfiguration(newConfig);
```

### Understanding Report Output

#### Google Docs Format
- **Session Overview**: Name, dates, overall progress
- **Progress Summary**: Status distribution and key metrics
- **Recent Activity**: Updates within your lookback period
- **Key Insights**: Automated recommendations and observations

#### Google Sheets Format
- **Historical Data**: Each row represents one report execution
- **15 Tracked Metrics**: Date, progress, status counts, insights, etc.
- **Trend Analysis**: Compare progress over time

## Automation

### Setting Up Scheduled Reports

1. **Choose Frequency**
   ```javascript
   // Weekly reports (Mondays at 9 AM)
   TriggerManager.setupTimeDrivenTrigger('weekly', 9, 1);
   
   // Daily reports (every day at 8 AM)  
   TriggerManager.setupTimeDrivenTrigger('daily', 8);
   
   // Monthly reports (1st of month at 10 AM)
   TriggerManager.setupTimeDrivenTrigger('monthly', 10, null, 1);
   ```

2. **Execute Setup Function**
   - Paste your chosen trigger setup code in a function
   - Run the function to create the trigger

3. **Verify Trigger Creation**
   - Go to "Triggers" in the left sidebar of Apps Script
   - Confirm your trigger appears in the list

### Managing Triggers

- **View Active Triggers**: Check the "Triggers" section in Apps Script
- **Delete Triggers**: Click the trash icon next to unwanted triggers
- **Modify Schedule**: Delete old trigger and create new one with different parameters

## Troubleshooting

### Common Issues & Solutions

#### Authentication Errors

**Problem**: `401 Unauthorized` or `403 Forbidden` errors

**Solutions**:
1. ✅ Verify your Quantive API token is correct and active
2. ✅ Confirm your Account ID matches your Quantive account
3. ✅ Check that your API token has read permissions for the target session
4. ✅ Ensure the session ID exists and is accessible
5. ✅ Run `testConfiguration()` to validate credential format
6. ✅ Verify you haven't used placeholder values like 'your-api-token-here'

#### Session Not Found Errors

**Problem**: `404 Not Found` when fetching session data

**Solutions**:
1. ✅ **Verify the Session ID is correct**:
   - Go to your Quantive session in a web browser
   - Copy the UUID from the URL: `https://app.quantive.com/sessions/[UUID HERE]`
   - Make sure it matches exactly what you configured in SESSION_ID property
   - Ensure it's a valid UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
2. ✅ Confirm you have access to view the session in Quantive
3. ✅ Check if the session has been archived or deleted
4. ✅ Verify the session contains objectives and key results to analyze

#### Google Services Errors

**Problem**: Cannot access Google Docs or Sheets

**Solutions**:
1. ✅ Verify the Document/Sheet ID is correct
2. ✅ Confirm the script has edit permissions to the target file
3. ✅ Check that the file hasn't been deleted or moved
4. ✅ Ensure proper Google Apps Script authorization

#### Rate Limiting Issues

**Problem**: `429 Too Many Requests` errors

**Solutions**:
1. ✅ The script includes automatic retry logic with backoff
2. ✅ Reduce report frequency if hitting limits consistently
3. ✅ Contact Quantive support if limits seem too restrictive

#### Execution Timeout

**Problem**: Script exceeds 6-minute execution limit

**Solutions**:
1. ✅ The script is optimized for sessions with up to 400 key results
2. ✅ For larger sessions, consider breaking into multiple smaller sessions
3. ✅ Check for network connectivity issues causing slow API responses

### Debugging Steps

1. **Check Execution Logs**
   - Go to "Executions" in Apps Script left sidebar
   - Click on failed executions to see detailed error logs

2. **Test Individual Components**
   - Run `testConfiguration()` to verify setup
   - Use `ConfigManager.getConfig()` to check properties
   - Test API connectivity before full report generation

3. **Enable Debug Logging**
   - The script includes comprehensive logging
   - Check `View > Logs` for detailed execution information

## Best Practices

### Security
- ✅ **Never hard-code credentials** in the script file
- ✅ **Use Script Properties** for all sensitive configuration  
- ✅ **Use configuration templates** with placeholder values only
- ✅ **Regularly rotate API tokens** as per your security policy
- ✅ **Limit script sharing** to authorized team members only
- ✅ **Use environment-specific configurations** for development vs production
- ✅ **Export configurations without sensitive data** when sharing examples

### Performance  
- ✅ **Set appropriate lookback periods** (7-14 days recommended)
- ✅ **Monitor execution time** and optimize if approaching limits
- ✅ **Use scheduled triggers** rather than manual execution for regular reports
- ✅ **Archive old sheet data** periodically to maintain performance

### Data Management
- ✅ **Regular backups** of your Google Docs/Sheets outputs
- ✅ **Consistent naming conventions** for reports and sessions
- ✅ **Document your session structure** for easier troubleshooting
- ✅ **Monitor API usage** to stay within Quantive limits

### Maintenance
- ✅ **Test after Quantive API updates** to ensure compatibility
- ✅ **Review trigger schedules** periodically for relevance
- ✅ **Update session IDs** when planning periods change
- ✅ **Monitor error logs** for early issue detection

## Limitations

### Technical Limitations
- **Execution Time**: 6-minute maximum per execution (Google Apps Script limit)
- **API Rate Limits**: Subject to Quantive API rate limiting (1000/hour)
- **Data Size**: Optimized for sessions with up to 400 key results
- **Read-Only**: Cannot modify Quantive data, only read and report

### Functional Limitations  
- **Single Session**: Analyzes one session at a time
- **Recent Activity**: Lookback limited to configured period
- **Static Templates**: Report format is fixed (customization requires code changes)
- **No Real-time**: Scheduled execution only, not real-time updates

### Google Apps Script Limitations
- **Trigger Limits**: Maximum 20 triggers per script
- **Property Limits**: 1MB total for all script properties
- **Concurrent Execution**: One execution at a time per trigger
- **Time Zone**: Uses Google account timezone for scheduling

## Support

### Getting Help

1. **Check Logs First**
   - Review execution logs in Google Apps Script
   - Look for specific error messages and codes

2. **Verify Configuration**
   - Run the `testConfiguration()` function
   - Confirm all required properties are set correctly

3. **Review Documentation**
   - Check this user guide for common solutions
   - Refer to the code documentation for technical details

### Useful Resources

- **Quantive API Documentation**: [developers.quantive.com](https://developers.quantive.com)
- **Google Apps Script Guides**: [developers.google.com/apps-script](https://developers.google.com/apps-script)
- **Project Requirements**: See `project-requirements.md` in this repository
- **Implementation Plan**: See `TODO.md` for feature roadmap

### Reporting Issues

When reporting issues, please include:
- Execution timestamp and error message
- Your configuration (without sensitive credentials)
- Steps to reproduce the problem
- Expected vs actual behavior

---

## Quick Start Checklist

For first-time setup, follow this checklist:

- [ ] Create Google Apps Script project
- [ ] Copy Code.gs content to your project
- [ ] Review `config.example.js` for configuration guidance
- [ ] Set up script properties with Quantive credentials (use actual values, not placeholders)
- [ ] Configure environment setting (development/staging/production)
- [ ] Configure output destination (Google Doc or Sheet)
- [ ] Run `testConfiguration()` to verify setup and validate credentials
- [ ] Run `testApiConnection()` to verify API connectivity
- [ ] Generate first manual report with `generateQuantiveReport()`
- [ ] Set up automated trigger for regular reports
- [ ] Verify first automated execution
- [ ] Add to calendar reminders for maintenance

**Estimated Setup Time**: 15-30 minutes for first-time users

---

*This user guide covers the essential information for setting up and using the Quantive Session Snapshot & Summary Google Apps Script. For technical implementation details, refer to the code documentation and comments within the script file.*