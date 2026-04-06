import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';

interface ProductFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export class ProductService {
  async list(tenantId: string, filters?: ProductFilters) {
    const where: Prisma.ProductWhereInput = { tenantId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      const s = filters.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
      ];
    }

    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 200);

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getById(tenantId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { lineItems: true } },
      },
    });
    if (!product) throw new NotFoundError('Product');
    return {
      ...product,
      usageCount: product._count.lineItems,
      _count: undefined,
    };
  }

  async create(tenantId: string, data: Record<string, unknown>) {
    const sku = data.sku as string | undefined;

    if (sku) {
      const existing = await prisma.product.findUnique({
        where: { tenantId_sku: { tenantId, sku } },
      });
      if (existing) throw new ConflictError('A product with this SKU already exists');
    }

    return prisma.product.create({
      data: {
        tenantId,
        name: data.name as string,
        sku: sku || null,
        description: (data.description as string) || '',
        unitPrice: (data.unitPrice as number) || 0,
        currency: (data.currency as string) || 'RON',
        isActive: data.isActive !== undefined ? (data.isActive as boolean) : true,
      },
    });
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Product');

    const sku = data.sku as string | null | undefined;

    if (sku !== undefined && sku !== null && sku !== existing.sku) {
      const duplicate = await prisma.product.findUnique({
        where: { tenantId_sku: { tenantId, sku } },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError('A product with this SKU already exists');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.product.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { lineItems: true } } },
    });
    if (!existing) throw new NotFoundError('Product');

    if (existing._count.lineItems > 0) {
      // Soft delete: mark as inactive instead of deleting
      return prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await prisma.product.delete({ where: { id } });
    return null;
  }
}
