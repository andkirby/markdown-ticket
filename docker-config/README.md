# Docker Configuration for Markdown Ticket

This directory contains Docker-only configuration that is completely independent of the host system configuration.

## 📁 Directory Structure

```
docker-config/
├── config.toml           # Main configuration with discovery settings
└── README.md             # This file
```

## 🔧 Configuration Files

### 1. config.toml
- Main dashboard and discovery configuration
- Follows the standard config.toml format
- Container-only settings (does not affect host)

### 2. Individual Project Files (mdt.toml, debug.toml)
- **mdt.toml**: Main MDT project (self-contained in `/app`)
- **debug.toml**: Debug project for testing scenarios
- Each project has its own TOML file
- Easy to enable/disable projects individually

## ⚠️ Important: Self-Contained Application

The main MDT application is **self-contained** within `/app`:
- **Main Project**: `/app` (all source code, docs, CRs)
- **Debug Projects**: `/projects/*` (for testing/debugging only)
- **No General Workspace**: The app does NOT need other projects

## 🗂️ Project Paths

All projects use container paths, not host paths:

```toml
[project.mdt]
name = "Markdown Ticket Board"
path = "/app"  # Current working directory in container

[project.debug]
name = "DEBUG project"
path = "/projects/debug-tasks"  # Mounted from ./debug-tasks
```

## 🐳 Docker Volume Mapping

In `docker-compose.dev.yml`:

```yaml
volumes:
  # Docker-only config (read-only)
  - ./docker-config:/root/.config/markdown-ticket:ro

  # Mount debug project (testing only)
  - ./debug-tasks:/projects/debug-tasks

  # Note: No general workspace mounting needed
  # Main app is self-contained in /app
```

## ➕ Adding Debug/Test Projects

For debugging or testing scenarios only:

1. Create the project directory in `./projects/yourproject/`
2. Add project definition to `projects/projects.toml`:

```toml
[project.yourproject]
name = "Your Project"
path = "/projects/yourproject"
configFile = ".mdt-config.toml"
active = true
description = "Your project description"
```

3. Update `docker-compose.dev.yml` to mount the new project:

```yaml
volumes:
  - ./projects/yourproject:/projects/yourproject
```

## 🔄 Configuration Options

### Individual Project Files (Current Approach) - RECOMMENDED
- ✅ Each project in separate file (mdt.toml, debug.toml)
- ✅ Easy to enable/disable projects individually
- ✅ Follows discovery system expectations
- ✅ Good for any number of projects
- ✅ Easy to manage with version control

## 📝 Example Project Files

### mdt.toml

```toml
[project]
name = "Markdown Ticket Board"
path = "/app"
configFile = ".mdt-config.toml"
active = true
description = "Main project running in Docker container"
```

### debug.toml

```toml
[project]
name = "DEBUG for markdown project"
path = "/projects/debug-tasks"
configFile = ".mdt-config.toml"
active = true
description = "Debug project for testing Docker configuration"
```

## 🚀 Best Practices

1. **Use container paths** (`/projects/...`) not host paths
2. **Keep config in docker-config/** directory
3. **Mount projects read-write** for development
4. **Mount config read-only** (`:ro`) to prevent accidental changes
5. **Use projects.toml** unless you have many projects

## 📝 Example Usage

```bash
# Add a new project
mkdir -p ./projects/my-project
cat > ./docker-config/projects/my-project.toml << 'EOF'
[project]
name = "My Project"
path = "/projects/my-project"
configFile = ".mdt-config.toml"
active = true
description = "My awesome project"
EOF

# Update docker-compose.dev.yml
echo "      - ./projects/my-project:/projects/my-project" >> docker-compose.dev.yml

# Restart containers
docker-compose down && docker-compose up -d
```