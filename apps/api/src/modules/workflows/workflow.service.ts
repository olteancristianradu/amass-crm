import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

interface TriggerConfig {
  type: string;
  conditions?: Record<string, unknown>;
  schedule?: string;
  idleMinutes?: number;
}

interface ActionConfig {
  type: string;
  config: Record<string, unknown>;
  delay?: number;
}

interface ActionLog {
  actionIndex: number;
  actionType: string;
  status: 'success' | 'skipped' | 'error';
  message: string;
  timestamp: string;
}

export class WorkflowService {
  async list(tenantId: string) {
    const workflows = await prisma.workflow.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { executions: true } },
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { id: true, status: true, startedAt: true, completedAt: true },
        },
      },
    });

    return workflows.map((w) => ({
      ...w,
      executionCount: w._count.executions,
      lastExecution: w.executions[0] || null,
      _count: undefined,
      executions: undefined,
    }));
  }

  async getById(tenantId: string, id: string) {
    const workflow = await prisma.workflow.findFirst({
      where: { id, tenantId },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!workflow) throw new NotFoundError('Workflow');
    return workflow;
  }

  async create(tenantId: string, data: {
    name: string;
    description?: string;
    trigger: TriggerConfig;
    actions: ActionConfig[];
    isActive?: boolean;
  }) {
    return prisma.workflow.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description || '',
        trigger: data.trigger as object,
        actions: data.actions as object[],
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, data: {
    name?: string;
    description?: string;
    trigger?: TriggerConfig;
    actions?: ActionConfig[];
    isActive?: boolean;
  }) {
    const existing = await prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Workflow');

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.trigger !== undefined) updateData.trigger = data.trigger as object;
    if (data.actions !== undefined) updateData.actions = data.actions as object[];
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return prisma.workflow.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Workflow');
    await prisma.workflow.delete({ where: { id } });
  }

  async toggle(tenantId: string, id: string) {
    const existing = await prisma.workflow.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('Workflow');

    return prisma.workflow.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  }

  async execute(
    tenantId: string,
    workflowId: string,
    entityType: string,
    entityId: string,
  ) {
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
    });
    if (!workflow) throw new NotFoundError('Workflow');

    const actions = workflow.actions as unknown as ActionConfig[];
    const logs: ActionLog[] = [];

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        entityType,
        entityId,
        status: 'running',
        logs: [],
      },
    });

    let hasError = false;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      try {
        const message = await this.executeAction(tenantId, action, entityType, entityId);
        logs.push({
          actionIndex: i,
          actionType: action.type,
          status: 'success',
          message,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        hasError = true;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logs.push({
          actionIndex: i,
          actionType: action.type,
          status: 'error',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const updatedExecution = await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: hasError ? 'completed_with_errors' : 'completed',
        logs: logs as object[],
        completedAt: new Date(),
      },
    });

    return updatedExecution;
  }

  private async executeAction(
    tenantId: string,
    action: ActionConfig,
    entityType: string,
    entityId: string,
  ): Promise<string> {
    const { type, config } = action;

    switch (type) {
      case 'assign_user': {
        const userId = config.userId as string;
        if (!userId) return 'assign_user: no userId provided, skipped';
        if (entityType === 'deal') {
          await prisma.deal.updateMany({
            where: { id: entityId, tenantId },
            data: { assignedToId: userId },
          });
          return `Assigned deal to user ${userId}`;
        }
        if (entityType === 'contact') {
          await prisma.contact.updateMany({
            where: { id: entityId, tenantId },
            data: { assignedToId: userId },
          });
          return `Assigned contact to user ${userId}`;
        }
        return `assign_user: unsupported entityType ${entityType}`;
      }

      case 'move_stage': {
        const stageId = config.stageId as string;
        if (!stageId) return 'move_stage: no stageId provided, skipped';
        if (entityType !== 'deal') return 'move_stage: only applicable to deals';
        await prisma.deal.updateMany({
          where: { id: entityId, tenantId },
          data: { stageId },
        });
        return `Moved deal to stage ${stageId}`;
      }

      case 'create_task': {
        const title = (config.title as string) || 'Workflow-generated task';
        const assigneeId = config.assigneeId as string;
        const dueInMinutes = config.dueInMinutes as number | undefined;

        const taskData: Record<string, unknown> = {
          tenantId,
          title,
          description: (config.description as string) || '',
          type: (config.taskType as string) || 'todo',
          priority: (config.priority as string) || 'medium',
          status: 'open',
          userId: assigneeId || 'system',
          createdById: assigneeId || 'system',
        };

        if (entityType === 'deal') taskData.dealId = entityId;
        if (entityType === 'contact') taskData.contactId = entityId;
        if (dueInMinutes) {
          taskData.dueDate = new Date(Date.now() + dueInMinutes * 60_000);
        }

        await prisma.task.create({ data: taskData as never });
        return `Created task "${title}"`;
      }

      case 'send_email': {
        const to = config.to as string;
        const subject = config.subject as string;
        return `[Placeholder] Would send email to "${to}" with subject "${subject}"`;
      }

      case 'send_sms': {
        const phone = config.phone as string;
        const message = config.message as string;
        return `[Placeholder] Would send SMS to "${phone}": "${message}"`;
      }

      case 'add_tag': {
        const tag = config.tag as string;
        if (!tag) return 'add_tag: no tag provided, skipped';
        if (entityType === 'deal') {
          const deal = await prisma.deal.findFirst({ where: { id: entityId, tenantId } });
          if (!deal) return 'add_tag: deal not found';
          const tags = deal.tags.includes(tag) ? deal.tags : [...deal.tags, tag];
          await prisma.deal.update({ where: { id: entityId }, data: { tags } });
          return `Added tag "${tag}" to deal`;
        }
        if (entityType === 'contact') {
          const contact = await prisma.contact.findFirst({ where: { id: entityId, tenantId } });
          if (!contact) return 'add_tag: contact not found';
          const tags = contact.tags.includes(tag) ? contact.tags : [...contact.tags, tag];
          await prisma.contact.update({ where: { id: entityId }, data: { tags } });
          return `Added tag "${tag}" to contact`;
        }
        return `add_tag: unsupported entityType ${entityType}`;
      }

      case 'remove_tag': {
        const tag = config.tag as string;
        if (!tag) return 'remove_tag: no tag provided, skipped';
        if (entityType === 'deal') {
          const deal = await prisma.deal.findFirst({ where: { id: entityId, tenantId } });
          if (!deal) return 'remove_tag: deal not found';
          const tags = deal.tags.filter((t) => t !== tag);
          await prisma.deal.update({ where: { id: entityId }, data: { tags } });
          return `Removed tag "${tag}" from deal`;
        }
        if (entityType === 'contact') {
          const contact = await prisma.contact.findFirst({ where: { id: entityId, tenantId } });
          if (!contact) return 'remove_tag: contact not found';
          const tags = contact.tags.filter((t) => t !== tag);
          await prisma.contact.update({ where: { id: entityId }, data: { tags } });
          return `Removed tag "${tag}" from contact`;
        }
        return `remove_tag: unsupported entityType ${entityType}`;
      }

      case 'update_field': {
        const field = config.field as string;
        const value = config.value;
        if (!field) return 'update_field: no field provided, skipped';
        if (entityType === 'deal') {
          await prisma.deal.updateMany({
            where: { id: entityId, tenantId },
            data: { [field]: value } as never,
          });
          return `Updated deal field "${field}"`;
        }
        if (entityType === 'contact') {
          await prisma.contact.updateMany({
            where: { id: entityId, tenantId },
            data: { [field]: value } as never,
          });
          return `Updated contact field "${field}"`;
        }
        return `update_field: unsupported entityType ${entityType}`;
      }

      case 'notify_user': {
        const userId = config.userId as string;
        const message = config.message as string;
        return `[Placeholder] Would notify user "${userId}": "${message}"`;
      }

      case 'webhook': {
        const url = config.url as string;
        return `[Placeholder] Would call webhook: ${url}`;
      }

      case 'wait': {
        const minutes = config.minutes as number;
        return `[Placeholder] Would wait ${minutes} minutes (requires queue system)`;
      }

      default:
        return `Unknown action type: ${type}`;
    }
  }

  async getExecutions(tenantId: string, workflowId: string, page = 1, limit = 20) {
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
      select: { id: true },
    });
    if (!workflow) throw new NotFoundError('Workflow');

    const safeLimit = Math.min(limit, 100);

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where: { workflowId },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.workflowExecution.count({ where: { workflowId } }),
    ]);

    return {
      executions,
      total,
      page,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async processEvent(
    tenantId: string,
    eventType: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    const workflows = await prisma.workflow.findMany({
      where: { tenantId, isActive: true },
    });

    const matching = workflows.filter((w) => {
      const trigger = w.trigger as unknown as TriggerConfig;
      if (trigger.type !== eventType) return false;

      if (trigger.conditions && metadata) {
        for (const [key, expected] of Object.entries(trigger.conditions)) {
          if (metadata[key] !== expected) return false;
        }
      }

      return true;
    });

    const results = [];
    for (const workflow of matching) {
      try {
        const execution = await this.execute(tenantId, workflow.id, entityType, entityId);
        results.push({ workflowId: workflow.id, workflowName: workflow.name, execution });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.push({ workflowId: workflow.id, workflowName: workflow.name, error: message });
      }
    }

    return results;
  }
}
