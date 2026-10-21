import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateHackathonDto } from './dto/create-hackathon.dto';
import { UpdateHackathonDto } from './dto/update-hackathon.dto';

const hackathonSelect = {
  id: true,
  name: true,
  description: true,
  startDate: true,
  endDate: true,
  isActive: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.HackathonSelect;

@Injectable()
export class HackathonService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateHackathonDto, authorId: string) {
    return this.prisma.hackathon.create({
      data: {
        name: dto.name,
        description: dto.description,
        startDate: dto.startsAt,
        endDate: dto.endsAt,
        isActive: dto.isActive,
        author: {
          connect: { id: authorId },
        },
      },
      select: hackathonSelect,
    });
  }

  findAll() {
    return this.prisma.hackathon.findMany({
      select: hackathonSelect,
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id },
      select: hackathonSelect,
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID "${id}" not found`);
    }

    return hackathon;
  }

  async update(id: string, dto: UpdateHackathonDto) {
    await this.findOne(id);

    return this.prisma.hackathon.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        startDate: dto.startsAt,
        endDate: dto.endsAt,
        isActive: dto.isActive,
      },
      select: hackathonSelect,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.hackathon.delete({
      where: { id },
      select: hackathonSelect,
    });
  }

  async join(hackathonId: string, userId: string) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: {
        id: true,
        isActive: true,
        endDate: true,
      },
    });

    if (!hackathon) {
      throw new NotFoundException(
        `Hackathon with ID "${hackathonId}" not found`,
      );
    }

    if (!hackathon.isActive) {
      throw new BadRequestException('Hackathon is not active');
    }

    if (hackathon.endDate <= new Date()) {
      throw new BadRequestException('Hackathon has already ended');
    }

    try {
      return await this.prisma.hackathonParticipant.create({
        data: {
          hackathonId,
          userId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'You have already joined this hackathon',
        );
      }

      throw error;
    }
  }
}
