import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { Config } from "../src/config.ts"
import { getConfigPath, initConfig, loadConfig, saveConfig } from "../src/config.ts"

describe("Config module", () => {
	let testDir: string

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "ccsync-test-"))
	})

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true })
	})

	describe("getConfigPath", () => {
		it("should return the default config path", () => {
			const configPath = getConfigPath()
			expect(configPath).toMatch(/\.config[/\\]ccsync[/\\]settings\.json$/)
		})
	})

	describe("initConfig", () => {
		it("should create a default config file with specified destination", async () => {
			const configPath = join(testDir, "settings.json")
			const syncDest = join(testDir, "sync")
			const result = await initConfig(configPath, syncDest)

			expect(result.ok).toBe(true)

			const content = await readFile(configPath, "utf-8")
			const config = JSON.parse(content)

			expect(config).toMatchObject({
				projects: [],
				syncDestination: syncDest,
				historyRetention: 30,
			})
		})

		it("should return error if no destination specified", async () => {
			const configPath = join(testDir, "settings.json")
			const result = await initConfig(configPath)

			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error.message).toContain("Sync destination must be specified")
			}
		})
	})

	describe("loadConfig", () => {
		it("should load a valid config file", async () => {
			const configPath = join(testDir, "settings.json")
			const testConfig: Config = {
				projects: [
					{
						name: "test-project",
						source: "/path/to/project",
						autoSync: false,
						includeGitIgnored: false,
					},
				],
				syncDestination: "/path/to/sync",
				historyRetention: 30,
			}

			await writeFile(configPath, JSON.stringify(testConfig, null, 2))
			const result = await loadConfig(configPath)

			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toEqual(testConfig)
			}
		})

		it("should return error for invalid config", async () => {
			const configPath = join(testDir, "settings.json")
			await writeFile(configPath, JSON.stringify({ invalid: "config" }))

			const result = await loadConfig(configPath)
			expect(result.ok).toBe(false)
		})

		it("should return error if config file does not exist", async () => {
			const configPath = join(testDir, "nonexistent.json")
			const result = await loadConfig(configPath)

			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error.message).toContain("Config file not found")
			}
		})
	})

	describe("saveConfig", () => {
		it("should save config to file", async () => {
			const configPath = join(testDir, "settings.json")
			const testConfig: Config = {
				projects: [
					{
						name: "test-project",
						source: "/path/to/project",
						destination: "/custom/destination",
						autoSync: true,
						includeGitIgnored: true,
					},
				],
				syncDestination: "/path/to/sync",
				historyRetention: 60,
				hooks: {
					postSync: 'echo "Sync completed"',
				},
			}

			const result = await saveConfig(configPath, testConfig)
			expect(result.ok).toBe(true)

			const content = await readFile(configPath, "utf-8")
			const saved = JSON.parse(content)

			expect(saved).toEqual(testConfig)
		})
	})
})
