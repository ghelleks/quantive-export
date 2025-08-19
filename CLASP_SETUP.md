# Clasp Auto-Deployment Setup

This guide explains how to set up automatic deployment to Google Apps Script using clasp when pushing to the main branch.

## Prerequisites

1. Google Apps Script project already created
2. GitHub repository with admin access
3. Google account: ghelleks@redhat.com

## Step 1: Initial clasp setup

First, authenticate clasp locally with your Google account:

```bash
# Login to Google account
npx clasp login

# Create or clone your Google Apps Script project
# Option A: Create new project
npx clasp create --type standalone --title "Quantive Export"

# Option B: Clone existing project (if you have the script ID)
# Replace SCRIPT_ID with your actual Google Apps Script ID
npx clasp clone SCRIPT_ID
```

## Step 2: Get required authentication files

After running `clasp login` and `clasp create/clone`, you'll have these files:

1. `~/.clasprc.json` - Contains your Google OAuth credentials
2. `.clasp.json` - Contains your project's script ID

## Step 3: Configure GitHub Secrets

In your GitHub repository, go to Settings → Secrets and variables → Actions, and add these secrets:

### CLASPRC_JSON
Copy the contents of `~/.clasprc.json`:
```bash
cat ~/.clasprc.json
```
Paste the entire JSON content as the secret value.

### CLASP_JSON  
Copy the contents of `.clasp.json`:
```bash
cat .clasp.json
```
Paste the entire JSON content as the secret value.

## Step 4: Test the setup

1. Make a change to `Code.gs`
2. Commit and push to the main branch
3. Check the Actions tab in GitHub to see the deployment progress

## File Structure

```
quantive-export/
├── .github/workflows/deploy-gas.yml   # GitHub Actions workflow
├── .clasp.json                        # Clasp project configuration
├── gas-src/                          # Source files for Google Apps Script
│   ├── appsscript.json              # Apps Script manifest
│   └── Code.js                      # Main script file (copied from Code.gs)
├── Code.gs                          # Source file (automatically copied to gas-src/)
└── CLASP_SETUP.md                   # This setup guide
```

## How it works

1. When you push to main branch, GitHub Actions triggers
2. The workflow copies `Code.gs` to `gas-src/Code.js`
3. Uses clasp to push the code to Google Apps Script
4. Creates a new version and deploys it

## Troubleshooting

- **Authentication errors**: Re-run `clasp login` and update the CLASPRC_JSON secret
- **Script ID errors**: Verify the CLASP_JSON secret contains the correct scriptId
- **Permission errors**: Ensure the Google account has access to the Apps Script project

## Security Notes

- The `.clasprc.json` file contains sensitive OAuth tokens - never commit it to git
- GitHub Secrets are encrypted and only accessible during workflow runs
- The workflow only runs on pushes to the main branch affecting relevant files