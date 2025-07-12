import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import chalk from "chalk";
import type { Project } from "../config.ts";
import { getConfigPath, loadConfig, saveConfig } from "../config.ts";
import { addHistoryEntry } from "../history.ts";
import { err, ok, type Result } from "../utils/result.ts";
import type { Command } from "./index.ts";

export const addProject: Command = {
	name: "add-project",
	description: "Add a new project to sync",
	options: [
		{
			name: "name",
			short: "n",
			type: "string",
			description: "Project name (required)",
			required: true,
		},
		{
			name: "source",
			short: "s",
			type: "string",
			description: "Source directory path (required)",
			required: true,
		},
		{
			name: "destination",
			short: "d",
			type: "string",
			description: "Custom destination path",
		},
		{
			name: "auto-sync",
			type: "boolean",
			description: "Enable auto-sync for this project",
		},
		{
			name: "include-git-ignored",
			type: "boolean",
			description: "Include git-ignored files",
		},
	],
	execute: async (args) => {
		const name = args.values.name as string | undefined;
		const source = args.values.source as string | undefined;

		if (!name || !source) {
			return err(
				new Error("--name and --source are required for add-project command"),
			);
		}

		const configResult = await loadConfig();
		if (!configResult.ok) {
			return err(configResult.error);
		}

		const config = configResult.value;

		try {
			const sourcePath = resolve(source);
			const stats = await stat(sourcePath);
			if (!stats.isDirectory()) {
				throw new Error(`Source path is not a directory: ${sourcePath}`);
			}

			if (config.projects.find((p) => p.name === name)) {
				throw new Error(`Project '${name}' already exists`);
			}

			const project: Project = {
				name,
				source: sourcePath,
				destination: args.values.destination
					? resolve(args.values.destination as string)
					: undefined,
				autoSync: (args.values["auto-sync"] as boolean) || false,
				includeGitIgnored:
					(args.values["include-git-ignored"] as boolean) || false,
			};

			config.projects.push(project);
			const saveResult = await saveConfig(getConfigPath(), config);

			if (!saveResult.ok) {
				return err(saveResult.error);
			}

			const historyResult = await addHistoryEntry({
				timestamp: new Date(),
				action: "add-project",
				project: name,
				success: true,
			});

			if (!historyResult.ok) {
				console.error(chalk.yellow("Warning: Failed to save history"));
			}

			console.log(chalk.green(`✓ Project '${name}' added successfully`));
			return ok(undefined);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	},
};
