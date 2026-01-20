import { useState, useCallback, useEffect, useRef } from "react";
import { getPreferenceValues } from "@raycast/api";
import { TerminalGroup, ProcessHunterState, ProcessInfo } from "../types";
import {
  getListeningProcesses,
  getBulkProcessDetails,
  getBulkProcessStats,
  getProcessCwd,
} from "../lib/process";
import { findTerminalApp } from "../lib/terminal";
import { formatUptimeFromDate } from "../lib/utils";
import { useInterval } from "./useInterval";

interface CachedProcess extends ProcessInfo {
  terminalName: string;
  terminalIcon: string;
  isOrphaned: boolean;
}

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
    isLoading: true,
    lastRefresh: new Date(),
    error: null,
  });

  // Cache of known processes - static data persists across refreshes
  const processCache = useRef<Map<number, CachedProcess>>(new Map());

  const buildGroupsFromCache = useCallback(() => {
    const groupMap = new Map<string, TerminalGroup>();

    for (const proc of processCache.current.values()) {
      if (!groupMap.has(proc.terminalName)) {
        groupMap.set(proc.terminalName, {
          name: proc.terminalName,
          icon: proc.terminalIcon,
          processes: [],
          isOrphaned: proc.isOrphaned,
        });
      }
      groupMap.get(proc.terminalName)!.processes.push(proc);
    }

    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.isOrphaned !== b.isOrphaned) return a.isOrphaned ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, []);

  const fetchProcesses = useCallback(async () => {
    try {
      setState((s) => ({ ...s, error: null }));

      const lsofProcesses = await getListeningProcesses();
      const currentPids = new Set(lsofProcesses.map((p) => p.pid));
      const cachedPids = new Set(processCache.current.keys());

      // Find new and removed PIDs
      const newPids = lsofProcesses.filter((p) => !cachedPids.has(p.pid));
      const removedPids = [...cachedPids].filter((pid) => !currentPids.has(pid));
      const existingPids = [...cachedPids].filter((pid) => currentPids.has(pid));

      // Remove dead processes from cache
      for (const pid of removedPids) {
        processCache.current.delete(pid);
      }

      // Fetch full details for NEW processes only
      if (newPids.length > 0) {
        const pidPortsMap = new Map(newPids.map((p) => [p.pid, p.ports]));
        const detailedProcesses = await getBulkProcessDetails(pidPortsMap);

        const terminalPromises = detailedProcesses.map((proc) => findTerminalApp(proc.ppid));
        const terminals = await Promise.all(terminalPromises);

        detailedProcesses.forEach((proc, i) => {
          const terminal = terminals[i];
          processCache.current.set(proc.pid, {
            ...proc,
            terminalName: terminal.name,
            terminalIcon: terminal.icon,
            isOrphaned: terminal.isOrphaned,
          });
        });

        // Fetch cwds for new processes in background
        for (const proc of detailedProcesses) {
          getProcessCwd(proc.pid).then((cwd) => {
            if (cwd !== "~") {
              const cached = processCache.current.get(proc.pid);
              if (cached) {
                cached.cwd = cwd;
                setState((s) => ({
                  ...s,
                  groups: buildGroupsFromCache(),
                  lastRefresh: new Date(),
                }));
              }
            }
          });
        }
      }

      // Update stats (CPU/memory/uptime) for EXISTING processes only
      if (existingPids.length > 0) {
        const stats = await getBulkProcessStats(existingPids);
        for (const [pid, stat] of stats) {
          const cached = processCache.current.get(pid);
          if (cached) {
            cached.cpu = stat.cpu;
            cached.memoryMB = stat.memoryMB;
            cached.uptime = stat.uptime;
          }
        }
      }

      // Handle empty state
      if (processCache.current.size === 0) {
        setState((s) => ({ ...s, groups: [], isLoading: false, lastRefresh: new Date() }));
        return;
      }

      // Build groups from cache and update state
      setState((s) => ({
        ...s,
        groups: buildGroupsFromCache(),
        isLoading: false,
        lastRefresh: new Date(),
      }));
    } catch (error) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [buildGroupsFromCache]);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  useInterval(fetchProcesses, refreshInterval > 0 ? refreshInterval : null);

  // Update uptime displays every second (no network calls)
  const updateUptimes = useCallback(() => {
    if (processCache.current.size === 0) return;

    for (const proc of processCache.current.values()) {
      proc.uptime = formatUptimeFromDate(proc.startTime);
    }

    setState((s) => ({
      ...s,
      groups: buildGroupsFromCache(),
    }));
  }, [buildGroupsFromCache]);

  useInterval(updateUptimes, 1000);

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
