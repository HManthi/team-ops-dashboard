import { describe, it, expect } from "vitest";
import { calculateTicketChanges } from "../ticketChangeLogic";

describe("calculateTicketChanges", () => {
    it("creates status_changed event when status changes", () => {
        const before = { status: "open", priority: "high", assignedToId: 1 } as const;
        const after = { status: "in_progress" } as const;

        const result = calculateTicketChanges(before, after);

        expect(result.updates).toEqual({ status: "in_progress" });
        expect(result.events).toEqual([
            { type: "status_changed", oldValue: "open", newValue: "in_progress" },
        ]);
    });

    it("creates priority_changed event when priority changes", () => {
        const before = { status: "open", priority: "medium", assignedToId: 1 } as const;
        const after = { priority: "high" } as const;

        const result = calculateTicketChanges(before, after);

        expect(result.updates).toEqual({ priority: "high" });
        expect(result.events).toEqual([
            { type: "priority_changed", oldValue: "medium", newValue: "high" },
        ]);
    });

    it("returns empty updates/events when nothing changes", () => {
        const before = { status: "open", priority: "high", assignedToId: 1 } as const;
        const after = { status: "open", priority: "high" } as const;

        const result = calculateTicketChanges(before, after);

        expect(result.updates).toEqual({});
        expect(result.events).toEqual([]);
    });

      it("creates assigned_changed event when assignee changes", () => {
            const before = { status: "open", priority: "high", assignedToId: 1 } as const;
            const after = { assignedToId: 2 } as const;

            const result = calculateTicketChanges(before, after);

            expect(result.updates).toEqual({ assignedToId: 2 });
            expect(result.events).toEqual([
            { type: "assigned_changed", oldValue: "1", newValue: "2" },
            ]);
        });

});

