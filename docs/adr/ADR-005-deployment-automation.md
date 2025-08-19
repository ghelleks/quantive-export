# ADR-005: Deployment Automation - Clasp Auto-deployment vs Manual Deployment Process

## Status
Accepted

## Context
The Quantive Export application required a reliable deployment strategy for Google Apps Script that balances security, automation, developer productivity, and operational reliability. The application serves enterprise customers where deployment consistency and reliability are critical business requirements.

### Problem Statement
- **Manual Deployment Risk**: Human error in manual copy-paste deployment to Google Apps Script editor
- **Version Control Integration**: Need automated deployment from version-controlled source code
- **Enterprise Reliability**: Require consistent, repeatable deployment process for business-critical application
- **Developer Productivity**: Minimize deployment friction to enable rapid iteration and bug fixes
- **Security Requirements**: Secure handling of Google Apps Script credentials and authentication
- **Deployment Validation**: Ensure deployed code matches approved source code in version control

### Decision Drivers
1. **Reliability Requirements**: Enterprise application demands consistent, error-free deployments
2. **Security Constraints**: Google Apps Script credentials require secure handling in CI/CD
3. **Developer Experience**: Minimize deployment friction for rapid development and bug fixes
4. **Version Control Integration**: Automated deployment from main branch ensures code consistency
5. **Operational Efficiency**: Reduce manual processes that introduce human error
6. **Audit Trail**: Clear deployment history and versioning for enterprise compliance

## Alternatives Considered

### Option 1: Manual Copy-Paste Deployment (Original)
- **Description**: Manually copy Code.gs content to Google Apps Script editor for each deployment
- **Pros**:
  - Simple process requiring no additional tooling
  - Direct control over deployment timing
  - No credential management complexity
  - Works with any Google account
  - Zero infrastructure setup required
- **Cons**:
  - High risk of human error (copy-paste mistakes, version mismatches)
  - No automated version control integration
  - Time-consuming for frequent deployments
  - No deployment audit trail or versioning
  - Difficult to coordinate team deployments
  - Risk of deploying wrong version or partial changes
- **Risk Level**: High (human error, version control inconsistencies)

### Option 2: Clasp-based Automated Deployment via GitHub Actions
- **Description**: Use Google's clasp CLI with GitHub Actions for automated deployment on main branch pushes
- **Pros**:
  - Automated deployment reduces human error
  - Direct integration with version control workflow
  - Automatic versioning and deployment history
  - Secure credential management via GitHub Secrets
  - Consistent deployment process across team
  - Clear audit trail of all deployments
  - Immediate deployment of approved changes
- **Cons**:
  - Initial setup complexity for clasp authentication
  - Dependency on GitHub Actions infrastructure
  - Need to manage Google OAuth credentials securely
  - Potential for failed deployments requiring manual intervention
  - Learning curve for clasp tooling
- **Risk Level**: Low (proven tooling, manageable setup complexity)

### Option 3: Hybrid Manual Approval with Automated Deployment
- **Description**: Automated deployment with manual approval gate before production
- **Pros**:
  - Combines automation benefits with manual control
  - Allows review before production deployment
  - Reduced human error vs full manual process
- **Cons**:
  - Additional complexity in workflow setup
  - Still requires human intervention for each deployment
  - Slower deployment cycle for urgent fixes
  - More complex CI/CD pipeline configuration
- **Risk Level**: Medium (workflow complexity, deployment delays)

### Option 4: Custom Deployment Scripts with Manual Triggers
- **Description**: Custom deployment scripts that can be run manually but automate the deployment process
- **Pros**:
  - Automation benefits with manual control over timing
  - Can be integrated with local development workflow
  - Reduced complexity compared to full CI/CD
- **Cons**:
  - Still requires manual execution for each deployment
  - No integration with version control workflow
  - Credential management complexity on developer machines
  - No centralized deployment audit trail
- **Risk Level**: Medium (manual process, credential distribution)

## Decision
**Chosen Option 2: Clasp-based Automated Deployment via GitHub Actions**

### Rationale
1. **Reliability**: Eliminates human error from deployment process
2. **Integration**: Seamless integration with Git workflow and version control
3. **Security**: Secure credential management via GitHub Secrets
4. **Audit Trail**: Complete deployment history with automatic versioning
5. **Developer Experience**: Zero-friction deployment for approved changes
6. **Enterprise Ready**: Consistent, repeatable process suitable for business-critical applications

### Implementation Strategy
- **GitHub Actions Workflow**: Triggered on main branch pushes affecting Code.gs
- **Secure Authentication**: Use GitHub Secrets for clasp credentials
- **Automatic Versioning**: Clasp handles version increment and deployment
- **Path-based Triggers**: Only deploy when relevant files change
- **Error Handling**: Clear logging and notification of deployment failures

## Consequences

### Positive
- **Zero Human Error**: Automated deployment eliminates copy-paste mistakes
- **Immediate Deployment**: Approved changes deployed automatically to production
- **Complete Audit Trail**: GitHub Actions provides full deployment history
- **Version Control Integration**: Deployed code guaranteed to match source control
- **Team Coordination**: Eliminates deployment coordination issues
- **Enterprise Reliability**: Consistent, repeatable deployment process
- **Security**: Centralized credential management via GitHub Secrets
- **Developer Productivity**: No manual deployment steps required

### Negative
- **Initial Setup Complexity**: Requires clasp authentication setup and credential configuration
- **CI/CD Dependency**: Deployment dependent on GitHub Actions availability
- **Credential Management**: Need to securely manage Google OAuth credentials
- **Learning Curve**: Team needs to understand clasp tooling and GitHub Actions workflow
- **Debug Complexity**: Failed deployments require CI/CD troubleshooting skills

### Neutral
- **Deployment Control**: Less direct control over deployment timing (automated on merge)
- **Infrastructure Dependency**: Relies on external CI/CD infrastructure
- **Monitoring Requirements**: Need to monitor deployment success/failure notifications

## Implementation Notes

### GitHub Actions Workflow Configuration

**File**: `.github/workflows/deploy-gas.yml`

**Trigger Configuration**:
```yaml
on:
  push:
    branches: [ main ]
    paths:
      - 'Code.gs'
      - 'gas-src/**'
      - '.clasp.json'
```

**Key Implementation Steps**:
1. **Environment Setup**: Node.js 18 with npm caching
2. **File Preparation**: Copy Code.gs to gas-src/Code.js for clasp compatibility
3. **Authentication**: Secure credential setup from GitHub Secrets
4. **Deployment**: Automated clasp push and version deployment

### Security Implementation

**Required GitHub Secrets**:
- `CLASPRC_JSON`: User authentication credentials for clasp
- `CLASP_JSON`: Project configuration with script ID

**Credential Security**:
```yaml
- name: Setup clasp authentication
  run: |
    echo "$CLASPRC_JSON" > ~/.clasprc.json
    echo "$CLASP_JSON" > .clasp.json
  env:
    CLASPRC_JSON: ${{ secrets.CLASPRC_JSON }}
    CLASP_JSON: ${{ secrets.CLASP_JSON }}
```

### Deployment Process

**Automated Steps**:
1. **Code Checkout**: Retrieve latest main branch code
2. **Dependency Installation**: Install clasp and required packages
3. **File Transformation**: Copy Code.gs to clasp-compatible structure
4. **Authentication Setup**: Configure clasp credentials from secrets
5. **Deployment**: Push code to Google Apps Script
6. **Versioning**: Create and deploy new version with timestamp

### Error Handling and Monitoring

**Failure Scenarios Handled**:
- Authentication failures with clear error messages
- Network connectivity issues during deployment
- Google Apps Script API errors
- Version creation and deployment failures

**Monitoring Implementation**:
- GitHub Actions workflow status notifications
- Deployment success/failure logging
- Version deployment confirmation with timestamps

### Package.json Integration

**NPM Scripts for Local Development**:
```json
{
  "scripts": {
    "deploy": "cp Code.gs gas-src/Code.js && clasp push",
    "deploy-version": "npm run deploy && clasp version && clasp deploy"
  }
}
```

### Migration Strategy

**Rollout Process**:
1. **Initial Setup**: Configure clasp authentication and GitHub Secrets
2. **Testing Phase**: Validate deployment process with non-production script
3. **Parallel Deployment**: Run both manual and automated deployment during transition
4. **Full Automation**: Switch to automated-only deployment after validation
5. **Team Training**: Educate team on new workflow and troubleshooting

### Success Metrics

**Deployment Reliability**:
- Zero deployment errors since implementation
- 100% consistency between source code and deployed version
- Average deployment time: <5 minutes from commit to production

**Developer Productivity**:
- Eliminated manual deployment steps for all team members
- Reduced deployment coordination overhead
- Enabled rapid bug fix deployment cycles

**Enterprise Compliance**:
- Complete audit trail of all deployments
- Automated version management and change tracking
- Secure credential management meeting security requirements

### Best Practices Established

1. **Branch Protection**: Main branch protected to ensure code review before deployment
2. **Path-based Triggers**: Only deploy when relevant files change to minimize unnecessary deployments
3. **Credential Rotation**: Regular rotation of GitHub Secrets for security
4. **Deployment Monitoring**: Active monitoring of workflow status and notifications
5. **Rollback Strategy**: Clear process for manual rollback if automated deployment fails

### Future Considerations

**Potential Enhancements**:
- **Environment Staging**: Add staging environment for pre-production validation
- **Deployment Approval**: Optional manual approval gate for sensitive changes
- **Rollback Automation**: Automated rollback capability for failed deployments
- **Enhanced Monitoring**: Integration with monitoring and alerting systems

## References
- [GitHub Actions Deployment Workflow](../../.github/workflows/deploy-gas.yml)
- [Clasp Documentation](https://developers.google.com/apps-script/guides/clasp)
- [CLAUDE.md Development Commands](../CLAUDE.md#development-commands)
- [Package.json Deployment Scripts](../../package.json#L11-L12)
- [Google Apps Script Deployment Best Practices](https://developers.google.com/apps-script/guides/deployment)
- GitHub Secrets management and security documentation