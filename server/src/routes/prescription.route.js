import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  cancelPrescription,
  createPrescription,
  dispensePrescription,
  downloadPrescriptionPdf,
  getDoctorPrescriptions,
  getMyPrescriptions,
  getPrescriptionById,
  getPrescriptionStatistics,
  verifyPrescription,
} from "../controllers/prescription.controller.js";

const router = express.Router();

router.post("/", protect, createPrescription);
router.get("/my", protect, getMyPrescriptions);
router.get("/doctor", protect, getDoctorPrescriptions);
router.get("/statistics", protect, getPrescriptionStatistics);
router.post("/verify", protect, verifyPrescription);
router.post("/dispense", protect, dispensePrescription);
router.get("/:prescriptionId", protect, getPrescriptionById);
router.patch("/:prescriptionId/cancel", protect, cancelPrescription);
router.get("/:prescriptionId/pdf", protect, downloadPrescriptionPdf);

export default router;
