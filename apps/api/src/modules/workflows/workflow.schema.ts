import { z } from 'zod';

const triggerSchema = z.object({
  type: z.enum([
    'deal_created', 'deal_stage_changed', 'deal_won', 'deal_lost',
    'contact_created', 'contact_updated',
    'task_overdue', 'task_completed',
    'lead_idle',
    'scheduled',
    'manual',
  ]),
  conditions: z.record(z.unknown()).optional(),
  schedule: z.string().optional(),
  idleMinutes: z.number().optional(),
});

const actionSchema = z.object({
  type: z.enum([
    'assign_user', 'move_stage', 'create_task', 'send_email',
    'send_sms', 'add_tag', 'remove_tag', 'update_field',
    'notify_user', 'webhook', 'wait',
  ]),
  config: z.record(z.unknown()),
  delay: z.number().optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  trigger: triggerSchema,
  actions: z.array(actionSchema).min(1).max(20),
  isActive: z.boolean().optional(),
});

export const updateWorkflowSchema = createWorkflowSchema.partial();

export const executeWorkflowSchema = z.object({
  entityType: z.enum(['deal', 'contact', 'task']),
  entityId: z.string().min(1),
});
