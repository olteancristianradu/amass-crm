import { z } from 'zod';

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
});

export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const createNotificationSchema = z.object({
  body: z.object({
    userId: z.string().min(1),
    type: z.string().min(1),
    title: z.string().min(1),
    message: z.string().min(1),
    entityType: z.enum(['contact', 'deal', 'company']).optional(),
    entityId: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
