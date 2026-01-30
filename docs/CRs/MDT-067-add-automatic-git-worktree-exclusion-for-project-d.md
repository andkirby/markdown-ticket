---
code: MDT-067
title: Add Automatic Git Worktree Exclusion for Project Discovery
status: Implemented
dateCreated: 2025-10-14T20:07:05.855Z
type: Feature Enhancement
priority: Medium
---

# Add Automatic Git Worktree Exclusion for Project Discovery

## 1. Description
The project discovery system currently includes git worktree instances in the project selector, creating duplicate entries and cluttering the user interface. Git worktrees are linked working directories that share the same git history as a main repository, typically used for parallel development on different branches.

When developers create git worktrees, these appear as separate directories but represent the same underlying project. This results in:
- Multiple project entries for the same repository
- Confusing project selector UI
- Redundant file watching and resource usage
- User confusion about which "project" to select

**Additional Consideration: Projects Without Configuration Files**

The current discovery logic only considers directories containing `.mdt-config.toml` files as valid projects. However, this excludes legitimate projects that may not have configuration files yet. The worktree detection logic should also handle:

- Directories without `.mdt-config.toml` files that could still be valid projects
- Worktrees of projects that have configuration files in the main repository but not in the worktree
- Legacy projects or newly created workspaces that haven't been configured yet

The detection logic should apply worktree exclusion to all directories being scanned, regardless of whether they contain configuration files, ensuring comprehensive coverage of the filesystem tree.
## Implementation Status: ✅ COMPLETED
### Core Detection Logic

Implement a multi-layered detection approach:

1. **Fast Path (Pattern-based)**:
   - Analyze directory names against worktree patterns
   - Check for corresponding main project directories
   - No git commands required - immediate results

2. **Verification Path (Git-based)**:
   - Use `git rev-parse --git-dir` to confirm worktree status
   - Check for absolute paths containing `worktrees/`
   - Execute asynchronously to avoid blocking

3. **Caching Layer**:
   - Pre-build worktree cache using `git worktree list`
   - Use `Set` data structure for O(1) lookups
   - Update cache asynchronously during startup

### Integration Points

**Project Scanner Enhancement**:
```typescript
// In scanDirectoryForProjects method
if (this.isGitWorktree(dirPath)) {
  console.log(`Skipping git worktree: ${dirPath}`)
  // Skip this directory
}
```

**Non-blocking Initialization**:
```typescript
// Use setImmediate to avoid blocking startup
setImmediate(() => {
  // Build worktree cache asynchronously
  this.buildWorktreeCache()
})
```

### Error Handling

- Add timeouts (2 seconds) to all git commands
- Suppress stderr output to prevent console spam
- Gracefully handle non-git directories and permission errors
- Use pattern-based detection as fallback when git commands fail

### Comprehensive Directory Scanning

**Apply Worktree Detection to All Directories**:

The worktree detection logic should be applied to all directory scanning operations, not just those looking for `.mdt-config.toml` files. This ensures:

```typescript
// In scanDirectoryForProjects method - apply to ALL directories
for (const entry of entries) {
  if (entry.isDirectory() && !entry.name.startsWith('.')) {
    const subDirPath = path.join(dirPath, entry.name)

    // Apply worktree exclusion to ALL subdirectories
    if (this.isGitWorktree(subDirPath)) {
      console.log(`Skipping git worktree subdirectory: ${subDirPath}`)
      continue
    }

    // Then continue with normal project detection logic
    // (checking for .mdt-config.toml, etc.)
    this.scanDirectoryForProjects(subDirPath, discovered, maxDepth - 1)
  }
}
```

**Handle Projects Without Configuration Files**:

- The worktree exclusion should run before any configuration file checks
- This prevents scanning worktree directories regardless of their contents
- Ensures comprehensive coverage of the filesystem during project discovery
- Maintains performance by avoiding unnecessary git operations in worktrees
## 2. Rationale

Git worktrees are a common workflow feature where developers need to work on multiple branches simultaneously without switching contexts. However, from a project management perspective, these worktrees represent the same logical project and should not appear as separate entities in the project selector.

The current project discovery system scans directories for `.mdt-config.toml` files without considering whether they are part of a git worktree structure. This leads to a poor user experience where the project selector shows:
```
markdown-ticket (main)
markdown-ticket-aws-counter (worktree)
markdown-ticket-smart-link (worktree)
markdown-ticket-clone (separate repo)
```

Users should only see distinct projects, not worktree variations.

## 3. Solution Analysis

### Worktree Identification Methods

**Method 1: Git Command Detection (Most Accurate)**
- Use `git rev-parse --git-dir` to determine git repository structure
- Worktrees return absolute paths containing `worktrees/` (e.g., `/path/to/main/.git/worktrees/worktree-name`)
- Main repositories return relative paths (e.g., `.git`)
- Use `git worktree list` to pre-cache known worktrees for performance

**Method 2: Filesystem Pattern Detection (Fast Fallback)**
- Analyze directory naming patterns common in worktrees:
  - `project-name-123` (numeric suffixes)
  - `project-name-abc123` (hex commit hash suffixes)
  - `project-name-feature/bug/fix` (branch-type prefixes)
  - `project-name-main/master/develop` (common branch names)
- Check for existence of corresponding "main" project directory
- Provides fast detection without git command overhead

### Performance Considerations

Git commands can be slow and may block application startup if not handled properly. The solution should:
- Use pattern-based detection as the primary fast path
- Employ asynchronous git command verification for accuracy
- Implement caching of known worktrees to avoid repeated checks
- Add timeouts and error suppression to prevent hanging
- Use non-blocking initialization to avoid startup delays

### Implementation Locations

The worktree detection logic should be integrated into:

**Shared Project Service** (`shared/services/ProjectService.ts`)
- Add worktree identification methods to the existing project discovery service
- Modify `scanDirectoryForProjects()` to skip worktree directories
- Implement caching and asynchronous verification

**Server Project Discovery** (`server/projectDiscovery.js`)
- Leverage the shared service implementation (already uses shared ProjectService)
- No additional changes needed if shared service is properly implemented

## 4. Implementation
### Core Detection Logic

Implement a multi-layered detection approach:

1. **Fast Path (Pattern-based)**:
   - Analyze directory names against worktree patterns
   - Check for corresponding main project directories
   - No git commands required - immediate results

2. **Verification Path (Git-based)**:
   - Use `git rev-parse --git-dir` to confirm worktree status
   - Check for absolute paths containing `worktrees/`
   - Execute asynchronously to avoid blocking

3. **Caching Layer**:
   - Pre-build worktree cache using `git worktree list`
   - Use `Set` data structure for O(1) lookups
   - Update cache asynchronously during startup

### Integration Points

**Project Scanner Enhancement**:
```typescript
// In scanDirectoryForProjects method
if (this.isGitWorktree(dirPath)) {
  console.log(`Skipping git worktree: ${dirPath}`)
  // Skip this directory
}
```

**Non-blocking Initialization**:
```typescript
// Use setImmediate to avoid blocking startup
setImmediate(() => {
  // Build worktree cache asynchronously
  this.buildWorktreeCache()
})
```

### Error Handling

- Add timeouts (2 seconds) to all git commands
- Suppress stderr output to prevent console spam
- Gracefully handle non-git directories and permission errors
- Use pattern-based detection as fallback when git commands fail

\n\n### Comprehensive Directory Scanning\n\n**Apply Worktree Detection to All Directories**:\n\nThe worktree detection logic should be applied to all directory scanning operations, not just those looking for `.mdt-config.toml` files. This ensures:\n\n```typescript\n// In scanDirectoryForProjects method - apply to ALL directories\nfor (const entry of entries) {\n    if (entry.isDirectory() && !entry.name.startsWith('.')) {\n        const subDirPath = path.join(dirPath, entry.name);\n        \n        // Apply worktree exclusion to ALL subdirectories\n        if (this.isGitWorktree(subDirPath)) {\n            console.log(`Skipping git worktree subdirectory: ${subDirPath}`);\n            continue;\n        }\n        \n        // Then continue with normal project detection logic\n        // (checking for .mdt-config.toml, etc.)\n        this.scanDirectoryForProjects(subDirPath, discovered, maxDepth - 1);\n    }\n}\n```\n\n**Handle Projects Without Configuration Files**:\n\n- The worktree exclusion should run before any configuration file checks\n- This prevents scanning worktree directories regardless of their contents\n- Ensures comprehensive coverage of the filesystem during project discovery\n- Maintains performance by avoiding unnecessary git operations in worktrees
## 5. Acceptance Criteria
**Functional Requirements:**
- [ ] Git worktrees are automatically excluded from project discovery
- [ ] Main repositories remain visible in project selector
- [ ] Separate clones and forks are still discovered normally
- [ ] Pattern-based detection provides immediate exclusion
- [ ] Git-based verification confirms pattern-based results
- [ ] No blocking behavior during application startup
- [ ] No infinite loops or hanging processes
- [ ] Error messages from git commands are suppressed

**Performance Requirements:**
- [ ] Project discovery completes within 2 seconds
- [ ] Worktree detection adds minimal overhead (< 100ms)
- [ ] No git commands block the main thread
- [ ] Cache reduces redundant git command execution

**User Experience Requirements:**
- [ ] Project selector shows only distinct projects
- [ ] Worktree directories do not appear as separate projects
- [ ] Console logs indicate when worktrees are skipped
- [ ] No duplicate project entries in the selector

**Edge Cases:**
- [ ] Handles directories that are not git repositories
- [ ] Works with git worktrees in different parent directories
- [ ] Handles malformed git repositories gracefully
- [ ] Supports various worktree naming conventions
- [ ] Works with both relative and absolute git paths

**Comprehensive Directory Coverage Requirements:**
- [ ] Worktree detection applies to ALL scanned directories, not just those with .mdt-config.toml
- [ ] Worktree exclusion runs before any configuration file checks
- [ ] Directories without .mdt-config.toml are still evaluated for worktree status
- [ ] File system scanning excludes worktrees regardless of their configuration status
- [ ] Projects without configuration files can still be discovered (if they meet other criteria)
- [ ] Worktree detection works during general directory traversal and auto-discovery
- [ ] No assumption that all valid projects must have .mdt-config.toml files
