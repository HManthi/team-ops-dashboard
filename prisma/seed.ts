import Prisma, { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@teamops.local";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      // NOTE: plain text for now; we'll hash when we implement auth.
      password: "admin123",
      role: Prisma.$Enums.Role.admin,
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      title: "Sample: Investigate API latency spike",
      description: "Users reported slow responses. Investigate DB and API logs.",
      status: Prisma.$Enums.TicketStatus.open,
      priority: Prisma.$Enums.TicketPriority.high,
      createdById: admin.id,
      assignedToId: admin.id,
      events: {
        create: {
          eventType: Prisma.$Enums.TicketEventType.ticket_created,
          actorUserId: admin.id,
          oldValue: null,
          newValue: "ticket created",
        },
      },
    },
    include: { events: true },
  });

  console.log("Seed complete ✅");
  console.log({ admin: admin.email, ticketId: ticket.id, events: ticket.events.length });
}

main()
  .catch((e) => {
    console.error("Seed failed ❌", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
