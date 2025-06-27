# Testing Guide for Quantive Export

This guide explains how to set up and run tests for the Quantive Export application, including both unit tests with mocks and integration tests with real API calls.

## 🏗️ Test Architecture

Our testing strategy uses a dual approach:

- **Unit Tests**: Fast tests with mocked Google Apps Script services and API responses
- **Integration Tests**: Real API calls using test credentials (optional, requires setup)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Test Credentials (Optional)

For integration tests, copy the credential template and fill in real values:

```bash
npm run setup:test
```

Then edit `.env.test` with your test Quantive credentials:

```bash
# Edit this file with real test credentials
vi .env.test
```

**Important**: Use a dedicated test account, not production!

### 3. Run Tests

```bash
# Run all tests (unit + integration)
npm test

# Run only unit tests (fast, no credentials needed)
npm run test:unit

# Run only integration tests (requires credentials)
npm run test:integration

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🔧 Test Setup Details

### Prerequisites

- Node.js 16+ installed
- Quantive test account with API access (for integration tests)
- Test sessions created in your Quantive account

### Credential Configuration

#### Required for Integration Tests

Create `.env.test` with these values:

```bash
# Real Quantive API credentials for testing
QUANTIVE_API_TOKEN=qtv_your_real_test_token
QUANTIVE_ACCOUNT_ID=your_test_account_id
QUANTIVE_BASE_URL=https://app.us.quantive.com/results/api

# Test session identifiers (must exist in your test account)
TEST_SESSION_NAME=Test Session Q4 2024
TEST_SESSION_UUID=12345678-abcd-1234-efgh-123456789012
INVALID_SESSION_NAME=Nonexistent Session

# Test control flags
SKIP_API_TESTS=false
API_TEST_TIMEOUT=10000
```

#### Safety Measures

- `.env.test` is automatically gitignored
- Tests validate you're using test accounts (not production)
- Integration tests can be disabled via `SKIP_API_TESTS=true`
- Pre-commit hooks prevent credential leakage

### Test Data Requirements

For integration tests, ensure your test Quantive account has:

1. At least one active session with a clear name
2. Sessions with objectives and key results
3. Permission to list sessions via API

## 📊 Test Structure

```
test/
├── setup/                  # Test configuration and mocks
│   ├── jest.setup.js      # Global test setup
│   ├── credentials.js     # Credential management
│   └── check-credentials.js # Pre-test validation
├── unit/                   # Unit tests (mocked)
│   ├── ConfigManager.test.js
│   ├── SessionResolution.test.js
│   └── QuantiveApiClient.test.js
├── integration/            # Integration tests (real API)
│   └── api-real.test.js
└── fixtures/               # Test data
    ├── mock-sessions.json
    └── mock-responses.json
```

## 🧪 Test Categories

### Unit Tests (`npm run test:unit`)

**Purpose**: Test individual functions and classes in isolation
**Speed**: Fast (~2-5 seconds)
**Requirements**: None (fully mocked)

**What's tested**:
- Session name to UUID resolution logic
- Configuration management
- Input validation
- Error handling
- API client request formatting

**Mocked services**:
- Google Apps Script services (PropertiesService, Logger, etc.)
- HTTP requests (UrlFetchApp)
- Quantive API responses

### Integration Tests (`npm run test:integration`)

**Purpose**: Test against real Quantive API
**Speed**: Slower (~10-30 seconds)
**Requirements**: Real test credentials and test account

**What's tested**:
- Actual API connectivity
- Authentication with real credentials
- Session name resolution with real data
- Error handling with real API responses
- Performance and reliability

## 🎯 Test Coverage

### Current Coverage Targets

- **ConfigManager.resolveSessionId()**: 100% (critical functionality)
- **QuantiveApiClient**: 95%
- **Error handling**: 90%
- **Overall**: 85%

### Key Test Scenarios

✅ **Session Name Resolution**:
- UUID detection and pass-through
- Case-insensitive name matching
- Special characters in names
- Session not found errors
- Empty session lists

✅ **Configuration Management**:
- Property storage and retrieval
- Environment-specific settings
- Configuration validation
- Complete config object generation

✅ **API Client**:
- Correct request formatting
- Header configuration
- Response parsing
- Error handling (401, 404, 500)

✅ **Integration Scenarios**:
- Real API authentication
- Actual session data retrieval
- Network error handling
- Performance validation

## 🛡️ Security & Safety

### Credential Protection

- All credential files are gitignored
- Pre-commit hooks prevent accidental commits
- Credential validation before tests run
- Safety checks for production account usage

### Test Account Requirements

- Use dedicated test Quantive account
- Never use production credentials
- Test account should have limited, non-sensitive data
- Regular credential rotation recommended

## 🚨 Troubleshooting

### Common Issues

#### "No valid credentials" - Integration tests skipped

**Solution**:
```bash
# Copy template and edit with real values
cp .env.test.example .env.test
vi .env.test

# Set SKIP_API_TESTS=false
# Add real test credentials
```

#### Tests failing with "Session not found"

**Solution**:
- Verify `TEST_SESSION_NAME` exists in your test account
- Check session name matches exactly (case-insensitive)
- Ensure session is active, not archived

#### "Authentication failed" errors

**Solution**:
- Verify API token is valid and not expired
- Check account ID matches the token's account
- Ensure test account has API access enabled

#### Unit tests pass but integration tests fail

**Solution**:
- Check network connectivity
- Verify Quantive API is accessible
- Confirm test account permissions
- Review API token scope and permissions

### Debugging Tests

#### Enable verbose logging:
```bash
npm test -- --verbose
```

#### Run specific test:
```bash
npm test -- --testNamePattern="session name resolution"
```

#### Debug integration tests:
```bash
npm run test:integration -- --verbose
```

## 📈 Development Workflow

### Adding New Tests

1. **Unit tests** for new functionality in `test/unit/`
2. **Integration tests** for API-related features in `test/integration/`
3. **Test data** in `test/fixtures/` for reusable mock data

### Test-Driven Development

```bash
# Watch mode for rapid development
npm run test:watch

# Run specific test file during development
npm test test/unit/SessionResolution.test.js
```

### Pre-Commit Testing

```bash
# Run full test suite before committing
npm run test:all

# Quick unit test check
npm run test:unit
```

## 🔄 Continuous Integration

### GitHub Actions (Recommended)

**Unit Tests**: Run on every PR (no credentials needed)
**Integration Tests**: Run on main branch (with CI secrets)

### Environment Variables for CI

```yaml
# GitHub Secrets for integration tests
QUANTIVE_API_TOKEN_TEST: ${{ secrets.QUANTIVE_API_TOKEN_TEST }}
QUANTIVE_ACCOUNT_ID_TEST: ${{ secrets.QUANTIVE_ACCOUNT_ID_TEST }}
TEST_SESSION_NAME: ${{ secrets.TEST_SESSION_NAME }}
```

## 📝 Best Practices

### Writing Tests

- **One test, one behavior**: Each test should verify a single aspect
- **Clear test names**: Describe the exact scenario being tested
- **Arrange-Act-Assert**: Structure tests consistently
- **No test dependencies**: Tests should run independently
- **Mock external dependencies**: Keep unit tests fast and reliable

### Test Data Management

- Use fixtures for consistent test data
- Keep test data realistic but minimal
- Update test data when API responses change
- Document test data requirements

### Integration Test Guidelines

- Test real error scenarios, not just happy paths
- Verify performance characteristics
- Test edge cases that can't be mocked
- Keep integration tests focused and efficient

## 🤝 Contributing

When adding new functionality:

1. Write unit tests first (TDD approach)
2. Add integration tests for API-related features
3. Update test fixtures if needed
4. Ensure all tests pass before submitting PR
5. Update this documentation for new test requirements

---

**Happy Testing!** 🎉

For questions or issues, please check the troubleshooting section above or create an issue in the repository.