import Appointment from "../models/appointment.model.js";
import DoctorProfile from "../models/doctorProfile.model.js";
import MedicalRecord from "../models/medicalRecord.model.js";
import User from "../models/user.model.js";
import { medicalRecordSchema } from "../schemas.js";

export const createMedicalRecord = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can create medical records.",
      });
    }

    const validation = medicalRecordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid medical record information.",
        errors: validation.error.flatten(),
      });
    }

    const { patientId, appointmentId, ...recordData } = validation.data;

    const [patient, doctorProfile] = await Promise.all([
      User.findOne({
        _id: patientId,
        role: "patient",
        isActive: true,
      }).select("_id"),

      DoctorProfile.findOne({
        user: req.user._id,
        licenseVerificationStatus: "verified",
      }).select("_id"),
    ]);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Active patient account not found.",
      });
    }

    if (!doctorProfile) {
      return res.status(403).json({
        success: false,
        message:
          "Your medical license must be verified to create medical records.",
      });
    }

    if (appointmentId) {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: patientId,
        doctor: req.user._id,
        status: "completed",
      }).select("_id");

      if (!appointment) {
        return res.status(400).json({
          success: false,
          message:
            "A completed appointment belonging to this patient and doctor is required.",
        });
      }
    }

    const medicalRecord = await MedicalRecord.create({
      patient: patientId,
      doctor: req.user._id,
      appointment: appointmentId || null,
      ...recordData,
    });

    return res.status(201).json({
      success: true,
      message: "Medical record created successfully.",
      medicalRecord,
    });
  } catch (error) {
    console.error("Create medical record error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the medical record.",
    });
  }
};
