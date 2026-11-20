import mongoose from "mongoose";

const patientProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: null,
    },

    address: {
      street: {
        type: String,
        trim: true,
        default: "",
      },

      city: {
        type: String,
        trim: true,
        default: "",
      },

      county: {
        type: String,
        trim: true,
        default: "",
      },

      country: {
        type: String,
        trim: true,
        default: "Kenya",
      },
    },

    emergencyContact: {
      name: {
        type: String,
        trim: true,
        default: "",
      },

      relationship: {
        type: String,
        trim: true,
        default: "",
      },

      phone: {
        type: String,
        trim: true,
        default: "",
      },
    },

    profilePhoto: {
      type: String,
      default: "",
    },

    profilePhotoPublicId: {
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

const PatientProfile = mongoose.model("PatientProfile", patientProfileSchema);

export default PatientProfile;
