import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createDoctorProfile,
  getDoctorProfile,
  updateDoctorProfile,
} from "../controllers/doctorProfile.controller.js";

const router = express.Router();

router.post("/", protect, createDoctorProfile);
router.get("/me", protect, getDoctorProfile);
router.patch("/me", protect, updateDoctorProfile);

export default router;
