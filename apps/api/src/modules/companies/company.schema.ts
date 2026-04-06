import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(200).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(10).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const listCompaniesSchema = z.object({
  search: z.string().optional(),
  industry: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const mergeCompaniesSchema = z.object({
  primaryId: z.string().min(1),
  secondaryId: z.string().min(1),
});
