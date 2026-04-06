import { z } from 'zod';

export const connectAccountSchema = z.object({
  provider: z.enum(['gmail', 'outlook', 'smtp']),
  email: z.string().email().max(200),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  settings: z.object({
    host: z.string().max(200).optional(),
    port: z.number().int().min(1).max(65535).optional(),
    username: z.string().max(200).optional(),
    password: z.string().max(500).optional(),
  }).optional(),
});

export const sendEmailSchema = z.object({
  accountId: z.string().min(1),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  toEmails: z.array(z.string().email()).min(1),
  ccEmails: z.array(z.string().email()).optional(),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
});

export const listEmailsSchema = z.object({
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  accountId: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const trackingPixelSchema = z.object({
  messageId: z.string().min(1),
});
