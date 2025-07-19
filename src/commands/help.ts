import { ok } from "../utils/result.ts"
import { commands } from "./commands.ts"
import type { Command } from "./index.ts"

export const help: Command = {
	name: "help",
	description: "Show help information",
	execute: async () => {
		const lines = ["Usage: ccsync [command] [options]", "", "Commands:"]

		// Add all commands with descriptions
		for (const [name, command] of commands) {
			lines.push(`  ${name.padEnd(24)} ${command.description}`)
		}

		lines.push("", "Options:")
		lines.push("  -h, --help              Show help")
		lines.push("  -v, --version           Show version")
		lines.push("", "Command-specific options:")

		// Add command-specific options
		for (const [name, command] of commands) {
			if (command.options && command.options.length > 0) {
				lines.push(`  ${name}:`)
				for (const opt of command.options) {
					const flags = opt.short ? `-${opt.short}, --${opt.name}` : `--${opt.name}`
					const desc = opt.required ? `${opt.description} (required)` : opt.description
					lines.push(`    ${flags.padEnd(22)} ${desc}`)
				}
				lines.push("")
			}
		}

		lines.push("Examples:")
		lines.push("  ccsync init --destination ~/claude-sync")
		lines.push("  ccsync add-project --name myproject --source .")
		lines.push("  ccsync sync myproject")
		lines.push("  ccsync sync-all")
		lines.push("  ccsync status")
		lines.push("  ccsync history --limit 20")

		console.log(lines.join("\n"))
		return ok(undefined)
	},
}
