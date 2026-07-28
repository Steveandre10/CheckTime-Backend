const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Connecting...");
  await prisma.$connect();
  console.log("Connected successfully!");
}

main()
  .catch(err => {
    console.error("Connection failed!");
    console.error(err);
  })
  .finally(() => prisma.$disconnect());
