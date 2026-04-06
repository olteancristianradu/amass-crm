import { z } from 'zod';

const currencyCodeSchema = z.enum(['EUR', 'USD', 'RON', 'GBP', 'CHF']);

const lineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  name: z.string().min(1).max(200),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0).default(0),
  discount: z.number().min(0).max(100).default(0),
  sortOrder: z.number().int().min(0).optional(),
});

export const createDealSchema = z.object({
  title: z.string().min(1).max(300),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  value: z.number().min(0).optional(),
  currency: currencyCodeSchema.default('EUR'),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional(),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
  contactIds: z.array(z.string()).optional(),
  source: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  lineItems: z.array(lineItemSchema).optional(),
});

export const updateDealSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  value: z.number().min(0).optional(),
  currency: currencyCodeSchema.optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().nullable().optional(),
  companyId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
  contactIds: z.array(z.string()).optional(),
  source: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  lineItems: z.array(lineItemSchema).optional(),
});

export const moveDealStageSchema = z.object({
  stageId: z.string().min(1),
  lossReason: z.string().max(200).optional(),
  lossNote: z.string().max(1000).optional(),
});

export const listDealsSchema = z.object({
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  assignedToId: z.string().optional(),
  search: z.string().optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  expectedCloseFrom: z.string().datetime().optional(),
  expectedCloseTo: z.string().datetime().optional(),
  status: z.enum(['open', 'won', 'lost']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  sort: z.enum(['value', 'createdAt', 'expectedCloseDate', '-value', '-createdAt', '-expectedCloseDate']).optional(),
});
