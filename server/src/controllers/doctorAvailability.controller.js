import DoctorAvailability from "../models/doctorAvailability.model.js";
import { weeklyScheduleSchema } from "../schemas.js";
import DoctorProfile from "../models/doctorProfile.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
// import DoctorAvailability from "../models/DoctorAvailability.js";

const validateSchedule = (schedule) => {
  const seenDays = new Set();

  for (const daySchedule of schedule) {
    if (seenDays.has(daySchedule.day)) {
      return `Duplicate schedule entry for ${daySchedule.day}.`;
    }

    seenDays.add(daySchedule.day);

    const sortedSlots = [...daySchedule.slots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );

    for (let i = 0; i < sortedSlots.length; i++) {
      const current = sortedSlots[i];

      if (current.startTime >= current.endTime) {
        return `Invalid time range on ${daySchedule.day}. End time must be later than start time.`;
      }

      if (i > 0 && sortedSlots[i - 1].endTime > current.startTime) {
        return `Overlapping time slots found on ${daySchedule.day}.`;
      }
    }
  }

  return null;
};

export const updateDoctorAvailability = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can manage their availability.",
      });
    }

    const validation = weeklyScheduleSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid availability data.",
        errors: validation.error.issues,
      });
    }

    const scheduleError = validateSchedule(validation.data.weeklySchedule);

    if (scheduleError) {
      return res.status(400).json({
        success: false,
        message: scheduleError,
      });
    }

    const availability = await DoctorAvailability.findOneAndUpdate(
      { doctor: req.user._id },
      { $set: validation.data },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Availability updated successfully.",
      availability,
    });
  } catch (error) {
    console.error("Update doctor availability error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating availability.",
    });
  }
};

export const getMyDoctorAvailability = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can view this availability.",
      });
    }

    const availability = await DoctorAvailability.findOne({
      doctor: req.user._id,
    });

    return res.status(200).json({
      success: true,
      availability,
    });
  } catch (error) {
    console.error("Get doctor availability error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving availability.",
    });
  }
};

export const getPublicDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID.",
      });
    }

    const doctor = await User.findOne({
      _id: doctorId,
      role: "doctor",
      isActive: true,
    }).select("_id");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found.",
      });
    }

    const doctorProfile = await DoctorProfile.findOne({
      user: doctor._id,
      licenseVerificationStatus: "verified",
    }).select("_id");

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message: "Verified doctor profile not found.",
      });
    }

    const availability = await DoctorAvailability.findOne({
      doctor: doctor._id,
      isAcceptingAppointments: true,
    }).select("weeklySchedule slotDuration isAcceptingAppointments");

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "Doctor is currently not accepting appointments.",
      });
    }

    return res.status(200).json({
      success: true,
      doctorId: doctor._id,
      availability,
    });
  } catch (error) {
    console.error("Get public doctor availability error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving doctor availability.",
    });
  }
};
