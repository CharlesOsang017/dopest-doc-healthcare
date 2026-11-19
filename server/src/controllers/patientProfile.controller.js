import { z } from "zod";
// import PatientProfile from "../models/PatientProfile.js";
import { patientProfileSchema } from "../schemas.js";
import PatientProfile from "../models/patientprofile.model.js";

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

    const profile = await PatientProfile.create({
      user: req.user._id,
      ...validation.data,
    });

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
