import { exec } from "node:child_process"
import { promisify } from "node:util"
import chalk from "chalk"
import { loadConfig } from "../config.ts"
import { addHistoryEntry } from "../history.ts"
import { syncProject } from "../sync.ts"
import { err, ok } from "../utils/result.ts"
import type { Command } from "./index.ts"

const execAsync = promisify(exec)

export const sync: Command = {
	name: "sync",
	description: "Sync claude.md files for a project or all projects",
	execute: async (args) => {
		const projectName = args.positionals[0]
		const configResult = await loadConfig()

		if (!configResult.ok) {
			return err(configResult.error)
		}

		const config = configResult.value

		const projectsToSync = projectName
			? config.projects.filter((p) => p.name === projectName)
			: config.projects

		if (projectName && projectsToSync.length === 0) {
			return err(new Error(`Project '${projectName}' not found`))
		}

		for (const project of projectsToSync) {
			console.log(chalk.blue(`Syncing project: ${project.name}`))
			const result = await syncProject(project, config.syncDestination)

			const historyResult = await addHistoryEntry({
				timestamp: new Date(),
				action: "sync",
				project: project.name,
				filesCount: result.filesSync,
				success: result.success,
				details: result.errors.join(", "),
			})

			if (!historyResult.ok) {
				console.error(chalk.yellow("Warning: Failed to save history"))
			}

			if (result.success) {
				console.log(chalk.green(`✓ Synced ${result.filesSync} files`))
			} else {
				console.log(chalk.red("✗ Sync completed with errors:"))
				for (const err of result.errors) {
					console.log(chalk.red(`  - ${err}`))
				}
			}
		}

		if (config.hooks?.postSync) {
			console.log(chalk.gray("Running post-sync hook..."))
			try {
				await execAsync(config.hooks.postSync)
			} catch (error) {
				return err(
					new Error(
						`Post-sync hook failed: ${error instanceof Error ? error.message : String(error)}`,
					),
				)
			}
		}

		return ok(undefined)
	},
}
