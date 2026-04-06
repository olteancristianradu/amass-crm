import { z } from 'zod';

export const createSequenceSchema = z.object({
  name: z.string().min(1).max(500),
  steps: z.array(z.any()).min(1),
});

export const updateSequenceSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  steps: z.array(z.any()).optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
});
