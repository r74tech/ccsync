import { globby } from "globby";
import { stat } from "node:fs/promises";
import { type Result, err, fromAsyncThrowable } from "./utils/result.ts";

export interface ScanOptions {
	includeGitIgnored?: boolean;
}

export async function scanClaudeFiles(
	rootPath: string,
	options: ScanOptions = {},
): Promise<Result<string[], Error>> {
	const statsResult = await fromAsyncThrowable(async () => {
		const stats = await stat(rootPath);
		if (!stats.isDirectory()) {
			throw new Error(`Path is not a directory: ${rootPath}`);
		}
		return stats;
	});

	if (!statsResult.ok) {
		const error = statsResult.error;
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return err(new Error(`Directory does not exist: ${rootPath}`));
		}
		return err(error);
	}

	const pattern = "**/{claude,CLAUDE}.md";
	const globbyOptions = {
		cwd: rootPath,
		absolute: true,
		gitignore: !options.includeGitIgnored,
		ignore: [
			"**/node_modules/**",
			"**/.git/**",
			"**/dist/**",
			"**/build/**",
			"**/coverage/**",
			"**/.next/**",
			"**/.cache/**",
		],
	};

	return fromAsyncThrowable(async () => {
		const files = await globby(pattern, globbyOptions);
		return files.sort();
	});
}
