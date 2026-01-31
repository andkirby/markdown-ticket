  Migrate [ENUM/TYPE] to domain-contracts as single source of truth.

  ## Current State
  - [ENUM/TYPE] is defined in [CURRENT_LOCATIONS]
  - Hardcoded string literals exist in [COUNT] files across [PACKAGES]
  - [SPECIAL_CIRCUMSTANCES e.g., tests expect old values]

  ## Target State
  - Add [ENUM_NAME] to domain-contracts/src/types/schema.ts
  - Update all files to import from domain-contracts
  - Replace hardcoded strings with enum constants
  - Remove local definitions

  ## Steps
  1. Add enum to domain-contracts/src/types/schema.ts
  2. Update shared/models/Types.ts to import/re-export
  3. Replace hardcoded strings in [LIST_FILES]
  4. Update tests to use new enum values
  5. Build domain-contracts → shared → [OTHER_PACKAGES]
  6. Run: npm run shared:test, server:test, mcp:test, domain:test
  7. Run: npm run lint, npm run knip
  8. Fix any failures with subagents (fix-test-ts, mdt:fix)

  ## Files to Update
  [PROVIDE_FILE LIST WITH SPECIFIC CHANGES]

  ## Verification
  - All tests pass
  - No TypeScript errors
  - No lint/knip issues
  - Breaks: [YES/NO - migration needed?]

  ---
  This captures the pattern:
  - Clear before/after state
  - Step-by-step process
  - File list upfront
  - Verification criteria
  - Call out breaking changes early