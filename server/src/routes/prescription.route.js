import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  cancelPrescription,
  createPrescription,
  downloadPrescriptionPdf,
  getDoctorPrescriptions,
  getMyPrescriptions,
  getPrescriptionById,
  getPrescriptionStatistics,
} from "../controllers/prescription.controller.js";

const router = express.Router();

router.post("/", protect, createPrescription);
router.get("/my", protect, getMyPrescriptions);
router.get("/doctor", protect, getDoctorPrescriptions);
router.get("/statistics", protect, getPrescriptionStatistics);
router.get("/:prescriptionId", protect, getPrescriptionById);
router.patch("/:prescriptionId/cancel", protect, cancelPrescription);
router.get("/:prescriptionId/pdf", protect, downloadPrescriptionPdf);
export default router;
