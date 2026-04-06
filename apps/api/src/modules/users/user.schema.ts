import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  pin: z.string().min(4).max(8).optional(),
  role: z.enum(['ADMIN', 'SELLER']).optional(),
  avatar: z.string().max(10).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  pin: z.string().min(4).max(8).optional(),
  role: z.enum(['ADMIN', 'SELLER']).optional(),
  avatar: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
});
