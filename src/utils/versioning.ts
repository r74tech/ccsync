import { copyFile, readdir, rename, stat } from "node:fs/promises"
import { basename, dirname, extname, join } from "node:path"
import { fromAsyncThrowable, type Result } from "./result.ts"

export interface VersionedFile {
	base: string
	version: string
	timestamp: Date
}

export async function getExistingVersions(
	filePath: string,
): Promise<Result<VersionedFile[], Error>> {
	const dir = dirname(filePath)
	const baseName = basename(filePath)
	const ext = extname(baseName)
	const nameWithoutExt = baseName.slice(0, -ext.length)

	return fromAsyncThrowable(async () => {
		const files = await readdir(dir)
		const versions: VersionedFile[] = []

		// Pattern: filename.YYYYMMDD_HHMMSS.ext or filename.v001.ext
		const timestampPattern = new RegExp(`^${nameWithoutExt}\\.\\d{8}_\\d{6}${ext}$`)
		const incrementalPattern = new RegExp(`^${nameWithoutExt}\\.v\\d{3}${ext}$`)

		for (const file of files) {
			if (timestampPattern.test(file)) {
				const match = file.match(/\.(\d{8}_\d{6})\./)
				if (match?.[1]) {
					const parts = match[1].split("_")
					if (parts.length === 2 && parts[0] && parts[1]) {
						const date = parts[0]
						const time = parts[1]
						const year = parseInt(date.substring(0, 4))
						const month = parseInt(date.substring(4, 6)) - 1
						const day = parseInt(date.substring(6, 8))
						const hour = parseInt(time.substring(0, 2))
						const minute = parseInt(time.substring(2, 4))
						const second = parseInt(time.substring(4, 6))

						versions.push({
							base: join(dir, file),
							version: match[1],
							timestamp: new Date(year, month, day, hour, minute, second),
						})
					}
				}
			} else if (incrementalPattern.test(file)) {
				const match = file.match(/\.v(\d{3})\./)
				if (match?.[1]) {
					const fileStats = await stat(join(dir, file))
					versions.push({
						base: join(dir, file),
						version: match[1],
						timestamp: fileStats.mtime,
					})
				}
			}
		}

		return versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
	})
}

export function generateVersionedFilename(
	filePath: string,
	strategy: "timestamp" | "incremental",
	nextIncrement?: number,
): string {
	const dir = dirname(filePath)
	const baseName = basename(filePath)
	const ext = extname(baseName)
	const nameWithoutExt = baseName.slice(0, -ext.length)

	if (strategy === "timestamp") {
		const now = new Date()
		const timestamp =
			now.getFullYear().toString() +
			(now.getMonth() + 1).toString().padStart(2, "0") +
			now.getDate().toString().padStart(2, "0") +
			"_" +
			now.getHours().toString().padStart(2, "0") +
			now.getMinutes().toString().padStart(2, "0") +
			now.getSeconds().toString().padStart(2, "0")
		return join(dir, `${nameWithoutExt}.${timestamp}${ext}`)
	} else {
		const version = (nextIncrement || 1).toString().padStart(3, "0")
		return join(dir, `${nameWithoutExt}.v${version}${ext}`)
	}
}

export async function createVersionedBackup(
	sourcePath: string,
	destPath: string,
	strategy: "none" | "timestamp" | "incremental",
): Promise<Result<string, Error>> {
	if (strategy === "none") {
		return fromAsyncThrowable(async () => {
			await copyFile(sourcePath, destPath)
			return destPath
		})
	}

	// Check if destination already exists
	const destExistsResult = await fromAsyncThrowable(async () => {
		await stat(destPath)
		return true
	})

	if (!destExistsResult.ok || !destExistsResult.value) {
		// Destination doesn't exist, just copy
		return fromAsyncThrowable(async () => {
			await copyFile(sourcePath, destPath)
			return destPath
		})
	}

	// Destination exists, create versioned backup
	let versionedPath: string

	if (strategy === "incremental") {
		const versionsResult = await getExistingVersions(destPath)
		if (!versionsResult.ok) {
			return { ok: false, error: versionsResult.error }
		}

		const existingVersions = versionsResult.value
		const lastVersion =
			existingVersions
				.filter((v) => /^\d{3}$/.test(v.version))
				.map((v) => parseInt(v.version))
				.sort((a, b) => b - a)[0] || 0

		versionedPath = generateVersionedFilename(destPath, "incremental", lastVersion + 1)
	} else {
		versionedPath = generateVersionedFilename(destPath, "timestamp")
	}

	// Move existing file to versioned name
	const moveResult = await fromAsyncThrowable(async () => {
		await rename(destPath, versionedPath)
	})

	if (!moveResult.ok) {
		return { ok: false, error: moveResult.error }
	}

	// Copy new file to destination
	return fromAsyncThrowable(async () => {
		await copyFile(sourcePath, destPath)
		return destPath
	})
}

export async function pruneOldVersions(
	filePath: string,
	keepVersions: number,
): Promise<Result<number, Error>> {
	if (keepVersions <= 0) {
		return { ok: true, value: 0 }
	}

	const versionsResult = await getExistingVersions(filePath)
	if (!versionsResult.ok) {
		return { ok: false, error: versionsResult.error }
	}

	const versions = versionsResult.value
	if (versions.length <= keepVersions) {
		return { ok: true, value: 0 }
	}

	const toDelete = versions.slice(keepVersions)
	let deletedCount = 0

	for (const version of toDelete) {
		const deleteResult = await fromAsyncThrowable(async () => {
			await Bun.file(version.base).unlink()
		})

		if (deleteResult.ok) {
			deletedCount++
		}
	}

	return { ok: true, value: deletedCount }
}
