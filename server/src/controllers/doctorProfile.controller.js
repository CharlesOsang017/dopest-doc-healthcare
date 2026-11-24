import cloudinary from "../config/cloudinary.js";
import DoctorProfile from "../models/doctorProfile.model.js";
import { doctorProfileSchema, rejectionSchema } from "../schemas.js";
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

    // Reset verification if the doctor changes their license number.
    if (
      validation.data.licenseNumber &&
      validation.data.licenseNumber !== profile.licenseNumber
    ) {
      profile.licenseVerificationStatus = "pending";
      profile.licenseVerifiedAt = null;
      profile.licenseVerifiedBy = null;
      profile.licenseRejectionReason = "";
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
    uploadedImage = await uploadToCloudinary(
      req.file.buffer,
      "dopest-doc/doctor-profiles",
    );

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

export const deleteDoctorProfilePhoto = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can delete profile photos.",
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

    if (!profile.profilePhotoPublicId) {
      return res.status(404).json({
        success: false,
        message: "No profile photo found.",
      });
    }

    const result = await cloudinary.uploader.destroy(
      profile.profilePhotoPublicId,
    );

    if (result.result !== "ok" && result.result !== "not found") {
      return res.status(500).json({
        success: false,
        message: "Failed to delete profile photo.",
      });
    }

    profile.profilePhoto = "";
    profile.profilePhotoPublicId = "";

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Doctor profile photo deleted successfully.",
    });
  } catch (error) {
    console.error("Doctor profile photo deletion error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while deleting the doctor profile photo.",
    });
  }
};

export const approveDoctorLicense = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can verify doctor licenses.",
      });
    }

    const profile = await DoctorProfile.findById(req.params.profileId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found.",
      });
    }

    profile.licenseVerificationStatus = "verified";
    profile.licenseVerifiedAt = new Date();
    profile.licenseVerifiedBy = req.user._id;
    profile.licenseRejectionReason = "";

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Doctor license verified successfully.",
      profile,
    });
  } catch (error) {
    console.error("Doctor license approval error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while verifying the doctor license.",
    });
  }
};

export const rejectDoctorLicense = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can reject doctor licenses.",
      });
    }

    const validation = rejectionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid rejection reason.",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const profile = await DoctorProfile.findById(req.params.profileId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found.",
      });
    }

    profile.licenseVerificationStatus = "rejected";
    profile.licenseVerifiedAt = null;
    profile.licenseVerifiedBy = null;
    profile.licenseRejectionReason = validation.data.reason;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Doctor license rejected successfully.",
      profile,
    });
  } catch (error) {
    console.error("Doctor license rejection error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while rejecting the doctor license.",
    });
  }
};

export const getPendingDoctorLicenses = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can view pending doctor licenses.",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );

    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      DoctorProfile.find({
        licenseVerificationStatus: "pending",
      })
        .populate("user", "name email phone")
        .select(
          "user specialization qualifications licenseNumber yearsOfExperience consultationFee bio languages profilePhoto licenseVerificationStatus createdAt",
        )
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),

      DoctorProfile.countDocuments({
        licenseVerificationStatus: "pending",
      }),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      profiles,
    });
  } catch (error) {
    console.error("Pending doctor licenses error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving pending doctor licenses.",
    });
  }
};

export const getDoctorLicenseStatus = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can view their license status.",
      });
    }

    const profile = await DoctorProfile.findOne({
      user: req.user._id,
    }).select(
      "licenseNumber licenseVerificationStatus licenseVerifiedAt licenseRejectionReason",
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      license: {
        licenseNumber: profile.licenseNumber,
        status: profile.licenseVerificationStatus || "pending",
        verifiedAt: profile.licenseVerifiedAt,
        rejectionReason: profile.licenseRejectionReason,
      },
    });
  } catch (error) {
    console.error("Doctor license status error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving license status.",
    });
  }
};

export const getPublicDoctors = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );

    const skip = (page - 1) * limit;

    const matchStage = {
      licenseVerificationStatus: "verified",
    };

    if (req.query.specialization) {
      matchStage.specialization = {
        $regex: req.query.specialization.trim(),
        $options: "i",
      };
    }

    const pipeline = [
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $match: {
          "user.isActive": true,
          "user.role": "doctor",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $facet: {
          profiles: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                specialization: 1,
                qualifications: 1,
                yearsOfExperience: 1,
                consultationFee: 1,
                bio: 1,
                languages: 1,
                profilePhoto: 1,
                licenseVerificationStatus: 1,
                user: {
                  _id: "$user._id",
                  name: "$user.name",
                },
              },
            },
          ],
          totalCount: [{ $count: "total" }],
        },
      },
    ];

    const [result] = await DoctorProfile.aggregate(pipeline);

    const total = result.totalCount[0]?.total || 0;

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      doctors: result.profiles,
    });
  } catch (error) {
    console.error("Public doctor directory error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving doctors.",
    });
  }
};
