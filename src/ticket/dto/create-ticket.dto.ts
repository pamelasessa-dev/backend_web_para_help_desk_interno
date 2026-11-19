import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { Priority } from '../../generated/prisma/client.js';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Título breve del ticket',
    example: 'No puedo acceder al sistema',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Descripción detallada del problema',
    example: 'Al ingresar mis credenciales aparece un error de acceso.',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Prioridad del ticket',
    enum: Priority,
    example: Priority.ALTA,
  })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({
    description: 'ID de la categoría del ticket',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  categoryId: number;
}