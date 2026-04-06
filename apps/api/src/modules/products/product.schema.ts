import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  unitPrice: z.number().min(0).default(0),
  currency: z.string().max(10).default('RON'),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().max(100).nullable().optional(),
  description: z.string().max(2000).optional(),
  unitPrice: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
});
