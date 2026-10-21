import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ArcjetPublic } from './common/decorators/arcjet-public.decorator';

@Controller()
@ArcjetPublic()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
