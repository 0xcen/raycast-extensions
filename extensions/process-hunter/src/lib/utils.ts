import { execSync } from "child_process";
import { DEV_SERVER_PROCESSES } from "../constants";

export function safeExec(command: string, fallback = ""): string {
  try {
    return execSync(command, {
      encoding: "utf-8",
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      shell: "/bin/sh",
    });
  } catch {
    return fallback;
  }
}

export function isDevServer(name: string): boolean {
  const normalized = name.toLowerCase();
  return DEV_SERVER_PROCESSES.some((p) => normalized.includes(p));
}

export function parseEtime(etime: string): Date {
  const parts = etime.split(/[-:]/);
  let seconds = 0;

  if (parts.length === 2) {
    seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  } else if (parts.length === 4) {
    seconds =
      parseInt(parts[0]) * 86400 +
      parseInt(parts[1]) * 3600 +
      parseInt(parts[2]) * 60 +
      parseInt(parts[3]);
  }

  return new Date(Date.now() - seconds * 1000);
}

export function formatUptimeFromDate(startTime: Date): string {
  const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

export function formatUptime(etime: string): string {
  return formatUptimeFromDate(parseEtime(etime));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truncatePath(path: string, maxLength = 40): string {
  const home = process.env.HOME || "";
  const normalized = path.replace(home, "~");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const parts = normalized.split("/");
  if (parts.length <= 2) {
    return normalized.slice(0, maxLength - 3) + "...";
  }

  return ".../" + parts.slice(-2).join("/");
}

export function truncateCommand(command: string, maxLength = 60): string {
  if (command.length <= maxLength) {
    return command;
  }
  return command.slice(0, maxLength - 3) + "...";
}
