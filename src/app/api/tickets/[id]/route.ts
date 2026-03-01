import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { calculateTicketChanges } from "../../../../lib/ticketChangeLogic";

type Status = "open" | "in_progress" | "closed";
type Priority = "low" | "medium" | "high";

const allowedStatus: Status[] = ["open", "in_progress", "closed"];
const allowedPriority: Priority[] = ["low", "medium", "high"];

type PatchBody = {
  status?: Status;
  priority?: Priority;
  assignedToId?: number | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PATCH(req: NextRequest) {
  // URL: /api/tickets/:id
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idPart = parts[2];
  const ticketId = Number(idPart);

  if (!idPart || Number.isNaN(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isObject(rawBody)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const body: PatchBody = {
    status: rawBody.status as PatchBody["status"],
    priority: rawBody.priority as PatchBody["priority"],
    assignedToId: rawBody.assignedToId as PatchBody["assignedToId"],
  };

  // Validate partial fields
  if (body.status !== undefined && !allowedStatus.includes(body.status)) {
    return NextResponse.json(
      { error: "status must be open|in_progress|closed" },
      { status: 400 }
    );
  }

  if (body.priority !== undefined && !allowedPriority.includes(body.priority)) {
    return NextResponse.json(
      { error: "priority must be low|medium|high" },
      { status: 400 }
    );
  }

  if (
    body.assignedToId !== undefined &&
    body.assignedToId !== null &&
    typeof body.assignedToId !== "number"
  ) {
    return NextResponse.json({ error: "assignedToId must be a number or null" }, { status: 400 });
  }

  // TEMP until auth exists
  const ACTOR_USER_ID = 1;

  try {
    const updatedTicket = await prisma.$transaction(async (tx) => {
      const existing = await tx.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!existing) return null;

      const { updates, events } = calculateTicketChanges(
        {
          status: existing.status as Status,
          priority: existing.priority as Priority,
          assignedToId: existing.assignedToId,
        },
        {
          status: body.status,
          priority: body.priority,
          assignedToId: body.assignedToId,
        }
      );

      if (Object.keys(updates).length === 0) {
        return existing;
      }

      const ticket = await tx.ticket.update({
        where: { id: ticketId },
        data: updates,
      });

      for (const e of events) {
        await tx.ticketEvent.create({
          data: {
            ticketId: ticket.id,
            eventType: e.type,
            actorUserId: ACTOR_USER_ID,
            oldValue: e.oldValue,
            newValue: e.newValue,
          },
        });
      }

      return ticket;
    });

    if (!updatedTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTicket, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
