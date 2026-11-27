import { z } from "zod";
import { daysOfWeek } from "./utils/daysOfWeek.js";
import mongoose from "mongoose";

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

export const doctorProfileSchema = z
  .object({
    specialization: z.string().trim().min(2).max(100),

    qualifications: z.array(z.string().trim().min(2).max(150)).min(1),

    licenseNumber: z.string().trim().min(3).max(50),

    yearsOfExperience: z.number().min(0).max(80).optional(),

    consultationFee: z.number().min(0).optional(),

    bio: z.string().trim().max(1000).optional(),

    languages: z.array(z.string().trim().min(2).max(50)).optional(),
  })
  .strict();

export const rejectionSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const timeSlotSchema = z
  .object({
    startTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Start time must use HH:mm format.",
      ),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must use HH:mm format."),
  })
  .strict();

export const weeklyScheduleSchema = z
  .object({
    weeklySchedule: z
      .array(
        z
          .object({
            day: z.enum(daysOfWeek),
            slots: z.array(timeSlotSchema),
          })
          .strict(),
      )
      .max(7),
    slotDuration: z.number().int().min(5).max(240).optional(),
    isAcceptingAppointments: z.boolean().optional(),
  })
  .strict();

export const bookingSchema = z
  .object({
    doctorId: z
      .string()
      .refine(
        (value) => mongoose.Types.ObjectId.isValid(value),
        "Invalid doctor ID.",
      ),
    appointmentDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Appointment date must use YYYY-MM-DD format.",
      ),
    startTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Start time must use HH:mm format.",
      ),
    reason: z.string().trim().min(5).max(1000),
    consultationType: z.enum(["in-person", "online"]).optional(),
  })
  .strict();

export const cancelAppointmentSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const rescheduleAppointmentSchema = z
  .object({
    appointmentDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Appointment date must use YYYY-MM-DD format.",
      ),
    startTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        "Start time must use HH:mm format.",
      ),
  })
  .strict();

export const medicalRecordSchema = z.object({
  patientId: z
    .string()
    .refine(
      (value) => mongoose.Types.ObjectId.isValid(value),
      "Invalid patient ID.",
    ),

  appointmentId: z
    .string()
    .refine(
      (value) => mongoose.Types.ObjectId.isValid(value),
      "Invalid appointment ID.",
    )
    .optional(),

  recordType: z.enum([
    "consultation",
    "diagnosis",
    "lab-result",
    "imaging",
    "procedure",
    "vaccination",
    "other",
  ]),

  title: z.string().trim().min(3).max(200),

  description: z.string().trim().max(3000).optional(),

  diagnosis: z.string().trim().max(2000).optional(),

  symptoms: z.array(z.string().trim().min(1).max(200)).max(30).optional(),

  treatment: z.string().trim().max(3000).optional(),

  notes: z.string().trim().max(3000).optional(),

  recordedAt: z.coerce.date().optional(),
});

export const updateMedicalRecordSchema = z
  .object({
    recordType: z
      .enum([
        "consultation",
        "diagnosis",
        "lab-result",
        "imaging",
        "procedure",
        "vaccination",
        "other",
      ])
      .optional(),

    title: z.string().trim().min(3).max(200).optional(),

    description: z.string().trim().max(3000).optional(),

    diagnosis: z.string().trim().max(2000).optional(),

    symptoms: z.array(z.string().trim().min(1).max(200)).max(30).optional(),

    treatment: z.string().trim().max(3000).optional(),

    notes: z.string().trim().max(3000).optional(),

    recordedAt: z.coerce.date().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update.",
  );

export const prescriptionSchema = z
  .object({
    patientId: z
      .string()
      .refine(
        (value) => mongoose.Types.ObjectId.isValid(value),
        "Invalid patient ID.",
      ),
    appointmentId: z
      .string()
      .refine(
        (value) => mongoose.Types.ObjectId.isValid(value),
        "Invalid appointment ID.",
      )
      .optional(),
    medicalRecordId: z
      .string()
      .refine(
        (value) => mongoose.Types.ObjectId.isValid(value),
        "Invalid medical record ID.",
      )
      .optional(),
    items: z
      .array(
        z
          .object({
            medicationName: z.string().trim().min(2).max(200),
            strength: z.string().trim().max(100).optional(),
            dosage: z.string().trim().min(1).max(200),
            route: z.string().trim().max(100).optional(),
            frequency: z.string().trim().min(1).max(200),
            duration: z.string().trim().min(1).max(100),
            quantity: z.number().int().min(1),
            instructions: z.string().trim().max(1000).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();
