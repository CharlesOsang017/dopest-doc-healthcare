import mongoose from "mongoose";

const medicalRecordAddendumSchema = new mongoose.Schema(
  {
    medicalRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MedicalRecord",
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 3000,
    },
  },
  { timestamps: true },
);

medicalRecordAddendumSchema.index({
  medicalRecord: 1,
  createdAt: -1,
});

const MedicalRecordAddendum = mongoose.model(
  "MedicalRecordAddendum",
  medicalRecordAddendumSchema,
);

export default MedicalRecordAddendum;
