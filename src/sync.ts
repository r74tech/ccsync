import { mkdir, readFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import type { Project } from "./config.ts"
import { getClaudeProjectsPath } from "./config.ts"
import { scanClaudeFiles, scanClaudeProjects } from "./scanner.ts"
import { fromAsyncThrowable, type Result } from "./utils/result.ts"
import { createVersionedBackup, pruneOldVersions } from "./utils/versioning.ts"

export interface SyncResult {
	success: boolean
	filesSync: number
	errors: string[]
}

async function syncFile(
	source: string,
	destRoot: string,
	sourceRoot: string,
	versioningStrategy: "none" | "timestamp" | "incremental" = "none",
	keepVersions: number = 5,
): Promise<Result<void, Error>> {
	const relativePath = relative(sourceRoot, source)
	const dest = join(destRoot, relativePath)

	// Check if files are different
	const needsUpdate = await fromAsyncThrowable(async () => {
		try {
			const sourceContent = await readFile(source)
			const destContent = await readFile(dest)
			return !sourceContent.equals(destContent)
		} catch {
			// If destination doesn't exist, we need to update
			return true
		}
	})

	if (!needsUpdate.ok || !needsUpdate.value) {
		// Files are identical, skip
		return { ok: true, value: undefined }
	}

	// Create directory
	const mkdirResult = await fromAsyncThrowable(async () => {
		await mkdir(dirname(dest), { recursive: true })
	})

	if (!mkdirResult.ok) {
		return mkdirResult
	}

	// Create versioned backup
	const backupResult = await createVersionedBackup(source, dest, versioningStrategy)
	if (!backupResult.ok) {
		return { ok: false, error: backupResult.error }
	}

	// Prune old versions
	if (versioningStrategy !== "none") {
		await pruneOldVersions(dest, keepVersions)
	}

	return { ok: true, value: undefined }
}

export async function syncProject(
	project: Project,
	defaultDestination: string,
): Promise<SyncResult> {
	const result: SyncResult = {
		success: true,
		filesSync: 0,
		errors: [],
	}

	const destination = project.destination || join(defaultDestination, project.name)

	// Sync regular files from project source
	if (project.backupTypes.claudeMd || project.backupTypes.settingsLocal) {
		const filesResult = await scanClaudeFiles(project.source, {
			includeGitIgnored: project.includeGitIgnored,
			backupTypes: project.backupTypes,
		})

		if (!filesResult.ok) {
			result.success = false
			result.errors.push(filesResult.error.message)
			return result
		}

		const files = filesResult.value

		for (const file of files) {
			const syncResult = await syncFile(
				file,
				destination,
				project.source,
				project.versioningStrategy,
				project.keepVersions,
			)

			if (syncResult.ok) {
				result.filesSync++
			} else {
				result.success = false
				result.errors.push(`Failed to sync ${file}: ${syncResult.error.message}`)
			}
		}
	}

	// Sync Claude projects if enabled
	if (project.backupTypes.claudeProjects) {
		const claudeProjectsResult = await syncClaudeProjects(
			project.name,
			destination,
			project.versioningStrategy,
			project.keepVersions,
		)

		if (!claudeProjectsResult.ok) {
			result.success = false
			result.errors.push(claudeProjectsResult.error.message)
		} else {
			result.filesSync += claudeProjectsResult.value
		}
	}

	return result
}

export async function syncClaudeProjects(
	_projectName: string,
	destination: string,
	versioningStrategy: "none" | "timestamp" | "incremental",
	keepVersions: number,
): Promise<Result<number, Error>> {
	const filesResult = await scanClaudeProjects()
	if (!filesResult.ok) {
		return { ok: false, error: filesResult.error }
	}

	const files = filesResult.value
	const projectsPath = getClaudeProjectsPath()
	const destProjectsPath = join(destination, ".claude", "projects")

	let syncedCount = 0

	for (const file of files) {
		const syncResult = await syncFile(
			file,
			destProjectsPath,
			projectsPath,
			versioningStrategy,
			keepVersions,
		)

		if (syncResult.ok) {
			syncedCount++
		}
	}

	return { ok: true, value: syncedCount }
}
