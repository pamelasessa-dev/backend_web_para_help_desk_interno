import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto.js';
import {
  Role,
  NotificationType,
  TicketStatus,
} from '../generated/prisma/enums.js';
import { AssignTicketDto } from './dto/assign-ticket.dto.js';
import { NotificationService } from '../notifications/notification.service.js';

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createTicketDto: CreateTicketDto, userId: number) {
    const category = await this.prisma.category.findUnique({
      where: {
        id: createTicketDto.categoryId,
      },
    });

    if (!category) {
      throw new NotFoundException('La categoría no existe');
    }

    return this.prisma.ticket.create({
      data: {
        title: createTicketDto.title,
        description: createTicketDto.description,
        priority: createTicketDto.priority,
        status: 'ABIERTO',
        createdById: userId,
        categoryId: createTicketDto.categoryId,
      },
    });
  }
  async findAll(userId: number, userRole: string) {
    return this.prisma.ticket.findMany({
      where: userRole === 'EMPLEADO' ? { createdById: userId } : undefined,
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number, userId: number, userRole: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: userRole === 'EMPLEADO' ? { id, createdById: userId } : { id },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('El ticket no existe');
    }

    return ticket;
  }

  async updateStatus(
    id: number,
    updateTicketStatusDto: UpdateTicketStatusDto,
    userId: number,
    userRole: string,
  ) {
    if (userRole !== 'ADMIN' && userRole !== 'AGENTE') {
      throw new ForbiddenException(
        'Solo ADMIN o AGENTE pueden cambiar el estado del ticket',
      );
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: {
        id,
      },
    });

    if (!ticket) {
      throw new NotFoundException('El ticket no existe');
    }

    if (userRole === 'AGENTE' && ticket.assignedToId !== userId) {
      throw new ForbiddenException(
        'Solo puedes cambiar el estado de los tickets que tienes asignados',
      );
    }

    const transicionesPermitidas: Record<string, string[]> = {
      ABIERTO: ['EN_PROCESO', 'CERRADO'],
      EN_PROCESO: ['RESUELTO', 'CERRADO'],
      RESUELTO: ['CERRADO'],
      CERRADO: [],
    };

    const estadosPermitidos = transicionesPermitidas[ticket.status];

    if (!estadosPermitidos.includes(updateTicketStatusDto.status)) {
      throw new BadRequestException(
        `No se puede cambiar el ticket de ${ticket.status} a ${updateTicketStatusDto.status}`,
      );
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: {
        id,
      },
      data: {
        status: updateTicketStatusDto.status,
      },
    });

    if (updateTicketStatusDto.status === 'RESUELTO') {
      await this.notificationService.enviar(
        ticket.createdById,
        'Tu ticket ha sido resuelto.',
        NotificationType.TICKET_RESUELTO,
        ticket.id,
      );
    }

    if (updateTicketStatusDto.status === 'CERRADO') {
      await this.notificationService.enviar(
        ticket.createdById,
        'Tu ticket ha sido cerrado.',
        NotificationType.TICKET_CERRADO,
        ticket.id,
      );
    }

    return updatedTicket;
  }

  async remove(id: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('El ticket no existe');
    }

    await this.prisma.notification.deleteMany({
      where: {
        ticketId: id,
      },
    });

    await this.prisma.comment.deleteMany({
      where: {
        ticketId: id,
      },
    });

    await this.prisma.ticket.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Ticket eliminado correctamente',
    };
  }

  async assign(
    id: number,
    assignTicketDto: AssignTicketDto,
    userId: number,
    userRole: string,
  ) {
    // Solo ADMIN y AGENTE pueden asignar tickets.
    if (userRole !== Role.ADMIN && userRole !== Role.AGENTE) {
      throw new ForbiddenException('No tienes permisos para asignar tickets');
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('El ticket no existe');
    }

    // El AGENTE solo puede asignarse tickets a sí mismo.
    if (userRole === Role.AGENTE && assignTicketDto.assignedToId !== userId) {
      throw new ForbiddenException(
        'Como agente solo puedes asignarte tickets a ti mismo',
      );
    }

    // No puede tomar tickets asignados a otro agente.
    if (
      userRole === Role.AGENTE &&
      ticket.assignedToId !== null &&
      ticket.assignedToId !== userId
    ) {
      throw new ForbiddenException(
        'Este ticket ya está asignado a otro agente',
      );
    }

    // El destinatario debe existir y tener rol AGENTE.
    const agent = await this.prisma.user.findUnique({
      where: {
        id: assignTicketDto.assignedToId,
      },
    });

    if (!agent || agent.role !== Role.AGENTE) {
      throw new BadRequestException(
        'El agente no existe o no tiene el rol adecuado',
      );
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        assignedToId: agent.id,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await this.notificationService.enviar(
      agent.id,
      `El ticket #${ticket.id} "${ticket.title}" ha sido asignado a ti.`,
      NotificationType.TICKET_ASIGNADO,
      ticket.id,
    );

    return updatedTicket;
  }
  async getMetrics() {
    const [totalTickets, ticketsByCategory, ticketsByStatus, categories] =
      await Promise.all([
        this.prisma.ticket.count(),

        this.prisma.ticket.groupBy({
          by: ['categoryId'],
          _count: {
            _all: true,
          },
        }),

        this.prisma.ticket.groupBy({
          by: ['status'],
          _count: {
            _all: true,
          },
        }),

        this.prisma.category.findMany({
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            id: 'asc',
          },
        }),
      ]);

    const byCategory = categories.map((category) => {
      const categoryMetric = ticketsByCategory.find(
        (item) => item.categoryId === category.id,
      );

      return {
        categoryId: category.id,
        categoryName: category.name,
        total: categoryMetric?._count._all ?? 0,
      };
    });

    const byStatus = Object.values(TicketStatus).map((status) => {
      const statusMetric = ticketsByStatus.find(
        (item) => item.status === status,
      );

      return {
        status,
        total: statusMetric?._count._all ?? 0,
      };
    });

    return {
      totalTickets,
      byCategory,
      byStatus,
    };
  }
}
