# ccsync

A command-line tool for managing and synchronizing claude.md files across multiple projects.

## Overview

ccsync helps developers collect claude.md documentation files from various projects into a centralized location. It preserves the original directory structure while providing automated synchronization and history tracking.

## Installation

```bash
bun install -g ccsync
```

## Quick Start

```bash
# Initialize ccsync with a destination directory
ccsync init --destination ~/claude-docs

# Add a project to track
ccsync add-project --name my-app --source ~/projects/my-app

# Sync files from a specific project
ccsync sync my-app

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
Add a project to track claude.md files.

```bash
ccsync add-project --name <name> --source <path> [options]
```

Options:
- `--destination <path>`: Custom destination for this project
- `--auto-sync`: Enable automatic synchronization
- `--include-git-ignored`: Include files ignored by git

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

1. ccsync scans specified project directories for claude.md files
2. Found files are copied to the destination directory, preserving their relative paths
3. The tool respects .gitignore rules by default
4. Each sync operation is recorded in the history for tracking

### File Structure

Synchronized files are organized as:
```
<destination>/<project-name>/<original-path>/claude.md
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type checking
bun typecheck

# Linting
bun lint

# Format code
bun format
```

## License

MIT