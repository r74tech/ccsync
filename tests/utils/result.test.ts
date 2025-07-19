import { describe, expect, it } from "vitest"
import { err, fromAsyncThrowable, fromThrowable, isErr, isOk, ok } from "../../src/utils/result.ts"

describe("Result type", () => {
	describe("ok", () => {
		it("should create a successful result", () => {
			const result = ok(42)
			expect(result).toEqual({ ok: true, value: 42 })
		})
	})

	describe("err", () => {
		it("should create an error result", () => {
			const result = err("error message")
			expect(result).toEqual({ ok: false, error: "error message" })
		})
	})

	describe("isOk", () => {
		it("should return true for successful results", () => {
			const result = ok(42)
			expect(isOk(result)).toBe(true)
			if (isOk(result)) {
				// Type narrowing test
				expect(result.value).toBe(42)
			}
		})

		it("should return false for error results", () => {
			const result = err("error")
			expect(isOk(result)).toBe(false)
		})
	})

	describe("isErr", () => {
		it("should return true for error results", () => {
			const result = err("error message")
			expect(isErr(result)).toBe(true)
			if (isErr(result)) {
				// Type narrowing test
				expect(result.error).toBe("error message")
			}
		})

		it("should return false for successful results", () => {
			const result = ok(42)
			expect(isErr(result)).toBe(false)
		})
	})

	describe("fromThrowable", () => {
		it("should wrap successful function execution", () => {
			const fn = () => 42
			const result = fromThrowable(fn)
			expect(isOk(result)).toBe(true)
			if (isOk(result)) {
				expect(result.value).toBe(42)
			}
		})

		it("should catch thrown errors", () => {
			const fn = () => {
				throw new Error("test error")
			}
			const result = fromThrowable(fn)
			expect(isErr(result)).toBe(true)
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(Error)
				expect((result.error as Error).message).toBe("test error")
			}
		})

		it("should use custom error handler", () => {
			const fn = () => {
				throw new Error("test error")
			}
			const errorHandler = (error: unknown) => `Handled: ${(error as Error).message}`
			const result = fromThrowable(fn, errorHandler)
			expect(isErr(result)).toBe(true)
			if (isErr(result)) {
				expect(result.error).toBe("Handled: test error")
			}
		})
	})

	describe("fromAsyncThrowable", () => {
		it("should wrap successful async function execution", async () => {
			const fn = async () => 42
			const result = await fromAsyncThrowable(fn)
			expect(isOk(result)).toBe(true)
			if (isOk(result)) {
				expect(result.value).toBe(42)
			}
		})

		it("should catch async errors", async () => {
			const fn = async () => {
				throw new Error("async error")
			}
			const result = await fromAsyncThrowable(fn)
			expect(isErr(result)).toBe(true)
			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(Error)
				expect((result.error as Error).message).toBe("async error")
			}
		})

		it("should use custom error handler for async errors", async () => {
			const fn = async () => {
				throw new Error("async error")
			}
			const errorHandler = (error: unknown) => `Async handled: ${(error as Error).message}`
			const result = await fromAsyncThrowable(fn, errorHandler)
			expect(isErr(result)).toBe(true)
			if (isErr(result)) {
				expect(result.error).toBe("Async handled: async error")
			}
		})
	})
})
