# MDT Workflow Guide

This guide demonstrates practical strategies for using the MDT workflow prompts effectively. Each strategy shows when to use it, why it's effective, and the exact command sequence.

## Full-Flow Strategy

Use when you need complete traceability and rigorous development process. Ideal for complex features, regulatory compliance, or team projects requiring thorough documentation.

<details>

<summary>🎯 When to Use</summary>

- **Complex features** with multiple components and interactions
- **Regulatory requirements** where you need to prove completeness
- **Team projects** where knowledge transfer is critical
- **Critical system changes** where failure has high impact
- **Learning projects** to understand the full development lifecycle

</details>

<details>

<summary>✅ Why It's Effective</summary>

- **Complete traceability** from requirements to implementation
- **Prevents scope creep** with explicit requirement mapping
- **Catches issues early** through architecture assessment
- **Ensures quality** with size limits and duplication checks
- **Documents decisions** for future reference and team onboarding

</details>

<details>

<summary>🔄 Command Sequence</summary>

```bash
# 1. Create the CR with structured questioning
/mdt:ticket-creation

# 2. Generate formal requirements (EARS format)
/mdt:requirements

# 3. Assess code fitness before designing
/mdt:assess

# 4. Design architecture with constraints
/mdt:architecture

# 5. Fill any specification gaps
/mdt:clarification

# 6. Break down into constrained tasks
/mdt:tasks

# 7. Execute with verification
/mdt:implement

# 8. Detect any technical debt created
/mdt:tech-debt

# 9. Capture learnings for improvement
/mdt:reflection
```

</details>

<details>

<summary>📋 What You Get</summary>

**Outputs Generated:**
- `docs/CRs/{CR-KEY}/requirements.md` - EARS-formatted requirements
- `docs/CRs/{CR-KEY}/architecture.md` - Architecture design (if complex)
- `docs/CRs/{CR-KEY}/tasks.md` - Task breakdown with constraints
- `docs/CRs/{CR-KEY}/debt.md` - Technical debt diagnostic
- Updated CR with Section 8 clarifications

**Quality Assurance:**
- Requirements coverage validation
- Size enforcement (OK/FLAG/STOP zones)
- Duplication prevention
- Architecture constraint verification
- Test and build verification

**Traceability:**
- Requirements → Components → Tasks → Implementation
- Coverage tables showing complete implementation
- Satisfaction tracking for each requirement

</details>

<details>

<summary>⚡ Pro Tips</summary>

### Before Starting
- Have clear problem statement ready
- Identify all affected components
- Know acceptance criteria

### During Requirements
- Be specific with artifact references (use backticks)
- Include timing constraints where applicable
- Map every requirement to a component

### During Architecture
- Define size limits for each module type
- Identify shared patterns early
- Create clear extension rules

### During Tasks
- Put shared utilities in Phase 1
- Be explicit about exclusions
- Reference exact paths from architecture

### During Implementation
- Use `--all` mode for automated execution
- Check size warnings immediately
- Run tests after each task

</details>

<details>

<summary>🚀 Real Example</summary>

**Scenario**: Add user authentication to a web application

```bash
# Initial CR created with ticket-creation
# Contains: Problem, Rationale, Solution Analysis, etc.

# 1. Requirements generated
# R1.1: WHEN user submits login form, the `AuthService` shall validate within 500ms
# R1.2: IF credentials invalid, THEN the `LoginForm` shall show error message
# R1.3: WHILE session active, the `SessionService` shall refresh every 15 minutes

# 2. Assessment result
# Affected files: 3 files, fitness scores 85-92%
# Verdict: ✅ Healthy - proceed with integration

# 3. Architecture designed
# New components: AuthService, LoginForm, SessionMiddleware
# Shared patterns: Validation utilities, Error handling
# Size limits: AuthService (150 lines), LoginForm (100 lines)

# 4. Tasks created
# Phase 1: Extract validation utilities (shared)
# Phase 2: Implement AuthService, LoginForm, SessionMiddleware
# Each task maps to requirements (e.g., Task 2.1 implements R1.1, R1.2)

# 5. Implementation executed
# All tasks completed with size verification
# Requirements marked as satisfied
# Tests passing, build successful

# 6. Tech debt check
# No violations detected
# All requirements satisfied

# 7. Reflection captured
# Actual vs planned: AuthService took 180 lines (flagged but acceptable)
# Learning: Password hashing complexity underestimated
```

</details>

## Alternative Strategies

<details>

<summary>🎯 Quick-Flow Strategy (For Simple Features)</summary>

When to use:
- Small UI changes
- Configuration updates
- Bug fixes with clear scope
- Internal tools

Command sequence:
```bash
/mdt:ticket-creation
/mdt:architecture    # Skip if trivial change
/mdt:tasks           # Skip if single task
/mdt:implement
/mdt:reflection
```

Trade-offs:
- ✅ 50-70% faster
- ✅ Less documentation overhead
- ❌ No formal requirements
- ❌ Less traceability

</details>

<details>

<summary>🎯 Architecture-First Strategy</summary>

When to use:
- System redesigns
- Performance improvements
- Integration with new systems
- Breaking monoliths

Command sequence:
```bash
/mdt:ticket-creation
/mdt:assess          # Critical for redesigns
/mdt:requirements    # If new functionality
/mdt:architecture    # Main focus, spend time here
/mdt:tasks
/mdt:implement
/mdt:tech-debt       # Important for redesigns
/mdt:reflection
```

Key emphasis:
- Spend 60% of time in architecture
- Focus on migration paths
- Consider backward compatibility
- Plan rollback strategy

</details>

<details>

<summary>🎯 Bug-Fix Flow Strategy</summary>

When to use:
- Production issues
- Security vulnerabilities
- Performance bugs
- Data corruption issues

Command sequence:
```bash
/mdt:ticket-creation  # Type: Bug Fix
/mdt:requirements     # IF...THEN format for error handling
/mdt:assess          # Check root cause in affected code
# Skip architecture for simple fixes
/mdt:tasks           # Usually 1-2 tasks
/mdt:implement
/mdt:tech-debt       # Check for related issues
/mdt:reflection
```

Special considerations:
- Requirements focus on unwanted behaviors
- Assessment looks for root cause patterns
- Tasks include regression tests
- Tech debt checks for similar issues

</details>

## Best Practices

<details>

<summary>📝 Documentation Tips</summary>

### In CRs
- Use artifact references with backticks: `AuthService`
- Be specific: "Create `src/auth/AuthService.ts`" not "auth service"
- Include acceptance criteria as checkboxes
- Add problem context and business impact

### In requirements.md
- Use EARS templates consistently
- Link to CR sections for traceability
- Include performance constraints
- Define error conditions

### In architecture.md
- Define clear module boundaries
- Specify exact file paths
- Include extension rules
- Set realistic size limits

</details>

<details>

<summary>⚙️ Configuration Tips</summary>

### Project Detection
Workflows auto-detect from:
- `CLAUDE.md` - Custom settings
- `package.json` - Node.js projects
- `Cargo.toml` - Rust projects
- `go.mod` - Go projects
- `pyproject.toml` - Python projects

### Custom Settings
Add to your project's CLAUDE.md:
```markdown
## Project Settings
- source_dir: src/
- test_command: npm test
- build_command: npm run build
- file_extension: .ts
```

</details>

<details>

<summary>🚨 Common Pitfalls</summary>

### Requirements
- ❌ "The system should handle users"
- ✅ "WHEN user registers, the `UserService` shall create record within 200ms"

### Architecture
- ❌ Vague boundaries
- ✅ Specific file paths and responsibilities

### Tasks
- ❌ "Implement authentication"
- ✅ "Create `src/auth/AuthService.validateCredentials()` (max 50 lines)"

### Implementation
- ❌ Ignoring size warnings
- ✅ Addressing flags immediately, splitting if needed

</details>

## Getting Help

<details>

<summary>❓ FAQ</summary>

**Q: Can I skip workflows?**
A: Yes, all workflows after ticket-creation are optional. Use what you need.

**Q: What if requirements.md doesn't exist?**
A: Other workflows adapt - no requirement coverage, tasks reference architecture directly.

**Q: How do I handle STOP conditions?**
A: Size violations >1.5x limit must be resolved. Split into smaller tasks or refactor.

**Q: Can I modify workflows?**
A: Yes, prompts are in this directory. Follow the development guidelines in CLAUDE.md.

**Q: How do I report issues?**
A: Check MCP connection first, then verify tool parameters in mcp-server/MCP_TOOLS.md.

</details>

<details>

<summary>🔧 Troubleshooting</summary>

### MCP Server Issues
```bash
# Reconnect MCP
/mcp

# Verify server built
cd mcp-server && npm run build

# Test with HTTP transport
MCP_HTTP_ENABLED=true npm run dev
```

### File Permission Errors
- Check `docs/CRs/{CR-KEY}/` exists
- Verify write permissions
- Ensure CR-KEY format matches project code

### Workflow Hangs
- Check for missing approval gates
- Verify loop conditions are reachable
- Use debug output to identify stuck step

</details>

---

*For detailed workflow specifications, see each `mdt-*.md` file in this directory.*