import Appointment from "../models/appointment.model.js";
import DoctorAvailability from "../models/doctorAvailability.model.js";
import DoctorProfile from "../models/doctorProfile.model.js";
import User from "../models/user.model.js";
import { bookingSchema } from "../schemas.js";

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const getDayName = (date) => {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return days[date.getUTCDay()];
};

export const bookAppointment = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can book appointments.",
      });
    }

    const validation = bookingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment details.",
        errors: validation.error.issues,
      });
    }

    const { doctorId, appointmentDate, startTime, reason, consultationType } =
      validation.data;

    // Validate the calendar date and interpret it as UTC.
    const date = new Date(`${appointmentDate}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== appointmentDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment date.",
      });
    }

    const now = new Date();

    const appointmentStart = new Date(
      `${appointmentDate}T${startTime}:00.000Z`,
    );

    if (appointmentStart <= now) {
      return res.status(400).json({
        success: false,
        message: "Appointment must be scheduled in the future.",
      });
    }

    // Verify the doctor account.
    const doctor = await User.findOne({
      _id: doctorId,
      role: "doctor",
      isActive: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found.",
      });
    }

    // Verify the doctor's professional license.
    const doctorProfile = await DoctorProfile.findOne({
      user: doctorId,
      licenseVerificationStatus: "verified",
    });

    if (!doctorProfile) {
      return res.status(403).json({
        success: false,
        message: "Doctor is not verified.",
      });
    }

    // Retrieve the doctor's availability.
    const availability = await DoctorAvailability.findOne({
      doctor: doctorId,
      isAcceptingAppointments: true,
    });

    if (!availability) {
      return res.status(400).json({
        success: false,
        message: "Doctor is not accepting appointments.",
      });
    }

    // Check the doctor's working day.
    const dayName = getDayName(date);

    const daySchedule = availability.weeklySchedule.find(
      (item) => item.day === dayName,
    );

    if (!daySchedule || daySchedule.slots.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Doctor is not available on this day.",
      });
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + availability.slotDuration;

    if (endMinutes > 1440) {
      return res.status(400).json({
        success: false,
        message: "Appointment cannot extend beyond midnight.",
      });
    }

    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    // Ensure the requested appointment fits inside a working slot.
    const fitsAvailability = daySchedule.slots.some((slot) => {
      return (
        startMinutes >= timeToMinutes(slot.startTime) &&
        endMinutes <= timeToMinutes(slot.endTime)
      );
    });

    if (!fitsAvailability) {
      return res.status(400).json({
        success: false,
        message: "Requested time is outside the doctor availability.",
      });
    }

    // Check for conflicts with active appointments.
    const appointmentEnd = new Date(`${appointmentDate}T${endTime}:00.000Z`);

    const conflictingAppointment = await Appointment.findOne({
      appointmentDate: date,
      status: { $in: ["pending", "confirmed"] },
      $or: [{ doctor: doctorId }, { patient: req.user._id }],
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message:
          "The doctor or patient already has an appointment during this time.",
      });
    }

    // Create the appointment.
    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      appointmentDate: date,
      startTime,
      endTime,
      reason,
      consultationType: consultationType || "in-person",
      consultationFee: doctorProfile.consultationFee,
    });

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      appointment,
    });
  } catch (error) {
    console.error("Book appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while booking the appointment.",
    });
  }
};

export const getMyAppointments = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can view their appointments.",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );

    const skip = (page - 1) * limit;

    const allowedStatuses = [
      "pending",
      "confirmed",
      "rejected",
      "cancelled",
      "completed",
    ];

    const filter = {
      patient: req.user._id,
    };

    if (req.query.status) {
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid appointment status.",
        });
      }

      filter.status = req.query.status;
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate("doctor", "name")
        .sort({ appointmentDate: -1, startTime: -1 })
        .skip(skip)
        .limit(limit),

      Appointment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      appointments,
    });
  } catch (error) {
    console.error("Get patient appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving appointments.",
    });
  }
};
