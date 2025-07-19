import { access, stat } from "node:fs/promises"
import { globby } from "globby"
import { type BackupTypes, getClaudeProjectsPath } from "./config.ts"
import { err, fromAsyncThrowable, type Result } from "./utils/result.ts"

export interface ScanOptions {
	includeGitIgnored?: boolean
	backupTypes?: BackupTypes
}

export async function scanClaudeFiles(
	rootPath: string,
	options: ScanOptions = {},
): Promise<Result<string[], Error>> {
	const statsResult = await fromAsyncThrowable(async () => {
		const stats = await stat(rootPath)
		if (!stats.isDirectory()) {
			throw new Error(`Path is not a directory: ${rootPath}`)
		}
		return stats
	})

	if (!statsResult.ok) {
		const error = statsResult.error
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return err(new Error(`Directory does not exist: ${rootPath}`))
		}
		return err(error)
	}

	const backupTypes = options.backupTypes || {
		claudeMd: true,
		claudeProjects: false,
		settingsLocal: false,
	}
	const patterns: string[] = []

	if (backupTypes.claudeMd) {
		patterns.push("**/{claude,CLAUDE}.md")
	}
	if (backupTypes.settingsLocal) {
		patterns.push("**/.claude/settings.local.json")
	}

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
	}

	return fromAsyncThrowable(async () => {
		const files = patterns.length > 0 ? await globby(patterns, globbyOptions) : []
		return files.sort()
	})
}

export async function scanClaudeProjects(): Promise<Result<string[], Error>> {
	const projectsPath = getClaudeProjectsPath()

	// Check if the ~/.claude/projects directory exists
	const accessResult = await fromAsyncThrowable(async () => {
		await access(projectsPath)
	})

	if (!accessResult.ok) {
		return err(new Error(`Claude projects directory does not exist: ${projectsPath}`))
	}

	const pattern = "**/*"
	const globbyOptions = {
		cwd: projectsPath,
		absolute: true,
		onlyFiles: true,
		ignore: ["**/.DS_Store", "**/Thumbs.db"],
	}

	return fromAsyncThrowable(async () => {
		const files = await globby(pattern, globbyOptions)
		return files.sort()
	})
}
