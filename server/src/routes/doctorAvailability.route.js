import express from "express";
import {
  getMyDoctorAvailability,
  updateDoctorAvailability,
} from "../controllers/doctorAvailability.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.put("/me", protect, updateDoctorAvailability);
router.get("/me", protect, getMyDoctorAvailability);

export default router;
