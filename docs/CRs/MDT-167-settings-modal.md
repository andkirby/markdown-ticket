---
code: MDT-167
status: Implemented
dateCreated: 2026-05-16T18:27:55.223Z
type: Feature Enhancement
priority: Medium
---

# Add dedicated Settings modal with tabs

## 1. Description

### Problem Statement
User preferences are scattered: theme lives in the hamburger menu, auto-linking is stored in localStorage with no UI, event history toggle is buried, and there's no centralized place to configure app behavior.

### Current State
- Theme: hamburger menu quick-access buttons only
- Auto-linking: `enableAutoLinking` in localStorage, no UI toggle
- Event History: hamburger menu toggle
- Clear Cache: hamburger menu button
- Default view, card density: not configurable at all

### Desired State
A dedicated Settings modal with three tabs (Appearance, Board, Advanced) that surfaces all user preferences in one place. All settings are client-side only (localStorage/cookies) — no API calls.

### Rationale
Centralizing settings reduces hamburger menu clutter, surfaces hidden preferences, and gives users control over board behavior (density, default view).

### Impact Areas
- `src/components/SettingsModal.tsx` — new component
- `src/components/ui/switch.tsx` — new Switch component
- `src/components/HamburgerMenu.tsx` — add Settings entry point, keep theme quick-access
- `src/components/SecondaryHeader.tsx` — thread `onOpenSettings` prop
- `src/App.tsx` — state and render SettingsModal
- `src/index.css` — settings-specific CSS classes

## 2. Solution Analysis

### Chosen Approach
Three-tab modal using Radix Tabs (already installed). All settings write immediately to localStorage/cookies — no Save button needed. Theme quick-access stays in hamburger menu for fast switching.

## 3. Implementation Specification

### Tabs and Settings

**Appearance**
| Setting | Storage | Control | Default |
|---------|---------|---------|---------|
| Theme | cookie `theme` | ButtonGroup (Light/Dark/System) | `system` |
| Default View | localStorage `mdt-settings-default-view` | Select (Board/List) | `board` |

**Board**
| Setting | Storage | Control | Default |
|---------|---------|---------|---------|
| Card Density | localStorage `mdt-settings-card-density` | Select (Comfortable/Compact) | `comfortable` |
| Smart Links | localStorage `markdown-ticket-link-config.enableAutoLinking` | Switch toggle | `true` |

**Advanced**
| Setting | Storage | Control | Default |
|---------|---------|---------|---------|
| Event History | localStorage `markdown-ticket-event-history-force-hidden` | Switch toggle | shown |
| Clear Cache | action only | Button "Clear Cache" | n/a |

### Exported Helpers
- `getDefaultView()` — reads `mdt-settings-default-view`, used by App.tsx on initial load
- `getCardDensity()` — reads `mdt-settings-card-density`, used by TicketCard for spacing

### Entry Point
⚙ Settings button in hamburger menu. Theme quick-access buttons remain in hamburger menu.

### Design Spec
`docs/design/specs/settings.md`
`docs/design/mockups/settings.md`

## 4. Acceptance Criteria
- [ ] Settings modal opens from hamburger menu via ⚙ Settings button
- [ ] Three tabs: Appearance, Board, Advanced
- [ ] Theme toggle works (writes cookie, applies immediately)
- [ ] Default View select persists to localStorage
- [ ] Card Density select persists to localStorage
- [ ] Smart Links toggle reads/writes existing `markdown-ticket-link-config`
- [ ] Event History toggle shows/hides SSE panel
- [ ] Clear Cache button calls `nuclearCacheClear()`
- [ ] Theme quick-access remains in hamburger menu
- [ ] Modal follows MODALS.md Pattern A (ModalHeader + ModalBody)
- [ ] All settings are client-side only — no API calls

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
- Design spec: `docs/design/specs/settings.md`
- Wireframes: `docs/design/mockups/settings.md`
- Modal patterns: `src/MODALS.md`
- Theme hook: `src/hooks/useTheme.ts`
- Link config: `src/config/linkConfig.ts`
- Related: MDT-166 (modal standardization)
