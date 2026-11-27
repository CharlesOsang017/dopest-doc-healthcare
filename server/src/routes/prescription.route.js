import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  cancelPrescription,
  createPrescription,
  getDoctorPrescriptions,
  getMyPrescriptions,
  getPrescriptionById,
} from "../controllers/prescription.controller.js";

const router = express.Router();

router.post("/", protect, createPrescription);
router.get("/my", protect, getMyPrescriptions);
router.get("/doctor", protect, getDoctorPrescriptions);
router.get("/:prescriptionId", protect, getPrescriptionById);
router.patch("/:prescriptionId/cancel", protect, cancelPrescription);
export default router;
