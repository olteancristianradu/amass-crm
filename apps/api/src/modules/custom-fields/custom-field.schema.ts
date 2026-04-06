import { z } from 'zod';

export const createFieldDefSchema = z.object({
  entityType: z.enum(['contact', 'company', 'deal']),
  fieldName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_]+$/, 'Field name must be alphanumeric with underscores'),
  fieldLabel: z.string().min(1).max(200),
  fieldType: z.enum(['text', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'url', 'email', 'phone']),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const updateFieldDefSchema = z.object({
  fieldLabel: z.string().min(1).max(200).optional(),
  fieldType: z.enum(['text', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'url', 'email', 'phone']).optional(),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const setFieldValueSchema = z.object({
  definitionId: z.string().min(1),
  entityType: z.enum(['contact', 'company', 'deal']),
  entityId: z.string().min(1),
  value: z.string(),
});

export const setFieldValuesSchema = z.object({
  entityType: z.enum(['contact', 'company', 'deal']),
  entityId: z.string().min(1),
  values: z.array(z.object({
    definitionId: z.string().min(1),
    value: z.string(),
  })).min(1),
});
