import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(req: NextRequest) {
  // URL: /api/tickets/:id/events
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // parts example: ["api","tickets","2","events"]
  const idPart = parts[2];

  const ticketId = Number(idPart);

  if (!idPart || Number.isNaN(ticketId)) {
    return NextResponse.json(
      { error: "Invalid ticket id", idPart, path: url.pathname },
      { status: 400 }
    );
  }

  try {
    const events = await prisma.ticketEvent.findMany({
      where: { ticketId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actor: { select: { id: true, email: true } },
      },
    });

    const result = events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      createdAt: e.createdAt,
      actor: { id: e.actor.id, email: e.actor.email },
      oldValue: e.oldValue,
      newValue: e.newValue,
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
