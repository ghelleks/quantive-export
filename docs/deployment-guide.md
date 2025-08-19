# Deployment Guide

This guide covers all deployment methods for the Quantive Export tool, from manual deployment to automated CI/CD with GitHub Actions and clasp.

For architectural decisions behind the deployment automation strategy, see [ADR-005: Deployment Automation](adr/ADR-005-deployment-automation.md).

## Branch Strategy

- **main**: Production branch - automatically deploys to production Google Apps Script
- **dev**: Development branch - active development and testing before merging to main

## Deployment Options Overview

| Method | Best For | Pros | Cons |
|--------|----------|------|------|
| **Manual Deployment** | Quick setup, one-time deployments | Simple, no additional tools needed | Manual updates, no version control |
| **Clasp CLI** | Development workflow | Local control, version management | Requires local setup |
| **GitHub Actions** | Production automation | Fully automated, triggered by code changes | Requires GitHub repository |

## Method 1: Manual Deployment

### When to Use
- First-time setup or testing
- Infrequent updates
- Simple deployment needs without automation

### Steps

#### 1. Prepare the Code
1. Download or copy the contents of `Code.gs` from this repository
2. Ensure you have the latest version with v2.2 performance optimizations

#### 2. Create Google Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Delete the default `myFunction()` code
4. Paste the entire `Code.gs` content
5. Rename the project (e.g., "Quantive OKR Reports - Production")

#### 3. Configure Script Properties
Follow the [Setup Guide](setup-guide.md) for complete configuration instructions:
- Set all required environment variables in Script Properties
- Configure at least one output target (Google Doc or Drive file)
- Test with `testApiConnection()` and `listAvailableSessions()`

#### 4. Deploy and Test
1. Run `generateQuantiveReport()` to test functionality
2. Set up automated triggers with `setupWeeklyTrigger()`
3. Monitor execution logs for performance and errors

#### 5. Manual Updates
When updating:
1. Copy new `Code.gs` content from repository
2. Replace existing code in Apps Script editor
3. Test with sample data before enabling triggers
4. Check execution logs for any issues

### Pros and Cons
**Pros**: Simple, immediate, no additional tools required  
**Cons**: Manual updates, no version history, potential for errors during updates

## Method 2: Clasp CLI Deployment

### When to Use
- Active development workflow
- Local testing and debugging
- Version-controlled deployments
- Need for multiple environment management

### Prerequisites
- Node.js installed (version 14 or higher)
- Google account with Apps Script API enabled
- Command line access

### Initial Setup

#### 1. Install Clasp
```bash
# Install clasp globally
npm install -g @google/clasp

# Enable Apps Script API (required for first-time clasp use)
# Visit: https://script.google.com/home/usersettings
# Enable "Google Apps Script API"
```

#### 2. Authenticate with Google
```bash
# Login to your Google account
clasp login

# This opens a browser for OAuth authentication
# Grant necessary permissions to clasp
```

#### 3. Initialize Project

**Option A: Create New Project**
```bash
# Create new Apps Script project
clasp create --type standalone --title "Quantive Export"

# This creates .clasp.json with your project's script ID
```

**Option B: Connect to Existing Project**
```bash
# If you already have an Apps Script project
clasp clone YOUR_SCRIPT_ID

# Replace YOUR_SCRIPT_ID with actual Google Apps Script project ID
```

#### 4. Configure Local Files

**File Structure Setup**:
```
quantive-export/
├── .clasp.json                 # Clasp configuration
├── gas-src/                    # Source files for Google Apps Script
│   ├── appsscript.json        # Apps Script manifest
│   └── Code.js                # Main script (copied from Code.gs)
└── Code.gs                    # Source file
```

**Create appsscript.json** (in `gas-src/` directory):
```json
{
  "timeZone": "America/New_York",
  "dependencies": {
    "enabledAdvancedServices": []
  },
  "executionApi": {
    "access": "ANYONE"
  }
}
```

### Development Workflow

#### 1. Local Development
```bash
# Make changes to Code.gs
# Copy to gas-src for deployment
cp Code.gs gas-src/Code.js

# Or use automated script
npm run build  # if you have build script configured
```

#### 2. Deploy Changes
```bash
# Push changes to Google Apps Script
clasp push

# Deploy a new version
clasp deploy

# Or push and deploy in one command
clasp push && clasp deploy
```

#### 3. View and Manage
```bash
# Open the project in Apps Script editor
clasp open

# View project information
clasp status

# List all deployments
clasp deployments
```

### Advanced Clasp Commands

#### Version Management
```bash
# Create a versioned deployment
clasp deploy --versionNumber 1 --description "Production Release v2.2"

# List all versions
clasp versions

# Deploy specific version
clasp deploy --versionNumber 2
```

#### Multiple Environments
```bash
# Setup for different environments
# Create separate .clasp.json files for each environment

# Production
clasp clone PROD_SCRIPT_ID --rootDir ./prod

# Staging  
clasp clone STAGING_SCRIPT_ID --rootDir ./staging

# Deploy to specific environment
clasp push --rootDir ./prod
```

### Troubleshooting Clasp Issues

#### Authentication Problems
```bash
# Logout and re-authenticate
clasp logout
clasp login

# Check current authentication status
clasp auth list
```

#### Permission Errors
```bash
# Ensure Apps Script API is enabled
# Visit: https://console.developers.google.com/apis/api/script.googleapis.com

# Check project permissions in Google Apps Script editor
clasp open
```

#### File Structure Issues
```bash
# Verify clasp configuration
cat .clasp.json

# Check file structure matches requirements
ls -la gas-src/
```

## Method 3: Automated GitHub Actions Deployment

### When to Use
- Production environments with frequent updates
- Team collaboration with code review process
- Automatic deployment on code changes
- Comprehensive CI/CD workflow

### Prerequisites
- GitHub repository containing your project
- Google Apps Script project already created
- Admin access to GitHub repository (for secrets management)

### Setup Process

#### 1. Initial Clasp Configuration
Follow Method 2 (Clasp CLI) steps 1-3 to set up clasp locally and obtain authentication files.

#### 2. Obtain Authentication Files
After running `clasp login` and `clasp create/clone`, you'll have:
- `~/.clasprc.json` - OAuth credentials for your Google account
- `.clasp.json` - Project configuration with script ID

#### 3. Configure GitHub Secrets
In your GitHub repository:

1. Go to **Settings → Secrets and variables → Actions**
2. Click **New repository secret** for each:

**CLASPRC_JSON Secret**:
```bash
# Copy the contents of your clasprc file
cat ~/.clasprc.json

# Paste entire JSON content as secret value
```

**CLASP_JSON Secret**:
```bash
# Copy your project configuration
cat .clasp.json

# Paste entire JSON content as secret value
```

#### 4. Create GitHub Actions Workflow
Create `.github/workflows/deploy-gas.yml`:

```yaml
name: Deploy to Google Apps Script

on:
  push:
    branches: [main]
    paths: 
      - 'Code.gs'
      - 'gas-src/**'
      - '.github/workflows/deploy-gas.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install clasp
      run: npm install -g @google/clasp
      
    - name: Create clasprc.json
      run: echo '${{ secrets.CLASPRC_JSON }}' > ~/.clasprc.json
      
    - name: Create .clasp.json
      run: echo '${{ secrets.CLASP_JSON }}' > .clasp.json
      
    - name: Prepare source files
      run: |
        mkdir -p gas-src
        cp Code.gs gas-src/Code.js
        
    - name: Deploy to Google Apps Script
      run: |
        clasp push --force
        clasp deploy --description "Auto-deploy from GitHub commit ${{ github.sha }}"
```

#### 5. Test Automated Deployment
1. Make a change to `Code.gs`
2. Commit and push to main branch:
   ```bash
   git add Code.gs
   git commit -m "Update report generation logic"
   git push origin main
   ```
3. Check **Actions** tab in GitHub for deployment progress
4. Verify changes appear in Google Apps Script project

### Advanced GitHub Actions Configuration

#### Environment-Specific Deployments
```yaml
name: Deploy to Multiple Environments

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy-staging:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      # Deploy to staging environment
      - name: Deploy to Staging
        run: echo '${{ secrets.STAGING_CLASP_JSON }}' > .clasp.json && clasp push
        
  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      # Deploy to production environment
      - name: Deploy to Production
        run: echo '${{ secrets.PROD_CLASP_JSON }}' > .clasp.json && clasp push
```

#### Deployment with Testing
```yaml
name: Test and Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm install
    - name: Run tests
      run: npm test
    - name: Run linting
      run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    # Deployment steps only run if tests pass
    - name: Deploy to Google Apps Script
      run: clasp push && clasp deploy
```

#### Notifications and Monitoring
```yaml
    - name: Notify deployment success
      if: success()
      run: |
        echo "✅ Successfully deployed to Google Apps Script"
        echo "Commit: ${{ github.sha }}"
        echo "Message: ${{ github.event.head_commit.message }}"
        
    - name: Notify deployment failure  
      if: failure()
      run: |
        echo "❌ Deployment failed"
        echo "Check logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

### Security Considerations

#### Credential Management
- **Never commit** `.clasprc.json` or credential files to git
- **Use GitHub Secrets** for all sensitive information
- **Regularly rotate** OAuth tokens and API credentials
- **Limit repository access** to necessary team members only

#### Workflow Security
- **Use specific action versions** (e.g., `@v4`) instead of `@latest`
- **Review workflow permissions** and limit to minimum necessary
- **Monitor deployment logs** for any security issues
- **Enable branch protection** rules for main branch

#### Access Control
```yaml
# Restrict workflow to specific team members
on:
  push:
    branches: [main]
    # Only trigger for specific authors or teams
  workflow_dispatch:
    # Allow manual triggering with proper permissions
```

## Deployment Comparison Matrix

| Feature | Manual | Clasp CLI | GitHub Actions |
|---------|--------|-----------|----------------|
| **Setup Complexity** | Low | Medium | High |
| **Learning Curve** | None | Medium | High |
| **Automation Level** | None | Semi-automated | Fully automated |
| **Version Control** | None | Local | Full Git integration |
| **Team Collaboration** | Difficult | Medium | Excellent |
| **Error Prevention** | Manual review | Local testing | Automated testing |
| **Rollback Capability** | Manual | Command-line | Git-based |
| **Multi-environment** | Manual setup | Supported | Native support |
| **Audit Trail** | None | Local history | Full GitHub history |
| **Security** | Manual credential handling | Local credential storage | Encrypted secrets |

## Best Practices for Production

### Environment Management
1. **Use separate Google Apps Script projects** for development, staging, and production
2. **Configure different Quantive sessions** for each environment when possible
3. **Use environment-specific output documents** to avoid conflicts
4. **Test thoroughly in staging** before production deployment

### Security Hardening
1. **Enable two-factor authentication** on Google accounts used for deployment
2. **Use dedicated service accounts** for automated deployments when possible
3. **Regularly audit access** to Google Apps Script projects and GitHub repositories
4. **Monitor execution logs** for unusual activity or errors

### Performance Monitoring
1. **Set up alerts** for execution failures or timeouts
2. **Monitor execution times** and optimize if performance degrades
3. **Track API usage** to ensure you stay within rate limits
4. **Test with production-sized data** in staging environment

### Disaster Recovery
1. **Backup script configuration** including all Script Properties
2. **Document manual deployment procedures** as fallback
3. **Maintain offline copies** of critical configuration data
4. **Test restoration procedures** periodically

## Troubleshooting Deployment Issues

### Common GitHub Actions Failures

#### Authentication Errors
```
Error: Authentication failed
```
**Solution**: Verify GitHub secrets contain valid, current clasprc.json content

#### Permission Denied
```
Error: Permission denied to push to Google Apps Script
```
**Solution**: Ensure the Google account has edit access to the target Apps Script project

#### File Structure Errors
```
Error: appsscript.json not found
```
**Solution**: Ensure gas-src/ directory contains required files with correct structure

### Common Clasp Issues

#### Login Failures
```bash
# Clear authentication and re-login
clasp logout
clasp login --no-localhost  # if running on remote server
```

#### Project Not Found
```bash
# Verify project ID in .clasp.json
clasp status
clasp open  # Should open the correct project
```

#### Push Failures
```bash
# Force push to overwrite conflicts
clasp push --force

# Check for file size or content issues
ls -la gas-src/
```

### Performance and Reliability

#### Deployment Monitoring
- Set up monitoring for deployment success/failure
- Track deployment frequency and timing
- Monitor Google Apps Script execution after deployments
- Implement rollback procedures for failed deployments

#### Version Management
- Tag stable releases in Git for easy rollback
- Maintain deployment notes for each version
- Test major changes in staging environment first
- Keep previous working version as backup

## Next Steps

After successful deployment:
1. **[Setup Guide](setup-guide.md)** - Configure your deployed instance
2. **[Architecture Guide](architecture.md)** - Understand the technical implementation
3. **[Troubleshooting Guide](troubleshooting.md)** - Resolve operational issues
4. **[Development Guide](development-guide.md)** - Set up local development environment

Consider setting up monitoring and alerting for your production deployment to ensure reliable operation and quick response to any issues.