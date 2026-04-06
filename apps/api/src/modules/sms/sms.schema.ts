import { z } from 'zod';

export const sendSmsSchema = z.object({
  contactId: z.string().optional(),
  toNumber: z.string().min(1),
  body: z.string().min(1).max(1600),
  dealId: z.string().optional(),
});

export const listSmsSchema = z.object({
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
