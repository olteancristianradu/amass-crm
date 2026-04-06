import { prisma } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';

export class PipelineService {
  async list(tenantId: string) {
    const pipelines = await prisma.pipeline.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { deals: true } },
          },
        },
        _count: { select: { deals: true } },
      },
    });

    return pipelines.map(p => ({
      ...p,
      stages: p.stages.map(s => ({
        ...s,
        dealCount: s._count.deals,
        _count: undefined,
      })),
      dealCount: p._count.deals,
      _count: undefined,
    }));
  }

  async getById(tenantId: string, id: string) {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { deals: true } },
          },
        },
        _count: { select: { deals: true } },
      },
    });
    if (!pipeline) throw new NotFoundError('Pipeline');

    return {
      ...pipeline,
      stages: pipeline.stages.map(s => ({
        ...s,
        dealCount: s._count.deals,
        _count: undefined,
      })),
      dealCount: pipeline._count.deals,
      _count: undefined,
    };
  }

  async create(tenantId: string, data: Record<string, unknown>) {
    const name = data.name as string;
    const isDefault = (data.isDefault as boolean) || false;
    const stages = data.stages as Array<{
      name: string;
      sortOrder: number;
      probability?: number;
      color?: string;
      isWon?: boolean;
      isLost?: boolean;
      rottingDays?: number;
    }>;

    return prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.pipeline.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const pipeline = await tx.pipeline.create({
        data: {
          tenantId,
          name,
          isDefault,
          stages: {
            create: stages.map(s => ({
              name: s.name,
              sortOrder: s.sortOrder,
              probability: s.probability ?? 0,
              color: s.color ?? '#6B7280',
              isWon: s.isWon ?? false,
              isLost: s.isLost ?? false,
              rottingDays: s.rottingDays,
            })),
          },
        },
        include: {
          stages: { orderBy: { sortOrder: 'asc' } },
        },
      });

      return pipeline;
    });
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.pipeline.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Pipeline');

    const isDefault = data.isDefault as boolean | undefined;
    const stages = data.stages as Array<{
      id?: string;
      name: string;
      sortOrder: number;
      probability?: number;
      color?: string;
      isWon?: boolean;
      isLost?: boolean;
      rottingDays?: number;
    }> | undefined;

    return prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.pipeline.updateMany({
          where: { tenantId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (isDefault !== undefined) updateData.isDefault = isDefault;

      await tx.pipeline.update({
        where: { id },
        data: updateData,
      });

      if (stages) {
        const existingStageIds = stages.filter(s => s.id).map(s => s.id!);

        // Delete stages that are no longer present
        await tx.pipelineStage.deleteMany({
          where: {
            pipelineId: id,
            id: { notIn: existingStageIds },
          },
        });

        // Upsert stages
        for (const s of stages) {
          if (s.id) {
            await tx.pipelineStage.update({
              where: { id: s.id },
              data: {
                name: s.name,
                sortOrder: s.sortOrder,
                probability: s.probability ?? 0,
                color: s.color ?? '#6B7280',
                isWon: s.isWon ?? false,
                isLost: s.isLost ?? false,
                rottingDays: s.rottingDays,
              },
            });
          } else {
            await tx.pipelineStage.create({
              data: {
                pipelineId: id,
                name: s.name,
                sortOrder: s.sortOrder,
                probability: s.probability ?? 0,
                color: s.color ?? '#6B7280',
                isWon: s.isWon ?? false,
                isLost: s.isLost ?? false,
                rottingDays: s.rottingDays,
              },
            });
          }
        }
      }

      return tx.pipeline.findFirst({
        where: { id },
        include: {
          stages: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { deals: true } } },
    });
    if (!existing) throw new NotFoundError('Pipeline');

    if (existing._count.deals > 0) {
      throw new ConflictError('Cannot delete pipeline with existing deals');
    }

    await prisma.pipeline.delete({ where: { id } });
  }

  async reorderStages(tenantId: string, pipelineId: string, stages: Array<{ id: string; sortOrder: number }>) {
    const pipeline = await prisma.pipeline.findFirst({ where: { id: pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundError('Pipeline');

    await prisma.$transaction(
      stages.map(s =>
        prisma.pipelineStage.update({
          where: { id: s.id },
          data: { sortOrder: s.sortOrder },
        })
      )
    );

    return prisma.pipeline.findFirst({
      where: { id: pipelineId },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async getDefaultPipeline(tenantId: string) {
    let pipeline = await prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!pipeline) {
      pipeline = await prisma.pipeline.create({
        data: {
          tenantId,
          name: 'Sales Pipeline',
          isDefault: true,
          stages: {
            create: [
              { name: 'Qualification', sortOrder: 0, probability: 10, color: '#6B7280' },
              { name: 'Meeting', sortOrder: 1, probability: 25, color: '#3B82F6' },
              { name: 'Proposal', sortOrder: 2, probability: 50, color: '#F59E0B' },
              { name: 'Negotiation', sortOrder: 3, probability: 75, color: '#8B5CF6' },
              { name: 'Won', sortOrder: 4, probability: 100, color: '#10B981', isWon: true },
              { name: 'Lost', sortOrder: 5, probability: 0, color: '#EF4444', isLost: true },
            ],
          },
        },
        include: {
          stages: { orderBy: { sortOrder: 'asc' } },
        },
      });
    }

    return pipeline;
  }
}
