import { exec } from "child_process";
import { ProcessInfo } from "../types";
import { isDevServer, formatUptime, parseEtime } from "./utils";

const EXEC_OPTIONS = { maxBuffer: 10 * 1024 * 1024 };

interface LsofProcess {
  pid: number;
  name: string;
  ports: number[];
}

export function getListeningProcesses(): Promise<LsofProcess[]> {
  return new Promise((resolve) => {
    exec("/usr/sbin/lsof -iTCP -sTCP:LISTEN -P -n", EXEC_OPTIONS, (err, stdout) => {
      if (err) {
        console.error("[Process Hunter] lsof error:", err.message);
        resolve([]);
        return;
      }

      const lines = stdout.trim().split("\n").slice(1); // Skip header
      const pidMap = new Map<number, LsofProcess>();

      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length < 8) continue;

        const name = parts[0]; // Command name from lsof
        const pid = parseInt(parts[1], 10);
        if (isNaN(pid)) continue;

        const nameCol = parts.slice(8).join(" ");
        const portMatch = nameCol.match(/:(\d+)/);

        if (portMatch) {
          const port = parseInt(portMatch[1], 10);
          if (!pidMap.has(pid)) {
            pidMap.set(pid, { pid, name, ports: [] });
          }
          const proc = pidMap.get(pid)!;
          if (!proc.ports.includes(port)) {
            proc.ports.push(port);
          }
        }
      }

      // Filter to dev servers right here for speed
      const devProcesses = Array.from(pidMap.values()).filter((p) => isDevServer(p.name));
      console.log("[Process Hunter] Found", devProcesses.length, "dev processes");
      resolve(devProcesses);
    });
  });
}

function execPromise(command: string): Promise<string> {
  return new Promise((resolve) => {
    exec(command, EXEC_OPTIONS, (err, stdout) => {
      if (err) {
        resolve("");
        return;
      }
      resolve(stdout);
    });
  });
}

export async function getBulkProcessDetails(
  pidPortsMap: Map<number, number[]>
): Promise<ProcessInfo[]> {
  const pids = Array.from(pidPortsMap.keys());
  if (pids.length === 0) return [];

  try {
    // Single ps call for all PIDs - much faster than individual calls
    const pidList = pids.join(",");
    const output = await execPromise(`/bin/ps -p ${pidList} -o pid=,ppid=,%cpu=,rss=,etime=,args=`);

    const processes: ProcessInfo[] = [];
    const lines = output.trim().split("\n");

    for (const line of lines) {
      if (!line.trim()) continue;

      // Parse: PID PPID %CPU RSS ETIME ARGS...
      // Args can have spaces, so we parse fixed fields first
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+(.+)$/);
      if (!match) continue;

      const [, pidStr, ppidStr, cpuStr, rssStr, etime, args] = match;
      const pid = parseInt(pidStr, 10);
      const ports = pidPortsMap.get(pid) || [];

      // Extract process name from args (first part or last path component)
      const name = args.split("/").pop()?.split(" ")[0] || args.split(" ")[0];

      processes.push({
        pid,
        ppid: parseInt(ppidStr, 10) || 0,
        name,
        command: args,
        cwd: "~",
        ports,
        cpu: parseFloat(cpuStr) || 0,
        memoryMB: Math.round(parseInt(rssStr, 10) / 1024),
        startTime: parseEtime(etime),
        uptime: formatUptime(etime),
      });
    }

    return processes;
  } catch {
    return [];
  }
}

export interface ProcessStats {
  pid: number;
  cpu: number;
  memoryMB: number;
  uptime: string;
}

export async function getBulkProcessStats(pids: number[]): Promise<Map<number, ProcessStats>> {
  const stats = new Map<number, ProcessStats>();
  if (pids.length === 0) return stats;

  try {
    const pidList = pids.join(",");
    const output = await execPromise(`/bin/ps -p ${pidList} -o pid=,%cpu=,rss=,etime=`);

    for (const line of output.trim().split("\n")) {
      if (!line.trim()) continue;
      const match = line.trim().match(/^(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+)$/);
      if (!match) continue;

      const [, pidStr, cpuStr, rssStr, etime] = match;
      const pid = parseInt(pidStr, 10);

      stats.set(pid, {
        pid,
        cpu: parseFloat(cpuStr) || 0,
        memoryMB: Math.round(parseInt(rssStr, 10) / 1024),
        uptime: formatUptime(etime),
      });
    }
  } catch {
    // Ignore errors
  }

  return stats;
}

export async function getProcessCwd(pid: number): Promise<string> {
  try {
    const output = await execPromise(`/usr/sbin/lsof -p ${pid} -Fn 2>/dev/null`);
    const lines = output.split("\n");
    // Format is: "fcwd" on one line, then "n/path" on the next line
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i] === "fcwd" && lines[i + 1]?.startsWith("n")) {
        const path = lines[i + 1].slice(1); // Remove the "n" prefix
        return path.replace(process.env.HOME || "", "~");
      }
    }
  } catch {
    // Ignore errors
  }
  return "~";
}
