import { List, Icon, Color, Action, ActionPanel, showToast, Toast, open } from "@raycast/api";
import { ProcessInfo } from "../types";
import { truncatePath, truncateCommand } from "../lib/utils";
import { killProcessTree } from "../lib/kill";

interface ProcessItemProps {
  process: ProcessInfo;
  isSelected: boolean;
  showMemory: boolean;
  showCPU: boolean;
  defaultAction: "kill" | "select";
  onToggleSelect: (pid: number) => void;
  onKill: () => void;
  onKillSelected: () => void;
  onKillSection: () => void;
  selectedCount: number;
  sectionName: string;
}

export function ProcessItem({
  process,
  isSelected,
  showMemory,
  showCPU,
  defaultAction,
  onToggleSelect,
  onKill,
  onKillSelected,
  onKillSection,
  selectedCount,
  sectionName,
}: ProcessItemProps) {
  const accessories: List.Item.Accessory[] = [];

  if (process.ports.length > 0) {
    accessories.push({
      tag: { value: `:${process.ports.join(",")}`, color: Color.Blue },
      tooltip: `Port${process.ports.length > 1 ? "s" : ""}: ${process.ports.join(", ")}`,
    });
  }

  accessories.push({
    text: process.uptime,
    tooltip: `Started: ${process.startTime.toLocaleString()}`,
  });

  if (showMemory) {
    const memoryText =
      process.memoryMB >= 1024
        ? `${(process.memoryMB / 1024).toFixed(1)} GB`
        : `${process.memoryMB} MB`;
    accessories.push({
      text: memoryText,
      tooltip: `Memory: ${process.memoryMB} MB`,
    });
  }

  if (showCPU) {
    accessories.push({
      text: `${process.cpu.toFixed(1)}%`,
      tooltip: `CPU: ${process.cpu.toFixed(1)}%`,
    });
  }

  const handleKillProcess = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Killing process...",
    });

    const results = await killProcessTree(process.pid);
    const success = results.every((r) => r.success);
    const wasForced = results.some((r) => r.wasForced);

    if (success) {
      toast.style = Toast.Style.Success;
      toast.title = wasForced ? "Force killed process" : "Killed process";
      toast.message = truncateCommand(process.command, 40);
      onKill();
    } else {
      const failed = results.find((r) => !r.success);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to kill process";
      toast.message = failed?.error || "Unknown error";
    }
  };

  const handleOpenBrowser = async () => {
    if (process.ports.length > 0) {
      await open(`http://localhost:${process.ports[0]}`);
    }
  };

  return (
    <List.Item
      key={process.pid}
      icon={isSelected ? Icon.CheckCircle : Icon.Circle}
      title={truncateCommand(process.command)}
      subtitle={truncatePath(process.cwd)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Process Actions">
            {defaultAction === "select" ? (
              <>
                <Action
                  title={isSelected ? "Deselect" : "Select"}
                  icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={() => onToggleSelect(process.pid)}
                />
                <Action
                  title="Kill Process"
                  icon={Icon.XMarkCircle}
                  shortcut={{ modifiers: ["cmd"], key: "k" }}
                  onAction={handleKillProcess}
                />
              </>
            ) : (
              <>
                <Action
                  title="Kill Process"
                  icon={Icon.XMarkCircle}
                  shortcut={{ modifiers: ["cmd"], key: "k" }}
                  onAction={handleKillProcess}
                />
                <Action
                  title={isSelected ? "Deselect" : "Select"}
                  icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={() => onToggleSelect(process.pid)}
                />
              </>
            )}
            {selectedCount > 0 && (
              <Action
                title={`Kill Selected (${selectedCount})`}
                icon={Icon.XMarkCircleFilled}
                shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                onAction={onKillSelected}
              />
            )}
            <Action
              title={`Kill All in ${sectionName}`}
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "opt"], key: "k" }}
              onAction={onKillSection}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick Actions">
            {process.ports.length > 0 && (
              <>
                <Action
                  title="Open in Browser"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={handleOpenBrowser}
                />
                <Action.CopyToClipboard
                  title="Copy Port"
                  content={process.ports[0].toString()}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </>
            )}
            <Action.ShowInFinder
              title="Reveal in Finder"
              path={process.cwd.replace("~", globalThis.process?.env?.HOME || "")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            <Action.CopyToClipboard title="Copy Command" content={process.command} />
            <Action.CopyToClipboard title="Copy Pid" content={process.pid.toString()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
