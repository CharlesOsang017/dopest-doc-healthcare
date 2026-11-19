import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8),
  phone: z.string().trim().optional().default(""),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(20).optional(),
}).strict();