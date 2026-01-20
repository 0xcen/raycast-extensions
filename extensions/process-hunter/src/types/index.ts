export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  command: string;
  cwd: string;
  ports: number[];
  cpu: number;
  memoryMB: number;
  startTime: Date;
  uptime: string;
}

export interface TerminalGroup {
  name: string;
  icon: string;
  processes: ProcessInfo[];
  isOrphaned: boolean;
}

export interface ProcessHunterState {
  groups: TerminalGroup[];
  selectedPids: Set<number>;
  isLoading: boolean;
  lastRefresh: Date;
  error: string | null;
}

export interface KillResult {
  pid: number;
  success: boolean;
  error?: string;
  wasForced: boolean;
}
