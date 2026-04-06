import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(200),
  permissions: z.array(z.string().min(1)).min(1),
  expiresAt: z.string().datetime().optional(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  permissions: z.array(z.string().min(1)).optional(),
});
