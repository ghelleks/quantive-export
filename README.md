# 📊 Quantive Session Snapshot & Summary

> **Automate your OKR reporting with this powerful Google Apps Script integration**

Transform your Quantive (formerly Gtmhub) data into beautiful, automated reports that keep your team aligned and informed. No more manual data compilation or missed updates—just clear, consistent insights delivered right to your Google Workspace.

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
- 📋 **Session ID**: Copy from the Quantive session you want to report on

### 2. **Set Up Google Apps Script**
- 🌐 Visit [script.google.com](https://script.google.com)
- ➕ Create a new project
- 📋 Copy and paste the contents of [`Code.gs`](Code.gs) into your project
- 💾 Save your project with a descriptive name

### 3. **Configure Your Settings**
Run this setup function with your credentials:
```javascript
function quickStart() {
  ConfigManager.setProperties({
    'QUANTIVE_API_TOKEN': 'your-api-token-here',
    'QUANTIVE_ACCOUNT_ID': 'your-account-id-here', 
    'SESSION_ID': 'your-session-id-here',
    'GOOGLE_DOC_ID': 'your-google-doc-id-here'  // Optional: for formatted reports
  });
  
  // Test it works
  const result = testConfiguration();
  Logger.log(result.success ? '✅ Setup successful!' : '❌ Setup failed: ' + result.message);
}
```

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

### 🔒 **Enterprise-Ready Security**
- ✅ Secure credential storage using Google's PropertiesService
- ✅ No hardcoded API keys or sensitive data in code
- ✅ Input validation and error classification
- ✅ Comprehensive logging for audit trails

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

### 🔧 **Flexible Configuration**
- ✅ Multiple output formats (Google Docs, Sheets, or both)
- ✅ Configurable lookback periods for recent activity
- ✅ Multiple scheduling options (daily, weekly, monthly)
- ✅ Environment-specific configurations (dev, staging, prod)

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
| **[User Guide](USER_GUIDE.md)** | Complete setup and usage instructions | First-time users and administrators |
| **[Configuration Templates](CONFIG_TEMPLATES.md)** | Pre-built configs for different scenarios | Quick setup and environment management |
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

### 🐛 **Troubleshooting**

**Most common issues and quick fixes:**

| Issue | Quick Fix |
|-------|-----------|
| 🔑 **"Authentication failed"** | Verify your API token and account ID in script properties |
| 📄 **"Session not found"** | Check that your session ID is correct and accessible |
| 📝 **"Can't write to document"** | Ensure your Google Doc/Sheet ID is correct and editable |
| ⏱️ **"Execution timeout"** | Large datasets? Check our [performance optimization guide](USER_GUIDE.md#performance) |

### 🎯 **Best Practices**

**Set yourself up for success:**

- ✅ **Start small** - Test with one session before scaling up
- ✅ **Use meaningful names** - Name your Google Apps Script project clearly
- ✅ **Monitor initially** - Check the first few automated runs to ensure reliability
- ✅ **Keep credentials secure** - Never share or hardcode API tokens
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
- **🛡️ Security**: No shortcuts on credential protection
- **📖 Documentation**: Clear, helpful guides for every skill level  
- **🧪 Testing**: Comprehensive test suites for reliability
- **⚡ Performance**: Optimized for Google Apps Script environment
- **🎯 Usability**: Simple setup, powerful results

---

**Ready to transform your OKR reporting?** [Get started now](#-quick-start) and see the difference automation makes! 🚀

---

*Made with ❤️ for teams who value aligned execution and data-driven decisions.*