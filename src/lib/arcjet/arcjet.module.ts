import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArcjetService } from './arcjet.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ArcjetService],
  exports: [ArcjetService],
})
export class ArcjetModule {}
