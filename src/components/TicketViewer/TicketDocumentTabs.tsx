/**
 * TicketDocumentTabs - MDT-093.
 *
 * Renders one radix Tabs row per active folder level.
 * Hidden when no sub-documents exist (BR-1.5).
 * Folders reveal children in the next row (BR-2.1–BR-2.5).
 * Navigation remains sticky during scroll (BR-3.3, BR-3.4, C9).
 *
 * Sole consumer of useTicketDocumentNavigation (OBL-navigation-transition-authority).
 */

import * as Tabs from "@radix-ui/react-tabs";
import type { SubDocument } from "@mdt/shared/models/SubDocument";
import { filePathToApiPath } from "../../utils/subdocPathValidation";

interface TicketDocumentTabsProps {
  subdocuments: SubDocument[];
  selectedPath: string;
  folderStack: string[];
  onSelect: (path: string) => void;
  pendingPath?: string | null;
  ticketCode: string; // Required for converting filePath to apiPath
}

/**
 * Split a path into segments, respecting physical (/) vs virtual (.) notation.
 * Physical paths like 'bdd/another.trace' → ['bdd', 'another.trace'] (dot preserved)
 * Virtual paths like 'bdd.trace' → ['bdd', 'trace'] (dot is separator)
 */
function splitPathSegments(selectedPath: string): string[] {
  if (selectedPath === "main") {
    return ["main"];
  }

  // Check if this is a physical path (contains /)
  if (selectedPath.includes("/")) {
    // Physical path: split only by /, preserve dots in filenames
    return selectedPath.split("/");
  }

  // Virtual path: split by .
  return selectedPath.split(".");
}

/**
 * Build tab rows from current folderStack and subdocuments tree.
 * Returns array of { entries, activeValue } for each row.
 */
function buildTabRows(
  subdocuments: SubDocument[],
  selectedPath: string,
  folderStack: string[],
  ticketCode: string,
): Array<{ entries: SubDocument[]; activeValue: string }> {
  const rows: Array<{ entries: SubDocument[]; activeValue: string }> = [];

  // Top-level row: always include 'main' tab first, then backend subdocuments
  const topLevel: SubDocument[] = [
    { name: "main", kind: "file", children: [] },
    ...subdocuments,
  ];

  // Determine which top-level entry is "active" (first segment of path, or 'main')
  // MDT-138: Use smart splitting that respects physical (/) vs virtual (.) notation
  const pathSegments = splitPathSegments(selectedPath);
  const topActive = pathSegments[0];

  rows.push({ entries: topLevel, activeValue: topActive });

  // For each folder in the stack, add a row for its children
  let currentDocs = subdocuments;
  for (let i = 0; i < folderStack.length; i++) {
    const folderName = folderStack[i];
    const folder = currentDocs.find(
      (d) => d.name === folderName && d.kind === "folder",
    );
    if (!folder || folder.children.length === 0) break;

    // Determine active child in this row
    // Path segments use normalized names (no prefix)
    const pathSegment = pathSegments[i + 1] ?? "";

    // Find matching child using filePath as the source of truth
    // Convert child's filePath to apiPath and match with pathSegment
    let activeInRow = folder.children.find((c) => {
      if (!c.filePath) return false;
      // Convert filePath to apiPath (e.g., "MDT-138/bdd/another.trace.md" → "bdd/another.trace")
      const apiPath = filePathToApiPath(c.filePath, ticketCode);
      // Get the last segment of the apiPath
      const lastSegment = apiPath.includes('/') ? apiPath.split('/').pop()! : apiPath.split('.').pop()!;
      return lastSegment === pathSegment;
    })?.name;

    // Default to first child if no match found
    if (!activeInRow && folder.children.length > 0) {
      activeInRow = folder.children[0].name;
    }

    rows.push({ entries: folder.children, activeValue: activeInRow ?? "" });
    currentDocs = folder.children;
  }

  return rows;
}

export function TicketDocumentTabs({
  subdocuments,
  selectedPath,
  folderStack,
  onSelect,
  ticketCode,
}: TicketDocumentTabsProps) {
  // Hidden when no sub-documents exist (BR-1.5)
  if (subdocuments.length === 0) {
    return null;
  }

  const rows = buildTabRows(subdocuments, selectedPath, folderStack, ticketCode);

  return (
    /* @testid subdoc-tabs — container for tab rows; only rendered when subdocuments exist */
    <div
      data-testid="subdoc-tabs"
      className="ticket-document-tabs sticky top-0 z-10 bg-background border-b"
    >
      {rows.map((row, rowIdx) => (
        <Tabs.Root
          key={rowIdx}
          value={row.activeValue}
          onValueChange={(value) => {
            // Guard: Skip if this is a redundant event (Radix fires on re-render)
            // This prevents stale closures from overwriting navigation
            if (value === row.activeValue) {
              return;
            }

            // Find the entry by name
            const entry = row.entries.find((e) => e.name === value);
            if (!entry?.filePath) {
              // Main tab has no filePath, handle specially
              if (value === "main") {
                onSelect("main");
              }
              return;
            }

            // Use filePath as the source of truth for navigation
            // Convert filePath to apiPath for state/URL (e.g., "MDT-138/bdd/another.trace.md" → "bdd/another.trace")
            const apiPath = filePathToApiPath(entry.filePath, ticketCode);

            // For folders, auto-navigate to first child so content loads
            if (entry.kind === "folder" && entry.children.length > 0) {
              const firstChild = entry.children[0];
              if (firstChild.filePath) {
                // Use first child's filePath for navigation
                const firstApiPath = filePathToApiPath(firstChild.filePath, ticketCode);
                onSelect(firstApiPath);
              }
            } else {
              // For files, use the apiPath directly
              onSelect(apiPath);
            }
          }}
        >
          {/* @testid subdoc-tab-row — a single tab row (primary or nested) */}
          <Tabs.List
            data-testid="subdoc-tab-row"
            className="flex overflow-x-auto scrollbar-hide border-b px-2"
          >
            {row.entries.map((entry) => {
              return (
                /* @testid subdoc-tab-{name} — individual tab trigger */
                <Tabs.Trigger
                  key={entry.name}
                  value={entry.name}
                  data-testid={`subdoc-tab-${entry.name}`}
                  data-filepath={entry.filePath || undefined} // Store filePath as source of truth
                  className="px-3 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:border-b-2 data-[state=active]:border-primary relative"
                >
                  {entry.name === "main" ? "Main" : entry.name}
                  {entry.kind === "folder" ? " ▶" : ""}
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>
        </Tabs.Root>
      ))}
    </div>
  );
}
