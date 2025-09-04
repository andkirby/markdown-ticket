const fs = require('fs');
const path = require('path');

const crDir = '/Users/kirby/home/LlmTranslator/docs/CRs';
const files = [
  'CR-A007-keyboard-shortcut-reset.md',
  'CR-A008-direct-openai-api.md',
  'CR-A009-initial-window-resize.md',
  'CR-A010-ai-text-correction.md',
  'CR-A011-opacity-on-focus-loss.md',
  'CR-A012-libretranslate-integration.md',
  'CR-A013-popup-model-selector.md',
  'CR-A014-prompt-response-improvement.md',
  'CR-A015-dual-language-pair-configs.md',
  'CR-A015-macos-dictionary-integration.md',
  'CR-A016-openai-recommended-models-filter.md',
  'CR-A017-service-provider-architecture-refactoring.md',
  'CR-A018-openai-compatible-provider.md',
  'CR-A019-configurable-openai-provider.md'
];

function extractMetadata(content) {
  const lines = content.split('\n');
  const metadata = {};
  
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    
    if (line.includes('**Code**:')) {
      metadata.code = line.split(':')[1]?.trim();
    } else if (line.includes('**Title/Summary**:')) {
      metadata.title = line.split('**Title/Summary**:')[1]?.trim();
    } else if (line.includes('**Status**:')) {
      metadata.status = line.split('**Status**:')[1]?.trim();
    } else if (line.includes('**Date Created**:')) {
      metadata.dateCreated = line.split('**Date Created**:')[1]?.trim();
    } else if (line.includes('**Type**:')) {
      metadata.type = line.split('**Type**:')[1]?.trim();
    } else if (line.includes('**Priority**:')) {
      metadata.priority = line.split('**Priority**:')[1]?.trim();
    } else if (line.includes('**Phase/Epic**:')) {
      metadata.phaseEpic = line.split('**Phase/Epic**:')[1]?.trim();
    } else if (line.includes('**Related CRs**:')) {
      metadata.relatedTickets = line.split('**Related CRs**:')[1]?.trim();
    } else if (line.includes('**Impact**:')) {
      metadata.impact = line.split('**Impact**:')[1]?.trim();
    }
  }
  
  return metadata;
}

function createYamlFrontmatter(metadata) {
  let yaml = '---\n';
  
  // Mandatory fields
  yaml += `code: ${metadata.code || 'CR-UNKNOWN'}\n`;
  yaml += `title: ${metadata.title || 'Unknown Title'}\n`;
  yaml += `status: ${metadata.status || 'Proposed'}\n`;
  yaml += `dateCreated: ${metadata.dateCreated || '2024-01-01'}\n`;
  yaml += `type: ${metadata.type || 'Feature Enhancement'}\n`;
  yaml += `priority: ${metadata.priority || 'Medium'}\n`;
  
  // Optional fields - only include if they have values
  if (metadata.phaseEpic && metadata.phaseEpic !== 'undefined') {
    yaml += `phaseEpic: ${metadata.phaseEpic}\n`;
  }
  if (metadata.relatedTickets && metadata.relatedTickets !== 'undefined') {
    yaml += `relatedTickets: ${metadata.relatedTickets}\n`;
  }
  if (metadata.impact && metadata.impact !== 'undefined') {
    yaml += `impact: ${metadata.impact}\n`;
  }
  
  yaml += '---\n';
  return yaml;
}

files.forEach(filename => {
  const filePath = path.join(crDir, filename);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const metadata = extractMetadata(content);
    
    // Find where the main content starts (after the metadata bullets)
    const lines = content.split('\n');
    let contentStartIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## ') || 
          (lines[i].startsWith('#') && !lines[i].includes('Change Request:'))) {
        contentStartIndex = i;
        break;
      }
    }
    
    const mainContent = lines.slice(contentStartIndex).join('\n');
    const newContent = createYamlFrontmatter(metadata) + '\n' + mainContent;
    
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Converted ${filename}`);
    
  } catch (error) {
    console.error(`❌ Failed to convert ${filename}:`, error.message);
  }
});

console.log('Conversion complete!');