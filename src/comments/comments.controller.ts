import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { Request } from 'express';

import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Role } from '../generated/prisma/enums.js';

@ApiTags('Comentarios')
@ApiBearerAuth()
@Controller('tickets/:ticketId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un comentario' })
  @ApiParam({ name: 'ticketId', example: 1 })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({
    status: 201,
    description: 'Comentario creado correctamente.',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para comentar en este ticket.',
  })
  create(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: number; role: string };

    return this.commentsService.create(
      ticketId,
      createCommentDto,
      user.sub,
      user.role,
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar un comentario propio',
    description: 'Solamente el autor del comentario puede modificarlo.',
  })
  @ApiParam({ name: 'ticketId', example: 1 })
  @ApiParam({ name: 'id', description: 'ID del comentario', example: 1 })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comentario actualizado correctamente.',
  })
  @ApiResponse({
    status: 403,
    description: 'No puedes editar este comentario.',
  })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado.' })
  update(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: number; role: string };

    return this.commentsService.update(
      ticketId,
      id,
      updateCommentDto,
      user.sub,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar un comentario propio',
    description: 'Solamente el autor del comentario puede eliminarlo.',
  })
  @ApiParam({ name: 'ticketId', example: 1 })
  @ApiParam({ name: 'id', description: 'ID del comentario', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Comentario eliminado correctamente.',
  })
  @ApiResponse({
    status: 403,
    description: 'No puedes eliminar este comentario.',
  })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado.' })
  remove(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: number; role: string };

    return this.commentsService.remove(ticketId, id, user.sub);
  }

  @Get('ticket/:ticketId')
  @ApiOperation({ summary: 'Obtener historial de comentarios' })
  findHistorial(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: number; role: string };

    return this.commentsService.findHistorial(
      ticketId,
      user.sub,
      user.role as Role,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener comentario por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as { sub: number; role: string };

    return this.commentsService.findOne(id, user.sub, user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Listar comentarios de un ticket' })
  findAll(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: number; role: string };

    return this.commentsService.findAll(ticketId, user.sub, user.role);
  }
}