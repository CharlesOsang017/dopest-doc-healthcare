import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createPatientProfile,
  getPatientProfile,
  updatePatientProfile,
} from "../controllers/patientProfile.controller.js";

const router = express.Router();

router.post("/", protect, createPatientProfile);
router.get("/me", protect, getPatientProfile);
router.patch("/me", protect, updatePatientProfile);

export default router;
