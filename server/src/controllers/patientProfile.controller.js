import { patientProfileSchema } from "../schemas.js";
import PatientProfile from "../models/patientprofile.model.js";
import { calculateProfileCompletion } from "../utils/calculateProfileCompletion.js";

export const createPatientProfile = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can create patient profiles.",
      });
    }

    const validation = patientProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid profile details.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const existingProfile = await PatientProfile.findOne({
      user: req.user._id,
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "A patient profile already exists.",
      });
    }

    const profileData = {
      user: req.user._id,
      ...validation.data,
    };

    profileData.profileCompleted = calculateProfileCompletion(profileData);

    const profile = await PatientProfile.create(profileData);

    return res.status(201).json({
      success: true,
      message: "Patient profile created successfully.",
      profile,
    });
  } catch (error) {
    console.error("Patient profile creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating your profile.",
    });
  }
};

export const getPatientProfile = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can access patient profiles.",
      });
    }

    const profile = await PatientProfile.findOne({
      user: req.user._id,
    }).populate("user", "name email phone");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Patient profile retrieval error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving your profile.",
    });
  }
};

export const updatePatientProfile = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can update patient profiles.",
      });
    }

    const validation = patientProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid profile details.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const updates = validation.data;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
    }

    const profile = await PatientProfile.findOne({
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found.",
      });
    }

    // Update nested objects without replacing existing nested fields.
    if (updates.address) {
      updates.address = {
        ...profile.address.toObject(),
        ...updates.address,
      };
    }

    if (updates.emergencyContact) {
      updates.emergencyContact = {
        ...profile.emergencyContact.toObject(),
        ...updates.emergencyContact,
      };
    }

    Object.assign(profile, updates);

    profile.profileCompleted = calculateProfileCompletion(profile);

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Patient profile updated successfully.",
      profile,
    });
  } catch (error) {
    console.error("Patient profile update error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating your profile.",
    });
  }
};
