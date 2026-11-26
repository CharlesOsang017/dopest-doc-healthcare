import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  approveAppointment,
  bookAppointment,
  cancelAppointment,
  completeAppointment,
  getDoctorAppointments,
  getDoctorAppointmentStats,
  getMyAppointments,
  getPatientAppointmentStats,
  rejectAppointment,
  rescheduleAppointment,
} from "../controllers/appointment.controller.js";

const router = express.Router();

router.post("/", protect, bookAppointment);
router.get("/my", protect, getMyAppointments);
router.get("/doctor", protect, getDoctorAppointments);
router.get("/doctor/statistics", protect, getDoctorAppointmentStats);
router.get("/my/statistics", protect, getPatientAppointmentStats);
router.patch("/:appointmentId/approve", protect, approveAppointment);
router.patch("/:appointmentId/reject", protect, rejectAppointment);
router.patch("/:appointmentId/cancel", protect, cancelAppointment);
router.patch("/:appointmentId/reschedule", protect, rescheduleAppointment);
router.patch("/:appointmentId/complete", protect, completeAppointment);

export default router;
