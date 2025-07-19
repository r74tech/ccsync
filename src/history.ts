import { mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { err, fromAsyncThrowable, ok, type Result } from "./utils/result.ts"

export interface HistoryEntry {
	timestamp: Date
	action: "sync" | "init" | "add-project" | "remove-project" | "backup-global"
	project?: string
	filesCount?: number
	filesSync?: number
	success: boolean
	details?: string
}

function getHistoryPath(): string {
	// Allow overriding history path for testing
	if (process.env.CCSYNC_HISTORY_PATH) {
		return process.env.CCSYNC_HISTORY_PATH
	}
	return join(homedir(), ".config", "ccsync", "history.json")
}

async function loadHistory(): Promise<Result<HistoryEntry[], Error>> {
	const path = getHistoryPath()

	const result = await fromAsyncThrowable(async () => {
		const content = await readFile(path, "utf-8")
		const data = JSON.parse(content)
		// Convert timestamp strings to Date objects
		if (Array.isArray(data)) {
			return data.map((entry) => ({
				...entry,
				timestamp: new Date(entry.timestamp),
			})) as HistoryEntry[]
		}
		return [] as HistoryEntry[]
	})

	// If file doesn't exist, return empty array instead of error
	if (
		result.ok === false &&
		result.error instanceof Error &&
		"code" in result.error &&
		result.error.code === "ENOENT"
	) {
		return ok([])
	}

	return result
}

async function saveHistory(entries: HistoryEntry[]): Promise<Result<void, Error>> {
	const path = getHistoryPath()

	return fromAsyncThrowable(async () => {
		await mkdir(dirname(path), { recursive: true })
		await writeFile(path, JSON.stringify(entries, null, 2))
	})
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<Result<void, Error>> {
	const loadResult = await loadHistory()
	if (!loadResult.ok) {
		return err(loadResult.error)
	}

	const entries = loadResult.value
	entries.push(entry)

	return saveHistory(entries)
}

export async function getHistoryEntries(
	project?: string,
	limit?: number,
): Promise<Result<HistoryEntry[], Error>> {
	const loadResult = await loadHistory()
	if (!loadResult.ok) {
		return err(loadResult.error)
	}

	let filtered = loadResult.value

	if (project) {
		filtered = filtered.filter((e) => e.project === project)
	}

	filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

	if (limit) {
		filtered = filtered.slice(0, limit)
	}

	return ok(filtered)
}

export async function cleanupHistory(retentionDays: number): Promise<Result<void, Error>> {
	const loadResult = await loadHistory()
	if (!loadResult.ok) {
		return err(loadResult.error)
	}

	const cutoffDate = new Date()
	cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

	const filtered = loadResult.value.filter((entry) => entry.timestamp > cutoffDate)

	return saveHistory(filtered)
}
