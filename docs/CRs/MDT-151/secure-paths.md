# System Path Blocklist for Project Configuration

## Context

MDT-151 hardens path resolution for public deployment. BR-2 accepts absolute `ticketsPath` values (e.g., `/var/mdt/tickets`) because the admin explicitly chose them. However, accepting **any** absolute path — including `/etc`, `/usr`, `C:\Windows` — creates risk even in the admin trust model.

This document defines a system path blocklist that rejects known system-managed root directories as both project roots and tickets paths.

## Goal

Prevent selecting **system-managed root directories** as a project root or tickets path, while allowing normal subdirectories inside them.

## Rules

1. Normalize the path before validation:
   - Convert to absolute path
   - Resolve `.` and `..`
   - Resolve symlinks / junctions to canonical path (`realpathSync`)
   - Normalize separators
   - Apply case-insensitive comparison on Windows

2. Block if the path is **exactly equal** to a protected root directory.

3. Allow if the path is a **subdirectory** under a protected root.

## Examples

- ❌ `/usr/local` → block (exact match)
- ✅ `/usr/local/my-project` → allow (subdirectory)
- ❌ `/usr` → block (exact match)
- ✅ `/usr/src/my-project` → allow (subdirectory)
- ❌ `/etc` → block (exact match)
- ✅ `/opt/mdt/tickets` → allow (subdirectory)
- ❌ `C:\Windows` → block
- ✅ `C:\Windows\Temp\MyProject` → allow only if explicitly permitted by product policy

## Protected Roots (exact match only)

### Linux

`/`, `/bin`, `/boot`, `/dev`, `/etc`, `/home`, `/lib`, `/lib64`, `/media`, `/mnt`, `/opt`, `/proc`, `/root`, `/run`, `/sbin`, `/srv`, `/sys`, `/tmp`, `/usr`, `/usr/local`, `/var`

### macOS

`/`, `/Applications`, `/Library`, `/System`, `/Users`, `/Volumes`, `/bin`, `/private`, `/sbin`, `/usr`, `/usr/local`

### Windows

Drive roots (`C:\`, `D:\`, etc.), `C:\Windows`, `C:\Program Files`, `C:\Program Files (x86)`, `C:\ProgramData`, `C:\Users`, `C:\System Volume Information`

## Validation Behavior

| Condition | Action |
|-----------|--------|
| `path == protected root` | Reject: "Choose a subfolder, not a system root directory." |
| `path` is below protected root | Allow |
| `path` is not near any protected root | Allow |

## Important

Do NOT use naive string matching. Compare canonical normalized paths only.
