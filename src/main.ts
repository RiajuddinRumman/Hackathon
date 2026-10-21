import {
  BadRequestException,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module';
import { ArcjetGuard } from './common/guards/arcjet.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bodyParser: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors: ValidationError[]) => {
        const validationErrors = errors.map((error) => ({
          property: error.property,
          message: error.constraints
            ? Object.values(error.constraints)[0]
            : 'Invalid value',
        }));

        return new BadRequestException(validationErrors);
      },
    }),
  );
  app.useGlobalGuards(app.get(ArcjetGuard));
  app.useGlobalInterceptors(app.get(ResponseInterceptor));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
