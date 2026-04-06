import { z } from 'zod';

export const createActivitySchema = z.object({
  type: z.enum(['note', 'call', 'email', 'meeting', 'stage_change', 'task']),
  subject: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const listActivitiesSchema = z.object({
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
  type: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
