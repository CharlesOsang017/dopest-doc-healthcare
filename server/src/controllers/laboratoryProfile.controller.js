import mongoose from "mongoose";
import { createProfileSchema } from "../schemas.js";
import LaboratoryProfile from "../models/laboratoryPofile.model.js";

const updateProfileSchema = createProfileSchema.partial();

const calculateProfileCompletion = (profile) => {
  return Boolean(
    profile.laboratoryName &&
    profile.registrationNumber &&
    profile.contactPerson &&
    profile.phone,
  );
};

// Create laboratory profile
export const createLaboratoryProfile = async (req, res) => {
  try {
    if (req.user.role !== "laboratory") {
      return res.status(403).json({
        success: false,
        message: "Only laboratory accounts can create laboratory profiles.",
      });
    }

    const validation = createProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid laboratory profile information.",
        errors: validation.error.flatten(),
      });
    }

    const existingProfile = await LaboratoryProfile.findOne({
      user: req.user._id,
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "Laboratory profile already exists.",
      });
    }

    const profileData = validation.data;

    const profile = await LaboratoryProfile.create({
      ...profileData,
      user: req.user._id,
      profileCompleted: calculateProfileCompletion(profileData),
    });

    return res.status(201).json({
      success: true,
      message: "Laboratory profile created successfully.",
      profile,
    });
  } catch (error) {
    console.error("Create laboratory profile error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Registration number is already in use.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create laboratory profile.",
    });
  }
};

// Get own laboratory profile
export const getMyLaboratoryProfile = async (req, res) => {
  try {
    if (req.user.role !== "laboratory") {
      return res.status(403).json({
        success: false,
        message: "Only laboratory accounts can access this profile.",
      });
    }

    const profile = await LaboratoryProfile.findOne({
      user: req.user._id,
    }).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Laboratory profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get laboratory profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve laboratory profile.",
    });
  }
};

// Update own laboratory profile
export const updateLaboratoryProfile = async (req, res) => {
  try {
    if (req.user.role !== "laboratory") {
      return res.status(403).json({
        success: false,
        message: "Only laboratory accounts can update laboratory profiles.",
      });
    }

    const validation = updateProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid laboratory profile information.",
        errors: validation.error.flatten(),
      });
    }

    const updates = validation.data;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update.",
      });
    }

    const profile = await LaboratoryProfile.findOne({
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Laboratory profile not found.",
      });
    }

    const registrationNumberChanged =
      updates.registrationNumber &&
      updates.registrationNumber.toUpperCase() !== profile.registrationNumber;

    if (updates.address) {
      profile.address = {
        ...profile.address.toObject(),
        ...updates.address,
      };
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== "address") {
        profile[key] = value;
      }
    });

    if (registrationNumberChanged) {
      profile.isVerified = false;
    }

    profile.profileCompleted = calculateProfileCompletion(profile);

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Laboratory profile updated successfully.",
      profile,
    });
  } catch (error) {
    console.error("Update laboratory profile error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Registration number is already in use.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update laboratory profile.",
    });
  }
};
