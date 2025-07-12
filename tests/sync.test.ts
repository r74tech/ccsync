import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { syncProject } from "../src/sync.ts";
import {
	mkdtemp,
	rm,
	writeFile,
	mkdir,
	readFile,
	stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Project } from "../src/config.ts";

describe("Sync module", () => {
	let sourceDir: string;
	let destDir: string;

	beforeEach(async () => {
		const testDir = await mkdtemp(join(tmpdir(), "ccsync-test-"));
		sourceDir = join(testDir, "source");
		destDir = join(testDir, "dest");
		await mkdir(sourceDir, { recursive: true });
		await mkdir(destDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(sourceDir, { recursive: true, force: true });
		await rm(destDir, { recursive: true, force: true });
	});

	describe("syncProject", () => {
		it("should sync all claude.md files from a project", async () => {
			const project: Project = {
				name: "test-project",
				source: sourceDir,
				autoSync: false,
				includeGitIgnored: false,
			};

			await writeFile(join(sourceDir, "claude.md"), "# Root");
			await mkdir(join(sourceDir, "docs"), { recursive: true });
			await writeFile(join(sourceDir, "docs", "claude.md"), "# Docs");
			await mkdir(join(sourceDir, "src"), { recursive: true });
			await writeFile(join(sourceDir, "src", "claude.md"), "# Src");

			const result = await syncProject(project, destDir);

			expect(result.success).toBe(true);
			expect(result.filesSync).toBe(3);
			expect(result.errors).toHaveLength(0);

			const projectDestDir = join(destDir, project.name);
			const rootContent = await readFile(
				join(projectDestDir, "claude.md"),
				"utf-8",
			);
			const docsContent = await readFile(
				join(projectDestDir, "docs", "claude.md"),
				"utf-8",
			);
			const srcContent = await readFile(
				join(projectDestDir, "src", "claude.md"),
				"utf-8",
			);

			expect(rootContent).toBe("# Root");
			expect(docsContent).toBe("# Docs");
			expect(srcContent).toBe("# Src");
		});

		it("should use custom destination if specified", async () => {
			const customDest = join(destDir, "custom");
			const project: Project = {
				name: "test-project",
				source: sourceDir,
				destination: customDest,
				autoSync: false,
				includeGitIgnored: false,
			};

			await writeFile(join(sourceDir, "claude.md"), "# Test");

			const result = await syncProject(project, destDir);

			expect(result.success).toBe(true);

			const fileExists = await stat(join(customDest, "claude.md"))
				.then(() => true)
				.catch(() => false);
			expect(fileExists).toBe(true);
		});

		it("should handle sync errors gracefully", async () => {
			const project: Project = {
				name: "test-project",
				source: join(sourceDir, "non-existent"),
				autoSync: false,
				includeGitIgnored: false,
			};

			const result = await syncProject(project, destDir);

			expect(result.success).toBe(false);
			expect(result.filesSync).toBe(0);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]).toContain("Directory does not exist");
		});

		it("should include gitignored files when specified", async () => {
			const project: Project = {
				name: "test-project",
				source: sourceDir,
				autoSync: false,
				includeGitIgnored: true,
			};

			await writeFile(join(sourceDir, ".gitignore"), "ignored/");
			await writeFile(join(sourceDir, "claude.md"), "# Root");
			await mkdir(join(sourceDir, "ignored"), { recursive: true });
			await writeFile(join(sourceDir, "ignored", "claude.md"), "# Ignored");

			const result = await syncProject(project, destDir);

			expect(result.success).toBe(true);
			expect(result.filesSync).toBe(2);
		});

		it("should handle file copy errors gracefully", async () => {
			const project: Project = {
				name: "test-project",
				source: sourceDir,
				autoSync: false,
				includeGitIgnored: false,
			};

			// Create a file that will be difficult to copy (e.g., by making destination readonly)
			await writeFile(join(sourceDir, "claude.md"), "# Test");

			// Create the destination directory as a file instead of directory to cause an error
			const projectDestDir = join(destDir, project.name);
			await writeFile(projectDestDir, "not a directory");

			const result = await syncProject(project, destDir);

			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should copy files preserving directory structure", async () => {
			const project: Project = {
				name: "test-project",
				source: sourceDir,
				autoSync: false,
				includeGitIgnored: false,
			};

			const deepPath = join(sourceDir, "deep", "nested", "path");
			await mkdir(deepPath, { recursive: true });
			await writeFile(join(deepPath, "claude.md"), "# Deep Content");

			const result = await syncProject(project, destDir);

			expect(result.success).toBe(true);
			expect(result.filesSync).toBe(1);

			const destFile = join(
				destDir,
				project.name,
				"deep",
				"nested",
				"path",
				"claude.md",
			);
			const content = await readFile(destFile, "utf-8");
			expect(content).toBe("# Deep Content");
		});

		it("should overwrite existing files", async () => {
			const project: Project = {
				name: "test-project",
				source: sourceDir,
				autoSync: false,
				includeGitIgnored: false,
			};

			await writeFile(join(sourceDir, "claude.md"), "# New Content");

			// Pre-create destination file with old content
			const projectDestDir = join(destDir, project.name);
			await mkdir(projectDestDir, { recursive: true });
			await writeFile(join(projectDestDir, "claude.md"), "# Old Content");

			const result = await syncProject(project, destDir);

			expect(result.success).toBe(true);

			const content = await readFile(
				join(projectDestDir, "claude.md"),
				"utf-8",
			);
			expect(content).toBe("# New Content");
		});
	});
});
