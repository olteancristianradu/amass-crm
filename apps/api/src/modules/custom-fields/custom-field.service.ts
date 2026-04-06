import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors';

export class CustomFieldService {
  async listDefinitions(tenantId: string, entityType?: string) {
    const where: { tenantId: string; entityType?: string } = { tenantId };
    if (entityType) {
      where.entityType = entityType;
    }
    return prisma.customFieldDefinition.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createDefinition(tenantId: string, data: {
    entityType: string;
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    options?: string[];
    isRequired: boolean;
    sortOrder: number;
  }) {
    const existing = await prisma.customFieldDefinition.findUnique({
      where: {
        tenantId_entityType_fieldName: {
          tenantId,
          entityType: data.entityType,
          fieldName: data.fieldName,
        },
      },
    });
    if (existing) {
      throw new ConflictError('A custom field with this name already exists for this entity type');
    }

    return prisma.customFieldDefinition.create({
      data: {
        tenant: { connect: { id: tenantId } },
        entityType: data.entityType,
        fieldName: data.fieldName,
        fieldLabel: data.fieldLabel,
        fieldType: data.fieldType,
        options: data.options || undefined,
        isRequired: data.isRequired,
        sortOrder: data.sortOrder,
      },
    });
  }

  async updateDefinition(tenantId: string, id: string, data: {
    fieldLabel?: string;
    fieldType?: string;
    options?: string[];
    isRequired?: boolean;
    sortOrder?: number;
  }) {
    const existing = await prisma.customFieldDefinition.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Custom field definition');

    return prisma.customFieldDefinition.update({
      where: { id },
      data,
    });
  }

  async deleteDefinition(tenantId: string, id: string) {
    const existing = await prisma.customFieldDefinition.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Custom field definition');

    // Cascade delete values (handled by Prisma onDelete: Cascade, but explicit for clarity)
    await prisma.customFieldValue.deleteMany({ where: { definitionId: id } });
    await prisma.customFieldDefinition.delete({ where: { id } });
  }

  async getValues(tenantId: string, entityType: string, entityId: string) {
    return prisma.customFieldValue.findMany({
      where: { tenantId, entityType, entityId },
      include: {
        definition: {
          select: {
            id: true,
            fieldName: true,
            fieldLabel: true,
            fieldType: true,
            options: true,
            isRequired: true,
            sortOrder: true,
          },
        },
      },
      orderBy: { definition: { sortOrder: 'asc' } },
    });
  }

  async setValue(tenantId: string, entityType: string, entityId: string, definitionId: string, value: string) {
    const definition = await prisma.customFieldDefinition.findFirst({
      where: { id: definitionId, tenantId },
    });
    if (!definition) throw new NotFoundError('Custom field definition');

    if (definition.entityType !== entityType) {
      throw new ValidationError('Field definition entity type does not match');
    }

    this.validateValue(value, definition.fieldType, definition.options as string[] | null);

    return prisma.customFieldValue.upsert({
      where: {
        definitionId_entityType_entityId: {
          definitionId,
          entityType,
          entityId,
        },
      },
      update: { value },
      create: {
        tenant: { connect: { id: tenantId } },
        definition: { connect: { id: definitionId } },
        entityType,
        entityId,
        value,
        ...(entityType === 'contact' ? { contact: { connect: { id: entityId } } } : {}),
      },
    });
  }

  async setValues(tenantId: string, entityType: string, entityId: string, values: { definitionId: string; value: string }[]) {
    const results = [];
    for (const { definitionId, value } of values) {
      const result = await this.setValue(tenantId, entityType, entityId, definitionId, value);
      results.push(result);
    }
    return results;
  }

  async deleteValue(tenantId: string, entityType: string, entityId: string, definitionId: string) {
    const existing = await prisma.customFieldValue.findFirst({
      where: { tenantId, entityType, entityId, definitionId },
    });
    if (!existing) throw new NotFoundError('Custom field value');

    await prisma.customFieldValue.delete({ where: { id: existing.id } });
  }

  private validateValue(value: string, fieldType: string, options: string[] | null) {
    if (!value) return; // Allow empty values (isRequired is handled at form level)

    switch (fieldType) {
      case 'number': {
        if (isNaN(Number(value))) {
          throw new ValidationError('Value must be a valid number');
        }
        break;
      }
      case 'date': {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new ValidationError('Value must be a valid ISO date string');
        }
        break;
      }
      case 'boolean': {
        if (value !== 'true' && value !== 'false') {
          throw new ValidationError('Value must be "true" or "false"');
        }
        break;
      }
      case 'dropdown': {
        if (options && options.length > 0 && !options.includes(value)) {
          throw new ValidationError(`Value must be one of: ${options.join(', ')}`);
        }
        break;
      }
      case 'multi_select': {
        const selected = value.split(',').map((v) => v.trim());
        if (options && options.length > 0) {
          const invalid = selected.filter((v) => !options.includes(v));
          if (invalid.length > 0) {
            throw new ValidationError(`Invalid values: ${invalid.join(', ')}. Must be from: ${options.join(', ')}`);
          }
        }
        break;
      }
      case 'url': {
        try {
          new URL(value);
        } catch {
          throw new ValidationError('Value must be a valid URL');
        }
        break;
      }
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new ValidationError('Value must be a valid email address');
        }
        break;
      }
      case 'phone': {
        const phoneRegex = /^[+]?[\d\s\-().]{6,20}$/;
        if (!phoneRegex.test(value)) {
          throw new ValidationError('Value must be a valid phone number');
        }
        break;
      }
      // 'text' requires no validation
    }
  }
}
