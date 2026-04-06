import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
  seats: z.number().int().min(1).default(1),
});

export const updateSubscriptionSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  seats: z.number().int().min(1).optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});
