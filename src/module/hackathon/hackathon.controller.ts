import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  Roles,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { HackathonService } from './hackathon.service';
import { CreateHackathonDto } from './dto/create-hackathon.dto';
import { UpdateHackathonDto } from './dto/update-hackathon.dto';

@Controller('hackathon')
export class HackathonController {
  constructor(private readonly hackathonService: HackathonService) {}

  @Post()
  @Roles(['ADMIN'])
  @ResponseMessage('Hackathon created successfully')
  create(
    @Body() dto: CreateHackathonDto,
    @Session() session: UserSession,
  ) {
    return this.hackathonService.create(dto, session.user.id);
  }

  @Get()
  findAll() {
    return this.hackathonService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hackathonService.findOne(id);
  }

  @Patch(':id')
  @Roles(['ADMIN'])
  @ResponseMessage('Hackathon updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateHackathonDto) {
    return this.hackathonService.update(id, dto);
  }

  @Delete(':id')
  @Roles(['ADMIN'])
  @ResponseMessage('Hackathon deleted successfully')
  remove(@Param('id') id: string) {
    return this.hackathonService.remove(id);
  }

  @Post(':id')
  @Roles(['PARTICIPANT'])
  @ResponseMessage('Joined hackathon successfully')
  join(
    @Param('id') id: string,
    @Query('join') joinQuery: string | undefined,
    @Session() session: UserSession,
  ) {
    if (joinQuery === undefined) {
      throw new BadRequestException(
        'The join query parameter is required',
      );
    }

    return this.hackathonService.join(id, session.user.id);
  }
}
