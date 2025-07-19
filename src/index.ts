#!/usr/bin/env bun
import { cli } from "./cli.ts";

// Export function matching filename
export function index(argv?: string[]): Promise<void> {
	return cli(argv);
}

// Execute CLI
await cli();
