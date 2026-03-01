import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import type { Prisma } from "@prisma/client";

type Priority = "low" | "medium" | "high";
type Status = "open" | "in_progress" | "closed";

const allowedPriorities: Priority[] = ["low", "medium", "high"];
const allowedStatuses: Status[] = ["open", "in_progress", "closed"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: NextRequest) {
  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isObject(rawBody)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const title = rawBody.title;
  const description = rawBody.description;
  const priority = rawBody.priority;
  const assignedToId = rawBody.assignedToId;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  if (typeof priority !== "string" || !allowedPriorities.includes(priority as Priority)) {
    return NextResponse.json(
      { error: "priority must be low|medium|high" },
      { status: 400 }
    );
  }

  if (assignedToId !== undefined && typeof assignedToId !== "number") {
    return NextResponse.json({ error: "assignedToId must be a number" }, { status: 400 });
  }

  // TEMP until auth exists
  const ACTOR_USER_ID = 1;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          title,
          description,
          priority: priority as Priority,
          status: "open",
          createdById: ACTOR_USER_ID,
          assignedToId: typeof assignedToId === "number" ? assignedToId : null,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: "ticket_created",
          actorUserId: ACTOR_USER_ID,
          oldValue: null,
          newValue: JSON.stringify({
            title,
            description,
            priority,
            assignedToId: typeof assignedToId === "number" ? assignedToId : null,
          }),
        },
      });

      return ticket;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedToIdRaw = searchParams.get("assignedToId");
    const limitRaw = searchParams.get("limit");

    const limit = limitRaw ? Math.min(Math.max(Number(limitRaw), 1), 100) : 50;

    if (Number.isNaN(limit)) {
      return NextResponse.json({ error: "limit must be a number" }, { status: 400 });
    }

    const where: Prisma.TicketWhereInput = {};

    if (status) {
      if (!allowedStatuses.includes(status as Status)) {
        return NextResponse.json(
          { error: "status must be open|in_progress|closed" },
          { status: 400 }
        );
      }
      where.status = status as Status;
    }

    if (priority) {
      if (!allowedPriorities.includes(priority as Priority)) {
        return NextResponse.json(
          { error: "priority must be low|medium|high" },
          { status: 400 }
        );
      }
      where.priority = priority as Priority;
    }

    if (assignedToIdRaw !== null) {
      const assignedToId = Number(assignedToIdRaw);
      if (Number.isNaN(assignedToId)) {
        return NextResponse.json({ error: "assignedToId must be a number" }, { status: 400 });
      }
      where.assignedToId = assignedToId;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        assignedTo: { select: { id: true, email: true } },
        createdBy: { select: { id: true, email: true } },
      },
    });

    const result = tickets.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      assignedTo: t.assignedTo ? { id: t.assignedTo.id, email: t.assignedTo.email } : null,
      createdBy: { id: t.createdBy.id, email: t.createdBy.email },
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
