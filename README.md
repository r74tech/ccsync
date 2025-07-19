# ccsync

A command-line tool for managing and synchronizing claude.md files and Claude configuration across multiple projects.

## Overview

ccsync helps developers collect claude.md documentation files and Claude-related configuration from various projects into a centralized location. It preserves the original directory structure while providing automated synchronization, version control, and history tracking.

## Installation

### Global Installation

```bash
bun install -g ccsync
```

### Local Development

If you're developing or testing ccsync locally:

```bash
# Clone the repository
git clone https://github.com/r74tech/ccsync.git
cd ccsync

# Install dependencies
bun install

# Link the CLI globally for testing
bun link

# Now you can use 'ccsync' command anywhere
ccsync --help

# To unlink when done
bun unlink ccsync
```

## Quick Start

```bash
# Initialize ccsync with a destination directory
ccsync init --destination ~/claude-docs

# Add a project to track (basic)
ccsync add-project --name my-app --source ~/projects/my-app

# Add a project with version control
ccsync add-project --name my-app --source ~/projects/my-app \
  --versioning timestamp --keep-versions 10

# Add a project that backs up all Claude-related files
ccsync add-project --name my-app --source ~/projects/my-app \
  --backup-claude-projects --backup-settings-local

# Sync files from a specific project
ccsync sync my-app

# Backup global Claude configuration
ccsync backup-global

# Sync all projects
ccsync sync-all
```

## Commands

### init
Initialize ccsync configuration with a destination directory.

```bash
ccsync init --destination <path>
```

### add-project
Add a project to track claude.md files and other Claude-related files.

```bash
ccsync add-project --name <name> --source <path> [options]
```

Options:
- `--destination <path>`: Custom destination for this project
- `--auto-sync`: Enable automatic synchronization
- `--include-git-ignored`: Include files ignored by git
- `--backup-claude-md`: Backup claude.md files (default: true)
- `--backup-claude-projects`: Backup ~/.claude/projects/ data
- `--backup-settings-local`: Backup .claude/settings.local.json files
- `--versioning <strategy>`: Versioning strategy: none, timestamp, incremental (default: none)
- `--keep-versions <number>`: Number of versions to keep (default: 5)

### sync
Synchronize claude.md files from a specific project.

```bash
ccsync sync <project-name>
```

### sync-all
Synchronize claude.md files from all configured projects.

```bash
ccsync sync-all
```

### backup-global
Backup global Claude configuration from ~/.claude/projects/.

```bash
ccsync backup-global [options]
```

Options:
- `--destination <path>`: Custom destination path (default: sync destination/global-claude-backup)
- `--versioning <strategy>`: Versioning strategy: none, timestamp, incremental (default: timestamp)
- `--keep-versions <number>`: Number of versions to keep (default: 10)
- `--dry-run`: Show what would be backed up without actually doing it

### status
Display current configuration and project status.

```bash
ccsync status
```

### history
View synchronization history.

```bash
ccsync history [options]
```

Options:
- `--project <name>`: Filter history by project
- `--limit <number>`: Limit number of entries (default: 20)

## Configuration

Configuration files are stored in `~/.config/ccsync/`:
- `settings.json`: Project configuration and global settings
- `history.json`: Synchronization history

### Environment Variables

- `CCSYNC_CONFIG_PATH`: Override default configuration path
- `CCSYNC_HISTORY_PATH`: Override default history path

## How It Works

1. ccsync scans specified project directories for:
   - claude.md files (documentation for AI assistants)
   - .claude/settings.local.json files (local Claude settings)
   - ~/.claude/projects/ (global Claude project data)
2. Found files are synchronized to the destination directory, preserving their relative paths
3. Optional version control creates timestamped or incremental backups
4. The tool respects .gitignore rules by default
5. Each sync operation is recorded in the history for tracking
6. Files are never deleted from the destination, only added or updated

### File Structure

Synchronized files are organized as:
```
<destination>/<project-name>/<original-path>/claude.md
```

## Development

### Setup

```bash
# Install dependencies
bun install

# Link for local development
bun link
```

### Commands

```bash
# Run the CLI during development
bun run dev

# Run tests
bun test

# Type checking
bun run typecheck

# Linting with oxlint
bun run lint

# Format code
bun run format

# Run Biome checks (includes import sorting and unused variable removal)
bun run biome

# Fix all issues with Biome
bun run fix

# Run all checks
bun run check
```

## License

MIT