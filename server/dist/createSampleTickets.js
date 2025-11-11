#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const SAMPLE_TICKETS = [
    {
        filename: 'CR-A001.md',
        content: `---
code: CR-A001
title: Implement user authentication system
status: In Progress
dateCreated: 2024-01-15T00:00:00.000Z
type: Feature Enhancement
priority: High
phaseEpic: Phase A (Foundation)
source: User Request
impact: Major
effort: High
relatedTickets:
supersedes:
dependsOn:
blocks:
relatedDocuments:
implementationDate: 2024-02-01T00:00:00.000Z
implementationNotes: Authentication system implemented with JWT tokens
lastModified: 2024-01-20T00:00:00.000Z
---

# Change Request: CR-A001

## Description
Implement a comprehensive user authentication system for the application.

## Requirements
- User registration and login
- JWT token-based authentication
- Password reset functionality
- Role-based access control
- Session management

## Implementation Notes
Authentication system implemented with JWT tokens.

## Acceptance Criteria
- [ ] Users can register with email and password
- [ ] Users can log in and receive JWT tokens
- [ ] Password reset functionality works
- [ ] Role-based access control is implemented
- [ ] Sessions are properly managed`
    },
    {
        filename: 'CR-A002.md',
        content: `---
code: CR-A002
title: Fix responsive design issues on mobile
status: Proposed
dateCreated: 2024-01-18T00:00:00.000Z
type: Bug Fix
priority: Medium
phaseEpic: Phase A (Foundation)
source: User Feedback
impact: Minor
effort: Low
relatedTickets:
supersedes:
dependsOn:
blocks:
relatedDocuments:
implementationDate:
implementationNotes:
lastModified: 2024-01-18T00:00:00.000Z
---

# Change Request: CR-A002

## Description
Fix responsive design issues that occur on mobile devices.

## Issues Found
- Navigation menu overlaps with content on small screens
- Form fields are too close together
- Buttons are not touch-friendly
- Text is too small to read on mobile

## Implementation Notes
`
    },
    {
        filename: 'CR-A003.md',
        content: `---
code: CR-A003
title: Add comprehensive error handling
status: Approved
dateCreated: 2024-01-10T00:00:00.000Z
type: Technical Debt
priority: Medium
phaseEpic: Phase A (Foundation)
source: Development Team
impact: Major
effort: Medium
relatedTickets:
supersedes:
dependsOn:
blocks:
relatedDocuments:
implementationDate:
implementationNotes:
lastModified: 2024-01-10T00:00:00.000Z
---

# Change Request: CR-A003

## Description
Add comprehensive error handling throughout the application to improve user experience and system reliability.

## Areas to Improve
- API error responses
- Form validation errors
- File upload errors
- Network connection errors
- Database connection errors

## Implementation Notes
`
    },
    {
        filename: 'CR-B001.md',
        content: `---
code: CR-B001
title: Implement dark mode support
status: Implemented
dateCreated: 2023-12-20T00:00:00.000Z
type: Feature Enhancement
priority: Low
phaseEpic: Phase B (Enhancement)
source: User Request
impact: Minor
effort: Low
relatedTickets:
supersedes:
dependsOn:
blocks:
relatedDocuments:
implementationDate: 2024-01-05T00:00:00.000Z
implementationNotes: Dark mode implemented with CSS variables
lastModified: 2024-01-05T00:00:00.000Z
---

# Change Request: CR-B001

## Description
Implement dark mode support for the application to improve user experience in low-light environments.

## Features
- Dark/light theme toggle
- System preference detection
- Smooth theme transitions
- Consistent dark mode across all components

## Implementation Notes
Dark mode implemented with CSS variables.

## Acceptance Criteria
- [ ] Theme toggle button works
- [ ] System preference is respected
- [ ] All components have dark mode styles
- [ ] Theme transitions are smooth`
    }
];
async function createSampleTickets() {
    const TICKETS_DIR = path.join(__dirname, 'sample-tasks');
    try {
        // Ensure sample-tasks directory exists
        await fs.mkdir(TICKETS_DIR, { recursive: true });
        console.log('Creating sample tickets...');
        // Create each sample ticket
        for (const ticket of SAMPLE_TICKETS) {
            const filePath = path.join(TICKETS_DIR, ticket.filename);
            await fs.writeFile(filePath, ticket.content, 'utf8');
            console.log(`Created sample ticket: ${ticket.filename}`);
        }
        console.log('Sample tickets created successfully!');
    }
    catch (error) {
        console.error('Error creating sample tickets:', error);
        process.exit(1);
    }
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createSampleTickets();
}
export { createSampleTickets };
//# sourceMappingURL=createSampleTickets.js.map