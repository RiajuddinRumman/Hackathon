import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../lib/database/prisma.service';
import { HackathonService } from './hackathon.service';

describe('HackathonService', () => {
  let service: HackathonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HackathonService],
    }).useMocker((token) => {
      if (token === PrismaService) {
        return {};
      }
    }).compile();

    service = module.get<HackathonService>(HackathonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
