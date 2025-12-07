# Change Notes

## Recent Updates

### 2025-01-07 - Improved Refactoring/Tech-Debt Workflow

**Problem**: `/mdt:requirements` workflow with EARS syntax was awkward for refactoring and technical debt tickets, producing constructs like "WHEN the get_cr tool processes markdown content..." instead of clear structural specifications.

**Solution**: Added type-aware guidance that skips behavioral requirements for structural changes.

**Changes Made**:

1. **README.md** - Added "When to Skip `/mdt:requirements`" section explaining:
   - EARS syntax is designed for behavioral specifications
   - Refactoring requires internal restructuring, not user behaviors
   - Recommended flow for refactoring: ticket-creation → assess → architecture → tasks → implement

2. **mdt-ticket-creation.md** - Enhanced post-creation guidance:
   - CR type-specific next steps
   - Explicit instruction to skip `/mdt:requirements` for Technical Debt
   - Clear workflow recommendations based on CR type

3. **mdt-architecture.md** - Added refactoring-specific support:
   - CR type detection in context loading
   - New "Refactoring Transformation" section for simple output
   - Comprehensive "Refactoring Plan" section for complex output:
     - Transformation matrix (from/to/reduction)
     - Interface preservation tracking
     - Behavioral equivalence verification

**Impact**:
- Refactoring CRs now follow a more natural workflow focused on structure
- No more forced behavioral specifications for internal changes
- Clear guidance on interface preservation and behavioral equivalence
- Type-aware workflows adapt to the specific needs of each CR type

**Files Changed**:
- `prompts/README.md`
- `prompts/mdt-ticket-creation.md`
- `prompts/mdt-architecture.md`

### 2025-01-06 - Complete v2 Workflow Documentation Suite

**Problem**: MDT workflows lacked comprehensive documentation and practical guidance for users. The install script was missing new commands and didn't reflect the complete v2 workflow chain.

**Solution**: Added comprehensive workflow guide with strategies and updated all documentation to be consistent.

**Changes Made**:

1. **GUIDE.md** - New comprehensive workflow guide:
   - Full-flow strategy with step-by-step examples
   - Alternative strategies (quick-flow, architecture-first, bug-fix)
   - Best practices and troubleshooting tips
   - Collapsible sections for easy navigation

2. **CLAUDE.md** - Updated with v2 workflow documentation:
   - Installation instructions (global/project/local)
   - Complete workflow chain with all 9 commands
   - Requirements integration details
   - Debt prevention chain explanation

3. **README.md** - Updated with new workflow commands:
   - Added requirements and assess command descriptions
   - Updated typical workflow to show complete chain
   - Added EARS syntax reference for requirements

4. **Workflow Prompts** - Updated for consistency:
   - `mdt-architecture`: v3 with graduated output
   - `mdt-implement`: v2 with verification modes
   - `mdt-tasks`: v2 with phase-based structure
   - `mdt-tech-debt`: v2 diagnostic focus

**Impact**:
- Users now have complete documentation for all v2 workflows
- Practical strategies help users choose the right approach
- Install script accurately reflects all available commands
- Consistent versioning across all workflow prompts

**Files Changed**:
- `prompts/GUIDE.md` (new)
- `prompts/CLAUDE.md`
- `prompts/README.md`
- `prompts/mdt-architecture.md`
- `prompts/mdt-implement.md`
- `prompts/mdt-tasks.md`
- `prompts/mdt-tech-debt.md`

### 2025-01-06 - Install Script Alignment with v2 Workflows

**Problem**: The install script (`install-claude.sh`) was missing the new `requirements` and `assess` commands added in v2, causing incomplete installations.

**Solution**: Updated the MDT_COMMANDS array and workflow display to match the complete v2 workflow documentation.

**Changes Made**:

1. **MDT_COMMANDS Array** - Added missing commands:
   - Added `"requirements"` and `"assess"` to the 9-command array
   - Reordered commands to match README documentation order

2. **Command Descriptions** - Updated to match README table wording:
   - Ensured consistency across all documentation
   - Fixed workflow display from "Typical" to "Full workflow chain"

3. **Installation Verification** - Enhanced to check all 9 commands:
   - Updated verification loop to include new commands
   - Maintained backward compatibility with existing installations

**Impact**:
- Install script now correctly installs all 9 v2 workflow commands
- Users get complete workflow suite without missing components
- Documentation consistency across install script, README, and GUIDE

**Files Changed**:
- `prompts/install-claude.sh`

### 2025-01-06 - Added Requirements and Assess Workflows

**Problem**: MDT workflow lacked formal requirements specification and code fitness assessment, leading to poorly scoped CRs and integration issues.

**Solution**: Added two new workflows and graduated architecture output based on complexity.

**Changes Made**:

1. **mdt-requirements.md (v1)** - New EARS-formatted requirements:
   - Generates behavioral specs using WHEN/WHILE/IF...THEN syntax
   - Creates artifact mapping and traceability
   - Outputs to `docs/CRs/{CR-KEY}/requirements.md`
   - Consumed by architecture, tasks, implement, tech-debt workflows

2. **mdt-assess.md (v1)** - Code fitness assessment:
   - Evaluates affected code before architecture design
   - Fitness scoring: 0-100% per file with verdicts
   - Three options: Integrate / Refactor inline / Split CRs
   - Prevents integration of problematic code

3. **mdt-architecture.md (v2→v3)** - Graduated output:
   - Simple complexity (≤5): Embed in CR (~60 lines)
   - Complex (>5): Extract to `architecture.md` with full details
   - Includes state flows and error scenarios for complex cases

4. **README.md** - Updated workflow chain:
   - Added requirements and assess to the sequence
   - Updated command reference table
   - Added file structure documentation

**Impact**:
- Complete 9-step workflow chain from creation to reflection
- Formal requirements specification with behavioral focus
- Code fitness assessment prevents integration problems
- Architecture output scales with complexity

**Files Changed**:
- `prompts/README.md`
- `prompts/mdt-requirements.md` (new)
- `prompts/mdt-assess.md` (new)
- `prompts/mdt-architecture.md`