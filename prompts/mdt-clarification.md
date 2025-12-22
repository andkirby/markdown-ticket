# MDT Ticket Clarification Workflow (v1)

Interactive clarification workflow for MDT architectural decision records (ADRs) using MCP mdt-all ticket system. Identifies underspecified areas in CR tickets and encodes answers directly into the ticket content.

**Core Principle**: Ensure concrete artifact specifications exist before implementation. Every ambiguity must be resolved with specific file/component/endpoint references, not behavioral descriptions.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Goal: Detect and reduce ambiguity or missing artifact specifications in the active CR ticket using an interactive questioning interface and record clarifications directly in the ticket.

Note: This clarification workflow should run BEFORE detailed implementation planning. If the user explicitly states they are skipping clarification (e.g., exploratory spike), you may proceed, but must warn that downstream rework risk increases.

Execution steps:

1. Load the CR ticket using `mdt-all:get_cr` with mode=\"full\" to retrieve both attributes and markdown content.
   - Parse CR key, project code, current status from response
   - If ticket doesn't exist, abort and instruct user to create CR first
   - If ticket status is \"Implemented\" or \"Rejected\", warn that clarification may not be appropriate

2. Perform structured artifact-specification scan using this taxonomy. For each category, mark status: Clear / Partial / Missing. Produce internal coverage map for prioritization (do not output raw map unless no questions will be asked).

   **Artifact Identification:**
   - Files, components, modules explicitly named
   - Endpoints/APIs with concrete paths
   - Methods/functions with signatures
   - Configuration files and their structure
   - Database entities and schema elements

   **Problem Specification:**
   - Specific technical issues reference concrete artifacts
   - Current state described with artifact details (files, versions, dependencies)
   - Missing capabilities tied to specific artifact gaps
   - Architectural gaps reference specific integration points

   **Scope Boundaries:**
   - Files/components to be modified explicitly listed
   - Files/components unchanged explicitly declared
   - Out-of-scope artifacts clearly stated

   **Decision Artifacts:**
   - Chosen approach references specific files/components
   - Rationale includes measurable technical criteria
   - Trade-offs reference specific artifact constraints

   **Alternatives Evaluation:**
   - Each alternative specifies different artifacts or patterns
   - Key differences reference concrete implementation details
   - Rejection reasons cite specific technical constraints

   **Artifact Specifications (Section 4):**
   - New artifacts: file paths, types, purposes defined
   - Modified artifacts: specific changes listed (methods added, props changed)
   - Integration points: concrete interfaces specified
   - Patterns: artifact-specific applications listed

   **Acceptance Criteria:**
   - Functional criteria reference specific artifacts and testable conditions
   - Non-functional criteria include baselines and targets
   - Testing approach specifies test files and concrete scenarios

   **Verification Strategy:**
   - Measurable success criteria defined
   - Verification method appropriate to CR type
   - Concrete artifacts or metrics listed

   **Deployment Plan:**
   - Deployment artifacts specified
   - Rollback procedures reference specific commits/flags
   - Configuration changes listed

   **Formatting & Structure:**
   - No YAML frontmatter (MCP auto-generates)
   - Proper markdown headers (##/### not bold text)
   - No duplicate section headers
   - Lists not wrapped in code blocks
   - Tables used for comparisons/specifications
   - One H1 only

   **Anti-Patterns to Detect:**
   - Behavioral descriptions (\"component that handles X\")
   - Placeholders or TODOs
   - Generic adjectives without specifics
   - Fabricated metrics without baselines
   - Code snippets in sections 1-6
   - Missing artifact references in technical statements

   For each category with Partial or Missing status, add a candidate question unless:
   - Information would not materially change artifact specifications
   - Information is better deferred to implementation phase

3. Generate (internally) a prioritized queue of candidate clarification questions (maximum 10). Do NOT output them all at once. Apply these constraints:
    - Maximum of 10 total questions across the whole session
    - Each question must be structured for AskUserQuestion interface:
       - Multiple-choice selection (2-5 distinct, mutually exclusive options), OR
       - Multi-select for related artifact selections, OR
       - Short-phrase answer (explicitly constrain: \"Answer in ≤5 words\")
    - Only include questions whose answers directly produce concrete artifact specifications
    - Ensure category coverage balance: prioritize unresolved high-impact areas (artifact specs, acceptance criteria, verification) over low-impact areas (deployment details)
    - Exclude questions already answered, stylistic preferences, or plan-level execution details
    - Favor clarifications that transform behavioral descriptions into artifact specifications
    - If more than 10 categories remain unresolved, select top 10 by (Artifact Specificity Impact * Uncertainty) heuristic

4. Enhanced interactive questioning with AskUserQuestion:
   - **Question Presentation Strategy:**
     - Present questions individually OR in small batches when questions are related and don't depend on each other's answers
     - For batch questions, limit to 2-3 related questions to avoid overwhelming the user
     - Each batch counts toward the 10-question limit appropriately

   - **Multiple-Choice Questions (single-select):**
     - Use `AskUserQuestion` with `multiSelect: false`
     - Analyze all options and determine the most suitable option based on:
       - Artifact-focused specificity (concrete file/component references)
       - Alignment with MDT template requirements
       - Measurability and testability
       - Risk reduction (clarity, maintainability, verifiability)
     - Mark the recommended option in the `description` field: `(Recommended) Best choice because...`
     - Structure options clearly with concise labels and detailed descriptions
     - Include an \"Other\" option only when free-form alternatives genuinely needed

   - **Multi-Select Questions:**
     - Use `AskUserQuestion` with `multiSelect: true` for:
       - Artifact selection (multiple files/components to include)
       - Integration points (multiple external dependencies)
       - Acceptance criteria categories (multiple applicable criteria)
       - Test types (multiple testing approaches)
     - Ensure options are truly independent and can be selected in combination
     - Provide clear guidance on selection expectations

   - **Short-Answer Questions:**
     - Use `AskUserQuestion` with constrained input options
     - Provide suggested answer with reasoning in question context
     - Clearly state word limits: \"Answer in 5 words or less\"
     - Use for specific artifact names, file paths, metric thresholds

   - **Conditional Question Logic:**
     - Prepare follow-up questions based on anticipated answers
     - Example: If user selects \"New service\", prepare follow-up about service file path and interface
     - Maintain the 10-question limit accounting for conditional questions

   - **Answer Processing:**
     - Parse structured responses from `AskUserQuestion`
     - Handle both single selections and multi-select arrays
     - Validate answer completeness and artifact specificity
     - If ambiguous response detected, ask for quick disambiguation (counts as same question)

   - **Question Flow Control:**
     - Stop asking when: all critical artifact ambiguities resolved, user signals completion, or 10 questions reached
     - Never reveal future queued questions in advance
     - If no valid questions exist, immediately report no critical ambiguities

5. Enhanced integration with structured answers:
   - For the first integrated answer in this session:
     - Ensure a `## 8. Clarifications` section exists (create it after Section 7 if missing)
     - Under it, create (if not present) a `### Session YYYY-MM-DD` subheading for today
   - Process structured answers from AskUserQuestion:
     - **Single-select answers**: Record as `- Q: <question> → A: <selected_option_label>`
     - **Multi-select answers**: Record as `- Q: <question> → A: <option1>, <option2>, <option3>`
     - **Short answers**: Record as `- Q: <question> → A: <user_answer>`
   - Apply the clarification to the most appropriate section(s):
     - Artifact identification → Update `### Affected Artifacts` with specific file paths
     - Problem specification → Add artifact references to `### Problem` bullets
     - Scope boundaries → Update `### Scope` with explicit changes/unchanged lists
     - Decision artifacts → Add specific files/components to `### Chosen Approach`
     - Alternatives → Add artifact differences to alternatives table
     - New artifacts → Add row to `### New Artifacts` table
     - Modified artifacts → Add row to `### Modified Artifacts` table
     - Integration points → Add row to `### Integration Points` table
     - Acceptance criteria → Add checkbox to `### Functional` or `### Non-Functional`
     - Verification → Update `### By CR Type` or `### Metrics` with specifics
     - Deployment → Add artifacts to deployment plan
   - For multi-select answers that span multiple categories, apply to each relevant section
   - If clarification invalidates earlier vague statement, replace that statement instead of duplicating
   - Use `mdt-all:manage_cr_sections` to update specific sections atomically
   - Preserve formatting: follow MDT template formatting rules strictly

6. Enhanced validation (performed after EACH section update plus final pass):
   - Clarifications session contains exactly one bullet per accepted answer (no duplicates)
   - Total asked (accepted) questions ≤ 10
   - Updated sections contain no lingering vague placeholders or behavioral descriptions
   - No contradictory earlier statement remains
   - Markdown structure valid per MDT template rules:
     - No YAML frontmatter
     - Proper headers (##/### not bold text)
     - No duplicate section headers
     - Lists not in code blocks (except deployment commands)
     - One H1 only
   - Every technical statement references a concrete artifact
   - Tables used correctly for comparisons and specifications
   - Alternatives table marks chosen approach with **ACCEPTED**

7. Write updates back to the CR using `mdt-all:manage_cr_sections`:
   - Update modified sections individually
   - Add `## 8. Clarifications` section with session record
   - Preserve all other sections unchanged

8. Enhanced completion reporting:
   - CR key and project code
   - Number of questions asked & answered
   - Sections updated (list names)
   - Coverage summary table listing each taxonomy category with Status: Resolved, Deferred, Clear, Outstanding
   - Summary of answer types (single-select, multi-select, short-answer)
   - Artifact specificity score: percentage of technical statements with concrete artifact references
   - If any Outstanding or Deferred remain, recommend next steps
   - Suggested next command (e.g., proceed with implementation planning)

## Question Types and Examples

### Single-Select Example (Artifact-Focused):
```
Question: What file should contain the authentication service logic?
Options:
- src/services/AuthService.ts (Recommended) - Standard location, consistent with existing service pattern
- src/auth/AuthModule.ts - Dedicated auth directory, better isolation
- src/core/Authentication.ts - Core services location, centralized
- Custom location - Specify exact path
```

### Multi-Select Example (Artifact Selection):
```
Question: Which files need modification for the new feature?
Options:
- src/components/UserProfile.tsx - UI component updates
- src/services/UserService.ts - Business logic changes
- src/api/routes/users.ts - API endpoint additions
- src/types/User.ts - Type definition updates
- database/migrations/add_user_fields.sql - Schema changes
```

### Short-Answer Example (Artifact Naming):
```
Question: What endpoint path should be used for the new API?
Format: Answer in 5 words or less
Example: /api/v2/users/profile
```

## Behavior Rules

- If no meaningful artifact ambiguities found, respond: \"No critical artifact specification gaps detected. CR appears ready for implementation planning.\" and suggest proceeding.
- If CR ticket doesn't exist, instruct user to create CR first using mdt-all:create_cr.
- Never exceed 10 total asked questions (clarification retries don't count as new questions).
- Use `AskUserQuestion` for all user interactions to ensure consistent experience.
- Respect user early termination signals.
- Focus exclusively on artifact specifications - behavioral descriptions are anti-patterns.
- If quota reached with unresolved high-impact categories, explicitly flag them under Deferred with rationale.
- Every update must preserve MDT template formatting rules.
- Prioritize transforming vague statements into concrete artifact references.

## Quality Targets

Post-clarification CR should achieve:
- 95%+ of technical statements reference concrete artifacts (files/components/endpoints/methods)
- Zero behavioral descriptions in Problem, Decision, or Artifact Specifications sections
- Zero placeholders or TODOs in critical sections (1-6)
- All tables properly formatted with correct structure
- All acceptance criteria testable and artifact-specific
- Verification section includes measurable criteria or concrete artifact lists

Context for prioritization: $ARGUMENTS