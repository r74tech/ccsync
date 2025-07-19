import { join } from "node:path"
import chalk from "chalk"
import { getClaudeProjectsPath, loadConfig } from "../config.ts"
import { addHistoryEntry } from "../history.ts"
import { scanClaudeProjects } from "../scanner.ts"
import { syncClaudeProjects } from "../sync.ts"
import { err, ok } from "../utils/result.ts"
import type { Command } from "./index.ts"

export const backupGlobal: Command = {
	name: "backup-global",
	description: "Backup global Claude configuration (~/.claude/projects/)",
	options: [
		{
			name: "destination",
			short: "d",
			type: "string",
			description: "Custom destination path (default: sync destination)",
		},
		{
			name: "versioning",
			type: "string",
			description: "Versioning strategy: none, timestamp, incremental (default: timestamp)",
		},
		{
			name: "keep-versions",
			type: "string",
			description: "Number of versions to keep (default: 10)",
		},
		{
			name: "dry-run",
			type: "boolean",
			description: "Show what would be backed up without actually doing it",
		},
	],
	execute: async (args) => {
		const configResult = await loadConfig()
		if (!configResult.ok) {
			return err(configResult.error)
		}

		const config = configResult.value
		const destination =
			(args.values.destination as string) || join(config.syncDestination, "global-claude-backup")

		const versioning = (args.values.versioning as string) || "timestamp"
		if (!["none", "timestamp", "incremental"].includes(versioning)) {
			return err(new Error("Invalid versioning strategy. Use: none, timestamp, or incremental"))
		}

		const keepVersions = args.values["keep-versions"]
			? parseInt(args.values["keep-versions"] as string)
			: 10

		if (Number.isNaN(keepVersions) || keepVersions < 0) {
			return err(new Error("keep-versions must be a non-negative number"))
		}

		const dryRun = (args.values["dry-run"] as boolean) || false

		// Scan for files
		const filesResult = await scanClaudeProjects()
		if (!filesResult.ok) {
			return err(filesResult.error)
		}

		const files = filesResult.value
		console.log(chalk.cyan(`Found ${files.length} files in ~/.claude/projects/`))

		if (dryRun) {
			console.log(chalk.yellow("\nDry run - files that would be backed up:"))
			const projectsPath = getClaudeProjectsPath()
			files.forEach((file) => {
				const relativePath = file.replace(projectsPath, "~/.claude/projects")
				console.log(`  ${relativePath}`)
			})
			console.log(chalk.gray(`\nDestination: ${destination}`))
			console.log(chalk.gray(`Versioning: ${versioning}`))
			if (versioning !== "none") {
				console.log(chalk.gray(`Keep versions: ${keepVersions}`))
			}
			return ok(undefined)
		}

		console.log(chalk.blue("\nBacking up global Claude configuration..."))

		const syncResult = await syncClaudeProjects(
			"global",
			destination,
			versioning as "none" | "timestamp" | "incremental",
			keepVersions,
		)

		if (!syncResult.ok) {
			return err(syncResult.error)
		}

		// Record in history
		const historyResult = await addHistoryEntry({
			timestamp: new Date(),
			action: "backup-global",
			project: "global",
			success: true,
			filesSync: syncResult.value,
		})

		if (!historyResult.ok) {
			console.error(chalk.yellow("Warning: Failed to save history"))
		}

		console.log(chalk.green(`✓ Successfully backed up ${syncResult.value} files`))
		console.log(chalk.gray(`Destination: ${destination}`))

		return ok(undefined)
	},
}
