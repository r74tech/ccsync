import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { type ScanOptions, scanClaudeFiles } from "../src/scanner.ts"

describe("Scanner module", () => {
	let testDir: string

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "ccsync-test-"))
	})

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true })
	})

	describe("scanClaudeFiles", () => {
		it("should find claude.md files in a directory", async () => {
			await writeFile(join(testDir, "claude.md"), "# Project 1")
			await mkdir(join(testDir, "subdir"), { recursive: true })
			await writeFile(join(testDir, "subdir", "claude.md"), "# Subproject")

			const result = await scanClaudeFiles(testDir)

			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toHaveLength(2)
				expect(result.value.map((f) => f.replace(testDir, ""))).toEqual(
					expect.arrayContaining(["/claude.md", "/subdir/claude.md"]),
				)
			}
		})

		it("should ignore node_modules by default", async () => {
			await writeFile(join(testDir, "claude.md"), "# Root")
			await mkdir(join(testDir, "node_modules", "package"), {
				recursive: true,
			})
			await writeFile(join(testDir, "node_modules", "package", "claude.md"), "# Package")

			const result = await scanClaudeFiles(testDir)

			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toHaveLength(1)
				expect(result.value[0]).toMatch(/claude\.md$/)
				expect(result.value[0]).not.toMatch(/node_modules/)
			}
		})

		it("should respect gitignore when includeGitIgnored is false", async () => {
			await writeFile(join(testDir, "claude.md"), "# Root")
			await writeFile(join(testDir, ".gitignore"), "ignored/")
			await mkdir(join(testDir, "ignored"), { recursive: true })
			await writeFile(join(testDir, "ignored", "claude.md"), "# Ignored")

			const options: ScanOptions = { includeGitIgnored: false }
			const result = await scanClaudeFiles(testDir, options)

			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toHaveLength(1)
				expect(result.value[0]).not.toMatch(/ignored/)
			}
		})

		it("should include gitignored files when includeGitIgnored is true", async () => {
			await writeFile(join(testDir, "claude.md"), "# Root")
			await writeFile(join(testDir, ".gitignore"), "ignored/")
			await mkdir(join(testDir, "ignored"), { recursive: true })
			await writeFile(join(testDir, "ignored", "claude.md"), "# Ignored")

			const options: ScanOptions = { includeGitIgnored: true }
			const result = await scanClaudeFiles(testDir, options)

			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toHaveLength(2)
				expect(result.value).toEqual(
					expect.arrayContaining([
						expect.stringMatching(/claude\.md$/),
						expect.stringMatching(/ignored.*claude\.md$/),
					]),
				)
			}
		})

		it("should return empty array for directory without claude.md files", async () => {
			await writeFile(join(testDir, "README.md"), "# Readme")
			await writeFile(join(testDir, "package.json"), "{}")

			const result = await scanClaudeFiles(testDir)

			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toHaveLength(0)
			}
		})

		it("should return error for non-existent directory", async () => {
			const nonExistentDir = join(testDir, "non-existent")

			const result = await scanClaudeFiles(nonExistentDir)

			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error.message).toContain("Directory does not exist")
			}
		})

		it("should return error when path is not a directory", async () => {
			const filePath = join(testDir, "file.txt")
			await writeFile(filePath, "content")

			const result = await scanClaudeFiles(filePath)

			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error.message).toContain("Path is not a directory")
			}
		})
	})
})
