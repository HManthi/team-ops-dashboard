import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { error } from "console";
import { calculateTicketChanges } from "@/lib/ticketChangeLogic";

const allowedStatus = ["open", "in_progress", "closed"] as const;
const allowedPriority = ["low", "medium", "high"] as const;


export async function PATCH(req: NextRequest) {
    
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);

    const idPart = parts[2];
    const ticketId = Number(idPart);

    if(!idPart || Number.isNaN(ticketId)) {
        return NextResponse.json({ error: "Invalid ticket id" }, {status: 400 });
    }

    let body: any;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { status, priority, assignedToId } = body;

    if(status !== undefined && !allowedStatus.includes(status)){
        return NextResponse.json(
            { error: "Priority must be low|medium|high" },
            { status: 400 }
        );
    }

    if(assignedToId !== undefined && typeof assignedToId !== "number"){
        return NextResponse.json(
            { error: "assignedToId must be a number" },
            { status: 400 }
        );
    }

    //temp auth id
    const ACTOR_USER_ID = 1;

    try {
        const updatedTicket = await prisma.$transaction(async (tx) => {
            const existing = await tx.ticket.findUnique({
                where: { id: ticketId },
            });

            if(!existing){
                return null;
            }

            const { updates, events } = calculateTicketChanges(
                {
                    status: existing.status as any,
                    priority: existing.priority as any,
                    assignedToId: existing.assignedToId,
                },
                {
                    status,
                    priority,
                    assignedToId,
                }
                );

                // No changes? return existing
                if (Object.keys(updates).length === 0) {
                return existing;
                }

                const ticket = await tx.ticket.update({
                where: { id: ticketId },
                data: updates,
                });

                // create events
                for (const e of events) {
                await tx.ticketEvent.create({
                    data: {
                    ticketId: ticket.id,
                    eventType: e.type as any,
                    actorUserId: ACTOR_USER_ID,
                    oldValue: e.oldValue,
                    newValue: e.newValue,
                    },
                });
                }

                return ticket;

        });

        if(!updatedTicket){
            return NextResponse.json({error: "Ticket is not found" }, {status: 404 });
        }

        return NextResponse.json(updatedTicket, {status: 200});
    } catch (err) {
        console.error(err);
        return NextResponse.json({error: "Internal server error" }, {status: 500});
    }
}