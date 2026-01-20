import { exec, execSync } from "child_process";
import { KillResult } from "../types";
import { sleep } from "./utils";
import { DEFAULT_KILL_TIMEOUT_MS, KILL_CHECK_INTERVAL_MS } from "../constants";

function isProcessRunning(pid: number): boolean {
  try {
    execSync(`/bin/ps -p ${pid}`, { encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}

export async function killProcess(
  pid: number,
  timeoutMs = DEFAULT_KILL_TIMEOUT_MS
): Promise<KillResult> {
  try {
    if (!isProcessRunning(pid)) {
      return { pid, success: true, wasForced: false };
    }

    execSync(`/bin/kill -TERM ${pid}`, { encoding: "utf-8" });

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await sleep(KILL_CHECK_INTERVAL_MS);

      if (!isProcessRunning(pid)) {
        return { pid, success: true, wasForced: false };
      }
    }

    execSync(`/bin/kill -KILL ${pid}`, { encoding: "utf-8" });
    await sleep(KILL_CHECK_INTERVAL_MS);

    if (!isProcessRunning(pid)) {
      return { pid, success: true, wasForced: true };
    }

    return {
      pid,
      success: false,
      error: "Process did not terminate after SIGKILL",
      wasForced: true,
    };
  } catch (error) {
    return {
      pid,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      wasForced: false,
    };
  }
}

function execPromise(command: string): Promise<string> {
  return new Promise((resolve) => {
    exec(command, (err, stdout) => {
      resolve(err ? "" : stdout);
    });
  });
}

export async function getChildPids(ppid: number): Promise<number[]> {
  const output = await execPromise(`/usr/bin/pgrep -P ${ppid}`);
  if (!output.trim()) return [];

  const directChildren = output
    .trim()
    .split("\n")
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n));

  const allChildren: number[] = [];

  for (const child of directChildren) {
    allChildren.push(child);
    const grandchildren = await getChildPids(child);
    allChildren.push(...grandchildren);
  }

  return allChildren;
}

export async function killProcessTree(
  pid: number,
  timeoutMs = DEFAULT_KILL_TIMEOUT_MS
): Promise<KillResult[]> {
  const results: KillResult[] = [];

  const children = await getChildPids(pid);

  for (const childPid of children.reverse()) {
    const result = await killProcess(childPid, timeoutMs);
    results.push(result);
  }

  const parentResult = await killProcess(pid, timeoutMs);
  results.push(parentResult);

  return results;
}
