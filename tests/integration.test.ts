import { exec } from "node:child_process"
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

const execAsync = promisify(exec)

describe("CcSync Integration Tests", () => {
	let testDir: string
	let sourceDir: string
	let configPath: string
	const ccsyncPath = join(process.cwd(), "src", "index.ts")

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "ccsync-integration-"))
		sourceDir = join(testDir, "source")
		configPath = join(testDir, "config", "settings.json")

		await mkdir(sourceDir, { recursive: true })

		// Set config path for tests
		process.env.CCSYNC_CONFIG_PATH = configPath

		// Set default sync destination in config
		process.env.CCSYNC_SYNC_DESTINATION = join(testDir, "claude-sync")
	})

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true })
		delete process.env.CCSYNC_CONFIG_PATH
		delete process.env.CCSYNC_SYNC_DESTINATION
	})

	async function runCcsync(args: string): Promise<{ stdout: string; stderr: string }> {
		return execAsync(`bun run ${ccsyncPath} ${args}`)
	}

	describe("Full workflow", () => {
		it("should handle complete sync workflow", async () => {
			// Create source project structure
			await writeFile(join(sourceDir, "claude.md"), "# Root claude.md")
			await mkdir(join(sourceDir, "docs"), { recursive: true })
			await writeFile(join(sourceDir, "docs", "claude.md"), "# Docs claude.md")
			await mkdir(join(sourceDir, "src", "components"), { recursive: true })
			await writeFile(join(sourceDir, "src", "components", "claude.md"), "# Components claude.md")

			// Initialize ccsync
			const { stdout: initOutput } = await runCcsync(`init --destination ${join(testDir, "sync")}`)
			expect(initOutput).toContain("Configuration initialized successfully")

			// Add project
			const { stdout: addOutput } = await runCcsync(
				`add-project --name test-project --source ${sourceDir}`,
			)
			expect(addOutput).toContain("Project 'test-project' added successfully")

			// Check status
			const { stdout: statusOutput } = await runCcsync("status")
			expect(statusOutput).toContain("test-project")
			expect(statusOutput).toContain("Claude.md files: 3")

			// Sync project
			const { stdout: syncOutput } = await runCcsync("sync test-project")
			expect(syncOutput).toContain("Synced 3 files")

			// Verify files were synced
			const destDir = join(testDir, "sync", "test-project")
			const rootContent = await readFile(join(destDir, "claude.md"), "utf-8")
			const docsContent = await readFile(join(destDir, "docs", "claude.md"), "utf-8")
			const componentsContent = await readFile(
				join(destDir, "src", "components", "claude.md"),
				"utf-8",
			)

			expect(rootContent).toBe("# Root claude.md")
			expect(docsContent).toBe("# Docs claude.md")
			expect(componentsContent).toBe("# Components claude.md")

			// Check history
			const { stdout: historyOutput } = await runCcsync("history")
			expect(historyOutput).toContain("sync")
			expect(historyOutput).toContain("test-project")
			expect(historyOutput).toContain("Files: 3")
		})
	})

	describe("Gitignore handling", () => {
		it("should respect .gitignore by default", async () => {
			// Create gitignore
			await writeFile(join(sourceDir, ".gitignore"), "ignored/\n*.tmp")

			// Create files
			await writeFile(join(sourceDir, "claude.md"), "# Root")
			await mkdir(join(sourceDir, "ignored"), { recursive: true })
			await writeFile(join(sourceDir, "ignored", "claude.md"), "# Ignored")
			await writeFile(join(sourceDir, "temp.claude.md.tmp"), "# Temp")

			await runCcsync(`init --destination ${join(testDir, "sync")}`)
			await runCcsync(`add-project --name test --source ${sourceDir}`)
			const { stdout } = await runCcsync("sync test")

			expect(stdout).toContain("Synced 1 files")

			const destDir = join(testDir, "sync", "test")
			const fileExists = await access(join(destDir, "claude.md"))
				.then(() => true)
				.catch(() => false)
			expect(fileExists).toBe(true)
			await expect(access(join(destDir, "ignored", "claude.md"))).rejects.toThrow()
		})

		it("should include gitignored files when specified", async () => {
			await writeFile(join(sourceDir, ".gitignore"), "ignored/")
			await writeFile(join(sourceDir, "claude.md"), "# Root")
			await mkdir(join(sourceDir, "ignored"), { recursive: true })
			await writeFile(join(sourceDir, "ignored", "claude.md"), "# Ignored")

			await runCcsync(`init --destination ${join(testDir, "sync")}`)
			await runCcsync(`add-project --name test --source ${sourceDir} --include-git-ignored`)
			const { stdout } = await runCcsync("sync test")

			expect(stdout).toContain("Synced 2 files")
		})
	})

	describe("Multiple projects", () => {
		it("should handle multiple projects independently", async () => {
			const project1Dir = join(testDir, "project1")
			const project2Dir = join(testDir, "project2")

			await mkdir(project1Dir)
			await mkdir(project2Dir)

			await writeFile(join(project1Dir, "claude.md"), "# Project 1")
			await writeFile(join(project2Dir, "claude.md"), "# Project 2")

			await runCcsync(`init --destination ${join(testDir, "sync")}`)
			await runCcsync(`add-project --name project1 --source ${project1Dir}`)
			await runCcsync(`add-project --name project2 --source ${project2Dir}`)

			const { stdout } = await runCcsync("sync-all")
			expect(stdout).toContain("project1")
			expect(stdout).toContain("project2")

			const dest1 = join(testDir, "sync", "project1", "claude.md")
			const dest2 = join(testDir, "sync", "project2", "claude.md")

			expect(await readFile(dest1, "utf-8")).toBe("# Project 1")
			expect(await readFile(dest2, "utf-8")).toBe("# Project 2")
		})
	})

	describe("Error handling", () => {
		it("should handle non-existent source directory", async () => {
			await runCcsync(`init --destination ${join(testDir, "sync")}`)

			try {
				await runCcsync(`add-project --name test --source /non/existent/path`)
				expect.fail("Should have thrown")
			} catch (error: any) {
				expect(error.stderr).toContain("Failed to execute add-project")
			}
		})

		it("should handle sync of non-existent project", async () => {
			await runCcsync(`init --destination ${join(testDir, "sync")}`)

			try {
				await runCcsync("sync non-existent")
				expect.fail("Should have thrown")
			} catch (error: any) {
				expect(error.stderr).toContain("Project 'non-existent' not found")
			}
		})
	})

	describe("Custom destination", () => {
		it("should use custom destination when specified", async () => {
			const customDest = join(testDir, "custom-sync-location")

			await writeFile(join(sourceDir, "claude.md"), "# Custom dest test")

			await runCcsync(`init --destination ${join(testDir, "sync")}`)
			await runCcsync(`add-project --name test --source ${sourceDir} --destination ${customDest}`)
			await runCcsync("sync test")

			const content = await readFile(join(customDest, "claude.md"), "utf-8")
			expect(content).toBe("# Custom dest test")
		})
	})
})
