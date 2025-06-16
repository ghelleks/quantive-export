# 📊 Quantive Session Snapshot & Summary

> **Automate your OKR reporting with this powerful Google Apps Script integration**

Transform your Quantive (formerly Gtmhub) data into beautiful, automated reports that keep your team aligned and informed. No more manual data compilation or missed updates—just clear, consistent insights delivered right to your Google Workspace.

## 🆕 **New in v2.0: Enhanced Security & Configuration Management**
- 🔒 **Advanced security features** with credential validation and environment support
- ⚙️ **Streamlined configuration** with templates and import/export utilities  
- 🏗️ **Environment management** for development, staging, and production deployments
- 🛡️ **Enhanced validation** prevents common setup errors and security issues

---

## ✨ What This Does

**Imagine never having to manually create OKR status reports again.** This Google Apps Script automatically:

- 🔄 **Fetches your latest Quantive data** via secure API integration
- 📈 **Calculates progress and insights** across all objectives and key results  
- 📝 **Generates beautiful reports** in Google Docs with formatting and tables
- 📊 **Tracks historical data** in Google Sheets for trend analysis
- ⏰ **Runs automatically** on your schedule (daily, weekly, or monthly)
- 🛡️ **Handles errors gracefully** with retry logic and fallback options

### 🎯 Perfect For
- **Leadership teams** who need regular OKR progress updates
- **Program managers** tracking multiple team objectives
- **Data analysts** building OKR dashboards and trend reports
- **Anyone** tired of manual report compilation from Quantive

---

## 🚀 Quick Start

**Get up and running in 15 minutes!**

### 1. **Get Your Credentials**
- 🔑 **Quantive API Token**: Go to Quantive Settings → Integrations → Generate API Token
- 🏢 **Account ID**: Found in your Quantive URL or account settings
- 📋 **Session Name or ID**: The identifier of the OKR session you want to analyze
  - **What it is**: Either a session name (like "Q4 2024 OKRs") or a UUID that identifies a specific OKR session in Quantive
  - **Easy option**: Use the session name displayed in Quantive (e.g., `Q4 2024 OKRs`, `2024 Company Goals`)
  - **Alternative**: Use session UUID from URL (e.g., `quantive.com/sessions/12345678-abcd-1234-efgh-123456789012`)
  - **Auto-resolution**: The system automatically converts session names to IDs using the Quantive API
  - **Purpose**: Tells the script which session's objectives and key results to include in your reports

### 2. **Set Up Google Apps Script**
- 🌐 Visit [script.google.com](https://script.google.com)
- ➕ Create a new project
- 📋 Copy and paste the contents of [`Code.gs`](Code.gs) into your project
- 💾 Save your project with a descriptive name

### 3. **Secure Configuration Setup (v2.0)**

**NEW**: Enhanced setup with validation and security features:

```javascript
function quickStart() {
  // Step 1: Review the configuration template
  // Open config.example.js for comprehensive setup guidance
  
  // Step 2: Set up your configuration with actual values
  const config = {
    'QUANTIVE_API_TOKEN': 'your-actual-api-token',     // REPLACE with real token
    'QUANTIVE_ACCOUNT_ID': 'your-actual-account-id',   // REPLACE with real account ID 
    'SESSION_ID': 'Q4 2024 OKRs',                      // REPLACE with session name or UUID
    'ENVIRONMENT': 'production',                       // NEW: Environment setting
    'GOOGLE_DOC_ID': 'your-google-doc-id'              // Optional: for formatted reports
  };
  
  try {
    // Step 3: Import with enhanced validation
    importConfiguration(config);
    Logger.log('✅ Configuration imported successfully');
    
    // Step 4: Validate setup
    if (testConfiguration()) {
      Logger.log('✅ Configuration validated - ready to generate reports!');
    } else {
      Logger.log('❌ Configuration validation failed - check your credentials');
    }
    
    // Step 5: Test API connectivity
    if (testApiConnection()) {
      Logger.log('✅ API connection verified - system ready!');
    }
  } catch (error) {
    Logger.log('❌ Setup failed: ' + error.toString());
  }
}
```

> **⚠️ Security Note**: Always replace placeholder values with your actual credentials. Never commit real API tokens to version control.

### 4. **Generate Your First Report**
```javascript
function createMyFirstReport() {
  return generateQuantiveReport();
}
```

### 5. **Set Up Automation** (Optional)
```javascript
function setupWeeklyReports() {
  // Runs every Monday at 9 AM
  TriggerManager.setupTimeDrivenTrigger('weekly', 9, 1);
  Logger.log('📅 Weekly reports scheduled!');
}
```

**That's it!** 🎉 Your automated OKR reporting is ready to go.

---

## 📋 What You'll Get

### 📄 **Formatted Google Docs Reports**
Beautiful, professional reports with:
- **Executive Summary** with key metrics and progress
- **Detailed Objective Breakdown** with status and ownership
- **Recent Activity** highlighting what's changed
- **Smart Insights** with automated recommendations
- **Clean Formatting** ready to share with stakeholders

### 📊 **Historical Data Tracking**
Comprehensive Google Sheets with 15 data points per report:
- Progress trends over time
- Status distribution changes  
- Team engagement metrics
- Historical insights for pattern analysis

---

## 🛠️ Features & Capabilities

### 🔒 **Enterprise-Ready Security (Enhanced in v2.0)**
- ✅ **Secure credential storage** using Google's encrypted PropertiesService
- ✅ **Zero hardcoded secrets** - all sensitive data stored securely
- ✅ **NEW: Advanced validation** - API token format, UUID validation, placeholder detection
- ✅ **NEW: Environment isolation** - separate configs for dev/staging/production
- ✅ **Enhanced error handling** with security-focused error messages
- ✅ **Configuration import/export** with sensitive data protection

### ⚡ **Performance Optimized**
- ✅ Handles sessions with up to 400+ key results
- ✅ Intelligent retry logic with exponential backoff
- ✅ Execution time under 5 minutes (Google Apps Script compliant)
- ✅ Memory-efficient data processing

### 🎯 **Smart Analytics**
- ✅ Weighted progress calculations across all key results
- ✅ Status categorization and trend analysis
- ✅ Configurable "recent activity" detection
- ✅ Automated insights and recommendations

### 🔧 **Flexible Configuration (Enhanced in v2.0)**
- ✅ **Multiple output formats** (Google Docs, Sheets, or both)
- ✅ **Configurable lookback periods** for recent activity tracking
- ✅ **Multiple scheduling options** (daily, weekly, monthly automation)
- ✅ **NEW: Environment management** with dev/staging/production support
- ✅ **NEW: Configuration templates** for common deployment scenarios
- ✅ **NEW: Import/export utilities** for easy configuration management
- ✅ **NEW: Environment-specific settings** (rate limiting, logging, retries)

### 🛡️ **Robust Error Handling**
- ✅ Graceful handling of API rate limits
- ✅ Network timeout and retry mechanisms
- ✅ Partial data recovery for resilient reporting
- ✅ Detailed error classification and logging

---

## 📚 Documentation

We've made this as easy as possible to set up and maintain:

| Document | Description | Perfect For |
|----------|-------------|-------------|
| **[User Guide](USER_GUIDE.md)** | Complete setup and usage instructions with v2.0 features | First-time users and administrators |
| **[Configuration Templates](CONFIG_TEMPLATES.md)** | Pre-built configs with security best practices | Quick setup and environment management |
| **[config.example.js](config.example.js)** | **NEW**: Comprehensive configuration template with security guidance | Secure setup and credential management |
| **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** | Step-by-step production deployment | IT teams and enterprise deployments |
| **[Testing Scenarios](TESTING_SCENARIOS.md)** | Comprehensive testing documentation | Developers and quality assurance |

---

## 🎨 Customization Options

### 📊 **Report Formats**
- **Google Docs**: Professional formatted documents perfect for executive sharing
- **Google Sheets**: Historical data tracking ideal for trend analysis and dashboards
- **Both**: Complete reporting solution for comprehensive insights

### ⏰ **Automation Schedules**
- **Daily**: Perfect for fast-moving teams and sprint reviews
- **Weekly**: Ideal for regular team check-ins and planning cycles  
- **Monthly**: Great for executive summaries and quarterly reviews

### 🔍 **Activity Tracking**
- **1-3 days**: Focus on immediate updates and daily standup insights
- **7-14 days**: Standard weekly review and team coordination
- **30+ days**: Monthly trends and strategic planning analysis

---

## 💡 Use Cases & Examples

### 🏢 **Executive Leadership**
> *"I need a weekly summary of all OKR progress across the organization"*
- **Setup**: Weekly Google Docs reports with 7-day activity tracking
- **Output**: Executive-ready formatted documents with key insights
- **Benefit**: Stay informed without micromanaging individual teams

### 📈 **Data & Analytics Teams**
> *"I want to track OKR trends and build dashboards over time"*
- **Setup**: Daily Google Sheets updates with historical data tracking
- **Output**: Rich dataset with 15 metrics per report for analysis
- **Benefit**: Build comprehensive OKR analytics and trend reports

### 👥 **Program Managers**
> *"I need to track multiple team objectives and identify blockers quickly"*
- **Setup**: Bi-weekly reports with both Docs and Sheets output
- **Output**: Formatted status updates plus historical tracking
- **Benefit**: Proactive issue identification and team coordination

### 🎯 **Team Leads**
> *"I want automated updates for my team's OKRs without manual work"*
- **Setup**: Weekly team-specific reports with 3-5 day activity focus
- **Output**: Team-focused progress reports with recent activity highlights
- **Benefit**: Keep team aligned with minimal administrative overhead

---

## 🤝 Getting Help

### 💬 **Community & Support**

**Got questions?** We're here to help!

- 📖 **Check the [User Guide](USER_GUIDE.md)** - Covers 90% of common questions
- 🔧 **Review [Configuration Templates](CONFIG_TEMPLATES.md)** - Find the right setup for your needs
- 🧪 **Run the built-in tests** - Use `testConfiguration()` to diagnose issues
- 📋 **Follow the [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Ensures proper setup

### 🐛 **Troubleshooting (Enhanced in v2.0)**

**Most common issues and quick fixes:**

| Issue | Quick Fix | New in v2.0 |
|-------|-----------|-------------|
| 🔑 **"Authentication failed"** | Run `testConfiguration()` to validate credentials | ✅ Enhanced validation |
| 📄 **"Session not found"** | Check UUID format and session accessibility | ✅ UUID validation |
| 📝 **"Can't write to document"** | Verify Google Doc/Sheet ID and permissions | |
| ⚠️ **"Placeholder values detected"** | Replace 'your-api-token-here' with real credentials | ✅ NEW: Placeholder detection |
| 🔧 **"Configuration validation failed"** | Use `importConfiguration()` for automatic validation | ✅ NEW: Import validation |
| ⚠️ **"Where do I find my session ID?"** | See detailed guide below | ✅ NEW: Enhanced documentation |
| ⏱️ **"Execution timeout"** | Check environment-specific rate limiting settings | ✅ NEW: Environment tuning |

### 🔍 **Finding Your Session: Step-by-Step Guide**

**🎉 NEW: You can now use session names instead of IDs!** Here are your options:

#### Method 1: Use Session Name (Easiest!)
1. **Log into Quantive** and navigate to your target OKR session
2. **Look at the session title** displayed at the top of the page
3. **Copy the session name** (e.g., "Q4 2024 OKRs", "2024 Company Goals")
4. **That's it!** Use this name in your SESSION_ID configuration

#### Method 2: From the URL (Alternative)
1. **Log into Quantive** and navigate to your target OKR session
2. **Look at the browser URL** - it will look like:
   ```
   https://app.quantive.com/sessions/12345678-abcd-1234-efgh-123456789012
   ```
3. **Copy the UUID** (the long string after `/sessions/`)
4. **That's your session ID!** Format: `12345678-abcd-1234-efgh-123456789012`

#### Method 3: From Session Settings
1. **Go to your session** in Quantive
2. **Click on session settings** or session details
3. **Look for "Session ID" or "ID"** field
4. **Copy the UUID value**

#### Method 3: From the Session List
1. **Go to Sessions page** in Quantive navigation
2. **Find your target session** in the list
3. **Right-click and inspect** or look for an ID field
4. **Copy the UUID**

**⚠️ Important Notes:**
- **Session names are case-insensitive** and must match exactly (e.g., "Q4 2024 OKRs")
- **Session UUIDs** still work if you prefer: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Each session has a **unique name and ID** - make sure you're targeting the right one
- The session must be **accessible to your API token** (same account/permissions)
- **Auto-resolution**: The system automatically finds session IDs from names using the Quantive API
- If unsure, test with `testConfiguration()` after setup

### 🎯 **Best Practices (Enhanced in v2.0)**

**Set yourself up for success:**

- ✅ **Start small** - Test with one session before scaling up
- ✅ **Use meaningful names** - Name your Google Apps Script project clearly
- ✅ **Monitor initially** - Check the first few automated runs to ensure reliability
- ✅ **NEW: Use configuration templates** - Start with `config.example.js` for secure setup
- ✅ **NEW: Environment isolation** - Use different environments for development vs production
- ✅ **Enhanced security** - Never share configurations with real credentials
- ✅ **NEW: Validate everything** - Use `testConfiguration()` and `testApiConnection()` functions
- ✅ **Regular maintenance** - Review and update session IDs quarterly

---

## 🌟 Why You'll Love This

### ⏱️ **Save Hours Every Week**
Stop manually copying data from Quantive into reports. This automation handles it all, giving you time to focus on what matters: acting on the insights.

### 📊 **Better Data, Better Decisions**
Consistent, timely reports mean your team always has the latest information. No more outdated spreadsheets or "I forgot to update the dashboard" moments.

### 🎯 **Stay Aligned Without Micromanaging**
Leaders get the visibility they need without constantly asking "how are we doing?" Teams can focus on execution while keeping everyone informed.

### 🔄 **Scale Your OKR Practice**
Whether you have 5 objectives or 500, this system scales with your organization. Set it up once, benefit forever.

---

## 🚀 Ready to Get Started?

1. **⚡ [Quick Start](#-quick-start)** - Get running in 15 minutes
2. **📖 [Read the User Guide](USER_GUIDE.md)** - Comprehensive setup instructions  
3. **🎯 [Choose Your Configuration](CONFIG_TEMPLATES.md)** - Find the perfect setup for your needs
4. **🧪 [Test Everything](TESTING_SCENARIOS.md)** - Validate your deployment

---

## 📋 Technical Details

- **Platform**: Google Apps Script (JavaScript)
- **Requirements**: Google Workspace account, Quantive API access
- **Execution Time**: < 5 minutes (Google Apps Script compliant)
- **Data Handling**: Up to 400+ key results per session
- **Security**: Enterprise-grade credential management
- **Maintenance**: Minimal - set up once, runs automatically

---

## 🤖 Built with Care

This project was crafted with attention to:
- **🛡️ Security**: Enterprise-grade credential protection with v2.0 enhancements
- **📖 Documentation**: Clear, helpful guides for every skill level and use case  
- **🧪 Testing**: Comprehensive test suites and validation functions
- **⚡ Performance**: Optimized for Google Apps Script environment
- **🎯 Usability**: Simple setup, powerful results, secure by default
- **🔧 Maintainability**: Environment support and configuration management

### 📋 **Quick Checklist for v2.0 Setup**
- [ ] Review `config.example.js` for comprehensive setup guidance
- [ ] Use `importConfiguration()` function for validated setup
- [ ] Set `ENVIRONMENT` property for your deployment (dev/staging/prod)
- [ ] Run `testConfiguration()` and `testApiConnection()` to validate
- [ ] Never commit real credentials to version control
- [ ] Use environment-specific settings for optimal performance

---

**Ready to transform your OKR reporting with enhanced security?** [Get started now](#-quick-start) and experience the difference v2.0 makes! 🚀

---

*Made with ❤️ for teams who value aligned execution, data-driven decisions, and enterprise-grade security.*