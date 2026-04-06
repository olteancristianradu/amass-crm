import { z } from 'zod';

export const grantConsentSchema = z.object({
  contactId: z.string().min(1),
  consentType: z.enum(['marketing_email', 'marketing_sms', 'data_processing', 'profiling']),
  source: z.string().min(1).max(500),
});

export const revokeConsentSchema = z.object({
  contactId: z.string().min(1),
  consentType: z.enum(['marketing_email', 'marketing_sms', 'data_processing', 'profiling']),
});

export const dataExportSchema = z.object({
  contactId: z.string().min(1),
});

export const dataDeletionSchema = z.object({
  contactId: z.string().min(1),
  confirmation: z.literal('DELETE'),
});
