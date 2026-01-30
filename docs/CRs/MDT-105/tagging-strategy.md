# Cache Tagging Strategy: MDT-105

**Source**: [MDT-105](../MDT-105-unify-and-make-cache-configurable-across-backend-s.md)
**Related**: [architecture.md](./architecture.md)

## Overview

Entity-centric tagging strategy for cache invalidation. Tags are organized around **domain entities** (tickets, projects, documents), not file system concepts.

## Core Principle

Every cached entry is tagged with:
1. **Entity instance** — `{entity}-{id}` (e.g., `ticket-MDT-001`)
2. **Entity aspect** — `{entity}-{id}-{aspect}` (e.g., `ticket-MDT-001-meta`)
3. **Collection** — `{entities}-list` (e.g., `tickets-list`)

## Tag Naming Convention

| Tag Type | Pattern | Example | Purpose |
|----------|---------|---------|---------|
| Entity instance | `{entity}-{id}` | `ticket-MDT-001` | All data for this entity |
| Entity aspect | `{entity}-{id}-{aspect}` | `ticket-MDT-001-meta` | Specific data type |
| Collection list | `{entities}-list` | `tickets-list` | The list/collection cache |
| Aspect type | `{entity}-{aspect}` | `ticket-meta` | All metadata across entities |

## Entities and Aspects

### Tickets

Tickets are extracted from `.md` files with YAML frontmatter.

| Aspect | What It Caches | Affects List View |
|--------|---------------|-------------------|
| `meta` | Frontmatter (status, priority, title, type) | Yes |
| `content` | Body markdown | No |
| `title` | Extracted title only | Yes |

**Tags for ticket metadata:**
```typescript
await cache.set({
  key: 'ticket:MDT-001:meta',
  value: frontmatter,
  tags: ['ticket-MDT-001', 'ticket-MDT-001-meta', 'ticket-meta', 'tickets-list']
})
```

**Tags for ticket content:**
```typescript
await cache.set({
  key: 'ticket:MDT-001:content',
  value: bodyMarkdown,
  tags: ['ticket-MDT-001', 'ticket-MDT-001-content', 'ticket-content']
  // Note: NO 'tickets-list' tag — content doesn't affect list
})
```

**Tags for tickets list:**
```typescript
await cache.set({
  key: 'tickets:all',
  value: ticketsList,
  tags: ['tickets-list']
})
```

### Projects

Projects are extracted from `.mdt-config.toml` files.

| Aspect | What It Caches | Affects List View |
|--------|---------------|-------------------|
| `config` | Project configuration | Yes |
| `meta` | Derived metadata | Yes |

**Tags for project:**
```typescript
await cache.set({
  key: 'project:MDT:config',
  value: projectConfig,
  tags: ['project-MDT', 'project-MDT-config', 'project-config', 'projects-list']
})
```

**Tags for projects list:**
```typescript
await cache.set({
  key: 'projects:all',
  value: projectsList,
  tags: ['projects-list']
})
```

### Documents

Documents are markdown files outside the CRs directory.

| Aspect | What It Caches | Affects List View |
|--------|---------------|-------------------|
| `meta` | File metadata | Yes |
| `content` | File content | No |
| `title` | Extracted title | Yes |

**Tags for document:**
```typescript
// Use path hash or sanitized path as ID
const docId = hashPath('/docs/guide.md')

await cache.set({
  key: `doc:${docId}:meta`,
  value: metadata,
  tags: [`doc-${docId}`, `doc-${docId}-meta`, 'doc-meta', 'docs-list']
})
```

## Invalidation Rules

### By Event Type

| Event | Source | Tags to Invalidate |
|-------|--------|-------------------|
| File created | File watcher `add` | `{entities}-list` |
| File deleted | File watcher `unlink` | `{entity}-{id}`, `{entities}-list` |
| File changed | File watcher `change` | Depends on what changed (see below) |

### Change Detection Logic

When a file changes, we need to determine **what** changed to invalidate correctly:

```typescript
async function onFileChange(filePath: string, entity: 'ticket' | 'project' | 'doc') {
  const entityId = extractId(filePath, entity)

  // Read new content
  const newContent = await readFile(filePath)
  const { frontmatter: newMeta, body: newBody } = parse(newContent)

  // Get cached versions
  const cachedMeta = await cache.get({ key: `${entity}:${entityId}:meta` })
  const cachedBody = await cache.get({ key: `${entity}:${entityId}:content` })

  const tagsToInvalidate: string[] = []

  // Always invalidate entity instance (conservative)
  tagsToInvalidate.push(`${entity}-${entityId}`)

  // Check what changed
  if (!deepEqual(newMeta, cachedMeta)) {
    // Frontmatter changed → affects list
    tagsToInvalidate.push(`${entity}-${entityId}-meta`)
    tagsToInvalidate.push(`${entity}s-list`)
  }

  if (newBody !== cachedBody) {
    // Body changed → doesn't affect list
    tagsToInvalidate.push(`${entity}-${entityId}-content`)
  }

  await cache.deleteByTag({ tags: tagsToInvalidate })
}
```

### Simplified Mode (No Change Detection)

If change detection is too complex, use conservative invalidation:

```typescript
async function onFileChange(filePath: string, entity: 'ticket' | 'project' | 'doc') {
  const entityId = extractId(filePath, entity)

  // Invalidate everything for this entity + list
  await cache.deleteByTag({
    tags: [`${entity}-${entityId}`, `${entity}s-list`]
  })
}
```

Trade-off: More cache misses, but simpler logic.

## Invalidation Matrix

### Tickets

| Event | `ticket-{key}` | `ticket-{key}-meta` | `ticket-{key}-content` | `tickets-list` |
|-------|:-------------:|:------------------:|:---------------------:|:--------------:|
| File created | - | - | - | X |
| File deleted | X | X | X | X |
| Status changed | X | X | - | X |
| Priority changed | X | X | - | X |
| Title changed | X | X | - | X |
| Body content changed | X | - | X | - |

### Projects

| Event | `project-{code}` | `project-{code}-config` | `projects-list` |
|-------|:----------------:|:-----------------------:|:---------------:|
| Config file created | - | - | X |
| Config file deleted | X | X | X |
| Config changed | X | X | X |

### Documents

| Event | `doc-{id}` | `doc-{id}-meta` | `doc-{id}-content` | `docs-list` |
|-------|:----------:|:---------------:|:------------------:|:-----------:|
| File created | - | - | - | X |
| File deleted | X | X | X | X |
| Frontmatter changed | X | X | - | X |
| Content changed | X | - | X | - |

## Edge Cases

### Ticket Moved Between Projects

If a ticket file is moved from Project A to Project B:
1. File watcher fires `unlink` for old path → invalidate `ticket-{key}`, `tickets-list`
2. File watcher fires `add` for new path → invalidate `tickets-list`

Result: Both projects' ticket lists refreshed.

### Bulk Operations

For bulk operations (e.g., "change status of 10 tickets"):
```typescript
// Option 1: Invalidate each + list once
const ticketIds = ['MDT-001', 'MDT-002', ...];
await cache.deleteByTag({
  tags: [...ticketIds.map(id => `ticket-${id}`), 'tickets-list']
});

// Option 2: Just invalidate the list (simpler, all tickets re-fetched)
await cache.deleteByTag({ tags: ['tickets-list'] });
```

### Project Config Affects Tickets

If project config change affects how tickets are displayed:
```typescript
// Invalidate project AND all its tickets
await cache.deleteByTag({
  tags: ['project-MDT', 'tickets-list']
})
```

## Tag Cardinality Guidelines

Per bentocache docs, avoid too many tags per entry:

| Entry Type | Recommended Tags | Max Tags |
|------------|-----------------|----------|
| Single entity aspect | 3-4 | 5 |
| Collection list | 1-2 | 3 |

Example (ticket metadata):
```typescript
tags: [
  'ticket-MDT-001', // 1. Entity instance
  'ticket-MDT-001-meta', // 2. Specific aspect
  'ticket-meta', // 3. All metadata (optional)
  'tickets-list' // 4. Collection
]
// 4 tags — acceptable
```

## Implementation Checklist

- [ ] Define `extractId()` function for each entity type
- [ ] Implement change detection for frontmatter vs body
- [ ] Create invalidation helper functions per entity
- [ ] Wire file watcher events to invalidation logic
- [ ] Add logging for cache invalidation (debugging)
- [ ] Consider "simplified mode" toggle for debugging

---
*Part of MDT-105 Cache Unification*
