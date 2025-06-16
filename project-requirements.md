## **Requirements Document: Quantive Session Snapshot & Summary Google App Script**

**Version:** 1.0

**Date:** June 17, 2025

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

* A user interface for managing the script (configuration will be done directly in the script's code/properties).  
* Modifying or updating any data within Quantive (read-only operations).  
* Detailed historical trend analysis beyond the simple lookback period.  
* Support for Quantive features beyond Sessions, Objectives, and Key Results.  
* Real-time notifications (e.g., email or chat alerts).

### **3\. Functional Requirements**

| ID | Requirement Description | Priority |
| :---- | :---- | :---- |
| **FR-01** | **Authentication:** The script must securely authenticate with the Quantive REST API using a provided API token and Account ID. These credentials will be stored securely within the script's properties. | Must-Have |
| **FR-02** | **Session Selection:** A user must be able to easily configure the script to target a specific Quantive Session by its unique ID. | Must-Have |
| **FR-03** | **Data Fetching:** The script must fetch all Objectives and their associated Key Results for the specified Quantive Session. This includes details like name, owner, current value, target value, and status. | Must-Have |
| **FR-04** | **Overall Progress Calculation:** The script shall calculate the overall percentage of completion for the entire Session based on the progress of its Key Results. | Must-Have |
| **FR-05** | **Status Summary:** The script shall generate a summary of OKR statuses, providing a count for each status category (e.g., 'On Track', 'At Risk', 'Behind'). | Must-Have |
| **FR-06** | **Recent Activity Identification:** The script must identify all Key Results that have been updated within a configurable lookback period (e.g., the last 7 days). | Must-Have |
| **FR-07** | **Report Generation (Google Doc):** The script must be able to generate a new, formatted Google Doc containing the summary and recent activity. The document should have a clear title, headings for each section, and readable formatting. | Should-Have |
| **FR-08** | **Report Generation (Google Sheet):** The script must be able to append a new row to a specified Google Sheet. Each column will represent a piece of data (e.g., Date, Overall Progress, \# On Track, \# At Risk, Recent Activity Summary). | Could-Have |
| **FR-09** | **Automated Trigger:** The script must be configurable to run automatically on a schedule (e.g., every Monday at 9 AM) using Google App Script's time-driven triggers. | Must-Have |
| **FR-10** | **Error Handling:** The script should gracefully handle potential errors, such as API connection failures or invalid configuration, and log these errors for troubleshooting. | Must-Have |

### **4\. Non-Functional Requirements**

| ID | Requirement Description | Priority |
| :---- | :---- | :---- |
| **NFR-01** | **Security:** The Quantive API token must be stored securely using Google App Script's Properties Service and not be hard-coded directly in the script file. | Must-Have |
| **NFR-02** | **Performance:** The script should execute within the Google App Script execution time limits (currently 6 minutes for consumer accounts). It should make efficient API calls to avoid rate limiting. | Must-Have |
| **NFR-03** | **Configurability:** Key parameters such as the Quantive Session ID, API credentials, Google Doc/Sheet ID, and the recent activity lookback period should be easily configurable at the top of the script file or in the script properties. | Should-Have |
| **NFR-04** | **Readability & Maintainability:** The code should be well-commented and organized into logical functions to allow for easy understanding and future modifications. | Should-Have |

### **5\. Assumptions and Dependencies**

* The user has a valid Quantive account with API access.  
* The user has the necessary permissions within Quantive to read the data for the target Session.  
* The user is familiar with creating and managing Google App Scripts and setting up time-driven triggers.  
* The structure of the Quantive API and its data objects (Sessions, Objectives, Key Results) will remain consistent. Any breaking changes to the API may require script updates.
