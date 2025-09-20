import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Test database connection
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    // Count users
    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      tables,
      userCount,
      env: {
        hasDbUrl: !!process.env.DATABASE_URL,
        hasAuthSecret: !!process.env.BETTER_AUTH_SECRET,
        hasAuthUrl: !!process.env.BETTER_AUTH_URL,
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      code: error.code
    }, { status: 500 });
  }
}