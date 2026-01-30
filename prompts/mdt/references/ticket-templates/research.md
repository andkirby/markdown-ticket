# Research Mode Template

Use this template when `CR_TYPE` = "Research" (hypothesis-driven validation or investigation work).

## When to Use Research Type

- Validating uncertain technical decisions ("will this approach work?")
- Comparing multiple implementation options
- Investigating performance or feasibility questions
- Need concrete evidence before committing to implementation

## Mode-Specific Questions

After common questions (Q0-Q3), these questions apply:

### Question 6: Research Clarity

```
Question: How clear is your research hypothesis?
Header: Clarity
Options:
- Clear hypothesis: I know exactly what question to answer (Recommended)
- Multiple hypotheses: I have several related questions to validate
- Exploratory: I need to discover what questions to ask
```

**Use answer to**:
- Determine Research Questions table structure (Section 2)
- Set research scope boundaries
- Guide validation approach depth

### Question 8: Research Method

```
Question: How will you validate your research questions?
Header: Method
MultiSelect: true
Options:
- Prototype/POC: Build experimental code to test
- Benchmark: Measure performance of options
- Literature review: Research existing solutions
- User research: Gather stakeholder input
- Code analysis: Study existing codebase
```

**Use answer to**:
- Populate Validation Approach (Section 3)
- Identify data sources and methods
- Plan deliverables

---

## Document Structure

## 1. Description

### Requirements Scope
`{REQUIREMENTS_SCOPE}` — `full` | `brief` | `preservation` | `none`

### Research Objective
Clear statement of what hypothesis or question this research validates:
- Primary hypothesis or research question
- What decision depends on this research
- What uncertainty this research resolves

### Research Context
Write 2-3 bullets providing context:
- What problem or gap motivates this research
- What constraints or assumptions exist
- What prior work or knowledge is relevant

### Scope
Clearly define research boundaries:
- **In scope**: What questions this research addresses
- **Out of scope**: What questions are NOT addressed

## 2. Research Questions

Use table format for all research questions:

| ID | Research Question | Success Criteria | Priority |
|----|-------------------|------------------|----------|
| RQ1 | Specific question to answer | Measurable outcome | High/Medium/Low |
| RQ2 | Specific question to answer | Measurable outcome | High/Medium/Low |
| RQ3 | Specific question to answer | Measurable outcome | High/Medium/Low |

**Guidelines**:
- Each RQ must be answerable with evidence
- Success criteria must be observable/measurable
- Priority guides resource allocation if time-constrained

## 3. Validation Approach

### Research Method
Describe how each RQ will be validated:
- RQ1: Method (e.g., literature review, prototype, experiment, analysis)
- RQ2: Method with specific data sources or tools
- RQ3: Method with measurement approach

### Data Sources
List sources of evidence for each RQ:
- RQ1: Specific documents, codebases, systems to analyze
- RQ2: Specific user groups, metrics, or benchmarks
- RQ3: Specific technologies, frameworks, or patterns to evaluate

### Success Metrics
Define measurable outcomes:
- Evidence threshold for answering each RQ
- Confidence level required for conclusions
- Decision criteria for proceeding vs. pivoting

## 4. Acceptance Criteria

### Research Completion
Checkboxes for each RQ (NOT in code blocks):
- [ ] RQ1 answered with evidence: [summary of findings]
- [ ] RQ2 answered with evidence: [summary of findings]
- [ ] RQ3 answered with evidence: [summary of findings]

### Decision Outcomes
Define possible outcomes and next steps:
- If hypothesis confirmed: [specific action or CR to create]
- If hypothesis refuted: [alternative approach or pivot]
- If inconclusive: [what additional work needed]

### Artifacts Produced
List deliverables from this research:
- Research summary document with findings
- Evidence data (benchmarks, prototypes, analysis)
- Recommendation: [Create new CR / Modify existing CR / Abandon approach]

## 5. Dependencies & Next Steps

### Prerequisites
What must exist before research starts:
- Access to systems, data, or documentation
- Setup or configuration required
- Stakeholder input or approval needed

### Blocked By
List any dependencies:
- [ ] CR-XXX: Prior research or implementation
- [ ] System Y: Access to environment or tool
- [ ] Stakeholder Z: Input or approval

### Next Steps After Research
Based on research outcomes:
- **Positive outcome**: Create CR for [specific feature/change]
- **Negative outcome**: Pivot to [alternative approach]
- **Inconclusive**: Additional research needed for [specific RQ]

---

## Quality Checklist (Research Mode)

In addition to [common quality checks](./quality-checks.md):

- [ ] Research Objective clearly states hypothesis or question to validate
- [ ] Section 2 Research Questions table includes ID, question, success criteria, priority
- [ ] Each RQ has measurable success criteria (observable outcomes)
- [ ] Validation Approach specifies concrete methods and data sources
- [ ] Acceptance Criteria include decision outcomes for each possible result
- [ ] Dependencies & Next Steps list prerequisites and post-research actions

## Common Errors to Avoid

❌ **WRONG**: Research Questions without success criteria or priority
✅ **CORRECT**: Table with ID, question, measurable criteria, priority level

❌ **WRONG**: Vague validation approach like "investigate options"
✅ **CORRECT**: Specific method (e.g., "prototype and benchmark X vs Y")

❌ **WRONG**: Missing decision outcomes for different research results
✅ **CORRECT**: Clear actions for positive/negative/inconclusive outcomes

---

## Research Workflow

After creating a Research CR:

```
/mdt:ticket-creation (Research type)
    ↓
/mdt:poc (creates poc.md + poc/ folder)
    ↓
/mdt:reflection (documents findings)
    ↓
Decision: Proceed to feature / New research / Expand POC
```
