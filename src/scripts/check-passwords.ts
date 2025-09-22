/**
 * Check password storage in accounts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkPasswords() {
  try {
    const accounts = await prisma.account.findMany({
      where: {
        user: {
          email: "sabaysmu@gmail.com"
        }
      },
      include: {
        user: true
      }
    });

    console.log("Account for sabaysmu@gmail.com:");
    accounts.forEach(account => {
      console.log(`  Provider: ${account.providerId}`);
      console.log(`  Has password: ${!!account.password}`);
      console.log(`  Password hash: ${account.password ? account.password.substring(0, 20) + '...' : 'NULL'}`);
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswords();