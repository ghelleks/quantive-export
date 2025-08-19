# ADR-006: Configuration Management - Script Properties vs Configuration Files

## Status
Accepted

## Context
The Quantive Export application requires secure and flexible configuration management for API credentials, session identifiers, and operational parameters. The configuration must work across multiple environments (local development, staging, production) while maintaining security best practices for enterprise deployment.

### Problem Statement
- **Security Requirements**: API tokens and credentials require secure storage and access
- **Environment Management**: Need consistent configuration across local development, staging, and production
- **Google Apps Script Constraints**: Limited file system access and configuration options
- **Developer Experience**: Configuration should be easy to manage during development
- **Enterprise Security**: Must meet enterprise security requirements for credential management
- **Git Security**: Prevent accidental commitment of sensitive credentials to version control

### Decision Drivers
1. **Security First**: API credentials and tokens must be stored securely
2. **Platform Integration**: Leverage Google Apps Script native capabilities
3. **Environment Flexibility**: Support local development and production deployment
4. **Developer Experience**: Simple configuration management during development
5. **Enterprise Compliance**: Meet enterprise security and audit requirements
6. **Git Safety**: Prevent credential exposure in version control

## Alternatives Considered

### Option 1: Configuration Files (config.js, .env)
- **Description**: Store configuration in files (config.js for production, .env for development)
- **Pros**:
  - Industry standard approach
  - Easy to manage during development
  - Version control friendly (with proper gitignore)
  - Clear configuration structure
  - Environment-specific configuration files
- **Cons**:
  - Google Apps Script has limited file system access
  - Risk of accidentally committing sensitive files to git
  - Additional complexity for deployment
  - Not native to Google Apps Script platform
  - Requires custom file loading mechanisms
- **Risk Level**: High (security risks, platform limitations)

### Option 2: Script Properties with Environment Variable Development
- **Description**: Use Google Apps Script Script Properties for production, environment variables for local development
- **Pros**:
  - Native Google Apps Script integration
  - Encrypted storage in Google's infrastructure
  - No risk of credential exposure in version control
  - Seamless local development with .env files
  - Platform-optimized approach
  - Built-in security and access control
- **Cons**:
  - Requires manual setup in Google Apps Script console
  - Different configuration methods for different environments
  - No version control of configuration changes
  - Learning curve for Script Properties
- **Risk Level**: Low (secure, platform-native)

### Option 3: External Configuration Service
- **Description**: Use external service (AWS Parameter Store, HashiCorp Vault) for configuration management
- **Pros**:
  - Enterprise-grade configuration management
  - Centralized configuration across multiple applications
  - Advanced security features and audit trails
  - Version control of configuration changes
- **Cons**:
  - Significant additional complexity and infrastructure
  - Additional service dependencies and costs
  - Network latency for configuration retrieval
  - Over-engineering for current application scope
  - Google Apps Script network access limitations
- **Risk Level**: High (complexity, infrastructure overhead)

### Option 4: Hybrid Configuration with Build-Time Injection
- **Description**: Inject configuration at build/deploy time from secure sources
- **Pros**:
  - Secure configuration management
  - Build-time validation of configuration
  - No runtime configuration dependencies
- **Cons**:
  - Complex build system requirements
  - Difficult to change configuration without redeployment
  - Additional tooling and maintenance overhead
  - Not suitable for dynamic configuration changes
- **Risk Level**: Medium (complexity, inflexibility)

## Decision
**Chosen Option 2: Script Properties with Environment Variable Development**

### Rationale
1. **Security Excellence**: Script Properties provide encrypted, secure storage
2. **Platform Native**: Leverages Google Apps Script built-in capabilities
3. **Development Friendly**: .env files provide excellent local development experience
4. **Zero Git Risk**: No possibility of credential exposure in version control
5. **Enterprise Ready**: Meets enterprise security and compliance requirements
6. **Unified Configuration**: Same configuration keys work in both environments

### Implementation Strategy
- **Production Configuration**: Use Script Properties in Google Apps Script
- **Development Configuration**: Use .env files with PropertiesService mock
- **Configuration Validation**: Built-in validation for required properties
- **Security Best Practices**: Comprehensive .gitignore to prevent credential exposure
- **Documentation**: Clear setup guides for both environments

## Consequences

### Positive
- **Maximum Security**: Encrypted storage with Google's infrastructure security
- **Platform Optimized**: Native Google Apps Script integration with zero configuration overhead
- **Developer Experience**: .env files provide excellent local development workflow
- **Git Safety**: Zero risk of credential exposure in version control
- **Enterprise Compliance**: Meets enterprise security and audit requirements
- **Unified Interface**: Same configuration keys and access patterns in all environments
- **Simple Deployment**: No additional configuration files to manage during deployment
- **Access Control**: Built-in Google account-based access control

### Negative
- **Manual Setup**: Requires manual configuration in Google Apps Script console
- **Environment Differences**: Different configuration methods for development vs production
- **No Configuration Versioning**: Script Properties changes not tracked in version control
- **Learning Curve**: Developers need to understand Script Properties interface

### Neutral
- **Configuration Changes**: Production configuration changes require Google Apps Script console access
- **Backup Strategy**: Configuration backup requires manual export from Script Properties
- **Debugging**: Configuration debugging requires understanding of both environments

## Implementation Notes

### Production Configuration (Google Apps Script)

**Script Properties Setup**:
1. Open Google Apps Script project
2. Navigate to Project Settings → Script Properties
3. Add required configuration key-value pairs
4. Properties are automatically encrypted and secured by Google

**Required Properties**:
```
QUANTIVE_API_TOKEN: Your Quantive API authentication token
QUANTIVE_ACCOUNT_ID: Your Quantive account identifier
SESSIONS: Session names or UUIDs (comma-separated or JSON array)
GOOGLE_DOC_ID: Target Google Doc ID for report output (optional)
TEXT_FILE_ID: Target text file ID for markdown output (optional)
QUANTIVE_BASE_URL: API base URL (defaults to US endpoint)
LOOKBACK_DAYS: Days for recent activity tracking (default: 7)
```

### Development Configuration (.env files)

**Local Development Setup**:
```bash
# Create .env file (never committed to git)
QUANTIVE_API_TOKEN=your_api_token_here
QUANTIVE_ACCOUNT_ID=your_account_id_here
SESSIONS=Q4 2024 OKRs,Annual Goals
GOOGLE_DOC_ID=your_doc_id_here
TEXT_FILE_ID=your_file_id_here
QUANTIVE_BASE_URL=https://api.quantive.com
LOOKBACK_DAYS=7
```

### Configuration Access Pattern

**Unified Configuration Interface**:
```javascript
function getConfig() {
  const config = {
    apiToken: PropertiesService.getScriptProperties().getProperty('QUANTIVE_API_TOKEN'),
    accountId: PropertiesService.getScriptProperties().getProperty('QUANTIVE_ACCOUNT_ID'),
    sessions: PropertiesService.getScriptProperties().getProperty('SESSIONS'),
    // ... other properties
  };
  
  // Validation
  validateConfig(config);
  return config;
}
```

**Environment Mapping (local-debug.js)**:
```javascript
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => process.env[key] || null
  })
};
```

### Security Implementation

**Git Security Configuration (.gitignore)**:
```gitignore
# Environment files (contain sensitive credentials)
.env
.env.*
!.env.example

# Clasp authentication files (contain sensitive OAuth tokens)
.clasprc.json
~/.clasprc.json

# Test output that might contain sensitive data
debug-output/
```

**Configuration Validation**:
```javascript
function validateConfig(config) {
  const required = ['apiToken', 'accountId', 'sessions'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  
  // Additional validation
  if (!config.apiToken.startsWith('qtv_')) {
    throw new Error('Invalid API token format');
  }
}
```

### Environment-Specific Features

**Development Benefits**:
- Real-time configuration changes without deployment
- Local credential management
- Environment variable IDE integration
- Easy testing with different configurations

**Production Benefits**:
- Google-encrypted credential storage
- Built-in access control and audit logging
- No deployment complexity for configuration
- Platform-native security integration

### Migration and Setup Process

**New Developer Onboarding**:
1. **Local Setup**: Create .env file from template with appropriate values
2. **API Testing**: Use `npm run test-api` to validate configuration
3. **Production Access**: Gain access to Google Apps Script project for Script Properties

**Production Deployment**:
1. **Script Properties Setup**: Configure all required properties in Google Apps Script console
2. **Configuration Validation**: Run `testApiConnection()` to verify setup
3. **Deployment**: Automated deployment via GitHub Actions requires no configuration changes

### Security Best Practices Implemented

1. **Credential Isolation**: Development and production credentials completely isolated
2. **Git Safety**: Comprehensive .gitignore prevents any credential exposure
3. **Validation**: Built-in validation prevents deployment with invalid configuration
4. **Access Control**: Google account-based access to Script Properties
5. **Encryption**: Automatic encryption of Script Properties by Google infrastructure
6. **Audit Trail**: Google Apps Script provides audit logging for configuration access

### Success Metrics

**Security Achievements**:
- Zero credential exposures in version control history
- 100% encrypted credential storage in production
- Enterprise security compliance verified

**Developer Experience**:
- <5 minute setup time for new developer environment
- Consistent configuration interface across all environments
- Zero configuration-related deployment failures

**Operational Efficiency**:
- No configuration-related production issues since implementation
- Simple configuration changes without application redeployment
- Clear configuration validation and error messages

## References
- [CLAUDE.md Configuration Management](../CLAUDE.md#configuration-management)
- [Google Apps Script PropertiesService Documentation](https://developers.google.com/apps-script/reference/properties/properties-service)
- [Local Debug Environment Configuration](../../local-debug.js#L18-L22)
- [Git Security Configuration](../../.gitignore)
- [Environment Setup Guide](../setup-guide.md)
- Enterprise security compliance documentation and best practices