import chalk from "chalk"
import { getHistoryEntries } from "../history.ts"
import { err, ok } from "../utils/result.ts"
import type { Command } from "./index.ts"

export const history: Command = {
	name: "history",
	description: "Show sync history",
	options: [
		{
			name: "limit",
			short: "l",
			type: "string",
			description: "Limit number of entries",
			default: "10",
		},
	],
	execute: async (args) => {
		const projectName = args.positionals[0]
		const limit = Number.parseInt((args.values.limit as string) || "10")

		const entriesResult = await getHistoryEntries(projectName, limit)

		if (!entriesResult.ok) {
			return err(entriesResult.error)
		}

		const entries = entriesResult.value

		if (entries.length === 0) {
			console.log(chalk.yellow("No history entries found"))
			return ok(undefined)
		}

		console.log(chalk.bold("Sync History:"))
		for (const entry of entries) {
			const time = entry.timestamp.toLocaleString()
			const status = entry.success ? chalk.green("✓") : chalk.red("✗")
			console.log(`\n${status} ${time} - ${entry.action}`)
			if (entry.project) console.log(`  Project: ${entry.project}`)
			if (entry.filesCount !== undefined) console.log(`  Files: ${entry.filesCount}`)
			if (entry.details) console.log(`  Details: ${entry.details}`)
		}

		return ok(undefined)
	},
}
