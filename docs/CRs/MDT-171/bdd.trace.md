# BDD

## Scenarios By Requirement Family

### BR-1

- Active star removes a fav (`active_star_removes_fav`)
  Covers: `BR-1.6`, `BR-1.4`
  Given: Given I am viewing Documents with a single document fav visible in Favs
  When: When I select the active star for that fav
  Then: Then the fav is removed from persisted favs and the Favs section is hidden
- Empty Favs section is hidden (`empty_favs_section_is_hidden`)
  Covers: `BR-1.4`
  Given: Given I am viewing Documents for a project with no reconciled favs
  When: When the document tree finishes loading
  Then: Then the Favs section is not shown and Recent and All Documents remain visible
- Folder fav appears with active stars (`folder_fav_appears_active`)
  Covers: `BR-1.1`, `BR-1.3`, `BR-1.5`
  Given: Given I am viewing Documents with an eligible folder that is not yet a fav
  When: When I select the folder row star
  Then: Then the folder appears in a compact Favs section above Recent and both the folder row and fav row show active star state
- Markdown document fav appears with active stars (`markdown_fav_appears_active`)
  Covers: `BR-1.2`, `BR-1.3`, `BR-1.5`
  Given: Given I am viewing Documents with an eligible markdown document that is not yet a fav
  When: When I select the document row star
  Then: Then the document appears in a compact Favs section above Recent and both the document row and fav row show active star state

### BR-2

- Document fav opens the markdown document (`document_fav_opens_document`)
  Covers: `BR-2.1`
  Given: Given I am viewing Documents with a markdown document fav visible in Favs
  When: When I select the document fav row
  Then: Then that markdown document opens and the matching document tree row is selected
- Folder fav expands and locates the folder (`folder_fav_locates_folder`)
  Covers: `BR-2.2`
  Given: Given I am viewing Documents with a nested folder fav visible in Favs and its ancestors collapsed
  When: When I select the folder fav row
  Then: Then the folder ancestors expand and the matching folder row is located in the tree
- Reload restores reconciled favs for the project (`reload_restores_reconciled_favs`)
  Covers: `BR-2.3`, `BR-3.1`
  Given: Given I have saved folder and markdown document favs for the current project
  When: When I reload Documents View for the same project
  Then: Then reconciled favs are restored and eligible tree nodes expose favorite state and favorited timestamps without changing non-favorite rows

### BR-3

- Ordered fav write preserves existing navigation behavior (`ordered_write_preserves_existing_navigation`)
  Covers: `BR-3.2`, `BR-3.3`
  Given: Given Documents View has existing Recent entries and All Documents selection behavior
  When: When the fav list is saved in a new order for the resolved project
  Then: Then the complete ordered fav list is saved for that project and existing Recent and All Documents navigation behavior is unchanged
- Reload restores reconciled favs for the project (`reload_restores_reconciled_favs`)
  Covers: `BR-2.3`, `BR-3.1`
  Given: Given I have saved folder and markdown document favs for the current project
  When: When I reload Documents View for the same project
  Then: Then reconciled favs are restored and eligible tree nodes expose favorite state and favorited timestamps without changing non-favorite rows

## Coverage Summary

| Requirement ID | Scenario Count | Scenario IDs |
|---|---:|---|
| `BR-1.1` | 1 | `folder_fav_appears_active` |
| `BR-1.2` | 1 | `markdown_fav_appears_active` |
| `BR-1.3` | 2 | `folder_fav_appears_active`, `markdown_fav_appears_active` |
| `BR-1.4` | 2 | `active_star_removes_fav`, `empty_favs_section_is_hidden` |
| `BR-1.5` | 2 | `folder_fav_appears_active`, `markdown_fav_appears_active` |
| `BR-1.6` | 1 | `active_star_removes_fav` |
| `BR-2.1` | 1 | `document_fav_opens_document` |
| `BR-2.2` | 1 | `folder_fav_locates_folder` |
| `BR-2.3` | 1 | `reload_restores_reconciled_favs` |
| `BR-3.1` | 1 | `reload_restores_reconciled_favs` |
| `BR-3.2` | 1 | `ordered_write_preserves_existing_navigation` |
| `BR-3.3` | 1 | `ordered_write_preserves_existing_navigation` |
