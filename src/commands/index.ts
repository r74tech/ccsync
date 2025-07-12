import type { Result } from "../utils/result.ts";

export interface Command {
	name: string;
	description: string;
	options?: CommandOption[];
	execute: (args: CommandArgs) => Promise<Result<void, Error>>;
}

export interface CommandOption {
	name: string;
	short?: string;
	type: "string" | "boolean" | "number";
	description: string;
	required?: boolean;
	default?: string | boolean | number;
}

export interface CommandArgs {
	values: Record<string, unknown>;
	positionals: string[];
}

export function index(): void {
	// This file exports the command interface
}
