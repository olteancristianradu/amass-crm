import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';

export class TagService {
  async list(tenantId: string, entityType?: string) {
    const where: { tenantId: string; entityType?: string } = { tenantId };
    if (entityType) {
      where.entityType = entityType;
    }
    return prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, data: { name: string; color: string; entityType: string }) {
    const existing = await prisma.tag.findUnique({
      where: {
        tenantId_name_entityType: {
          tenantId,
          name: data.name,
          entityType: data.entityType,
        },
      },
    });
    if (existing) {
      throw new ConflictError('Tag with this name already exists for this entity type');
    }

    return prisma.tag.create({
      data: {
        tenant: { connect: { id: tenantId } },
        name: data.name,
        color: data.color,
        entityType: data.entityType,
      },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; color?: string }) {
    const existing = await prisma.tag.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Tag');

    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.tag.findUnique({
        where: {
          tenantId_name_entityType: {
            tenantId,
            name: data.name,
            entityType: existing.entityType,
          },
        },
      });
      if (duplicate) {
        throw new ConflictError('Tag with this name already exists for this entity type');
      }
    }

    return prisma.tag.update({
      where: { id },
      data,
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.tag.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Tag');

    const tagName = existing.name;
    const entityType = existing.entityType;

    // Remove tag name from all entities' tags arrays
    if (entityType === 'contact') {
      const contacts = await prisma.contact.findMany({
        where: { tenantId, tags: { has: tagName } },
        select: { id: true, tags: true },
      });
      for (const contact of contacts) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { tags: contact.tags.filter((t) => t !== tagName) },
        });
      }
    } else if (entityType === 'company') {
      const companies = await prisma.company.findMany({
        where: { tenantId, tags: { has: tagName } },
        select: { id: true, tags: true },
      });
      for (const company of companies) {
        await prisma.company.update({
          where: { id: company.id },
          data: { tags: company.tags.filter((t) => t !== tagName) },
        });
      }
    } else if (entityType === 'deal') {
      const deals = await prisma.deal.findMany({
        where: { tenantId, tags: { has: tagName } },
        select: { id: true, tags: true },
      });
      for (const deal of deals) {
        await prisma.deal.update({
          where: { id: deal.id },
          data: { tags: deal.tags.filter((t) => t !== tagName) },
        });
      }
    }

    await prisma.tag.delete({ where: { id } });
  }

  async addToEntity(tenantId: string, entityType: string, entityId: string, tagName: string) {
    // Create tag if it doesn't exist
    const existingTag = await prisma.tag.findUnique({
      where: {
        tenantId_name_entityType: { tenantId, name: tagName, entityType },
      },
    });
    if (!existingTag) {
      await prisma.tag.create({
        data: {
          tenant: { connect: { id: tenantId } },
          name: tagName,
          color: '#6B7280',
          entityType,
        },
      });
    }

    if (entityType === 'contact') {
      const contact = await prisma.contact.findFirst({ where: { id: entityId, tenantId } });
      if (!contact) throw new NotFoundError('Contact');
      if (!contact.tags.includes(tagName)) {
        await prisma.contact.update({
          where: { id: entityId },
          data: { tags: [...contact.tags, tagName] },
        });
      }
    } else if (entityType === 'company') {
      const company = await prisma.company.findFirst({ where: { id: entityId, tenantId } });
      if (!company) throw new NotFoundError('Company');
      if (!company.tags.includes(tagName)) {
        await prisma.company.update({
          where: { id: entityId },
          data: { tags: [...company.tags, tagName] },
        });
      }
    } else if (entityType === 'deal') {
      const deal = await prisma.deal.findFirst({ where: { id: entityId, tenantId } });
      if (!deal) throw new NotFoundError('Deal');
      if (!deal.tags.includes(tagName)) {
        await prisma.deal.update({
          where: { id: entityId },
          data: { tags: [...deal.tags, tagName] },
        });
      }
    }
  }

  async removeFromEntity(tenantId: string, entityType: string, entityId: string, tagName: string) {
    if (entityType === 'contact') {
      const contact = await prisma.contact.findFirst({ where: { id: entityId, tenantId } });
      if (!contact) throw new NotFoundError('Contact');
      await prisma.contact.update({
        where: { id: entityId },
        data: { tags: contact.tags.filter((t) => t !== tagName) },
      });
    } else if (entityType === 'company') {
      const company = await prisma.company.findFirst({ where: { id: entityId, tenantId } });
      if (!company) throw new NotFoundError('Company');
      await prisma.company.update({
        where: { id: entityId },
        data: { tags: company.tags.filter((t) => t !== tagName) },
      });
    } else if (entityType === 'deal') {
      const deal = await prisma.deal.findFirst({ where: { id: entityId, tenantId } });
      if (!deal) throw new NotFoundError('Deal');
      await prisma.deal.update({
        where: { id: entityId },
        data: { tags: deal.tags.filter((t) => t !== tagName) },
      });
    }
  }
}
