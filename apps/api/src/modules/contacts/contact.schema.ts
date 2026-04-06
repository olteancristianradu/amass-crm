import { z } from 'zod';

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  jobTitle: z.string().max(100).optional(),
  companyId: z.string().optional(),
  source: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const listContactsSchema = z.object({
  search: z.string().optional(),
  companyId: z.string().optional(),
  assignedToId: z.string().optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const mergeContactsSchema = z.object({
  primaryId: z.string().min(1),
  secondaryId: z.string().min(1),
});

export const mergeContactSchema = z.object({
  survivorId: z.string().min(1),
  mergedId: z.string().min(1),
});

export const importContactsSchema = z.object({
  contacts: z.array(z.object({
    firstName: z.string(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    companyName: z.string().optional(),
    jobTitle: z.string().optional(),
    source: z.string().optional(),
  })),
  assignToId: z.string().optional(),
});
