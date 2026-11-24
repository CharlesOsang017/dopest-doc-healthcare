import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
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
    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    consultationType: {
      type: String,
      enum: ["in-person", "online"],
      default: "in-person",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected", "cancelled", "completed"],
      default: "pending",
      index: true,
    },
    consultationFee: {
      type: Number,
      min: 0,
      required: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true },
);

appointmentSchema.index({
  doctor: 1,
  appointmentDate: 1,
  startTime: 1,
  status: 1,
});

appointmentSchema.index({
  patient: 1,
  appointmentDate: -1,
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;
