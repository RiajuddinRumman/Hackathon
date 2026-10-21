import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ArcjetService } from '../../lib/arcjet/arcjet.service';
import { ARCJET_PUBLIC_KEY } from '../decorators/arcjet-public.decorator';

@Injectable()
export class ArcjetGuard implements CanActivate {
  private readonly logger = new Logger(ArcjetGuard.name);

  constructor(
    private readonly arcjetService: ArcjetService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      ARCJET_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    const client = isPublic
      ? this.arcjetService.getPublicClient()
      : this.arcjetService.getClient();
    const decision = await client.protect(request, { requested: 1 });

    if (decision.isErrored()) {
      this.arcjetService.logErroredDecision();
      return true;
    }

    if (!decision.isDenied()) {
      return true;
    }

    if (decision.reason.isRateLimit()) {
      throw new HttpException({
        error: 'Too Many Requests',
        message: 'Request rate limit exceeded',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    this.logger.warn(`Arcjet denied request: ${decision.reason.type}`);
    throw new ForbiddenException({
      error: 'Forbidden',
      message: 'Request blocked by security policy',
    });
  }
}
