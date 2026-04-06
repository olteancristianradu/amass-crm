import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  location: z.string().max(500).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  location: z.string().max(500).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  contactId: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
});

export const listEventsSchema = z.object({
  startFrom: z.string().optional(),
  startTo: z.string().optional(),
  userId: z.string().optional(),
});
