#!/usr/bin/env node

/**
 * Simple script to measure current MCP tool token usage
 * This establishes our baseline for MDT-070 optimization
 */

// Read the built tools directly
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

// Since the built file is ES module, we'll analyze the source directly
console.log('Analyzing MCP tools from source code...');

// Simple mock services to instantiate MCPTools
class MockProjectDiscovery {
  getCachedProjects() { return []; }
  async discoverProjects() { return []; }
  getProject() { return null; }
  async getProjectInfo() { return null; }
}

class MockCRService {}
class MockTemplateService {}

// Read from source directly to analyze tools
let tools = [];
let toolCount = 0;
let characterCount = 0;
let estimatedTokens = 0;

try {
    const sourceContent = readFileSync(path.join(__dirname, 'src', 'tools', 'index.ts'), 'utf8');

    // Extract tool definitions using regex patterns
    const toolMatches = sourceContent.match(/name:\s*['"]([^'"]+)['"]/g);
    if (toolMatches) {
      toolCount = toolMatches.length;
      console.log(`Found ${toolCount} tool names in source code`);
    }

    // Rough estimate of character count for tool definitions
    const toolsSectionMatch = sourceContent.match(/getTools\(\): Tool\[\] \{[\s\S]*?^\}/m);
    if (toolsSectionMatch) {
      characterCount = toolsSectionMatch[0].length;
      estimatedTokens = Math.round(characterCount / 4);
    }
  } catch (error) {
    console.error('Could not read source files:', error.message);
  }

console.log('🔍 MDT-070 Baseline Measurement');
console.log('='.repeat(50));
console.log(`Current tool count: ${toolCount}`);
console.log(`Character count: ${characterCount.toLocaleString()}`);
console.log(`Estimated tokens: ${estimatedTokens.toLocaleString()}`);
console.log('');

// Calculate targets based on MDT-070 plan
const targetReduction = 0.40; // 40% reduction target
const targetTokens = Math.round(estimatedTokens * (1 - targetReduction));
const savings = estimatedTokens - targetTokens;

console.log('🎯 MDT-070 Targets:');
console.log('-'.repeat(30));
console.log(`Target reduction: ${Math.round(targetReduction * 100)}%`);
console.log(`Target final tokens: ${targetTokens.toLocaleString()}`);
console.log(`Expected savings: ${savings.toLocaleString()} tokens`);

// Identify consolidation targets
const consolidationTargets = [
  'get_cr_full_content',
  'get_cr_attributes',
  'list_cr_sections',
  'get_cr_section',
  'update_cr_section',
  'list_cr_templates',
  'get_cr_template'
];

console.log('');
console.log('📋 Consolidation Plan:');
console.log('-'.repeat(30));
console.log('1. CR Content Access (2 → 1 tool):');
console.log('   - get_cr_full_content + get_cr_attributes → get_cr(mode)');
console.log('');
console.log('2. Section Management (3 → 1 tool):');
console.log('   - list_cr_sections + get_cr_section + update_cr_section → manage_cr_sections(operation)');
console.log('');
console.log('3. Template Removal (2 → 0 tools):');
console.log('   - Remove list_cr_templates + get_cr_template (1,200 token saving)');
console.log('');
console.log('4. Description Optimization:');
console.log('   - Remove examples, shorten descriptions, use abbreviations');

console.log('');
console.log('📊 Expected Results:');
console.log('-'.repeat(30));
console.log(`Tools before: ${toolCount}`);
console.log(`Tools after: ${toolCount - 3 - 2} = ${toolCount - 5} tools (removed template tools and consolidated)`);
console.log(`Token reduction: ${Math.round((savings / estimatedTokens) * 100)}%`);
console.log(`Status: ✅ Target met if reduction ≥ 35%`);

// Write results to file for comparison
const results = {
  baseline: {
    toolCount,
    characterCount,
    estimatedTokens,
    measuredAt: new Date().toISOString()
  },
  targets: {
    reductionPercent: targetReduction,
    targetTokens,
    expectedSavings: savings
  },
  consolidation: {
    toolsToRemove: 2, // template tools
    toolsToConsolidate: 5, // 2 + 3 tools -> 2 new tools
    netToolReduction: 3 // 5 old tools become 2 new tools = net 3 tool reduction
  }
};

const resultsPath = path.join(__dirname, 'baseline-results.json');
writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log('');
console.log(`📁 Results saved to: ${resultsPath}`);