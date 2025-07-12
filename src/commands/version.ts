import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ok } from "../utils/result.ts";
import type { Command } from "./index.ts";

async function getPackageVersion(): Promise<string> {
	try {
		// Get the directory of this file
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);

		// Go up to the project root and read package.json
		const packagePath = join(__dirname, "..", "..", "package.json");
		const packageContent = await readFile(packagePath, "utf-8");
		const packageData = JSON.parse(packageContent);

		return packageData.version || "unknown";
	} catch {
		return "unknown";
	}
}

export const version: Command = {
	name: "version",
	description: "Show version information",
	execute: async () => {
		const version = await getPackageVersion();
		console.log(`ccsync version ${version}`);
		return ok(undefined);
	},
};
