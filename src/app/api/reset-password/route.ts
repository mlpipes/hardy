import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({
        error: { message: 'Email and new password are required' }
      }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({
        error: { message: 'User not found' }
      }, { status: 404 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Find existing account (credential or email)
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: {
          in: ['email', 'credential']
        }
      }
    });

    let account;
    if (existingAccount) {
      // Update existing account password
      account = await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword }
      });
    } else {
      // Create new account
      account = await prisma.account.create({
        data: {
          userId: user.id,
          accountId: email,
          providerId: 'email',
          password: hashedPassword
        }
      });
    }

    return NextResponse.json({
      message: 'Password reset successfully',
      accountId: account.id
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json({
      error: { message: 'Failed to reset password' }
    }, { status: 500 });
  }
}