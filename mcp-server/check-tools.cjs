#!/usr/bin/env node

/**
 * Simple check to verify consolidated tools are present in built files
 */

const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')

function checkToolsInBuiltFile() {
  console.error('🧪 Checking tools in built index.js file...\n')

  try {
    const toolsIndexPath = path.join(__dirname, 'dist', 'tools', 'index.js')
    const toolsFileContent = fs.readFileSync(toolsIndexPath, 'utf-8')

    // Look for tool definitions in the file
    const toolMatches = toolsFileContent.match(/name:\s*['"]([^'"]+)['"]/g)

    if (!toolMatches) {
      console.error('❌ No tools found in built file')
      return false
    }

    const toolNames = toolMatches.map((match) => {
      const nameMatch = match.match(/name:\s*['"]([^'"]+)['"]/)
      return nameMatch ? nameMatch[1] : null
    }).filter(name => name)

    console.error(`✅ Found ${toolNames.length} tools in built file:`)
    console.error('')

    toolNames.forEach((toolName, index) => {
      console.error(`${index + 1}. ${toolName}`)
    })

    console.error('')

    // Check for our consolidated tools
    const hasGetCR = toolNames.includes('get_cr')
    const hasManageSections = toolNames.includes('manage_cr_sections')
    const hasCreateCR = toolNames.includes('create_cr')

    console.error('🎯 Consolidated Tool Status:')
    console.error(`   ✅ get_cr (consolidated): ${hasGetCR ? 'PRESENT' : 'MISSING'}`)
    console.error(`   ✅ manage_cr_sections (consolidated): ${hasManageSections ? 'PRESENT' : 'MISSING'}`)
    console.error(`   ✅ create_cr (enhanced): ${hasCreateCR ? 'PRESENT' : 'MISSING'}`)

    // Check that legacy tools are NOT present
    const hasLegacyFullContent = toolNames.includes('get_cr_full_content')
    const hasLegacyAttrs = toolNames.includes('get_cr_attributes')
    const hasLegacyListSections = toolNames.includes('list_cr_sections')
    const hasLegacyGetSection = toolNames.includes('get_cr_section')
    const hasLegacyUpdateSection = toolNames.includes('update_cr_section')
    const hasTemplateTools = toolNames.some(name => name.includes('template'))

    console.error('')
    console.error('🗑️  Legacy Tool Status:')
    console.error(`   ⚰️  get_cr_full_content (legacy): ${hasLegacyFullContent ? 'PRESENT' : 'REMOVED'}`)
    console.error(`   ⚰️  get_cr_attributes (legacy): ${hasLegacyAttrs ? 'PRESENT' : 'REMOVED'}`)
    console.error(`   ⚰️  list_cr_sections (legacy): ${hasLegacyListSections ? 'PRESENT' : 'REMOVED'}`)
    console.error(`   ⚰️  get_cr_section (legacy): ${hasLegacyGetSection ? 'PRESENT' : 'REMOVED'}`)
    console.error(`   ⚰️  update_cr_section (legacy): ${hasLegacyUpdateSection ? 'PRESENT' : 'REMOVED'}`)
    console.error(`   ⚰️  template tools: ${hasTemplateTools ? 'PRESENT' : 'REMOVED'}`)

    console.error('')

    if (hasGetCR && hasManageSections && hasCreateCR
      && !hasLegacyFullContent && !hasLegacyAttrs && !hasLegacyListSections
      && !hasLegacyGetSection && !hasLegacyUpdateSection && !hasTemplateTools) {
      console.error('🎉 Phase 4 completed successfully!')
      console.error('   ✅ All consolidated tools are present')
      console.error('   ✅ All legacy tools have been removed')
      console.error('   ✅ Template tools have been removed')
      console.error('   🎯 Ready for Phase 5: Documentation updates')
      return true
    }
    else {
      console.error('❌ Phase 4 needs attention:')
      if (!hasGetCR || !hasManageSections || !hasCreateCR) {
        console.error('   - Some consolidated tools are missing')
      }
      if (hasLegacyFullContent || hasLegacyAttrs || hasLegacyListSections
        || hasLegacyGetSection || hasLegacyUpdateSection) {
        console.error('   - Some legacy tools are still present')
      }
      if (hasTemplateTools) {
        console.error('   - Template tools are still present')
      }
      return false
    }
  }
  catch (error) {
    console.error('❌ Error reading built tools file:', error.message)
    return false
  }
}

const success = checkToolsInBuiltFile()
process.exit(success ? 0 : 1)
