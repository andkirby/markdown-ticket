#!/usr/bin/env node

/**
 * Simple check to verify consolidated tools are present in built files
 */

const fs = require('fs');
const path = require('path');

function checkToolsInBuiltFile() {
  console.log('🧪 Checking tools in built index.js file...\n');

  try {
    const toolsIndexPath = path.join(__dirname, 'dist', 'tools', 'index.js');
    const toolsFileContent = fs.readFileSync(toolsIndexPath, 'utf-8');

    // Look for tool definitions in the file
    const toolMatches = toolsFileContent.match(/name:\s*['"]([^'"]+)['"]/g);

    if (!toolMatches) {
      console.log('❌ No tools found in built file');
      return false;
    }

    const toolNames = toolMatches.map(match => {
      const nameMatch = match.match(/name:\s*['"]([^'"]+)['"]/);
      return nameMatch ? nameMatch[1] : null;
    }).filter(name => name);

    console.log(`✅ Found ${toolNames.length} tools in built file:`);
    console.log('');

    toolNames.forEach((toolName, index) => {
      console.log(`${index + 1}. ${toolName}`);
    });

    console.log('');

    // Check for our consolidated tools
    const hasGetCR = toolNames.includes('get_cr');
    const hasManageSections = toolNames.includes('manage_cr_sections');
    const hasCreateCR = toolNames.includes('create_cr');

    console.log('🎯 Consolidated Tool Status:');
    console.log(`   ✅ get_cr (consolidated): ${hasGetCR ? 'PRESENT' : 'MISSING'}`);
    console.log(`   ✅ manage_cr_sections (consolidated): ${hasManageSections ? 'PRESENT' : 'MISSING'}`);
    console.log(`   ✅ create_cr (enhanced): ${hasCreateCR ? 'PRESENT' : 'MISSING'}`);

    // Check that legacy tools are NOT present
    const hasLegacyFullContent = toolNames.includes('get_cr_full_content');
    const hasLegacyAttrs = toolNames.includes('get_cr_attributes');
    const hasLegacyListSections = toolNames.includes('list_cr_sections');
    const hasLegacyGetSection = toolNames.includes('get_cr_section');
    const hasLegacyUpdateSection = toolNames.includes('update_cr_section');
    const hasTemplateTools = toolNames.some(name => name.includes('template'));

    console.log('');
    console.log('🗑️  Legacy Tool Status:');
    console.log(`   ⚰️  get_cr_full_content (legacy): ${hasLegacyFullContent ? 'PRESENT' : 'REMOVED'}`);
    console.log(`   ⚰️  get_cr_attributes (legacy): ${hasLegacyAttrs ? 'PRESENT' : 'REMOVED'}`);
    console.log(`   ⚰️  list_cr_sections (legacy): ${hasLegacyListSections ? 'PRESENT' : 'REMOVED'}`);
    console.log(`   ⚰️  get_cr_section (legacy): ${hasLegacyGetSection ? 'PRESENT' : 'REMOVED'}`);
    console.log(`   ⚰️  update_cr_section (legacy): ${hasLegacyUpdateSection ? 'PRESENT' : 'REMOVED'}`);
    console.log(`   ⚰️  template tools: ${hasTemplateTools ? 'PRESENT' : 'REMOVED'}`);

    console.log('');

    if (hasGetCR && hasManageSections && hasCreateCR &&
        !hasLegacyFullContent && !hasLegacyAttrs && !hasLegacyListSections &&
        !hasLegacyGetSection && !hasLegacyUpdateSection && !hasTemplateTools) {
      console.log('🎉 Phase 4 completed successfully!');
      console.log('   ✅ All consolidated tools are present');
      console.log('   ✅ All legacy tools have been removed');
      console.log('   ✅ Template tools have been removed');
      console.log('   🎯 Ready for Phase 5: Documentation updates');
      return true;
    } else {
      console.log('❌ Phase 4 needs attention:');
      if (!hasGetCR || !hasManageSections || !hasCreateCR) {
        console.log('   - Some consolidated tools are missing');
      }
      if (hasLegacyFullContent || hasLegacyAttrs || hasLegacyListSections ||
          hasLegacyGetSection || hasLegacyUpdateSection) {
        console.log('   - Some legacy tools are still present');
      }
      if (hasTemplateTools) {
        console.log('   - Template tools are still present');
      }
      return false;
    }

  } catch (error) {
    console.error('❌ Error reading built tools file:', error.message);
    return false;
  }
}

const success = checkToolsInBuiltFile();
process.exit(success ? 0 : 1);