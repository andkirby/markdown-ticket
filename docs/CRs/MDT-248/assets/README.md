# MDT-248 temporary review assets

Images in this directory are optional local pre-development aids, excluded from Git. Keep them while useful for design/implementation review, then delete them after implementation and UAT are complete. They are not needed for project history or a fresh checkout.

The canonical surface specs and embedded Wireloom mockups are the durable, self-contained design record. The reported history defect is described in uat.md.

Local image warnings:
- The picker sample contains an obsolete Documents trigger, ellipsis menu and toolbar order.
- Header samples use illustrative metadata counts.
- The user screenshot is defect evidence, not a target design.

Do not implement obsolete image controls. Follow docs/design/surfaces/ticket-viewer.spec.md, ticket-side-doc.spec.md and their interaction contracts.
