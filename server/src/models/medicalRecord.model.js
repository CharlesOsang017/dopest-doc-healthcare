import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    recordType: {
      type: String,
      enum: [
        "consultation",
        "diagnosis",
        "lab-result",
        "imaging",
        "procedure",
        "vaccination",
        "other",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    diagnosis: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    symptoms: {
      type: [String],
      default: [],
    },

    treatment: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    recordedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

medicalRecordSchema.index({
  patient: 1,
  recordedAt: -1,
});

medicalRecordSchema.index({
  doctor: 1,
  recordedAt: -1,
});

const MedicalRecord = mongoose.model("MedicalRecord", medicalRecordSchema);

export default MedicalRecord;
