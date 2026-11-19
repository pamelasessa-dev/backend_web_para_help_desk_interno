import 'dotenv/config';

import {
  PrismaClient,
  Role,
  TicketStatus,
  Priority,
} from '../src/generated/prisma/client.js';

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando limpieza de la base de datos...');

  // Eliminar datos respetando las relaciones
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('Datos anteriores eliminados correctamente.');

  // Contraseña común para los usuarios de prueba
  const password = await bcrypt.hash('12345678', 10);

  // Crear usuarios
  await prisma.user.createMany({
    data: [
      {
        name: 'Admin',
        lastName: 'Sistema',
        email: 'admin@helpdesk.com',
        password,
        role: Role.ADMIN,
      },
      {
        name: 'Lucas',
        lastName: 'Soporte',
        email: 'lucas@helpdesk.com',
        password,
        role: Role.AGENTE,
      },
      {
        name: 'Maria',
        lastName: 'Soporte',
        email: 'maria@helpdesk.com',
        password,
        role: Role.AGENTE,
      },
      {
        name: 'Juan',
        lastName: 'Empleado',
        email: 'juan@helpdesk.com',
        password,
        role: Role.EMPLEADO,
      },
    ],
  });

  console.log('Usuarios creados.');

  // Crear categorías
  await prisma.category.createMany({
    data: [
      {
        name: 'Hardware',
        description:
          'Problemas relacionados con computadoras, impresoras y dispositivos.',
      },
      {
        name: 'Software',
        description:
          'Problemas relacionados con aplicaciones, sistemas y programas.',
      },
      {
        name: 'Acceso',
        description:
          'Problemas relacionados con contraseñas, cuentas y permisos.',
      },
      {
        name: 'Redes',
        description:
          'Problemas relacionados con internet, Wi-Fi y conexiones de red.',
      },
    ],
  });

  console.log('Categorías creadas.');

  // Recuperar usuarios
  const juan = await prisma.user.findUniqueOrThrow({
    where: { email: 'juan@helpdesk.com' },
  });

  const lucas = await prisma.user.findUniqueOrThrow({
    where: { email: 'lucas@helpdesk.com' },
  });

  const maria = await prisma.user.findUniqueOrThrow({
    where: { email: 'maria@helpdesk.com' },
  });

  // Recuperar categorías
  const hardware = await prisma.category.findUniqueOrThrow({
    where: { name: 'Hardware' },
  });

  const software = await prisma.category.findUniqueOrThrow({
    where: { name: 'Software' },
  });

  const acceso = await prisma.category.findUniqueOrThrow({
    where: { name: 'Acceso' },
  });

  const redes = await prisma.category.findUniqueOrThrow({
    where: { name: 'Redes' },
  });

  // Crear tickets
  const ticketAbierto = await prisma.ticket.create({
    data: {
      title: 'La computadora no enciende',
      description:
        'La computadora de la oficina no enciende al presionar el botón de encendido.',
      status: TicketStatus.ABIERTO,
      priority: Priority.ALTA,
      createdById: juan.id,
      categoryId: hardware.id,
    },
  });

  const ticketEnProceso = await prisma.ticket.create({
    data: {
      title: 'Problema con el sistema de ventas',
      description:
        'El sistema de ventas presenta errores al momento de iniciar sesión.',
      status: TicketStatus.EN_PROCESO,
      priority: Priority.MEDIA,
      createdById: juan.id,
      assignedToId: lucas.id,
      categoryId: software.id,
    },
  });

  const ticketResuelto = await prisma.ticket.create({
    data: {
      title: 'No puedo acceder a mi cuenta',
      description:
        'El usuario no puede ingresar a su cuenta porque olvidó su contraseña.',
      status: TicketStatus.RESUELTO,
      priority: Priority.ALTA,
      createdById: juan.id,
      assignedToId: maria.id,
      categoryId: acceso.id,
    },
  });

  const ticketCerrado = await prisma.ticket.create({
    data: {
      title: 'Problemas de conexión Wi-Fi',
      description:
        'La conexión Wi-Fi de la oficina se desconecta constantemente.',
      status: TicketStatus.CERRADO,
      priority: Priority.BAJA,
      createdById: juan.id,
      assignedToId: lucas.id,
      categoryId: redes.id,
    },
  });

  console.log('Tickets creados.');

  // Crear comentarios
  await prisma.comment.createMany({
    data: [
      // Ticket abierto y pendiente de asignación:
      // únicamente tiene el comentario inicial del empleado.
      {
        content:
          'El problema comenzó esta mañana y la computadora no muestra ninguna señal de encendido.',
        ticketId: ticketAbierto.id,
        userId: juan.id,
      },

      // Ticket en proceso, asignado a Lucas.
      {
        content:
          'Estoy revisando el error de inicio de sesión y los registros del sistema.',
        ticketId: ticketEnProceso.id,
        userId: lucas.id,
      },
      {
        content:
          'Se encontró un problema con la configuración del sistema. Se está aplicando una corrección.',
        ticketId: ticketEnProceso.id,
        userId: maria.id,
      },

      // Ticket resuelto, asignado a María.
      {
        content:
          'Se restableció la contraseña y el usuario ya puede ingresar nuevamente.',
        ticketId: ticketResuelto.id,
        userId: maria.id,
      },
      {
        content: 'Confirmo que ya puedo acceder a mi cuenta. Muchas gracias.',
        ticketId: ticketResuelto.id,
        userId: juan.id,
      },

      // Ticket cerrado, asignado a Lucas.
      {
        content:
          'Se reinició el equipo de red y se actualizó la configuración del punto de acceso.',
        ticketId: ticketCerrado.id,
        userId: lucas.id,
      },
      {
        content:
          'La conexión funciona correctamente. Doy por solucionado el problema.',
        ticketId: ticketCerrado.id,
        userId: juan.id,
      },
    ],
  });

  console.log('Comentarios creados.');
  console.log('Seed ejecutado correctamente.');
}

main()
  .catch((error) => {
    console.error('Error al ejecutar el seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });