import express from "express";
import {
  getMyDoctorAvailability,
  getPublicDoctorAvailability,
  updateDoctorAvailability,
} from "../controllers/doctorAvailability.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.put("/me", protect, updateDoctorAvailability);
router.get("/me", protect, getMyDoctorAvailability);
router.get("/public/:doctorId", getPublicDoctorAvailability);

export default router;
