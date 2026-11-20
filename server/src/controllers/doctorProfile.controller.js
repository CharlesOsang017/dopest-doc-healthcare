import DoctorProfile from "../models/doctorProfile.model.js";
import { doctorProfileSchema } from "../schemas.js";
import { calculateDoctorProfileCompletion } from "../utils/profileCompletion.js";
import uploadToCloudinary from "../utils/uploadToCloudinary.js";

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

export const updateDoctorProfile = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can update doctor profiles.",
      });
    }

    const updateSchema = doctorProfileSchema.partial();

    const validation = updateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor profile information.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    if (Object.keys(validation.data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
    }

    const profile = await DoctorProfile.findOne({
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found.",
      });
    }

    Object.assign(profile, validation.data);

    profile.profileCompleted = calculateDoctorProfileCompletion(profile);

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Doctor profile updated successfully.",
      profile,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This medical license number is already registered.",
      });
    }

    console.error("Doctor profile update error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the doctor profile.",
    });
  }
};

export const uploadDoctorProfilePhoto = async (req, res) => {
  let uploadedImage;

  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can upload profile photos.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image to upload.",
      });
    }

    const profile = await DoctorProfile.findOne({
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found.",
      });
    }

    // Upload the new image.
    uploadedImage = await uploadToCloudinary(req.file.buffer);

    // Keep the previous image ID.
    const previousPublicId = profile.profilePhotoPublicId;

    // Save the new image information.
    profile.profilePhoto = uploadedImage.secure_url;
    profile.profilePhotoPublicId = uploadedImage.public_id;

    await profile.save();

    // Delete the previous image after successful database save.
    if (previousPublicId) {
      try {
        await cloudinary.uploader.destroy(previousPublicId);
      } catch (deleteError) {
        console.error(
          "Previous doctor profile photo deletion error:",
          deleteError,
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Doctor profile photo uploaded successfully.",
      profilePhoto: profile.profilePhoto,
      profilePhotoPublicId: profile.profilePhotoPublicId,
    });
  } catch (error) {
    // Clean up the new image if the database save fails.
    if (uploadedImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id);
      } catch (cleanupError) {
        console.error("Cloudinary cleanup error:", cleanupError);
      }
    }

    console.error("Doctor profile photo upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while uploading the doctor profile photo.",
    });
  }
};
