import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '@thallesp/nestjs-better-auth';
import { PrismaService } from '../../lib/database/prisma.service';
import { HackathonController } from './hackathon.controller';
import { HackathonService } from './hackathon.service';

describe('HackathonController', () => {
  let controller: HackathonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HackathonController],
      providers: [HackathonService],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .useMocker((token) => {
      if (token === PrismaService) {
        return {};
      }
      })
      .compile();

    controller = module.get<HackathonController>(HackathonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
