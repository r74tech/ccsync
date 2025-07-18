import { addProject } from "./addProject.ts"
import { backupGlobal } from "./backupGlobal.ts"
import { help } from "./help.ts"
import { history } from "./history.ts"
import type { Command } from "./index.ts"
import { init } from "./init.ts"
import { status } from "./status.ts"
import { sync } from "./sync.ts"
import { syncAll } from "./syncAll.ts"
import { version } from "./version.ts"

/**
 * Map of available CLI subcommands
 */
export const commands = new Map<string, Command>()
commands.set("init", init)
commands.set("add-project", addProject)
commands.set("backup-global", backupGlobal)
commands.set("sync", sync)
commands.set("sync-all", syncAll)
commands.set("status", status)
commands.set("history", history)
commands.set("help", help)
commands.set("version", version)
