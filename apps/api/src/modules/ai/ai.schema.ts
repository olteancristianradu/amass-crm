import { z } from 'zod';

export const scoreContactSchema = z.object({
  contactId: z.string().min(1),
});

export const draftEmailSchema = z.object({
  contactId: z.string().min(1),
  purpose: z.enum(['introduction', 'follow_up', 'proposal', 'thank_you', 're_engage']),
  context: z.string().max(2000).optional(),
});

export const suggestActionSchema = z.object({
  contactId: z.string().optional(),
  dealId: z.string().optional(),
});

export const sentimentSchema = z.object({
  text: z.string().min(1).max(10000),
});

export const churnPredictionSchema = z.object({
  dealId: z.string().min(1),
});
