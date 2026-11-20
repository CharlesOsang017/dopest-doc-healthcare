import mongoose from "mongoose";

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    specialization: {
      type: String,
      required: true,
      trim: true,
    },

    qualifications: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => value.length > 0,
        message: "At least one qualification is required.",
      },
    },

    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 80,
      default: 0,
    },

    consultationFee: {
      type: Number,
      min: 0,
      default: 0,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    languages: {
      type: [String],
      default: ["English"],
    },

    profilePhoto: {
      type: String,
      default: "",
    },

    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const DoctorProfile = mongoose.model("DoctorProfile", doctorProfileSchema);

export default DoctorProfile;
