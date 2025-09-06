// Test script to verify markdown body attribute updating

// Copy the function directly since we can't import it easily
function updateMarkdownBodyAttributes(content, attributes) {
  let updatedContent = content;

  // Mapping of attribute keys to their markdown display names
  const attributeMapping = {
    code: 'Code',
    title: 'Title/Summary', 
    status: 'Status',
    dateCreated: 'Date Created',
    type: 'Type',
    priority: 'Priority',
    phaseEpic: 'Phase/Epic',
    implementationDate: 'Implementation Date',
    implementationNotes: 'Implementation Notes'
  };

  // Update each attribute in the markdown body
  for (const [key, value] of Object.entries(attributes)) {
    if (value && attributeMapping[key]) {
      const displayName = attributeMapping[key];
      // Escape special regex characters in displayName
      const escapedDisplayName = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Pattern to match: - **Attribute Name**: old value
      const pattern = new RegExp(`^(- \\*\\*${escapedDisplayName}\\*\\*:).*$`, 'gm');
      const replacement = `$1 ${value}`;
      
      if (pattern.test(updatedContent)) {
        updatedContent = updatedContent.replace(pattern, replacement);
      }
    }
  }

  return updatedContent;
}

// Sample content with markdown body attributes (similar to MDT-001 format)
const sampleContent = `- **Code**: MDT-001
- **Title/Summary**: Multi-Project CR Management Dashboard
- **Status**: Proposed
- **Date Created**: 2025-08-31
- **Type**: Feature Enhancement
- **Priority**: High
- **Phase/Epic**: Phase A (Foundation)

# Multi-Project CR Management Dashboard

## 1. Description

### Problem Statement
Currently, users managing multiple projects with CR systems must navigate to each project directory individually to create, view, and manage Change Requests. This creates inefficiency and makes it difficult to maintain oversight across multiple projects.`;

console.log("Original content:");
console.log(sampleContent);
console.log("\n" + "=".repeat(50) + "\n");

// Test updating the status to "Implemented"
const updatedContent = updateMarkdownBodyAttributes(sampleContent, {
  code: 'MDT-001',
  title: 'Multi-Project CR Management Dashboard',
  status: 'Implemented',
  dateCreated: '2025-08-31',
  type: 'Feature Enhancement',
  priority: 'High',
  phaseEpic: 'Phase A (Foundation)'
});

console.log("Updated content:");
console.log(updatedContent);
console.log("\n" + "=".repeat(50) + "\n");

// Check if the status was updated correctly
if (updatedContent.includes('- **Status**: Implemented')) {
  console.log("✅ Status updated successfully!");
} else {
  console.log("❌ Status update failed!");
}

// Test with content that has YAML frontmatter instead
const yamlContent = `---
code: MDT-001
title: Multi-Project CR Management Dashboard
status: Proposed
dateCreated: 2025-08-31
type: Feature Enhancement
priority: High
phaseEpic: Phase A (Foundation)
---

# Multi-Project CR Management Dashboard

## 1. Description

### Problem Statement
Currently, users managing multiple projects with CR systems must navigate to each project directory individually to create, view, and manage Change Requests. This creates inefficiency and makes it difficult to maintain oversight across multiple projects.`;

console.log("YAML content (should remain unchanged):");
const yamlUpdatedContent = updateMarkdownBodyAttributes(yamlContent, {
  code: 'MDT-001',
  title: 'Multi-Project CR Management Dashboard',
  status: 'Implemented',
  dateCreated: '2025-08-31',
  type: 'Feature Enhancement',
  priority: 'High',
  phaseEpic: 'Phase A (Foundation)'
});

console.log(yamlUpdatedContent);
console.log("(YAML content should be unchanged since there are no markdown body attributes to update)");