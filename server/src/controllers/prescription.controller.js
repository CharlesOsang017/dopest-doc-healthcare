import Appointment from "../models/appointment.model.js";
import DoctorProfile from "../models/doctorProfile.model.js";
import MedicalRecord from "../models/medicalRecord.model.js";
import Prescription from "../models/prescription.model.js";
import User from "../models/user.model.js";
import { prescriptionSchema } from "../schemas.js";
import mongoose from "mongoose";
import { z } from "zod";

export const createPrescription = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can issue prescriptions.",
      });
    }

    const validation = prescriptionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid prescription data.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const doctorProfile = await DoctorProfile.findOne({
      user: req.user._id,
      licenseVerificationStatus: "verified",
    });

    if (!doctorProfile) {
      return res.status(403).json({
        success: false,
        message: "Your doctor profile must be verified.",
      });
    }

    const { patientId, appointmentId, medicalRecordId, items, notes } =
      validation.data;

    const patient = await User.findOne({
      _id: patientId,
      role: "patient",
      isActive: true,
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Active patient not found.",
      });
    }

    let linkedAppointment = null;

    if (appointmentId) {
      linkedAppointment = await Appointment.findOne({
        _id: appointmentId,
        patient: patientId,
        doctor: req.user._id,
        status: "completed",
      });

      if (!linkedAppointment) {
        return res.status(400).json({
          success: false,
          message:
            "A completed appointment between this doctor and patient is required.",
        });
      }
    } else {
      linkedAppointment = await Appointment.findOne({
        patient: patientId,
        doctor: req.user._id,
        status: "completed",
      }).sort({
        appointmentDate: -1,
        startTime: -1,
        _id: -1,
      });
    }

    let linkedMedicalRecord = null;

    if (medicalRecordId) {
      linkedMedicalRecord = await MedicalRecord.findOne({
        _id: medicalRecordId,
        patient: patientId,
        doctor: req.user._id,
      });

      if (!linkedMedicalRecord) {
        return res.status(400).json({
          success: false,
          message: "Medical record does not belong to this doctor and patient.",
        });
      }
    }

    if (!linkedAppointment && !linkedMedicalRecord) {
      return res.status(400).json({
        success: false,
        message:
          "A completed appointment or an existing medical record is required.",
      });
    }

    const prescription = await Prescription.create({
      patient: patientId,
      doctor: req.user._id,
      appointment: linkedAppointment?._id || null,
      medicalRecord: linkedMedicalRecord?._id || null,
      items,
      notes: notes || "",
    });

    return res.status(201).json({
      success: true,
      message: "Prescription issued successfully.",
      prescription,
    });
  } catch (error) {
    console.error("Create prescription error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to issue prescription.",
    });
  }
};

export const getMyPrescriptions = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can view their prescriptions.",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );
    const skip = (page - 1) * limit;

    const filter = {
      patient: req.user._id,
    };

    if (req.query.status) {
      if (!["issued", "cancelled"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid prescription status.",
        });
      }

      filter.status = req.query.status;
    }

    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter)
        .populate("doctor", "name")
        .populate("appointment", "appointmentDate startTime endTime status")
        .populate("medicalRecord", "recordType title recordedAt")
        .sort({ issuedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Prescription.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
      prescriptions,
    });
  } catch (error) {
    console.error("Get patient prescriptions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve prescriptions.",
    });
  }
};

export const getDoctorPrescriptions = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can view their prescription history.",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );
    const skip = (page - 1) * limit;

    const filter = {
      doctor: req.user._id,
    };

    if (req.query.status) {
      if (!["issued", "cancelled"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid prescription status.",
        });
      }

      filter.status = req.query.status;
    }

    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter)
        .populate("patient", "name email phone")
        .populate("appointment", "appointmentDate startTime endTime status")
        .populate("medicalRecord", "recordType title recordedAt")
        .sort({ issuedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Prescription.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
      prescriptions,
    });
  } catch (error) {
    console.error("Get doctor prescriptions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve prescription history.",
    });
  }
};

export const getPrescriptionById = async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid prescription ID.",
      });
    }

    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      $or: [{ patient: req.user._id }, { doctor: req.user._id }],
    })
      .populate("patient", "name email phone")
      .populate("doctor", "name")
      .populate("appointment", "appointmentDate startTime endTime status")
      .populate("medicalRecord", "recordType title diagnosis recordedAt")
      .lean();

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found.",
      });
    }

    return res.status(200).json({
      success: true,
      prescription,
    });
  } catch (error) {
    console.error("Get prescription by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve prescription.",
    });
  }
};

export const cancelPrescription = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can cancel prescriptions.",
      });
    }

    const { prescriptionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(prescriptionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid prescription ID.",
      });
    }

    const validation = z
      .object({
        cancellationReason: z.string().trim().min(3).max(1000),
      })
      .strict()
      .safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid cancellation information.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const prescription = await Prescription.findOneAndUpdate(
      {
        _id: prescriptionId,
        doctor: req.user._id,
        status: "issued",
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: validation.data.cancellationReason,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!prescription) {
      const existingPrescription = await Prescription.exists({
        _id: prescriptionId,
        doctor: req.user._id,
      });

      if (!existingPrescription) {
        return res.status(404).json({
          success: false,
          message: "Prescription not found.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Only issued prescriptions can be cancelled.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Prescription cancelled successfully.",
      prescription,
    });
  } catch (error) {
    console.error("Cancel prescription error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel prescription.",
    });
  }
};
