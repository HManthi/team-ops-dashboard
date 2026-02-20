export type TicketSnapshot = {
  status: "open" | "in_progress" | "closed";
  priority: "low" | "medium" | "high";
  assignedToId: number | null;
};

export type ChangeEvent = {
  type: "status_changed" | "priority_changed" | "assigned_changed";
  oldValue: string | null;
  newValue: string | null;
};

export function calculateTicketChanges(
  before: TicketSnapshot,
  after: Partial<TicketSnapshot>
) {
  const events: ChangeEvent[] = [];
  const updates: Partial<TicketSnapshot> = {};

  if (after.status && after.status !== before.status) {
    updates.status = after.status;
    events.push({
      type: "status_changed",
      oldValue: before.status,
      newValue: after.status,
    });
  }

  if (after.priority && after.priority !== before.priority) {
    updates.priority = after.priority;
    events.push({
      type: "priority_changed",
      oldValue: before.priority,
      newValue: after.priority,
    });
  }

  if (
    after.assignedToId !== undefined &&
    after.assignedToId !== before.assignedToId
  ) {
    updates.assignedToId = after.assignedToId;
    events.push({
      type: "assigned_changed",
      oldValue: before.assignedToId === null ? null : String(before.assignedToId),
      newValue: after.assignedToId === null ? null : String(after.assignedToId),
    });
  }

  return { updates, events };
}
