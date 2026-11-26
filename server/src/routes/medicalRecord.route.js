import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { createMedicalRecord } from "../controllers/medicalRecord.controller.js";

const router = express.Router();

router.post("/", protect, createMedicalRecord);

export default router;
