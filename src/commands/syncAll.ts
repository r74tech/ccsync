import { sync } from "./sync.ts";
import type { Command } from "./index.ts";

export const syncAll: Command = {
	name: "sync-all",
	description: "Sync all projects",
	execute: async (args) => {
		// sync-all is just sync without a project name
		return sync.execute(args);
	},
};
