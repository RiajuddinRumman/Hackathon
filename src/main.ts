import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import { ArcjetGuard } from './common/guards/arcjet.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.useGlobalGuards(app.get(ArcjetGuard));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
