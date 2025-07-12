import { copyFile, mkdir } from "node:fs/promises";
import { dirname, relative, join } from "node:path";
import { type Result, fromAsyncThrowable } from "./utils/result.ts";
import type { Project } from "./config.ts";
import { scanClaudeFiles } from "./scanner.ts";

export interface SyncResult {
	success: boolean;
	filesSync: number;
	errors: string[];
}

async function syncFile(
	source: string,
	destRoot: string,
	sourceRoot: string,
): Promise<Result<void, Error>> {
	const relativePath = relative(sourceRoot, source);
	const dest = join(destRoot, relativePath);

	return fromAsyncThrowable(async () => {
		await mkdir(dirname(dest), { recursive: true });
		await copyFile(source, dest);
	});
}

export async function syncProject(
	project: Project,
	defaultDestination: string,
): Promise<SyncResult> {
	const result: SyncResult = {
		success: true,
		filesSync: 0,
		errors: [],
	};

	const destination =
		project.destination || join(defaultDestination, project.name);
	const filesResult = await scanClaudeFiles(project.source, {
		includeGitIgnored: project.includeGitIgnored,
	});

	if (!filesResult.ok) {
		result.success = false;
		result.errors.push(filesResult.error.message);
		return result;
	}

	const files = filesResult.value;

	for (const file of files) {
		const syncResult = await syncFile(file, destination, project.source);

		if (syncResult.ok) {
			result.filesSync++;
		} else {
			result.success = false;
			result.errors.push(`Failed to sync ${file}: ${syncResult.error.message}`);
		}
	}

	return result;
}
