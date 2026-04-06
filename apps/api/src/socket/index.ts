import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import type { JwtPayload } from '@amass/shared';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as JwtPayload;
    const room = `tenant:${user.tenantId}`;
    socket.join(room);

    console.log(`[Socket] ${user.userId} joined ${room}`);

    socket.on('client:subscribe', async (clientId: string) => {
      const client = await prisma.client.findFirst({
        where: { id: clientId, tenantId: user.tenantId },
        select: { id: true },
      });
      if (!client) return;
      socket.join(`client:${clientId}`);
    });

    socket.on('client:unsubscribe', (clientId: string) => {
      socket.leave(`client:${clientId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] ${user.userId} disconnected`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToTenant(tenantId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, data);
  }
}

export function emitToClient(clientId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`client:${clientId}`).emit(event, data);
  }
}
