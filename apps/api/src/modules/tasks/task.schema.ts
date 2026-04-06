import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(['todo', 'call', 'email', 'meeting']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  userId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().max(200).optional(),
  reminderAt: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  type: z.enum(['todo', 'call', 'email', 'meeting']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  contactId: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
  userId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().max(200).nullable().optional(),
  reminderAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export const listTasksSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  userId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
  overdue: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
});
