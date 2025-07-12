import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cli } from "../src/cli.ts";
import type { Config } from "../src/config.ts";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("CLI", () => {
	let testDir: string;
	let mockConfig: Config;
	let consoleSpy: {
		log: ReturnType<typeof vi.spyOn>;
		error: ReturnType<typeof vi.spyOn>;
	};
	let mockExit: any;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "ccsync-test-"));

		mockConfig = {
			projects: [],
			syncDestination: join(testDir, "sync"),
			historyRetention: 30,
		};

		consoleSpy = {
			log: vi.spyOn(console, "log").mockImplementation(() => {}),
			error: vi.spyOn(console, "error").mockImplementation(() => {}),
		};

		mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
			throw new Error("process.exit called");
		}) as any);
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
		vi.clearAllMocks();
	});

	describe("init command", () => {
		it("should require destination option", async () => {
			await expect(cli(["node", "ccsync", "init"])).rejects.toThrow(
				"process.exit called",
			);

			expect(consoleSpy.error).toHaveBeenCalledWith(
				expect.stringContaining("Failed to execute init:"),
				expect.any(Error),
			);
		});
	});

	describe("add-project command", () => {
		it("should require name and source options", async () => {
			await expect(cli(["node", "ccsync", "add-project"])).rejects.toThrow(
				"process.exit called",
			);

			expect(consoleSpy.error).toHaveBeenCalledWith(
				expect.stringContaining("Failed to execute add-project:"),
				expect.any(Error),
			);
		});

		it("should require source when only name is provided", async () => {
			await expect(
				cli(["node", "ccsync", "add-project", "--name", "test"]),
			).rejects.toThrow("process.exit called");

			expect(consoleSpy.error).toHaveBeenCalledWith(
				expect.stringContaining("Failed to execute add-project:"),
				expect.any(Error),
			);
		});
	});

	describe("help command", () => {
		it("should show help when no command is provided", async () => {
			await expect(cli(["node", "ccsync"])).rejects.toThrow(
				"process.exit called",
			);

			expect(consoleSpy.log).toHaveBeenCalledWith(
				expect.stringContaining("Usage: ccsync [command] [options]"),
			);
		});

		it("should show help with --help flag", async () => {
			await expect(cli(["node", "ccsync", "--help"])).rejects.toThrow(
				"process.exit called",
			);

			expect(consoleSpy.log).toHaveBeenCalledWith(
				expect.stringContaining("Usage: ccsync [command] [options]"),
			);
		});
	});

	describe("version command", () => {
		it.skip("should show version with --version flag", async () => {
			await expect(cli(["node", "ccsync", "--version"])).rejects.toThrow(
				"process.exit called",
			);

			// Check that version was logged
			expect(consoleSpy.log).toHaveBeenCalled();
			expect(consoleSpy.log).toHaveBeenCalledWith("ccsync version 0.1.0");
		});
	});

	describe("unknown command", () => {
		it("should error on unknown command", async () => {
			await expect(cli(["node", "ccsync", "unknown-command"])).rejects.toThrow(
				"process.exit called",
			);

			expect(consoleSpy.error).toHaveBeenCalledWith(
				expect.stringContaining("Unknown command: unknown-command"),
			);
		});
	});
});
