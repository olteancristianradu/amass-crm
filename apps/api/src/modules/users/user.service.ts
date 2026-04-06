import { prisma } from '../../config/database';
import { AuthService } from '../auth/auth.service';
import { validatePasswordPolicy } from '../../utils/password';

export class UserService {
  async list(tenantId: string) {
    return prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, isActive: true, createdAt: true, updatedAt: true,
        tenantId: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(tenantId: string, id: string) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, isActive: true, createdAt: true, updatedAt: true,
        tenantId: true,
      },
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  async create(tenantId: string, data: {
    name: string;
    email?: string;
    pin?: string;
    role?: 'ADMIN' | 'SELLER';
    avatar?: string;
  }) {
    if (data.pin) {
      const policyResult = validatePasswordPolicy(data.pin);
      if (!policyResult.valid) {
        throw new Error(`PIN policy violation: ${policyResult.errors.join(', ')}`);
      }
    }
    const pinHash = data.pin ? await AuthService.hashPin(data.pin) : null;
    return prisma.user.create({
      data: {
        tenantId,
        name: data.name,
        email: data.email || null,
        pinHash,
        role: data.role || 'SELLER',
        avatar: data.avatar || null,
      },
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, isActive: true, createdAt: true, updatedAt: true,
        tenantId: true,
      },
    });
  }

  async update(tenantId: string, id: string, data: {
    name?: string;
    email?: string;
    pin?: string;
    role?: 'ADMIN' | 'SELLER';
    avatar?: string;
    isActive?: boolean;
  }) {
    const existing = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('User not found');

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.pin) updateData.pinHash = await AuthService.hashPin(data.pin);

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, isActive: true, createdAt: true, updatedAt: true,
        tenantId: true,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('User not found');
    await prisma.user.delete({ where: { id } });
  }
}
