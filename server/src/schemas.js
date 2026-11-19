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

export const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().max(20).optional(),
  })
  .strict();

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  })
  .strict();

export const patientProfileSchema = z
  .object({
    dateOfBirth: z.coerce.date().optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),

    address: z
      .object({
        street: z.string().trim().max(150).optional(),
        city: z.string().trim().max(100).optional(),
        county: z.string().trim().max(100).optional(),
        country: z.string().trim().max(100).optional(),
      })
      .strict()
      .optional(),

    emergencyContact: z
      .object({
        name: z.string().trim().max(100).optional(),
        relationship: z.string().trim().max(50).optional(),
        phone: z.string().trim().max(20).optional(),
      })
      .strict()
      .optional(),

    profilePhoto: z.string().url().optional(),
  })
  .strict();
