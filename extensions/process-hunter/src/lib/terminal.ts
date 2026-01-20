import { exec } from "child_process";
import { TERMINAL_APPS } from "../constants";

interface TerminalInfo {
  name: string;
  icon: string;
  isOrphaned: boolean;
}

function execPromise(command: string): Promise<string> {
  return new Promise((resolve) => {
    exec(command, (err, stdout) => {
      if (err) {
        resolve("");
        return;
      }
      resolve(stdout);
    });
  });
}

export async function findTerminalApp(pid: number): Promise<TerminalInfo> {
  const visited = new Set<number>();
  let current = pid;

  while (current > 1 && !visited.has(current)) {
    visited.add(current);

    const output = await execPromise(`/bin/ps -p ${current} -o ppid=,comm=`);
    if (!output.trim()) break;

    const parts = output.trim().split(/\s+/);
    if (parts.length < 2) break;

    const [ppidStr, ...commParts] = parts;
    const comm = commParts.join(" ");
    const ppid = parseInt(ppidStr, 10);

    const terminal = TERMINAL_APPS[comm];
    if (terminal) {
      return {
        name: terminal.displayName,
        icon: terminal.icon,
        isOrphaned: false,
      };
    }

    if (isNaN(ppid) || ppid <= 0) break;
    current = ppid;
  }

  return {
    name: "Detached",
    icon: "orphan-icon.png",
    isOrphaned: true,
  };
}
