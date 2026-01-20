import { useState, useCallback, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import { TerminalGroup, ProcessHunterState, ProcessInfo } from "../types";
import { getListeningProcesses, getBulkProcessDetails, getProcessCwd } from "../lib/process";
import { findTerminalApp } from "../lib/terminal";
import { useInterval } from "./useInterval";

interface Preferences {
  refreshInterval: string;
  killTimeout: string;
  showMemory: boolean;
  showCPU: boolean;
  defaultAction: "kill" | "select";
}

export function useProcesses() {
  const preferences = getPreferenceValues<Preferences>();
  const refreshInterval = parseInt(preferences.refreshInterval || "3", 10) * 1000;

  const [state, setState] = useState<ProcessHunterState>({
    groups: [],
    selectedPids: new Set(),
    isLoading: true, // Shows loading bar, but doesn't block list
    lastRefresh: new Date(),
    error: null,
  });

  const fetchProcesses = useCallback(async () => {
    try {
      // Don't block UI with loading state
      setState((s) => ({ ...s, error: null }));

      // Phase 1: Get basic process info from lsof (fast!)
      const lsofProcesses = await getListeningProcesses();

      if (lsofProcesses.length === 0) {
        setState((s) => ({
          ...s,
          groups: [],
          isLoading: false,
          lastRefresh: new Date(),
        }));
        return;
      }

      // Create skeleton processes with basic info and show immediately
      const skeletonProcesses: ProcessInfo[] = lsofProcesses.map((p) => ({
        pid: p.pid,
        ppid: 0,
        name: p.name,
        command: p.name,
        cwd: "~",
        ports: p.ports,
        cpu: 0,
        memoryMB: 0,
        startTime: new Date(),
        uptime: "...",
      }));

      // Show skeleton UI immediately under "Detached" (we'll fix grouping later)
      const skeletonGroup: TerminalGroup = {
        name: "Detached",
        icon: "warning",
        processes: skeletonProcesses,
        isOrphaned: true,
      };

      setState((s) => ({
        ...s,
        groups: [skeletonGroup],
        isLoading: false,
        lastRefresh: new Date(),
      }));

      // Phase 2: Fetch full details in background
      const pidPortsMap = new Map(lsofProcesses.map((p) => [p.pid, p.ports]));
      const detailedProcesses = await getBulkProcessDetails(pidPortsMap);

      // Phase 3: Get terminal grouping
      const terminalPromises = detailedProcesses.map((proc) => findTerminalApp(proc.ppid));
      const terminals = await Promise.all(terminalPromises);

      const groupMap = new Map<string, TerminalGroup>();

      detailedProcesses.forEach((proc, i) => {
        const terminal = terminals[i];

        if (!groupMap.has(terminal.name)) {
          groupMap.set(terminal.name, {
            name: terminal.name,
            icon: terminal.icon,
            processes: [],
            isOrphaned: terminal.isOrphaned,
          });
        }

        groupMap.get(terminal.name)!.processes.push(proc);
      });

      const groups = Array.from(groupMap.values()).sort((a, b) => {
        if (a.isOrphaned !== b.isOrphaned) {
          return a.isOrphaned ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
      });

      setState((s) => ({
        ...s,
        groups,
        lastRefresh: new Date(),
      }));

      // Phase 4: Fetch cwds in background
      for (const group of groups) {
        for (const proc of group.processes) {
          getProcessCwd(proc.pid).then((cwd) => {
            if (cwd !== "~") {
              setState((s) => ({
                ...s,
                groups: s.groups.map((g) => ({
                  ...g,
                  processes: g.processes.map((p) => (p.pid === proc.pid ? { ...p, cwd } : p)),
                })),
              }));
            }
          });
        }
      }
    } catch (error) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, []);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  useInterval(fetchProcesses, refreshInterval > 0 ? refreshInterval : null);

  const toggleSelection = useCallback((pid: number) => {
    setState((s) => {
      const newSelected = new Set(s.selectedPids);
      if (newSelected.has(pid)) {
        newSelected.delete(pid);
      } else {
        newSelected.add(pid);
      }
      return { ...s, selectedPids: newSelected };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState((s) => ({ ...s, selectedPids: new Set() }));
  }, []);

  const selectAll = useCallback((pids: number[]) => {
    setState((s) => ({ ...s, selectedPids: new Set(pids) }));
  }, []);

  return {
    ...state,
    preferences,
    refresh: fetchProcesses,
    toggleSelection,
    clearSelection,
    selectAll,
  };
}
