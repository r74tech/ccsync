import chalk from "chalk"
import { loadConfig } from "../config.ts"
import { scanClaudeFiles } from "../scanner.ts"
import { err, ok } from "../utils/result.ts"
import type { Command } from "./index.ts"

export const status: Command = {
	name: "status",
	description: "Show status of all projects",
	execute: async () => {
		const configResult = await loadConfig()

		if (!configResult.ok) {
			return err(configResult.error)
		}

		const config = configResult.value

		if (config.projects.length === 0) {
			console.log(chalk.yellow("No projects configured"))
			return ok(undefined)
		}

		console.log(chalk.bold("Projects:"))
		for (const project of config.projects) {
			console.log(`\n${chalk.cyan(project.name)}`)
			console.log(`  Source: ${project.source}`)
			console.log(`  Destination: ${project.destination || chalk.gray("(default)")}`)
			console.log(
				`  Auto-sync: ${project.autoSync ? chalk.green("enabled") : chalk.gray("disabled")}`,
			)
			console.log(`  Include git-ignored: ${project.includeGitIgnored ? "yes" : "no"}`)

			// Display backup types
			const backupTypes = project.backupTypes || { claudeMd: true }
			const enabledBackups = []
			if (backupTypes.claudeMd) enabledBackups.push("claude.md")
			if (backupTypes.claudeProjects) enabledBackups.push("~/.claude/projects")
			if (backupTypes.settingsLocal) enabledBackups.push("settings.local.json")
			console.log(`  Backup types: ${enabledBackups.join(", ") || chalk.gray("none")}`)

			// Display versioning settings
			const versioningStrategy = project.versioningStrategy || "none"
			console.log(`  Versioning: ${versioningStrategy}`)
			if (versioningStrategy !== "none") {
				console.log(`  Keep versions: ${project.keepVersions || 5}`)
			}

			const filesResult = await scanClaudeFiles(project.source, {
				includeGitIgnored: project.includeGitIgnored,
				backupTypes: backupTypes,
			})

			if (filesResult.ok) {
				console.log(`  Files found: ${chalk.green(filesResult.value.length.toString())}`)
			} else {
				console.log(`  Files found: ${chalk.red("error scanning")}`)
			}
		}

		console.log(`\nSync destination: ${config.syncDestination}`)
		console.log(`History retention: ${config.historyRetention} days`)

		return ok(undefined)
	},
}
