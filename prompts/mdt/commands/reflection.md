# MDT Ticket Reflection Workflow (v4)

Capture post-implementation learnings from the conversation and selected workflow artifacts, then encode approved updates into the CR and any chosen MDT documents. Focus on **artifact-level insights** and **specification adjustments** only.

**Core Principle**: Reflection starts from the documents that shaped the work. Ask which workflow documents should be read, recommend which of them should be updated based on the changes that were actually made, then record approved updates with concrete artifact references.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read `ticketsPath` from `.mdt-config.toml`).

You **MUST** consider the user input before proceeding.

## Source Ownership

Use this routing table when recommending update targets:

| Change Type | Update Target |
|-------------|---------------|
| Implemented behavior, constraints, acceptance semantics | `requirements.md` |
| Structure, ownership, integrations, runtime flow, prerequisites | `architecture.md` |
| Verification intent, required checks, regression coverage | `tests.md` |
| Unresolved issues, compromises, follow-up cleanup | `debt.md` |
| Session summary, links, user-approved notes | `CR Section 8 (Clarifications)` |
| Context note with no source document change | `CR only` |

## Execution Steps

1. **Load CR Context**

   Use `mdt-all:get_cr` with `mode="full"`:
   - Parse CR key, project code, and current status
   - If the ticket doesn't exist, abort and instruct the user to create the CR first
   - If the status is `Rejected`, warn that reflection may not be appropriate
   - If the status is not `Implemented`, confirm the user wants to reflect on in-progress work

2. **Select Documents to Review**

   Detect which of these documents exist under `{TICKETS_PATH}/{CR-KEY}/`:
   - `requirements.md`
   - `bdd.md`
   - `architecture.md`
   - `tests.md`
   - `tasks.md`
   - `debt.md`
   - `poc.md`
   - `domain.md`
   - `domain-audit.md`
   - `prep/architecture.md`, `prep/tests.md`, `prep/tasks.md`

   Selection flow:
   - If `$ARGUMENTS` names documents unambiguously (for example `requirements architecture tests`), use those as the initial review set
   - Otherwise, present the available documents and ask the user which ones should be read
   - Recommend a default set based on the changes discussed:
     - `requirements.md` for behavior or constraint changes
     - `architecture.md` for design or integration changes
     - `tests.md` for verification changes
     - `debt.md` for unresolved issues
   - If the user chooses no workflow documents, proceed with `CR + conversation only`, but warn that document drift may remain

   Wait for the user's selection before reading additional workflow documents.

3. **Read Selected Documents and Extract Learnings**

   Review the selected documents plus the recent conversation, especially the implementation discussion.

   Include only learnings tied to concrete artifacts, such as:
   - discovered files, components, endpoints, methods, or config
   - corrected specifications
   - changed integration points
   - changed verification expectations
   - measured baselines with context
   - unresolved issues that should become debt

   Exclude:
   - team or workflow process learnings
   - tooling observations
   - abstract principles without artifact references
   - generic lessons learned with no spec impact

4. **Categorize and Route Each Learning**

   For each learning, prepare:
   - **Category**
   - **Artifact Reference**
   - **Original Spec**
   - **Actual Implementation**
   - **Impact**
   - **Evidence**
   - **Recommended Update Target**

   Use these categories:
   - **Artifact Discoveries**
   - **Specification Corrections**
   - **Integration Changes**
   - **Verification Updates**
   - **Performance Baselines**
   - **Deployment Insights**
   - **Edge Cases**
   - **Debt Follow-Ups**

5. **Present Learnings for Approval**

   Before updating any document, present the findings and recommendations:

   ```markdown
   ## Post-Implementation Learnings Summary

   **Documents Reviewed**: [list selected documents, or `CR + conversation only`]

   1. **[Learning Title]**
      - Category: [category]
      - Original Spec: [what the document or CR said]
      - Actual Implementation: [what changed]
      - Impact: [why this matters]
      - Evidence: [document section or conversation detail]
      - Recommended update: [requirements.md | architecture.md | tests.md | debt.md | CR only]

   2. **[Learning Title]**
      - ...

   ### Recommended Document Updates

   - `requirements.md`: [why / `none recommended`]
   - `architecture.md`: [why / `none recommended`]
   - `tests.md`: [why / `none recommended`]
   - `debt.md`: [why / `none recommended`]
   - `CR Section 8`: session summary and links

   **Review Instructions**:
   - Reply `yes` or `proceed` to accept the learnings and recommended updates
   - Reply `update only: requirements.md, architecture.md, CR` to choose update targets
   - Reply `CR only` to record the reflection without updating workflow documents
   - Reply with numbers to exclude
   - Reply `edit` to modify specific learnings
   ```

   Wait for user confirmation before proceeding.

6. **Apply Approved Updates**

   Update only the documents the user approved.

   Apply in this order:
   1. Update approved workflow documents first
   2. Record the reflection session in the CR

   Rules:
   - `requirements.md`: update only behavior, constraints, or acceptance semantics
   - `architecture.md`: update only structure, ownership, runtime flow, integrations, or prerequisites
   - `tests.md`: update only verification intent, required checks, or coverage expectations
   - `debt.md`: add unresolved gaps, compromises, or follow-up work
   - If an approved document does not exist, ask whether to create it or keep the note in the CR only
   - Never modify an unapproved workflow document

   For the CR:
   - Ensure `## 8. Clarifications` exists
   - Add `### Reflection Session YYYY-MM-DD`
   - Record:
     - documents reviewed
     - documents updated
     - approved learnings as concise bullets with artifact references
     - links to updated workflow documents when applicable

   Keep the CR entry as a session log and summary. If the user chooses `CR only`, explicitly state that the supporting workflow documents were left unchanged.

7. **Validate**

   After updating:
   - Every approved learning is encoded in an approved document or the CR summary
   - No process or abstract learnings leaked into updated documents
   - `## 8. Clarifications` contains the reflection session summary
   - Updated workflow documents still follow their own MDT prompt rules
   - No contradictory statements remain between updated source documents and the CR summary
   - No unapproved workflow document was modified
   - Every technical statement references a concrete artifact
   - Performance metrics are recorded only when baseline and context are clear

8. **Update CR Status** (if appropriate)

   If the CR is being marked as implemented:
   - Use `mdt-all:update_cr_status` to change status to `Implemented`
   - Use `mdt-all:update_cr_attrs` to add `implementationDate` and `implementationNotes`

9. **Report Completion**

   Provide a concise summary:

   ```markdown
   ## Reflection Recorded

   **CR**: [PROJECT-XXX]
   **Session**: YYYY-MM-DD
   **Documents Reviewed**: [list]
   **Documents Updated**: [list or `CR only`]
   **Learnings Captured**: [N]

   ### Changes
   - [document or CR section]: [brief change summary]
   - [document or CR section]: [brief change summary]

   ### Next Steps
   - [ ] Review updated documents
   - [ ] Mark CR as `Implemented` if complete
   - [ ] Create follow-up CRs for scope additions or debt
   ```

## Behavioral Rules

- Focus on artifacts, not abstractions
- Ask which documents to read unless `$ARGUMENTS` already specifies them clearly
- Recommend update targets from the changes that were actually made
- Update only approved documents
- Keep `## 8. Clarifications` as the reflection session log
- Treat approved workflow documents as source-of-truth artifacts; use the CR entry as the session summary
- Always get approval before writing updates
- Preserve each document's template and formatting rules

## Special Cases

1. **No Artifact Learnings Found**
   - Report that no significant artifact-level insights were detected
   - Ask whether the user wants to add specific insights manually

2. **Contradictory Specifications**
   - Highlight the contradiction
   - Ask which document should be treated as correct
   - Correct only the approved source document(s)

3. **CR Ticket Missing**
   - Abort and instruct the user to create the CR first using `mdt-all:create_cr`

4. **User Chooses `CR only`**
   - Record the reflection only in `## 8. Clarifications`
   - State that workflow documents were intentionally left unchanged

5. **Performance Baselines Without Context**
   - Reject vague claims like "performance improved"
   - Record metrics only when baseline, measurement, and target are clear

## Example Learning Extraction

**Good**:
- "Implemented retry semantics differ from `requirements.md`; update `requirements.md`."
- "Actual runtime ownership moved to `src/services/AuthService.ts`; update `architecture.md`."
- "Null-token regression needs an explicit test case; update `tests.md`."

**Bad**:
- "We learned that modularity is important."
- "Pair programming would have helped."
- "The architecture feels cleaner now."

## Artifact Reference Requirements

Every learning MUST include at least one of:
- specific file path
- specific component or module name
- specific endpoint
- specific method or function
- specific configuration artifact

Learnings without artifact references must be filtered out.

## Context for Reflection

User's additional context (if provided): $ARGUMENTS
