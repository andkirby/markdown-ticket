# Configuration Templates

This directory contains template files used by the `init-config.sh` script to set up markdown-ticket configurations.

## Files

- **`global-config.toml`** - Template for the global configuration file
- **`templates/`** - Directory containing CR template files (*.md) and template metadata (templates.json)

## How Templates Are Used

The `init-config.sh` script automatically finds and uses these templates:

### Template Search Order

The script searches for templates in the following order:
1. `/app/config-templates/` (Docker container location)
2. `config-templates/` (Local project location)
3. `./config-templates/` (Current directory)

### Interactive Mode (Default)

When running `./scripts/init-config.sh` without parameters:
- Uses `global-config.toml` as the base configuration
- Prompts user to customize search paths for their local environment
- Copies all files from `templates/` directory to user's config

### Auto Mode (Docker)

When running `./scripts/init-config.sh --auto`:
- Uses `global-config.toml` directly without modification
- Copies all files from `templates/` directory to container's config

## Error Handling

If no template is found in any of the search locations, the script will:
- Display clear error message with expected template locations
- Exit with error code 1 (fail fast)
- Require manual intervention to fix the template location

This ensures **no degraded fallback configurations** are created.

## Benefits

✅ **Consistent Configuration**: All setups use the same base template
✅ **Flexible Deployment**: Works in both localhost and Docker environments
✅ **Easy Maintenance**: Update templates in one place, affects all new installations
✅ **No Hardcoded Content**: Script logic is completely separate from configuration content
✅ **Fail Fast**: Script fails clearly if templates are missing, preventing bad configurations