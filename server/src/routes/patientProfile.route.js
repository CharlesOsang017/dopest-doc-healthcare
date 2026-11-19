import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createPatientProfile,
  getPatientProfile,
} from "../controllers/patientProfile.controller.js";

const router = express.Router();

router.post("/", protect, createPatientProfile);
router.get("/me", protect, getPatientProfile);

export default router;
