import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsAfterDate } from '../../../common/validators/is-after-date.validator';
import { IsFutureDate } from '../../../common/validators/is-future-date.validator';

export class CreateHackathonDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @Type(() => Date)
  @IsDate()
  @IsFutureDate()
  startsAt!: Date;

  @Type(() => Date)
  @IsDate()
  @IsFutureDate()
  @IsAfterDate('startsAt')
  endsAt!: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
