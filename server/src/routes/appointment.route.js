import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  approveAppointment,
  bookAppointment,
  getDoctorAppointments,
  getMyAppointments,
  rejectAppointment,
} from "../controllers/appointment.controller.js";

const router = express.Router();

router.post("/", protect, bookAppointment);
router.get("/my", protect, getMyAppointments);
router.get("/doctor", protect, getDoctorAppointments);
router.patch("/:appointmentId/approve", protect, approveAppointment);
router.patch("/:appointmentId/reject", protect, rejectAppointment);

export default router;
