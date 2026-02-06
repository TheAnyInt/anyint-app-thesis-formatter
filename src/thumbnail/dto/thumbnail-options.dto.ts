import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ThumbnailOptionsDto {
  @ApiPropertyOptional({
    description: 'Width of the thumbnail in pixels',
    default: 300,
    minimum: 100,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000)
  width?: number = 300;

  @ApiPropertyOptional({
    description: 'Height of the thumbnail in pixels',
    default: 400,
    minimum: 100,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000)
  height?: number = 400;

  @ApiPropertyOptional({
    description: 'DPI resolution for PDF to image conversion',
    default: 150,
    minimum: 72,
    maximum: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(72)
  @Max(300)
  dpi?: number = 150;

  @ApiPropertyOptional({
    description: 'PNG compression level (1-9, higher = smaller file)',
    default: 8,
    minimum: 1,
    maximum: 9,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9)
  compressionLevel?: number = 8;
}
