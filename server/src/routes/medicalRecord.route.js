import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createMedicalRecord,
  getMyMedicalRecords,
  getPatientMedicalRecords,
} from "../controllers/medicalRecord.controller.js";

const router = express.Router();

router.post("/", protect, createMedicalRecord);
router.get("/my", protect, getMyMedicalRecords);
router.get("/patient/:patientId", protect, getPatientMedicalRecords);

export default router;
