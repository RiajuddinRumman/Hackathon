import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArcjetGuard } from './common/guards/arcjet.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ArcjetModule } from './lib/arcjet/arcjet.module';
import { PrismaModule } from './lib/database/prisma.module';
import { AppAuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HackathonModule } from './module/hackathon/hackathon.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ArcjetModule,
    PrismaModule,
    AppAuthModule,
    UsersModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'Hackathon',
    }),
    HackathonModule,
  ],
  controllers: [AppController],
  providers: [AppService, ArcjetGuard, ResponseInterceptor],
})
export class AppModule {}
