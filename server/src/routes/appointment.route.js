import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  bookAppointment,
  getDoctorAppointments,
  getMyAppointments,
} from "../controllers/appointment.controller.js";

const router = express.Router();

router.post("/", protect, bookAppointment);
router.get("/my", protect, getMyAppointments);
router.get("/doctor", protect, getDoctorAppointments);

export default router;
