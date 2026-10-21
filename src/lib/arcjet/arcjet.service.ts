import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import arcjet, {
  detectBot,
  shield,
  tokenBucket,
  type ArcjetNode,
} from '@arcjet/node';

@Injectable()
export class ArcjetService {
  private readonly logger = new Logger(ArcjetService.name);
  private readonly client: ArcjetNode<{ requested: number }>;
  private readonly publicClient: ArcjetNode<{ requested: number }>;

  constructor(configService: ConfigService) {
    const key = configService.get<string>('ARCJET_KEY');
    if (!key || key === 'ARCJET_KEY') {
      throw new Error('ARCJET_KEY must be configured before starting the application');
    }

    this.client = arcjet({
      key,
      rules: [
        shield({ mode: 'LIVE' }),
        tokenBucket({
          mode: 'LIVE',
          refillRate: 10,
          interval: 60,
          capacity: 100,
        }),
      ],
    });

    this.publicClient = this.client.withRule(
      detectBot({
        mode: 'LIVE',
        deny: ['CATEGORY:AI'],
      }),
    );
  }

  getClient(): ArcjetNode<{ requested: number }> {
    return this.client;
  }

  getPublicClient(): ArcjetNode<{ requested: number }> {
    return this.publicClient;
  }

  logErroredDecision(): void {
    this.logger.warn('Arcjet failed open while evaluating a request');
  }
}
