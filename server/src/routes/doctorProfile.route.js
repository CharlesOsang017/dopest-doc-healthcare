import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { createDoctorProfile } from "../controllers/doctorProfile.controller.js";

const router = express.Router();

router.post("/", protect, createDoctorProfile);

export default router;
