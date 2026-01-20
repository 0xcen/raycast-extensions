import { List, Icon, showToast, Toast, Action, ActionPanel } from "@raycast/api";
import { useProcesses } from "./hooks/useProcesses";
import { ProcessItem } from "./components/ProcessItem";
import { EmptyState } from "./components/EmptyState";
import { killProcessTree } from "./lib/kill";

export default function Command() {
  const {
    groups,
    selectedPids,
    isLoading,
    error,
    preferences,
    refresh,
    toggleSelection,
    clearSelection,
  } = useProcesses();

  const totalProcesses = groups.reduce((sum, g) => sum + g.processes.length, 0);

  const handleKillSelected = async () => {
    if (selectedPids.size === 0) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Killing ${selectedPids.size} processes...`,
    });

    let successCount = 0;
    let failCount = 0;

    for (const pid of selectedPids) {
      const results = await killProcessTree(pid);
      if (results.every((r) => r.success)) {
        successCount++;
      } else {
        failCount++;
      }
    }

    clearSelection();

    if (failCount === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Killed ${successCount} processes`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Killed ${successCount}, failed ${failCount}`;
    }

    refresh();
  };

  const handleKillSection = async (sectionName: string) => {
    const group = groups.find((g) => g.name === sectionName);
    if (!group) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Killing all ${group.name} processes...`,
    });

    let successCount = 0;
    let failCount = 0;

    for (const proc of group.processes) {
      const results = await killProcessTree(proc.pid);
      if (results.every((r) => r.success)) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (failCount === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Killed ${successCount} processes in ${group.name}`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Killed ${successCount}, failed ${failCount}`;
    }

    refresh();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter processes...">
      {error && <EmptyState error={error} onRefresh={refresh} />}
      {groups.map((group) => (
        <List.Section
          key={group.name}
          title={group.name}
          subtitle={`${group.processes.length} process${group.processes.length !== 1 ? "es" : ""}`}
        >
          {group.processes.map((proc) => (
            <ProcessItem
              key={proc.pid}
              process={proc}
              isSelected={selectedPids.has(proc.pid)}
              showMemory={preferences.showMemory}
              showCPU={preferences.showCPU}
              defaultAction={preferences.defaultAction || "kill"}
              onToggleSelect={toggleSelection}
              onKill={refresh}
              onKillSelected={handleKillSelected}
              onKillSection={() => handleKillSection(group.name)}
              selectedCount={selectedPids.size}
              sectionName={group.name}
            />
          ))}
        </List.Section>
      ))}

      <List.Section title={totalProcesses === 0 && !isLoading ? "No Processes Found" : "Actions"}>
        <List.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          subtitle={isLoading ? "Scanning..." : "Reload process list"}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
        {selectedPids.size > 0 && (
          <List.Item
            icon={Icon.XMarkCircleFilled}
            title={`Kill Selected (${selectedPids.size})`}
            subtitle="Kill all selected processes"
            actions={
              <ActionPanel>
                <Action
                  title={`Kill Selected (${selectedPids.size})`}
                  icon={Icon.XMarkCircleFilled}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                  onAction={handleKillSelected}
                />
                <Action title="Clear Selection" icon={Icon.Circle} onAction={clearSelection} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
