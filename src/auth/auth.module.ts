import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { PrismaModule } from '../lib/database/prisma.module';
import { PrismaService } from '../lib/database/prisma.service';
import { createAuth } from './auth';

@Module({
  imports: [
    PrismaModule,
    AuthModule.forRootAsync({
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        auth: createAuth(prisma),
      }),
    }),
  ],
  exports: [AuthModule],
})
export class AppAuthModule {}
