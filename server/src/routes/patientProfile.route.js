import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { createPatientProfile } from "../controllers/patientProfile.controller.js";

const router = express.Router();

router.post("/", protect, createPatientProfile);

export default router;
