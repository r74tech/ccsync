/**
 * Custom Result type implementation for error handling
 */

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
	return { ok: false, error }
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
	return result.ok === true
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
	return result.ok === false
}

export function fromThrowable<T, E = Error>(
	fn: () => T,
	errorHandler?: (error: unknown) => E,
): Result<T, E> {
	try {
		return ok(fn())
	} catch (error) {
		if (errorHandler) {
			return err(errorHandler(error))
		}
		return err(error as E)
	}
}

export async function fromAsyncThrowable<T, E = Error>(
	fn: () => Promise<T>,
	errorHandler?: (error: unknown) => E,
): Promise<Result<T, E>> {
	try {
		const value = await fn()
		return ok(value)
	} catch (error) {
		if (errorHandler) {
			return err(errorHandler(error))
		}
		return err(error as E)
	}
}

// Export function matching filename
export function result(): void {
	// This function exists to match the filename convention
	throw new Error(
		"result() is not meant to be called. Use the exported types and functions instead.",
	)
}
