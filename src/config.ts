import { mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { z } from "zod"
import { err, fromAsyncThrowable, type Result } from "./utils/result.ts"

const BackupTypesSchema = z.object({
	claudeMd: z.boolean().default(true),
	claudeProjects: z.boolean().default(false),
	settingsLocal: z.boolean().default(false),
})

const ProjectSchema = z.object({
	name: z.string(),
	source: z.string(),
	destination: z.string().optional(),
	autoSync: z.boolean().default(false),
	includeGitIgnored: z.boolean().default(false),
	backupTypes: BackupTypesSchema.default({}),
	versioningStrategy: z.enum(["none", "timestamp", "incremental"]).default("none"),
	keepVersions: z.number().default(5),
})

const ConfigSchema = z.object({
	projects: z.array(ProjectSchema),
	syncDestination: z.string(),
	historyRetention: z.number().default(30),
	hooks: z
		.object({
			postSync: z.string().optional(),
		})
		.optional(),
})

export type BackupTypes = z.infer<typeof BackupTypesSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Config = z.infer<typeof ConfigSchema>

export function getConfigPath(): string {
	// Allow overriding config path for testing
	if (process.env.CCSYNC_CONFIG_PATH) {
		return process.env.CCSYNC_CONFIG_PATH
	}
	return join(homedir(), ".config", "ccsync", "settings.json")
}

export function getClaudeHomePath(): string {
	return join(homedir(), ".claude")
}

export function getClaudeProjectsPath(): string {
	return join(getClaudeHomePath(), "projects")
}

export async function initConfig(
	configPath?: string,
	syncDestination?: string,
): Promise<Result<void, Error>> {
	const path = configPath || getConfigPath()

	if (!syncDestination && !process.env.CCSYNC_SYNC_DESTINATION) {
		return err(
			new Error(
				"Sync destination must be specified. Use --destination flag or set CCSYNC_SYNC_DESTINATION environment variable.",
			),
		)
	}

	const defaultConfig: Config = {
		projects: [],
		syncDestination: syncDestination || process.env.CCSYNC_SYNC_DESTINATION || "",
		historyRetention: 30,
	}

	return fromAsyncThrowable(async () => {
		await mkdir(dirname(path), { recursive: true })
		await writeFile(path, JSON.stringify(defaultConfig, null, 2))
	})
}

export async function loadConfig(configPath?: string): Promise<Result<Config, Error>> {
	const path = configPath || getConfigPath()

	const result = await fromAsyncThrowable(async () => {
		const content = await readFile(path, "utf-8")
		const data = JSON.parse(content)
		return ConfigSchema.parse(data)
	})

	if (result.ok === false) {
		const error = result.error
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return err(new Error(`Config file not found at: ${path}`))
		}
	}

	return result
}

export async function saveConfig(configPath: string, config: Config): Promise<Result<void, Error>> {
	return fromAsyncThrowable(async () => {
		const validatedConfig = ConfigSchema.parse(config)
		await mkdir(dirname(configPath), { recursive: true })
		await writeFile(configPath, JSON.stringify(validatedConfig, null, 2))
	})
}
