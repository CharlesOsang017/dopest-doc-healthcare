import mongoose from "mongoose";
import Appointment from "../models/appointment.model.js";
import DoctorAvailability from "../models/doctorAvailability.model.js";
import DoctorProfile from "../models/doctorProfile.model.js";
import User from "../models/user.model.js";
import {
  bookingSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
} from "../schemas.js";

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

const getNairobiAppointmentDateTime = (date, time) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  // Nairobi is UTC+3.
  return new Date(Date.UTC(year, month - 1, day, hours - 3, minutes));
};

const getNairobiCurrentDateTime = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
};

const isValidAppointmentId = (appointmentId) => {
  return mongoose.Types.ObjectId.isValid(appointmentId);
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

    const appointmentStart = getNairobiAppointmentDateTime(
      appointmentDate,
      startTime,
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
        .sort({
          appointmentDate: -1,
          startTime: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Appointment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
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

export const getDoctorAppointments = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can view their appointments.",
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
      doctor: req.user._id,
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
        .populate("patient", "name email phone")
        .sort({
          appointmentDate: 1,
          startTime: 1,
          _id: 1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Appointment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
      appointments,
    });
  } catch (error) {
    console.error("Get doctor appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving appointments.",
    });
  }
};

export const approveAppointment = async (req, res) => {
  try {
    if (!isValidAppointmentId(req.params.appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can approve appointments.",
      });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      doctor: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    if (appointment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending appointments can be approved.",
      });
    }

    // Check for overlapping pending or confirmed appointments.
    const conflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      appointmentDate: appointment.appointmentDate,
      status: { $in: ["pending", "confirmed"] },
      $or: [{ doctor: appointment.doctor }, { patient: appointment.patient }],
      startTime: { $lt: appointment.endTime },
      endTime: { $gt: appointment.startTime },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message:
          "This appointment conflicts with another pending or confirmed appointment.",
      });
    }

    const updatedAppointment = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        doctor: req.user._id,
        status: "pending",
      },
      {
        $set: { status: "confirmed" },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedAppointment) {
      return res.status(409).json({
        success: false,
        message: "This appointment has already been updated.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment approved successfully.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Approve appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while approving the appointment.",
    });
  }
};

export const rejectAppointment = async (req, res) => {
  try {
    if (!isValidAppointmentId(req.params.appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can reject appointments.",
      });
    }

    const appointment = await Appointment.findOneAndUpdate(
      {
        _id: req.params.appointmentId,
        doctor: req.user._id,
        status: "pending",
      },
      {
        $set: { status: "rejected" },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!appointment) {
      const existingAppointment = await Appointment.exists({
        _id: req.params.appointmentId,
        doctor: req.user._id,
      });

      if (!existingAppointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Only pending appointments can be rejected.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment rejected successfully.",
      appointment,
    });
  } catch (error) {
    console.error("Reject appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while rejecting the appointment.",
    });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    if (!isValidAppointmentId(req.params.appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can cancel their appointments.",
      });
    }

    const validation = cancelAppointmentSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid cancellation reason.",
        errors: validation.error.issues,
      });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      patient: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    if (!["pending", "confirmed"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: "This appointment cannot be cancelled.",
      });
    }

    const appointmentStart = getNairobiAppointmentDateTime(
      appointment.appointmentDate.toISOString().slice(0, 10),
      appointment.startTime,
    );

    if (appointmentStart <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Appointments cannot be cancelled after they have started.",
      });
    }

    const updatedAppointment = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        patient: req.user._id,
        status: { $in: ["pending", "confirmed"] },
      },
      {
        $set: {
          status: "cancelled",
          cancellationReason: validation.data.reason,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedAppointment) {
      return res.status(409).json({
        success: false,
        message: "This appointment has already been updated.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while cancelling the appointment.",
    });
  }
};

export const rescheduleAppointment = async (req, res) => {
  try {
    if (!isValidAppointmentId(req.params.appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can reschedule appointments.",
      });
    }

    const validation = rescheduleAppointmentSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid rescheduling details.",
        errors: validation.error.issues,
      });
    }

    const { appointmentDate, startTime } = validation.data;

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

    const appointmentStart = getNairobiAppointmentDateTime(
      appointmentDate,
      startTime,
    );

    if (appointmentStart <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "New appointment must be in the future.",
      });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      patient: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    if (!["pending", "confirmed"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: "This appointment cannot be rescheduled.",
      });
    }

    // Prevent rescheduling an appointment that has already started.
    const existingAppointmentStart = getNairobiAppointmentDateTime(
      appointment.appointmentDate.toISOString().slice(0, 10),
      appointment.startTime,
    );

    if (existingAppointmentStart <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Appointments cannot be rescheduled after they have started.",
      });
    }

    const doctor = await User.findOne({
      _id: appointment.doctor,
      role: "doctor",
      isActive: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found.",
      });
    }

    const doctorProfile = await DoctorProfile.findOne({
      user: appointment.doctor,
      licenseVerificationStatus: "verified",
    });

    if (!doctorProfile) {
      return res.status(403).json({
        success: false,
        message: "Doctor is not verified.",
      });
    }

    const availability = await DoctorAvailability.findOne({
      doctor: appointment.doctor,
      isAcceptingAppointments: true,
    });

    if (!availability) {
      return res.status(400).json({
        success: false,
        message: "Doctor is not accepting appointments.",
      });
    }

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

    const fitsAvailability = daySchedule.slots.some(
      (slot) =>
        startMinutes >= timeToMinutes(slot.startTime) &&
        endMinutes <= timeToMinutes(slot.endTime),
    );

    if (!fitsAvailability) {
      return res.status(400).json({
        success: false,
        message: "Requested time is outside the doctor availability.",
      });
    }

    const conflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      appointmentDate: date,
      status: { $in: ["pending", "confirmed"] },
      $or: [{ doctor: appointment.doctor }, { patient: req.user._id }],
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message:
          "The doctor or patient already has an appointment during this time.",
      });
    }

    const updatedAppointment = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        patient: req.user._id,
        status: { $in: ["pending", "confirmed"] },
        __v: appointment.__v,
      },
      {
        $set: {
          appointmentDate: date,
          startTime,
          endTime,
        },
        $inc: {
          __v: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedAppointment) {
      return res.status(409).json({
        success: false,
        message:
          "This appointment has already been updated. Please refresh and try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Reschedule appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while rescheduling the appointment.",
    });
  }
};

export const completeAppointment = async (req, res) => {
  try {
    if (!isValidAppointmentId(req.params.appointmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID.",
      });
    }

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can complete appointments.",
      });
    }

    const appointment = await Appointment.findOne({
      _id: req.params.appointmentId,
      doctor: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found.",
      });
    }

    if (appointment.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed appointments can be completed.",
      });
    }

    // Calculate the scheduled appointment end time in Nairobi.
    const appointmentEnd = getNairobiAppointmentDateTime(
      appointment.appointmentDate.toISOString().slice(0, 10),
      appointment.endTime,
    );

    if (appointmentEnd > new Date()) {
      return res.status(400).json({
        success: false,
        message:
          "An appointment cannot be completed before its scheduled end time.",
      });
    }

    const updatedAppointment = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        doctor: req.user._id,
        status: "confirmed",
      },
      {
        $set: { status: "completed" },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedAppointment) {
      return res.status(409).json({
        success: false,
        message: "This appointment has already been updated.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment marked as completed.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Complete appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while completing the appointment.",
    });
  }
};

export const getDoctorAppointmentStats = async (req, res) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can view appointment statistics.",
      });
    }

    const doctorId = req.user._id;
    const { date, time } = getNairobiCurrentDateTime();

    const todayMarker = new Date(`${date}T00:00:00.000Z`);

    const [
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      rejectedAppointments,
      cancelledAppointments,
      upcomingAppointments,
    ] = await Promise.all([
      Appointment.countDocuments({ doctor: doctorId }),

      Appointment.countDocuments({
        doctor: doctorId,
        status: "pending",
      }),

      Appointment.countDocuments({
        doctor: doctorId,
        status: "confirmed",
      }),

      Appointment.countDocuments({
        doctor: doctorId,
        status: "completed",
      }),

      Appointment.countDocuments({
        doctor: doctorId,
        status: "rejected",
      }),

      Appointment.countDocuments({
        doctor: doctorId,
        status: "cancelled",
      }),

      Appointment.countDocuments({
        doctor: doctorId,
        status: "confirmed",
        $or: [
          {
            appointmentDate: { $gt: todayMarker },
          },
          {
            appointmentDate: todayMarker,
            startTime: { $gt: time },
          },
        ],
      }),
    ]);

    return res.status(200).json({
      success: true,
      statistics: {
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        completedAppointments,
        rejectedAppointments,
        cancelledAppointments,
        upcomingAppointments,
      },
    });
  } catch (error) {
    console.error("Doctor appointment statistics error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving appointment statistics.",
    });
  }
};

export const getPatientAppointmentStats = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can view their appointment statistics.",
      });
    }

    const patientId = req.user._id;
    const { date, time } = getNairobiCurrentDateTime();

    const todayMarker = new Date(`${date}T00:00:00.000Z`);

    const [
      totalAppointments,
      pendingAppointments,
      confirmedAppointments,
      completedAppointments,
      rejectedAppointments,
      cancelledAppointments,
      upcomingAppointments,
    ] = await Promise.all([
      Appointment.countDocuments({ patient: patientId }),

      Appointment.countDocuments({
        patient: patientId,
        status: "pending",
      }),

      Appointment.countDocuments({
        patient: patientId,
        status: "confirmed",
      }),

      Appointment.countDocuments({
        patient: patientId,
        status: "completed",
      }),

      Appointment.countDocuments({
        patient: patientId,
        status: "rejected",
      }),

      Appointment.countDocuments({
        patient: patientId,
        status: "cancelled",
      }),

      Appointment.countDocuments({
        patient: patientId,
        status: "confirmed",
        $or: [
          {
            appointmentDate: { $gt: todayMarker },
          },
          {
            appointmentDate: todayMarker,
            startTime: { $gt: time },
          },
        ],
      }),
    ]);

    return res.status(200).json({
      success: true,
      statistics: {
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        completedAppointments,
        rejectedAppointments,
        cancelledAppointments,
        upcomingAppointments,
      },
    });
  } catch (error) {
    console.error("Patient appointment statistics error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while retrieving appointment statistics.",
    });
  }
};
