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

interface TicketDocumentTabsProps {
  subdocuments: SubDocument[];
  selectedPath: string;
  folderStack: string[];
  onSelect: (path: string) => void;
  pendingPath?: string | null;
}

/**
 * Build tab rows from current folderStack and subdocuments tree.
 * Returns array of { entries, activeValue } for each row.
 */
function buildTabRows(
  subdocuments: SubDocument[],
  selectedPath: string,
  folderStack: string[],
): Array<{ entries: SubDocument[]; activeValue: string }> {
  const rows: Array<{ entries: SubDocument[]; activeValue: string }> = [];

  // Top-level row: always include 'main' tab first, then backend subdocuments
  const topLevel: SubDocument[] = [
    { name: "main", kind: "file", children: [] },
    ...subdocuments,
  ];

  // Determine which top-level entry is "active" (first segment of path, or 'main')
  // MDT-138: Split by both slash and dot to handle both physical and virtual folders
  const pathSegments =
    selectedPath === "main" ? ["main"] : selectedPath.split(/[./]/);
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

    // Find matching child - handle both virtual (no prefix) and physical (/ prefix) children
    // Physical children have names like '/trace', virtual children have names like 'trace'
    let activeInRow = folder.children.find((c) => {
      // Normalize child name: strip leading / for physical children
      const normalized = c.name.startsWith("/") ? c.name.slice(1) : c.name;
      return normalized === pathSegment;
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
}: TicketDocumentTabsProps) {
  // Hidden when no sub-documents exist (BR-1.5)
  if (subdocuments.length === 0) {
    return null;
  }

  const rows = buildTabRows(subdocuments, selectedPath, folderStack);

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
            // Determine full path based on folder nesting
            // MDT-138: Use dot notation for virtual folders, slash notation for physical folders
            // Physical children have / prefix in their name to distinguish from virtual children
            const prefix = folderStack.slice(0, rowIdx);
            const entry = row.entries.find((e) => e.name === value);

            // Check if this is a physical child (name starts with /)
            const isPhysicalChild = value.startsWith("/");
            const childName = isPhysicalChild ? value.slice(1) : value;

            // Build path using appropriate separator
            let fullPath: string;
            if (prefix.length > 0) {
              if (isPhysicalChild) {
                // Physical child uses slash notation
                // e.g., 'bdd' folder + '/aaa' child = 'bdd/aaa'
                fullPath = [...prefix, childName].join("/");
              } else if (childName === "main") {
                // Special case: 'main' child in virtual folder represents root file
                // e.g., 'bdd' folder + 'main' child = 'bdd' (not 'bdd.main')
                fullPath = prefix.join(".");
              } else {
                // Virtual child uses dot notation
                // e.g., 'bdd' folder + 'trace' child = 'bdd.trace'
                fullPath = [...prefix, childName].join(".");
              }
            } else {
              fullPath = childName;
            }

            // For folders, auto-navigate to first child so content loads
            if (entry?.kind === "folder" && entry.children.length > 0) {
              const firstChild = entry.children[0];
              const firstIsPhysical = firstChild.name.startsWith("/");
              const firstName = firstIsPhysical
                ? firstChild.name.slice(1)
                : firstChild.name;

              if (firstName === "main") {
                // 'main' child always represents the root file (e.g., bdd.md)
                // Navigate to namespace only, regardless of isVirtual
                onSelect(fullPath);
              } else {
                const separator = entry.isVirtual === true ? "." : "/";
                onSelect(`${fullPath}${separator}${firstName}`);
              }
            } else {
              onSelect(fullPath);
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
