require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = "admin@teamops.local";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: "admin123", // plain for now, we’ll hash later
      role: "admin",
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      title: "Sample: Investigate API latency spike",
      description: "Users reported slow responses. Investigate DB and API logs.",
      status: "open",
      priority: "high",
      createdById: admin.id,
      assignedToId: admin.id,
      events: {
        create: {
          eventType: "ticket_created",
          actorUserId: admin.id,
          oldValue: null,
          newValue: "ticket created",
        },
      },
    },
    include: { events: true },
  });

  console.log("Seed complete!!");
  console.log({ admin: admin.email, ticketId: ticket.id, events: ticket.events.length });
}

main()
  .catch((e) => {
    console.error("Seed failed!", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
