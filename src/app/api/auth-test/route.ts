import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({
        error: 'User already exists'
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        emailVerified: false
      }
    });

    // Create account for email provider
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: email,
        providerId: 'credential',
        password: hashedPassword
      }
    });

    // Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        token: `session_${Math.random().toString(36).substr(2, 9)}`
      }
    });

    return NextResponse.json({
      user,
      session
    });
  } catch (error: any) {
    console.error('Auth test error:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}