import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { error } from "console";

export async function POST(req: NextRequest) {
    let body:any;

    try{
        body = await req.json();
    } catch{
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { title, description, priority, assignedToId } = body;

    if (!title || typeof title !== "string"){
        return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    if (!description || typeof description !== "string") {
        return NextResponse.json({ error: "description is required" }, { status: 400 });
    }

    const allowedPriorities = ["low", "medium", "high"];
    if (!priority || !allowedPriorities.includes(priority)){
        return NextResponse.json(
            { error: "priority mush be low|medium|high" },
            { status: 400 }
        );
    }

    if(assignedToId !== undefined && typeof assignedToId !== "number") {
        return NextResponse.json(
            { error: "assignedToId must be a number" },
            { status: 400 }
        );
    }

    const ACTOR_USER_ID = 1;

    try {
        const created = await prisma.$transaction(async (tx) => {
            const ticket = await tx.ticket.create({
                data: {
                    title,
                    description,
                    priority,
                    status: "open",
                    createdById: ACTOR_USER_ID,
                    assignedToId: assignedToId ?? null,

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
                        assignedToId: assignedToId ?? null,
                    }),
                },
            });

            return ticket;
        });

        return NextResponse.json(created, { status: 201 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status"); // open | in_progress | closed
    const priority = searchParams.get("priority"); // low | medium | high
    const assignedToIdRaw = searchParams.get("assignedToId");
    const limitRaw = searchParams.get("limit");

    const assignedToId =
      assignedToIdRaw !== null ? Number(assignedToIdRaw) : undefined;

    const limit =
      limitRaw !== null ? Math.min(Math.max(Number(limitRaw), 1), 100) : 50;

    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToIdRaw !== null) {
      if (Number.isNaN(assignedToId)) {
        return NextResponse.json(
          { error: "assignedToId must be a number" },
          { status: 400 }
        );
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
        assignedTo: t.assignedTo
            ? { id: t.assignedTo.id, email: t.assignedTo.email }
            : null,
        createdBy: { id: t.createdBy.id, email: t.createdBy.email },
    }));


    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
