import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins/admin';
import type { PrismaService } from '../lib/database/prisma.service';

export function createAuth(prisma: PrismaService) {
  const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
    'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins,
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      storeSessionInDatabase: true,
    },
    plugins: [
      admin({
        defaultRole: 'PARTICIPANT',
        adminRoles: ['ADMIN'],
      }),
    ],
  });
}
