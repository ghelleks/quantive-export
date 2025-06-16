## **Requirements Document: Quantive Session Snapshot & Summary Google App Script**

**Version:** 2.0

**Date:** June 16, 2025

### **1\. Introduction & Purpose**

This document outlines the requirements for a Google App Script designed to connect to the Quantive (formerly Gtmhub) API. The primary purpose of this script is to periodically capture a snapshot of a specified Quantive "Session" (e.g., a quarterly planning period). It will then generate a concise summary of the session's current status and recent activities, and output this summary into a Google Doc or Google Sheet for easy consumption and historical tracking.

This tool will help teams and leadership get a quick, regular pulse on OKR progress without needing to manually log into Quantive and compile the data.

### **2\. Scope**

**In-Scope:**

* Authentication with the Quantive API using a secure API token.  
* Ability to specify a target Quantive Session to be analyzed.  
* Fetching data for Objectives and Key Results within the specified session.  
* Calculating summary statistics for the session, including overall progress and status breakdowns.  
* Identifying recent changes to Objectives and Key Results (e.g., new KR updates, status changes) within a defined lookback period.  
* Generating a formatted summary report.  
* Writing the summary report to a new or existing Google Doc or a new tab in a Google Sheet.  
* Automated, time-based execution of the script (e.g., weekly).

**Out-of-Scope:**

* A user interface for managing the script (configuration will be done through Google Apps Script properties and configuration templates).  
* Modifying or updating any data within Quantive (read-only operations).  
* Detailed historical trend analysis beyond the simple lookback period.  
* Support for Quantive features beyond Sessions, Objectives, and Key Results.  
* Real-time notifications (e.g., email or chat alerts).

### **3\. Functional Requirements**

| ID | Requirement Description | Priority |
| :---- | :---- | :---- |
| **FR-01** | **Authentication:** The script must securely authenticate with the Quantive REST API using a provided API token and Account ID. These credentials will be stored securely within Google Apps Script's PropertiesService with encryption. | Must-Have |
| **FR-02** | **Session Selection:** A user must be able to easily configure the script to target a specific Quantive Session by its unique ID. | Must-Have |
| **FR-03** | **Data Fetching:** The script must fetch all Objectives and their associated Key Results for the specified Quantive Session. This includes details like name, owner, current value, target value, and status. | Must-Have |
| **FR-04** | **Overall Progress Calculation:** The script shall calculate the overall percentage of completion for the entire Session based on the progress of its Key Results. | Must-Have |
| **FR-05** | **Status Summary:** The script shall generate a summary of OKR statuses, providing a count for each status category (e.g., 'On Track', 'At Risk', 'Behind'). | Must-Have |
| **FR-06** | **Recent Activity Identification:** The script must identify all Key Results that have been updated within a configurable lookback period (e.g., the last 7 days). | Must-Have |
| **FR-07** | **Report Generation (Google Doc):** The script must be able to generate a new, formatted Google Doc containing the summary and recent activity. The document should have a clear title, headings for each section, and readable formatting. | Should-Have |
| **FR-08** | **Report Generation (Google Sheet):** The script must be able to append a new row to a specified Google Sheet. Each column will represent a piece of data (e.g., Date, Overall Progress, \# On Track, \# At Risk, Recent Activity Summary). | Could-Have |
| **FR-09** | **Automated Trigger:** The script must be configurable to run automatically on a schedule (e.g., every Monday at 9 AM) using Google App Script's time-driven triggers. | Must-Have |
| **FR-10** | **Error Handling:** The script should gracefully handle potential errors, such as API connection failures or invalid configuration, and log these errors for troubleshooting. | Must-Have |
| **FR-11** | **Configuration Management:** The script must provide secure configuration management with support for multiple environments (development, staging, production) and validation of API credentials. | Must-Have |
| **FR-12** | **Configuration Templates:** The script must include comprehensive configuration templates and examples to guide users through secure setup. | Should-Have |
| **FR-13** | **Credential Validation:** The script must validate API token formats, account IDs, and session IDs to prevent common configuration errors. | Should-Have |
| **FR-14** | **Configuration Import/Export:** The script should provide utilities to securely import and export configuration settings while protecting sensitive credentials. | Could-Have |

### **4\. Non-Functional Requirements**

| ID | Requirement Description | Priority |
| :---- | :---- | :---- |
| **NFR-01** | **Security:** The Quantive API token must be stored securely using Google Apps Script's PropertiesService with encryption and never be hard-coded directly in the script file. Configuration templates must use placeholder values only. | Must-Have |
| **NFR-02** | **Performance:** The script should execute within the Google Apps Script execution time limits (currently 6 minutes for consumer accounts). It should make efficient API calls to avoid rate limiting with configurable delays. | Must-Have |
| **NFR-03** | **Configurability:** Key parameters such as the Quantive Session ID, API credentials, Google Doc/Sheet ID, and the recent activity lookback period should be easily configurable through Google Apps Script properties with environment-specific settings support. | Must-Have |
| **NFR-04** | **Readability & Maintainability:** The code should be well-commented with comprehensive JSDoc documentation and organized into logical classes and functions to allow for easy understanding and future modifications. | Must-Have |
| **NFR-05** | **Environment Management:** The script must support multiple deployment environments (development, staging, production) with environment-specific configuration settings and rate limiting. | Should-Have |
| **NFR-06** | **Credential Security:** API tokens and sensitive credentials must be validated for format correctness and protected from accidental exposure in logs or error messages. | Must-Have |
| **NFR-07** | **Configuration Usability:** Setup process must be streamlined with clear documentation, configuration templates, and validation to prevent common setup errors. | Should-Have |

### **5\. Assumptions and Dependencies**

* The user has a valid Quantive account with API access.  
* The user has the necessary permissions within Quantive to read the data for the target Session.  
* The user has basic familiarity with Google Apps Script and can follow configuration setup instructions.  
* The structure of the Quantive API and its data objects (Sessions, Objectives, Key Results) will remain consistent. Any breaking changes to the API may require script updates.
* Users will follow the provided security best practices for credential management and not commit sensitive information to version control.

### **6\. Configuration Management Features**

The script now includes enhanced configuration management capabilities:

#### **6.1 Secure Configuration Storage**
- All sensitive credentials stored in Google Apps Script's encrypted PropertiesService
- No hardcoded API tokens or secrets in source code
- Configuration template file (`config.example.js`) with placeholder values only

#### **6.2 Environment Support** 
- Support for development, staging, and production environments
- Environment-specific settings for rate limiting, logging, and retry behavior
- Configurable through `ENVIRONMENT` property

#### **6.3 Configuration Utilities**
- `importConfiguration()` function for secure configuration import
- `exportConfiguration()` function with option to exclude sensitive data
- Enhanced `setupConfiguration()` with comprehensive guidance

#### **6.4 Validation & Security**
- API token format validation with length and character checks
- Account ID validation to prevent placeholder values
- Session ID UUID format validation
- Protection against accidental exposure of credentials in logs

#### **6.5 User Experience**
- Clear setup instructions in configuration template
- Comprehensive error messages for configuration issues
- Step-by-step guidance for Google Apps Script properties setup
