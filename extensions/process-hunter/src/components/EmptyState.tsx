import { List, Icon, Action, ActionPanel } from "@raycast/api";

interface EmptyStateProps {
  error: string | null;
  onRefresh: () => void;
}

export function EmptyState({ error, onRefresh }: EmptyStateProps) {
  if (error) {
    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Error"
        description={`Failed to load processes: ${error}`}
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefresh}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.EmptyView
      icon={Icon.CheckCircle}
      title="All Clear!"
      description="No dev servers or background tasks are currently running."
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}
