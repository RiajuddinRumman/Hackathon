import { Controller, Get } from '@nestjs/common';
import {
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';

@Controller('users')
export class UsersController {
  @Get('me')
  getCurrentUser(@Session() session: UserSession) {
    return {
      user: session.user,
    };
  }
}
