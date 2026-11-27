import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  archiveMedicalRecord,
  createMedicalRecord,
  createMedicalRecordAddendum,
  getMedicalRecordAddenda,
  getMedicalRecordAuditHistory,
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
router.get("/:recordId/audit", protect, getMedicalRecordAuditHistory);
router.post("/:recordId/addenda", protect, createMedicalRecordAddendum);
router.get("/:recordId/addenda", protect, getMedicalRecordAddenda);
export default router;
