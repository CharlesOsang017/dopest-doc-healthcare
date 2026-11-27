import mongoose from "mongoose";

const medicalRecordAuditSchema = new mongoose.Schema(
  {
    medicalRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicalRecord",
      required: true,
      index: true,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: ["created", "updated", "archived"],
      required: true,
    },

    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

medicalRecordAuditSchema.index({
  medicalRecord: 1,
  createdAt: -1,
});

const MedicalRecordAudit = mongoose.model(
  "MedicalRecordAudit",
  medicalRecordAuditSchema,
);

export default MedicalRecordAudit;
