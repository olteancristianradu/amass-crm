import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';
import { eventBus } from '../../events/event-bus';

interface DealFilters {
  pipelineId?: string;
  stageId?: string;
  assignedToId?: string;
  search?: string;
  minValue?: number;
  maxValue?: number;
  expectedCloseFrom?: string;
  expectedCloseTo?: string;
  status?: 'open' | 'won' | 'lost';
  page?: number;
  limit?: number;
  sort?: string;
}

interface LineItemInput {
  id?: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  sortOrder?: number;
}

function calcLineItemTotal(quantity: number, unitPrice: number, discount: number): number {
  return quantity * unitPrice * (1 - discount / 100);
}

function parseSortField(sort?: string): { field: string; direction: 'asc' | 'desc' } {
  if (!sort) return { field: 'createdAt', direction: 'desc' };
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return { field, direction: desc ? 'desc' : 'asc' };
}

export class DealService {
  async list(tenantId: string, filters: DealFilters) {
    const where: Prisma.DealWhereInput = { tenantId };

    if (filters.pipelineId) where.pipelineId = filters.pipelineId;
    if (filters.stageId) where.stageId = filters.stageId;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;

    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (filters.minValue !== undefined || filters.maxValue !== undefined) {
      where.value = {};
      if (filters.minValue !== undefined) where.value.gte = filters.minValue;
      if (filters.maxValue !== undefined) where.value.lte = filters.maxValue;
    }

    if (filters.expectedCloseFrom || filters.expectedCloseTo) {
      where.expectedCloseDate = {};
      if (filters.expectedCloseFrom) where.expectedCloseDate.gte = new Date(filters.expectedCloseFrom);
      if (filters.expectedCloseTo) where.expectedCloseDate.lte = new Date(filters.expectedCloseTo);
    }

    if (filters.status === 'won') {
      where.wonAt = { not: null };
    } else if (filters.status === 'lost') {
      where.lostAt = { not: null };
    } else if (filters.status === 'open') {
      where.wonAt = null;
      where.lostAt = null;
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const { field, direction } = parseSortField(filters.sort);

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy: { [field]: direction },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          stage: { select: { id: true, name: true, color: true, probability: true, isWon: true, isLost: true } },
          pipeline: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, avatar: true } },
          contacts: {
            include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    return { deals, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getById(tenantId: string, id: string) {
    const deal = await prisma.deal.findFirst({
      where: { id, tenantId },
      include: {
        stage: true,
        pipeline: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
        contacts: {
          include: { contact: true },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        tasks: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!deal) throw new NotFoundError('Deal');
    return deal;
  }

  async create(tenantId: string, userId: string, data: Record<string, unknown>) {
    const title = data.title as string;
    const pipelineId = data.pipelineId as string | undefined;
    const stageId = data.stageId as string | undefined;
    const contactIds = (data.contactIds as string[]) || [];
    const lineItems = (data.lineItems as LineItemInput[]) || [];

    return prisma.$transaction(async (tx) => {
      // Resolve pipeline and stage
      let resolvedPipelineId = pipelineId;
      let resolvedStageId = stageId;

      if (!resolvedPipelineId) {
        let defaultPipeline = await tx.pipeline.findFirst({
          where: { tenantId, isDefault: true },
          include: { stages: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        });
        if (!defaultPipeline) {
          defaultPipeline = await tx.pipeline.create({
            data: {
              tenantId,
              name: 'Sales Pipeline',
              isDefault: true,
              stages: {
                create: [
                  { name: 'Qualification', sortOrder: 0, probability: 10 },
                  { name: 'Meeting', sortOrder: 1, probability: 25 },
                  { name: 'Proposal', sortOrder: 2, probability: 50 },
                  { name: 'Negotiation', sortOrder: 3, probability: 75 },
                  { name: 'Won', sortOrder: 4, probability: 100, isWon: true },
                  { name: 'Lost', sortOrder: 5, probability: 0, isLost: true },
                ],
              },
            },
            include: { stages: { orderBy: { sortOrder: 'asc' }, take: 1 } },
          });
        }
        resolvedPipelineId = defaultPipeline.id;
        if (!resolvedStageId && defaultPipeline.stages[0]) {
          resolvedStageId = defaultPipeline.stages[0].id;
        }
      }

      if (!resolvedStageId) {
        const firstStage = await tx.pipelineStage.findFirst({
          where: { pipelineId: resolvedPipelineId },
          orderBy: { sortOrder: 'asc' },
        });
        if (firstStage) resolvedStageId = firstStage.id;
      }

      // Resolve probability from stage if not explicitly set
      let probability = data.probability as number | undefined;
      if (probability === undefined && resolvedStageId) {
        const stage = await tx.pipelineStage.findUnique({ where: { id: resolvedStageId } });
        if (stage) probability = stage.probability;
      }

      // Calculate line item totals and deal value
      const processedLineItems = lineItems.map((item, idx) => ({
        productId: item.productId || undefined,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: calcLineItemTotal(item.quantity, item.unitPrice, item.discount),
        sortOrder: item.sortOrder ?? idx,
      }));

      const lineItemsTotal = processedLineItems.reduce((sum, item) => sum + item.total, 0);
      const dealValue = (data.value as number) ?? lineItemsTotal;

      const deal = await tx.deal.create({
        data: {
          tenantId,
          pipelineId: resolvedPipelineId!,
          stageId: resolvedStageId!,
          title,
          value: dealValue,
          currency: (data.currency as string) || 'RON',
          probability: probability ?? 0,
          expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate as string) : undefined,
          companyId: (data.companyId as string) || undefined,
          assignedToId: (data.assignedToId as string) || undefined,
          source: (data.source as string) || '',
          notes: (data.notes as string) || '',
          tags: (data.tags as string[]) || [],
          contacts: contactIds.length > 0
            ? { create: contactIds.map((cid, idx) => ({ contactId: cid, role: idx === 0 ? 'primary' : 'related' })) }
            : undefined,
          lineItems: processedLineItems.length > 0
            ? { create: processedLineItems }
            : undefined,
        },
        include: {
          stage: true,
          pipeline: { select: { id: true, name: true } },
          contacts: { include: { contact: true } },
          lineItems: { orderBy: { sortOrder: 'asc' } },
        },
      });

      // Log activity
      await tx.activity.create({
        data: {
          tenantId,
          userId,
          dealId: deal.id,
          type: 'deal_created',
          subject: `Deal created: ${title}`,
        },
      });

      // Emit event (after transaction commits, via microtask)
      process.nextTick(() => {
        eventBus.emit('deal.created', { tenantId, dealId: deal.id, userId, pipelineId: deal.pipelineId });
      });

      return deal;
    });
  }

  async update(tenantId: string, userId: string, id: string, data: Record<string, unknown>) {
    const existing = await prisma.deal.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Deal');

    const contactIds = data.contactIds as string[] | undefined;
    const lineItems = data.lineItems as LineItemInput[] | undefined;

    return prisma.$transaction(async (tx) => {
      // Build update data, excluding contactIds and lineItems
      const { contactIds: _, lineItems: __, ...updateFields } = data;
      const updateData: Record<string, unknown> = {};

      if (updateFields.title !== undefined) updateData.title = updateFields.title;
      if (updateFields.pipelineId !== undefined) updateData.pipelineId = updateFields.pipelineId;
      if (updateFields.stageId !== undefined) updateData.stageId = updateFields.stageId;
      if (updateFields.value !== undefined) updateData.value = updateFields.value;
      if (updateFields.currency !== undefined) updateData.currency = updateFields.currency;
      if (updateFields.probability !== undefined) updateData.probability = updateFields.probability;
      if (updateFields.expectedCloseDate !== undefined) {
        updateData.expectedCloseDate = updateFields.expectedCloseDate
          ? new Date(updateFields.expectedCloseDate as string)
          : null;
      }
      if (updateFields.companyId !== undefined) updateData.companyId = updateFields.companyId || null;
      if (updateFields.assignedToId !== undefined) updateData.assignedToId = updateFields.assignedToId || null;
      if (updateFields.source !== undefined) updateData.source = updateFields.source;
      if (updateFields.notes !== undefined) updateData.notes = updateFields.notes;
      if (updateFields.tags !== undefined) updateData.tags = updateFields.tags;

      // Sync contacts
      if (contactIds !== undefined) {
        await tx.dealContact.deleteMany({ where: { dealId: id } });
        if (contactIds.length > 0) {
          await tx.dealContact.createMany({
            data: contactIds.map((cid, idx) => ({
              dealId: id,
              contactId: cid,
              role: idx === 0 ? 'primary' : 'related',
            })),
          });
        }
      }

      // Sync line items
      if (lineItems !== undefined) {
        const existingItemIds = lineItems.filter(li => li.id).map(li => li.id!);

        await tx.dealLineItem.deleteMany({
          where: { dealId: id, id: { notIn: existingItemIds } },
        });

        let totalValue = 0;
        for (const [idx, item] of lineItems.entries()) {
          const total = calcLineItemTotal(item.quantity, item.unitPrice, item.discount);
          totalValue += total;

          if (item.id) {
            await tx.dealLineItem.update({
              where: { id: item.id },
              data: {
                productId: item.productId || null,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                total,
                sortOrder: item.sortOrder ?? idx,
              },
            });
          } else {
            await tx.dealLineItem.create({
              data: {
                dealId: id,
                productId: item.productId || undefined,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                total,
                sortOrder: item.sortOrder ?? idx,
              },
            });
          }
        }

        // Update deal value from line items if value not explicitly set
        if (updateFields.value === undefined) {
          updateData.value = totalValue;
        }
      }

      const deal = await tx.deal.update({
        where: { id },
        data: updateData as Prisma.DealUpdateInput,
        include: {
          stage: true,
          pipeline: { select: { id: true, name: true } },
          contacts: { include: { contact: true } },
          lineItems: { orderBy: { sortOrder: 'asc' } },
        },
      });

      await tx.activity.create({
        data: {
          tenantId,
          userId,
          dealId: id,
          type: 'deal_updated',
          subject: `Deal updated: ${deal.title}`,
        },
      });

      process.nextTick(() => {
        eventBus.emit('deal.updated', { tenantId, dealId: id, userId, changes: data as Record<string, unknown> });
      });

      return deal;
    });
  }

  async moveStage(tenantId: string, userId: string, id: string, stageId: string, lossReason?: string, lossNote?: string) {
    const existing = await prisma.deal.findFirst({
      where: { id, tenantId },
      include: { stage: true },
    });
    if (!existing) throw new NotFoundError('Deal');

    const newStage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
    if (!newStage) throw new NotFoundError('Stage');

    const updateData: Prisma.DealUpdateInput = {
      stage: { connect: { id: newStage.id } },
      probability: newStage.probability,
    };

    if (newStage.isWon) {
      updateData.wonAt = new Date();
      updateData.closedAt = new Date();
      updateData.lostAt = null;
      updateData.lossReason = '';
      updateData.lossNote = '';
    } else if (newStage.isLost) {
      updateData.lostAt = new Date();
      updateData.closedAt = new Date();
      updateData.wonAt = null;
      updateData.lossReason = lossReason || '';
      updateData.lossNote = lossNote || '';
    } else {
      updateData.wonAt = null;
      updateData.lostAt = null;
      updateData.closedAt = null;
      updateData.lossReason = '';
      updateData.lossNote = '';
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        stage: true,
        pipeline: { select: { id: true, name: true } },
      },
    });

    await prisma.activity.create({
      data: {
        tenantId,
        userId,
        dealId: id,
        type: 'deal_stage_changed',
        subject: `Deal moved from ${existing.stage.name} to ${newStage.name}`,
        metadata: {
          fromStageId: existing.stageId,
          toStageId: newStage.id,
          fromStageName: existing.stage.name,
          toStageName: newStage.name,
        },
      },
    });

    eventBus.emit('deal.stageChanged', {
      tenantId, dealId: id, userId,
      fromStageId: existing.stageId, toStageId: newStage.id,
      pipelineId: existing.pipelineId,
    });

    if (newStage.isWon) {
      eventBus.emit('deal.won', { tenantId, dealId: id, userId, value: Number(deal.value) });
    } else if (newStage.isLost) {
      eventBus.emit('deal.lost', { tenantId, dealId: id, userId, reason: lossReason });
    }

    return deal;
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.deal.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Deal');
    await prisma.deal.delete({ where: { id } });
    eventBus.emit('deal.deleted', { tenantId, dealId: id, userId: '' });
  }

  async getKanban(tenantId: string, pipelineId: string) {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId },
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            deals: {
              where: { tenantId },
              orderBy: { updatedAt: 'desc' },
              select: {
                id: true,
                title: true,
                value: true,
                currency: true,
                probability: true,
                expectedCloseDate: true,
                assignedTo: { select: { id: true, name: true, avatar: true } },
                company: { select: { id: true, name: true } },
                contacts: {
                  take: 1,
                  include: { contact: { select: { id: true, firstName: true, lastName: true } } },
                },
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!pipeline) throw new NotFoundError('Pipeline');

    return {
      pipeline: { id: pipeline.id, name: pipeline.name },
      stages: pipeline.stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        probability: stage.probability,
        isWon: stage.isWon,
        isLost: stage.isLost,
        deals: stage.deals,
        totalValue: stage.deals.reduce((sum, d) => sum + Number(d.value), 0),
        dealCount: stage.deals.length,
      })),
    };
  }

  async getForecast(tenantId: string, filters?: { pipelineId?: string; months?: number }) {
    const where: Prisma.DealWhereInput = {
      tenantId,
      wonAt: null,
      lostAt: null,
    };
    if (filters?.pipelineId) where.pipelineId = filters.pipelineId;

    // Fetch tenant's default currency and latest exchange rates for conversion
    const [tenant, deals] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { defaultCurrency: true } }),
      prisma.deal.findMany({
        where,
        select: {
          value: true,
          currency: true,
          probability: true,
          expectedCloseDate: true,
        },
      }),
    ]);

    const defaultCurrency = tenant?.defaultCurrency || 'EUR';

    // Build exchange rates map from the latest rates for this tenant
    const rates: Record<string, number> = { [defaultCurrency]: 1 };
    const latestRates = await prisma.exchangeRate.findMany({
      where: { tenantId, baseCurrency: defaultCurrency },
      orderBy: { date: 'desc' },
      distinct: ['targetCurrency'],
    });
    for (const er of latestRates) {
      rates[er.targetCurrency] = er.rate;
    }

    const monthlyForecast: Record<string, { weighted: number; total: number; count: number }> = {};

    for (const deal of deals) {
      const date = deal.expectedCloseDate || new Date();
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyForecast[monthKey]) {
        monthlyForecast[monthKey] = { weighted: 0, total: 0, count: 0 };
      }

      let value = Number(deal.value);
      const dealCurrency = deal.currency || defaultCurrency;

      // Convert deal value to tenant's default currency if needed
      if (dealCurrency !== defaultCurrency && rates[dealCurrency]) {
        value = value / rates[dealCurrency];
      }

      const prob = deal.probability ?? 0;
      monthlyForecast[monthKey].weighted += value * prob / 100;
      monthlyForecast[monthKey].total += value;
      monthlyForecast[monthKey].count += 1;
    }

    const sorted = Object.entries(monthlyForecast)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const totalWeighted = sorted.reduce((sum, m) => sum + m.weighted, 0);
    const totalValue = sorted.reduce((sum, m) => sum + m.total, 0);
    const totalDeals = sorted.reduce((sum, m) => sum + m.count, 0);

    return { months: sorted, totalWeighted, totalValue, totalDeals, currency: defaultCurrency };
  }

  async getWinLossAnalysis(tenantId: string, dateFrom?: string, dateTo?: string) {
    const baseWhere: Prisma.DealWhereInput = { tenantId };

    if (dateFrom || dateTo) {
      baseWhere.closedAt = {};
      if (dateFrom) baseWhere.closedAt.gte = new Date(dateFrom);
      if (dateTo) baseWhere.closedAt.lte = new Date(dateTo);
    }

    const [wonDeals, lostDeals, allClosedDeals] = await Promise.all([
      prisma.deal.findMany({
        where: { ...baseWhere, wonAt: { not: null } },
        select: { value: true, createdAt: true, wonAt: true },
      }),
      prisma.deal.findMany({
        where: { ...baseWhere, lostAt: { not: null } },
        select: { value: true, lossReason: true, createdAt: true, lostAt: true },
      }),
      prisma.deal.count({
        where: { ...baseWhere, closedAt: { not: null } },
      }),
    ]);

    const totalWon = wonDeals.length;
    const totalLost = lostDeals.length;
    const winRate = allClosedDeals > 0 ? (totalWon / allClosedDeals) * 100 : 0;

    const avgDealSizeWon = totalWon > 0
      ? wonDeals.reduce((sum, d) => sum + Number(d.value), 0) / totalWon
      : 0;

    // Avg cycle time in days for won deals
    const cycleTimes = wonDeals
      .filter(d => d.wonAt)
      .map(d => (d.wonAt!.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const avgCycleTime = cycleTimes.length > 0
      ? cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
      : 0;

    // Loss reasons breakdown
    const lossReasons: Record<string, number> = {};
    for (const deal of lostDeals) {
      const reason = deal.lossReason || 'Unknown';
      lossReasons[reason] = (lossReasons[reason] || 0) + 1;
    }

    return {
      totalWon,
      totalLost,
      totalClosed: allClosedDeals,
      winRate: Math.round(winRate * 100) / 100,
      avgDealSize: Math.round(avgDealSizeWon * 100) / 100,
      avgCycleTimeDays: Math.round(avgCycleTime * 100) / 100,
      lossReasons: Object.entries(lossReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async assignRoundRobin(tenantId: string, pipelineId: string, dealId: string) {
    const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId } });
    if (!deal) throw new NotFoundError('Deal');

    // Get active users for this tenant
    const activeUsers = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    });

    if (activeUsers.length === 0) {
      throw new Error('No active users available for assignment');
    }

    // Find the last assigned user for this pipeline
    const lastAssigned = await prisma.deal.findFirst({
      where: { tenantId, pipelineId, assignedToId: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: { assignedToId: true },
    });

    let nextIndex = 0;
    if (lastAssigned?.assignedToId) {
      const currentIndex = activeUsers.findIndex(u => u.id === lastAssigned.assignedToId);
      nextIndex = (currentIndex + 1) % activeUsers.length;
    }

    const assignedUser = activeUsers[nextIndex];

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { assignedToId: assignedUser.id },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
      },
    });

    return updated;
  }
}
