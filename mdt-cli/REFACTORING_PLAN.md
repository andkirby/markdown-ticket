# MDT CLI - Refactoring Plan

## Executive Summary

This refactoring plan addresses redundancies identified in the MDT CLI codebase. The goal is to simplify the implementation to focus solely on the 5 core requirements while removing ~400 lines of unnecessary code (35-40% reduction).

**Core Requirements:**
1. CLI interface accepting ticket number
2. Display ticket metadata: `[KEY | Type | Priority | Status]` + Title
3. Fetch "description" and "rationale" sections
4. Generate LLM summary
5. Display summary text

**Expected Outcomes:**
- Reduce codebase by 35-40%
- Improve maintainability
- Faster execution (remove retry loops)
- Clearer, more focused code

---

## Refactoring Phases

### Phase 1: Remove Dead Code (Low Risk, High Impact)
**Estimated effort:** 30 minutes
**Lines removed:** ~150

#### 1.1 Remove Unused Configuration
**File:** `mdt-cli/config.py`

```diff
- DEFAULT_MAX_RETRIES = 3
- @classmethod
- def get_max_retries(cls) -> int:
-     """Get max retry attempts for LLM requests."""
-     try:
-         return int(os.getenv('MDT_MAX_RETRIES', cls.DEFAULT_MAX_RETRIES))
-     except ValueError:
-         return cls.DEFAULT_MAX_RETRIES
```

**Rationale:** Never used in codebase.

#### 1.2 Remove Unused Format Methods
**File:** `mdt-cli/output_formatter.py`

```diff
- @staticmethod
- def format_success(message: str) -> str:
-     """Format success message in green."""
-     return f"{Fore.GREEN}✓ {message}{Style.RESET_ALL}"

- @staticmethod
- def format_ticket_display(ticket_data: 'TicketData', summary: str = None) -> str:
-     """Format complete ticket display with optional summary."""
-     # ... 20 lines of unused code
```

**Rationale:** Never called in codebase.

#### 1.3 Simplify Exit Codes
**File:** `mdt-cli/config.py`

```diff
EXIT_SUCCESS = 0
- EXIT_INVALID_INPUT = 1
- EXIT_MCP_ERROR = 2
- EXIT_LLM_ERROR = 3
- EXIT_TICKET_NOT_FOUND = 4
- EXIT_CONFIG_ERROR = 5
- EXIT_GENERAL_ERROR = 6
+ EXIT_ERROR = 1
```

**File:** `mdt-cli/mdt.py` - Update all error exits to use `EXIT_ERROR`

**Rationale:** No downstream consumers need granular exit codes. Standard practice: 0=success, 1=error.

#### 1.4 Remove --config-info Flag
**File:** `mdt-cli/mdt.py`

```diff
- @click.option('--config-info', is_flag=True, help='Display configuration information')
- def main(ticket_id: str, debug: bool, verbose: bool, config_info: bool):
+ def main(ticket_id: str, debug: bool, verbose: bool):
-     if config_info:
-         Config.print_config_info()
-         sys.exit(0)
```

**File:** `mdt-cli/config.py`

```diff
- @classmethod
- def print_config_info(cls):
-     """Print current configuration information."""
-     # ... 10 lines removed
```

**Rationale:** Not in core requirements; adds CLI bloat.

---

### Phase 2: Simplify LLM Processing (Medium Risk, High Impact)
**Estimated effort:** 1 hour
**Lines removed:** ~250

#### 2.1 Remove Multi-Attempt Retry Logic
**File:** `mdt-cli/llm_processor.py`

**Current:** 3 attempts with different parameters (lines 38-110)

**Replace with:**
```python
def _generate_summary_with_attempts(self, content: str) -> str:
    """Generate summary with single attempt."""
    try:
        if not content or not content.strip():
            return "No content available for summary"

        # Single attempt with reasonable defaults
        user_content = f"Summarize this ticket in one sentence:\n\n{content[:4000]}"
        lm = guidance.models.OpenAI(
            model=self.model_name,
            base_url=self.base_url,
            api_key="dummy",
            max_tokens=150,
            temperature=0.3
        )

        result = lm + guidance.system(self.SYSTEM_PROMPT) + guidance.user(user_content) + guidance.assistant(gen("summary"))
        summary = str(result["summary"]).strip()

        if summary and len(summary) > 0:
            return summary
        return "Summary generation returned empty result"

    except Exception as e:
        return f"Summary generation failed: {str(e)}"
```

**Rationale:** Core requirement only needs to "generate summary" - one attempt suffices.

#### 2.2 Remove Complex Fallback Summary Generator
**File:** `mdt-cli/llm_processor.py`

**Current:** 114 lines of sentence extraction (lines 149-262)

**Replace with:**
```python
def _fallback_summary(self, content: str) -> str:
    """Simple fallback when LLM fails."""
    if not content or not content.strip():
        return "No content available for summary"

    # Return first 100 characters
    first_line = content.strip().split('\n')[0]
    if len(first_line) > 100:
        return first_line[:97] + "..."
    return first_line
```

**Rationale:** Specs say "fall back to displaying raw content" - no need for complex extraction.

#### 2.3 Remove Summary Validation
**File:** `mdt-cli/llm_processor.py`

```diff
- def _is_valid_summary(self, summary: str) -> bool:
-     """Validate summary meets quality criteria."""
-     # ... 28 lines of validation logic
-     return True
```

Remove all calls to `_is_valid_summary()`.

**Rationale:** Not in requirements; trust LLM output or display as-is.

#### 2.4 Fix generate_summary() API
**File:** `mdt-cli/llm_processor.py`

```diff
- def generate_summary(self, description: str, rationale: str) -> str:
+ def generate_summary(self, content: str) -> str:
    """Generate concise summary from ticket content."""
-     # Combine content
-     parts = []
-     if description and description.strip():
-         parts.append(description.strip())
-     if rationale and rationale.strip():
-         parts.append(rationale.strip())
-     content = "\n\n".join(parts)

    return self._generate_summary_with_attempts(content)
```

**File:** `mdt-cli/mdt.py` - Update call site (line 129):

```diff
- summary = llm_processor.generate_summary(content, "")
+ summary = llm_processor.generate_summary(content)
```

**Rationale:** Remove unused parameter; content is pre-combined.

---

### Phase 3: Simplify Configuration & Validation (Low Risk, Medium Impact)
**Estimated effort:** 45 minutes
**Lines removed:** ~80

#### 3.1 Simplify Config Validation
**File:** `mdt-cli/config.py`

**Current:** 54 lines of validation (lines 62-115)

**Replace with:**
```python
@classmethod
def validate_config(cls) -> List[str]:
    """Basic configuration validation."""
    issues = []

    # Check MCP server exists
    mcp_path = Path(cls.get_mcp_server_path())
    if not mcp_path.exists():
        issues.append(f"MCP server not found: {mcp_path}")

    return issues
```

**Rationale:** Let connection failures provide natural feedback; remove security theater.

#### 3.2 Remove Critical/Non-Critical Config Issue Classification
**File:** `mdt-cli/mdt.py`

```diff
config_issues = Config.validate_config()
if config_issues:
-     critical_issues = [issue for issue in config_issues if "not found" in issue.lower()]
-     if critical_issues:
-         print(OutputFormatter.format_error("Configuration errors:"))
-         for issue in critical_issues:
-             print(f"  • {issue}")
-         sys.exit(Config.EXIT_CONFIG_ERROR)
-     else:
-         print(OutputFormatter.format_warning("Configuration warnings:"))
-         for issue in config_issues:
-             print(f"  ⚠ {issue}")
+     print(OutputFormatter.format_error("Configuration error:"))
+     for issue in config_issues:
+         print(f"  • {issue}")
+     sys.exit(Config.EXIT_ERROR)
```

**Rationale:** Simplify - if config invalid, exit immediately.

---

### Phase 4: Remove Verbose/Debug Features (Low Risk, Medium Impact)
**Estimated effort:** 30 minutes
**Lines removed:** ~50

#### 4.1 Remove --verbose Flag and Output
**File:** `mdt-cli/mdt.py`

```diff
- @click.option('--verbose', is_flag=True, help='Enable verbose output')
- def main(ticket_id: str, debug: bool, verbose: bool):
+ def main(ticket_id: str, debug: bool):

-     if verbose:
-         print(f"Fetching ticket: {full_key}")

-     if verbose:
-         print("Fetching ticket sections...")

-     if verbose:
-         print("Generating AI summary...", end='', flush=True)
-         # Clear the line
-         print('\r' + ' ' * 50 + '\r', end='', flush=True)

-     if verbose:
-         print("Continuing with basic ticket display...")
```

**Rationale:** Tool should be fast (<5s); progress indicators unnecessary.

#### 4.2 Keep --debug Flag (Minimal)
**File:** `mdt-cli/mdt.py`

Keep the `--debug` flag for development purposes but simplify to only set logging level:

```python
@click.option('--debug', is_flag=True, help='Enable debug logging')
def main(ticket_id: str, debug: bool):
    if debug:
        logging.basicConfig(level=logging.DEBUG)
```

---

### Phase 5: Simplify Output Formatting (Low Risk, Low Impact)
**Estimated effort:** 20 minutes
**Lines removed:** ~30

#### 5.1 Simplify Priority/Status Color Mapping
**File:** `mdt-cli/output_formatter.py`

**Current:** 21 specific mappings (lines 61-90)

**Replace with:**
```python
@staticmethod
def _get_priority_color(priority: str) -> str:
    """Get color for priority with simple fallback."""
    priority_lower = priority.lower()
    if 'critical' in priority_lower:
        return Fore.RED + Style.BRIGHT
    elif 'high' in priority_lower:
        return Fore.RED
    elif 'medium' in priority_lower:
        return Fore.YELLOW
    elif 'low' in priority_lower:
        return Fore.WHITE
    return Fore.YELLOW  # Default

@staticmethod
def _get_status_color(status: str) -> str:
    """Get color for status with simple fallback."""
    status_lower = status.lower()
    if any(word in status_lower for word in ['implement', 'done', 'closed', 'complete']):
        return Fore.GREEN
    elif any(word in status_lower for word in ['progress', 'review']):
        return Fore.YELLOW
    elif any(word in status_lower for word in ['reject', 'blocked']):
        return Fore.RED
    elif any(word in status_lower for word in ['approved', 'ready']):
        return Fore.CYAN
    return Fore.WHITE  # Default
```

**Rationale:** Use pattern matching instead of exhaustive mappings.

#### 5.2 Simplify Section Content Extraction
**File:** `mdt-cli/mcp_client.py`

**Current:** Filters out emoji and headers (lines 103-123)

**Replace with:**
```python
def _extract_section_content(self, response_text: str) -> str:
    """Extract content between --- markers."""
    parts = response_text.split('---')
    if len(parts) >= 3:
        return parts[1].strip()
    return response_text.strip()
```

**Rationale:** LLM can handle any formatting; don't over-process.

---

## Implementation Order

1. **Phase 1** (Dead Code) - Safe, quick wins
2. **Phase 3** (Config) - Simplify before touching main logic
3. **Phase 4** (Verbose) - Clean up UI before core changes
4. **Phase 5** (Formatting) - Minor improvements
5. **Phase 2** (LLM) - Most impactful, do last with full test coverage

---

## Risk Mitigation

### Before Starting
- [ ] Run full test suite: `python run_tests.py`
- [ ] Document current test coverage
- [ ] Create git branch: `git checkout -b refactor/remove-redundancies`

### Per Phase
- [ ] Make changes
- [ ] Run tests
- [ ] Manual smoke test: `mdt MDT-001`
- [ ] Commit: `git commit -m "Phase N: [description]"`

### Rollback Plan
- If tests fail: `git reset --hard HEAD~1`
- If critical issue found: `git checkout main`

---

## Testing Checklist

After each phase, verify:

- [ ] `mdt MDT-001` displays ticket successfully
- [ ] `mdt INVALID-FORMAT` shows error message
- [ ] `mdt MDT-999999` (non-existent) shows "not found"
- [ ] LLM summary appears (or graceful fallback)
- [ ] Exit codes: 0 on success, 1 on any error
- [ ] No zombie processes: `ps aux | grep node`

---

## Success Metrics

**Before Refactoring:**
- Total lines: ~1,100
- Files: 7
- Functions: ~35

**After Refactoring (Target):**
- Total lines: ~700 (-36%)
- Files: 7 (same)
- Functions: ~25 (-29%)

**Quality Improvements:**
- Cyclomatic complexity: <5 per function
- No dead code
- Clear single responsibility per module
- Faster execution (no retry loops)

---

## Files Modified Summary

| File | Lines Before | Lines After | Change |
|------|--------------|-------------|--------|
| `llm_processor.py` | ~350 | ~120 | -66% |
| `config.py` | ~126 | ~80 | -37% |
| `mdt.py` | ~155 | ~120 | -23% |
| `output_formatter.py` | ~110 | ~80 | -27% |
| `mcp_client.py` | ~230 | ~200 | -13% |
| `ticket_normalizer.py` | ~35 | ~35 | 0% |
| `__init__.py` | ~20 | ~20 | 0% |
| **TOTAL** | **~1,026** | **~655** | **-36%** |

---

## Post-Refactoring Tasks

- [ ] Update README.md to reflect simplified API
- [ ] Remove mentions of removed flags from documentation
- [ ] Update IMPLEMENTATION_SUMMARY.md
- [ ] Run performance benchmarks
- [ ] Create PR with before/after comparisons

---

## Questions to Resolve

1. **Exit codes**: Confirm stakeholders don't need granular codes (1-6)
2. **MCP format**: Can we get structured JSON instead of parsing formatted text? (See item #14 in redundancy report)
3. **Fallback behavior**: Should we show raw content or simple message on LLM failure?
4. **Validation**: Any security/validation actually required vs. over-engineering?

---

## Notes

- This plan focuses on **removing** code, not rewriting
- Each phase is independently committable
- Phases 1-4 are low-risk, can do without heavy testing
- Phase 2 (LLM) requires most care - test thoroughly
- Keep git history clean: one commit per phase
- Total estimated effort: ~3.5 hours
