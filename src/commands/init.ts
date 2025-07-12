import { resolve } from "node:path";
import chalk from "chalk";
import { getConfigPath, initConfig as initConfigCore } from "../config.ts";
import { err, ok } from "../utils/result.ts";
import type { Command } from "./index.ts";

export const init: Command = {
	name: "init",
	description: "Initialize ccsync configuration",
	options: [
		{
			name: "destination",
			short: "d",
			type: "string",
			description: "Sync destination directory (required)",
			required: true,
		},
	],
	execute: async (args) => {
		const destination = args.values.destination as string | undefined;

		if (!destination) {
			return err(new Error("--destination is required for init command"));
		}

		const destPath = resolve(destination);
		const result = await initConfigCore(undefined, destPath);

		if (!result.ok) {
			return err(result.error);
		}

		console.log(chalk.green("✓ Configuration initialized successfully"));
		console.log(chalk.gray(`Config file: ${getConfigPath()}`));
		console.log(chalk.gray(`Sync destination: ${destPath}`));

		return ok(undefined);
	},
};
