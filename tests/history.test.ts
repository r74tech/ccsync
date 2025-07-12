import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	type HistoryEntry,
	addHistoryEntry,
	getHistoryEntries,
	cleanupHistory,
} from "../src/history.ts";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("History module", () => {
	let testDir: string;
	let historyPath: string;
	let originalEnv: string | undefined;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "ccsync-test-"));
		historyPath = join(testDir, "history.json");
		// Override the history path via environment variable
		originalEnv = process.env.CCSYNC_HISTORY_PATH;
		process.env.CCSYNC_HISTORY_PATH = historyPath;
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
		// Restore original environment
		if (originalEnv) {
			process.env.CCSYNC_HISTORY_PATH = originalEnv;
		} else {
			delete process.env.CCSYNC_HISTORY_PATH;
		}
	});

	describe("getHistoryEntries", () => {
		it("should return empty array if file does not exist", async () => {
			const result = await getHistoryEntries();
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toEqual([]);
			}
		});

		it("should load existing history entries", async () => {
			const existingEntries: HistoryEntry[] = [
				{
					timestamp: new Date("2024-01-01"),
					action: "sync",
					project: "test-project",
					filesCount: 5,
					success: true,
				},
			];

			await writeFile(historyPath, JSON.stringify(existingEntries));

			const result = await getHistoryEntries();
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toHaveLength(1);
				expect(result.value[0]?.project).toBe("test-project");
				expect(result.value[0]?.timestamp).toEqual(new Date("2024-01-01"));
			}
		});

		it("should return error for corrupted history file", async () => {
			await writeFile(historyPath, "invalid json");
			const result = await getHistoryEntries();
			expect(result.ok).toBe(false);
		});
	});

	describe("addHistoryEntry", () => {
		it("should add new entry to history", async () => {
			const entry: HistoryEntry = {
				timestamp: new Date("2024-01-01"),
				action: "init",
				success: true,
			};

			const addResult = await addHistoryEntry(entry);
			expect(addResult.ok).toBe(true);

			const content = await readFile(historyPath, "utf-8");
			const saved = JSON.parse(content);

			expect(saved).toHaveLength(1);
			expect(saved[0].action).toBe("init");
		});

		it("should create directory if it does not exist", async () => {
			const deepPath = join(testDir, "deep", "nested", "history.json");
			process.env.CCSYNC_HISTORY_PATH = deepPath;

			const result = await addHistoryEntry({
				timestamp: new Date(),
				action: "sync",
				success: true,
			});

			expect(result.ok).toBe(true);
			const content = await readFile(deepPath, "utf-8");
			expect(content).toBeTruthy();
		});

		it("should preserve existing entries when adding new one", async () => {
			const result1 = await addHistoryEntry({
				timestamp: new Date("2024-01-01"),
				action: "init",
				success: true,
			});
			expect(result1.ok).toBe(true);

			const result2 = await addHistoryEntry({
				timestamp: new Date("2024-01-02"),
				action: "sync",
				success: true,
			});
			expect(result2.ok).toBe(true);

			const entries = await getHistoryEntries();
			expect(entries.ok).toBe(true);
			if (entries.ok) {
				expect(entries.value).toHaveLength(2);
				expect(entries.value[0]?.action).toBe("sync"); // Most recent first
				expect(entries.value[1]?.action).toBe("init");
			}
		});
	});

	describe("getHistoryEntries with filters", () => {
		beforeEach(async () => {
			const entries: HistoryEntry[] = [
				{
					timestamp: new Date("2024-01-01"),
					action: "sync",
					project: "project1",
					filesCount: 3,
					success: true,
				},
				{
					timestamp: new Date("2024-01-02"),
					action: "sync",
					project: "project2",
					filesCount: 5,
					success: true,
				},
				{
					timestamp: new Date("2024-01-03"),
					action: "sync",
					project: "project1",
					filesCount: 4,
					success: false,
					details: "Error occurred",
				},
			];

			await writeFile(historyPath, JSON.stringify(entries));
		});

		it("should return all entries sorted by date descending", async () => {
			const result = await getHistoryEntries();

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toHaveLength(3);
				expect(result.value[0]?.timestamp).toEqual(new Date("2024-01-03"));
				expect(result.value[1]?.timestamp).toEqual(new Date("2024-01-02"));
				expect(result.value[2]?.timestamp).toEqual(new Date("2024-01-01"));
			}
		});

		it("should filter entries by project", async () => {
			const result = await getHistoryEntries("project1");

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toHaveLength(2);
				expect(result.value.every((e) => e.project === "project1")).toBe(true);
			}
		});

		it("should limit number of entries returned", async () => {
			const result = await getHistoryEntries(undefined, 2);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toHaveLength(2);
				expect(result.value[0]?.timestamp).toEqual(new Date("2024-01-03"));
				expect(result.value[1]?.timestamp).toEqual(new Date("2024-01-02"));
			}
		});

		it("should apply both project filter and limit", async () => {
			const result = await getHistoryEntries("project1", 1);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toHaveLength(1);
				expect(result.value[0]?.project).toBe("project1");
				expect(result.value[0]?.timestamp).toEqual(new Date("2024-01-03"));
			}
		});
	});

	describe("cleanupHistory", () => {
		it("should remove old entries based on retention days", async () => {
			const now = new Date();
			const oldDate = new Date(now);
			oldDate.setDate(oldDate.getDate() - 40);

			const entries: HistoryEntry[] = [
				{
					timestamp: oldDate,
					action: "sync",
					project: "old-project",
					success: true,
				},
				{
					timestamp: now,
					action: "sync",
					project: "recent-project",
					success: true,
				},
			];

			await writeFile(historyPath, JSON.stringify(entries));
			const cleanupResult = await cleanupHistory(30);
			expect(cleanupResult.ok).toBe(true);

			const remaining = await getHistoryEntries();
			expect(remaining.ok).toBe(true);
			if (remaining.ok) {
				expect(remaining.value).toHaveLength(1);
				expect(remaining.value[0]?.project).toBe("recent-project");
			}
		});

		it("should keep all entries if all are within retention period", async () => {
			const now = new Date();
			const recentDate = new Date(now);
			recentDate.setDate(recentDate.getDate() - 10);

			const entries: HistoryEntry[] = [
				{
					timestamp: recentDate,
					action: "sync",
					success: true,
				},
				{
					timestamp: now,
					action: "sync",
					success: true,
				},
			];

			await writeFile(historyPath, JSON.stringify(entries));
			const cleanupResult = await cleanupHistory(30);
			expect(cleanupResult.ok).toBe(true);

			const remaining = await getHistoryEntries();
			expect(remaining.ok).toBe(true);
			if (remaining.ok) {
				expect(remaining.value).toHaveLength(2);
			}
		});
	});
});
