import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking orders in database...\n");

    const count = await prisma.order.count();
    console.log(`Total orders: ${count}`);

    if (count > 0) {
      const orders = await prisma.order.findMany({
        take: 3,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          items: true,
          address: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      console.log("\nFirst 3 orders:");
      orders.forEach((order, i) => {
        console.log(`\n${i + 1}. Order #${order.code}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Method: ${order.method}`);
        console.log(`   Total: ${order.total}`);
        console.log(`   User: ${order.user?.name} (${order.user?.email})`);
        console.log(`   Items: ${order.items.length}`);
        console.log(`   Created: ${order.createdAt}`);
      });
    } else {
      console.log("\nNo orders found in database!");
      console.log("You need to create some orders first from the Client app.");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
