#!/usr/bin/env bun
import { parseArgs } from "node:util"
import chalk from "chalk"
import { commands } from "./commands/commands.ts"
import { help } from "./commands/help.ts"

export function buildParseOptions(command?: string): Parameters<typeof parseArgs>[0] {
	const baseOptions: Parameters<typeof parseArgs>[0] = {
		allowPositionals: true,
		strict: false,
		options: {
			help: {
				type: "boolean",
				short: "h",
			},
			version: {
				type: "boolean",
				short: "v",
			},
		},
	}

	// Add command-specific options
	if (command && commands.has(command)) {
		const cmd = commands.get(command)
		if (cmd?.options && baseOptions.options) {
			for (const opt of cmd.options) {
				const optConfig: {
					type: "string" | "boolean"
					short?: string
					default?: string | boolean
				} = {
					type: opt.type as "string" | "boolean",
				}
				if (opt.short) {
					optConfig.short = opt.short
				}
				if (opt.default !== undefined) {
					optConfig.default = opt.default as string | boolean
				}
				baseOptions.options[opt.name] = optConfig
			}
		}
	}

	return baseOptions
}

// Export function matching filename
export async function cli(argv: string[] = process.argv): Promise<void> {
	const args = argv.slice(2)

	// First parse for global options
	const globalParseOptions = buildParseOptions()
	const globalParsed = parseArgs({
		args,
		...globalParseOptions,
	})

	const values = globalParsed.values as {
		help?: boolean
		version?: boolean
		[key: string]: unknown
	}

	// Handle help
	if (values.help || globalParsed.positionals.length === 0) {
		await help.execute({ values: {}, positionals: [] })
		process.exit(0)
	}

	// Handle version
	if (values.version) {
		const versionCmd = commands.get("version")
		if (versionCmd) {
			await versionCmd.execute({ values: {}, positionals: [] })
		}
		process.exit(0)
	}

	const commandName = globalParsed.positionals[0]
	if (!commandName) {
		await help.execute({ values: {}, positionals: [] })
		process.exit(0)
	}

	// Check if command exists
	if (!commands.has(commandName)) {
		console.error(chalk.red(`Unknown command: ${commandName}`))
		await help.execute({ values: {}, positionals: [] })
		process.exit(1)
	}

	// Parse command-specific arguments
	let cmdValues: Record<string, unknown> = {}
	let positionals: string[] = []

	try {
		const parseOptions = buildParseOptions(commandName)
		const parsed = parseArgs({
			args: args.slice(1),
			...parseOptions,
		})

		cmdValues = parsed.values
		positionals = parsed.positionals
	} catch (error) {
		console.error(chalk.red("Error parsing arguments:"), error)
		await help.execute({ values: {}, positionals: [] })
		process.exit(1)
	}

	// Execute command
	const command = commands.get(commandName)
	if (!command) {
		console.error(chalk.red(`Command not found: ${commandName}`))
		process.exit(1)
	}

	const result = await command.execute({ values: cmdValues, positionals })

	if (!result.ok) {
		console.error(chalk.red(`Failed to execute ${commandName}:`), result.error)
		process.exit(1)
	}
}
