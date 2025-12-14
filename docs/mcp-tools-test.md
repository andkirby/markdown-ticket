# MCP Tools Test Cases - DEM Project

This document contains comprehensive test cases for all mdt-all MCP tools (excluding suggest_cr_improvements) to be executed against the DEM project.

Create Plan, run all tests.
Create a report here.

!!! PROJECT CODE IS "DEM" !!!

!!! USE ONLY MCP mdt-all !!!

## Test Environment Setup

- **Project Code**: DEM
- **Project ID**: demo-project
- **Project Path**: /Users/kirby/home/markdown-ticket/demo-project

---

## 1. list_projects Tool

### Test Case 1.1: Basic Project Listing
**Objective**: Verify the tool can list all available projects
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "list_projects",
    "arguments": {}
  }
}
```
**Expected Response**:
- Returns a list containing at least 17 projects
- DEM project should be present with code "DEM"
- Each project should include: code, id, path, and description (if available)

### Test Case 1.2: Verify DEM Project Details
**Objective**: Confirm DEM project details are correct
**Expected DEM Project Attributes**:
- Code: "DEM"
- ID: "demo-project"
- Path: "/Users/kirby/home/markdown-ticket/demo-project"
- Description: "demo-project" or similar

---

## 2. get_project_info Tool

### Test Case 2.1: Get DEM Project Info
**Objective**: Retrieve detailed information about the DEM project
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_project_info",
    "arguments": {
      "key": "DEM"
    }
  }
}
```
**Expected Response**:
- Project key: "DEM"
- Project path: "/Users/kirby/home/markdown-ticket/demo-project"
- Project configuration details from .mdt-config.toml
- CR path configuration (likely "docs/CRs")
- Document paths configuration
- Current CR count (should be 0 initially)

### Test Case 2.2: Invalid Project Key
**Objective**: Test error handling for non-existent project
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_project_info",
    "arguments": {
      "key": "NONEXISTENT"
    }
  }
}
```
**Expected Response**:
- Error indicating project not found
- Appropriate error message

---

## 3. list_crs Tool

### Test Case 3.1: List All CRs in DEM Project
**Objective**: Retrieve all CRs for the DEM project
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "list_crs",
    "arguments": {
      "project": "DEM"
    }
  }
}
```
**Expected Response**:
- Array of CRs (initially empty)
- Each CR should include: key, title, status, type, priority
- If empty, should return an empty array

### Test Case 3.2: Filter CRs by Status
**Objective**: Test status filtering
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "list_crs",
    "arguments": {
      "project": "DEM",
      "filters": {
        "status": "Proposed"
      }
    }
  }
}
```
**Expected Response**:
- Only CRs with "Proposed" status
- Empty array if no Proposed CRs exist

### Test Case 3.3: Filter CRs by Type
**Objective**: Test type filtering
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "list_crs",
    "arguments": {
      "project": "DEM",
      "filters": {
        "type": "Feature Enhancement"
      }
    }
  }
}
```
**Expected Response**:
- Only CRs with "Feature Enhancement" type
- Empty array if no such CRs exist

### Test Case 3.4: Filter CRs by Priority
**Objective**: Test priority filtering
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "list_crs",
    "arguments": {
      "project": "DEM",
      "filters": {
        "priority": "High"
      }
    }
  }
}
```
**Expected Response**:
- Only CRs with "High" priority
- Empty array if no High priority CRs exist

### Test Case 3.5: Multiple Status Filter
**Objective**: Test multiple status filtering
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "list_crs",
    "arguments": {
      "project": "DEM",
      "filters": {
        "status": ["Proposed", "In Progress"]
      }
    }
  }
}
```
**Expected Response**:
- CRs with either "Proposed" OR "In Progress" status

---

## 4. get_cr Tool

### Test Case 4.1: Get Non-existent CR (Pre-creation)
**Objective**: Test retrieval before CR exists
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_cr",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "mode": "full"
    }
  }
}
```
**Expected Response**:
- Error indicating CR not found
- Appropriate error message

### Test Case 4.2: Get CR Attributes Mode
**Objective**: Test attributes-only mode (after CR creation)
**Request** (to be executed after creating DEM-001):
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_cr",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "mode": "attributes"
    }
  }
}
```
**Expected Response**:
- YAML attributes only (no markdown content)
- Fields: code, title, status, type, priority, etc.

### Test Case 4.3: Get CR Metadata Mode
**Objective**: Test metadata-only mode
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_cr",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "mode": "metadata"
    }
  }
}
```
**Expected Response**:
- Minimal metadata: key, title, status, type, priority
- No detailed attributes or content

### Test Case 4.4: Get CR Full Mode (Default)
**Objective**: Test full CR retrieval
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_cr",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001"
    }
  }
}
```
**Expected Response**:
- Complete CR with attributes and markdown content
- All required sections present

---

## 5. create_cr Tool

### Test Case 5.1: Create Feature Enhancement CR
**Objective**: Create a basic Feature Enhancement CR
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "create_cr",
    "arguments": {
      "project": "DEM",
      "type": "Feature Enhancement",
      "data": {
        "title": "Add User Authentication Feature",
        "priority": "High",
        "phaseEpic": "Phase 1",
        "impactAreas": ["Frontend", "Backend"],
        "content": "## 1. Description\nNeed to implement user authentication to secure the application.\n\n## 2. Rationale\nAuthentication is essential for protecting user data and enabling personalized features.\n\n## 3. Solution Analysis\nConsidered JWT vs session-based authentication. JWT selected for scalability.\n\n## 4. Implementation Specification\n- Implement login/logout endpoints\n- Add JWT token validation middleware\n- Create user profile management\n\n## 5. Acceptance Criteria\n- Users can register with email/password\n- Login creates valid JWT token\n- Protected routes require valid token"
      }
    }
  }
}
```
**Expected Response**:
- Created CR with key "DEM-001"
- All provided attributes set correctly
- Default status should be "Proposed"
- Content saved with all required sections

### Test Case 5.2: Create Bug Fix CR
**Objective**: Create a Bug Fix CR
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "create_cr",
    "arguments": {
      "project": "DEM",
      "type": "Bug Fix",
      "data": {
        "title": "Fix Memory Leak in Data Processing",
        "priority": "Critical",
        "content": "## 1. Description\nMemory leak observed when processing large datasets.\n\n## 2. Rationale\nThis causes application crashes and affects user experience.\n\n## 3. Solution Analysis\nIssue traced to unclosed event listeners in data processor.\n\n## 4. Implementation Specification\n- Add proper cleanup in data processor\n- Implement memory usage monitoring\n\n## 5. Acceptance Criteria\n- No memory leak when processing 100k+ records\n- Memory usage remains stable"
      }
    }
  }
}
```
**Expected Response**:
- Created CR with key "DEM-002"
- Type set to "Bug Fix"
- Priority set to "Critical"

### Test Case 5.3: Create Architecture CR
**Objective**: Create an Architecture CR
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "create_cr",
    "arguments": {
      "project": "DEM",
      "type": "Architecture",
      "data": {
        "title": "Implement Microservices Architecture",
        "priority": "Medium",
        "phaseEpic": "Phase 2",
        "dependsOn": "DEM-001",
        "content": "## 1. Description\nTransition from monolithic to microservices architecture for better scalability.\n\n## 2. Rationale\nCurrent monolith is becoming difficult to maintain and scale.\n\n## 3. Solution Analysis\nEvaluated microservices vs modular monolith. Microservices selected for team autonomy.\n\n## 4. Implementation Specification\n- Extract user service\n- Extract order service\n- Implement API gateway\n- Add service discovery\n\n## 5. Acceptance Criteria\n- Services can be deployed independently\n- Communication between services is reliable\n- Overall performance is maintained or improved"
      }
    }
  }
}
```
**Expected Response**:
- Created CR with key "DEM-003"
- Type set to "Architecture"
- Dependency on DEM-001 recorded

### Test Case 5.4: Create CR with Related Tickets
**Objective**: Test CR creation with relationships
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "create_cr",
    "arguments": {
      "project": "DEM",
      "type": "Technical Debt",
      "data": {
        "title": "Refactor Legacy Code Module",
        "priority": "Low",
        "relatedTickets": "DEM-001, DEM-002",
        "blocks": "DEM-003",
        "content": "## 1. Description\nLegacy code module needs refactoring for maintainability.\n\n## 2. Rationale\nCurrent code is difficult to understand and modify.\n\n## 3. Solution Analysis\nComplete rewrite vs incremental refactoring. Incremental approach selected.\n\n## 4. Implementation Specification\n- Add unit tests first\n- Refactor one function at a time\n- Maintain backward compatibility\n\n## 5. Acceptance Criteria\n- Code coverage > 90%\n- No breaking changes"
      }
    }
  }
}
```
**Expected Response**:
- Created CR with key "DEM-004"
- Related tickets properly linked
- Blocking relationships established

### Test Case 5.5: Create CR with Assignee
**Objective**: Test CR creation with assignee
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "create_cr",
    "arguments": {
      "project": "DEM",
      "type": "Documentation",
      "data": {
        "title": "Write API Documentation",
        "priority": "Medium",
        "assignee": "developer@example.com",
        "content": "## 1. Description\nComprehensive API documentation is needed for developers.\n\n## 2. Rationale\nGood documentation reduces onboarding time and support tickets.\n\n## 3. Solution Analysis\nOpenAPI spec vs custom docs. OpenAPI selected for standardization.\n\n## 4. Implementation Specification\n- Generate OpenAPI specification\n- Create interactive documentation\n- Add code examples\n\n## 5. Acceptance Criteria\n- All endpoints documented\n- Interactive examples work\n- Documentation is automatically updated"
      }
    }
  }
}
```
**Expected Response**:
- Created CR with key "DEM-005"
- Assignee properly set

---

## 6. update_cr_status Tool

### Test Case 6.1: Update CR Status to Approved
**Objective**: Test status update from Proposed to Approved
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "update_cr_status",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "status": "Approved"
    }
  }
}
```
**Expected Response**:
- Status successfully updated to "Approved"
- Confirmation of the change

### Test Case 6.2: Update CR Status to In Progress
**Objective**: Test status update to In Progress
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "update_cr_status",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "status": "In Progress"
    }
  }
}
```
**Expected Response**:
- Status successfully updated to "In Progress"

### Test Case 6.3: Update CR Status to Implemented
**Objective**: Test final status update
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "update_cr_status",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "status": "Implemented"
    }
  }
}
```
**Expected Response**:
- Status successfully updated to "Implemented"

### Test Case 6.4: Update Non-existent CR Status
**Objective**: Test error handling for invalid CR
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "update_cr_status",
    "arguments": {
      "project": "DEM",
      "key": "DEM-999",
      "status": "Approved"
    }
  }
}
```
**Expected Response**:
- Error indicating CR not found
- Appropriate error message

### Test Case 6.5: Put CR On Hold
**Objective**: Test On Hold status
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "update_cr_status",
    "arguments": {
      "project": "DEM",
      "key": "DEM-002",
      "status": "On Hold"
    }
  }
}
```
**Expected Response**:
- Status successfully updated to "On Hold"

---

## 7. update_cr_attrs Tool

### Test Case 7.1: Update CR Priority
**Objective**: Test priority attribute update
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "update_cr_attrs",
    "arguments": {
      "project": "DEM",
      "key": "DEM-002",
      "attributes": {
        "priority": "High"
      }
    }
  }
}
```
**Expected Response**:
- Priority successfully updated to "High"
- Other attributes remain unchanged

### Test Case 7.2: Update Multiple Attributes
**Objective**: Test multiple attribute updates
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "update_cr_attrs",
    "arguments": {
      "project": "DEM",
      "key": "DEM-003",
      "attributes": {
        "priority": "Critical",
        "phaseEpic": "Phase 1.5",
        "assignee": "architect@example.com"
      }
    }
  }
}
```
**Expected Response**:
- All specified attributes updated
- Unspecified attributes remain unchanged

### Test Case 7.3: Update CR Relationships
**Objective**: Test relationship updates
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "update_cr_attrs",
    "arguments": {
      "project": "DEM",
      "key": "DEM-004",
      "attributes": {
        "dependsOn": "DEM-001, DEM-003",
        "blocks": "DEM-005"
      }
    }
  }
}
```
**Expected Response**:
- Dependencies updated
- Blocking relationships updated

### Test Case 7.4: Update Implementation Details
**Objective**: Test implementation date and notes
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "update_cr_attrs",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "attributes": {
        "implementationDate": "2025-12-13",
        "implementationNotes": "Implemented JWT authentication with refresh tokens"
      }
    }
  }
}
```
**Expected Response**:
- Implementation date recorded
- Implementation notes saved

### Test Case 7.5: Invalid Attribute Update
**Objective**: Test error with invalid attributes
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "update_cr_attrs",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "attributes": {
        "invalidAttr": "value"
      }
    }
  }
}
```
**Expected Response**:
- Error indicating invalid attribute
- List of valid attributes provided

---

## 8. manage_cr_sections Tool

### Test Case 8.1: List All Sections
**Objective**: List all sections of a CR
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "manage_cr_sections",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "operation": "list"
    }
  }
}
```
**Expected Response**:
- List of all sections with their structure
- Should include: Description, Rationale, Solution Analysis, Implementation Specification, Acceptance Criteria

### Test Case 8.2: Get Specific Section
**Objective**: Retrieve a specific section
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "manage_cr_sections",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "operation": "get",
      "section": "Implementation Specification"
    }
  }
}
```
**Expected Response**:
- Content of Implementation Specification section only

### Test Case 8.3: Replace Section Content
**Objective**: Replace entire section content
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "manage_cr_sections",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "operation": "replace",
      "section": "Acceptance Criteria",
      "content": "## 5. Acceptance Criteria\n\n1. User registration works with valid email/password\n2. Login returns JWT token with 24h expiration\n3. Refresh token mechanism implemented\n4. Protected routes reject invalid tokens\n5. Logout invalidates tokens on server"
    }
  }
}
```
**Expected Response**:
- Section successfully replaced
- New content saved

### Test Case 8.4: Append to Section
**Objective**: Add content to existing section
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "manage_cr_sections",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "operation": "append",
      "section": "Implementation Specification",
      "content": "\n\n### Additional Requirements\n\n- Password reset functionality\n- Email verification for new accounts\n- Rate limiting on auth endpoints"
    }
  }
}
```
**Expected Response**:
- Content appended to section
- Original content preserved

### Test Case 8.5: Prepend to Section
**Objective**: Add content at beginning of section
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "manage_cr_sections",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "operation": "prepend",
      "section": "Description",
      "content": "**Security Critical**: This implementation must follow OWASP security guidelines.\n\n"
    }
  }
}
```
**Expected Response**:
- Content prepended to section
- Original content follows

### Test Case 8.6: Get Non-existent Section
**Objective**: Test error for invalid section
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "manage_cr_sections",
    "arguments": {
      "project": "DEM",
      "key": "DEM-001",
      "operation": "get",
      "section": "Non-existent Section"
    }
  }
}
```
**Expected Response**:
- Error indicating section not found
- List of available sections provided

---

## 9. delete_cr Tool

### Test Case 9.1: Delete Implemented Bug Fix
**Objective**: Delete a bug fix after implementation
**Prerequisite**: Update DEM-002 status to "Implemented"
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "delete_cr",
    "arguments": {
      "project": "DEM",
      "key": "DEM-002"
    }
  }
}
```
**Expected Response**:
- CR successfully deleted
- Confirmation of deletion

### Test Case 9.2: Delete Non-Implemented CR
**Objective**: Test deletion of non-implemented CR (delete_cr works for ANY ticket)
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "delete_cr",
    "arguments": {
      "project": "DEM",
      "key": "DEM-003"
    }
  }
}
```
**Expected Response**:
- CR successfully deleted
- Confirmation of deletion
- Note: delete_cr works for ANY existing ticket regardless of type or status

### Test Case 9.3: Delete Non-existent CR
**Objective**: Test error for non-existent CR
**Request**:
```json
{
  "method": "tools/call",
  "params": {
    "name": "delete_cr",
    "arguments": {
      "project": "DEM",
      "key": "DEM-999"
    }
  }
}
```
**Expected Response**:
- Error indicating CR not found
- Appropriate error message

---

## Test Execution Sequence

To ensure proper testing, execute tests in the following order:

1. **Setup Tests**:
   - Test Case 1.1, 1.2: Verify DEM project exists
   - Test Case 2.1: Get DEM project info
   - Test Case 3.1: Verify empty CR list initially

2. **CR Creation Tests** (in order):
   - Test Case 5.1: Create DEM-001 (Feature Enhancement)
   - Test Case 5.2: Create DEM-002 (Bug Fix)
   - Test Case 5.3: Create DEM-003 (Architecture)
   - Test Case 5.4: Create DEM-004 (Technical Debt)
   - Test Case 5.5: Create DEM-005 (Documentation)

3. **CR Retrieval Tests**:
   - Test Case 4.1-4.4: Test various get_cr modes

4. **CR List Filtering Tests**:
   - Test Case 3.2-3.5: Test various filters

5. **Status Update Tests**:
   - Test Case 6.1-6.5: Update statuses (ensure DEM-002 gets to "Implemented")

6. **Attribute Update Tests**:
   - Test Case 7.1-7.4: Update various attributes
   - Test Case 7.5: Test invalid attributes

7. **Section Management Tests**:
   - Test Case 8.1-8.6: Test all section operations

8. **Cleanup Tests**:
   - Test Case 9.1: Delete DEM-002 (after marking Implemented)
   - Test Case 9.2-9.3: Test deletion functionality

## Expected Final State

After test execution:
- DEM-001: Feature Enhancement, status "Implemented"
- DEM-002: Bug Fix, deleted
- DEM-003: Architecture, status "Proposed"
- DEM-004: Technical Debt, status "Proposed"
- DEM-005: Documentation, status "Proposed"

## Notes

1. All requests should include project code "DEM" as specified
2. Test dates should use ISO 8601 format (YYYY-MM-DD)
3. Email addresses in examples should be replaced with actual test accounts
4. After each test, verify the state change persisted correctly
5. Test both success and error scenarios for comprehensive coverage
