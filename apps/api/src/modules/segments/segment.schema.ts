import { z } from 'zod';

/** Zod schema for a single segment filter condition. */
const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum([
    'eq', 'neq', 'contains', 'not_contains',
    'gt', 'lt', 'gte', 'lte',
    'is_set', 'is_not_set',
    'in', 'not_in',
  ]),
  value: z.unknown().optional(),
});

/** Zod schema for creating a new segment. */
export const createSegmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  conditions: z.array(conditionSchema).min(1),
  matchType: z.enum(['all', 'any']).default('all'),
});

/** Zod schema for updating an existing segment. */
export const updateSegmentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  conditions: z.array(conditionSchema).min(1).optional(),
  matchType: z.enum(['all', 'any']).optional(),
});
