import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  archiveMedicalRecord,
  createMedicalRecord,
  getMyMedicalRecords,
  getPatientMedicalRecords,
  updateMedicalRecord,
} from "../controllers/medicalRecord.controller.js";

const router = express.Router();

router.post("/", protect, createMedicalRecord);
router.get("/my", protect, getMyMedicalRecords);
router.get("/patient/:patientId", protect, getPatientMedicalRecords);
router.patch("/:recordId", protect, updateMedicalRecord);
router.patch("/:recordId/archive", protect, archiveMedicalRecord);
export default router;
