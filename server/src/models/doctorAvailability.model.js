import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
  },
  { _id: false },
);

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    weeklySchedule: {
      type: [
        {
          day: {
            type: String,
            enum: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ],
            required: true,
          },
          slots: {
            type: [timeSlotSchema],
            default: [],
          },
        },
      ],
      default: [],
    },
    slotDuration: {
      type: Number,
      min: 5,
      max: 240,
      default: 30,
    },
    isAcceptingAppointments: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const DoctorAvailability = mongoose.model(
  "DoctorAvailability",
  doctorAvailabilitySchema,
);

export default DoctorAvailability;
