import { z } from 'zod';

const stageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0),
  probability: z.number().int().min(0).max(100).default(0),
  color: z.string().max(20).default('#6B7280'),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
  rottingDays: z.number().int().positive().optional(),
});

export const createPipelineSchema = z.object({
  name: z.string().min(1).max(200),
  isDefault: z.boolean().optional(),
  stages: z.array(stageSchema).min(1),
});

export const updatePipelineSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isDefault: z.boolean().optional(),
  stages: z.array(stageSchema).optional(),
});

export const reorderStagesSchema = z.object({
  stages: z.array(z.object({
    id: z.string(),
    sortOrder: z.number().int().min(0),
  })).min(1),
});
