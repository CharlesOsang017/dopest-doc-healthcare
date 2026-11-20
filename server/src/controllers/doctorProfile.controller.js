import DoctorProfile from "../models/doctorProfile.model.js";
import { doctorProfileSchema } from "../schemas.js";
import { calculateDoctorProfileCompletion } from "../utils/profileCompletion.js";

export const createDoctorProfile = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can create doctor profiles.",
      });
    }

    const validation = doctorProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor profile information.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const existingProfile = await DoctorProfile.findOne({
      user: req.user._id,
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "Doctor profile already exists.",
      });
    }

    const profile = new DoctorProfile({
      user: req.user._id,
      ...validation.data,
    });

    profile.profileCompleted = calculateDoctorProfileCompletion(profile);

    await profile.save();

    return res.status(201).json({
      success: true,
      message: "Doctor profile created successfully.",
      profile,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This medical license number is already registered.",
      });
    }

    console.error("Doctor profile creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the doctor profile.",
    });
  }
};

export const getDoctorProfile = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can access this profile.",
      });
    }

    const profile = await DoctorProfile.findOne({
      user: req.user._id,
    }).populate("user", "name email phone");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get doctor profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving the doctor profile.",
    });
  }
};
