import Appointment from "../models/appointment.model.js";
import DoctorProfile from "../models/doctorProfile.model.js";
import MedicalRecord from "../models/medicalRecord.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import { z } from "zod";
import { medicalRecordSchema, updateMedicalRecordSchema } from "../schemas.js";
import MedicalRecordAudit from "../models/medicalRecordAudit.model.js";
import MedicalRecordAddendum from "../models/medicalRecordAddendum.model.js";

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
    let linkedAppointmentId = null;

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

      linkedAppointmentId = appointment._id;
    } else {
      const latestAppointment = await Appointment.findOne({
        patient: patientId,
        doctor: req.user._id,
        status: "completed",
      })
        .sort({
          appointmentDate: -1,
          startTime: -1,
          _id: -1,
        })
        .select("_id");

      linkedAppointmentId = latestAppointment?._id || null;
    }

    const medicalRecord = await MedicalRecord.create({
      patient: patientId,
      doctor: req.user._id,
      appointment: linkedAppointmentId,
      ...recordData,
    });

    await MedicalRecordAudit.create({
      medicalRecord: medicalRecord._id,
      performedBy: req.user._id,
      action: "created",
      changes: {
        fields: Object.keys(recordData),
      },
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
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

export const getMyMedicalRecords = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can view their medical records.",
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
      isArchived: false,
    };

    const [medicalRecords, total] = await Promise.all([
      MedicalRecord.find(filter)
        .populate("doctor", "name")
        .populate("appointment", "appointmentDate startTime endTime")
        .sort({
          recordedAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      MedicalRecord.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
      medicalRecords,
    });
  } catch (error) {
    console.error("Get patient medical records error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving medical records.",
    });
  }
};

export const getPatientMedicalRecords = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can retrieve patient medical records.",
      });
    }

    const { patientId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID.",
      });
    }

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
          "Your medical license must be verified to access patient records.",
      });
    }

    const hasTreatedPatient = await Appointment.exists({
      doctor: req.user._id,
      patient: patientId,
      status: "completed",
    });

    if (!hasTreatedPatient) {
      return res.status(403).json({
        success: false,
        message:
          "You must have a completed appointment with this patient to access their records.",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );

    const skip = (page - 1) * limit;

    const filter = {
      patient: patientId,
      doctor: req.user._id,
      isArchived: false,
    };

    const [medicalRecords, total] = await Promise.all([
      MedicalRecord.find(filter)
        .populate("doctor", "name")
        .populate("appointment", "appointmentDate startTime endTime")
        .sort({
          recordedAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      MedicalRecord.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
      medicalRecords,
    });
  } catch (error) {
    console.error("Get doctor patient medical records error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving patient medical records.",
    });
  }
};

export const updateMedicalRecord = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can update medical records.",
      });
    }

    const { recordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medical record ID.",
      });
    }

    const validation = updateMedicalRecordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid medical record information.",
        errors: validation.error.flatten(),
      });
    }

    const doctorProfile = await DoctorProfile.findOne({
      user: req.user._id,
      licenseVerificationStatus: "verified",
    }).select("_id");

    if (!doctorProfile) {
      return res.status(403).json({
        success: false,
        message:
          "Your medical license must be verified to update medical records.",
      });
    }

    const medicalRecord = await MedicalRecord.findOne({
      _id: recordId,
      doctor: req.user._id,
      isArchived: false,
    });

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message:
          "Medical record not found or you do not have permission to update it.",
      });
    }

    const updatedFields = Object.keys(validation.data);

    Object.assign(medicalRecord, validation.data);

    await medicalRecord.save();

    await MedicalRecordAudit.create({
      medicalRecord: medicalRecord._id,
      performedBy: req.user._id,
      action: "updated",
      changes: {
        fields: updatedFields,
      },
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "Medical record updated successfully.",
      medicalRecord,
    });
  } catch (error) {
    console.error("Update medical record error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the medical record.",
    });
  }
};

export const archiveMedicalRecord = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can archive medical records.",
      });
    }

    const { recordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medical record ID.",
      });
    }

    const doctorProfile = await DoctorProfile.findOne({
      user: req.user._id,
      licenseVerificationStatus: "verified",
    }).select("_id");

    if (!doctorProfile) {
      return res.status(403).json({
        success: false,
        message:
          "Your medical license must be verified to archive medical records.",
      });
    }

    const medicalRecord = await MedicalRecord.findOneAndUpdate(
      {
        _id: recordId,
        doctor: req.user._id,
        isArchived: false,
      },
      {
        $set: {
          isArchived: true,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message:
          "Medical record not found, already archived, or you do not have permission to archive it.",
      });
    }

    await MedicalRecordAudit.create({
      medicalRecord: medicalRecord._id,
      performedBy: req.user._id,
      action: "archived",
      changes: {
        fields: ["isArchived"],
      },
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(200).json({
      success: true,
      message: "Medical record archived successfully.",
      medicalRecord,
    });
  } catch (error) {
    console.error("Archive medical record error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while archiving the medical record.",
    });
  }
};

export const getMedicalRecordAuditHistory = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can view medical record audit history.",
      });
    }

    const { recordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medical record ID.",
      });
    }

    const medicalRecord = await MedicalRecord.findOne({
      _id: recordId,
      doctor: req.user._id,
    }).select("_id");

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found.",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );
    const skip = (page - 1) * limit;

    const [auditHistory, total] = await Promise.all([
      MedicalRecordAudit.find({
        medicalRecord: recordId,
      })
        .populate("performedBy", "name role")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      MedicalRecordAudit.countDocuments({
        medicalRecord: recordId,
      }),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      auditHistory: auditHistory.map((entry) => ({
        _id: entry._id,
        action: entry.action,
        changes: entry.changes,
        performedBy: entry.performedBy,
        createdAt: entry.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get medical record audit history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve medical record audit history.",
    });
  }
};

export const createMedicalRecordAddendum = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can add medical record addenda.",
      });
    }

    const { recordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medical record ID.",
      });
    }

    const validation = z
      .object({
        content: z.string().trim().min(3).max(3000),
      })
      .strict()
      .safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid addendum data.",
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

    const medicalRecord = await MedicalRecord.findOne({
      _id: recordId,
      doctor: req.user._id,
    });

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found.",
      });
    }

    const addendum = await MedicalRecordAddendum.create({
      medicalRecord: medicalRecord._id,
      doctor: req.user._id,
      content: validation.data.content,
    });

    await MedicalRecordAudit.create({
      medicalRecord: medicalRecord._id,
      performedBy: req.user._id,
      action: "updated",
      changes: {
        type: "addendum",
        addendumId: addendum._id,
      },
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
    });

    return res.status(201).json({
      success: true,
      message: "Medical record addendum created successfully.",
      addendum,
    });
  } catch (error) {
    console.error("Create medical record addendum error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create medical record addendum.",
    });
  }
};

export const getMedicalRecordAddenda = async (req, res) => {
  try {
    const { recordId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid medical record ID.",
      });
    }

    const medicalRecord = await MedicalRecord.findOne({
      _id: recordId,
      $or: [{ patient: req.user._id }, { doctor: req.user._id }],
    }).select("_id");

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found.",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );
    const skip = (page - 1) * limit;

    const [addenda, total] = await Promise.all([
      MedicalRecordAddendum.find({
        medicalRecord: recordId,
      })
        .populate("doctor", "name")
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      MedicalRecordAddendum.countDocuments({
        medicalRecord: recordId,
      }),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      addenda,
    });
  } catch (error) {
    console.error("Get medical record addenda error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve medical record addenda.",
    });
  }
};
