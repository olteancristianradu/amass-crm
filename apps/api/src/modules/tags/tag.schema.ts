import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#6B7280'),
  entityType: z.enum(['contact', 'company', 'deal']),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
});

export const attachTagSchema = z.object({
  entityType: z.enum(['contact', 'company', 'deal']),
  entityId: z.string().min(1),
  tagName: z.string().min(1).max(50),
});

export const detachTagSchema = z.object({
  entityType: z.enum(['contact', 'company', 'deal']),
  entityId: z.string().min(1),
  tagName: z.string().min(1).max(50),
});
