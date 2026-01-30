import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

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