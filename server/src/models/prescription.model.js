import mongoose from "mongoose";

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicationName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    strength: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    dosage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    route: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    frequency: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  { _id: true },
);

const prescriptionSchema = new mongoose.Schema(
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
    medicalRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicalRecord",
      default: null,
    },
    items: {
      type: [prescriptionItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "A prescription must contain at least one medication.",
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: ["issued", "cancelled", "dispensed"],
      default: "issued",
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    verificationCodeHash: {
      type: String,
      select: false,
    },
    dispensedAt: {
      type: Date,
      default: null,
    },
    dispensedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);
prescriptionSchema.index(
  { verificationCodeHash: 1 },
  {
    unique: true,
    partialFilterExpression: {
      verificationCodeHash: { $type: "string" },
    },
  },
);

prescriptionSchema.index({ patient: 1, issuedAt: -1 });
prescriptionSchema.index({ doctor: 1, issuedAt: -1 });

const Prescription = mongoose.model("Prescription", prescriptionSchema);

export default Prescription;
