import chalk from "chalk";
import { loadConfig } from "../config.ts";
import { scanClaudeFiles } from "../scanner.ts";
import { err, ok } from "../utils/result.ts";
import type { Command } from "./index.ts";

export const status: Command = {
	name: "status",
	description: "Show status of all projects",
	execute: async () => {
		const configResult = await loadConfig();

		if (!configResult.ok) {
			return err(configResult.error);
		}

		const config = configResult.value;

		if (config.projects.length === 0) {
			console.log(chalk.yellow("No projects configured"));
			return ok(undefined);
		}

		console.log(chalk.bold("Projects:"));
		for (const project of config.projects) {
			console.log(`\n${chalk.cyan(project.name)}`);
			console.log(`  Source: ${project.source}`);
			console.log(
				`  Destination: ${project.destination || chalk.gray("(default)")}`,
			);
			console.log(
				`  Auto-sync: ${project.autoSync ? chalk.green("enabled") : chalk.gray("disabled")}`,
			);
			console.log(
				`  Include git-ignored: ${project.includeGitIgnored ? "yes" : "no"}`,
			);

			const filesResult = await scanClaudeFiles(project.source, {
				includeGitIgnored: project.includeGitIgnored,
			});

			if (filesResult.ok) {
				console.log(
					`  Claude.md files: ${chalk.green(filesResult.value.length.toString())}`,
				);
			} else {
				console.log(`  Claude.md files: ${chalk.red("error scanning")}`);
			}
		}

		console.log(`\nSync destination: ${config.syncDestination}`);
		console.log(`History retention: ${config.historyRetention} days`);

		return ok(undefined);
	},
};
